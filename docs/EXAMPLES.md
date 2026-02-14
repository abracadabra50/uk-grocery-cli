# Integration Examples

Real-world examples of integrating UK Grocery CLI with AI agents.

---

## Example 1: Basic Meal Planning

**Scenario:** User asks agent to plan meals and shop

```typescript
// Agent code
async function planMealsAndShop(user: User, budget: number) {
  // 1. Generate meal suggestions
  const meals = [
    { name: 'Spaghetti Bolognese', ingredients: ['pasta', 'tomatoes', 'onions', 'beef mince'] },
    { name: 'Chicken Stir Fry', ingredients: ['chicken', 'peppers', 'soy sauce', 'rice'] },
    { name: 'Greek Salad', ingredients: ['cucumber', 'tomatoes', 'feta', 'olives'] }
  ];
  
  // 2. Extract shopping list
  const ingredients = [...new Set(meals.flatMap(m => m.ingredients))];
  
  // 3. Search and add to basket
  for (const ingredient of ingredients) {
    const results = await bash(`groc --provider sainsburys search "${ingredient}" --json`);
    const products = JSON.parse(results);
    
    if (products.products.length > 0) {
      const cheapest = products.products[0];
      await bash(`groc --provider sainsburys add ${cheapest.product_uid} --qty 1`);
      await say(`Added ${cheapest.name} - £${cheapest.retail_price.price}`);
    }
  }
  
  // 4. Show basket
  const basket = await bash(`groc --provider sainsburys basket --json`);
  const basketData = JSON.parse(basket);
  
  await say(`Basket total: £${basketData.total_cost} (${basketData.total_quantity} items)`);
  
  // 5. Checkout
  const confirm = await ask('Ready to checkout?');
  if (confirm === 'yes') {
    await bash(`groc --provider sainsburys checkout`);
    await say('Order placed!');
  }
}
```

---

## Example 2: Smart Organic Choices

**Scenario:** Agent decides organic vs conventional using Dirty Dozen

```typescript
async function smartOrganicShopping(shoppingList: string[], budget: number) {
  const dirtyDozen = ['strawberries', 'spinach', 'kale', 'apples', 'grapes', 'peppers'];
  const cleanFifteen = ['avocados', 'onions', 'pineapple', 'sweet corn', 'cabbage'];
  
  let spent = 0;
  const decisions = [];
  
  for (const item of shoppingList) {
    const isDirty = dirtyDozen.some(d => item.toLowerCase().includes(d));
    const isClean = cleanFifteen.some(c => item.toLowerCase().includes(c));
    
    // Search both options
    const organicResults = await bash(`groc search "organic ${item}" --json`);
    const conventionalResults = await bash(`groc search "${item}" --json`);
    
    const organic = JSON.parse(organicResults).products[0];
    const conventional = JSON.parse(conventionalResults).products[0];
    
    let choice;
    let reason;
    
    if (isDirty) {
      // Always organic for Dirty Dozen
      choice = organic;
      reason = 'High pesticide residue - organic recommended';
    } else if (isClean) {
      // Conventional safe for Clean Fifteen
      choice = conventional;
      reason = 'Low pesticide residue - conventional is safe';
    } else {
      // Budget decision
      const priceDiff = ((organic.retail_price.price - conventional.retail_price.price) / conventional.retail_price.price) * 100;
      
      if (priceDiff < 20 && (spent + organic.retail_price.price) < budget) {
        choice = organic;
        reason = `Only ${priceDiff.toFixed(0)}% more expensive`;
      } else {
        choice = conventional;
        reason = `Organic is ${priceDiff.toFixed(0)}% more - not worth it`;
      }
    }
    
    // Add to basket
    await bash(`groc add ${choice.product_uid} --qty 1`);
    spent += choice.retail_price.price;
    
    decisions.push({
      item,
      choice: choice.name,
      price: choice.retail_price.price,
      reason
    });
  }
  
  // Report
  await say('Shopping complete! Here are my decisions:\n');
  for (const d of decisions) {
    await say(`${d.item}: ${d.choice} (£${d.price}) - ${d.reason}`);
  }
  await say(`\nTotal spent: £${spent} / £${budget} budget`);
}
```

---

## Example 3: Multi-Provider Price Comparison

**Scenario:** Agent finds cheapest option across stores

```typescript
async function findBestDeals(shoppingList: string[]) {
  const results = [];
  
  for (const item of shoppingList) {
    // Search all providers in parallel
    const [sainsburys, ocado] = await Promise.all([
      bash(`groc --provider sainsburys search "${item}" --json`),
      bash(`groc --provider ocado search "${item}" --json`)
    ]);
    
    const sainsburysProducts = JSON.parse(sainsburys).products;
    const ocadoProducts = JSON.parse(ocado).products;
    
    // Find cheapest
    const allProducts = [
      ...sainsburysProducts.map(p => ({ ...p, provider: 'sainsburys' })),
      ...ocadoProducts.map(p => ({ ...p, provider: 'ocado' }))
    ];
    
    const cheapest = allProducts.reduce((min, p) => 
      p.retail_price.price < min.retail_price.price ? p : min
    );
    
    results.push({
      item,
      product: cheapest.name,
      price: cheapest.retail_price.price,
      provider: cheapest.provider
    });
  }
  
  // Group by provider
  const bySainsburys = results.filter(r => r.provider === 'sainsburys');
  const byOcado = results.filter(r => r.provider === 'ocado');
  
  // Place orders
  if (bySainsburys.length > 0) {
    await say(`Ordering ${bySainsburys.length} items from Sainsbury's`);
    for (const item of bySainsburys) {
      const product = JSON.parse(await bash(`groc --provider sainsburys search "${item.item}" --json`)).products[0];
      await bash(`groc --provider sainsburys add ${product.product_uid} --qty 1`);
    }
  }
  
  if (byOcado.length > 0) {
    await say(`Ordering ${byOcado.length} items from Ocado`);
    for (const item of byOcado) {
      const product = JSON.parse(await bash(`groc --provider ocado search "${item.item}" --json`)).products[0];
      await bash(`groc --provider ocado add ${product.product_uid} --qty 1`);
    }
  }
}
```

---

## Example 4: Budget-Aware Shopping

**Scenario:** Agent stays within weekly budget

```typescript
async function budgetShopping(meals: Meal[], weeklyBudget: number) {
  const ingredients = extractIngredients(meals);
  let spent = 0;
  const purchased = [];
  const skipped = [];
  
  for (const ingredient of ingredients) {
    const results = await bash(`groc search "${ingredient.name}" --json`);
    const products = JSON.parse(results).products;
    
    if (products.length === 0) {
      skipped.push({ ingredient: ingredient.name, reason: 'Not found' });
      continue;
    }
    
    // Sort by price
    products.sort((a, b) => a.retail_price.price - b.retail_price.price);
    
    const cheapest = products[0];
    const totalCost = cheapest.retail_price.price * ingredient.quantity;
    
    if (spent + totalCost > weeklyBudget) {
      skipped.push({ 
        ingredient: ingredient.name, 
        reason: `Over budget (would cost £${totalCost}, £${weeklyBudget - spent} remaining)` 
      });
      continue;
    }
    
    // Add to basket
    await bash(`groc add ${cheapest.product_uid} --qty ${ingredient.quantity}`);
    spent += totalCost;
    purchased.push({ 
      name: cheapest.name, 
      price: cheapest.retail_price.price,
      quantity: ingredient.quantity,
      total: totalCost
    });
  }
  
  // Report
  await say(`Budget shopping complete!\n`);
  await say(`Purchased ${purchased.length} items: £${spent}`);
  await say(`Remaining budget: £${weeklyBudget - spent}`);
  
  if (skipped.length > 0) {
    await say(`\nSkipped items:`);
    for (const item of skipped) {
      await say(`- ${item.ingredient}: ${item.reason}`);
    }
  }
}
```

---

## Example 5: Auto-Reorder Essentials

**Scenario:** Agent tracks usage and reorders weekly items

```typescript
interface UsagePattern {
  product: string;
  lastPurchased: Date;
  frequency: number; // days between purchases
  productId: string;
}

async function autoReorderEssentials(patterns: UsagePattern[]) {
  const today = new Date();
  const needsReorder = [];
  
  for (const pattern of patterns) {
    const daysSince = Math.floor((today.getTime() - pattern.lastPurchased.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSince >= pattern.frequency) {
      needsReorder.push(pattern);
    }
  }
  
  if (needsReorder.length === 0) {
    await say('No items need reordering yet.');
    return;
  }
  
  await say(`${needsReorder.length} items need restocking:\n`);
  
  for (const item of needsReorder) {
    await say(`- ${item.product} (last purchased ${Math.floor((today.getTime() - item.lastPurchased.getTime()) / (1000 * 60 * 60 * 24))} days ago)`);
    await bash(`groc add ${item.productId} --qty 1`);
  }
  
  // Show basket and checkout
  const basket = await bash(`groc basket --json`);
  const basketData = JSON.parse(basket);
  
  await say(`\nAdded to basket: £${basketData.total_cost}`);
  
  const confirm = await ask('Auto-checkout?');
  if (confirm === 'yes') {
    await bash(`groc checkout`);
    await say('Essentials reordered!');
    
    // Update patterns
    for (const item of needsReorder) {
      item.lastPurchased = today;
    }
  }
}
```

---

## Example 6: Slack Bot Integration

**Scenario:** Slack bot for team grocery orders

```typescript
import { sendBlocks } from './slack';

async function handleGroceryRequest(user: string, request: string) {
  // Parse request
  const items = request.split(',').map(s => s.trim());
  
  // Search products
  const results = [];
  for (const item of items) {
    const searchResult = await bash(`groc search "${item}" --json`);
    const products = JSON.parse(searchResult).products;
    
    if (products.length > 0) {
      results.push(products[0]);
    }
  }
  
  // Build Block Kit message
  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: '🛒 Grocery Order Preview' }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Requested by:* <@${user}>\n*Items found:* ${results.length}/${items.length}`
      }
    },
    { type: 'divider' },
    ...results.map(p => ({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${p.name}*\n£${p.retail_price.price} - ${p.in_stock ? '✅ In stock' : '❌ Out of stock'}`
      },
      accessory: {
        type: 'button',
        text: { type: 'plain_text', text: 'Add to Basket' },
        action_id: `add_${p.product_uid}`
      }
    })),
    { type: 'divider' },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Add All to Basket' },
          style: 'primary',
          action_id: 'add_all'
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Cancel' },
          action_id: 'cancel'
        }
      ]
    }
  ];
  
  await sendBlocks(blocks);
}

// Handle button clicks
async function handleAddToBasket(productId: string) {
  await bash(`groc add ${productId} --qty 1`);
  await say('Added to basket!');
}
```

---

## Example 7: Dietary Restrictions Filter

**Scenario:** Agent filters products for dietary needs

```typescript
interface DietaryPreferences {
  restrictions: string[]; // ['vegan', 'gluten-free', 'halal']
  excludes: string[]; // ['meat', 'dairy', 'eggs']
}

async function filterByDiet(query: string, prefs: DietaryPreferences): Promise<Product[]> {
  const results = await bash(`groc search "${query}" --json`);
  const products = JSON.parse(results).products;
  
  return products.filter(product => {
    const name = product.name.toLowerCase();
    const desc = (product.description || '').toLowerCase();
    const text = `${name} ${desc}`;
    
    // Check excludes
    for (const exclude of prefs.excludes) {
      if (text.includes(exclude.toLowerCase())) {
        return false;
      }
    }
    
    // Check requirements
    for (const restriction of prefs.restrictions) {
      if (restriction === 'vegan' && (text.includes('dairy') || text.includes('egg') || text.includes('meat'))) {
        return false;
      }
      if (restriction === 'gluten-free' && text.includes('gluten')) {
        return false;
      }
      // Add more restrictions as needed
    }
    
    return true;
  });
}

// Usage
const preferences = {
  restrictions: ['vegan'],
  excludes: ['meat', 'dairy', 'egg']
};

const veganMilk = await filterByDiet('milk', preferences);
// Returns: oat milk, almond milk, soy milk (no dairy milk)
```

---

## Example 8: Price Alert System

**Scenario:** Agent monitors prices and alerts on deals

```typescript
interface PriceWatch {
  product: string;
  targetPrice: number;
  currentPrice: number;
  lastChecked: Date;
}

async function checkPriceAlerts(watches: PriceWatch[]) {
  const alerts = [];
  
  for (const watch of watches) {
    const results = await bash(`groc search "${watch.product}" --json`);
    const products = JSON.parse(results).products;
    
    if (products.length === 0) continue;
    
    const current = products[0];
    const newPrice = current.retail_price.price;
    const oldPrice = watch.currentPrice;
    
    // Update current price
    watch.currentPrice = newPrice;
    watch.lastChecked = new Date();
    
    // Check if target met
    if (newPrice <= watch.targetPrice) {
      alerts.push({
        product: watch.product,
        name: current.name,
        oldPrice,
        newPrice,
        savings: oldPrice - newPrice,
        percentOff: ((oldPrice - newPrice) / oldPrice) * 100
      });
    }
  }
  
  // Send alerts
  if (alerts.length > 0) {
    await say(`🔔 ${alerts.length} price alerts!\n`);
    
    for (const alert of alerts) {
      await say(
        `${alert.name}\n` +
        `Was £${alert.oldPrice} → Now £${alert.newPrice}\n` +
        `Save £${alert.savings.toFixed(2)} (${alert.percentOff.toFixed(0)}% off)`
      );
    }
  }
}

// Run daily
setInterval(() => checkPriceAlerts(watches), 24 * 60 * 60 * 1000);
```

---

## Example 9: Seasonal Meal Planning

**Scenario:** Agent suggests meals using seasonal UK produce

```typescript
const ukSeasonalProduce = {
  'January': ['kale', 'leeks', 'brussels sprouts', 'cabbage'],
  'February': ['kale', 'leeks', 'brussels sprouts', 'cabbage'],
  'March': ['kale', 'leeks', 'spring onions', 'cabbage'],
  'April': ['asparagus', 'spinach', 'radishes', 'spring onions'],
  'May': ['asparagus', 'spinach', 'radishes', 'lettuce'],
  'June': ['asparagus', 'spinach', 'strawberries', 'lettuce'],
  'July': ['tomatoes', 'courgettes', 'strawberries', 'corn'],
  'August': ['tomatoes', 'courgettes', 'blackberries', 'corn'],
  'September': ['tomatoes', 'courgettes', 'blackberries', 'apples'],
  'October': ['pumpkins', 'parsnips', 'beetroot', 'apples'],
  'November': ['pumpkins', 'parsnips', 'beetroot', 'sprouts'],
  'December': ['kale', 'leeks', 'brussels sprouts', 'parsnips']
};

async function planSeasonalMeals() {
  const month = new Date().toLocaleString('default', { month: 'long' });
  const seasonal = ukSeasonalProduce[month];
  
  await say(`In season for ${month}: ${seasonal.join(', ')}\n`);
  
  // Search for recipes featuring seasonal ingredients
  const meals = [
    { name: 'Seasonal Stir Fry', ingredients: seasonal.slice(0, 3) },
    { name: 'Roasted Seasonal Veg', ingredients: seasonal.slice(1, 4) },
    { name: 'Seasonal Soup', ingredients: [seasonal[0], 'stock', 'cream'] }
  ];
  
  await say('Suggested meals:\n');
  for (const meal of meals) {
    await say(`${meal.name}: ${meal.ingredients.join(', ')}`);
  }
  
  // Search and price
  const shoppingList = [...new Set(meals.flatMap(m => m.ingredients))];
  
  for (const item of shoppingList) {
    const results = await bash(`groc search "${item}" --json`);
    const products = JSON.parse(results).products;
    
    if (products.length > 0) {
      const product = products[0];
      await say(`${product.name} - £${product.retail_price.price}`);
    }
  }
}
```

---

## See Also

- [API Documentation](./API.md) - Complete API reference
- [Smart Shopping Guide](./SMART-SHOPPING.md) - Intelligent decision algorithms
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues
- [AGENTS.md](../AGENTS.md) - Integration patterns
