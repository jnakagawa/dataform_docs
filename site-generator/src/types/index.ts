// Mirror the types from the main package
export interface DataformConfig {
  type: 'table' | 'view' | 'incremental' | 'assertion' | 'operation' | 'declaration';
  schema?: string;
  tags?: string[];
  description?: string;
  uniqueKey?: string | string[];
  partitionBy?: string;
  clusterBy?: string | string[];
  assertions?: Record<string, unknown>;
  bigquery?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface DataformModel {
  name: string;
  filePath: string;
  type: DataformConfig['type'];
  schema?: string;
  tags: string[];
  description?: string;
  config: DataformConfig;
  jsBlock?: string;
  sqlContent: string;
  dependencies: string[];
  uniqueKey?: string | string[];
}

export interface DependencyGraph {
  nodes: Array<{
    id: string;
    model: DataformModel;
  }>;
  edges: Array<{
    source: string;
    target: string;
  }>;
}

export interface Manifest {
  models: Record<string, DataformModel>;
  dependencyGraph: DependencyGraph;
  metadata: {
    generatedAt: string;
    version: string;
    projectPath: string;
  };
}

export interface Catalog {
  models: Record<string, {
    columns?: Record<string, {
      type: string;
      description?: string;
    }>;
    stats?: {
      rowCount?: number;
      byteSize?: number;
      lastModified?: string;
    };
  }>;
}