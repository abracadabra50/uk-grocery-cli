import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as os from 'os';

export interface Slot {
  slot_id: string;
  date: string;
  start_time: string;
  end_time: string;
  price: number;
  available: boolean;
  slot_type?: string;
}

async function loadSession(page: Page): Promise<void> {
  const sessionFile = `${os.homedir()}/.sainsburys/session.json`;
  if (!fs.existsSync(sessionFile)) {
    throw new Error('No session found. Please login first.');
  }
  
  const session = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
  await page.context().addCookies(session.cookies);
}

export async function getSlots(): Promise<Slot[]> {
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--disable-blink-features=AutomationControlled']
  });
  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 }
  });
  
  // Hide automation markers
  await page.addInitScript(`
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  `);
  
  try {
    await loadSession(page);
    
    console.log('📅 Navigating to slot selection...');
    await page.goto('https://www.sainsburys.co.uk/gol-ui/slotselection', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    // Accept cookies
    try {
      await page.click('#onetrust-accept-btn-handler', { timeout: 2000 });
    } catch (e) {}
    
    await page.waitForTimeout(5000);
    
    const slots: Slot[] = [];
    
    // Try to find slot elements
    const slotElements = await page.$$('[data-testid*="slot"], [data-slot-id], .slot-option, button:has-text("Book")');
    console.log(`Found ${slotElements.length} potential slot elements`);
    
    for (const el of slotElements) {
      try {
        const text = await el.textContent();
        const slotId = await el.getAttribute('data-slot-id') || 
                       await el.getAttribute('id') ||
                       `slot_${slots.length}`;
        
        const timeMatch = text?.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
        const priceMatch = text?.match(/£(\d+\.?\d*)/);
        
        if (timeMatch) {
          slots.push({
            slot_id: slotId,
            date: new Date().toISOString().split('T')[0],
            start_time: `${timeMatch[1]}:${timeMatch[2]}`,
            end_time: `${timeMatch[3]}:${timeMatch[4]}`,
            price: priceMatch ? parseFloat(priceMatch[1]) : 0,
            available: !(text?.includes('Unavailable') || text?.includes('Sold out'))
          });
        }
      } catch (e) {}
    }
    
    if (slots.length === 0) {
      await page.screenshot({ path: '/tmp/sainsburys-slots.png', fullPage: true });
      const html = await page.content();
      fs.writeFileSync('/tmp/sainsburys-slots.html', html);
      console.log('📸 Saved screenshot and HTML to /tmp/');
    }
    
    return slots;
    
  } finally {
    await browser.close();
  }
}

export async function bookSlot(slotId: string): Promise<void> {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });
  
  try {
    await loadSession(page);
    
    await page.goto('https://www.sainsburys.co.uk/gol-ui/slotselection', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    try {
      await page.click('#onetrust-accept-btn-handler', { timeout: 2000 });
    } catch (e) {}
    
    await page.waitForTimeout(5000);
    
    const slotElement = await page.$(`[data-slot-id="${slotId}"]`) ||
                        await page.$(`#${slotId}`);
    
    if (!slotElement) {
      throw new Error(`Slot ${slotId} not found`);
    }
    
    await slotElement.click();
    await page.waitForTimeout(3000);
    
    const confirmButton = await page.$('button:has-text("Book"), button:has-text("Confirm")');
    if (confirmButton) {
      await confirmButton.click();
      await page.waitForTimeout(3000);
    }
    
    console.log('✅ Slot booked');
    
  } finally {
    await page.waitForTimeout(2000);
    await browser.close();
  }
}
