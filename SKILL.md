---
name: uk-grocery-cli
description: "Multi-supermarket UK grocery automation. Search, basket, delivery, and checkout across Sainsbury's, Ocado, and Tesco. Available as CLI, MCP server, or agent skill."
license: MIT
compatibility: Node.js 18+, TypeScript, Playwright for auth. UK supermarket delivery areas.
metadata:
  author: zish
  version: "2.1.0"
  repository: https://github.com/abracadabra50/uk-grocery-cli
  tags: [groceries, sainsburys, ocado, tesco, uk, shopping, automation, mcp, agent-tool]
allowed-tools: Bash({baseDir}/node:*), Bash(npm:run:groc:*)
---

# UK Grocery CLI - Agent Skills

Unified grocery automation across UK supermarkets. Use via CLI, MCP server, or as agent skills.

**Location:** `{baseDir}`

---

## Per-Supermarket Skills

Each supermarket has a dedicated skill file with provider-specific commands, authentication, and API details:

| Supermarket | Skill File | Status |
|-------------|-----------|--------|
| **Sainsbury's** | [`skills/sainsburys.md`](skills/sainsburys.md) | Full coverage |
| **Tesco** | [`skills/tesco.md`](skills/tesco.md) | Full coverage + staples |
| **Ocado** | [`skills/ocado.md`](skills/ocado.md) | Search & basket working |

---

## Quick Start

```bash
cd {baseDir}
npm install
npx playwright install chromium
```

### CLI Usage

```bash
# Search any supermarket
npm run groc -- --provider sainsburys search "milk"
npm run groc -- --provider tesco search "milk"
npm run groc -- --provider ocado search "milk"

# Compare across all stores
npm run groc compare "organic eggs" --json

# Provider is a flag - all commands work the same way
npm run groc -- --provider <store> basket
npm run groc -- --provider <store> add <id> --qty 2
npm run groc -- --provider <store> slots
npm run groc -- --provider <store> checkout --dry-run
```

### MCP Server Usage

```bash
# Start MCP server (stdio transport)
npx tsx src/mcp-server.ts
# Or after build:
node dist/mcp-server.js
```

Claude Desktop config (`claude_desktop_config.json`):
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

---

## MCP Tools Reference

All tools accept a `provider` parameter (`sainsburys`, `ocado`, `tesco`). Default: `sainsburys`.

### Core Tools (all providers)

| Tool | Description |
|------|-------------|
| `grocery_login` | Login to supermarket account |
| `grocery_status` | Check login status across all providers |
| `grocery_search` | Search products |
| `grocery_compare` | Compare prices across all stores |
| `grocery_basket_view` | View basket contents |
| `grocery_basket_add` | Add product to basket |
| `grocery_basket_remove` | Remove from basket |
| `grocery_basket_update` | Update item quantity |
| `grocery_basket_clear` | Clear basket |
| `grocery_slots` | List delivery slots |
| `grocery_book_slot` | Book delivery slot |
| `grocery_checkout` | Checkout (dry_run=true by default) |
| `grocery_orders` | View order history |
| `grocery_providers` | List providers and login status |

### Tesco-Specific Tools

| Tool | Description |
|------|-------------|
| `tesco_staples` | View, update, or auto-add repeat-purchase staples |

---

## When to Use This Skill

Trigger when users:
- Want to plan meals or order groceries
- Ask about product prices or availability
- Want to compare prices across supermarkets
- Need to manage a shopping basket
- Want to book delivery slots or checkout
- Ask about weekly shop, meal prep, or grocery budget

---

## Example Agent Workflows

### Meal Planning
```bash
# Search ingredients across stores
npm run groc compare "chicken breast" --json
npm run groc compare "basmati rice" --json

# Add to cheapest provider
npm run groc -- --provider tesco add PRODUCT_ID --qty 1
npm run groc -- --provider tesco basket --json
npm run groc -- --provider tesco checkout --dry-run
```

### Restock Staples (Tesco)
```bash
npm run groc -- --provider tesco staples --add
npm run groc -- --provider tesco basket --json
npm run groc -- --provider tesco checkout --dry-run
```

### Price Comparison
```bash
npm run groc compare "organic milk" --json
# Returns results from all providers with prices
```

---

## Documentation

- [`skills/sainsburys.md`](skills/sainsburys.md) - Sainsbury's skill details
- [`skills/tesco.md`](skills/tesco.md) - Tesco skill details
- [`skills/ocado.md`](skills/ocado.md) - Ocado skill details
- [`AGENTS.md`](AGENTS.md) - Full agent integration guide
- [`docs/SMART-SHOPPING.md`](docs/SMART-SHOPPING.md) - Smart shopping decisions
- [`API-REFERENCE.md`](API-REFERENCE.md) - API endpoint documentation
