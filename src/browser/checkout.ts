import { chromium, Page } from 'playwright';
import * as fs from 'fs';
import * as os from 'os';

export interface CheckoutResult {
  order_id: string;
  total: number;
  slot_confirmed: boolean;
  payment_status: string;
}

async function loadSession(page: Page): Promise<void> {
  const sessionFile = `${os.homedir()}/.sainsburys/session.json`;
  if (!fs.existsSync(sessionFile)) {
    throw new Error('No session found. Please login first.');
  }
  
  const session = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
  await page.context().addCookies(session.cookies);
}

export async function checkout(dryRun: boolean = true): Promise<CheckoutResult> {
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
    
    console.log('🛒 Navigating to basket...');
    await page.goto('https://www.sainsburys.co.uk/gol-ui/trolley', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    // Accept cookies
    try {
      await page.click('#onetrust-accept-btn-handler', { timeout: 2000 });
    } catch (e) {}
    
    await page.waitForTimeout(3000);
    
    // Find checkout button
    const checkoutButton = await page.$('button:has-text("Checkout")') ||
                           await page.$('a:has-text("Checkout")') ||
                           await page.$('[data-testid="checkout-button"]');
    
    if (!checkoutButton) {
      throw new Error('Checkout button not found. Ensure basket has items and meets minimum spend.');
    }
    
    console.log('💳 Proceeding to checkout...');
    await checkoutButton.click();
    await page.waitForTimeout(5000);
    
    // At this point we should be on checkout page
    // Check if slot selection is required
    const slotRequired = await page.$('text=Select a delivery slot') ||
                         await page.$('text=Book a slot');
    
    if (slotRequired) {
      console.log('📅 Slot selection required - navigating...');
      const slotButton = await page.$('button:has-text("Select slot")') ||
                         await page.$('a[href*="slot"]');
      if (slotButton) {
        await slotButton.click();
        await page.waitForTimeout(5000);
        
        // Select first available slot
        const firstSlot = await page.$('button:has-text("Book"):not(:has-text("Unavailable"))');
        if (firstSlot) {
          console.log('🎯 Selecting first available slot...');
          await firstSlot.click();
          await page.waitForTimeout(3000);
          
          // Confirm slot
          const confirmSlot = await page.$('button:has-text("Confirm")');
          if (confirmSlot) {
            await confirmSlot.click();
            await page.waitForTimeout(3000);
          }
        }
      }
    }
    
    // Now on payment/final checkout page
    console.log('📋 Reviewing order...');
    
    // Extract order details
    const orderText = await page.textContent('body');
    const totalMatch = orderText?.match(/Total[:\s]*£(\d+\.?\d*)/i);
    const total = totalMatch ? parseFloat(totalMatch[1]) : 0;
    
    console.log(`💰 Order total: £${total}`);
    
    if (dryRun) {
      console.log('🔍 DRY RUN - Not placing order');
      await page.screenshot({ path: '/tmp/sainsburys-checkout-preview.png', fullPage: true });
      console.log('📸 Screenshot saved to /tmp/sainsburys-checkout-preview.png');
      
      return {
        order_id: 'DRY_RUN',
        total,
        slot_confirmed: slotRequired !== null,
        payment_status: 'pending'
      };
    }
    
    // Real checkout - find and click place order button
    const placeOrderButton = await page.$('button:has-text("Place order")') ||
                             await page.$('button:has-text("Pay now")') ||
                             await page.$('[data-testid="place-order"]');
    
    if (!placeOrderButton) {
      throw new Error('Place order button not found');
    }
    
    console.log('✅ Placing order...');
    await placeOrderButton.click();
    await page.waitForTimeout(5000);
    
    // Wait for confirmation page
    await page.waitForSelector('text=Order confirmed, text=Thank you', { timeout: 30000 });
    
    // Extract order ID
    const confirmationText = await page.textContent('body');
    const orderIdMatch = confirmationText?.match(/Order\s+(?:ID|number)[:\s]*(\w+)/i);
    const orderId = orderIdMatch ? orderIdMatch[1] : 'UNKNOWN';
    
    console.log(`✅ Order placed: ${orderId}`);
    
    await page.screenshot({ path: '/tmp/sainsburys-order-confirmation.png', fullPage: true });
    
    return {
      order_id: orderId,
      total,
      slot_confirmed: true,
      payment_status: 'completed'
    };
    
  } finally {
    await page.waitForTimeout(3000);
    await browser.close();
  }
}
