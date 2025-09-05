import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';
import { DataformModel, DataformConfig } from '../types';

export class SqlxParser {
  async parseProject(projectPath: string): Promise<Record<string, DataformModel>> {
    const definitionsPath = path.join(projectPath, 'definitions');
    const models: Record<string, DataformModel> = {};

    // Find all .sqlx files recursively
    const sqlxFiles = await glob('**/*.sqlx', {
      cwd: definitionsPath,
      absolute: true,
    });

    for (const filePath of sqlxFiles) {
      try {
        const model = await this.parseFile(filePath, definitionsPath);
        models[model.name] = model;
      } catch (error) {
        console.warn(`Warning: Failed to parse ${filePath}:`, error instanceof Error ? error.message : String(error));
      }
    }

    return models;
  }

  private async parseFile(filePath: string, definitionsPath: string): Promise<DataformModel> {
    const content = await fs.readFile(filePath, 'utf-8');
    const relativePath = path.relative(definitionsPath, filePath);
    const fileName = path.basename(filePath, '.sqlx');

    // Parse the different blocks
    const configBlock = this.extractConfigBlock(content);
    const jsBlock = this.extractJsBlock(content);
    const sqlContent = this.extractSqlContent(content);
    const dependencies = this.extractDependencies(content, jsBlock);

    // Parse config
    const config = this.parseConfig(configBlock);
    
    return {
      name: fileName,
      filePath: relativePath,
      type: config.type || 'table',
      schema: config.schema,
      tags: config.tags || [],
      description: config.description,
      config,
      jsBlock,
      sqlContent,
      dependencies,
      uniqueKey: config.uniqueKey,
    };
  }

  private extractConfigBlock(content: string): string {
    const configRegex = /config\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/s;
    const match = content.match(configRegex);
    return match ? match[1].trim() : '';
  }

  private extractJsBlock(content: string): string | undefined {
    const jsRegex = /js\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/s;
    const match = content.match(jsRegex);
    return match ? match[1].trim() : undefined;
  }

  private extractSqlContent(content: string): string {
    // Remove config and js blocks to get SQL content
    let sqlContent = content
      .replace(/config\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/s, '')
      .replace(/js\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/s, '')
      .trim();

    return sqlContent;
  }

  private extractDependencies(content: string, jsBlock?: string): string[] {
    const dependencies = new Set<string>();

    // Find ref() patterns in SQL
    const refRegex = /ref\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
    let match;
    
    while ((match = refRegex.exec(content)) !== null) {
      dependencies.add(match[1]);
    }

    // Find ${ref()} patterns in SQL
    const templateRefRegex = /\$\{\s*ref\(\s*['"`]([^'"`]+)['"`]\s*\)\s*\}/g;
    while ((match = templateRefRegex.exec(content)) !== null) {
      dependencies.add(match[1]);
    }

    // Also check JS block for dynamic references
    if (jsBlock) {
      const jsRefRegex = /ref\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
      while ((match = jsRefRegex.exec(jsBlock)) !== null) {
        dependencies.add(match[1]);
      }
    }

    return Array.from(dependencies);
  }

  private parseConfig(configBlock: string): DataformConfig {
    if (!configBlock) {
      return { type: 'table' };
    }

    try {
      // Use a more sophisticated parser that can handle JavaScript expressions
      const config = this.parseJavaScriptConfig(configBlock);
      return config;
    } catch (error) {
      console.warn('Failed to parse config block:', configBlock.substring(0, 100) + '...', 'Error:', error instanceof Error ? error.message : error);
      // Fallback to extracting basic fields
      return this.parseConfigFallback(configBlock);
    }
  }

  private parseJavaScriptConfig(configBlock: string): DataformConfig {
    // Remove comments (both // and /* */ styles)
    let cleanConfig = configBlock
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
      .replace(/\/\/.*$/gm, ''); // Remove // comments

    // Extract basic fields using regex patterns
    const config: Partial<DataformConfig> = {};

    // Extract type
    const typeMatch = cleanConfig.match(/type\s*:\s*["']([^"']+)["']/);
    if (typeMatch) {
      config.type = typeMatch[1] as DataformConfig['type'];
    }

    // Extract schema (handle template literals)
    const schemaMatch = cleanConfig.match(/schema\s*:\s*(?:["']([^"']+)["']|`([^`]+)`)/);
    if (schemaMatch) {
      const schema = schemaMatch[1] || schemaMatch[2];
      // Simplify template literals by removing ${...} expressions
      config.schema = schema.replace(/\$\{[^}]+\}/g, '').trim();
    }

    // Extract description
    const descMatch = cleanConfig.match(/description\s*:\s*["']([^"']*)["']/);
    if (descMatch) {
      config.description = descMatch[1];
    }

    // Extract tags array
    const tagsMatch = cleanConfig.match(/tags\s*:\s*\[([^\]]*)\]/);
    if (tagsMatch) {
      const tagString = tagsMatch[1];
      config.tags = tagString
        .split(',')
        .map(tag => tag.trim().replace(/["']/g, ''))
        .filter(tag => tag.length > 0);
    }

    // Extract uniqueKey
    const uniqueKeyMatch = cleanConfig.match(/uniqueKey\s*:\s*(?:\[([^\]]*)\]|["']([^"']+)["'])/);
    if (uniqueKeyMatch) {
      if (uniqueKeyMatch[1]) {
        // Array format
        config.uniqueKey = uniqueKeyMatch[1]
          .split(',')
          .map(key => key.trim().replace(/["']/g, ''));
      } else {
        // String format
        config.uniqueKey = uniqueKeyMatch[2];
      }
    }

    // Extract bigquery config (simplified)
    const bigqueryMatch = cleanConfig.match(/bigquery\s*:\s*\{([^}]*)\}/);
    if (bigqueryMatch) {
      const bigqueryContent = bigqueryMatch[1];
      const bigqueryConfig: Record<string, unknown> = {};
      
      // Extract partitionBy
      const partitionMatch = bigqueryContent.match(/partitionBy\s*:\s*["']([^"']+)["']/);
      if (partitionMatch) {
        bigqueryConfig.partitionBy = partitionMatch[1];
      }

      // Extract clusterBy
      const clusterMatch = bigqueryContent.match(/clusterBy\s*:\s*(?:\[([^\]]*)\]|["']([^"']+)["'])/);
      if (clusterMatch) {
        if (clusterMatch[1]) {
          bigqueryConfig.clusterBy = clusterMatch[1]
            .split(',')
            .map(key => key.trim().replace(/["']/g, ''));
        } else {
          bigqueryConfig.clusterBy = clusterMatch[2];
        }
      }

      config.bigquery = bigqueryConfig;
    }

    return {
      type: config.type || 'table',
      schema: config.schema,
      tags: config.tags || [],
      description: config.description,
      uniqueKey: config.uniqueKey,
      bigquery: config.bigquery,
      ...config
    };
  }

  private parseConfigFallback(configBlock: string): DataformConfig {
    // Very basic fallback parser for when sophisticated parsing fails
    const config: Partial<DataformConfig> = { type: 'table' };

    // Extract type with very basic regex
    const typeMatch = configBlock.match(/type.*?["'](\w+)["']/);
    if (typeMatch) {
      config.type = typeMatch[1] as DataformConfig['type'];
    }

    // Extract schema with basic regex
    const schemaMatch = configBlock.match(/schema.*?["']([^"']+)["']/);
    if (schemaMatch) {
      config.schema = schemaMatch[1];
    }

    // Extract description
    const descMatch = configBlock.match(/description.*?["']([^"']+)["']/);
    if (descMatch) {
      config.description = descMatch[1];
    }

    return {
      type: config.type || 'table',
      schema: config.schema,
      tags: [],
      description: config.description,
    };
  }
}