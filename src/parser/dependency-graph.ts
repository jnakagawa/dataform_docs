import { DataformModel, DependencyGraph } from '../types';

export class DependencyGraphBuilder {
  build(models: Record<string, DataformModel>): DependencyGraph {
    const nodes = Object.values(models).map(model => ({
      id: model.name,
      model,
    }));

    const edges: Array<{ source: string; target: string }> = [];
    
    // Build edges from dependencies
    Object.values(models).forEach(model => {
      model.dependencies.forEach(dep => {
        // Only add edge if the dependency exists in our models
        if (models[dep]) {
          edges.push({
            source: dep,
            target: model.name,
          });
        }
      });
    });

    return {
      nodes,
      edges,
    };
  }

  /**
   * Perform topological sort to find execution order
   */
  getExecutionOrder(graph: DependencyGraph): string[] {
    const inDegree: Record<string, number> = {};
    const adjacencyList: Record<string, string[]> = {};

    // Initialize in-degree and adjacency list
    graph.nodes.forEach(node => {
      inDegree[node.id] = 0;
      adjacencyList[node.id] = [];
    });

    // Build adjacency list and calculate in-degrees
    graph.edges.forEach(edge => {
      adjacencyList[edge.source].push(edge.target);
      inDegree[edge.target]++;
    });

    // Kahn's algorithm for topological sorting
    const queue: string[] = [];
    const result: string[] = [];

    // Start with nodes that have no dependencies
    Object.keys(inDegree).forEach(node => {
      if (inDegree[node] === 0) {
        queue.push(node);
      }
    });

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      // Reduce in-degree for all dependent nodes
      adjacencyList[current].forEach(dependent => {
        inDegree[dependent]--;
        if (inDegree[dependent] === 0) {
          queue.push(dependent);
        }
      });
    }

    // Check for cycles
    if (result.length !== graph.nodes.length) {
      const remaining = graph.nodes.filter(node => !result.includes(node.id));
      throw new Error(`Circular dependency detected involving: ${remaining.map(n => n.id).join(', ')}`);
    }

    return result;
  }

  /**
   * Find all models that depend on a given model (downstream dependencies)
   */
  getDownstreamDependencies(graph: DependencyGraph, modelName: string): string[] {
    const downstream = new Set<string>();
    const queue = [modelName];

    while (queue.length > 0) {
      const current = queue.shift()!;
      
      graph.edges.forEach(edge => {
        if (edge.source === current && !downstream.has(edge.target)) {
          downstream.add(edge.target);
          queue.push(edge.target);
        }
      });
    }

    return Array.from(downstream);
  }

  /**
   * Find all models that a given model depends on (upstream dependencies)
   */
  getUpstreamDependencies(graph: DependencyGraph, modelName: string): string[] {
    const upstream = new Set<string>();
    const queue = [modelName];

    while (queue.length > 0) {
      const current = queue.shift()!;
      
      graph.edges.forEach(edge => {
        if (edge.target === current && !upstream.has(edge.source)) {
          upstream.add(edge.source);
          queue.push(edge.source);
        }
      });
    }

    return Array.from(upstream);
  }

  /**
   * Group models by their level in the DAG (0 = no dependencies, 1 = depends on level 0, etc.)
   */
  getLayers(graph: DependencyGraph): string[][] {
    const layers: string[][] = [];
    const processed = new Set<string>();
    const inDegree: Record<string, number> = {};

    // Initialize in-degree
    graph.nodes.forEach(node => {
      inDegree[node.id] = 0;
    });

    graph.edges.forEach(edge => {
      inDegree[edge.target]++;
    });

    // Process layer by layer
    while (processed.size < graph.nodes.length) {
      const currentLayer: string[] = [];

      // Find nodes with no remaining dependencies
      Object.keys(inDegree).forEach(nodeId => {
        if (inDegree[nodeId] === 0 && !processed.has(nodeId)) {
          currentLayer.push(nodeId);
        }
      });

      if (currentLayer.length === 0) {
        throw new Error('Circular dependency detected');
      }

      // Add to layer and mark as processed
      layers.push(currentLayer);
      currentLayer.forEach(nodeId => {
        processed.add(nodeId);
        
        // Reduce in-degree for dependent nodes
        graph.edges.forEach(edge => {
          if (edge.source === nodeId) {
            inDegree[edge.target]--;
          }
        });
      });
    }

    return layers;
  }
}