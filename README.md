# UK Grocery CLI 🛒

**Multi-supermarket grocery automation for UK. Built for AI agents. Open source.**

Give your AI agent full control of UK groceries. Search products, compare prices, manage baskets, book delivery slots, and checkout - across multiple supermarkets from one CLI.

Built for AI agents (OpenClaw, Pi, Mom, Claude Desktop). Works with any agent framework.

---

## Supported Supermarkets

- ✅ **Sainsbury's** - Full support (search, basket, delivery, checkout)
- ✅ **Ocado** - Full support (London/South England only)
- 🔜 **Tesco** - Coming soon
- 🔜 **Asda** - Planned
- 🔜 **Morrisons** - Planned

---

## Why UK Grocery CLI?

AI agents can code, write, research, and plan. But they can't interact with grocery stores.

**UK Grocery CLI solves this:**

- **Multi-provider** - Compare prices across supermarkets
- **Full API access** - Search, basket, delivery, checkout
- **Clean CLI** - Simple commands agents can call
- **JSON output** - Structured data for agent processing
- **Price comparison** - Find best deals automatically

**Agents can now:**
- Build meal planning workflows
- Compare prices across stores and optimize shopping
- Create auto-reorder systems
- Track price history and alert on deals
- Build dietary preference filtering

You build the agent logic. This handles the supermarket integration.

---

## How It Works

**Simple CLI commands for each provider:**

```bash
# Search Sainsbury's
groc --provider sainsburys search "milk"

# Search Ocado
groc --provider ocado search "milk"

# Compare across all supermarkets
groc compare "milk"
```

**Example output:**

```
🔍 Comparing "milk" across supermarkets...

📦 SAINSBURYS
──────────────────────────────────────────────────
1. Sainsbury's British Semi-Skimmed Milk 2.27L
   £1.65 💰 BEST

📦 OCADO
──────────────────────────────────────────────────
1. Ocado Organic Whole Milk 2L
   £2.10
```

---

## Installation

```bash
git clone https://github.com/abracadabra50/uk-grocery-cli
cd uk-grocery-cli
npm install
```

---

## Quick Start

### Login

```bash
# Sainsbury's
groc --provider sainsburys login --email YOU@EMAIL.COM --password PASS

# Ocado
groc --provider ocado login --email YOU@EMAIL.COM --password PASS
```

### Search Products

```bash
groc --provider sainsburys search "organic eggs"
groc compare "milk"  # Searches all providers
```

### Manage Basket

```bash
groc --provider sainsburys add 357937 --qty 2
groc --provider sainsburys basket
groc --provider sainsburys remove <item-id>
```

### Checkout

```bash
groc --provider sainsburys slots
groc --provider sainsburys book <slot-id>
groc --provider sainsburys checkout
```

---

## CLI Commands

### Provider Selection

```bash
-p, --provider <name>    Choose provider: sainsburys, ocado
groc providers           List all available providers
```

### Product Search

```bash
search <query>           Search products
compare <query>          Compare across all supermarkets
```

### Basket Operations

```bash
basket                   View basket
add <id> --qty <n>       Add to basket
remove <item-id>         Remove from basket
```

### Delivery & Checkout

```bash
slots                    View delivery slots
book <slot-id>           Reserve slot
checkout                 Place order
```

### Authentication

```bash
login --email <email> --password <pass>
logout
```

---

## Price Comparison

**Killer feature: Find best prices across stores**

```bash
groc compare "organic milk"
```

Agent workflow:
1. Searches Sainsbury's, Ocado, (+ Tesco when ready)
2. Compares prices per unit (£/L, £/kg, etc.)
3. Shows best value across all stores
4. Optimizes total shop across providers

Example:
```
Sainsbury's: £1.65 (2.27L) = £0.73/L
Ocado: £1.85 (2L) = £0.93/L
Tesco: £1.55 (2.27L) = £0.68/L ✅ BEST
```

No one else does this. Your agent can genuinely save you money.

---

## Agent Integration

Add as skill to any agent framework:

```bash
cp -r uk-grocery-cli /path/to/agent/skills/
```

**Agent can now:**

```typescript
// Search and compare
await bash("cd skills/uk-grocery-cli && npm run groc compare 'milk' --json");

// Build shopping list
await bash("cd skills/uk-grocery-cli && npm run groc -- --provider sainsburys add 357937 --qty 2");

// Checkout
await bash("cd skills/uk-grocery-cli && npm run groc -- --provider sainsburys checkout");
```

See `AGENTS.md` for detailed integration patterns.

---

## Architecture

### Provider Abstraction

```typescript
interface GroceryProvider {
  search(query: string): Promise<Product[]>;
  getBasket(): Promise<Basket>;
  addToBasket(id: string, qty: number): Promise<void>;
  getDeliverySlots(): Promise<Slot[]>;
  checkout(): Promise<Order>;
}

// Sainsbury's implementation
class SainsburysProvider implements GroceryProvider { ... }

// Ocado implementation
class OcadoProvider implements GroceryProvider { ... }
```

### Clean REST APIs

Both Sainsbury's and Ocado use REST (no GraphQL complexity):

```
Sainsbury's:
  GET  /groceries-api/gol-services/product/v1/product?filter[keyword]=milk
  POST /groceries-api/gol-services/basket/v2/basket/items

Ocado:
  GET  /api/search/v1/products?searchTerm=milk
  POST /api/trolley/v1/items
```

---

## Project Structure

```
uk-grocery-cli/
├── src/
│   ├── providers/
│   │   ├── types.ts           # Provider interface
│   │   ├── sainsburys.ts      # Sainsbury's implementation
│   │   ├── ocado.ts           # Ocado implementation
│   │   └── index.ts           # Provider factory
│   ├── cli.ts                 # Multi-provider CLI
│   └── auth/
│       └── login.ts           # Playwright auth
├── SKILL.md                   # Open skills format
├── AGENTS.md                  # Integration guide
├── README.md                  # This file
└── package.json
```

---

## Provider Comparison

| Provider | Coverage | Ease | Status |
|----------|----------|------|--------|
| Sainsbury's | UK-wide | 9/10 (REST) | ✅ Complete |
| Ocado | London/South | 9/10 (REST) | ✅ Complete |
| Tesco | UK-wide | 6/10 (GraphQL) | 🔜 Planned |
| Asda | UK-wide | Unknown | 🔜 Planned |
| Morrisons | UK-wide | Unknown | 🔜 Planned |

---

## Payment

Uses your saved payment method from each supermarket account.

**Setup:**
1. Add payment method at sainsburys.co.uk/myaccount (or ocado.com/account)
2. CLI uses session cookies to authenticate
3. Checkout uses your default card
4. No card details pass through CLI

**Security:**
- Session cookies stored locally (`~/.sainsburys/`, `~/.ocado/`)
- `.gitignore` excludes session files
- PCI compliant (no card data in CLI)
- Same as using website in browser

---

## Preferences (Optional)

For meal planning agents, add preferences:

```json
{
  "dietary_restrictions": ["vegetarian", "gluten-free"],
  "budget": {"weekly": 50},
  "preferred_providers": ["sainsburys", "ocado"],
  "household_size": 2
}
```

Your agent can filter results, compare providers, split shopping lists.

---

## Examples

### Compare & Find Best Price

```bash
groc compare "organic eggs" --json
```

Agent picks cheapest provider automatically.

### Multi-Provider Shopping

```bash
# Milk from Sainsbury's (cheapest)
groc --provider sainsburys add 357937 --qty 2

# Special items from Ocado
groc --provider ocado add 84920 --qty 1

# Checkout both separately
groc --provider sainsburys checkout
groc --provider ocado checkout
```

### Price Tracking

```bash
# Daily check
groc --provider sainsburys search "milk" --json | jq '.products[0].retail_price.price'

# Log to file
echo "$(date),${price}" >> prices.csv
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
- Price history tracking
- Nutrition data
- Multi-store optimization algorithms

Open an issue or PR!

---

## License

MIT - Free to use, modify, distribute

---

## Roadmap

### v2.0 (Current)
- ✅ Multi-provider architecture
- ✅ Sainsbury's provider
- ✅ Ocado provider
- ✅ Price comparison

### v2.1 (Next)
- 🔜 Tesco provider (GraphQL)
- 🔜 Price history tracking
- 🔜 Delivery slot optimization

### v2.2 (Future)
- 🔜 Asda provider
- 🔜 Morrisons provider
- 🔜 Multi-store basket optimizer
- 🔜 MCP server wrapper

---

## Credits

Built by [Zishan Ashraf](https://github.com/abracadabra50)

Inspired by [Shellfish](https://github.com/abracadabra50/shellfish) - Agentic commerce for Shopify

---

**Make grocery shopping effortless with AI! 🛒**

Star this repo if you find it useful!
