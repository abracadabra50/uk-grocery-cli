import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.sainsburys');
const SESSION_FILE = path.join(CONFIG_DIR, 'session.json');

export interface SessionData {
  cookies: any[];
  expiresAt: string;
  lastLogin: string;
}

export async function login(email: string, password: string): Promise<SessionData> {
  console.log('🔐 Logging in to Sainsbury\'s...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });
  
  const page = await context.newPage();
  
  try {
    // Go to login page
    console.log('📍 Navigating to login page...');
    await page.goto('https://www.sainsburys.co.uk/gol-ui/login');
    await page.waitForTimeout(2000);
    
    // Fill in email
    console.log('📧 Entering email...');
    await page.fill('input[type="email"], input[name="email"], #username', email);
    await page.waitForTimeout(500);
    
    // Fill in password
    console.log('🔑 Entering password...');
    await page.fill('input[type="password"], input[name="password"], #password', password);
    await page.waitForTimeout(500);
    
    // Click login button
    console.log('👆 Clicking login...');
    await page.click('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in")');
    
    // Wait for navigation
    console.log('⏳ Waiting for login...');
    await page.waitForTimeout(5000);
    
    // Check if logged in
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('login')) {
      throw new Error('Login failed - still on login page');
    }
    
    console.log('✅ Login successful!');
    
    // Get cookies
    const cookies = await context.cookies();
    
    const sessionData: SessionData = {
      cookies: cookies,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      lastLogin: new Date().toISOString()
    };
    
    // Save session
    saveSession(sessionData);
    
    await browser.close();
    
    return sessionData;
    
  } catch (error) {
    await browser.close();
    throw error;
  }
}

export function saveSession(session: SessionData) {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  
  fs.writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2));
  console.log(`💾 Session saved to ${SESSION_FILE}`);
}

export function loadSession(): SessionData | null {
  if (!fs.existsSync(SESSION_FILE)) {
    return null;
  }
  
  const data = fs.readFileSync(SESSION_FILE, 'utf8');
  const session: SessionData = JSON.parse(data);
  
  // Check if expired
  if (new Date(session.expiresAt) < new Date()) {
    console.log('⚠️  Session expired');
    return null;
  }
  
  return session;
}

export function getCookieString(session: SessionData): string {
  return session.cookies.map(c => `${c.name}=${c.value}`).join('; ');
}

export function clearSession() {
  if (fs.existsSync(SESSION_FILE)) {
    fs.unlinkSync(SESSION_FILE);
    console.log('🗑️  Session cleared');
  }
}
