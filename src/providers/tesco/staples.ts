/**
 * Tesco Staples Detection
 *
 * Analyses previous Tesco order history to identify products you buy
 * regularly ("staples"), so they can be auto-suggested or auto-added
 * to the basket at the start of each weekly shop.
 *
 * Staple = bought in >50% of your last N orders (default: last 10).
 *
 * Saved to: ~/.tesco/staples.json
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { TescoAPI } from './api';

// Forward-declare to avoid circular import — the actual type is TescoProvider
interface BasketAdder {
  addToBasket(productId: string, quantity: number): Promise<void>;
}

const CONFIG_DIR = path.join(os.homedir(), '.tesco');
const STAPLES_FILE = path.join(CONFIG_DIR, 'staples.json');

export interface Staple {
  productId: string;
  name: string;
  avgQty: number;
  frequency: number; // 0–1, fraction of orders containing this product
}

interface RawOrderItem {
  id?: string;
  tpnb?: string;
  productId?: string;
  name?: string;
  title?: string;
  quantity?: number;
  qty?: number;
}

interface RawOrder {
  items?: RawOrderItem[];
  orderLines?: RawOrderItem[];
  products?: RawOrderItem[];
}

// ─────────────────────────────────────────────────────────
// Core analysis
// ─────────────────────────────────────────────────────────

export function analyseOrders(orders: RawOrder[], threshold: number = 0.5): Staple[] {
  if (orders.length === 0) return [];

  const counts: Record<string, { name: string; totalQty: number; orderCount: number }> = {};

  for (const order of orders) {
    const items: RawOrderItem[] = order.items || order.orderLines || order.products || [];

    // Use a Set per order to avoid double-counting a product appearing twice in one order
    const seenInThisOrder = new Set<string>();

    for (const item of items) {
      const id = String(item.id || item.tpnb || item.productId || '').trim();
      if (!id) continue;

      const name = (item.name || item.title || 'Unknown product').trim();
      const qty = Number(item.quantity || item.qty || 1);

      if (!counts[id]) {
        counts[id] = { name, totalQty: 0, orderCount: 0 };
      }

      counts[id].totalQty += qty;
      if (!seenInThisOrder.has(id)) {
        counts[id].orderCount += 1;
        seenInThisOrder.add(id);
      }
    }
  }

  const staples: Staple[] = [];

  for (const [productId, data] of Object.entries(counts)) {
    const frequency = data.orderCount / orders.length;
    if (frequency >= threshold) {
      staples.push({
        productId,
        name: data.name,
        avgQty: Math.round(data.totalQty / data.orderCount),
        frequency: Math.round(frequency * 100) / 100,
      });
    }
  }

  // Sort by frequency descending, then name
  return staples.sort((a, b) => b.frequency - a.frequency || a.name.localeCompare(b.name));
}

// ─────────────────────────────────────────────────────────
// Fetch + persist
// ─────────────────────────────────────────────────────────

export async function fetchOrderHistory(api: TescoAPI, n: number = 10): Promise<RawOrder[]> {
  const data = await api.getOrders(1, n);
  if (!data) return [];

  if (Array.isArray(data)) return data;
  return data.orders || data.orderHistory || [];
}

export function saveStaples(staples: Staple[]): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(STAPLES_FILE, JSON.stringify(staples, null, 2));
  console.log(`💾 Staples saved to ${STAPLES_FILE}`);
}

export function loadStaples(): Staple[] {
  if (!fs.existsSync(STAPLES_FILE)) return [];
  return JSON.parse(fs.readFileSync(STAPLES_FILE, 'utf-8'));
}

// ─────────────────────────────────────────────────────────
// CLI helpers (called from src/cli.ts staples command)
// ─────────────────────────────────────────────────────────

export async function updateStaples(api: TescoAPI): Promise<Staple[]> {
  console.log('📦 Fetching Tesco order history...');
  const orders = await fetchOrderHistory(api);

  if (orders.length === 0) {
    console.log('⚠️  No order history found. Cannot build staples list.');
    console.log('   Make sure you are logged in and have completed past deliveries.');
    return [];
  }

  console.log(`📊 Analysing ${orders.length} orders...`);
  const staples = analyseOrders(orders);
  saveStaples(staples);

  return staples;
}

export function printStaples(staples: Staple[], json: boolean = false): void {
  if (json) {
    console.log(JSON.stringify(staples, null, 2));
    return;
  }

  if (staples.length === 0) {
    console.log('\n📋 No staples found yet. Run with --update to build from order history.\n');
    return;
  }

  console.log('\n🛒 Your Tesco Staples\n');
  staples.forEach((s, i) => {
    const pct = Math.round(s.frequency * 100);
    console.log(`${i + 1}. ${s.name}`);
    console.log(`   ID: ${s.productId}  |  Avg qty: ${s.avgQty}  |  Bought: ${pct}% of orders\n`);
  });
}

export async function addStaplesToBasket(
  provider: BasketAdder,
  staples: Staple[],
  skipIds: Set<string> = new Set()
): Promise<void> {
  const toAdd = staples.filter(s => !skipIds.has(s.productId));

  if (toAdd.length === 0) {
    console.log('✅ All staples already in basket');
    return;
  }

  console.log(`\n🛒 Adding ${toAdd.length} staples to basket...\n`);
  for (const s of toAdd) {
    try {
      await provider.addToBasket(s.productId, s.avgQty);
      console.log(`   ✅ ${s.name} x${s.avgQty}`);
    } catch (err: any) {
      console.log(`   ❌ ${s.name}: ${err.message}`);
    }
  }
}
