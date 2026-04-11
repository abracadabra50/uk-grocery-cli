<div align="center">

🛒

# UK Grocery CLI

**One CLI that handles grocery shopping at any UK supermarket.**  
Your AI agent can now search products, manage baskets, book delivery, and checkout across Sainsbury's, Ocado, Tesco, and more.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Stars](https://img.shields.io/github/stars/abracadabra50/uk-grocery-cli?style=social)](https://github.com/abracadabra50/uk-grocery-cli/stargazers)
[![npm](https://img.shields.io/npm/v/uk-grocery-cli)](https://www.npmjs.com/package/uk-grocery-cli)

[Quick Start](#quick-start) • [Supported Stores](#supported-supermarkets) • [How It Works](#how-it-works) • [Agent Integration](#agent-integration) • [Smart Shopping](#smart-shopping-features) • [API Reference](#cli-commands)

</div>

---

## Why

If you're building AI agents for the agentic era, there's a gap: **UK supermarkets offer zero APIs.**

Sainsbury's, Ocado, Tesco, Asda, Morrisons — none of them provide developer APIs. No OAuth, no REST endpoints, no webhooks. If you want your agent to shop for groceries, there's no official way to do it.

But agents need to eat. Meal planning, auto-reordering, budget optimization — these are perfect agent workflows. The infrastructure just doesn't exist.

**UK Grocery CLI closes that gap.** Reverse-engineered integrations that give your agent a unified command-line interface to every major UK supermarket. Your agent calls `groc search "milk"` and it works whether you're shopping at Sainsbury's or Ocado.

Built for agent frameworks like [OpenClaw](https://github.com/claw-labs/openclaw), Pi, Claude Desktop MCP. Works with any agent that can shell out to a CLI. Your agent handles the intelligence (meal planning, budget optimization, dietary preferences). The CLI handles the grunt work (authentication, API calls, basket state).

## Supported Supermarkets

- ✅ **Sainsbury's** - UK-wide delivery, full API coverage
- ⚠️ **Ocado** - **Currently broken.** Ocado migrated to a client-side React SPA and the previous endpoints have been removed. Provider is disabled and will throw a clear error until rebuilt. Tracking: [#5](https://github.com/abracadabra50/uk-grocery-cli/issues/5)
- ✅ **Tesco** - UK-wide delivery, full API coverage (search, basket, checkout)
- 🔜 **Asda** - Planned Q2 2026
- 🔜 **Morrisons** - Planned Q2 2026

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/abracadabra50/uk-grocery-cli.git
cd uk-grocery-cli

# Install dependencies
npm install

# Install Playwright for authentication
npx playwright install chromium

# Optional: Link globally to use 'groc' command anywhere
npm link
```

### First Time Setup

```bash
# Login to Sainsbury's (saves session to ~/.sainsburys/session.json)
npm run groc login --email YOUR_EMAIL --password YOUR_PASSWORD

# Or if installed globally:
groc --provider sainsburys login --email YOUR_EMAIL --password YOUR_PASSWORD

# Test it works
npm run groc search "milk"
```

### Basic Usage

```bash
# Search for products
npm run groc search "organic milk"

# Add to basket
npm run groc add 357937 --qty 2

# View basket
npm run groc basket

# Book delivery and checkout
npm run groc slots
npm run groc book <slot-id>
npm run groc checkout
```

### For AI Agents

```bash
# Agent calls via bash:
cd /path/to/uk-grocery-cli && npm run groc search "chicken breast" --json
cd /path/to/uk-grocery-cli && npm run groc add 357937 --qty 2
cd /path/to/uk-grocery-cli && npm run groc basket --json
```

See [SKILL.md](SKILL.md) for complete agent integration guide, or the per-supermarket skills in [`skills/`](skills/).

## How It Works

**The CLI provides a unified interface:**

```bash
groc --provider <store> <command> [options]
```

Switch providers with a flag. Commands stay the same.

```bash
groc --provider sainsburys search "milk"  # Sainsbury's
groc --provider ocado search "milk"       # Ocado
groc --provider tesco search "milk"       # Tesco
```

**Under the hood:**

Each provider implements a common interface:

```typescript
interface GroceryProvider {
  search(query: string): Promise<Product[]>;
  getBasket(): Promise<Basket>;
  addToBasket(id: string, qty: number): Promise<void>;
  getSlots(): Promise<DeliverySlot[]>;
  checkout(): Promise<Order>;
}
```

The CLI routes commands to the right provider. Your agent doesn't care which store you're using.

## Agent Integration

### Add as a Skill

Your agent can call the CLI directly:

```typescript
// User: "Order milk from Sainsbury's"

// Agent executes:
await exec('groc --provider sainsburys search "milk" --json');
await exec('groc --provider sainsburys add 357937 --qty 2');
await exec('groc --provider sainsburys checkout');
```

### Example Agent Workflow

**User:** "Plan meals for this week, £60 budget, prefer organic"

**Agent logic:**
1. Plans 7 meals based on preferences
2. Extracts ingredient list  
3. For each ingredient:
   - Searches product: `groc search "strawberries"`
   - Decides organic vs conventional (see [Smart Shopping](#smart-shopping-features))
   - Adds to basket: `groc add <id> --qty <n>`
4. Books delivery slot
5. Checks out

**The CLI handles:** Product search, basket operations, checkout  
**Your agent handles:** Meal planning, organic decisions, budget optimization

See [`AGENTS.md`](./AGENTS.md) for complete integration guide.

### MCP Server (Claude Desktop / MCP Clients)

The CLI ships with a full MCP server exposing all grocery tools to Claude Desktop and other MCP-compatible clients.

```bash
# Start MCP server
npx tsx src/mcp-server.ts
```

Add to Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "uk-grocery": {
      "command": "node",
      "args": ["/path/to/uk-grocery-cli/dist/mcp-server.js"]
    }
  }
}
```

**Available MCP tools:**

| Tool | Description |
|------|-------------|
| `grocery_search` | Search products (any provider) |
| `grocery_compare` | Compare prices across all stores |
| `grocery_basket_view` | View basket |
| `grocery_basket_add` | Add to basket |
| `grocery_basket_remove` | Remove from basket |
| `grocery_basket_update` | Update quantity |
| `grocery_basket_clear` | Clear basket |
| `grocery_slots` | List delivery slots |
| `grocery_book_slot` | Book delivery slot |
| `grocery_checkout` | Checkout (dry_run default) |
| `grocery_orders` | Order history |
| `grocery_login` | Login to provider |
| `grocery_status` | Check login status |
| `grocery_providers` | List providers |
| `tesco_staples` | Tesco repeat-purchase staples |

All tools accept a `provider` parameter: `sainsburys` (default), `ocado`, or `tesco`.

See [SKILL.md](SKILL.md) for full MCP reference and per-supermarket skill files in [`skills/`](skills/).

## Smart Shopping Features

The CLI provides product data. Your agent makes intelligent decisions.

### Organic Prioritization (Dirty Dozen)

```typescript
// Agent logic (not CLI)
const dirtyDozen = ['strawberries', 'spinach', 'kale', 'apples'];
const cleanFifteen = ['avocados', 'sweetcorn', 'pineapple'];

if (dirtyDozen.includes(product)) {
  // High pesticide residue - always buy organic
  await search('organic strawberries');
} else if (cleanFifteen.includes(product)) {
  // Low pesticide - save money with conventional
  await search('strawberries');
}
```

### Budget Optimization

```typescript
// Compare organic vs conventional pricing
const organic = await search('organic milk');
const conventional = await search('milk');
const premium = (organic.price - conventional.price) / conventional.price;

if (premium < 0.20 && budget.hasRoom()) {
  return organic;  // Less than 20% more - worth it
} else {
  return conventional;  // Save money
}
```

### Multi-Store Price Comparison

```typescript
// Agent can shop across stores
const sainsburys = await groc('--provider sainsburys search "milk"');
const ocado = await groc('--provider ocado search "milk"');

// Choose based on price, delivery area, or availability
```

See [`docs/SMART-SHOPPING.md`](./docs/SMART-SHOPPING.md) for complete guide on organic decisions, seasonal produce, waste prevention, and meal optimization.

## CLI Commands

### Provider Selection

```bash
-p, --provider <name>    Choose: sainsburys, ocado, tesco
groc providers           List available providers
```

### Product Search

```bash
groc search <query>      Search products
--json                   Output JSON for parsing
```

Example output:
```json
[
  {
    "id": "357937",
    "name": "Sainsbury's Organic Semi-Skimmed Milk 2L",
    "price": 1.65,
    "unit": "2L",
    "available": true
  }
]
```

### Basket Management

```bash
groc basket              View current basket
groc add <id> --qty <n>  Add item to basket
groc remove <item-id>    Remove item from basket
groc clear               Empty basket
```

### Delivery & Checkout

```bash
groc slots               View available delivery slots
groc book <slot-id>      Reserve delivery slot
groc checkout            Place order
--dry-run                Preview order without placing
```

### Tesco-Specific Commands

```bash
groc --provider tesco import-session --file <cookies.json>   Import cookies from browser export
groc --provider tesco staples                                 Analyse order history → repeat-buy suggestions
groc --provider tesco discover                                Network interception tool for API discovery (dev)
groc --provider tesco update <item-id> <qty>                  Update item quantity in basket
groc --provider tesco clear                                   Empty Tesco basket
```

### Authentication

```bash
groc login --email <email>               Login (prompts for password interactively)
groc login --email <email> --password <pass>   Login with password flag
groc logout
groc status              Check login status
```

### Tesco Authentication

Tesco uses Akamai bot detection, which can block automated form filling. Three options:

**Option 1 — Automated login (may be blocked):**
```bash
npm run groc -- --provider tesco login --email EMAIL --password PASS
# Omit --password to be prompted interactively (keeps password out of shell history)
npm run groc -- --provider tesco login --email EMAIL
```

**Option 2 — Import session from browser (recommended):**
```bash
# 1. Log in to tesco.com manually in Chrome/Firefox
# 2. Export cookies with the "Cookie Editor" browser extension → Export All → JSON
# 3. Import into the CLI:
npm run groc -- --provider tesco import-session --file ~/Downloads/tesco-cookies.json
```

**Option 3 — Environment variable:**
```bash
TESCO_PASSWORD=yourpass npm run groc -- --provider tesco login --email EMAIL
```

Session is saved to `~/.tesco/session.json` and lasts ~7 days.

## Payment & Security

Uses your existing supermarket account and saved payment method.

**How it works:**
1. Login once via browser automation (Playwright)
2. Session cookies saved locally (`~/.sainsburys/session.json`)
3. CLI uses cookies for API authentication
4. Checkout uses your saved card from account settings
5. No card details ever touch the CLI

**Security:**
- Session files git-ignored by default
- Cookies stored locally only
- No card data handled by CLI
- PCI compliant (payment stays in supermarket systems)
- Same security model as using the website

**Setup payment method:**
1. Visit sainsburys.co.uk/myaccount (or your provider)
2. Add payment method in account settings
3. Set default card
4. CLI will use it when checking out

## Architecture

### Provider Abstraction

```typescript
interface GroceryProvider {
  search(query: string): Promise<Product[]>;
  getBasket(): Promise<Basket>;
  addToBasket(id: string, qty: number): Promise<void>;
  removeFromBasket(itemId: string): Promise<void>;
  getSlots(): Promise<DeliverySlot[]>;
  bookSlot(slotId: string): Promise<void>;
  checkout(): Promise<Order>;
}
```

Each provider implements this interface. Adding new supermarkets is plug-and-play.

### Clean REST APIs

Both Sainsbury's and Ocado use simple REST:

```
Sainsbury's:
  GET  /groceries-api/gol-services/product/v1/product?filter[keyword]=milk
  POST /groceries-api/gol-services/basket/v2/basket/items
  
Ocado:
  GET  /api/search/v1/products?query=milk
  POST /api/trolley/v1/items
```

See [`API-REFERENCE.md`](./API-REFERENCE.md) for complete endpoint documentation.

## Use Cases

### Meal Planning Automation
Agent plans meals → generates shopping list → searches products → orders → delivers

### Auto-Reordering
Agent tracks consumption → monitors inventory → reorders essentials when low

### Budget Management
Agent tracks spending → suggests cheaper alternatives → keeps you on budget

### Dietary Preferences
Agent filters by halal/kosher/vegan/gluten-free → excludes restricted items

### Health Optimization  
Agent prioritizes organic for Dirty Dozen → saves money on Clean Fifteen

See [`docs/SMART-SHOPPING.md`](./docs/SMART-SHOPPING.md) for implementation examples.

## Project Structure

```
uk-grocery-cli/
├── src/
│   ├── providers/
│   │   ├── types.ts              # Common GroceryProvider interface
│   │   ├── sainsburys.ts         # Sainsbury's implementation
│   │   ├── ocado.ts              # Ocado implementation
│   │   ├── tesco/
│   │   │   ├── index.ts          # TescoProvider (GroceryProvider impl)
│   │   │   ├── api.ts            # GraphQL client (xapi.tesco.com)
│   │   │   ├── auth.ts           # Playwright login + Akamai fallback
│   │   │   ├── import-session.ts # Cookie import from browser export
│   │   │   ├── staples.ts        # Repeat-purchase analysis from order history
│   │   │   └── discover.ts       # Network interception tool (dev)
│   │   └── index.ts              # Provider factory
│   ├── browser/
│   │   ├── tesco-slots.ts        # Delivery slot browser automation
│   │   └── tesco-checkout.ts     # Checkout browser automation
│   ├── auth/
│   │   └── login.ts              # Shared Playwright authentication
│   ├── cli.ts                    # Multi-provider CLI entrypoint
│   └── mcp-server.ts             # MCP server (all providers)
├── skills/
│   ├── sainsburys.md              # Sainsbury's agent skill
│   ├── tesco.md                   # Tesco agent skill
│   └── ocado.md                   # Ocado agent skill
├── scripts/
│   └── tesco-capture-search.ts   # Dev tool: capture Tesco search API responses
├── docs/
│   ├── SMART-SHOPPING.md         # Agent intelligence guide
│   └── API-REFERENCE.md          # Complete API documentation
├── SKILL.md                      # Agent skills format
├── AGENTS.md                     # Agent integration guide
└── README.md                     # This file
```

## Known Limitations

### Authentication
- **Sainsbury's**: SMS 2FA required on every fresh login — session lasts ~7 days
- **Tesco**: Akamai bot detection can block automated login. Use `import-session` (manual browser login → Cookie Editor export → `groc --provider tesco import-session --file cookies.json`) as the reliable path. Session lasts ~7 days.
- **Ocado**: ⚠️ Disabled. Site moved to React SPA, previous endpoints removed. See [#5](https://github.com/abracadabra50/uk-grocery-cli/issues/5).

### API Coverage
- ✅ **Working**: Search, basket management, product data — Sainsbury's and Tesco
- ✅ **Working**: Tesco delivery slots + checkout (browser-automated, requires manual payment confirmation)
- ⚠️ **Experimental**: Sainsbury's checkout flow (needs real-world testing)
- ⚠️ **Broken**: Entire Ocado provider — endpoints removed by Ocado, awaiting rebuild ([#5](https://github.com/abracadabra50/uk-grocery-cli/issues/5))
- 🔜 **Coming**: Order tracking, substitutions, favourites

Some endpoints are still being reverse-engineered. Contributions welcome.

## Development

```bash
git clone https://github.com/abracadabra50/uk-grocery-cli
cd uk-grocery-cli
npm install
npm run build
npm run groc -- --provider sainsburys search "milk"
```

## Contributing

Contributions welcome!

**Want to add:**
- More supermarkets (Asda, Morrisons)
- Missing API endpoints (slots, checkout improvements)
- Smart shopping algorithms
- Nutritional data integration
- Meal planning templates

Open an issue or PR.

## Roadmap

### v2.0 (Current)
- ✅ Multi-provider architecture
- ✅ Sainsbury's provider (full coverage)
- ⚠️ Ocado provider (disabled — see [#5](https://github.com/abracadabra50/uk-grocery-cli/issues/5))
- ✅ Tesco provider (full coverage — search, basket, checkout, slots, staples)

### v2.1 (Current)
- ✅ Full MCP server with multi-provider support
- ✅ Per-supermarket skill files (`skills/`)
- ✅ Cross-store price comparison via MCP
- ✅ Tesco staples management via MCP

### v2.2 (Q2 2026)
- 🔜 Delivery slot optimization
- 🔜 Price history tracking
- 🔜 Substitution handling

### v3.0 (Q3 2026)
- 🔜 Asda & Morrisons providers
- 🔜 Nutritional data API
- 🔜 Recipe database integration

## License

MIT - Free to use, modify, distribute.

## Legal & Usage

**Personal Use Only**

This tool is designed for personal grocery shopping automation and agent development. It is not intended for:
- Commercial scraping or data collection
- Reselling grocery data
- Automated bulk ordering for businesses
- Any use that violates supermarket terms of service

**How It Works**

The CLI uses your personal supermarket account credentials. You authenticate once (just like logging into the website), and the CLI uses your session to place orders on your behalf. This is functionally equivalent to using the website, just via command line instead of a browser.

**Your Responsibility**

By using this tool, you agree to:
- Use it only for your personal grocery shopping
- Comply with each supermarket's terms of service
- Not abuse rate limits or cause disruption
- Not use it for commercial purposes

**No Affiliation**

This project is not affiliated with, endorsed by, or sponsored by Sainsbury's, Ocado, Tesco, Asda, Morrisons, or any other supermarket chain. All trademarks are property of their respective owners.

---

<div align="center">

**Built by [zish](https://github.com/abracadabra50)**

Inspired by [Shellfish](https://github.com/abracadabra50/shellfish) - Agentic commerce for Shopify

**Enable your AI agent to handle grocery shopping. Focus on cooking, not ordering. 🛒**

</div>
