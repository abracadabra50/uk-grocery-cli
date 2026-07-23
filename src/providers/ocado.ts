import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { GroceryProvider, Product, Basket, BasketItem, DeliverySlot, Order, SearchOptions } from './types';

/**
 * Ocado provider — rebuilt 2026-07 against Ocado's current internal web-app
 * JSON API (the old `/api/search/v1/*` / `/api/trolley/v1/*` REST endpoints
 * were removed when Ocado became a client-side SPA — see issue #5).
 *
 * Verified live endpoints (all relative to https://www.ocado.com):
 *   GET  /api/cart/v1/carts/active?cartProductSorting=CATEGORIES   read trolley
 *   POST /api/cart/v1/carts/active/apply-quantity?...              write trolley
 *        body: [{ productId: "<uuid>", quantity: <DELTA> }]
 *        — quantity is a DELTA: +N adds, -N removes, 0 is a silent no-op.
 *        To delete a line entirely send -currentQty.
 *   PUT  /api/webproductpagews/v6/products                         product info
 *        body: ["<uuid>", ...] (batch) — name, price, available, ratingSummary
 *
 * Auth model:
 *   - Session cookies (Playwright login or cookie import) sent as Cookie header.
 *   - Writes additionally require header `x-csrf-token`. The token is embedded
 *     in every page's HTML initial-state blob: "csrf":{"token":"..."}.
 *     It is session-scoped and reusable; on 403 re-scrape once and retry.
 *   - Plain HTTP works — no browser/WAF dance needed once you hold cookies.
 *
 * Product identity: the API addresses products by UUID (`productId`), NOT the
 * numeric SKU in /products/slug/<sku> URLs. Search returns UUIDs; use those
 * for all basket operations.
 *
 * Not yet reverse-engineered (contributions welcome): delivery slots, slot
 * booking, checkout, order history. Those methods throw a clear error.
 */

const BASE_URL = 'https://www.ocado.com';
const CART_URL = '/api/cart/v1/carts/active?cartProductSorting=CATEGORIES';
const APPLY_QTY_URL = '/api/cart/v1/carts/active/apply-quantity?cartProductSorting=CATEGORIES';
const PRODUCTS_URL = '/api/webproductpagews/v6/products';

const SESSION_DIR = path.join(os.homedir(), '.ocado');
const SESSION_FILE = path.join(SESSION_DIR, 'session.json');

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

const NOT_IMPLEMENTED_YET =
  'This Ocado endpoint has not been reverse-engineered yet. ' +
  'Working today: login/import-session, search, getProduct, and all basket ' +
  'operations. Slots/checkout/orders still need netlog capture — see issue #5.';

interface OcadoSession {
  cookies: any[];
  savedAt: string;
}

function num(v: any): number | undefined {
  if (v === null || v === undefined) return undefined;
  const n = parseFloat(String(v));
  return Number.isNaN(n) ? undefined : n;
}

/**
 * Extract the `productEntities` blob embedded in server-rendered Ocado pages
 * (`"productEntities":{<uuid>:{...}}`) via balanced-brace scanning — the blob
 * is raw JSON inside HTML, so a single regex can't safely bound it.
 */
export function extractProductEntities(html: string): Record<string, any> {
  const marker = '"productEntities":{';
  const i = html.indexOf(marker);
  if (i < 0) return {};
  const start = i + marker.length - 1; // index of the opening '{'
  let depth = 0;
  let end = -1;
  for (let j = start; j < html.length; j++) {
    const c = html[j];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) { end = j; break; }
    }
  }
  if (end < 0) return {};
  try {
    return JSON.parse(html.slice(start, end + 1));
  } catch {
    return {};
  }
}

/** Fresh CSRF token scraped from any ocado.com page's HTML. */
function scrapeCsrf(html: string): string | null {
  const m = /"csrf":\{"token":"([^"]+)"/.exec(html);
  return m ? m[1] : null;
}

export class OcadoProvider implements GroceryProvider {
  readonly name = 'ocado';
  private client: AxiosInstance;
  private csrfToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      maxRedirects: 5,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
      },
    });
    this.loadSession();
  }

  // ---------------------------------------------------------------- auth --

  private loadSession(): void {
    try {
      if (!fs.existsSync(SESSION_FILE)) return;
      const session: OcadoSession = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
      if (session.cookies?.length) {
        this.client.defaults.headers.common['Cookie'] =
          session.cookies.map((c: any) => `${c.name}=${c.value}`).join('; ');
      }
    } catch {
      // Ignore corrupt session — isAuthenticated() will report false.
    }
  }

  static saveSession(cookies: any[]): void {
    if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });
    const session: OcadoSession = { cookies, savedAt: new Date().toISOString() };
    fs.writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2), { mode: 0o600 });
  }

  async login(email: string, password: string): Promise<void> {
    // Playwright login against https://www.ocado.com/login.
    // If this proves brittle (Ocado tweaks their SPA), use
    // `groc --provider ocado import-session --file <cookies.json>` instead —
    // the same escape hatch the Tesco provider uses for Akamai.
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ userAgent: USER_AGENT });
    const page = await context.newPage();
    try {
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      // Cookie consent, if present
      try {
        const accept = page.locator('#onetrust-accept-btn-handler');
        if (await accept.isVisible({ timeout: 3000 })) {
          await accept.click();
          await page.waitForTimeout(1500);
        }
      } catch { /* no banner */ }

      await page.waitForSelector('input[type="email"], input[name="email"], #username', { timeout: 15000 });
      await page.fill('input[type="email"], input[name="email"], #username', email);
      await page.fill('input[type="password"], input[name="password"], #password', password);
      await page.click('button[type="submit"]');

      // Logged-in pages greet the user / drop the login form
      await page.waitForTimeout(6000);
      if (page.url().includes('/login')) {
        throw new Error('still on /login after submit — wrong credentials or MFA challenge');
      }

      const cookies = await context.cookies();
      OcadoProvider.saveSession(cookies);
      this.client.defaults.headers.common['Cookie'] =
        cookies.map((c: any) => `${c.name}=${c.value}`).join('; ');
    } finally {
      await browser.close();
    }
  }

  async logout(): Promise<void> {
    if (fs.existsSync(SESSION_FILE)) fs.unlinkSync(SESSION_FILE);
    delete this.client.defaults.headers.common['Cookie'];
    this.csrfToken = null;
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      await this.rawCart();
      return true;
    } catch {
      return false;
    }
  }

  // ------------------------------------------------------------ CSRF core --

  private async getCsrfToken(forceRefresh = false): Promise<string> {
    if (this.csrfToken && !forceRefresh) return this.csrfToken;
    const res = await this.client.get('/', {
      headers: { Accept: 'text/html,application/xhtml+xml' },
    });
    const tok = scrapeCsrf(String(res.data));
    if (!tok) {
      throw new Error(
        'No CSRF token in ocado.com HTML — session expired or logged out. ' +
        'Run `groc --provider ocado login` or `import-session --file <cookies.json>`.'
      );
    }
    this.csrfToken = tok;
    return tok;
  }

  // ------------------------------------------------------------- raw API --

  private async rawCart(): Promise<any> {
    const res = await this.client.get(CART_URL);
    return res.data;
  }

  private async productsInfo(uuids: string[]): Promise<any[]> {
    if (uuids.length === 0) return [];
    const call = async () => this.client.put(PRODUCTS_URL, uuids, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'x-csrf-token': await this.getCsrfToken(),
      },
    });
    try {
      const res = await call();
      return res.data?.products ?? [];
    } catch (e: any) {
      if (e.response?.status === 403) {
        this.csrfToken = null; // stale token — rescrape once
        const res = await call();
        return res.data?.products ?? [];
      }
      throw e;
    }
  }

  /**
   * The one and only trolley write. Quantity is a DELTA (+N adds, -N removes,
   * 0 silently no-ops, unavailable products silently no-op).
   */
  private async applyQuantity(productId: string, delta: number, retry = true): Promise<void> {
    try {
      await this.client.post(
        APPLY_QTY_URL,
        [{ productId, quantity: delta }],
        {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'x-csrf-token': await this.getCsrfToken(),
          },
        }
      );
    } catch (e: any) {
      if (e.response?.status === 403 && retry) {
        this.csrfToken = null;
        return this.applyQuantity(productId, delta, false);
      }
      const status = e.response?.status;
      throw new Error(`Ocado basket write failed${status ? ` (HTTP ${status})` : ''}: ${e.message}`);
    }
  }

  private static cartItems(cartJson: any): any[] {
    const raw = cartJson?.items ?? [];
    return Array.isArray(raw) ? raw : Object.values(raw);
  }

  // ------------------------------------------------------------- mapping --

  private mapEntity(e: any): Product {
    const price = num(e?.price?.current?.amount ?? e?.price?.amount);
    const unit = num(e?.price?.unit?.current?.amount ?? e?.price?.unit?.amount);
    const rating = num(e?.ratingSummary?.overallRating);
    return {
      product_uid: e.productId,
      name: e.name,
      description: e.brand ? `Brand: ${e.brand}` : undefined,
      retail_price: { price: price ?? 0 },
      unit_price: unit !== undefined
        ? { measure: e?.size?.value ?? '', price: unit }
        : undefined,
      in_stock: e.available !== false,
      image_url: e?.image ? `${BASE_URL}${e.image}` : undefined,
      provider: this.name,
      rating,
      review_count: e?.ratingSummary?.count ?? undefined,
      size: e?.size?.value ?? undefined,
    };
  }

  /**
   * Scrape a server-rendered listing page (search results, favourites,
   * regulars, category browse) into ranked Products. All these pages embed
   * the same `productEntities` blob; DOM anchor order = site ranking.
   */
  private async scrapeProductsPage(urlPath: string, limit = 100): Promise<Product[]> {
    const res = await this.client.get(urlPath, {
      headers: { Accept: 'text/html,application/xhtml+xml' },
    });
    const html = String(res.data);
    const entities = extractProductEntities(html);

    const bySku: Record<string, any> = {};
    for (const id of Object.keys(entities)) {
      const e = entities[id];
      if (e?.retailerProductId) bySku[e.retailerProductId] = e;
    }

    const out: Product[] = [];
    const seen = new Set<string>();
    const linkRe = /href="(\/products\/[^"]+)"/g;
    let m: RegExpExecArray | null;
    while ((m = linkRe.exec(html)) !== null && out.length < limit) {
      const sku = m[1].replace(/\/$/, '').split('/').pop()!;
      if (seen.has(sku)) continue;
      seen.add(sku);
      const e = bySku[sku];
      if (e?.name) out.push(this.mapEntity(e));
    }

    // Fallback: page had entities but no matching anchors (layout change)
    if (out.length === 0) {
      for (const id of Object.keys(entities).slice(0, limit)) {
        if (entities[id]?.name) out.push(this.mapEntity(entities[id]));
      }
    }
    return out;
  }

  // -------------------------------------------------------------- search --

  async search(query: string, options?: SearchOptions): Promise<Product[]> {
    return this.scrapeProductsPage(`/search?q=${encodeURIComponent(query)}`, options?.limit ?? 24);
  }

  async getProduct(productId: string): Promise<Product> {
    const products = await this.productsInfo([productId]);
    if (!products.length) throw new Error(`Ocado product not found: ${productId}`);
    return this.mapEntity(products[0]);
  }

  async getCategories(): Promise<any> {
    // /categories is server-rendered; links look like
    // /categories/<slug>/<uuid> (depth 1) with deeper nesting below.
    const res = await this.client.get('/categories', {
      headers: { Accept: 'text/html,application/xhtml+xml' },
    });
    const html = String(res.data);
    const cats: any[] = [];
    const seen = new Set<string>();
    const re = /<a[^>]+href="(\/categories\/[^"?#]+)[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const path = m[1].replace(/\/$/, '');
      const name = m[2].replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#x27;|&#39;|&apos;/g, "'")
        .replace(/\s+/g, ' ').trim();
      if (!name || seen.has(path)) continue;
      seen.add(path);
      const segs = path.split('/').filter(Boolean); // ["categories", slug, uuid, ...]
      if (segs.length < 3) continue;
      cats.push({ name, path, slug: segs[1], id: segs[2], depth: segs.length - 3 });
    }
    return cats;
  }

  /**
   * Browse a category listing. Accepts a path from getCategories()
   * (/categories/<slug>/<uuid>[/...]) — the numeric SKU-style UUID in the
   * path is required, a bare slug 404s.
   */
  async browseCategory(categoryPath: string, options?: SearchOptions): Promise<Product[]> {
    const clean = categoryPath.split('?')[0].replace(/\/$/, '');
    if (!clean.startsWith('/categories/')) {
      throw new Error(`Expected a /categories/... path from getCategories(), got: ${categoryPath}`);
    }
    return this.scrapeProductsPage(clean, options?.limit ?? 100);
  }

  /** Favourite/frequently-bought products (/favorites page, server-rendered). */
  async getFavourites(options?: SearchOptions): Promise<Product[]> {
    return this.scrapeProductsPage('/favorites', options?.limit ?? 100);
  }

  /** Ocado has no server-side favourites search — filter favourites by name. */
  async searchFavourites(query: string, options?: SearchOptions): Promise<Product[]> {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const favs = await this.getFavourites({ limit: 500 });
    return favs
      .filter(p => words.every(w => p.name.toLowerCase().includes(w)))
      .slice(0, options?.limit ?? 24);
  }

  // -------------------------------------------------------------- basket --

  async getBasket(): Promise<Basket> {
    const cart = await this.rawCart();
    const items = OcadoProvider.cartItems(cart);
    const uuids = items.map((i: any) => i.productId).filter(Boolean);
    const info = new Map<string, any>();
    for (const p of await this.productsInfo(uuids)) info.set(p.productId, p);

    const basketItems: BasketItem[] = items.map((i: any) => {
      const p = info.get(i.productId) ?? {};
      const qty = i.quantity ?? 0;
      const lineTotal = num(i?.finalPrice?.amount) ?? 0;
      return {
        item_id: i.productId,
        product_uid: i.productId,
        name: p.name ?? i.productId,
        quantity: qty,
        unit_price: qty ? lineTotal / qty : lineTotal,
        total_price: lineTotal,
      };
    });

    const totalCost =
      num(cart?.totals?.subTotal?.amount) ??
      num(cart?.activeCheckoutGroupTotals?.itemPriceAfterPromos?.amount) ??
      basketItems.reduce((s, b) => s + b.total_price, 0);

    return {
      items: basketItems,
      total_quantity: basketItems.reduce((s, b) => s + b.quantity, 0),
      total_cost: totalCost,
      provider: this.name,
    };
  }

  async addToBasket(productId: string, quantity: number): Promise<void> {
    await this.applyQuantity(productId, quantity);
  }

  async updateBasketItem(itemId: string, quantity: number): Promise<void> {
    // Interface semantics are absolute; Ocado's API is delta-based.
    const cart = await this.rawCart();
    const current = OcadoProvider.cartItems(cart)
      .find((i: any) => i.productId === itemId)?.quantity ?? 0;
    const delta = quantity - current;
    if (delta !== 0) await this.applyQuantity(itemId, delta);
  }

  async removeFromBasket(itemId: string): Promise<void> {
    const cart = await this.rawCart();
    const current = OcadoProvider.cartItems(cart)
      .find((i: any) => i.productId === itemId)?.quantity ?? 0;
    if (current === 0) throw new Error(`Item not in Ocado trolley: ${itemId}`);
    await this.applyQuantity(itemId, -current);
  }

  async clearBasket(): Promise<void> {
    const cart = await this.rawCart();
    for (const i of OcadoProvider.cartItems(cart)) {
      if (i.productId && i.quantity) await this.applyQuantity(i.productId, -i.quantity);
    }
  }

  // --------------------------------------------- not yet reverse-engineered --

  async getDeliverySlots(): Promise<DeliverySlot[]> {
    throw new Error(NOT_IMPLEMENTED_YET);
  }

  async bookSlot(_slotId: string): Promise<void> {
    throw new Error(NOT_IMPLEMENTED_YET);
  }

  async checkout(_dryRun?: boolean): Promise<Order> {
    throw new Error(NOT_IMPLEMENTED_YET);
  }

  async getOrders(): Promise<Order[]> {
    throw new Error(NOT_IMPLEMENTED_YET);
  }
}

/**
 * Import cookies exported from a real browser as the Ocado session — the
 * reliable alternative to Playwright login. Accepts Playwright storage_state
 * ({ cookies: [...] }), a bare cookie array, or Cookie-Editor style exports.
 *
 * Usage: groc --provider ocado import-session --file ~/Downloads/ocado-cookies.json
 */
export function importSession(filePath: string): void {
  const resolved = filePath.startsWith('~')
    ? path.join(os.homedir(), filePath.slice(1))
    : path.resolve(filePath);
  if (!fs.existsSync(resolved)) throw new Error(`Cookie file not found: ${resolved}`);

  const raw = JSON.parse(fs.readFileSync(resolved, 'utf-8'));
  let cookies: any[];
  if (Array.isArray(raw)) cookies = raw;
  else if (Array.isArray(raw.cookies)) cookies = raw.cookies;
  else cookies = Object.values(raw).flat() as any[];

  cookies = cookies
    .filter((c: any) => (c.name || c.Name) && (c.value !== undefined || c.Value !== undefined))
    .map((c: any) => ({
      name: c.name ?? c.Name,
      value: c.value ?? c.Value,
      domain: c.domain ?? c.Domain ?? '.ocado.com',
      path: c.path ?? c.Path ?? '/',
      expires: c.expirationDate ?? c.expires ?? -1,
      httpOnly: c.httpOnly ?? c.HttpOnly ?? false,
      secure: c.secure ?? c.Secure ?? false,
      sameSite: c.sameSite ?? c.SameSite ?? 'Lax',
    }));
  if (cookies.length === 0) throw new Error('No cookies found in the file — check the export format.');

  OcadoProvider.saveSession(cookies);
  console.log(`✅ Imported ${cookies.length} cookies to ${SESSION_FILE}`);
}
