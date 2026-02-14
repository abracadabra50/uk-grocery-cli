import axios, { AxiosInstance } from 'axios';

const BASE_URL = 'https://www.sainsburys.co.uk';
const API_BASE = '/groceries-api/gol-services';

export class SainsburysAPI {
  private client: AxiosInstance;
  
  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Referer': 'https://www.sainsburys.co.uk/shop/gb/groceries'
      }
    });
  }
  
  // Categories
  async getCategories() {
    const response = await this.client.get(`${API_BASE}/product/categories/tree`);
    return response.data;
  }
  
  async getTaxonomy() {
    const response = await this.client.get(`${API_BASE}/product/v1/product/taxonomy`);
    return response.data;
  }
  
  async getMeganav() {
    const response = await this.client.get(`${API_BASE}/product/v1/product/meganav`);
    return response.data;
  }
  
  // Product Search
  async searchProducts(query: string, page: number = 1, pageSize: number = 24) {
    const params = new URLSearchParams({
      'filter[keyword]': query,
      'page_number': page.toString(),
      'page_size': pageSize.toString(),
      'include': 'facets'
    });
    
    const response = await this.client.get(
      `${API_BASE}/product/v1/product?${params.toString()}`
    );
    return response.data;
  }
  
  // Browse category
  async browseCategory(categoryId: string, page: number = 1, pageSize: number = 24) {
    const params = new URLSearchParams({
      'filter[keyword]': '',
      'filter[category]': categoryId,
      'page_number': page.toString(),
      'page_size': pageSize.toString(),
      'include': 'facets'
    });
    
    const response = await this.client.get(
      `${API_BASE}/product/v1/product?${params.toString()}`
    );
    return response.data;
  }
  
  // Get product details
  async getProduct(productId: string) {
    const response = await this.client.get(
      `${API_BASE}/product/v1/product/${productId}`
    );
    return response.data;
  }
  
  // Basket operations
  async getBasket(pickTime?: string) {
    const params = pickTime ? `?pick_time=${pickTime}` : '';
    const response = await this.client.get(
      `${API_BASE}/basket/v2/basket${params}`
    );
    return response.data;
  }
  
  // Add to basket
  async addToBasket(productId: string, quantity: number = 1) {
    // Based on common patterns, this should be:
    // POST /groceries-api/gol-services/basket/v2/basket/items
    try {
      const response = await this.client.post(
        `${API_BASE}/basket/v2/basket/items`,
        {
          product_uid: productId,
          quantity: quantity
        }
      );
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(`Add to basket failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }
  
  // Update basket item quantity
  async updateBasketItem(itemId: string, quantity: number) {
    try {
      const response = await this.client.patch(
        `${API_BASE}/basket/v2/basket/items/${itemId}`,
        {
          quantity: quantity
        }
      );
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(`Update failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }
  
  // Remove from basket
  async removeFromBasket(itemId: string) {
    try {
      const response = await this.client.delete(
        `${API_BASE}/basket/v2/basket/items/${itemId}`
      );
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(`Remove failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }
  
  // Clear basket
  async clearBasket() {
    try {
      const response = await this.client.delete(
        `${API_BASE}/basket/v2/basket`
      );
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(`Clear basket failed: ${error.response.status}`);
      }
      throw error;
    }
  }
  
  // Delivery slots
  async getSlotReservation() {
    const response = await this.client.get(
      `${API_BASE}/slot/v1/slot/reservation`
    );
    return response.data;
  }
  
  async getSlots(startDate?: string, endDate?: string) {
    let url = `${API_BASE}/slot/v1/slots`;
    if (startDate && endDate) {
      url += `?start_date=${startDate}&end_date=${endDate}`;
    }
    const response = await this.client.get(url);
    return response.data;
  }
  
  async reserveSlot(slotId: string) {
    try {
      const response = await this.client.post(
        `${API_BASE}/slot/v1/slot/reservation`,
        {
          slot_id: slotId
        }
      );
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(`Reserve slot failed: ${error.response.status}`);
      }
      throw error;
    }
  }
  
  // Checkout
  async checkout() {
    try {
      const response = await this.client.post(
        `${API_BASE}/checkout/v1/checkout`
      );
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(`Checkout failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }
  
  // Orders
  async getOrders() {
    const response = await this.client.get(
      `${API_BASE}/order/v1/orders`
    );
    return response.data;
  }
  
  async getOrder(orderId: string) {
    const response = await this.client.get(
      `${API_BASE}/order/v1/orders/${orderId}`
    );
    return response.data;
  }
  
  // Set auth cookies (for logged-in operations)
  setAuthCookies(cookies: string) {
    this.client.defaults.headers.common['Cookie'] = cookies;
  }
}
