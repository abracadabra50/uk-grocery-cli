/**
 * Developer tool: capture the real GraphQL search query from the Tesco search page.
 *
 * NOTE: This is NOT a CLI command. It is a one-shot debug script for developers
 * who need to inspect what GraphQL operations Tesco's frontend makes.
 * It should NOT be invoked via `npm run groc`.
 *
 * Prerequisites: an active ~/.tesco/session.json (run `import-session` first).
 * Run directly with: npx tsx src/providers/tesco/capture-search.ts
 */

import { chromium } from 'playwright';
import * as fs from 'fs';
import * as os from 'os';

(async () => {
  const session = JSON.parse(fs.readFileSync(`${os.homedir()}/.tesco/session.json`, 'utf-8'));

  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
  });
  await context.addCookies(session.cookies);

  const page = await context.newPage();
  const captured: { url: string; body: string }[] = [];

  page.on('request', req => {
    const url = req.url();
    if (req.method() === 'POST') {
      const body = req.postData();
      if (body) captured.push({ url, body: body.slice(0, 5000) });
    }
  });

  // Also intercept responses to capture JSON data
  const responses: { url: string; body: string }[] = [];
  page.on('response', async res => {
    try {
      const url = res.url();
      const ct = res.headers()['content-type'] || '';
      if (ct.includes('json') && (url.includes('tesco') || url.includes('xapi'))) {
        const body = await res.text();
        responses.push({ url, body: body.slice(0, 3000) });
      }
    } catch {}
  });

  console.log('Loading Tesco search page...');
  await page.goto('https://www.tesco.com/groceries/en-GB/search?query=milk', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await page.waitForTimeout(8000);

  // Get the page HTML to look for SSR data
  const html = await page.content();
  await browser.close();

  console.log(`Captured ${captured.length} POST requests, ${responses.length} JSON responses`);

  console.log('Page URL:', await page.url?.() || 'unknown');
  console.log('HTML size:', html.length);
  console.log('HTML snippet:', html.slice(0, 500));

  // Save HTML for offline parsing
  fs.writeFileSync('/tmp/tesco-search.html', html);
  console.log('HTML saved to /tmp/tesco-search.html');

  // Look for Next.js SSR data
  const nextMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nextMatch) {
    console.log('\n📦 Found __NEXT_DATA__ (SSR products):');
    try {
      const d = JSON.parse(nextMatch[1]);
      console.log(JSON.stringify(d).slice(0, 3000));
    } catch {
      console.log(nextMatch[1].slice(0, 2000));
    }
  } else {
    console.log('No __NEXT_DATA__ found');
  }

  // Show any JSON API responses captured
  console.log('\n📡 JSON responses:');
  for (const r of responses.slice(0, 5)) {
    console.log('URL:', r.url.slice(0, 100));
    console.log('Body:', r.body.slice(0, 400));
    console.log();
  }

  // Show POST ops if any
  const seen = new Set<string>();
  for (const c of captured) {
    if (!c.url.includes('xapi.tesco.com')) continue;
    try {
      const ops: any[] = JSON.parse(c.body);
      for (const op of (Array.isArray(ops) ? ops : [ops])) {
        const name = op.operationName as string;
        if (name && !seen.has(name)) {
          seen.add(name);
          console.log(`\n=== xapi: ${name} ===`);
          console.log('VARS:', JSON.stringify(op.variables || {}).slice(0, 300));
        }
      }
    } catch {}
  }
})();
