/**
 * Tesco API Discovery Tool
 *
 * Launches a non-headless Playwright session that intercepts all network
 * requests to *.tesco.com so we can learn the real endpoint paths,
 * required headers, and cookie names before writing the API client.
 *
 * Usage:
 *   npm run groc -- --provider tesco discover
 */

import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as readline from 'readline';

const CONFIG_DIR = path.join(os.homedir(), '.tesco');
const DISCOVERY_FILE = path.join(CONFIG_DIR, 'api-discovery.json');

interface CapturedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  postData?: string;
  timestamp: string;
}

interface CapturedResponse {
  url: string;
  status: number;
  headers: Record<string, string>;
  bodySnippet?: string;
  timestamp: string;
}

interface DiscoveryData {
  capturedAt: string;
  requests: CapturedRequest[];
  responses: CapturedResponse[];
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

function isTescoUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host.endsWith('tesco.com') || host.endsWith('tesco.io');
  } catch {
    return false;
  }
}

export async function discover(): Promise<void> {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }

  console.log('\n🔍 Tesco API Discovery\n');
  console.log('This tool intercepts all network requests made by Tesco\'s website');
  console.log('so we can identify the REST/GraphQL endpoints used by the grocery section.\n');

  const browser = await chromium.launch({
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
    ],
  });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
  });

  const requests: CapturedRequest[] = [];
  const responses: CapturedResponse[] = [];

  const page = await context.newPage();

  // Capture all outgoing requests to tesco.com
  page.on('request', req => {
    if (!isTescoUrl(req.url())) return;
    const entry: CapturedRequest = {
      url: req.url(),
      method: req.method(),
      headers: req.headers(),
      timestamp: new Date().toISOString(),
    };
    const pd = req.postData();
    if (pd) entry.postData = pd.slice(0, 2000); // truncate large bodies
    requests.push(entry);
  });

  // Capture responses (with body snippets for JSON)
  page.on('response', async res => {
    if (!isTescoUrl(res.url())) return;
    const entry: CapturedResponse = {
      url: res.url(),
      status: res.status(),
      headers: res.headers(),
      timestamp: new Date().toISOString(),
    };
    try {
      const ct = res.headers()['content-type'] || '';
      if (ct.includes('json')) {
        const body = await res.text();
        entry.bodySnippet = body.slice(0, 1000);
      }
    } catch {
      // ignore body read errors
    }
    responses.push(entry);
  });

  // Navigate to groceries homepage
  console.log('📍 Opening Tesco Groceries...');
  await page.goto('https://www.tesco.com/groceries/en-GB/', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  // Accept cookies if banner appears
  try {
    await page.click('#onetrust-accept-btn-handler', { timeout: 5000 });
    console.log('🍪 Accepted cookie consent');
    await page.waitForTimeout(1000);
  } catch {
    // No banner
  }

  console.log('\n⏸  Step 1: Log in to Tesco in the browser window.');
  console.log('   Once you are fully logged in and can see your account, press Enter here.\n');
  await ask('Press Enter after logging in...');

  // Trigger a search so we capture search API calls
  console.log('\n📍 Navigating to search for "milk"...');
  await page.goto('https://www.tesco.com/groceries/en-GB/search?query=milk', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await page.waitForTimeout(3000);

  // Visit basket/trolley page
  console.log('📍 Visiting trolley page...');
  await page.goto('https://www.tesco.com/groceries/en-GB/trolley', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await page.waitForTimeout(3000);

  // Visit order history page
  console.log('📍 Visiting order history...');
  await page.goto('https://www.tesco.com/groceries/en-GB/orders', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await page.waitForTimeout(3000);

  console.log('\n⏸  Step 2: Browse any other Tesco pages you want to capture.');
  console.log('   (e.g. add an item to trolley, view a product, check delivery slots)');
  console.log('   When you are done, press Enter to save results and close the browser.\n');
  await ask('Press Enter to finish discovery...');

  await browser.close();

  // Save results
  const data: DiscoveryData = {
    capturedAt: new Date().toISOString(),
    requests,
    responses,
  };

  fs.writeFileSync(DISCOVERY_FILE, JSON.stringify(data, null, 2));

  // Print summary
  const interestingPaths = new Set<string>();
  for (const r of requests) {
    try {
      const u = new URL(r.url);
      if (u.pathname.includes('/api/') || u.pathname.includes('/resources/') ||
          u.pathname.includes('/graphql') || u.pathname.includes('/groceries-api/')) {
        interestingPaths.add(`${r.method} ${u.pathname}`);
      }
    } catch {
      // ignore
    }
  }

  console.log(`\n✅ Discovery complete!`);
  console.log(`   Captured ${requests.length} requests, ${responses.length} responses`);
  console.log(`   Saved to: ${DISCOVERY_FILE}\n`);

  if (interestingPaths.size > 0) {
    console.log('📋 Interesting API paths found:\n');
    [...interestingPaths].sort().forEach(p => console.log(`   ${p}`));
    console.log();
  }

  console.log('💡 Review the discovery file to fill in src/providers/tesco/api.ts endpoints.');
}
