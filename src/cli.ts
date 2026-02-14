#!/usr/bin/env node

import { Command } from 'commander';
import { SainsburysAPI } from './api/client';
import { login, loadSession, getCookieString, clearSession } from './auth/login';

const program = new Command();
const api = new SainsburysAPI();

// Load saved session if available
const session = loadSession();
if (session) {
  const cookieString = getCookieString(session);
  api.setAuthCookies(cookieString);
  console.error('✅ Loaded saved session');
}

program
  .name('sainsburys')
  .description('Sainsbury\'s Groceries CLI')
  .version('0.1.0');

// Login command
program
  .command('login')
  .description('Login to Sainsbury\'s account')
  .option('-e, --email <email>', 'Email address')
  .option('-p, --password <password>', 'Password')
  .action(async (options) => {
    try {
      const email = options.email || process.env.SAINSBURYS_EMAIL;
      const password = options.password || process.env.SAINSBURYS_PASSWORD;
      
      if (!email || !password) {
        console.error('❌ Email and password required');
        console.error('Use: sb login --email EMAIL --password PASSWORD');
        console.error('Or set: SAINSBURYS_EMAIL and SAINSBURYS_PASSWORD env vars');
        process.exit(1);
      }
      
      const sessionData = await login(email, password);
      const cookieString = getCookieString(sessionData);
      api.setAuthCookies(cookieString);
      
      console.log('✅ Login successful! Session saved.');
      console.log('You can now use basket, slots, and checkout commands.');
      
    } catch (error: any) {
      console.error('❌ Login failed:', error.message);
      process.exit(1);
    }
  });

// Logout command
program
  .command('logout')
  .description('Clear saved session')
  .action(() => {
    clearSession();
    console.log('👋 Logged out');
  });

// Categories command
program
  .command('categories')
  .alias('cats')
  .description('List all product categories')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      console.error('📦 Fetching categories...');
      const data = await api.getCategories();
      
      if (options.json) {
        console.log(JSON.stringify(data, null, 2));
      } else {
        // Pretty print categories
        if (data.category_hierarchy) {
          const printCategory = (cat: any, indent: string = '') => {
            console.log(`${indent}📁 ${cat.n || cat.name}`);
            if (cat.c && cat.c.length > 0) {
              cat.c.slice(0, 5).forEach((sub: any) => {
                printCategory(sub, indent + '  ');
              });
              if (cat.c.length > 5) {
                console.log(`${indent}  ... and ${cat.c.length - 5} more`);
              }
            }
          };
          
          console.log('\n📚 Sainsbury\'s Categories:\n');
          printCategory(data.category_hierarchy);
        } else {
          console.log(JSON.stringify(data, null, 2));
        }
      }
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Search command
program
  .command('search <query>')
  .description('Search for products')
  .option('--json', 'Output as JSON')
  .option('--page <n>', 'Page number', '1')
  .option('--limit <n>', 'Results per page', '24')
  .action(async (query, options) => {
    try {
      console.error(`🔍 Searching for: ${query}`);
      const page = parseInt(options.page);
      const limit = parseInt(options.limit);
      
      const data = await api.searchProducts(query, page, limit);
      
      if (options.json) {
        console.log(JSON.stringify(data, null, 2));
      } else {
        if (data.products && data.products.length > 0) {
          console.log(`\n📋 Found ${data.products.length} results\n`);
          
          data.products.forEach((product: any, idx: number) => {
            console.log(`${idx + 1}. ${product.name}`);
            if (product.retail_price?.price) {
              console.log(`   £${product.retail_price.price}`);
            }
            if (product.product_uid) {
              console.log(`   ID: ${product.product_uid}`);
            }
            console.log('');
          });
        } else {
          console.log('No results found');
        }
      }
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Browse category command
program
  .command('browse <category-id>')
  .description('Browse products in a category')
  .option('--json', 'Output as JSON')
  .option('--page <n>', 'Page number', '1')
  .option('--limit <n>', 'Results per page', '24')
  .action(async (categoryId, options) => {
    try {
      console.error(`🛒 Browsing category: ${categoryId}`);
      const page = parseInt(options.page);
      const limit = parseInt(options.limit);
      
      const data = await api.browseCategory(categoryId, page, limit);
      
      if (options.json) {
        console.log(JSON.stringify(data, null, 2));
      } else {
        if (data.products && data.products.length > 0) {
          console.log(`\n📋 Found ${data.products.length} products\n`);
          
          data.products.forEach((product: any, idx: number) => {
            console.log(`${idx + 1}. ${product.name}`);
            if (product.retail_price?.price) {
              console.log(`   £${product.retail_price.price}`);
            }
            console.log('');
          });
        } else {
          console.log('No products found');
        }
      }
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Product details command
program
  .command('product <id>')
  .description('Get product details')
  .option('--json', 'Output as JSON')
  .action(async (id, options) => {
    try {
      console.error(`📦 Fetching product: ${id}`);
      const data = await api.getProduct(id);
      
      if (options.json) {
        console.log(JSON.stringify(data, null, 2));
      } else {
        console.log(`\n${data.name || 'Product'}`);
        if (data.retail_price?.price) {
          console.log(`Price: £${data.retail_price.price}`);
        }
        if (data.description) {
          console.log(`\n${data.description}`);
        }
      }
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Basket command
program
  .command('basket')
  .description('View basket')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      console.error('🛒 Fetching basket...');
      const data = await api.getBasket();
      
      if (options.json) {
        console.log(JSON.stringify(data, null, 2));
      } else {
        if (data.trolley && data.trolley.trolley_details) {
          const trolley = data.trolley.trolley_details;
          console.log(`\n🛒 Your Basket\n`);
          console.log(`Items: ${trolley.total_quantity || 0}`);
          console.log(`Subtotal: £${trolley.total_cost || 0}`);
          
          if (trolley.products && trolley.products.length > 0) {
            console.log('\nProducts:');
            trolley.products.forEach((item: any) => {
              console.log(`  • ${item.quantity}x ${item.name}`);
              console.log(`    £${item.unit_price} each`);
            });
          }
        } else {
          console.log('Basket is empty or requires login');
          console.log(JSON.stringify(data, null, 2));
        }
      }
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.error('💡 You may need to login first: sb login');
      }
      process.exit(1);
    }
  });

// Slots command
program
  .command('slots')
  .description('View delivery slots')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      console.error('📅 Fetching delivery slots...');
      const data = await api.getSlotReservation();
      
      if (options.json) {
        console.log(JSON.stringify(data, null, 2));
      } else {
        console.log(JSON.stringify(data, null, 2));
      }
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.error('💡 You need to login first: sb login');
      }
      process.exit(1);
    }
  });

program.parse();
