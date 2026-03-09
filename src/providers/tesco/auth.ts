/**
 * Tesco Authentication
 *
 * Interactive browser-based login via Playwright.
 * Tesco uses email OTP (not SMS) for MFA, and Akamai bot-detection,
 * so we launch a real non-headless browser with anti-bot flags.
 *
 * Session stored at ~/.tesco/session.json (same shape as Sainsbury's).
 */

import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as readline from 'readline';

const CONFIG_DIR = path.join(os.homedir(), '.tesco');
const SESSION_FILE = path.join(CONFIG_DIR, 'session.json');

export interface TescoSession {
  cookies: any[];
  expiresAt: string;
  lastLogin: string;
}

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function askHidden(question: string): Promise<string> {
  return new Promise(resolve => {
    process.stdout.write(question);
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
    process.stdin.setRawMode(true);
    let input = '';
    process.stdin.on('data', function onData(char) {
      const c = char.toString();
      if (c === '\r' || c === '\n') {
        process.stdin.setRawMode(false);
        process.stdin.removeListener('data', onData);
        process.stdout.write('\n');
        rl.close();
        resolve(input);
      } else if (c === '\x7f') {
        input = input.slice(0, -1);
      } else {
        input += c;
      }
    });
  });
}

export async function login(email: string, password?: string): Promise<TescoSession> {
  const pwd = password || process.env.TESCO_PASSWORD || await askHidden('Password: ');
  console.log('🔐 Logging in to Tesco...');

  const browser = await chromium.launch({
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
  });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  try {
    console.log('📍 Navigating to Tesco sign-in...');
    await page.goto(
      'https://www.tesco.com/account/auth/en-GB/login?from=https%3A%2F%2Fwww.tesco.com%2Fgroceries%2Fen-GB%2F',
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );

    // Accept cookies
    try {
      const acceptBtn = page.locator('#onetrust-accept-btn-handler');
      if (await acceptBtn.isVisible({ timeout: 4000 })) {
        await acceptBtn.click();
        await page.waitForTimeout(1500);
      }
    } catch {
      // No cookie banner
    }

    // Email field
    console.log('📧 Entering email...');
    await page.waitForSelector('input[type="email"], input[name="username"], #username, input[name="email"]', { timeout: 15000 });
    await page.fill('input[type="email"], input[name="username"], #username, input[name="email"]', email);
    await page.waitForTimeout(400);

    // Continue / Next button (some flows split email + password)
    const continueBtn = page.locator('button:has-text("Continue"), button:has-text("Next"), button[type="submit"]').first();
    if (await continueBtn.isVisible({ timeout: 2000 })) {
      await continueBtn.click();
      await page.waitForTimeout(1500);
    }

    // Password field — long timeout so user can solve Akamai/CAPTCHA challenges manually
    console.log('🔑 Waiting for password field... (solve any challenges in the browser window)');
    try {
      await page.waitForSelector('input[type="password"], input[name="password"], #password', { timeout: 60000 });
      await page.fill('input[type="password"], input[name="password"], #password', pwd);
      await page.waitForTimeout(400);

      // Submit
      console.log('👆 Submitting login...');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);
    } catch {
      // Password field never appeared — Akamai bot detection likely triggered
      console.log('\n⚠️  Automated form fill timed out (Akamai may be showing a challenge).');
      console.log('   Please complete the login in the browser window, then press Enter here.');
      await ask('Press Enter once logged in: ');
    }

    const currentUrl = page.url();
    console.log(`📍 Post-login URL: ${currentUrl}`);

    // Handle MFA / email verification
    if (
      currentUrl.includes('challenge') ||
      currentUrl.includes('otp') ||
      currentUrl.includes('verify') ||
      currentUrl.includes('security')
    ) {
      // Check if there's a numeric code input (OTP) or just a "click the link" flow
      const hasCodeInput = await page.$('input[name="otp"], input[name="code"], input[type="number"], #otp, #code')
        .then(el => !!el).catch(() => false);

      if (hasCodeInput) {
        console.log('\n🔐 MFA required — check your email for a one-time code.');
        const otp = await ask('Enter the OTP code from your email: ');
        if (!otp || otp.length < 4) throw new Error('Invalid OTP code');
        await page.fill('input[name="otp"], input[name="code"], input[type="number"], #otp, #code', otp);
        await page.waitForTimeout(400);
        await page.click('button[type="submit"]');
      } else {
        // "Is this you?" notification — session cookies are already set, just navigate away
        console.log('\n📧 Tesco sent a "is this you?" notification — session already established.');
        console.log('   Navigating to groceries...\n');
        await page.goto('https://www.tesco.com/groceries/en-GB/', {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        });
        await page.waitForTimeout(2000);
      }

    } else if (currentUrl.includes('/login') || currentUrl.includes('sign-in')) {
      throw new Error('Login failed — still on login page. Check email/password.');
    }

    console.log('✅ Login successful!');

    const cookies = await context.cookies();
    const session: TescoSession = {
      cookies,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      lastLogin: new Date().toISOString(),
    };

    saveSession(session);
    await browser.close();
    return session;

  } catch (error) {
    await browser.close();
    throw error;
  }
}

export function saveSession(session: TescoSession): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2));
  console.log(`💾 Tesco session saved to ${SESSION_FILE}`);
}

export function loadSession(): TescoSession | null {
  if (!fs.existsSync(SESSION_FILE)) return null;

  const session: TescoSession = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));

  if (new Date(session.expiresAt) < new Date()) {
    console.log('⚠️  Tesco session expired — please login again');
    return null;
  }

  return session;
}

export function getCookieString(session: TescoSession): string {
  return session.cookies.map(c => `${c.name}=${c.value}`).join('; ');
}

export function clearSession(): void {
  if (fs.existsSync(SESSION_FILE)) {
    fs.unlinkSync(SESSION_FILE);
    console.log('🗑️  Tesco session cleared');
  }
}
