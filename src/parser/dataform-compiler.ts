import { exec } from 'child_process';
import { promisify } from 'util';
import { DataformModel, DataformConfig } from '../types';

const execAsync = promisify(exec);

interface DataformCompiledTable {
  type: string;
  target: {
    schema: string;
    name: string;
    database?: string;
  };
  query?: string;
  fileName: string;
  disabled?: boolean;
  bigquery?: {
    partitionBy?: string;
    clusterBy?: string | string[];
    updatePartitionFilter?: string;
  };
  tags?: string[];
  actionDescriptor?: {
    description?: string;
    columns?: Array<{
      description?: string;
      path: string[];
    }>;
  };
  dependencyTargets?: Array<{
    schema: string;
    name: string;
    database?: string;
  }>;
  uniqueKey?: string[];
}

interface DataformCompiledOutput {
  tables: DataformCompiledTable[];
  declarations: DataformCompiledTable[];
  assertions: DataformCompiledTable[];
  operations: DataformCompiledTable[];
}

export class DataformCompiler {
  private catalogInfo: Record<string, { columns?: Record<string, { type: string; description?: string; }> }> = {};

  async compileProject(projectPath: string): Promise<Record<string, DataformModel>> {
    try {
      console.log('Using Dataform CLI to compile project...');
      
      const { stdout } = await execAsync('dataform compile --json', {
        cwd: projectPath,
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large projects
      });

      const compiled: DataformCompiledOutput = JSON.parse(stdout);
      
      const models: Record<string, DataformModel> = {};

      // Process all table types
      const allTables = [
        ...compiled.tables || [],
        ...compiled.declarations || [],
        ...compiled.assertions || [],
        ...compiled.operations || [],
      ];

      for (const table of allTables) {
        const model = this.convertCompiledTableToModel(table);
        models[model.name] = model;
        
        // Extract column information for catalog
        this.extractColumnInfo(table);
      }

      return models;
    } catch (error) {
      console.error('Failed to compile Dataform project:', error);
      throw error;
    }
  }

  private convertCompiledTableToModel(table: DataformCompiledTable): DataformModel {
    // Extract dependencies from the compiled output
    const dependencies = this.extractDependencies(table);

    // Create config object from compiled metadata
    const config: DataformConfig = {
      type: this.mapType(table.type),
      schema: table.target.schema,
      tags: table.tags || [],
      description: table.actionDescriptor?.description,
      uniqueKey: table.uniqueKey || undefined,
      bigquery: table.bigquery,
    };

    return {
      name: table.target.name,
      filePath: table.fileName.replace('definitions/', ''),
      type: config.type,
      schema: table.target.schema,
      tags: config.tags || [],
      description: config.description,
      config,
      sqlContent: table.query || '',
      dependencies,
      uniqueKey: table.uniqueKey || undefined,
    };
  }

  private mapType(dataformType: string): DataformConfig['type'] {
    switch (dataformType) {
      case 'table':
        return 'table';
      case 'view':
        return 'view';
      case 'incremental':
        return 'incremental';
      case 'assertion':
        return 'assertion';
      case 'operations':
        return 'operation';
      case 'declaration':
        return 'declaration';
      default:
        return 'table';
    }
  }

  private extractDependencies(table: DataformCompiledTable): string[] {
    // Dataform provides dependency information in dependencyTargets
    if (table.dependencyTargets) {
      return table.dependencyTargets.map(dep => dep.name);
    }

    // Fallback: extract from SQL query using ref patterns
    if (table.query) {
      return this.extractDependenciesFromSQL(table.query);
    }

    return [];
  }

  private extractDependenciesFromSQL(sql: string): string[] {
    const dependencies = new Set<string>();

    // Match table references like `database.schema.table_name`
    const tableRefPattern = /`[^`]*\.([^`.]+)`/g;
    let match;
    
    while ((match = tableRefPattern.exec(sql)) !== null) {
      const tableName = match[1];
      // Filter out system tables and functions
      if (!tableName.startsWith('INFORMATION_SCHEMA') && 
          !tableName.includes('(') && 
          tableName.length > 0) {
        dependencies.add(tableName);
      }
    }

    return Array.from(dependencies);
  }


  /**
   * Get Dataform project info
   */
  async getProjectInfo(projectPath: string): Promise<{ hasWorkflowSettings: boolean; database?: string; defaultSchema?: string }> {
    try {
      const { stdout: lsOutput } = await execAsync('ls workflow_settings.yaml', { cwd: projectPath });
      const hasWorkflowSettings = lsOutput.includes('workflow_settings.yaml');

      // Try to extract basic info from workflow settings
      let database: string | undefined;
      let defaultSchema: string | undefined;

      if (hasWorkflowSettings) {
        try {
          const { stdout: catOutput } = await execAsync('cat workflow_settings.yaml', { cwd: projectPath });
          const databaseMatch = catOutput.match(/defaultDatabase:\s*([^\s]+)/);
          const schemaMatch = catOutput.match(/defaultSchema:\s*([^\s]+)/);
          
          if (databaseMatch) database = databaseMatch[1];
          if (schemaMatch) defaultSchema = schemaMatch[1];
        } catch {
          // Ignore errors reading workflow settings
        }
      }

      return { hasWorkflowSettings, database, defaultSchema };
    } catch {
      return { hasWorkflowSettings: false };
    }
  }

  /**
   * Extract column information from compiled table for catalog
   */
  private extractColumnInfo(table: DataformCompiledTable): void {
    const modelName = table.target.name;
    
    if (table.actionDescriptor?.columns && table.actionDescriptor.columns.length > 0) {
      const columns: Record<string, { type: string; description?: string; }> = {};
      
      table.actionDescriptor.columns.forEach(column => {
        // Extract column name from path (usually just the last element)
        const columnName = column.path[column.path.length - 1];
        if (columnName) {
          columns[columnName] = {
            type: 'STRING', // Default type, could be enhanced to extract from SQL
            description: column.description,
          };
        }
      });
      
      if (Object.keys(columns).length > 0) {
        this.catalogInfo[modelName] = { columns };
      }
    }
  }

  /**
   * Get the catalog information (call after compileProject)
   */
  getCatalog(): { models: Record<string, { columns?: Record<string, { type: string; description?: string; }> }> } {
    return {
      models: { ...this.catalogInfo }
    };
  }

  /**
   * Clear catalog info (useful for fresh compilation)
   */
  clearCatalog(): void {
    this.catalogInfo = {};
  }
}