"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqlxParser = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const glob_1 = require("glob");
class SqlxParser {
    async parseProject(projectPath) {
        const definitionsPath = path_1.default.join(projectPath, 'definitions');
        const models = {};
        // Find all .sqlx files recursively
        const sqlxFiles = await (0, glob_1.glob)('**/*.sqlx', {
            cwd: definitionsPath,
            absolute: true,
        });
        for (const filePath of sqlxFiles) {
            try {
                const model = await this.parseFile(filePath, definitionsPath);
                models[model.name] = model;
            }
            catch (error) {
                console.warn(`Warning: Failed to parse ${filePath}:`, error instanceof Error ? error.message : String(error));
            }
        }
        return models;
    }
    async parseFile(filePath, definitionsPath) {
        const content = await fs_1.promises.readFile(filePath, 'utf-8');
        const relativePath = path_1.default.relative(definitionsPath, filePath);
        const fileName = path_1.default.basename(filePath, '.sqlx');
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
    extractConfigBlock(content) {
        const configRegex = /config\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/s;
        const match = content.match(configRegex);
        return match ? match[1].trim() : '';
    }
    extractJsBlock(content) {
        const jsRegex = /js\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/s;
        const match = content.match(jsRegex);
        return match ? match[1].trim() : undefined;
    }
    extractSqlContent(content) {
        // Remove config and js blocks to get SQL content
        let sqlContent = content
            .replace(/config\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/s, '')
            .replace(/js\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/s, '')
            .trim();
        return sqlContent;
    }
    extractDependencies(content, jsBlock) {
        const dependencies = new Set();
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
    parseConfig(configBlock) {
        if (!configBlock) {
            return { type: 'table' };
        }
        try {
            // Use a more sophisticated parser that can handle JavaScript expressions
            const config = this.parseJavaScriptConfig(configBlock);
            return config;
        }
        catch (error) {
            console.warn('Failed to parse config block:', configBlock.substring(0, 100) + '...', 'Error:', error instanceof Error ? error.message : error);
            // Fallback to extracting basic fields
            return this.parseConfigFallback(configBlock);
        }
    }
    parseJavaScriptConfig(configBlock) {
        // Remove comments (both // and /* */ styles)
        let cleanConfig = configBlock
            .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
            .replace(/\/\/.*$/gm, ''); // Remove // comments
        // Extract basic fields using regex patterns
        const config = {};
        // Extract type
        const typeMatch = cleanConfig.match(/type\s*:\s*["']([^"']+)["']/);
        if (typeMatch) {
            config.type = typeMatch[1];
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
            }
            else {
                // String format
                config.uniqueKey = uniqueKeyMatch[2];
            }
        }
        // Extract bigquery config (simplified)
        const bigqueryMatch = cleanConfig.match(/bigquery\s*:\s*\{([^}]*)\}/);
        if (bigqueryMatch) {
            const bigqueryContent = bigqueryMatch[1];
            const bigqueryConfig = {};
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
                }
                else {
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
    parseConfigFallback(configBlock) {
        // Very basic fallback parser for when sophisticated parsing fails
        const config = { type: 'table' };
        // Extract type with very basic regex
        const typeMatch = configBlock.match(/type.*?["'](\w+)["']/);
        if (typeMatch) {
            config.type = typeMatch[1];
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
exports.SqlxParser = SqlxParser;
//# sourceMappingURL=sqlx-parser.js.map