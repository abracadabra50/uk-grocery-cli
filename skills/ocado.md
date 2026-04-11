---
name: ocado-groceries
description: "Ocado UK grocery automation. Search products, manage basket, and book delivery at Ocado via CLI or MCP tools."
license: MIT
compatibility: Node.js 18+, TypeScript. London & South England delivery areas only.
metadata:
  author: zish
  version: "2.1.0"
  repository: https://github.com/abracadabra50/uk-grocery-cli
  tags: [groceries, ocado, uk, shopping, automation, mcp, agent-tool]
allowed-tools: Bash({baseDir}/node:*), Bash(npm:run:groc:*)
---

# Ocado Groceries Skill

> ⚠️ **This provider is currently disabled.** Ocado migrated to a client-side React SPA and the previous REST endpoints have been removed. Every command below will throw a clear error until the provider is rebuilt against verified endpoints (or via a Playwright renderer). Tracking: [#5](https://github.com/abracadabra50/uk-grocery-cli/issues/5). Use `--provider sainsburys` or `--provider tesco` in the meantime.

Search products, manage basket, and book delivery at Ocado.

**Location:** `{baseDir}`

---

## When to Use

- User wants to buy groceries from Ocado
- User asks about product prices or availability at Ocado
- User wants to manage their Ocado basket/trolley
- User needs to book an Ocado delivery slot
- User is in London or South England (Ocado's delivery area)

---

## Setup

```bash
cd {baseDir}
npm install
```

## Authentication

```bash
npm run groc -- --provider ocado login --email EMAIL --password PASS

# Session saved to ~/.ocado/session.json
```

**Notes:**
- Standard email/password login
- Login automation is partially implemented
- Session file: `~/.ocado/session.json`

---

## CLI Commands

All commands require `--provider ocado`.

### Search Products
```bash
npm run groc -- --provider ocado search "milk"
npm run groc -- --provider ocado search "organic bread" --limit 10 --json
```

### Basket Management
```bash
npm run groc -- --provider ocado basket                    # View trolley
npm run groc -- --provider ocado basket --json             # JSON output
npm run groc -- --provider ocado add <product-id> --qty 2  # Add item
npm run groc -- --provider ocado update <item-id> 3        # Update qty
npm run groc -- --provider ocado remove <item-id>          # Remove item
npm run groc -- --provider ocado clear --force             # Clear trolley
```

### Delivery & Checkout
```bash
npm run groc -- --provider ocado slots                     # View slots
npm run groc -- --provider ocado book <slot-id>            # Book slot
npm run groc -- --provider ocado checkout --dry-run        # Preview
npm run groc -- --provider ocado checkout                  # Place order
npm run groc -- --provider ocado orders                    # Order history
```

---

## MCP Tools

When using the MCP server, use `provider: "ocado"` for all standard tools:

| Tool | Description |
|------|-------------|
| `grocery_search` | Search Ocado products |
| `grocery_basket_view` | View trolley contents |
| `grocery_basket_add` | Add product to trolley |
| `grocery_basket_remove` | Remove product from trolley |
| `grocery_basket_update` | Update item quantity |
| `grocery_basket_clear` | Clear all items |
| `grocery_slots` | List delivery slots |
| `grocery_book_slot` | Book a delivery slot |
| `grocery_checkout` | Checkout (dry_run default) |
| `grocery_orders` | View order history |
| `grocery_login` | Login to Ocado |

---

## Ocado API Details

```
Base: https://www.ocado.com/api

GET  /search/v1/products?query=milk              # Search
GET  /trolley/v1/items                            # View trolley
POST /trolley/v1/items                            # Add to trolley
```

---

## Example Agent Workflow

```bash
# 1. Search for products
npm run groc -- --provider ocado search "free range eggs" --json

# 2. Add to trolley
npm run groc -- --provider ocado add PRODUCT_ID --qty 1

# 3. Check trolley
npm run groc -- --provider ocado basket --json

# 4. Book slot and checkout
npm run groc -- --provider ocado slots --json
npm run groc -- --provider ocado book SLOT_ID
npm run groc -- --provider ocado checkout --dry-run
```

---

## Limitations

- **London & South England only** (Ocado delivery area)
- Login automation partially implemented
- Checkout flow is experimental (needs real-world testing)
- Region configured with region ID (default covers London)
