import { chromium, Page } from 'playwright';
import * as fs from 'fs';
import * as os from 'os';

export interface Slot {
  slot_id: string;
  date: string;
  day: string;
  start_time: string;
  end_time: string;
  price: number;
  available: boolean;
}

async function loadSession(page: Page): Promise<void> {
  const sessionFile = `${os.homedir()}/.sainsburys/session.json`;
  if (!fs.existsSync(sessionFile)) {
    throw new Error('No session found. Please login first.');
  }
  
  const session = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
  await page.context().addCookies(session.cookies);
}

export async function getSlots(headless: boolean = true): Promise<Slot[]> {
  const browser = await chromium.launch({ 
    headless,
    args: ['--disable-blink-features=AutomationControlled']
  });
  
  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 }
  });
  
  try {
    await loadSession(page);
    
    // Navigate to slot selection
    await page.goto('https://www.sainsburys.co.uk/gol-ui/slotselection', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    // Accept cookies
    try {
      await page.click('#onetrust-accept-btn-handler', { timeout: 3000 });
      await page.waitForTimeout(1000);
    } catch (e) {
      // No cookie banner
    }
    
    // Wait for page to load
    await page.waitForTimeout(5000);
    
    // Extract slots from the page
    // This will need to be refined based on actual DOM structure
    const slots: Slot[] = [];
    
    // Look for slot buttons/elements
    const slotElements = await page.$$('[data-testid*="slot"], button:has-text("Book"), .slot-option, [class*="delivery-slot"]');
    
    for (const el of slotElements) {
      try {
        const text = await el.textContent();
        if (!text) continue;
        
        // Parse slot information from text
        // Format might be: "Monday 17 Feb, 08:00-09:00 £1.00"
        const timeMatch = text.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
        const priceMatch = text.match(/£(\d+\.?\d*)/);
        const dateMatch = text.match(/(\w+)\s+(\d{1,2})\s+(\w+)/);
        
        if (timeMatch) {
          const slotId = await el.getAttribute('data-slot-id') || 
                        await el.getAttribute('id') ||
                        `slot_${slots.length}`;
          
          slots.push({
            slot_id: slotId,
            date: dateMatch?.[0] || '',
            day: dateMatch?.[1] || '',
            start_time: `${timeMatch[1]}:${timeMatch[2]}`,
            end_time: `${timeMatch[3]}:${timeMatch[4]}`,
            price: priceMatch ? parseFloat(priceMatch[1]) : 0,
            available: !text.toLowerCase().includes('unavailable')
          });
        }
      } catch (e) {
        // Skip this element
      }
    }
    
    // If no slots found, check if basket meets minimum
    if (slots.length === 0) {
      const pageText = await page.textContent('body');
      if (pageText?.includes('£25') || pageText?.includes('minimum')) {
        throw new Error('Basket does not meet £25 minimum spend. Add more items first.');
      }
      
      // Save debug info
      await page.screenshot({ path: '/tmp/slots-debug.png', fullPage: true });
      throw new Error('No slots found on page. Check /tmp/slots-debug.png for details.');
    }
    
    return slots;
    
  } finally {
    await browser.close();
  }
}

export async function bookSlot(slotId: string, headless: boolean = false): Promise<void> {
  const browser = await chromium.launch({ 
    headless, // Show browser for booking to see what happens
    args: ['--disable-blink-features=AutomationControlled']
  });
  
  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 }
  });
  
  try {
    await loadSession(page);
    
    await page.goto('https://www.sainsburys.co.uk/gol-ui/slotselection', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    // Accept cookies
    try {
      await page.click('#onetrust-accept-btn-handler', { timeout: 3000 });
    } catch (e) {}
    
    await page.waitForTimeout(5000);
    
    // Find the slot
    const slotElement = await page.$(`[data-slot-id="${slotId}"]`) ||
                        await page.$(`#${slotId}`);
    
    if (!slotElement) {
      throw new Error(`Slot ${slotId} not found`);
    }
    
    // Click the slot
    await slotElement.click();
    await page.waitForTimeout(3000);
    
    // Look for confirm/book button
    const confirmButton = await page.$('button:has-text("Book"), button:has-text("Confirm"), button:has-text("Continue")');
    if (confirmButton) {
      await confirmButton.click();
      await page.waitForTimeout(3000);
    }
    
    // Slot is now reserved
    console.log('✅ Slot reserved');
    
  } finally {
    if (!headless) {
      await page.waitForTimeout(3000);
    }
    await browser.close();
  }
}
