import { DataformModel, DependencyGraph, Manifest } from '../types';
interface ManifestMetadata {
    projectPath: string;
    version: string;
}
export declare class ManifestBuilder {
    build(models: Record<string, DataformModel>, dependencyGraph: DependencyGraph, metadata: ManifestMetadata): Manifest;
    /**
     * Add statistics to the manifest (for future use with BigQuery integration)
     */
    addStatistics(manifest: Manifest, statistics: Record<string, any>): Manifest & {
        statistics: Record<string, any>;
    };
    /**
     * Validate the manifest structure
     */
    validate(manifest: Manifest): {
        isValid: boolean;
        errors: string[];
    };
    /**
     * Get model summary statistics
     */
    getSummary(manifest: Manifest): {
        totalModels: number;
        modelsByType: Record<string, number>;
        totalDependencies: number;
        uniqueTags: number;
        tagsList: string[];
    };
}
export {};
//# sourceMappingURL=manifest-builder.d.ts.map