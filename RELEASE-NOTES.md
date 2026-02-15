# Release Notes - v1.0.0 (2026-02-15)

## What's Working ✅

### Authentication
- OAuth login flow with interactive MFA
- SMS code prompt during login
- Session persistence to `~/.sainsburys/session.json`
- Auto-load session on subsequent runs
- wcauthtoken extraction and header management

### Product Discovery
- Search products by keyword
- Full product details (name, price, SKU, image, stock status)
- JSON output for agent parsing

### Basket Operations
- Add items to basket with quantity
- View basket with full itemization
- Remove items from basket
- Update item quantities
- Price totals and item counts

## Installation

```bash
git clone https://github.com/abracadabra50/uk-grocery-cli
cd uk-grocery-cli
npm install
npm run build
```

## Quick Start

```bash
# Login (prompts for MFA code)
node dist/cli.js login --email YOUR@EMAIL.COM --password PASS

# Search
node dist/cli.js search "chicken breast" --json

# Add to basket
node dist/cli.js add 7977681 --qty 2

# View basket
node dist/cli.js basket

# Remove item
node dist/cli.js remove ITEM_UID

# Update quantity
node dist/cli.js update ITEM_UID 3
```

## Known Limitations

### Authentication
- **2FA Required**: Every login requires SMS verification
- **Session Duration**: ~7 days before re-login
- **UK Phone Number**: Must have UK mobile for SMS codes

### Experimental Features (Requires Browser Automation)

After extensive testing, we discovered that Sainsbury's blocks direct API access to slots/checkout:

- **Delivery Slots**: Listing endpoint returns "Access Denied"
  - Info endpoints work (minimum spend, reservation status)
  - Actual slot listing requires browser context or is client-side rendered
  
- **Checkout**: Endpoint returns "Access Denied"  
  - Protected against automated ordering
  - Requires browser automation with proper referer/origin headers
  
- **Order Tracking**: Returns 404 (no active orders to test with)

**Why Blocked?**
Sainsbury's has intentionally restricted automated booking/checkout. Future implementation will require:
- Full Playwright browser automation
- Simulating UI clicks and navigation
- Proper browser context (referer, origin, CSRF tokens)
- Possible CAPTCHA handling

**Current Workaround:**
Use CLI for shopping list/basket management, complete checkout manually in browser.

Contributions welcome - see FIXES.md for detailed discovery session and endpoint testing results.

## API Endpoints

See `API-REFERENCE.md` for complete endpoint documentation.

**Working:**
- `POST /basket/v2/basket/item` - Add to basket
- `GET /basket/v2/basket` - View basket  
- `PUT /basket/v2/basket` - Update/remove items
- `GET /product/v1/product` - Search products

**Experimental:**
- `GET /slot/v1/slot/reservation` - Returns status only, not slots list
- `POST /checkout/v1/checkout` - Untested
- `GET /order/v1/order/status` - 404 without orders

## Dogfooding Session

Complete session log available in `FIXES.md`:
- 7 major bugs fixed
- 200+ lines changed
- 6 core features verified
- £27.27 test basket processed
- Full end-to-end shopping flow tested

## Use Cases

### What Works Now
- Build shopping lists from meal plans
- Search and compare products
- Automated reordering of essentials
- Price tracking over time
- Smart product selection (organic vs conventional)

### Coming Soon
- Delivery slot booking
- Complete checkout automation
- Order tracking and history
- Multi-store comparison

## Contributing

Missing endpoints (slots, checkout) need API discovery. If you:
- Find the correct endpoints
- Have access to official API docs
- Can capture the actual browser requests

Please open a PR! See `FIXES.md` for the discovery process used so far.

## License

MIT - Free to use, modify, distribute

## Links

- **Repository**: https://github.com/abracadabra50/uk-grocery-cli
- **Issues**: https://github.com/abracadabra50/uk-grocery-cli/issues
- **Documentation**: See README.md, AGENTS.md, SKILL.md
- **API Reference**: API-REFERENCE.md

---

Built for AI agents. Tested with Claude, OpenClaw, Pi, and Mom.

**Make grocery shopping effortless with AI! 🛒**
