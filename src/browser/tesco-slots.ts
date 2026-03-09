/**
 * Tesco Delivery Slot Browser Automation
 *
 * Mirrors src/browser/slots.ts but for Tesco.
 * Uses Playwright to scrape the slot selection page and optionally book a slot.
 */

import { chromium, Page } from 'playwright';
import * as fs from 'fs';
import * as os from 'os';

const SESSION_FILE = `${os.homedir()}/.tesco/session.json`;

export interface TescoSlot {
  slot_id: string;
  date: string;
  day: string;
  start_time: string;
  end_time: string;
  price: number;
  available: boolean;
}

async function loadSession(page: Page): Promise<void> {
  if (!fs.existsSync(SESSION_FILE)) {
    throw new Error('No Tesco session found. Please run: npm run groc -- --provider tesco login');
  }
  const session = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
  await page.context().addCookies(session.cookies);
}

export async function getTescoSlots(headless: boolean = true): Promise<TescoSlot[]> {
  const browser = await chromium.launch({
    headless,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = await browser.newPage({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
  });

  try {
    await loadSession(page);

    await page.goto('https://www.tesco.com/groceries/en-GB/delivery/slots', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    // Accept cookies if banner appears
    try {
      await page.click('#onetrust-accept-btn-handler', { timeout: 3000 });
      await page.waitForTimeout(1000);
    } catch {
      // No banner
    }

    await page.waitForTimeout(5000);

    const slots: TescoSlot[] = [];

    // Tesco renders slots as buttons/cells — selectors to try
    const slotElements = await page.$$(
      '[data-auto="slot-option"], [class*="delivery-slot"], [class*="slot-"], button[aria-label*="Delivery"]'
    );

    for (const el of slotElements) {
      try {
        const text = await el.textContent();
        if (!text) continue;

        const timeMatch = text.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
        const priceMatch = text.match(/£(\d+\.?\d*)/);
        const dateMatch = text.match(/(\w+)\s+(\d{1,2})\s+(\w+)/);

        if (!timeMatch) continue;

        const slotId =
          (await el.getAttribute('data-slot-id')) ||
          (await el.getAttribute('data-auto-id')) ||
          (await el.getAttribute('id')) ||
          `slot_${slots.length}`;

        slots.push({
          slot_id: slotId,
          date: dateMatch?.[0] || '',
          day: dateMatch?.[1] || '',
          start_time: `${timeMatch[1]}:${timeMatch[2]}`,
          end_time: `${timeMatch[3]}:${timeMatch[4]}`,
          price: priceMatch ? parseFloat(priceMatch[1]) : 0,
          available: !text.toLowerCase().includes('unavailable') && !text.toLowerCase().includes('full'),
        });
      } catch {
        // Skip
      }
    }

    if (slots.length === 0) {
      const bodyText = await page.textContent('body');
      if (bodyText?.includes('£40') || bodyText?.includes('minimum')) {
        throw new Error('Basket does not meet the minimum spend for Tesco delivery. Add more items first.');
      }
      await page.screenshot({ path: '/tmp/tesco-slots-debug.png', fullPage: true });
      throw new Error('No Tesco slots found. Check /tmp/tesco-slots-debug.png for page state.');
    }

    return slots;

  } finally {
    await browser.close();
  }
}

export async function bookTescoSlot(slotId: string, headless: boolean = false): Promise<void> {
  const browser = await chromium.launch({
    headless,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = await browser.newPage({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
  });

  try {
    await loadSession(page);

    await page.goto('https://www.tesco.com/groceries/en-GB/delivery/slots', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    try {
      await page.click('#onetrust-accept-btn-handler', { timeout: 3000 });
    } catch {
      // No banner
    }

    await page.waitForTimeout(5000);

    const slotEl =
      (await page.$(`[data-slot-id="${slotId}"]`)) ||
      (await page.$(`[data-auto-id="${slotId}"]`)) ||
      (await page.$(`#${slotId}`));

    if (!slotEl) {
      throw new Error(`Slot ${slotId} not found on page`);
    }

    await slotEl.click();
    await page.waitForTimeout(3000);

    // Look for confirm / book button after selecting slot
    const confirmBtn = await page.$(
      'button:has-text("Book"), button:has-text("Confirm"), button:has-text("Continue"), button:has-text("Reserve")'
    );
    if (confirmBtn) {
      await confirmBtn.click();
      await page.waitForTimeout(3000);
    }

    console.log('✅ Tesco slot reserved');

  } finally {
    if (!headless) {
      await page.waitForTimeout(3000);
    }
    await browser.close();
  }
}
