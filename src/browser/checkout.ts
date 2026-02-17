import { chromium, Page } from 'playwright';
import { USER_AGENT } from '../constants';
import * as fs from 'fs';
import * as os from 'os';

export interface CheckoutResult {
  order_id: string;
  total: number;
  delivery_slot?: string;
  delivery_cost: number;
  items_count: number;
  status: 'preview' | 'payment_required' | 'completed';
  payment_url?: string;
}

async function loadSession(page: Page): Promise<void> {
  const sessionFile = `${os.homedir()}/.sainsburys/session.json`;
  if (!fs.existsSync(sessionFile)) {
    throw new Error('No session found. Please login first.');
  }
  
  const session = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
  await page.context().addCookies(session.cookies);
}

/**
 * Navigate checkout flow and extract order details
 * 
 * IMPORTANT: This NEVER completes payment automatically
 * - dryRun=true: Preview only, no slot booking
 * - dryRun=false: Books slot, navigates to payment page, then STOPS
 * 
 * User must complete payment manually in browser or via separate flow
 */
export async function checkout(dryRun: boolean = true): Promise<CheckoutResult> {
  const browser = await chromium.launch({ 
    headless: false, // Always show browser for checkout - transparency
    args: ['--disable-blink-features=AutomationControlled']
  });
  
  const page = await browser.newPage({
    userAgent: USER_AGENT,
    viewport: { width: 1920, height: 1080 }
  });
  
  try {
    await loadSession(page);
    
    console.log('🛒 Step 1: Loading basket...');
    await page.goto('https://www.sainsburys.co.uk/gol-ui/trolley', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    // Accept cookies if banner is present
    try {
      await page.click('#onetrust-accept-btn-handler', { timeout: 3000 });
    } catch (e) {
      // Cookie banner not found or already dismissed
    }
    
    await page.waitForTimeout(3000);
    
    // Extract basket info
    const pageText = await page.textContent('body');
    const totalMatch = pageText?.match(/Total[:\s]*£(\d+\.?\d*)/i);
    const total = totalMatch ? parseFloat(totalMatch[1]) : 0;
    
    console.log(`💰 Basket total: £${total}`);
    
    if (total < 25) {
      throw new Error(`Basket total £${total} is below £25 minimum spend`);
    }
    
    if (dryRun) {
      console.log('\n🔍 DRY RUN MODE');
      console.log('└─ Basket preview only');
      console.log('└─ No slot will be booked');
      console.log('└─ No payment will be requested');
      
      await page.screenshot({ path: '/tmp/checkout-preview.png', fullPage: true });
      
      return {
        order_id: 'DRY_RUN',
        total,
        delivery_cost: 0,
        items_count: 0,
        status: 'preview'
      };
    }
    
    // Real checkout flow starts here
    console.log('\n💳 Step 2: Proceeding to checkout...');
    
    const checkoutButton = await page.$('button:has-text("Checkout"), a:has-text("Checkout")');
    if (!checkoutButton) {
      throw new Error('Checkout button not found');
    }
    
    await checkoutButton.click();
    await page.waitForTimeout(5000);
    
    console.log('📍 Current URL:', page.url());
    
    // Check if slot selection is needed
    const currentUrl = page.url();
    if (currentUrl.includes('slot')) {
      console.log('\n📅 Step 3: Slot selection required...');
      console.log('⚠️  Browser is open - please select a delivery slot manually');
      console.log('⏳ Waiting for you to select and confirm slot...');
      
      // Wait for user to select slot (URL will change when they continue)
      let slotConfirmed = false;
      for (let i = 0; i < 60; i++) {
        await page.waitForTimeout(5000);
        const newUrl = page.url();
        if (!newUrl.includes('slot') || newUrl.includes('checkout') || newUrl.includes('payment')) {
          slotConfirmed = true;
          break;
        }
      }
      
      if (!slotConfirmed) {
        throw new Error('Slot selection timeout - no slot was confirmed');
      }
      
      console.log('✅ Slot confirmed');
    }
    
    // Now at payment/final checkout page
    console.log('\n💳 Step 4: At payment page...');
    console.log('⏳ Waiting for page to load...');
    await page.waitForTimeout(3000);
    
    const finalPageText = await page.textContent('body');
    const finalTotalMatch = finalPageText?.match(/Total[:\s]*£(\d+\.?\d*)/i);
    const finalTotal = finalTotalMatch ? parseFloat(finalTotalMatch[1]) : total;
    
    const deliveryCostMatch = finalPageText?.match(/Delivery[:\s]*£(\d+\.?\d*)/i);
    const deliveryCost = deliveryCostMatch ? parseFloat(deliveryCostMatch[1]) : 0;
    
    await page.screenshot({ path: '/tmp/checkout-payment-page.png', fullPage: true });
    
    console.log('\n📊 Order Summary:');
    console.log(`├─ Items total: £${total}`);
    console.log(`├─ Delivery: £${deliveryCost}`);
    console.log(`└─ Total: £${finalTotal}`);
    
    console.log('\n🛑 PAYMENT REQUIRED');
    console.log('╔═══════════════════════════════════════════╗');
    console.log('║  THIS CLI DOES NOT HANDLE PAYMENT        ║');
    console.log('║  Complete payment manually in browser     ║');
    console.log('║  OR use saved payment method if prompted  ║');
    console.log('╚═══════════════════════════════════════════╝');
    
    console.log('\n⏳ Keeping browser open for 5 minutes...');
    console.log('   Close this terminal to cancel');
    console.log('   Complete payment in browser to finish order\n');
    
    // Wait for user to complete payment
    await page.waitForTimeout(300000); // 5 minutes
    
    // Check if order was completed
    const finalUrl = page.url();
    if (finalUrl.includes('confirmation') || finalUrl.includes('complete')) {
      const orderIdMatch = await page.textContent('body');
      const orderId = orderIdMatch?.match(/Order\s+(?:ID|number)[:\s]*(\w+)/i)?.[1] || 'UNKNOWN';
      
      return {
        order_id: orderId,
        total: finalTotal,
        delivery_cost: deliveryCost,
        items_count: 0,
        status: 'completed'
      };
    }
    
    return {
      order_id: 'PENDING',
      total: finalTotal,
      delivery_cost: deliveryCost,
      items_count: 0,
      status: 'payment_required',
      payment_url: page.url()
    };
    
  } finally {
    await browser.close();
  }
}
