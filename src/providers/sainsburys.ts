import axios, { AxiosInstance } from 'axios';
import { GroceryProvider, Product, Basket, DeliverySlot, Order, SearchOptions, BasketItem } from './types';
import { login } from '../auth/login';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const API_BASE = 'https://www.sainsburys.co.uk/groceries-api/gol-services';
const SESSION_FILE = path.join(os.homedir(), '.sainsburys', 'session.json');

export class SainsburysProvider implements GroceryProvider {
  readonly name = 'sainsburys';
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
      }
    });

    // Load session if exists
    this.loadSession();
  }

  private loadSession() {
    try {
      if (fs.existsSync(SESSION_FILE)) {
        const session = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
        if (session.cookies) {
          // Handle both formats: array (from login.ts) or string (legacy)
          let cookieString: string;
          if (Array.isArray(session.cookies)) {
            // Convert cookie objects to header string
            cookieString = session.cookies.map((c: any) => `${c.name}=${c.value}`).join('; ');
            
            // Extract WC_AUTHENTICATION token for basket operations
            const authCookie = session.cookies.find((c: any) => c.name.startsWith('WC_AUTHENTICATION_'));
            if (authCookie) {
              this.client.defaults.headers.common['wcauthtoken'] = authCookie.value;
            }
          } else {
            // Already a string
            cookieString = session.cookies;
          }
          this.client.defaults.headers.common['Cookie'] = cookieString;
        }
      }
    } catch (error) {
      // Ignore session load errors
    }
  }

  private saveSession(cookies: string) {
    const dir = path.dirname(SESSION_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SESSION_FILE, JSON.stringify({ cookies, savedAt: new Date().toISOString() }));
  }

  async login(email: string, password: string): Promise<void> {
    const sessionData = await login(email, password);
    // Convert cookie objects to cookie header string
    const cookieString = sessionData.cookies.map((c: any) => `${c.name}=${c.value}`).join('; ');
    
    // Extract WC_AUTHENTICATION token for basket operations
    const authCookie = sessionData.cookies.find((c: any) => c.name.startsWith('WC_AUTHENTICATION_'));
    if (authCookie) {
      this.client.defaults.headers.common['wcauthtoken'] = authCookie.value;
    }
    
    // Don't call saveSession - login() already saved the full session data
    // Just set the cookie header for API requests
    this.client.defaults.headers.common['Cookie'] = cookieString;
  }

  async logout(): Promise<void> {
    if (fs.existsSync(SESSION_FILE)) {
      fs.unlinkSync(SESSION_FILE);
    }
    delete this.client.defaults.headers.common['Cookie'];
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      await this.getBasket();
      return true;
    } catch {
      return false;
    }
  }

  async search(query: string, options?: SearchOptions): Promise<Product[]> {
    const params: any = {
      'filter[keyword]': query,
      page_number: options?.offset ? Math.floor(options.offset / (options.limit || 24)) + 1 : 1,
      page_size: options?.limit || 24,
      sort_order: 'FAVOURITES_FIRST'
    };

    const response = await this.client.get('/product/v1/product', { params });
    
    return response.data.products.map((p: any) => ({
      product_uid: p.product_uid,
      name: p.name,
      description: p.description,
      retail_price: p.retail_price,
      unit_price: p.unit_price,
      in_stock: p.in_stock !== false,
      image_url: p.image,
      provider: this.name
    }));
  }

  async getProduct(productId: string): Promise<Product> {
    const response = await this.client.get(`/product/v1/product/${productId}`);
    const p = response.data;
    return {
      product_uid: p.product_uid,
      name: p.name,
      description: p.description,
      retail_price: p.retail_price,
      unit_price: p.unit_price,
      in_stock: p.in_stock !== false,
      image_url: p.image,
      provider: this.name
    };
  }

  async getCategories(): Promise<any> {
    const response = await this.client.get('/product/categories/tree');
    return response.data;
  }

  async getBasket(): Promise<Basket> {
    const pickTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const response = await this.client.get('/basket/v2/basket', {
      params: {
        pick_time: pickTime,
        store_number: '0560',
        slot_booked: 'false'
      }
    });
    const data = response.data;
    
    return {
      items: data.items?.map((item: any) => ({
        item_id: item.item_uid,
        product_uid: item.product?.sku,
        name: item.product?.name,
        quantity: item.quantity,
        unit_price: parseFloat(item.subtotal_price) / item.quantity,
        total_price: parseFloat(item.subtotal_price || 0)
      })) || [],
      total_quantity: data.item_count || 0,
      total_cost: parseFloat(data.total_price || 0),
      provider: this.name
    };
  }

  async addToBasket(productId: string, quantity: number): Promise<void> {
    // Generate pick_time (tomorrow at current time)
    const pickTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    await this.client.post('/basket/v2/basket/item', {
      product_uid: productId,
      quantity,
      uom: 'ea',  // unit of measure: 'ea' for each
      selected_catchweight: ''
    }, {
      params: {
        pick_time: pickTime,
        store_number: '0560',  // default store
        slot_booked: 'false'
      }
    });
  }

  async updateBasketItem(itemId: string, quantity: number): Promise<void> {
    const pickTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    // Get current basket to find the item
    const basket = await this.getBasket();
    const item = basket.items.find(i => i.item_id === itemId);
    
    if (!item) {
      throw new Error(`Item ${itemId} not found in basket`);
    }
    
    // Update using PUT with items array
    await this.client.put('/basket/v2/basket', {
      items: [{
        product_uid: item.product_uid,
        quantity,
        uom: 'ea',
        selected_catchweight: '',
        item_uid: itemId,
        decreasing_quantity: quantity < item.quantity
      }]
    }, {
      params: {
        pick_time: pickTime,
        store_number: '0560',
        slot_booked: 'false'
      }
    });
  }

  async removeFromBasket(itemId: string): Promise<void> {
    // Remove by updating to quantity 0
    await this.updateBasketItem(itemId, 0);
  }

  async clearBasket(): Promise<void> {
    const basket = await this.getBasket();
    for (const item of basket.items) {
      await this.removeFromBasket(item.item_id);
    }
  }

  async getDeliverySlots(): Promise<DeliverySlot[]> {
    // Check reservation status first
    const reservationResponse = await this.client.get('/slot/v1/slot/reservation');
    const reservation = reservationResponse.data;
    
    console.log('Reservation status:', JSON.stringify(reservation, null, 2));
    
    // Get delivery information (minimum spend, etc.)
    const deliveryInfoResponse = await this.client.get('/slot/v1/slot/delivery-information');
    console.log('Delivery info:', JSON.stringify(deliveryInfoResponse.data, null, 2));
    
    // TODO: The actual slots list endpoint has not been discovered yet
    // The slots may be embedded in the page or require a different API call
    // For now, return empty array with helpful error
    console.warn('⚠️ Slots listing endpoint not yet discovered');
    console.warn('Postcode:', reservation.postcode);
    console.warn('Store:', reservation.store_identifier);
    console.warn('Region:', reservation.region);
    
    return [];
  }

  async bookSlot(slotId: string): Promise<void> {
    await this.client.post('/slot/v1/slot/reservation', {
      slot_id: slotId
    });
  }

  async checkout(): Promise<Order> {
    // NOTE: Direct API calls to checkout endpoint return "Access Denied"
    // Checkout likely requires browser context (referer/origin headers)
    // or must be called from the web app flow
    // TODO: Implement via Playwright browser automation
    throw new Error('Checkout endpoint requires browser automation - not yet implemented');
    
    const response = await this.client.post('/checkout/v1/checkout');
    return {
      order_id: response.data.order_id || 'unknown',
      status: response.data.status || 'placed',
      total: parseFloat(response.data.total || 0),
      items: []
    };
  }

  async getOrders(): Promise<Order[]> {
    try {
      // Try common order history endpoints
      const endpoints = [
        '/order/v1/orders',
        '/order/v1/history', 
        '/orders/v1/history',
        '/customer/v1/orders'
      ];
      
      for (const endpoint of endpoints) {
        try {
          const response = await this.client.get(endpoint);
          if (response.data && (response.data.orders || response.data.order_history)) {
            const orders = response.data.orders || response.data.order_history || [];
            return orders.map((o: any) => ({
              order_id: o.order_id || o.order_number || o.id,
              status: o.status || o.order_status || 'unknown',
              total: parseFloat(o.total || o.total_cost || o.order_total || 0),
              delivery_slot: o.delivery_slot ? {
                slot_id: o.delivery_slot.slot_id || '',
                start_time: o.delivery_slot.start_time || '',
                end_time: o.delivery_slot.end_time || '',
                date: o.delivery_slot.date || '',
                price: parseFloat(o.delivery_slot.price || 0),
                available: true
              } : undefined,
              items: o.items || []
            }));
          }
        } catch (e) {
          continue;
        }
      }
      
      return [];
    } catch (error: any) {
      return [];
    }
  }
}
