/**
 * Tesco Session Import
 *
 * Fallback for when Playwright login is blocked by Akamai.
 * User exports cookies from Chrome DevTools (Application > Cookies > Export)
 * and passes the JSON file here — we write it to ~/.tesco/session.json.
 *
 * Usage:
 *   npm run groc -- --provider tesco import-session --file ~/Downloads/tesco-cookies.json
 *
 * How to export cookies from Chrome:
 *   1. Log in to tesco.com manually in Chrome
 *   2. Open DevTools (F12)
 *   3. Application tab > Storage > Cookies > https://www.tesco.com
 *   4. Right-click > Export (or use "Cookie Editor" extension)
 *   5. Save as JSON file and pass to --file flag
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { saveSession, TescoSession } from './auth';

export function importSession(filePath: string): void {
  const resolved = filePath.startsWith('~')
    ? path.join(os.homedir(), filePath.slice(1))
    : path.resolve(filePath);

  if (!fs.existsSync(resolved)) {
    throw new Error(`Cookie file not found: ${resolved}`);
  }

  const raw = JSON.parse(fs.readFileSync(resolved, 'utf-8'));

  // Normalise — Chrome DevTools exports an array; "Cookie Editor" exports
  // { [domain]: cookie[] } or an array with slightly different shape.
  let cookies: any[];

  if (Array.isArray(raw)) {
    cookies = raw;
  } else if (raw.cookies && Array.isArray(raw.cookies)) {
    cookies = raw.cookies;
  } else {
    // Try to flatten object-of-arrays format
    cookies = Object.values(raw).flat() as any[];
  }

  if (cookies.length === 0) {
    throw new Error('No cookies found in the file. Check the export format.');
  }

  // Normalise cookie shape to match Playwright format
  const normalised = cookies.map((c: any) => ({
    name: c.name || c.Name,
    value: c.value || c.Value,
    domain: c.domain || c.Domain || '.tesco.com',
    path: c.path || c.Path || '/',
    expires: c.expirationDate || c.expires || -1,
    httpOnly: c.httpOnly || c.HttpOnly || false,
    secure: c.secure || c.Secure || false,
    sameSite: c.sameSite || c.SameSite || 'Lax',
  }));

  const session: TescoSession = {
    cookies: normalised,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    lastLogin: new Date().toISOString(),
  };

  saveSession(session);
  console.log(`✅ Imported ${normalised.length} cookies — Tesco session ready`);
}
