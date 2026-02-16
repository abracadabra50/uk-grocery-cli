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
- ✅ **Ocado** - London & South England, complete integration  
- 🔜 **Tesco** - Coming soon (API reverse-engineering in progress)
- 🔜 **Asda** - Planned Q2 2026
- 🔜 **Morrisons** - Planned Q2 2026

## Quick Start

### Installation

```bash
npm install -g uk-grocery-cli
```

### Login

```bash
groc --provider sainsburys login --email you@email.com --password yourpass
```

Session saves to `~/.sainsburys/session.json` and auto-refreshes.

### Shop

```bash
# Search for products
groc --provider sainsburys search "organic milk"

# Add to basket
groc --provider sainsburys add 357937 --qty 2

# View basket
groc --provider sainsburys basket

# Book delivery and checkout
groc --provider sainsburys slots
groc --provider sainsburys book <slot-id>
groc --provider sainsburys checkout
```

## How It Works

**The CLI provides a unified interface:**

```bash
groc --provider <store> <command> [options]
```

Switch providers with a flag. Commands stay the same.

```bash
groc --provider sainsburys search "milk"  # Sainsbury's
groc --provider ocado search "milk"       # Ocado
groc --provider tesco search "milk"       # Tesco (coming soon)
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

### Authentication

```bash
groc login --email <email> --password <pass>
groc logout
groc status              Check login status
```

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
│   │   ├── types.ts           # Common interface
│   │   ├── sainsburys.ts      # Sainsbury's implementation
│   │   ├── ocado.ts           # Ocado implementation
│   │   └── index.ts           # Provider factory
│   ├── auth/
│   │   └── login.ts           # Playwright authentication
│   └── cli.ts                 # Multi-provider CLI
├── docs/
│   ├── SMART-SHOPPING.md      # Agent intelligence guide
│   └── API-REFERENCE.md       # Complete API documentation
├── SKILL.md                   # OpenClaw skills format
├── AGENTS.md                  # Agent integration guide
└── README.md                  # This file
```

## Known Limitations

### Authentication
- **2FA Required**: Sainsbury's requires SMS verification on every login
- **Session Duration**: Sessions expire after ~7 days (re-login needed)

### API Coverage
- ✅ **Working**: Search, basket management, product data
- ⚠️ **Experimental**: Delivery slots (endpoint partially documented)
- ⚠️ **Experimental**: Checkout flow (needs real-world testing)
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
- More supermarkets (Tesco, Asda, Morrisons)
- Missing API endpoints (slots, checkout improvements)
- Smart shopping algorithms
- Nutritional data integration
- Meal planning templates

Open an issue or PR.

## Roadmap

### v2.0 (Current)
- ✅ Multi-provider architecture
- ✅ Sainsbury's provider (full coverage)
- ✅ Ocado provider (full coverage)
- ✅ Smart shopping guide

### v2.1 (Q1 2026)
- 🔜 Tesco provider
- 🔜 Delivery slot optimization
- 🔜 Price history tracking
- 🔜 Substitution handling

### v2.2 (Q2 2026)
- 🔜 Asda & Morrisons providers
- 🔜 Nutritional data API
- 🔜 Recipe database integration

### v3.0 (Q3 2026)
- 🔜 MCP server implementation for Claude Desktop
- 🔜 Model Context Protocol integration
- 🔜 Native Claude app support

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
