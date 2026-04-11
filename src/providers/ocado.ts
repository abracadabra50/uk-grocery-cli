import { GroceryProvider, Product, Basket, DeliverySlot, Order, SearchOptions } from './types';

// Ocado migrated to a client-side React SPA. The previous REST endpoints
// (`/api/search/v1/products`, `/api/trolley/v1/*`, `/api/slots/v1/*`, etc.)
// return 404 or HTML — they were never a stable public API. Until the
// provider is rebuilt against verified endpoints (or via a Playwright
// renderer), every method throws a clear, actionable error rather than
// pretending to work. Tracking issue: #5.
const OCADO_BROKEN_MESSAGE =
  'Ocado provider is currently disabled. The previous REST endpoints have ' +
  'been removed by Ocado and the provider needs to be rebuilt. ' +
  'See https://github.com/abracadabra50/uk-grocery-cli/issues/5 for status. ' +
  'Use --provider sainsburys or --provider tesco in the meantime.';

function ocadoBroken(): never {
  throw new Error(OCADO_BROKEN_MESSAGE);
}

export class OcadoProvider implements GroceryProvider {
  readonly name = 'ocado';

  async login(_email: string, _password: string): Promise<void> {
    ocadoBroken();
  }

  async logout(): Promise<void> {
    ocadoBroken();
  }

  async isAuthenticated(): Promise<boolean> {
    return false;
  }

  async search(_query: string, _options?: SearchOptions): Promise<Product[]> {
    ocadoBroken();
  }

  async getProduct(_productId: string): Promise<Product> {
    ocadoBroken();
  }

  async getCategories(): Promise<any> {
    ocadoBroken();
  }

  async getBasket(): Promise<Basket> {
    ocadoBroken();
  }

  async addToBasket(_productId: string, _quantity: number): Promise<void> {
    ocadoBroken();
  }

  async updateBasketItem(_itemId: string, _quantity: number): Promise<void> {
    ocadoBroken();
  }

  async removeFromBasket(_itemId: string): Promise<void> {
    ocadoBroken();
  }

  async clearBasket(): Promise<void> {
    ocadoBroken();
  }

  async getDeliverySlots(): Promise<DeliverySlot[]> {
    ocadoBroken();
  }

  async bookSlot(_slotId: string): Promise<void> {
    ocadoBroken();
  }

  async checkout(_dryRun?: boolean): Promise<Order> {
    ocadoBroken();
  }

  async getOrders(): Promise<Order[]> {
    ocadoBroken();
  }
}
