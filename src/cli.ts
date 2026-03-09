#!/usr/bin/env node

import { Command } from 'commander';
import { ProviderFactory, ProviderName, compareProduct } from './providers';
import { TescoProvider } from './providers/tesco/index';

const program = new Command();

program
  .name('groc')
  .description('UK Grocery CLI - Multi-supermarket grocery automation')
  .version('1.0.0')
  .option('-p, --provider <name>', 'Provider: sainsburys, ocado, tesco', 'sainsburys');

// Helper to get provider from options
function getProvider(options: any) {
  const providerName = options.provider || program.opts().provider;
  return ProviderFactory.create(providerName as ProviderName);
}

// Login
program
  .command('login')
  .description('Login to supermarket account')
  .requiredOption('-e, --email <email>', 'Email address')
  .option('--password [password]', 'Password (omit to be prompted interactively)')
  .action(async (options, cmd) => {
    try {
      const provider = getProvider(cmd.optsWithGlobals());
      await provider.login(options.email, options.password);
      console.log(`✅ Logged in to ${provider.name}`);
    } catch (error: any) {
      console.error('❌ Login failed:', error.message);
      process.exit(1);
    }
  });

// Logout
program
  .command('logout')
  .description('Logout from supermarket account')
  .action(async (options, cmd) => {
    try {
      const provider = getProvider(cmd.optsWithGlobals());
      await provider.logout();
      console.log(`✅ Logged out from ${provider.name}`);
    } catch (error: any) {
      console.error('❌ Logout failed:', error.message);
      process.exit(1);
    }
  });

// Search
program
  .command('search <query>')
  .description('Search for products')
  .option('-l, --limit <number>', 'Max results', '24')
  .option('--json', 'Output as JSON')
  .action(async (query, options, cmd) => {
    try {
      const provider = getProvider(cmd.optsWithGlobals());
      const products = await provider.search(query, { limit: parseInt(options.limit) });
      
      if (options.json) {
        console.log(JSON.stringify({ products }, null, 2));
      } else {
        console.log(`\n🔍 Search results from ${provider.name}: "${query}"\n`);
        products.forEach((p, i) => {
          const stock = p.in_stock ? '✅' : '❌';
          console.log(`${i + 1}. ${p.name}`);
          console.log(`   £${p.retail_price.price} ${stock}`);
          console.log(`   ID: ${p.product_uid}\n`);
        });
      }
    } catch (error: any) {
      console.error('❌ Search failed:', error.message);
      process.exit(1);
    }
  });

// Compare across providers
program
  .command('compare <query>')
  .description('Compare product across all supermarkets')
  .option('-l, --limit <number>', 'Results per provider', '5')
  .option('--json', 'Output as JSON')
  .action(async (query, options) => {
    try {
      console.log(`\n🔍 Comparing "${query}" across supermarkets...\n`);
      
      const results = await compareProduct(query);
      
      if (options.json) {
        console.log(JSON.stringify(results, null, 2));
        return;
      }

      for (const { provider, products, error } of results) {
        console.log(`\n📦 ${provider.toUpperCase()}`);
        console.log('─'.repeat(50));
        
        if (error) {
          console.log(`❌ Error: ${error}\n`);
          continue;
        }

        if (products.length === 0) {
          console.log('No products found\n');
          continue;
        }

        const cheapest = products.reduce((min, p) => 
          p.retail_price.price < min.retail_price.price ? p : min
        );

        products.slice(0, 5).forEach((p, i) => {
          const isCheapest = p.product_uid === cheapest.product_uid ? ' 💰 BEST' : '';
          console.log(`${i + 1}. ${p.name}`);
          console.log(`   £${p.retail_price.price}${isCheapest}`);
        });
        console.log();
      }
    } catch (error: any) {
      console.error('❌ Compare failed:', error.message);
      process.exit(1);
    }
  });

// Basket
program
  .command('basket')
  .description('View basket')
  .option('--json', 'Output as JSON')
  .action(async (options, cmd) => {
    try {
      const provider = getProvider(cmd.optsWithGlobals());
      const basket = await provider.getBasket();
      
      if (options.json) {
        console.log(JSON.stringify(basket, null, 2));
      } else {
        console.log(`\n🛒 ${provider.name.toUpperCase()} Basket\n`);
        console.log(`Total: £${basket.total_cost.toFixed(2)} (${basket.total_quantity} items)\n`);
        
        basket.items.forEach((item, i) => {
          console.log(`${i + 1}. ${item.quantity}x ${item.name}`);
          console.log(`   £${item.unit_price} each = £${item.total_price}`);
          console.log(`   ID: ${item.item_id}\n`);
        });
      }
    } catch (error: any) {
      console.error('❌ Failed to get basket:', error.message);
      process.exit(1);
    }
  });

// Add to basket
program
  .command('add <product-id>')
  .description('Add product to basket')
  .option('-q, --qty <number>', 'Quantity', '1')
  .action(async (productId, options, cmd) => {
    try {
      const provider = getProvider(cmd.optsWithGlobals());
      await provider.addToBasket(productId, parseInt(options.qty));
      console.log(`✅ Added to ${provider.name} basket`);
    } catch (error: any) {
      console.error('❌ Failed to add to basket:', error.message);
      process.exit(1);
    }
  });

// Remove from basket
program
  .command('remove <item-id>')
  .description('Remove item from basket')
  .action(async (itemId, options, cmd) => {
    try {
      const provider = getProvider(cmd.optsWithGlobals());
      await provider.removeFromBasket(itemId);
      console.log(`✅ Removed from ${provider.name} basket`);
    } catch (error: any) {
      console.error('❌ Failed to remove from basket:', error.message);
      process.exit(1);
    }
  });

// Delivery slots
program
  .command('slots')
  .description('View delivery slots')
  .option('--json', 'Output as JSON')
  .action(async (options, cmd) => {
    try {
      const provider = getProvider(cmd.optsWithGlobals());
      const slots = await provider.getDeliverySlots();
      
      if (options.json) {
        console.log(JSON.stringify({ slots }, null, 2));
      } else {
        console.log(`\n📅 ${provider.name.toUpperCase()} Delivery Slots\n`);
        slots.forEach((slot, i) => {
          const available = slot.available ? '✅' : '❌';
          console.log(`${i + 1}. ${slot.date} ${slot.start_time}-${slot.end_time}`);
          console.log(`   £${slot.price} ${available}`);
          console.log(`   ID: ${slot.slot_id}\n`);
        });
      }
    } catch (error: any) {
      console.error('❌ Failed to get slots:', error.message);
      process.exit(1);
    }
  });

// Book slot
program
  .command('book <slot-id>')
  .description('Book delivery slot')
  .action(async (slotId, options, cmd) => {
    try {
      const provider = getProvider(cmd.optsWithGlobals());
      await provider.bookSlot(slotId);
      console.log(`✅ Slot booked with ${provider.name}`);
    } catch (error: any) {
      console.error('❌ Failed to book slot:', error.message);
      process.exit(1);
    }
  });

// Checkout
program
  .command('checkout')
  .description('Complete order and checkout')
  .option('--dry-run', 'Preview without placing order')
  .action(async (options, cmd) => {
    try {
      const provider = getProvider(cmd.optsWithGlobals());
      
      if (options.dryRun) {
        console.log(`🔍 Dry run - previewing ${provider.name} checkout flow...\n`);
      }
      
      const order = await provider.checkout(options.dryRun || false);
      
      if (options.dryRun) {
        console.log(`\n📋 Checkout Preview:`);
        console.log(`Total: £${order.total}`);
        console.log(`Status: ${order.status}`);
        console.log('\n💡 Use without --dry-run to place order');
      } else {
        console.log(`✅ Order placed with ${provider.name}!`);
        console.log(JSON.stringify(order, null, 2));
      }
    } catch (error: any) {
      console.error('❌ Checkout failed:', error.message);
      process.exit(1);
    }
  });

// Orders
program
  .command('orders')
  .description('View order history')
  .option('--json', 'Output as JSON')
  .option('--limit <number>', 'Max orders to show', '10')
  .action(async (options, cmd) => {
    try {
      const provider = getProvider(cmd.optsWithGlobals());
      const orders = await provider.getOrders();
      
      if (options.json) {
        console.log(JSON.stringify({ orders }, null, 2));
        return;
      }
      
      if (orders.length === 0) {
        console.log(`\n📦 No orders found for ${provider.name}\n`);
        console.log('Note: Order history may not be available via API.');
        console.log('Check the website for full order history.\n');
        return;
      }
      
      console.log(`\n📦 ${provider.name.toUpperCase()} Order History\n`);
      
      const limit = parseInt(options.limit);
      const displayOrders = orders.slice(0, limit);
      
      displayOrders.forEach((order, i) => {
        console.log(`${i + 1}. Order #${order.order_id}`);
        console.log(`   Status: ${order.status}`);
        console.log(`   Total: £${order.total.toFixed(2)}`);
        
        if (order.delivery_slot) {
          console.log(`   Delivery: ${order.delivery_slot.date} ${order.delivery_slot.start_time}-${order.delivery_slot.end_time}`);
        }
        
        if (order.items && order.items.length > 0) {
          console.log(`   Items: ${order.items.length}`);
        }
        
        console.log();
      });
      
      if (orders.length > limit) {
        console.log(`Showing ${limit} of ${orders.length} orders. Use --limit to see more.\n`);
      }
    } catch (error: any) {
      console.error('❌ Failed to get orders:', error.message);
      console.log('\nNote: Order history may require additional permissions.');
      console.log('Try logging in again or check the website.\n');
      process.exit(1);
    }
  });

// Update basket item quantity
program
  .command('update <item-id> <quantity>')
  .description('Update quantity of a basket item')
  .action(async (itemId, quantity, options, cmd) => {
    try {
      const provider = getProvider((cmd as any).optsWithGlobals());
      await provider.updateBasketItem(itemId, parseInt(quantity));
      console.log(`✅ Updated item ${itemId} to qty ${quantity}`);
    } catch (error: any) {
      console.error('❌ Failed to update basket item:', error.message);
      process.exit(1);
    }
  });

// Clear basket
program
  .command('clear')
  .description('Clear all items from basket')
  .option('--force', 'Skip confirmation prompt')
  .action(async (options, cmd) => {
    try {
      if (!options.force) {
        console.log('⚠️  Use --force to confirm clearing the basket');
        process.exit(0);
      }
      const provider = getProvider(cmd.optsWithGlobals());
      await provider.clearBasket();
      console.log(`✅ Basket cleared`);
    } catch (error: any) {
      console.error('❌ Failed to clear basket:', error.message);
      process.exit(1);
    }
  });

// List providers
program
  .command('providers')
  .description('List available supermarket providers')
  .action(() => {
    const providers = ProviderFactory.getAvailableProviders();
    console.log('\n📦 Available Providers:\n');
    providers.forEach(p => {
      console.log(`  • ${p}`);
    });
    console.log();
  });

// ─────────────────────────────────────────────────────────
// Tesco-specific commands
// ─────────────────────────────────────────────────────────

// Tesco: API discovery
program
  .command('discover')
  .description('Tesco only — intercept network traffic to discover API endpoints')
  .action(async (options, cmd) => {
    const providerName = cmd.optsWithGlobals().provider;
    if (providerName !== 'tesco') {
      console.error('❌ The discover command is only available for --provider tesco');
      process.exit(1);
    }
    try {
      const { discover } = await import('./providers/tesco/discover');
      await discover();
    } catch (error: any) {
      console.error('❌ Discovery failed:', error.message);
      process.exit(1);
    }
  });

// Tesco: import session from Chrome cookie export
program
  .command('import-session')
  .description('Tesco only — import cookies exported from Chrome as a session fallback')
  .requiredOption('--file <path>', 'Path to cookies JSON file exported from Chrome DevTools')
  .action(async (options, cmd) => {
    const providerName = cmd.optsWithGlobals().provider;
    if (providerName !== 'tesco') {
      console.error('❌ The import-session command is only available for --provider tesco');
      process.exit(1);
    }
    try {
      const { importSession } = await import('./providers/tesco/import-session');
      importSession(options.file);
    } catch (error: any) {
      console.error('❌ Session import failed:', error.message);
      process.exit(1);
    }
  });

// Tesco: staples management
program
  .command('staples')
  .description('Tesco only — view, update, or add your regular staples to basket')
  .option('--update', 'Refresh staples from order history')
  .option('--add', 'Add all staples to basket (skips items already present)')
  .option('--json', 'Output as JSON')
  .action(async (options, cmd) => {
    const providerName = cmd.optsWithGlobals().provider;
    if (providerName !== 'tesco') {
      console.error('❌ The staples command is only available for --provider tesco');
      process.exit(1);
    }
    try {
      const { updateStaples, loadStaples, printStaples, addStaplesToBasket } =
        await import('./providers/tesco/staples');

      const provider = getProvider(cmd.optsWithGlobals()) as TescoProvider;
      const api = provider.getAPI();

      let staples = loadStaples();

      if (options.update || staples.length === 0) {
        staples = await updateStaples(api);
      }

      if (options.add) {
        // Get current basket to skip already-added items
        const basket = await provider.getBasket();
        const alreadyAdded = new Set(basket.items.map(i => i.product_uid));
        await addStaplesToBasket(provider, staples, alreadyAdded);
        return;
      }

      printStaples(staples, options.json);

    } catch (error: any) {
      console.error('❌ Staples command failed:', error.message);
      process.exit(1);
    }
  });

program.parse();
