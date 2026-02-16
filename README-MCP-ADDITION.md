## MCP Server (Claude Desktop Integration)

This CLI can be used as an **MCP (Model Context Protocol) server**, allowing Claude Desktop to manage your grocery shopping directly from conversations.

### Quick Setup

1. Install and build the CLI (see Installation above)

2. Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "uk-grocery": {
      "command": "node",
      "args": ["/path/to/uk-grocery-cli/dist/mcp-server.js"],
      "env": {
        "SAINSBURYS_EMAIL": "your.email@example.com",
        "SAINSBURYS_PASSWORD": "your_password"
      }
    }
  }
}
```

3. Restart Claude Desktop

### What Claude Can Do

Once configured, Claude can:
- **Search products**: "Find organic chicken at Sainsbury's"
- **Manage basket**: "Add 2 litres of milk to my basket"
- **View basket**: "What's in my basket?"
- **Check delivery slots**: "What delivery times are available tomorrow?"

### Full MCP Documentation

See [MCP-SETUP.md](./MCP-SETUP.md) for complete setup instructions, security notes, and troubleshooting.

### Example Conversation

```
You: "I need ingredients for pasta carbonara"

Claude: "I'll search for ingredients at Sainsbury's..."
[Searches for bacon, eggs, pasta, parmesan]
"Found these options:
1. Bacon lardons 200g - £2.50
2. Free range eggs (6) - £2.20
..."

You: "Add the bacon and eggs"

Claude: [Adds to basket] 
"Added! Your basket is now £4.70. Would you like 
to see delivery slots?"
```

---
