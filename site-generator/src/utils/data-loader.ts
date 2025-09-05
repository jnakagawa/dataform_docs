import { Manifest, Catalog } from '../types';

export class DataLoader {
  private manifest: Manifest | null = null;
  private catalog: Catalog | null = null;

  async loadManifest(): Promise<Manifest> {
    if (this.manifest) {
      return this.manifest;
    }

    try {
      const response = await fetch('./manifest.json');
      if (!response.ok) {
        throw new Error(`Failed to load manifest: ${response.statusText}`);
      }
      this.manifest = await response.json();
      return this.manifest!;
    } catch (error) {
      console.error('Error loading manifest:', error);
      throw error;
    }
  }

  async loadCatalog(): Promise<Catalog> {
    if (this.catalog) {
      return this.catalog;
    }

    try {
      const response = await fetch('./catalog.json');
      if (!response.ok) {
        throw new Error(`Failed to load catalog: ${response.statusText}`);
      }
      this.catalog = await response.json();
      return this.catalog!;
    } catch (error) {
      console.warn('Catalog not available:', error);
      // Return empty catalog if not available
      this.catalog = { models: {} };
      return this.catalog!;
    }
  }

  async loadData(): Promise<{ manifest: Manifest; catalog: Catalog }> {
    const [manifest, catalog] = await Promise.all([
      this.loadManifest(),
      this.loadCatalog(),
    ]);

    return { manifest, catalog };
  }

  getModelsByType(manifest: Manifest, type?: string): string[] {
    if (!type) {
      return Object.keys(manifest.models);
    }
    
    return Object.values(manifest.models)
      .filter(model => model.type === type)
      .map(model => model.name);
  }

  getModelsByTag(manifest: Manifest, tag: string): string[] {
    return Object.values(manifest.models)
      .filter(model => model.tags.includes(tag))
      .map(model => model.name);
  }

  getAllTags(manifest: Manifest): string[] {
    const tags = new Set<string>();
    Object.values(manifest.models).forEach(model => {
      model.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }

  getModelStats(manifest: Manifest) {
    const models = Object.values(manifest.models);
    const typeCount = models.reduce((acc, model) => {
      acc[model.type] = (acc[model.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalModels: models.length,
      modelsByType: typeCount,
      totalDependencies: manifest.dependencyGraph.edges.length,
      uniqueTags: this.getAllTags(manifest).length,
    };
  }
}