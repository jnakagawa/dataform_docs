"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManifestBuilder = void 0;
class ManifestBuilder {
    build(models, dependencyGraph, metadata) {
        return {
            models,
            dependencyGraph,
            metadata: {
                generatedAt: new Date().toISOString(),
                version: metadata.version,
                projectPath: metadata.projectPath,
            },
        };
    }
    /**
     * Add statistics to the manifest (for future use with BigQuery integration)
     */
    addStatistics(manifest, statistics) {
        // This can be expanded to include table statistics from BigQuery
        return {
            ...manifest,
            statistics,
        };
    }
    /**
     * Validate the manifest structure
     */
    validate(manifest) {
        const errors = [];
        // Check that all models exist
        if (!manifest.models || Object.keys(manifest.models).length === 0) {
            errors.push('No models found in manifest');
        }
        // Check that dependency graph references valid models
        const modelNames = new Set(Object.keys(manifest.models));
        manifest.dependencyGraph.nodes.forEach(node => {
            if (!modelNames.has(node.id)) {
                errors.push(`Dependency graph node '${node.id}' not found in models`);
            }
        });
        manifest.dependencyGraph.edges.forEach(edge => {
            if (!modelNames.has(edge.source)) {
                errors.push(`Dependency edge source '${edge.source}' not found in models`);
            }
            if (!modelNames.has(edge.target)) {
                errors.push(`Dependency edge target '${edge.target}' not found in models`);
            }
        });
        // Check for required fields in models
        Object.entries(manifest.models).forEach(([name, model]) => {
            if (!model.name) {
                errors.push(`Model '${name}' missing name field`);
            }
            if (!model.filePath) {
                errors.push(`Model '${name}' missing filePath field`);
            }
            if (!model.type) {
                errors.push(`Model '${name}' missing type field`);
            }
            if (!Array.isArray(model.dependencies)) {
                errors.push(`Model '${name}' dependencies should be an array`);
            }
            if (!Array.isArray(model.tags)) {
                errors.push(`Model '${name}' tags should be an array`);
            }
        });
        return {
            isValid: errors.length === 0,
            errors,
        };
    }
    /**
     * Get model summary statistics
     */
    getSummary(manifest) {
        const models = Object.values(manifest.models);
        const typeCount = models.reduce((acc, model) => {
            acc[model.type] = (acc[model.type] || 0) + 1;
            return acc;
        }, {});
        const allTags = new Set();
        models.forEach(model => {
            model.tags.forEach(tag => allTags.add(tag));
        });
        return {
            totalModels: models.length,
            modelsByType: typeCount,
            totalDependencies: manifest.dependencyGraph.edges.length,
            uniqueTags: allTags.size,
            tagsList: Array.from(allTags),
        };
    }
}
exports.ManifestBuilder = ManifestBuilder;
//# sourceMappingURL=manifest-builder.js.map