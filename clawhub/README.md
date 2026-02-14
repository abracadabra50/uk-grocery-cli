# ClawHub Skill: UK Grocery

This directory contains the ClawHub-compatible skill package for UK Grocery CLI.

## What is ClawHub?

ClawHub (https://clawhub.ai) is the public skill registry for Clawdbot and other AI agent frameworks. It allows you to publish, version, and share agent skills.

## Files

- **SKILL.md** - ClawHub skill documentation (simplified from main repo)
- **skill.json** - Skill manifest with metadata
- **preferences.schema.json** - JSON schema for user configuration
- **setup.sh** - Interactive setup script (copied from repo root)

## Installation via ClawHub

Once published to ClawHub, users can install with:

```bash
clawhub install uk-grocery
```

This will:
1. Clone the skill repository
2. Run `npm install`
3. Install Playwright browsers
4. Run interactive setup (`./setup.sh`)

## Manual Installation

If not using ClawHub:

```bash
git clone https://github.com/abracadabra50/uk-grocery-cli
cd uk-grocery-cli
npm install
npx playwright install chromium
npm run setup
```

## Publishing to ClawHub

**NOTE:** This skill is not yet published to ClawHub. To publish:

1. Create ClawHub account at https://clawhub.ai
2. Authenticate: `clawhub login`
3. Publish: `clawhub publish`

```bash
# Login to ClawHub
clawhub login

# From repo root
cd /path/to/uk-grocery-cli

# Publish version 2.0.0
clawhub publish --version 2.0.0 --tag latest
```

## Skill Metadata

- **Name:** uk-grocery
- **Version:** 2.0.0
- **Author:** Zishan Ashraf
- **License:** MIT
- **Repository:** https://github.com/abracadabra50/uk-grocery-cli

## Tags

- groceries
- shopping
- uk
- sainsburys
- ocado
- automation
- meal-planning
- ecommerce

## Requirements

- Node.js >= 18.0.0
- Playwright (Chromium)
- UK delivery address
- Supermarket account

## Configuration

The skill uses `~/.uk-grocery-config.json` for user preferences:

```json
{
  "provider": "sainsburys",
  "email": "you@email.com",
  "dietary_restrictions": ["halal", "gluten-free"],
  "budget": { "weekly": 60 },
  "household_size": 2,
  "organic_priority": "dirty_dozen_only"
}
```

See `preferences.schema.json` for complete schema.

## Interactive Setup

The skill includes an interactive setup script:

```bash
npm run setup
```

Prompts for:
- Supermarket choice (Sainsbury's or Ocado)
- Account credentials
- Dietary restrictions
- Weekly budget
- Household size
- Organic preferences
- External sourcing (halal butcher, etc.)

## Usage in Agents

### Basic Search

```typescript
const results = await bash("groc search 'milk' --json");
const products = JSON.parse(results);
```

### Smart Shopping

```typescript
// Use Dirty Dozen logic
const isDirty = ['strawberries', 'spinach', 'kale'].includes(product);
const query = isDirty ? `organic ${product}` : product;
await bash(`groc search "${query}" --json`);
```

### Multi-Provider

```typescript
// Compare prices across supermarkets
const comparison = await bash("groc compare 'milk' --json");
```

## Documentation

Full documentation available in the main repository:

- **README.md** - Getting started
- **docs/API.md** - Complete API reference
- **docs/SMART-SHOPPING.md** - Organic prioritization guide
- **docs/EXAMPLES.md** - 9 real-world integration examples
- **docs/TROUBLESHOOTING.md** - Common issues and solutions
- **AGENTS.md** - Agent framework integration guide

## Support

- **Repository:** https://github.com/abracadabra50/uk-grocery-cli
- **Issues:** https://github.com/abracadabra50/uk-grocery-cli/issues
- **License:** MIT

---

**Enable your AI agent to handle grocery shopping! 🛒**
