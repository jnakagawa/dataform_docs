import { DataformModel } from '../types';
export declare class DataformCompiler {
    private catalogInfo;
    compileProject(projectPath: string): Promise<Record<string, DataformModel>>;
    private convertCompiledTableToModel;
    private mapType;
    private extractDependencies;
    private extractDependenciesFromSQL;
    /**
     * Check if Dataform CLI is available
     */
    static isDataformAvailable(): Promise<boolean>;
    /**
     * Get Dataform project info
     */
    getProjectInfo(projectPath: string): Promise<{
        hasWorkflowSettings: boolean;
        database?: string;
        defaultSchema?: string;
    }>;
    /**
     * Extract column information from compiled table for catalog
     */
    private extractColumnInfo;
    /**
     * Get the catalog information (call after compileProject)
     */
    getCatalog(): {
        models: Record<string, {
            columns?: Record<string, {
                type: string;
                description?: string;
            }>;
        }>;
    };
    /**
     * Clear catalog info (useful for fresh compilation)
     */
    clearCatalog(): void;
}
//# sourceMappingURL=dataform-compiler.d.ts.map