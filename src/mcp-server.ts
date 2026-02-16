#!/usr/bin/env node
/**
 * MCP (Model Context Protocol) Server for UK Grocery CLI
 * 
 * Exposes grocery shopping functions as MCP tools for Claude Desktop
 * and other MCP-compatible clients.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ProviderFactory } from './providers/index.js';
import { login } from './auth/login.js';
import * as fs from 'fs';
import * as os from 'os';

const server = new Server(
  {
    name: 'uk-grocery-cli',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Helper to check if logged in
function isLoggedIn(): boolean {
  const sessionFile = `${os.homedir()}/.sainsburys/session.json`;
  return fs.existsSync(sessionFile);
}

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'grocery_search',
        description: 'Search for grocery products at Sainsbury\'s. Returns product names, prices, and IDs.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search term (e.g., "milk", "bread", "chicken")',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 10)',
              default: 10,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'grocery_basket_view',
        description: 'View current shopping basket contents and total cost',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'grocery_basket_add',
        description: 'Add a product to the shopping basket',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: {
              type: 'string',
              description: 'Product ID from search results',
            },
            quantity: {
              type: 'number',
              description: 'Quantity to add (default: 1)',
              default: 1,
            },
          },
          required: ['product_id'],
        },
      },
      {
        name: 'grocery_basket_remove',
        description: 'Remove a product from the shopping basket',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: {
              type: 'string',
              description: 'Product ID to remove',
            },
          },
          required: ['product_id'],
        },
      },
      {
        name: 'grocery_slots_list',
        description: 'List available delivery slots. Note: Uses browser automation, may take 10-15 seconds.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'grocery_login',
        description: 'Login to Sainsbury\'s account. Required before using other tools.',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Account email address',
            },
            password: {
              type: 'string',
              description: 'Account password',
            },
          },
          required: ['email', 'password'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // Login tool
    if (name === 'grocery_login') {
      const { email, password } = args as { email: string; password: string };
      await login(email, password);
      return {
        content: [
          {
            type: 'text',
            text: '✅ Logged in successfully. Session saved for future requests.',
          },
        ],
      };
    }

    // Check login for other tools
    if (!isLoggedIn()) {
      return {
        content: [
          {
            type: 'text',
            text: '❌ Not logged in. Please use grocery_login first.',
          },
        ],
      };
    }

    const provider = ProviderFactory.create('sainsburys');

    // Search products
    if (name === 'grocery_search') {
      const { query, limit = 10 } = args as { query: string; limit?: number };
      const results = await provider.search(query);
      const limited = results.slice(0, limit);

      const formatted = limited.map((p, i) => 
        `${i + 1}. ${p.name}\n   £${p.retail_price.price.toFixed(2)} | ID: ${p.product_uid}`
      ).join('\n\n');

      return {
        content: [
          {
            type: 'text',
            text: `🔍 Found ${results.length} products (showing ${limited.length}):\n\n${formatted}`,
          },
        ],
      };
    }

    // View basket
    if (name === 'grocery_basket_view') {
      const basket = await provider.getBasket();
      
      if (basket.items.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: '🛒 Basket is empty',
            },
          ],
        };
      }

      const formatted = basket.items.map((item, i) => 
        `${i + 1}. ${item.quantity}x ${item.name}\n   £${item.unit_price.toFixed(2)} each = £${item.total_price.toFixed(2)}\n   ID: ${item.product_uid}`
      ).join('\n\n');

      return {
        content: [
          {
            type: 'text',
            text: `🛒 Shopping Basket\n\nTotal: £${basket.total_cost.toFixed(2)} (${basket.items.length} items)\n\n${formatted}`,
          },
        ],
      };
    }

    // Add to basket
    if (name === 'grocery_basket_add') {
      const { product_id, quantity = 1 } = args as { product_id: string; quantity?: number };
      await provider.addToBasket(product_id, quantity);
      
      return {
        content: [
          {
            type: 'text',
            text: `✅ Added ${quantity}x product ${product_id} to basket`,
          },
        ],
      };
    }

    // Remove from basket
    if (name === 'grocery_basket_remove') {
      const { product_id } = args as { product_id: string };
      await provider.removeFromBasket(product_id);
      
      return {
        content: [
          {
            type: 'text',
            text: `✅ Removed product ${product_id} from basket`,
          },
        ],
      };
    }

    // List delivery slots
    if (name === 'grocery_slots_list') {
      const slots = await provider.getDeliverySlots();
      
      if (slots.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: '📅 No delivery slots available. Make sure basket meets £25 minimum spend.',
            },
          ],
        };
      }

      const formatted = slots.map((slot, i) => 
        `${i + 1}. ${slot.date} ${slot.start_time}-${slot.end_time}\n   £${slot.price.toFixed(2)} | ID: ${slot.slot_id}`
      ).join('\n\n');

      return {
        content: [
          {
            type: 'text',
            text: `📅 Available Delivery Slots:\n\n${formatted}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `❌ Unknown tool: ${name}`,
        },
      ],
    };

  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('UK Grocery MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
