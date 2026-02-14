// Provider interface for grocery supermarkets

export interface Product {
  product_uid: string;
  name: string;
  description?: string;
  retail_price: {
    price: number;
  };
  unit_price?: {
    measure: string;
    price: number;
  };
  in_stock: boolean;
  image_url?: string;
  provider: string; // sainsburys, ocado, tesco, etc.
}

export interface BasketItem {
  item_id: string;
  product_uid: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Basket {
  items: BasketItem[];
  total_quantity: number;
  total_cost: number;
  provider: string;
}

export interface DeliverySlot {
  slot_id: string;
  start_time: string;
  end_time: string;
  date: string;
  price: number;
  available: boolean;
}

export interface Order {
  order_id: string;
  status: string;
  total: number;
  delivery_slot?: DeliverySlot;
  items: BasketItem[];
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  category?: string;
}

export interface GroceryProvider {
  readonly name: string; // sainsburys, ocado, etc.
  
  // Authentication
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  isAuthenticated(): Promise<boolean>;
  
  // Product search
  search(query: string, options?: SearchOptions): Promise<Product[]>;
  getProduct(productId: string): Promise<Product>;
  getCategories(): Promise<any>;
  
  // Basket operations
  getBasket(): Promise<Basket>;
  addToBasket(productId: string, quantity: number): Promise<void>;
  updateBasketItem(itemId: string, quantity: number): Promise<void>;
  removeFromBasket(itemId: string): Promise<void>;
  clearBasket(): Promise<void>;
  
  // Delivery & checkout
  getDeliverySlots(): Promise<DeliverySlot[]>;
  bookSlot(slotId: string): Promise<void>;
  checkout(): Promise<Order>;
  
  // Orders
  getOrders(): Promise<Order[]>;
}
