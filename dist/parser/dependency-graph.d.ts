import { DataformModel, DependencyGraph } from '../types';
export declare class DependencyGraphBuilder {
    build(models: Record<string, DataformModel>): DependencyGraph;
    /**
     * Perform topological sort to find execution order
     */
    getExecutionOrder(graph: DependencyGraph): string[];
    /**
     * Find all models that depend on a given model (downstream dependencies)
     */
    getDownstreamDependencies(graph: DependencyGraph, modelName: string): string[];
    /**
     * Find all models that a given model depends on (upstream dependencies)
     */
    getUpstreamDependencies(graph: DependencyGraph, modelName: string): string[];
    /**
     * Group models by their level in the DAG (0 = no dependencies, 1 = depends on level 0, etc.)
     */
    getLayers(graph: DependencyGraph): string[][];
}
//# sourceMappingURL=dependency-graph.d.ts.map