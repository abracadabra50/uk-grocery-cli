# Troubleshooting Guide

Common issues and solutions for UK Grocery CLI.

---

## Authentication Issues

### Login Fails with Playwright

**Symptom:** `groc login` hangs or fails

**Causes:**
- Playwright not installed
- Chromium browser missing
- Network issues
- Incorrect credentials

**Solutions:**

```bash
# Install Playwright browsers
npx playwright install chromium

# Try login with visible browser (debug)
groc --provider sainsburys login --email EMAIL --password PASS

# Check Playwright installation
npx playwright --version
```

### Session Expired

**Symptom:** Commands return 401/403 errors

**Solution:**

```bash
# Re-login
groc --provider sainsburys login --email EMAIL --password PASS

# Or manually delete session and retry
rm ~/.sainsburys/session.json
groc --provider sainsburys login --email EMAIL --password PASS
```

### "Invalid credentials" Error

**Causes:**
- Wrong email/password
- Account locked
- Supermarket requires 2FA

**Solutions:**

1. Verify credentials by logging in on website
2. Disable 2FA temporarily (if possible)
3. Use browser session export method:

```bash
# Login on website, export cookies manually
# Copy cookies from DevTools → Application → Cookies
# Save to ~/.sainsburys/session.json as:
{
  "cookies": "session=...; path=/; ...",
  "savedAt": "2026-02-14T20:00:00.000Z"
}
```

---

## Search Issues

### No Results Found

**Symptom:** Search returns empty array

**Causes:**
- Typo in query
- Product not available
- Region restrictions (Ocado)

**Solutions:**

```bash
# Try broader search
groc --provider sainsburys search "milk"  # Instead of "organic milk"

# Try different provider
groc --provider ocado search "milk"

# Check JSON output for errors
groc --provider sainsburys search "milk" --json
```

### Search Returns Wrong Products

**Symptom:** Results don't match query

**Cause:** Supermarket search algorithms vary

**Solution:**

Use more specific search terms:

```bash
# Bad: Too generic
groc search "organic"

# Good: Specific product
groc search "organic whole milk"
groc search "organic strawberries"
```

---

## Basket Issues

### Can't Add to Basket

**Symptom:** `groc add` fails

**Causes:**
- Not logged in
- Session expired
- Product out of stock
- Invalid product ID

**Solutions:**

```bash
# 1. Check authentication
groc --provider sainsburys basket  # Should show basket or auth error

# 2. Re-login if needed
groc --provider sainsburys login --email EMAIL --password PASS

# 3. Verify product ID
groc --provider sainsburys search "milk" --json | grep product_uid

# 4. Try with valid product ID
groc --provider sainsburys add 357937 --qty 1
```

### Basket Shows Wrong Total

**Symptom:** Basket total doesn't match expected

**Causes:**
- Delivery charge included
- Discounts applied
- Provider-specific calculations

**Solution:**

Check basket JSON for details:

```bash
groc --provider sainsburys basket --json
```

Look for:
- `total_cost` - includes delivery
- `subtotal` - items only
- `delivery_charge`
- `discounts`

---

## Delivery & Checkout Issues

### No Delivery Slots Available

**Symptom:** `groc slots` returns empty

**Causes:**
- No slots in your area
- All slots full
- Delivery not available (Ocado outside coverage)

**Solutions:**

```bash
# Check if provider delivers to your area
# Sainsbury's: UK-wide
# Ocado: London & South England only

# Try different dates (some providers show 7 days)
# Check on website directly to verify availability
```

### Checkout Fails

**Symptom:** `groc checkout` returns error

**Causes:**
- No delivery slot booked
- No payment method saved
- Basket minimum not met
- Age-restricted items

**Solutions:**

```bash
# 1. Book delivery slot first
groc --provider sainsburys slots
groc --provider sainsburys book <slot-id>

# 2. Add payment method on website
# Go to sainsburys.co.uk/myaccount → Payment Methods

# 3. Check basket total meets minimum
groc --provider sainsburys basket

# 4. Try dry run to see error details
groc --provider sainsburys checkout --dry-run
```

---

## Provider-Specific Issues

### Sainsbury's

#### API Returns 500 Errors

**Cause:** Sainsbury's API occasionally has issues

**Solution:**

```bash
# Wait a few minutes and retry
sleep 300 && groc --provider sainsburys search "milk"

# Or switch to Ocado temporarily
groc --provider ocado search "milk"
```

#### Session Expires Quickly

**Cause:** Sainsbury's may invalidate sessions on IP change

**Solution:**

Use stable network connection. Re-login as needed:

```bash
groc --provider sainsburys login --email EMAIL --password PASS
```

### Ocado

#### "Region not supported" Error

**Cause:** Ocado only delivers to London & South England

**Solution:**

Check if your postcode is covered at ocado.com. Use alternative provider:

```bash
groc --provider sainsburys search "milk"
```

#### Different API Responses

**Cause:** Ocado implementation is based on observed API calls - may vary

**Solution:**

Check response format with `--json`:

```bash
groc --provider ocado search "milk" --json
```

If structure differs, file an issue on GitHub with response format.

---

## CLI Issues

### Command Not Found: `groc`

**Symptom:** `groc: command not found`

**Cause:** Not installed globally or not in PATH

**Solutions:**

```bash
# Option 1: Use npm run
cd uk-grocery-cli
npm run groc -- search "milk"

# Option 2: Install globally
npm install -g .
groc search "milk"

# Option 3: Use npx
npx groc search "milk"

# Option 4: Add to PATH
export PATH="$PATH:$(pwd)/node_modules/.bin"
groc search "milk"
```

### TypeScript Errors

**Symptom:** `tsc` compilation errors

**Solutions:**

```bash
# Install dependencies
npm install

# Clean build
rm -rf dist/
npm run build

# Check TypeScript version
npx tsc --version  # Should be 5.0+
```

### JSON Output Not Parsing

**Symptom:** `--json` flag produces invalid JSON

**Cause:** Mixed stdout/stderr

**Solution:**

```bash
# Redirect stderr
groc search "milk" --json 2>/dev/null | jq

# Or capture to file
groc search "milk" --json > results.json 2>&1
```

---

## Network Issues

### Timeout Errors

**Symptom:** Requests timeout

**Solutions:**

```bash
# Check network connection
curl -I https://www.sainsburys.co.uk

# Increase timeout (if implementing custom client)
axios.defaults.timeout = 30000; // 30 seconds

# Retry with exponential backoff
```

### SSL Certificate Errors

**Symptom:** SSL verification fails

**Solutions:**

```bash
# Update Node.js
nvm install --lts
nvm use --lts

# Check certificates
node -e "console.log(require('https').globalAgent.options.ca)"

# Temporary: Disable SSL verification (NOT RECOMMENDED)
export NODE_TLS_REJECT_UNAUTHORIZED=0
```

---

## Data Issues

### Price Mismatch with Website

**Symptom:** CLI shows different price than website

**Causes:**
- Cached data
- Clubcard pricing
- Regional pricing
- Discounts not applied

**Solution:**

Prices from API are real-time but may differ based on:
- Account-specific discounts
- Clubcard prices (need to be logged in)
- Promotional pricing

Always verify on checkout.

### Product Out of Stock

**Symptom:** `in_stock: false`

**Solutions:**

```bash
# Find alternatives
groc search "alternative product"

# Check different provider
groc --provider ocado search "product"

# Use smart substitution logic (see SMART-SHOPPING.md)
```

---

## Performance Issues

### Slow Search

**Symptom:** Searches take >5 seconds

**Solutions:**

```bash
# Reduce result limit
groc search "milk" --limit 10

# Cache results in your agent
# Implement caching layer (see API.md)

# Use parallel searches
groc compare "milk"  # Searches all providers in parallel
```

### High Memory Usage

**Symptom:** Node process uses >500MB RAM

**Causes:**
- Large basket
- Many search results
- Session data

**Solutions:**

```bash
# Clear basket when done
groc --provider sainsburys basket clear --force

# Limit search results
groc search "query" --limit 24

# Restart Node process periodically
```

---

## Development Issues

### Can't Build TypeScript

**Symptom:** `npm run build` fails

**Solutions:**

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Check tsconfig.json is valid
npx tsc --showConfig

# Install dev dependencies
npm install --save-dev typescript @types/node ts-node
```

### Playwright Install Fails

**Symptom:** `npx playwright install` errors

**Solutions:**

```bash
# Install specific browser only
npx playwright install chromium

# Check system dependencies (Linux)
npx playwright install-deps

# macOS: Install with Homebrew
brew install playwright
```

---

## Agent Integration Issues

### Agent Can't Call CLI

**Symptom:** Agent bash commands fail

**Solutions:**

```bash
# Use full path
cd /full/path/to/uk-grocery-cli && npm run groc search "milk"

# Check permissions
chmod +x dist/cli.js

# Verify Node.js available
which node
node --version
```

### JSON Parsing Errors

**Symptom:** Agent can't parse CLI output

**Solutions:**

Always use `--json` flag:

```bash
groc search "milk" --json

# Agent parses:
const result = JSON.parse(stdout);
```

Handle errors:

```typescript
try {
  const stdout = await bash("groc search 'milk' --json");
  const data = JSON.parse(stdout);
} catch (error) {
  console.error('CLI error:', error);
  // Fallback logic
}
```

---

## Common Error Messages

### "Provider not found"

```bash
# Wrong:
groc --provider tescco search "milk"

# Right:
groc --provider sainsburys search "milk"
groc --provider ocado search "milk"
```

### "Session file not found"

```bash
# Login first
groc --provider sainsburys login --email EMAIL --password PASS
```

### "Basket is empty"

```bash
# Add items first
groc --provider sainsburys add 357937 --qty 1
groc --provider sainsburys basket
```

### "No delivery slots available"

Check on website - may genuinely be fully booked. Try:
- Different dates
- Different times
- Alternative provider

---

## Getting Help

### Enable Debug Mode

```bash
# Set environment variable
export DEBUG=groc:*

# Run command
groc search "milk"
```

### Check Logs

```bash
# View session files
cat ~/.sainsburys/session.json
cat ~/.ocado/session.json

# Check error output
groc search "milk" 2>&1 | tee error.log
```

### File an Issue

Include:

1. CLI version: `groc --version`
2. Node version: `node --version`
3. OS: `uname -a`
4. Provider: sainsburys/ocado
5. Command run: `groc search "milk"`
6. Error message
7. Expected behavior
8. `--json` output (if relevant)

**GitHub Issues:** https://github.com/abracadabra50/uk-grocery-cli/issues

---

## Reset Everything

**Nuclear option** - start fresh:

```bash
# Delete sessions
rm -rf ~/.sainsburys ~/.ocado

# Clean install
cd uk-grocery-cli
rm -rf node_modules dist package-lock.json
npm install
npm run build

# Re-login
groc --provider sainsburys login --email EMAIL --password PASS

# Test
groc --provider sainsburys search "milk"
```

---

## See Also

- [API Documentation](./API.md) - Complete API reference
- [Smart Shopping Guide](./SMART-SHOPPING.md) - Intelligent decisions
- [README](../README.md) - Getting started
