# MCP Server Setup for Claude Desktop

This CLI can be used as an MCP (Model Context Protocol) server, allowing Claude Desktop to search products, manage your grocery basket, and book delivery slots directly.

## What is MCP?

MCP (Model Context Protocol) is Anthropic's standard for connecting Claude Desktop to external tools and data sources. This allows Claude to:
- Search for grocery products
- Add/remove items from your basket
- View basket contents and totals
- List available delivery slots
- All directly from Claude Desktop conversations

## Installation

### 1. Install the CLI

```bash
git clone https://github.com/abracadabra50/uk-grocery-cli.git
cd uk-grocery-cli
npm install
npm run build
```

### 2. Configure Claude Desktop

Add the following to your Claude Desktop MCP configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`  
**Linux:** `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "uk-grocery": {
      "command": "node",
      "args": [
        "/FULL/PATH/TO/uk-grocery-cli/dist/mcp-server.js"
      ],
      "env": {
        "SAINSBURYS_EMAIL": "your.email@example.com",
        "SAINSBURYS_PASSWORD": "your_password"
      }
    }
  }
}
```

**Important:** Replace `/FULL/PATH/TO/uk-grocery-cli` with the actual absolute path to where you cloned the repository.

### 3. Restart Claude Desktop

Close and reopen Claude Desktop for the changes to take effect.

## Usage in Claude Desktop

Once configured, you can ask Claude to help with grocery shopping:

### Search Products
```
"Search for milk at Sainsbury's"
"Find organic chicken"
"What bread options are available?"
```

### Manage Basket
```
"Add 2 litres of milk to my basket"
"Show me my current basket"
"Remove the bread from my basket"
"What's my basket total?"
```

### Delivery Slots
```
"What delivery slots are available?"
"Show me tomorrow's delivery times"
```

## Available Tools

The MCP server exposes these tools to Claude:

### `grocery_login`
Login to Sainsbury's account (usually automatic from config)

### `grocery_search`
Search for products by name or keyword
- Input: `query` (string), optional `limit` (number)
- Returns: Product names, prices, and IDs

### `grocery_basket_view`
View current basket contents and total cost

### `grocery_basket_add`
Add a product to basket
- Input: `product_id` (string), optional `quantity` (number)

### `grocery_basket_remove`
Remove a product from basket
- Input: `product_id` (string)

### `grocery_slots_list`
List available delivery slots (uses browser automation, takes 10-15 seconds)

## Security Notes

### Credentials in Config
Your email and password are stored in the Claude Desktop config file. This file is:
- Stored locally on your machine
- Not synced or uploaded anywhere
- Only accessible by Claude Desktop and the MCP server

### Session Management
After first login, a session file is created at `~/.sainsburys/session.json` which is used for subsequent requests. This expires after 7 days.

### Payment Safety
The MCP server does NOT expose checkout or payment functions. These must be done manually through the CLI or browser for safety.

## Troubleshooting

### "Not logged in" errors
The MCP server will try to use saved session or auto-login with provided credentials. If this fails:

1. Login manually first:
```bash
cd /path/to/uk-grocery-cli
node dist/cli.js login --email EMAIL --password PASSWORD
```

2. Or provide credentials in the config (see step 2 above)

### "Unknown tool" errors
Make sure Claude Desktop was restarted after updating the config file.

### Slow responses
Delivery slot listing uses browser automation and takes 10-15 seconds. Other operations are fast (1-2 seconds).

### Session expired
Sessions expire after 7 days. Re-login manually or Claude will auto-login on next request.

## Example Conversation

```
You: "Add some groceries to my basket for dinner tonight"

Claude: "I'll help you with that! What would you like to cook? 
I can search for ingredients at Sainsbury's and add them to 
your basket."

You: "Chicken stir fry"

Claude: "Great choice! Let me search for ingredients..."

[Uses grocery_search to find chicken, vegetables, noodles]
[Uses grocery_basket_add to add items]

Claude: "I've added:
- 500g chicken breast (£6.50)
- Stir fry vegetables (£2.80)
- Egg noodles (£1.20)

Your basket total is now £10.50. Would you like to see 
available delivery slots?"
```

## Limitations

- **UK Only**: Sainsbury's is UK-based
- **No Payment**: Checkout must be done manually for security
- **Browser Required**: Slot listing requires Playwright (installed with dependencies)
- **Single Account**: One Sainsbury's account per configuration

## Advanced: Multiple Accounts

To use multiple Sainsbury's accounts (e.g., personal and business), create separate MCP server entries:

```json
{
  "mcpServers": {
    "uk-grocery-personal": {
      "command": "node",
      "args": ["/path/to/uk-grocery-cli/dist/mcp-server.js"],
      "env": {
        "SAINSBURYS_EMAIL": "personal@example.com",
        "SAINSBURYS_PASSWORD": "password1"
      }
    },
    "uk-grocery-business": {
      "command": "node",
      "args": ["/path/to/uk-grocery-cli/dist/mcp-server.js"],
      "env": {
        "SAINSBURYS_EMAIL": "business@example.com",
        "SAINSBURYS_PASSWORD": "password2"
      }
    }
  }
}
```

## Development

To test the MCP server locally:

```bash
# Build first
npm run build

# Run MCP server
node dist/mcp-server.js

# It will wait for JSON-RPC messages on stdin
```

For development, use the MCP Inspector:
```bash
npx @modelcontextprotocol/inspector node dist/mcp-server.js
```

## Support

- GitHub Issues: https://github.com/abracadabra50/uk-grocery-cli/issues
- Documentation: See README.md for full CLI documentation
- MCP Spec: https://modelcontextprotocol.io

## Related

- [README.md](./README.md) - CLI usage and features
- [PAYMENT-HANDLING.md](./PAYMENT-HANDLING.md) - Security and payment info
- [API-REFERENCE.md](./API-REFERENCE.md) - Technical implementation details
