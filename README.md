# UK Grocery CLI 🛒

**Enable AI agents to shop at UK supermarkets. Open source.**

Give your AI agent the ability to interact with UK grocery stores. Search products, manage baskets, book delivery slots, and complete checkout - programmatically.

Built for AI agents (OpenClaw, Pi, Mom, Claude Desktop). Works with any agent framework.

---

## Why UK Grocery CLI?

AI agents can code, write, research, and plan. But they can't interact with grocery stores.

**This solves that.**

Agents can now:
- **Shop for you** - Build shopping lists from meal plans and order automatically
- **Make intelligent decisions** - Choose organic vs conventional based on safety data
- **Optimize across stores** - Access multiple supermarkets from one interface
- **Automate reordering** - Track what you buy and restock essentials
- **Understand your preferences** - Learn dietary restrictions, budget constraints, favorite brands

**You focus on what to eat. Your agent handles the shopping.**

---

## Supported Supermarkets

- ✅ **Sainsbury's** - UK-wide delivery
- ✅ **Ocado** - London & South England
- 🔜 **Tesco** - Coming soon
- 🔜 **Asda** - Planned
- 🔜 **Morrisons** - Planned

---

## How It Works

**Simple CLI interface your agent can call:**

```bash
# Search for products
groc --provider sainsburys search "milk"

# Add to basket
groc --provider sainsburys add 357937 --qty 2

# View basket
groc --provider sainsburys basket

# Book delivery and checkout
groc --provider sainsburys slots
groc --provider sainsburys book <slot-id>
groc --provider sainsburys checkout
```

**Your agent orchestrates the logic:**
- Meal planning (what to cook)
- Shopping list generation (ingredients needed)
- Product search (find items)
- Smart decisions (organic vs conventional, brand preferences)
- Order placement (checkout)

**CLI handles the supermarket integration** (REST APIs, auth, basket management).

---

## Installation

```bash
git clone https://github.com/abracadabra50/uk-grocery-cli
cd uk-grocery-cli
npm install
npm run build
```

---

## Quick Start

### Login

```bash
groc --provider sainsburys login --email YOU@EMAIL.COM --password PASS
```

Session saves to `~/.sainsburys/session.json` and auto-refreshes.

### Search & Add

```bash
groc --provider sainsburys search "organic milk"
groc --provider sainsburys add 357937 --qty 2
groc --provider sainsburys basket
```

### Checkout

```bash
groc --provider sainsburys slots
groc --provider sainsburys book <slot-id>
groc --provider sainsburys checkout
```

---

## Agent Integration

### Add as Skill

```bash
cp -r uk-grocery-cli /path/to/agent/skills/
```

### Agent Workflow Example

**User:** "Plan meals for this week, £60 budget, prefer organic"

**Agent logic:**
1. Suggests 7 meals based on preferences
2. Extracts ingredient list
3. Uses smart shopping logic (see `docs/SMART-SHOPPING.md`)
4. Searches products: `groc search "strawberries"`
5. Decides organic vs conventional based on Dirty Dozen
6. Adds to basket: `groc add 357937 --qty 2`
7. Books delivery slot
8. Checks out

**CLI provides:** Product search, basket operations, checkout  
**Agent provides:** Meal planning, organic decisions, budget optimization

See `AGENTS.md` and `docs/SMART-SHOPPING.md` for detailed integration patterns.

---

## Smart Shopping Features

Beyond basic product search, enable intelligent agent decisions:

### Organic Prioritization

```typescript
// Agent logic (not CLI)
const isDirtyDozen = ['strawberries', 'spinach', 'kale'].includes(product);

if (isDirtyDozen) {
  // High pesticide - always buy organic
  await searchProduct('organic strawberries');
} else {
  // Safe conventional - save money
  await searchProduct('strawberries');
}
```

### Budget Optimization

```typescript
// Agent decides what's worth the premium
const organic = await search('organic milk');
const conventional = await search('milk');
const priceDiff = (organic.price - conventional.price) / conventional.price;

if (priceDiff < 0.20 && budget.hasRoom()) {
  return organic; // Worth it - less than 20% more
} else {
  return conventional; // Save money
}
```

### Multi-Store Access

```typescript
// Agent can choose where to shop
const sainsburysPrice = await groc('--provider sainsburys search "milk"');
const ocadoPrice = await groc('--provider ocado search "milk"');

// Use based on preference, delivery area, or other factors
```

See **`docs/SMART-SHOPPING.md`** for complete guide on organic decisions, seasonal produce, waste prevention, and meal optimization.

---

## CLI Commands

### Provider Selection
```bash
-p, --provider <name>    Choose: sainsburys, ocado
groc providers           List available
```

### Product Search
```bash
search <query>           Search products
--json                   Output as JSON
```

### Basket
```bash
basket                   View basket
add <id> --qty <n>       Add to basket
remove <item-id>         Remove item
```

### Delivery & Checkout
```bash
slots                    View delivery slots
book <slot-id>           Reserve slot
checkout                 Place order
--dry-run                Preview without placing
```

### Auth
```bash
login --email <email> --password <pass>
logout
```

---

## Architecture

### Provider Abstraction

```typescript
interface GroceryProvider {
  search(query: string): Promise<Product[]>;
  getBasket(): Promise<Basket>;
  addToBasket(id: string, qty: number): Promise<void>;
  checkout(): Promise<Order>;
}

class SainsburysProvider implements GroceryProvider { ... }
class OcadoProvider implements GroceryProvider { ... }
```

Adding new supermarkets is plug-and-play.

### Clean REST APIs

Both providers use REST (simple HTTP):

```
Sainsbury's:
  GET  /groceries-api/gol-services/product/v1/product
  POST /groceries-api/gol-services/basket/v2/basket/items
  
Ocado:
  GET  /api/search/v1/products
  POST /api/trolley/v1/items
```

---

## Payment & Security

Uses your existing supermarket account and saved payment method.

**How it works:**
1. Login once via Playwright (browser automation)
2. Session cookies saved locally (`~/.sainsburys/session.json`)
3. CLI uses cookies to authenticate API requests
4. Checkout uses your saved card from account settings
5. No card details ever pass through CLI

**Security:**
- Session files excluded from git (`.gitignore`)
- Cookies stored locally only
- No card data handled by CLI
- PCI compliant (payment stays in supermarket systems)
- Same security model as using supermarket website

**Setup payment:**
1. Go to sainsburys.co.uk/myaccount (or ocado.com/account)
2. Add payment method
3. Set default card
4. CLI will use it when checking out

---

## Use Cases

### Meal Planning Automation
Agent plans meals → generates shopping list → searches products → orders → delivers

### Auto-Reordering
Agent tracks what you buy → monitors inventory → reorders when low

### Budget Management
Agent tracks spending → suggests cheaper alternatives → keeps you on budget

### Dietary Preferences
Agent filters by halal/kosher/vegan/gluten-free → excludes restricted items

### Health Optimization
Agent prioritizes organic for Dirty Dozen → saves money on Clean Fifteen

See `docs/SMART-SHOPPING.md` for implementation examples.

---

## Preferences (Optional)

For agent decision-making:

```json
{
  "dietary_restrictions": ["halal", "gluten-free"],
  "budget": {"weekly": 60},
  "preferred_providers": ["sainsburys"],
  "organic_priority": "dirty_dozen_only",
  "household_size": 2
}
```

Your agent reads preferences and makes smart decisions.

---

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
│   └── SMART-SHOPPING.md      # Agent intelligence guide
├── SKILL.md                   # Open skills format
├── AGENTS.md                  # Integration guide
└── README.md                  # This file
```

---

## Development

```bash
npm run build   # Compile TypeScript
npm run dev     # Development mode
npm run groc    # Run CLI
```

---

## Contributing

Contributions welcome!

**Want to add:**
- More supermarkets (Tesco, Asda, Morrisons)
- Smart shopping algorithms
- Nutritional data integration
- Meal planning templates

Open an issue or PR!

---

## Roadmap

### v2.0 (Current)
- ✅ Multi-provider architecture
- ✅ Sainsbury's provider
- ✅ Ocado provider
- ✅ Smart shopping guide

### v2.1 (Next)
- 🔜 Tesco provider
- 🔜 Delivery slot optimization
- 🔜 Price history tracking

### v2.2 (Future)
- 🔜 Asda & Morrisons providers
- 🔜 Nutritional data
- 🔜 Recipe database integration
- 🔜 MCP server wrapper

---

## License

MIT - Free to use, modify, distribute

---

## Legal

This tool is for personal use and agent development. It uses public APIs and standard authentication methods. Users are responsible for complying with each supermarket's terms of service.

Not affiliated with Sainsbury's, Ocado, Tesco, Asda, or Morrisons.

---

## Credits

Built by [Zishan Ashraf](https://github.com/abracadabra50)

Inspired by [Shellfish](https://github.com/abracadabra50/shellfish) - Agentic commerce for Shopify

---

**Enable your AI agent to handle grocery shopping. Focus on cooking, not ordering. 🛒**
