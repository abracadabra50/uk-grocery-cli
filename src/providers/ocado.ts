import axios, { AxiosInstance } from 'axios';
import { GroceryProvider, Product, Basket, DeliverySlot, Order, SearchOptions, BasketItem } from './types';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const API_BASE = 'https://www.ocado.com/api';
const SESSION_FILE = path.join(os.homedir(), '.ocado', 'session.json');

export class OcadoProvider implements GroceryProvider {
  readonly name = 'ocado';
  private client: AxiosInstance;
  private regionId: string = '9138094d-f307-46aa-a62d-86c8bdaeb4b9'; // Default region

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
          this.client.defaults.headers.common['Cookie'] = session.cookies;
        }
        if (session.regionId) {
          this.regionId = session.regionId;
        }
      }
    } catch (error) {
      // Ignore session load errors
    }
  }

  private saveSession(cookies: string, regionId?: string) {
    const dir = path.dirname(SESSION_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SESSION_FILE, JSON.stringify({ 
      cookies, 
      regionId: regionId || this.regionId,
      savedAt: new Date().toISOString() 
    }));
  }

  async login(email: string, password: string): Promise<void> {
    // Ocado login would use Playwright similar to Sainsbury's
    // For now, this is a placeholder - needs implementation
    throw new Error('Ocado login not yet implemented. Use browser session export.');
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
    // Ocado search endpoint
    const params: any = {
      searchTerm: query,
      limit: options?.limit || 24,
      regionId: this.regionId
    };

    try {
      const response = await this.client.get('/search/v1/products', { params });
      
      // Map Ocado's response format to our common format
      return response.data.results?.map((p: any) => ({
        product_uid: p.id || p.sku,
        name: p.title || p.name,
        description: p.description,
        retail_price: {
          price: parseFloat(p.price || p.currentPrice || 0)
        },
        unit_price: p.unitPrice ? {
          measure: p.unitPrice.measure,
          price: parseFloat(p.unitPrice.price)
        } : undefined,
        in_stock: p.available !== false && p.inStock !== false,
        image_url: p.imageUrl || p.image,
        provider: this.name
      })) || [];
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Try alternative search endpoint
        return this.searchAlternative(query, options);
      }
      throw error;
    }
  }

  private async searchAlternative(query: string, options?: SearchOptions): Promise<Product[]> {
    // Alternative search using suggestions endpoint
    const params: any = {
      searchTerm: query,
      limit: options?.limit || 20000,
      regionId: this.regionId
    };

    const response = await this.client.get('/search/v1/suggestions/primary', { params });
    
    return response.data.products?.slice(0, options?.limit || 24).map((p: any) => ({
      product_uid: p.id,
      name: p.name,
      description: p.description,
      retail_price: {
        price: parseFloat(p.price || 0)
      },
      in_stock: true,
      provider: this.name
    })) || [];
  }

  async getProduct(productId: string): Promise<Product> {
    const response = await this.client.get(`/products/v1/${productId}`);
    const p = response.data;
    
    return {
      product_uid: p.id,
      name: p.title || p.name,
      description: p.description,
      retail_price: {
        price: parseFloat(p.price || 0)
      },
      unit_price: p.unitPrice ? {
        measure: p.unitPrice.measure,
        price: parseFloat(p.unitPrice.price)
      } : undefined,
      in_stock: p.available !== false,
      image_url: p.imageUrl,
      provider: this.name
    };
  }

  async getCategories(): Promise<any> {
    const response = await this.client.get('/categories/v1/tree');
    return response.data;
  }

  async getBasket(): Promise<Basket> {
    // Ocado basket/trolley endpoint
    const response = await this.client.get('/trolley/v1/basket');
    const data = response.data;
    
    return {
      items: data.items?.map((p: any) => ({
        item_id: p.id || p.lineId,
        product_uid: p.productId || p.sku,
        name: p.title || p.name,
        quantity: p.quantity,
        unit_price: parseFloat(p.unitPrice || p.price || 0),
        total_price: parseFloat(p.total || (p.quantity * (p.unitPrice || p.price)) || 0)
      })) || [],
      total_quantity: data.totalQuantity || data.items?.reduce((sum: number, i: any) => sum + i.quantity, 0) || 0,
      total_cost: parseFloat(data.total || data.totalCost || 0),
      provider: this.name
    };
  }

  async addToBasket(productId: string, quantity: number): Promise<void> {
    await this.client.post('/trolley/v1/items', {
      productId,
      quantity
    });
  }

  async updateBasketItem(itemId: string, quantity: number): Promise<void> {
    await this.client.put(`/trolley/v1/items/${itemId}`, { quantity });
  }

  async removeFromBasket(itemId: string): Promise<void> {
    await this.client.delete(`/trolley/v1/items/${itemId}`);
  }

  async clearBasket(): Promise<void> {
    const basket = await this.getBasket();
    for (const item of basket.items) {
      await this.removeFromBasket(item.item_id);
    }
  }

  async getDeliverySlots(): Promise<DeliverySlot[]> {
    const response = await this.client.get('/slots/v1/available');
    
    return response.data.slots?.map((s: any) => ({
      slot_id: s.id || s.slotId,
      start_time: s.startTime || s.start,
      end_time: s.endTime || s.end,
      date: s.date,
      price: parseFloat(s.price || s.deliveryCharge || 0),
      available: s.available !== false
    })) || [];
  }

  async bookSlot(slotId: string): Promise<void> {
    await this.client.post('/slots/v1/book', {
      slotId
    });
  }

  async checkout(): Promise<Order> {
    const response = await this.client.post('/checkout/v1/place-order');
    
    return {
      order_id: response.data.orderId || response.data.id || 'unknown',
      status: response.data.status || 'placed',
      total: parseFloat(response.data.total || 0),
      items: []
    };
  }

  async getOrders(): Promise<Order[]> {
    try {
      const endpoints = [
        '/orders/v1/history',
        '/order/v1/orders',
        '/customer/v1/orders'
      ];
      
      for (const endpoint of endpoints) {
        try {
          const response = await this.client.get(endpoint);
          if (response.data && (response.data.orders || response.data.orderHistory)) {
            const orders = response.data.orders || response.data.orderHistory || [];
            return orders.map((o: any) => ({
              order_id: o.id || o.orderId || o.orderNumber,
              status: o.status || o.orderStatus || 'unknown',
              total: parseFloat(o.total || o.totalAmount || 0),
              delivery_slot: o.deliverySlot ? {
                slot_id: o.deliverySlot.id || '',
                start_time: o.deliverySlot.startTime || '',
                end_time: o.deliverySlot.endTime || '',
                date: o.deliverySlot.date || '',
                price: parseFloat(o.deliverySlot.price || 0),
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
