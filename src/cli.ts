#!/usr/bin/env node

import { Command } from 'commander';
import { ProviderFactory, ProviderName, compareProduct } from './providers';

const program = new Command();

program
  .name('groc')
  .description('UK Grocery CLI - Multi-supermarket grocery automation')
  .version('1.0.0')
  .option('-p, --provider <name>', 'Provider: sainsburys, ocado', 'sainsburys');

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
  .requiredOption('-p, --password <password>', 'Password')
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
        console.log(`🔍 Dry run - previewing ${provider.name} order...\n`);
        const basket = await provider.getBasket();
        console.log(JSON.stringify(basket, null, 2));
        console.log('\n💡 Use without --dry-run to place order');
        return;
      }
      
      const order = await provider.checkout();
      console.log(`✅ Order placed with ${provider.name}!`);
      console.log(JSON.stringify(order, null, 2));
    } catch (error: any) {
      console.error('❌ Checkout failed:', error.message);
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

program.parse();
