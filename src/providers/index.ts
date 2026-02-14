import { GroceryProvider } from './types';
import { SainsburysProvider } from './sainsburys';
import { OcadoProvider } from './ocado';

export * from './types';
export { SainsburysProvider } from './sainsburys';
export { OcadoProvider } from './ocado';

export type ProviderName = 'sainsburys' | 'ocado';

export class ProviderFactory {
  private static providers = new Map<ProviderName, () => GroceryProvider>([
    ['sainsburys', () => new SainsburysProvider()],
    ['ocado', () => new OcadoProvider()],
  ]);

  static create(name: ProviderName): GroceryProvider {
    const factory = this.providers.get(name);
    if (!factory) {
      throw new Error(`Unknown provider: ${name}. Available: ${Array.from(this.providers.keys()).join(', ')}`);
    }
    return factory();
  }

  static getAvailableProviders(): ProviderName[] {
    return Array.from(this.providers.keys());
  }

  static createAll(): GroceryProvider[] {
    return this.getAvailableProviders().map(name => this.create(name));
  }
}

// Helper function for comparison across providers
export async function compareProduct(query: string, providers?: ProviderName[]) {
  const providerList = providers || ProviderFactory.getAvailableProviders();
  const results = await Promise.all(
    providerList.map(async (providerName) => {
      try {
        const provider = ProviderFactory.create(providerName);
        const products = await provider.search(query, { limit: 5 });
        return { provider: providerName, products, error: null };
      } catch (error: any) {
        return { provider: providerName, products: [], error: error.message };
      }
    })
  );

  return results;
}
