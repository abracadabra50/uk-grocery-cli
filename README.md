# Sainsbury's CLI 🛒

**Complete grocery shopping automation for Sainsbury's UK. Built for AI agents. Open source.**

Give your AI agent full control of Sainsbury's groceries. Search products, manage basket, book delivery slots, and checkout - all via clean CLI commands.

Built for AI agents (OpenClaw, Pi, Mom, Claude Desktop, custom frameworks). Agents can use this to build meal planning, auto-reordering, price tracking, or any grocery automation workflow.

---

## Why Sainsbury's CLI?

AI agents can code, write, research, and plan. But they can't interact with grocery stores.

**Sainsbury's CLI is the missing piece:**

- **Full API access** - Search products, manage basket, book delivery, checkout
- **Clean CLI interface** - Simple commands agents can call via bash
- **JSON output** - Structured data agents can parse and reason about
- **Session management** - Auto-login, cookie persistence, no manual auth

**Agents can now:**
- Build meal planning workflows (suggest recipes → generate shopping list → auto-order)
- Create auto-reorder systems (monitor inventory → restock essentials)
- Track prices over time (scrape prices → build history → alert on deals)
- Build dietary preference systems (filter by allergens, preferences, budgets)

You build the agent logic. This handles the Sainsbury's integration.

---

## How It Works

**Simple CLI commands that agents can call:**

```bash
# Search products
npm run sb search "milk" --json
# Returns: {products: [{name, price, id, stock}]}

# Add to basket
npm run sb add <product-id> --qty 2
# Returns: {success, basket_total}

# View basket
npm run sb basket --json
# Returns: {items, total_cost, total_quantity}

# Book delivery and checkout
npm run sb slots --json
npm run sb book <slot-id>
npm run sb checkout
```

**Example agent workflow (meal planning):**

```
User: "Plan meals for this week, £50 budget"

Agent logic:
  1. Generate meal ideas based on preferences
  2. Extract ingredient list from recipes
  3. For each ingredient:
     → npm run sb search "{ingredient}" --json
     → Pick best match by price/size
  4. Build shopping list with totals
  5. Show to user for approval
  6. For each approved item:
     → npm run sb add {product_id} --qty {qty}
  7. Show basket: npm run sb basket --json
  8. Book slot: npm run sb slots → npm run sb book {slot_id}
  9. Checkout: npm run sb checkout
```

You build the meal planning logic. This CLI handles the Sainsbury's integration.

---

## Features

### 🔍 Product Search
Full product catalog search with filters.

- **Keyword search** - find products by name/description
- **Category browsing** - explore by department
- **Product details** - price, stock, nutritional info, images
- **JSON output** - structured data for agent processing
- **Pagination** - handle large result sets

### 🛒 Basket Management
Complete CRUD operations on shopping basket.

- **Add items** - by product ID with quantities
- **Update quantities** - modify amounts
- **Remove items** - delete individually or clear entire basket
- **View basket** - full item list with prices and totals
- **JSON output** - parse basket state for agent logic

### 📦 Delivery & Checkout
Full delivery booking and order placement.

- **View slots** - available delivery times
- **Book slot** - reserve delivery window
- **Checkout** - complete order and payment
- **Order history** - view past orders
- **Dry run mode** - preview checkout without placing order

### 🔐 Session Management
Persistent authentication with auto-refresh.

- **Playwright login** - handles Sainsbury's auth flow
- **Cookie persistence** - saves to `~/.sainsburys/session.json`
- **Auto-refresh** - no manual re-login needed
- **7-day expiry** - sessions last a week

### 📊 JSON Output
All commands support `--json` flag for structured data.

```json
{
  "products": [
    {
      "product_uid": "357937",
      "name": "Sainsbury's British Semi Skimmed Milk 2.27L",
      "retail_price": {"price": 1.65},
      "in_stock": true
    }
  ]
}
```

Agents can parse, filter, and reason about data easily.

---

## Installation

```bash
git clone https://github.com/yourusername/sainsburys-cli
cd sainsburys-cli
npm install
npx playwright install chromium
```

---

## Quick Start

### Login Once

```bash
npm run sb login --email YOUR_EMAIL --password YOUR_PASSWORD
```

Session saves to `~/.sainsburys/session.json` and auto-refreshes.

### Search Products

```bash
npm run sb search "milk"
npm run sb search "organic eggs" --limit 10
npm run sb categories
```

### Manage Basket

```bash
npm run sb add 357937 --qty 2
npm run sb basket
npm run sb update <item-id> 3
npm run sb remove <item-id>
```

### Checkout

```bash
npm run sb slots
npm run sb book <slot-id>
npm run sb checkout --dry-run  # Preview
npm run sb checkout            # Place order
```

---

## CLI Commands

### Product Discovery
```bash
search <query>              # Search products
product <id>                # Product details
categories                  # Browse categories
```

### Basket Operations
```bash
basket                      # View basket
add <id> --qty <n>          # Add to basket
update <item-id> <qty>      # Update quantity
remove <item-id>            # Remove item
clear --force               # Empty basket
```

### Delivery & Orders
```bash
slots                       # View delivery slots
book <slot-id>              # Reserve slot
checkout                    # Complete order
orders                      # Order history
```

### Authentication
```bash
login --email <email> --password <pass>
logout
```

---

## Agent Integration

### For AI Agents (OpenClaw, Pi, Mom, etc.)

Add as a skill to your agent's skill directory:

```bash
# Copy skill
cp -r sainsburys-cli /path/to/agent/skills/

# Agent can now call CLI commands
await bash("cd skills/sainsburys-cli && npm run sb search 'milk' --json");
```

### What Agents Can Build

**This CLI provides the primitives. You build the logic:**

**Meal Planning:**
- Agent suggests meals based on user preferences
- Extracts ingredients from recipes
- Uses CLI to search products and build basket
- Books delivery and checks out

**Auto-Reordering:**
- Agent tracks what user buys regularly
- Monitors inventory (external system or user input)
- Uses CLI to reorder when low
- Schedules regular deliveries

**Price Tracking:**
- Agent periodically searches products
- Logs prices to database
- Alerts on deals
- Optimizes shopping timing

**Budget Management:**
- Agent tracks spending via basket totals
- Suggests cheaper alternatives
- Warns when over budget
- Optimizes basket for value

See `AGENTS.md` for detailed integration patterns and code examples.

### Block Kit Support (Slack Bots)

For Slack agents, use Block Kit for rich interfaces:

```javascript
// Shopping list with actions
{
  "type": "section",
  "text": {"type": "mrkdwn", "text": "*🛒 Shopping List*\n£48.50 (24 items)"},
  "actions": [
    {"type": "button", "text": "Add to Basket", "style": "primary"}
  ]
}
```

See `SKILL.md` for Block Kit examples.

---

## Preferences (Optional)

If building meal planning workflows, you can add a preferences file to guide agent behavior.

**Example:** `preferences.json`

```json
{
  "dietary_restrictions": ["vegetarian", "gluten-free"],
  "dislikes": ["mushrooms", "olives"],
  "budget": {"weekly": 50},
  "preferred_brands": ["Sainsbury's Organic"],
  "household_size": 2
}
```

**Special dietary needs:**

If you need specific sourcing (e.g., halal meat, kosher products, local farms):

```json
{
  "dietary_restrictions": ["halal"],
  "external_sources": {
    "meat": "halal_butcher",
    "note": "Exclude non-halal meat from Sainsbury's"
  },
  "sainsburys_excludes": ["beef", "lamb", "chicken", "turkey"]
}
```

Your agent can read preferences and filter search results, exclude products, or split shopping lists.

**Note:** This is agent logic, not CLI functionality. The CLI just provides product search and basket operations - your agent decides what to buy.

---

## Architecture

### Clean REST API
Built on Sainsbury's public REST APIs (no GraphQL complexity).

```
GET  /groceries-api/gol-services/product/v1/product?filter[keyword]=milk
POST /groceries-api/gol-services/basket/v2/basket/items
GET  /groceries-api/gol-services/slot/v1/slot/reservation
POST /groceries-api/gol-services/checkout/v1/checkout
```

### Session Management
Cookie-based authentication with auto-refresh:
- Session saves to `~/.sainsburys/session.json`
- Auto-loads on CLI commands
- Expires after 7 days
- Playwright handles login flow

### TypeScript + Node.js
- Type-safe API client
- Commander.js CLI framework
- Axios for HTTP
- Playwright for auth

---

## Project Structure

```
sainsburys-cli/
├── src/
│   ├── api/
│   │   └── client.ts          # REST API wrapper
│   ├── auth/
│   │   └── login.ts           # Playwright authentication
│   ├── commands/
│   │   └── basket.ts          # Basket operations
│   └── cli-complete.ts        # Main CLI
├── SKILL.md                   # Open skills format
├── AGENTS.md                  # Agent integration guide
├── README.md                  # This file
└── package.json
```

---

## Comparison: Tesco vs Sainsbury's

We initially built for Tesco, then switched to Sainsbury's. Here's why:

| Factor | Tesco | Sainsbury's |
|--------|-------|-------------|
| API Type | GraphQL | REST |
| Architecture | SSR (server-side rendered) | SPA (client-side) |
| Discoverability | Hard (introspection disabled) | Easy (network tab) |
| Time to MVP | 3 hours = 30% complete | 1 hour = 100% complete |
| Total build time | 10 days estimated | 4 hours actual |
| Ease score | 6/10 | 9/10 |
| Worth it? | No | Yes! |

**Sainsbury's was 3 points easier and 30x faster to build.**

---

## Known Limitations

### Geographic
- **UK only** (Sainsbury's delivery areas)
- Edinburgh confirmed working ✅

### Products
- **No halal meat** - purchase separately from halal butcher
- **Age-restricted items** may require ID on delivery

### Technical
- Requires Node.js 18+
- Playwright needs Chromium (200MB download)
- Session expires after 7 days (auto-refresh)

---

## Examples

### Example 1: Quick Grocery Run

```bash
# Search and add
npm run sb search "milk"
npm run sb add 357937 --qty 2

# View basket
npm run sb basket

# Checkout
npm run sb checkout
```

### Example 2: Weekly Meal Plan

```
User: "Plan meals for this week, £60 budget, 2 people"

Agent suggests:
  Monday: Chicken stir-fry (£7)
  Tuesday: Spaghetti carbonara (£6)
  Wednesday: Salmon with roasted veg (£12)
  Thursday: Vegetarian curry (£8)
  Friday: Homemade pizza (£7)
  Weekend: Slow-cooked lamb (£15)

Total: £55 + basics = £60

Agent builds shopping list, searches Sainsbury's, adds to basket.

User: "Book delivery for Tuesday 18:00-20:00"

Agent books slot and checks out.

Done! 🎉
```

---

## Development

### Run Tests
```bash
npm run test
```

### Build
```bash
npm run build
```

### Dev Mode
```bash
npm run dev -- search "milk"
```

---

## Contributing

Contributions welcome! This is open source.

**Want to add:**
- More supermarkets (Tesco, Asda, Morrisons)
- Recipe database
- Nutritional tracking
- Price history charts
- Multi-store price comparison

Open an issue or PR!

---

## License

MIT - Free to use, modify, distribute

---

## Built With

- [TypeScript](https://www.typescriptlang.com/) - Type safety
- [Commander.js](https://github.com/tj/commander.js) - CLI framework
- [Axios](https://axios-http.com/) - HTTP client
- [Playwright](https://playwright.dev/) - Browser automation for auth

---

## Credits

Built by [Zishan Ashraf](https://github.com/yourusername)

Inspired by [Shellfish](https://github.com/yourusername/shellfish) - Agentic commerce for Shopify

---

**Make grocery shopping effortless with AI! 🛒**

Star this repo if you find it useful!
