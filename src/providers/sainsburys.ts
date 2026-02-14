import axios, { AxiosInstance } from 'axios';
import { GroceryProvider, Product, Basket, DeliverySlot, Order, SearchOptions, BasketItem } from './types';
import { loginToSainsburys } from '../auth/login';
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
          this.client.defaults.headers.common['Cookie'] = session.cookies;
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
    const cookies = await loginToSainsburys(email, password);
    this.saveSession(cookies);
    this.client.defaults.headers.common['Cookie'] = cookies;
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
    const response = await this.client.get('/basket/v2/basket');
    const data = response.data.trolley;
    
    return {
      items: data.products?.map((p: any) => ({
        item_id: p.line_number,
        product_uid: p.product_uid,
        name: p.name,
        quantity: p.quantity,
        unit_price: parseFloat(p.unit_price?.price || 0),
        total_price: parseFloat(p.total_price?.price || 0)
      })) || [],
      total_quantity: data.total_quantity || 0,
      total_cost: parseFloat(data.trolley_details?.total_cost || 0),
      provider: this.name
    };
  }

  async addToBasket(productId: string, quantity: number): Promise<void> {
    await this.client.post('/basket/v2/basket/items', {
      product_uid: productId,
      quantity
    });
  }

  async updateBasketItem(itemId: string, quantity: number): Promise<void> {
    await this.client.put(`/basket/v2/basket/items/${itemId}`, { quantity });
  }

  async removeFromBasket(itemId: string): Promise<void> {
    await this.client.delete(`/basket/v2/basket/items/${itemId}`);
  }

  async clearBasket(): Promise<void> {
    const basket = await this.getBasket();
    for (const item of basket.items) {
      await this.removeFromBasket(item.item_id);
    }
  }

  async getDeliverySlots(): Promise<DeliverySlot[]> {
    const response = await this.client.get('/slot/v1/slot/reservation');
    return response.data.slots?.map((s: any) => ({
      slot_id: s.slot_id,
      start_time: s.start_time,
      end_time: s.end_time,
      date: s.date,
      price: parseFloat(s.price || 0),
      available: s.available !== false
    })) || [];
  }

  async bookSlot(slotId: string): Promise<void> {
    await this.client.post('/slot/v1/slot/reservation', {
      slot_id: slotId
    });
  }

  async checkout(): Promise<Order> {
    const response = await this.client.post('/checkout/v1/checkout');
    return {
      order_id: response.data.order_id || 'unknown',
      status: response.data.status || 'placed',
      total: parseFloat(response.data.total || 0),
      items: []
    };
  }

  async getOrders(): Promise<Order[]> {
    // Sainsbury's order history endpoint would go here
    // Not implemented in initial version
    return [];
  }
}
