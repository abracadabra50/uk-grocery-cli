#!/usr/bin/env node
/**
 * MCP (Model Context Protocol) Server for UK Grocery CLI
 *
 * Exposes grocery shopping functions as MCP tools for Claude Desktop
 * and other MCP-compatible clients. Supports all providers:
 * Sainsbury's, Ocado, and Tesco.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ProviderFactory, ProviderName, compareProduct } from './providers/index.js';
import type { GroceryProvider } from './providers/types.js';
import * as fs from 'fs';
import * as os from 'os';

const server = new Server(
  {
    name: 'uk-grocery-cli',
    version: '2.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const PROVIDERS: ProviderName[] = ['sainsburys', 'ocado', 'tesco'];

// Session directories per provider
const SESSION_PATHS: Record<ProviderName, string> = {
  sainsburys: `${os.homedir()}/.sainsburys/session.json`,
  ocado: `${os.homedir()}/.ocado/session.json`,
  tesco: `${os.homedir()}/.tesco/session.json`,
};

function isLoggedIn(provider: ProviderName): boolean {
  return fs.existsSync(SESSION_PATHS[provider]);
}

function requireLogin(provider: ProviderName): string | null {
  if (!isLoggedIn(provider)) {
    return `Not logged in to ${provider}. Use grocery_login with provider "${provider}" first.`;
  }
  return null;
}

function getProvider(name: ProviderName): GroceryProvider {
  return ProviderFactory.create(name);
}

function textResult(text: string, isError = false) {
  return {
    content: [{ type: 'text' as const, text }],
    ...(isError ? { isError: true } : {}),
  };
}

// ─── Tool definitions ────────────────────────────────────────────

const providerEnum = { type: 'string', enum: PROVIDERS, description: 'Supermarket provider: sainsburys, ocado, or tesco' };

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // ── Authentication ──
      {
        name: 'grocery_login',
        description: 'Login to a UK supermarket account. Required before using other tools for that provider. Launches a browser for authentication.',
        inputSchema: {
          type: 'object',
          properties: {
            provider: { ...providerEnum, default: 'sainsburys' },
            email: { type: 'string', description: 'Account email address' },
            password: { type: 'string', description: 'Account password' },
          },
          required: ['email', 'password'],
        },
      },
      {
        name: 'grocery_status',
        description: 'Check which supermarket accounts are currently logged in.',
        inputSchema: { type: 'object', properties: {} },
      },

      // ── Search ──
      {
        name: 'grocery_search',
        description: 'Search for grocery products at a UK supermarket. Returns product names, prices, stock status, and IDs.',
        inputSchema: {
          type: 'object',
          properties: {
            provider: { ...providerEnum, default: 'sainsburys' },
            query: { type: 'string', description: 'Search term (e.g., "milk", "organic eggs", "chicken breast")' },
            limit: { type: 'number', description: 'Maximum results to return (default: 10)', default: 10 },
          },
          required: ['query'],
        },
      },
      {
        name: 'grocery_compare',
        description: 'Compare a product across all supermarkets to find the best price. Searches Sainsbury\'s, Ocado, and Tesco simultaneously.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Product to compare (e.g., "semi-skimmed milk")' },
            limit: { type: 'number', description: 'Results per provider (default: 5)', default: 5 },
          },
          required: ['query'],
        },
      },

      // ── Basket ──
      {
        name: 'grocery_basket_view',
        description: 'View the current shopping basket contents and total cost at a supermarket.',
        inputSchema: {
          type: 'object',
          properties: {
            provider: { ...providerEnum, default: 'sainsburys' },
          },
        },
      },
      {
        name: 'grocery_basket_add',
        description: 'Add a product to the shopping basket at a supermarket.',
        inputSchema: {
          type: 'object',
          properties: {
            provider: { ...providerEnum, default: 'sainsburys' },
            product_id: { type: 'string', description: 'Product ID from search results' },
            quantity: { type: 'number', description: 'Quantity to add (default: 1)', default: 1 },
          },
          required: ['product_id'],
        },
      },
      {
        name: 'grocery_basket_remove',
        description: 'Remove a product from the shopping basket.',
        inputSchema: {
          type: 'object',
          properties: {
            provider: { ...providerEnum, default: 'sainsburys' },
            product_id: { type: 'string', description: 'Product or item ID to remove' },
          },
          required: ['product_id'],
        },
      },
      {
        name: 'grocery_basket_update',
        description: 'Update the quantity of an item already in the basket.',
        inputSchema: {
          type: 'object',
          properties: {
            provider: { ...providerEnum, default: 'sainsburys' },
            item_id: { type: 'string', description: 'Item ID in the basket' },
            quantity: { type: 'number', description: 'New quantity' },
          },
          required: ['item_id', 'quantity'],
        },
      },
      {
        name: 'grocery_basket_clear',
        description: 'Clear all items from the shopping basket. This cannot be undone.',
        inputSchema: {
          type: 'object',
          properties: {
            provider: { ...providerEnum, default: 'sainsburys' },
          },
        },
      },

      // ── Delivery & Checkout ──
      {
        name: 'grocery_slots',
        description: 'List available delivery slots. May use browser automation and take 10-15 seconds.',
        inputSchema: {
          type: 'object',
          properties: {
            provider: { ...providerEnum, default: 'sainsburys' },
          },
        },
      },
      {
        name: 'grocery_book_slot',
        description: 'Book a delivery slot.',
        inputSchema: {
          type: 'object',
          properties: {
            provider: { ...providerEnum, default: 'sainsburys' },
            slot_id: { type: 'string', description: 'Slot ID from grocery_slots results' },
          },
          required: ['slot_id'],
        },
      },
      {
        name: 'grocery_checkout',
        description: 'Complete the order and checkout. Use dry_run=true to preview without placing the order.',
        inputSchema: {
          type: 'object',
          properties: {
            provider: { ...providerEnum, default: 'sainsburys' },
            dry_run: { type: 'boolean', description: 'Preview without placing order (default: true)', default: true },
          },
        },
      },
      {
        name: 'grocery_orders',
        description: 'View order history for a supermarket.',
        inputSchema: {
          type: 'object',
          properties: {
            provider: { ...providerEnum, default: 'sainsburys' },
            limit: { type: 'number', description: 'Max orders to return (default: 10)', default: 10 },
          },
        },
      },

      // ── Tesco-specific ──
      {
        name: 'tesco_staples',
        description: 'Tesco only: View or manage repeat-purchase staples detected from order history. Can auto-add staples to basket.',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['view', 'update', 'add_to_basket'],
              description: 'view = show staples, update = refresh from order history, add_to_basket = add all staples to basket',
              default: 'view',
            },
          },
        },
      },

      // ── Providers ──
      {
        name: 'grocery_providers',
        description: 'List all available supermarket providers and their login status.',
        inputSchema: { type: 'object', properties: {} },
      },
    ],
  };
});

// ─── Tool handlers ───────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  const providerName = ((args as any).provider || 'sainsburys') as ProviderName;

  try {
    // ── grocery_login ──
    if (name === 'grocery_login') {
      const { email, password } = args as { email: string; password: string };
      const provider = getProvider(providerName);
      await provider.login(email, password);
      return textResult(`Logged in to ${providerName} successfully. Session saved.`);
    }

    // ── grocery_status ──
    if (name === 'grocery_status') {
      const statuses = PROVIDERS.map(p => `${p}: ${isLoggedIn(p) ? 'logged in' : 'not logged in'}`);
      return textResult(`Authentication status:\n${statuses.join('\n')}`);
    }

    // ── grocery_providers ──
    if (name === 'grocery_providers') {
      const info = PROVIDERS.map(p => {
        const loggedIn = isLoggedIn(p);
        return `- ${p}: ${loggedIn ? 'logged in' : 'not logged in'}`;
      });
      return textResult(`Available providers:\n${info.join('\n')}`);
    }

    // ── grocery_compare ──
    if (name === 'grocery_compare') {
      const { query, limit = 5 } = args as { query: string; limit?: number };
      const results = await compareProduct(query, undefined, limit);

      const sections = results.map(({ provider, products, error }) => {
        if (error) return `${provider.toUpperCase()}: Error - ${error}`;
        if (products.length === 0) return `${provider.toUpperCase()}: No products found`;

        const cheapest = products.reduce((min, p) =>
          p.retail_price.price < min.retail_price.price ? p : min
        );
        const lines = products.map((p, i) => {
          const best = p.product_uid === cheapest.product_uid ? ' [BEST PRICE]' : '';
          return `  ${i + 1}. ${p.name} - £${p.retail_price.price.toFixed(2)}${best} (ID: ${p.product_uid})`;
        });
        return `${provider.toUpperCase()}:\n${lines.join('\n')}`;
      });

      return textResult(`Price comparison for "${query}":\n\n${sections.join('\n\n')}`);
    }

    // All remaining tools require login
    const loginError = requireLogin(providerName);

    // ── grocery_search ──
    if (name === 'grocery_search') {
      // Search can sometimes work without login for some providers, but check anyway
      if (loginError) return textResult(loginError, true);
      const { query, limit = 10 } = args as { query: string; limit?: number };
      const provider = getProvider(providerName);
      const results = await provider.search(query);
      const limited = results.slice(0, limit);

      const formatted = limited.map((p, i) => {
        const stock = p.in_stock ? 'In stock' : 'Out of stock';
        const unitPrice = p.unit_price ? ` (${p.unit_price.price}/${p.unit_price.measure})` : '';
        return `${i + 1}. ${p.name}\n   £${p.retail_price.price.toFixed(2)}${unitPrice} | ${stock} | ID: ${p.product_uid}`;
      }).join('\n\n');

      return textResult(
        `Found ${results.length} products at ${providerName} (showing ${limited.length}):\n\n${formatted}`
      );
    }

    // ── grocery_basket_view ──
    if (name === 'grocery_basket_view') {
      if (loginError) return textResult(loginError, true);
      const provider = getProvider(providerName);
      const basket = await provider.getBasket();

      if (basket.items.length === 0) {
        return textResult(`${providerName} basket is empty.`);
      }

      const formatted = basket.items.map((item, i) =>
        `${i + 1}. ${item.quantity}x ${item.name}\n   £${item.unit_price.toFixed(2)} each = £${item.total_price.toFixed(2)} | ID: ${item.product_uid}`
      ).join('\n\n');

      return textResult(
        `${providerName.toUpperCase()} Basket - £${basket.total_cost.toFixed(2)} (${basket.items.length} items):\n\n${formatted}`
      );
    }

    // ── grocery_basket_add ──
    if (name === 'grocery_basket_add') {
      if (loginError) return textResult(loginError, true);
      const { product_id, quantity = 1 } = args as { product_id: string; quantity?: number };
      const provider = getProvider(providerName);
      await provider.addToBasket(product_id, quantity);
      return textResult(`Added ${quantity}x product ${product_id} to ${providerName} basket.`);
    }

    // ── grocery_basket_remove ──
    if (name === 'grocery_basket_remove') {
      if (loginError) return textResult(loginError, true);
      const { product_id } = args as { product_id: string };
      const provider = getProvider(providerName);
      await provider.removeFromBasket(product_id);
      return textResult(`Removed product ${product_id} from ${providerName} basket.`);
    }

    // ── grocery_basket_update ──
    if (name === 'grocery_basket_update') {
      if (loginError) return textResult(loginError, true);
      const { item_id, quantity } = args as { item_id: string; quantity: number };
      const provider = getProvider(providerName);
      await provider.updateBasketItem(item_id, quantity);
      return textResult(`Updated item ${item_id} to quantity ${quantity} in ${providerName} basket.`);
    }

    // ── grocery_basket_clear ──
    if (name === 'grocery_basket_clear') {
      if (loginError) return textResult(loginError, true);
      const provider = getProvider(providerName);
      await provider.clearBasket();
      return textResult(`${providerName} basket cleared.`);
    }

    // ── grocery_slots ──
    if (name === 'grocery_slots') {
      if (loginError) return textResult(loginError, true);
      const provider = getProvider(providerName);
      const slots = await provider.getDeliverySlots();

      if (slots.length === 0) {
        return textResult(`No delivery slots available at ${providerName}. Ensure basket meets minimum spend.`);
      }

      const formatted = slots.map((slot, i) => {
        const avail = slot.available ? 'Available' : 'Unavailable';
        return `${i + 1}. ${slot.date} ${slot.start_time}-${slot.end_time}\n   £${slot.price.toFixed(2)} | ${avail} | ID: ${slot.slot_id}`;
      }).join('\n\n');

      return textResult(`${providerName.toUpperCase()} Delivery Slots:\n\n${formatted}`);
    }

    // ── grocery_book_slot ──
    if (name === 'grocery_book_slot') {
      if (loginError) return textResult(loginError, true);
      const { slot_id } = args as { slot_id: string };
      const provider = getProvider(providerName);
      await provider.bookSlot(slot_id);
      return textResult(`Slot ${slot_id} booked at ${providerName}.`);
    }

    // ── grocery_checkout ──
    if (name === 'grocery_checkout') {
      if (loginError) return textResult(loginError, true);
      const { dry_run = true } = args as { dry_run?: boolean };
      const provider = getProvider(providerName);
      const order = await provider.checkout(dry_run);

      if (dry_run) {
        return textResult(
          `Checkout preview for ${providerName}:\nTotal: £${order.total}\nStatus: ${order.status}\nItems: ${order.items.length}\n\nUse dry_run=false to place the order.`
        );
      }

      return textResult(
        `Order placed at ${providerName}!\nOrder ID: ${order.order_id}\nTotal: £${order.total}\nStatus: ${order.status}`
      );
    }

    // ── grocery_orders ──
    if (name === 'grocery_orders') {
      if (loginError) return textResult(loginError, true);
      const { limit = 10 } = args as { limit?: number };
      const provider = getProvider(providerName);
      const orders = await provider.getOrders();

      if (orders.length === 0) {
        return textResult(`No orders found at ${providerName}.`);
      }

      const displayed = orders.slice(0, limit);
      const formatted = displayed.map((order, i) => {
        const delivery = order.delivery_slot
          ? `\n   Delivery: ${order.delivery_slot.date} ${order.delivery_slot.start_time}-${order.delivery_slot.end_time}`
          : '';
        return `${i + 1}. Order #${order.order_id}\n   Total: £${order.total.toFixed(2)} | Status: ${order.status}${delivery}`;
      }).join('\n\n');

      return textResult(
        `${providerName.toUpperCase()} Orders (${displayed.length} of ${orders.length}):\n\n${formatted}`
      );
    }

    // ── tesco_staples ──
    if (name === 'tesco_staples') {
      const tescoLoginError = requireLogin('tesco');
      if (tescoLoginError) return textResult(tescoLoginError, true);

      const { action = 'view' } = args as { action?: string };
      const { TescoProvider } = await import('./providers/tesco/index.js');
      const { updateStaples, loadStaples, addStaplesToBasket } = await import('./providers/tesco/staples.js');

      const tesco = new TescoProvider();
      const api = tesco.getAPI();

      let staples = loadStaples();

      if (action === 'update' || staples.length === 0) {
        staples = await updateStaples(api);
      }

      if (action === 'add_to_basket') {
        const basket = await tesco.getBasket();
        const alreadyAdded = new Set(basket.items.map(i => i.product_uid));
        await addStaplesToBasket(tesco, staples, alreadyAdded);
        return textResult(`Added ${staples.length} staples to Tesco basket (skipped items already in basket).`);
      }

      const formatted = staples.map((s: any, i: number) =>
        `${i + 1}. ${s.name} (ordered ${s.frequency} times) | ID: ${s.product_uid}`
      ).join('\n');

      return textResult(`Tesco Staples (${staples.length} items):\n\n${formatted}`);
    }

    return textResult(`Unknown tool: ${name}`, true);

  } catch (error: any) {
    return textResult(`Error: ${error.message}`, true);
  }
});

// ─── Start server ────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('UK Grocery MCP Server v2.1.0 running on stdio');
  console.error(`Providers: ${PROVIDERS.join(', ')}`);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
