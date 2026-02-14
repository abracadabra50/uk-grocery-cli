import { SainsburysAPI } from '../api/client';

export async function addCommand(api: SainsburysAPI, productId: string, quantity: number) {
  console.error(`🛒 Adding product ${productId} (qty: ${quantity})...`);
  
  try {
    const result = await api.addToBasket(productId, quantity);
    console.log('✅ Added to basket!');
    
    // Show updated basket
    const basket = await api.getBasket();
    if (basket.trolley?.trolley_details) {
      const trolley = basket.trolley.trolley_details;
      console.log(`\nBasket now has ${trolley.total_quantity || 0} items`);
      console.log(`Total: £${trolley.total_cost || 0}`);
    }
    
    return result;
  } catch (error: any) {
    console.error('❌ Failed to add to basket');
    console.error(error.message);
    throw error;
  }
}

export async function removeCommand(api: SainsburysAPI, itemId: string) {
  console.error(`🗑️  Removing item ${itemId}...`);
  
  try {
    await api.removeFromBasket(itemId);
    console.log('✅ Removed from basket!');
    
    // Show updated basket
    const basket = await api.getBasket();
    if (basket.trolley?.trolley_details) {
      const trolley = basket.trolley.trolley_details;
      console.log(`\nBasket now has ${trolley.total_quantity || 0} items`);
      console.log(`Total: £${trolley.total_cost || 0}`);
    }
  } catch (error: any) {
    console.error('❌ Failed to remove from basket');
    console.error(error.message);
    throw error;
  }
}

export async function updateCommand(api: SainsburysAPI, itemId: string, quantity: number) {
  console.error(`📝 Updating item ${itemId} to quantity ${quantity}...`);
  
  try {
    await api.updateBasketItem(itemId, quantity);
    console.log('✅ Updated!');
    
    // Show updated basket
    const basket = await api.getBasket();
    if (basket.trolley?.trolley_details) {
      const trolley = basket.trolley.trolley_details;
      console.log(`\nBasket now has ${trolley.total_quantity || 0} items`);
      console.log(`Total: £${trolley.total_cost || 0}`);
    }
  } catch (error: any) {
    console.error('❌ Failed to update basket');
    console.error(error.message);
    throw error;
  }
}

export async function clearCommand(api: SainsburysAPI) {
  console.error('🗑️  Clearing basket...');
  
  try {
    await api.clearBasket();
    console.log('✅ Basket cleared!');
  } catch (error: any) {
    console.error('❌ Failed to clear basket');
    console.error(error.message);
    throw error;
  }
}
