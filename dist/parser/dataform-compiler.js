"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataformCompiler = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class DataformCompiler {
    constructor() {
        this.catalogInfo = {};
    }
    async compileProject(projectPath) {
        try {
            console.log('Using Dataform CLI to compile project...');
            const { stdout } = await execAsync('dataform compile --json', {
                cwd: projectPath,
                maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large projects
            });
            const compiled = JSON.parse(stdout);
            const models = {};
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
        }
        catch (error) {
            console.error('Failed to compile Dataform project:', error);
            throw error;
        }
    }
    convertCompiledTableToModel(table) {
        // Extract dependencies from the compiled output
        const dependencies = this.extractDependencies(table);
        // Create config object from compiled metadata
        const config = {
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
    mapType(dataformType) {
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
    extractDependencies(table) {
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
    extractDependenciesFromSQL(sql) {
        const dependencies = new Set();
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
    async getProjectInfo(projectPath) {
        try {
            const { stdout: lsOutput } = await execAsync('ls workflow_settings.yaml', { cwd: projectPath });
            const hasWorkflowSettings = lsOutput.includes('workflow_settings.yaml');
            // Try to extract basic info from workflow settings
            let database;
            let defaultSchema;
            if (hasWorkflowSettings) {
                try {
                    const { stdout: catOutput } = await execAsync('cat workflow_settings.yaml', { cwd: projectPath });
                    const databaseMatch = catOutput.match(/defaultDatabase:\s*([^\s]+)/);
                    const schemaMatch = catOutput.match(/defaultSchema:\s*([^\s]+)/);
                    if (databaseMatch)
                        database = databaseMatch[1];
                    if (schemaMatch)
                        defaultSchema = schemaMatch[1];
                }
                catch {
                    // Ignore errors reading workflow settings
                }
            }
            return { hasWorkflowSettings, database, defaultSchema };
        }
        catch {
            return { hasWorkflowSettings: false };
        }
    }
    /**
     * Extract column information from compiled table for catalog
     */
    extractColumnInfo(table) {
        const modelName = table.target.name;
        if (table.actionDescriptor?.columns && table.actionDescriptor.columns.length > 0) {
            const columns = {};
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
    getCatalog() {
        return {
            models: { ...this.catalogInfo }
        };
    }
    /**
     * Clear catalog info (useful for fresh compilation)
     */
    clearCatalog() {
        this.catalogInfo = {};
    }
}
exports.DataformCompiler = DataformCompiler;
//# sourceMappingURL=dataform-compiler.js.map