---
name: uk-grocery
version: 2.0.0
author: zish
repository: https://github.com/abracadabra50/uk-grocery-cli
license: MIT
tags: [groceries, shopping, uk, sainsburys, ocado, automation, meal-planning]
requires: [node>=18, playwright, typescript]
---

# UK Grocery CLI

Multi-supermarket grocery automation for UK. Search products, manage baskets, book delivery, checkout across Sainsbury's, Ocado, and more. Built for AI agents.

**Enable your AI agent to shop at UK supermarkets programmatically.**

## Quick Start

```bash
# Install
git clone https://github.com/abracadabra50/uk-grocery-cli
cd uk-grocery-cli
npm install
npx playwright install chromium

# Setup (interactive)
npm run setup

# Login
groc --provider sainsburys login --email YOUR@EMAIL.COM --password PASS

# Search & shop
groc search "milk"
groc add 357937 --qty 2
groc basket
groc checkout
```

## Supported Supermarkets

- ✅ **Sainsbury's** - UK-wide delivery
- ✅ **Ocado** - London & South England
- 🔜 **Tesco** - Coming soon

## What Your Agent Can Do

### 1. Search Products

```bash
groc --provider sainsburys search "organic milk" --json
```

Returns structured JSON with products, prices, stock status.

### 2. Smart Shopping Decisions

Agent can prioritize organic based on Dirty Dozen:

```typescript
// High pesticide - always organic
if (isDirtyDozen(product)) {
  await search('organic strawberries');
}

// Low pesticide - save money
if (isCleanFifteen(product)) {
  await search('avocados'); // conventional safe
}
```

### 3. Multi-Provider Comparison

```bash
groc compare "milk"
```

Searches all providers, shows cheapest option.

### 4. Complete Shopping Flow

```bash
# Build basket
groc add 357937 --qty 2
groc add 428901 --qty 1

# View & adjust
groc basket

# Book delivery
groc slots
groc book <slot-id>

# Checkout
groc checkout
```

## Features

- **Multi-provider** - Sainsbury's, Ocado, more coming
- **Smart organic choices** - Dirty Dozen vs Clean Fifteen logic
- **Budget optimization** - Stay within limits
- **Dietary filtering** - Vegan, halal, gluten-free
- **Price comparison** - Find best deals across stores
- **Seasonal awareness** - UK seasonal produce calendar
- **Auto-reordering** - Track usage patterns

## Setup & Configuration

### Interactive Setup

```bash
npm run setup
```

Prompts for:
- Preferred supermarket (sainsburys/ocado)
- Email & password
- Dietary restrictions
- Weekly budget
- Household size

Saves to `~/.uk-grocery-config.json`

### Manual Configuration

```json
{
  "provider": "sainsburys",
  "email": "you@email.com",
  "dietary_restrictions": ["halal", "gluten-free"],
  "budget": {
    "weekly": 60
  },
  "household_size": 2,
  "organic_priority": "dirty_dozen_only"
}
```

## Agent Integration

### Basic Usage

```typescript
// Search
const results = await bash("groc search 'milk' --json");
const products = JSON.parse(results);

// Add to basket
await bash(`groc add ${products.products[0].product_uid} --qty 2`);

// Checkout
await bash("groc checkout");
```

### Smart Shopping Example

```typescript
async function smartShop(ingredients: string[], budget: number) {
  for (const ingredient of ingredients) {
    // Check if Dirty Dozen (high pesticide)
    const needsOrganic = isDirtyDozen(ingredient);
    
    const query = needsOrganic ? `organic ${ingredient}` : ingredient;
    const results = await bash(`groc search "${query}" --json`);
    const products = JSON.parse(results).products;
    
    if (products.length > 0) {
      await bash(`groc add ${products[0].product_uid} --qty 1`);
      
      if (needsOrganic) {
        console.log(`✅ ${ingredient}: Organic (high pesticide risk)`);
      } else {
        console.log(`✅ ${ingredient}: Conventional (low risk, saved money)`);
      }
    }
  }
}
```

### Multi-Provider Example

```typescript
// Compare prices
const comparison = await bash("groc compare 'milk' --json");
const results = JSON.parse(comparison);

// Find cheapest
const cheapest = results
  .flatMap(r => r.products.map(p => ({ ...p, provider: r.provider })))
  .reduce((min, p) => p.retail_price.price < min.retail_price.price ? p : min);

// Order from cheapest provider
await bash(`groc --provider ${cheapest.provider} add ${cheapest.product_uid} --qty 2`);
```

## Dietary Restrictions

### Dirty Dozen (Always Buy Organic)

High pesticide residue - health priority:

Strawberries, Spinach, Kale, Peaches, Pears, Nectarines, Apples, Grapes, Peppers, Cherries, Blueberries, Green Beans

### Clean Fifteen (Safe Conventional)

Low pesticide residue - save money:

Avocados, Sweet Corn, Pineapple, Onions, Papaya, Sweet Peas, Asparagus, Honeydew, Kiwi, Cabbage, Mushrooms, Mangoes, Sweet Potatoes, Watermelon, Carrots

### Filtering Examples

```bash
# Vegan milk
groc search "oat milk"
groc search "almond milk"

# Gluten-free bread
groc search "gluten free bread"

# Halal (exclude non-halal meat)
# Note: Agent filters results, meat purchased separately
```

## Commands Reference

```bash
# Authentication
groc login --email EMAIL --password PASS
groc logout

# Product search
groc search <query> [--limit N] [--json]
groc compare <query>  # Multi-provider search
groc providers        # List available

# Basket operations
groc basket [--json]
groc add <product-id> --qty <N>
groc remove <item-id>
groc clear --force

# Delivery & checkout
groc slots [--json]
groc book <slot-id>
groc checkout [--dry-run]

# Provider selection
groc --provider sainsburys <command>
groc --provider ocado <command>
```

## Payment

Uses your existing supermarket account:

1. Add payment method at sainsburys.co.uk/myaccount
2. CLI uses session cookies to authenticate
3. Checkout charges your saved card
4. No card details handled by CLI

**Secure:** PCI compliant, cookies stored locally, same as using website.

## Documentation

- **README.md** - Getting started guide
- **docs/API.md** - Complete API reference
- **docs/SMART-SHOPPING.md** - Organic prioritization logic
- **docs/EXAMPLES.md** - 9 real-world integrations
- **docs/TROUBLESHOOTING.md** - Common issues
- **AGENTS.md** - Agent framework integration

## Example Workflows

### Meal Planning

```
User: "Plan meals for this week, £60 budget, prefer organic"

Agent:
  1. Suggests 7 meals
  2. Extracts ingredients
  3. Checks Dirty Dozen for organic priority
  4. Searches products
  5. Adds to basket
  6. Books delivery slot
  7. Checks out

Result: Healthy meals, budget respected, organic where it matters
```

### Auto-Reorder

```
Agent monitors weekly purchases:
  - Milk: purchased every 5 days
  - Eggs: purchased every 7 days
  - Bread: purchased every 4 days

Every Monday:
  - Check last purchase dates
  - Reorder if needed
  - Auto-checkout
```

### Price Tracking

```
Agent tracks product prices daily:
  - Organic milk: £2.10 → £1.85 (-12%)
  - Strawberries: £3.20 → £2.50 (-22%)

Alerts user on deals, suggests stocking up
```

## Requirements

- Node.js 18+
- Playwright (Chromium)
- UK delivery address
- Supermarket account (Sainsbury's or Ocado)

## Installation

```bash
git clone https://github.com/abracadabra50/uk-grocery-cli
cd uk-grocery-cli
npm install
npx playwright install chromium
npm run setup  # Interactive configuration
```

## License

MIT - Free to use, modify, distribute

---

**Make grocery shopping effortless with AI! 🛒**

Repository: https://github.com/abracadabra50/uk-grocery-cli
