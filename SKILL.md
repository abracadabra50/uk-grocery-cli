---
name: sainsburys-groceries
description: Complete Sainsbury's UK grocery automation CLI. Search products, manage basket, book delivery, and checkout. Build meal planning, auto-reorder, price tracking, or any grocery workflow. Works with any agent framework.
license: MIT
compatibility: Node.js 18+, TypeScript, Playwright for auth. UK only (Sainsbury's delivery areas).
metadata:
  author: zish
  version: "1.0.0"
  repository: https://github.com/yourusername/sainsburys-cli
  tags: [groceries, sainsburys, uk, shopping, automation, cli, agent-tool]
allowed-tools: Bash({baseDir}/node:*), Bash(npm:run:sb:*)
---

# Sainsbury's Groceries Skill

Complete CLI for Sainsbury's UK grocery automation. Built for AI agents.

Search products, manage basket, book delivery slots, and checkout - all via clean CLI commands with JSON output.

**Location:** `{baseDir}`

---

## When to Use This Skill

Trigger this skill when users:
- Want to plan meals or discuss recipes
- Need to order groceries
- Ask about products or prices at Sainsbury's
- Want to add items to shopping basket
- Need to book delivery slots
- Want to checkout and place orders
- Ask "what's for dinner?" or "plan my weekly shop"

---

## Quick Start

### Installation

```bash
cd {baseDir}
npm install
npx playwright install chromium  # For authentication
```

### First Time Setup

```bash
# Login (saves session to ~/.sainsburys/session.json)
npm run groc login --email USER@EMAIL.COM --password PASSWORD

# Test it works
npm run groc search "milk"
npm run groc basket
```

### Agent Usage

Agents call commands via bash:

```bash
cd {baseDir} && npm run groc search "chicken breast"
cd {baseDir} && npm run groc add 357937 --qty 2
cd {baseDir} && npm run groc basket
cd {baseDir} && npm run groc checkout
```

---

## Available Commands

### Product Discovery

```bash
# Search products
npm run groc search "milk"
npm run groc search "organic eggs" --limit 10
npm run groc search "bread" --json

# Browse categories
npm run groc categories
npm run groc categories --json

# Product details
npm run groc product 357937
npm run groc product 357937 --json
```

### Basket Management

```bash
# View basket
npm run groc basket
npm run groc basket --json

# Add to basket
npm run groc add <product-id> --qty 2

# Update quantity
npm run groc update <item-id> 3

# Remove item
npm run groc remove <item-id>

# Clear basket
npm run groc clear --force
```

### Delivery & Checkout

```bash
# View delivery slots
npm run groc slots
npm run groc slots --json

# Book a slot
npm run groc book <slot-id>

# Checkout (dry run to preview)
npm run groc checkout --dry-run

# Complete order
npm run groc checkout

# Order history
npm run groc orders
```

### Authentication

```bash
# Login
npm run groc login --email EMAIL --password PASS

# Logout
npm run groc logout

# Check session
cat ~/.sainsburys/session.json
```

---

## Example Workflow: Meal Planning

**This CLI doesn't do meal planning - it provides the tools for agents to build meal planning.**

### Agent Implementation Example

**Step 1: Agent Plans Meals (your logic)**

User says: "Plan meals for this week"

Agent:
1. Asks constraints (budget, dietary, cooking time)
2. Suggests 5-7 meals based on preferences
3. Gets approval/adjustments
4. Extracts ingredient list from recipes

### Step 2: Agent Searches Products (CLI)

For each ingredient:
```bash
npm run groc search "{ingredient}" --json
```

Agent picks best match by price/size/preference.

### Step 3: Agent Builds Order (CLI)

```bash
npm run groc add {product_id} --qty {quantity}
```

Repeat for all ingredients.

### Step 4: Review & Adjust (CLI)

Show basket to user:
```bash
npm run groc basket --json
```

Agent can swap/adjust/remove based on user feedback.

### Step 5: Checkout (CLI)

```bash
# Show slots
npm run groc slots --json

# Book slot
npm run groc book {slot_id}

# Complete order
npm run groc checkout
```

**Your agent handles:** meal suggestions, recipe parsing, ingredient matching  
**This CLI handles:** product search, basket management, checkout

---

## Block Kit Integration (Slack)

For Slack bots, use Block Kit to show rich grocery lists:

### Shopping List Block

```javascript
{
  "type": "section",
  "text": {
    "type": "mrkdwn",
    "text": "*🛒 Your Shopping List*\n\n*Total: £48.50* (24 items)"
  }
},
{
  "type": "divider"
},
{
  "type": "section",
  "fields": [
    {"type": "mrkdwn", "text": "*Dairy & Eggs*\n• Milk 2.27L - £1.65\n• Eggs x12 - £2.50"},
    {"type": "mrkdwn", "text": "*Meat & Fish*\n_(Purchased separately - halal)_"}
  ]
},
{
  "type": "actions",
  "elements": [
    {
      "type": "button",
      "text": {"type": "plain_text", "text": "Add to Basket"},
      "action_id": "add_to_basket",
      "style": "primary"
    },
    {
      "type": "button",
      "text": {"type": "plain_text", "text": "Modify List"},
      "action_id": "modify_list"
    }
  ]
}
```

### Basket Summary Block

```javascript
{
  "type": "section",
  "text": {
    "type": "mrkdwn",
    "text": "*🛒 Basket*\n\n*24 items* | *£48.50*"
  }
},
{
  "type": "section",
  "fields": [
    {"type": "mrkdwn", "text": "*Top Items:*\n• 2x Milk 2.27L\n• 1x Bread\n• 1x Eggs"},
    {"type": "mrkdwn", "text": "*Delivery:*\nTuesday 18:00-20:00\n£4.00"}
  ]
},
{
  "type": "actions",
  "elements": [
    {
      "type": "button",
      "text": {"type": "plain_text", "text": "Checkout"},
      "action_id": "checkout",
      "style": "primary"
    }
  ]
}
```

---

## Dietary Preferences (Optional)

If your agent implements meal planning, you can add preferences configuration.

### Example preferences.json

```json
{
  "dietary_restrictions": ["vegetarian", "gluten-free"],
  "dislikes": ["mushrooms"],
  "budget": {"weekly": 50},
  "household_size": 2
}
```

### Special Sourcing

Some users need specific sourcing (halal, kosher, local farms, etc.):

```json
{
  "dietary_restrictions": ["halal"],
  "external_sources": {
    "meat": "halal_butcher"
  },
  "sainsburys_excludes": ["beef", "lamb", "chicken", "turkey"]
}
```

Your agent can:
1. Read preferences file
2. Filter search results based on restrictions
3. Exclude certain product categories
4. Split shopping lists (e.g., "Get pasta from Sainsbury's, meat from butcher")

**Note:** This is agent logic, not CLI functionality. The CLI just searches and orders - your agent decides what to buy based on user preferences.

---

## API Endpoints Reference

All endpoints use REST, return JSON:

```
GET  /groceries-api/gol-services/product/v1/product
     ?filter[keyword]=milk&page_number=1&page_size=24

GET  /groceries-api/gol-services/product/categories/tree

GET  /groceries-api/gol-services/basket/v2/basket

POST /groceries-api/gol-services/basket/v2/basket/items
     {product_uid: "357937", quantity: 2}

GET  /groceries-api/gol-services/slot/v1/slot/reservation

POST /groceries-api/gol-services/checkout/v1/checkout
```

See `src/api/client.ts` for full implementation.

---

## File Structure

```
{baseDir}/
├── src/
│   ├── api/client.ts              # REST API client
│   ├── auth/login.ts              # Playwright auth
│   ├── commands/basket.ts         # Basket operations
│   └── cli-complete.ts            # Main CLI
├── SKILL.md                       # This file
├── AGENTS.md                      # Agent integration guide
├── README.md                      # User documentation
└── package.json
```

---

## Error Handling

### Authentication Errors
```bash
# 401/403 - Session expired
npm run groc login --email EMAIL --password PASS
```

### Product Not Found
- Try alternative search terms
- Suggest similar products
- Ask user to specify brand/type

### Out of Stock
- Find substitute product
- Notify user
- Offer to adjust recipe

### Budget Exceeded
- Show where over budget
- Suggest cheaper alternatives
- Ask to remove items

---

## Session Management

Sessions auto-save to `~/.sainsburys/session.json`

**Session expires:** 7 days  
**Auto-refresh:** On CLI commands  
**Manual refresh:** `npm run groc login`

Check session:
```bash
cat ~/.sainsburys/session.json | jq .expiresAt
```

---

## Integration Examples

### OpenClaw / Clawdbot

```typescript
// Add skill to skills directory
await bash(`cd ${skillDir}/sainsburys-cli && npm run groc search "milk"`);

// Parse JSON response
const results = JSON.parse(stdout);
results.products.forEach(p => {
  console.log(`${p.name} - £${p.retail_price.price}`);
});
```

### Pi Agent / Mom

```typescript
// Use in meal-planning channel
await bash(`cd /path/to/sainsburys-cli && npm run groc basket --json`);

// Send Block Kit to Slack
await sendBlocks(basketBlocks);
```

### MCP Server (Future)

Could be wrapped as MCP server:
```typescript
tools: [
  "sainsburys_search",
  "sainsburys_add_to_basket",
  "sainsburys_checkout"
]
```

---

## Cost Tracking

Track spend across orders:

```bash
# Get basket total
npm run groc basket --json | jq '.trolley.trolley_details.total_cost'

# Save to tracking file
echo "$(date),${total}" >> spending.csv
```

Build budget analytics:
- Per meal cost
- Weekly total
- Category breakdown
- Price history

---

## Tips for Agents

### Start Simple
First-time users: suggest 3 easy meals, learn preferences.

### Learn Over Time
Track:
- Brands they choose
- Price sensitivity
- Dietary patterns
- Cooking styles

### Confirm Big Decisions
Before checkout:
- Review total cost
- Confirm delivery slot
- Check all items
- Ask if anything missing

### Use Block Kit
For Slack agents, always use Block Kit for:
- Shopping lists (rich formatting)
- Basket summaries (actions)
- Delivery slot selection (buttons)
- Order confirmation (visual)

---

## Limitations

### Geographic
- **UK only** (Sainsbury's delivery areas)
- Edinburgh confirmed working ✅

### Products
- **No halal meat** - purchase separately
- **No alcohol delivery** in some areas
- **Age-restricted items** may need ID

### Technical
- Requires Node.js 18+
- Playwright needs Chromium (200MB)
- API endpoints may change (REST is stable)

---

## Support

**Issues:** GitHub issues
**Docs:** README.md, AGENTS.md
**Examples:** See `/examples` directory

---

## License

MIT - Free to use, modify, distribute

---

**Make grocery shopping effortless with AI! 🛒**

---

## Current Status (Updated 2026-02-15)

### ✅ Working Features
- **Login**: OAuth with interactive MFA (SMS code prompt)
- **Search**: Find products by keyword
- **Add to Basket**: Add items with quantity
- **View Basket**: See full basket with item details
- **Remove from Basket**: Remove items by item_uid
- **Update Quantity**: Change item quantities

### ⚠️ Experimental / Needs Discovery
- **Delivery Slots**: API endpoint for listing slots not yet discovered
- **Checkout**: Endpoint exists but untested
- **Order Tracking**: Endpoint returns 404 (no active orders to test)

### Authentication Notes
- **2FA Required**: Every login requires SMS verification code
- **Session Duration**: ~7 days before re-login needed
- **Session Storage**: `~/.sainsburys/session.json`
- **wcauthtoken**: Extracted automatically from cookies

### API Endpoints Verified

**Working:**
- `POST /basket/v2/basket/item` - Add to basket
- `GET /basket/v2/basket` - View basket
- `PUT /basket/v2/basket` - Update/remove items (with items array)
- `GET /product/v1/product` - Search products
- `/gol-ui/oauth/login` - OAuth login flow

**Experimental:**
- `GET /slot/v1/slot/reservation` - Returns reservation status only
- `POST /checkout/v1/checkout` - Untested
- `GET /order/v1/order/status` - Returns 404 without active order

See `API-REFERENCE.md` for complete endpoint documentation.

