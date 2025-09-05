import React, { useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  Handle,
  Position,
  NodeProps,
  MarkerType,
  useReactFlow,
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';
import { DataformModel } from '../types';

interface DependencyGraphProps {
  models: Record<string, DataformModel>;
  onNodeClick?: (model: DataformModel) => void;
  selectedModel?: string;
  isolateModel?: string; // New prop for isolating a model's pipeline
}

// Custom node component with UntitledUI styling
function ModelNode({ data, selected }: NodeProps) {
  const getNodeColor = (type: string) => {
    switch (type) {
      case 'table':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'view':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'incremental':
        return 'bg-purple-100 border-purple-300 text-purple-800';
      case 'assertion':
        return 'bg-red-100 border-red-300 text-red-800';
      case 'operation':
        return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'declaration':
        return 'bg-gray-100 border-gray-300 text-gray-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const nodeColor = getNodeColor(data.model.type);
  const isSelected = selected;

  return (
    <div
      className={`px-1 py-0.5 shadow-sm rounded border min-w-[80px] cursor-pointer transition-all duration-200 text-xs ${nodeColor} ${
        isSelected ? 'ring-1 ring-primary-500 shadow-md' : 'hover:shadow-md'
      }`}
      onClick={() => data.onClick?.(data.model)}
    >
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-gray-400 border-2 border-white" />
      
      <div className="text-center">
        <div className="font-semibold text-xs mb-0.5 leading-tight" style={{ wordBreak: 'break-word' }}>
          {data.model.name}
        </div>
        <div className="text-[10px] font-medium opacity-80 mb-1 uppercase tracking-wide">
          {data.model.type}
        </div>
        {data.model.schema && (
          <div className="text-xs opacity-70 mb-2 truncate">
            {data.model.schema}
          </div>
        )}
        {data.model.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-center">
            {data.model.tags.slice(0, 3).map((tag: string) => (
              <span key={tag} className="px-2 py-0.5 text-xs bg-white bg-opacity-80 rounded-full font-medium">
                {tag}
              </span>
            ))}
            {data.model.tags.length > 3 && (
              <span className="px-2 py-0.5 text-xs bg-white bg-opacity-80 rounded-full font-medium">
                +{data.model.tags.length - 3}
              </span>
            )}
          </div>
        )}
        {data.model.dependencies.length > 0 && (
          <div className="text-xs opacity-60 mt-2">
            {data.model.dependencies.length} deps
          </div>
        )}
      </div>
      
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-gray-400 border-2 border-white" />
    </div>
  );
}

const nodeTypes = {
  modelNode: ModelNode,
};

// Helper function to get all upstream and downstream dependencies
const getConnectedModels = (modelName: string, models: Record<string, DataformModel>) => {
  const connected = new Set<string>();
  const visited = new Set<string>();
  
  // Add the selected model itself
  connected.add(modelName);
  
  // Get all upstream dependencies (recursive)
  const getUpstream = (name: string) => {
    if (visited.has(name)) return;
    visited.add(name);
    
    const model = models[name];
    if (!model) return;
    
    connected.add(name);
    model.dependencies.forEach(dep => {
      if (models[dep]) {
        getUpstream(dep);
      }
    });
  };
  
  // Get all downstream dependents (recursive)  
  const getDownstream = (name: string) => {
    if (visited.has(`down_${name}`)) return;
    visited.add(`down_${name}`);
    
    connected.add(name);
    Object.values(models).forEach(model => {
      if (model.dependencies.includes(name)) {
        getDownstream(model.name);
      }
    });
  };
  
  // Start traversal
  getUpstream(modelName);
  visited.clear(); // Clear for downstream traversal
  getDownstream(modelName);
  
  return connected;
};

// Helper function to layout nodes using Dagre
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR', _isIsolated = false) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  // Handle disconnected components by finding connected components first
  const getConnectedComponents = (nodes: Node[], edges: Edge[]) => {
    const components: Node[][] = [];
    const visited = new Set<string>();
    
    const dfs = (nodeId: string, component: Node[]) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        component.push(node);
        
        // Find all connected edges
        edges.forEach(edge => {
          if (edge.source === nodeId && !visited.has(edge.target)) {
            dfs(edge.target, component);
          }
          if (edge.target === nodeId && !visited.has(edge.source)) {
            dfs(edge.source, component);
          }
        });
      }
    };
    
    nodes.forEach(node => {
      if (!visited.has(node.id)) {
        const component: Node[] = [];
        dfs(node.id, component);
        if (component.length > 0) {
          components.push(component);
        }
      }
    });
    
    console.log('DAGRE DEBUG - Found', components.length, 'connected components:', 
      components.map(c => `${c.length} nodes`).join(', '));
    
    return components;
  };
  
  // Get connected components
  const components = getConnectedComponents(nodes, edges);
  
  // Layout each component separately and distribute them
  const allLayoutedNodes: Node[] = [];
  const componentSpacing = 400; // Space between components
  let currentY = 0;
  
  components.forEach((componentNodes, componentIndex) => {
    // Get edges for this component
    const componentEdges = edges.filter(edge => 
      componentNodes.some(n => n.id === edge.source) && 
      componentNodes.some(n => n.id === edge.target)
    );
    
    console.log(`DAGRE DEBUG - Component ${componentIndex + 1}: ${componentNodes.length} nodes, ${componentEdges.length} edges`);
    
    // Create dagre graph for this component
    const componentGraph = new dagre.graphlib.Graph();
    componentGraph.setDefaultEdgeLabel(() => ({}));
    
    const spacing = {
      ranksep: 200,    // Distance between ranks (levels)
      nodesep: 150,    // Distance between nodes in same rank
      marginx: 50,    
      marginy: 50
    };
    
    const nodeSize = { width: 80, height: 40 };
    
    componentGraph.setGraph({ 
      rankdir: direction,
      ...spacing
    });

    componentNodes.forEach((node) => {
      componentGraph.setNode(node.id, nodeSize);
    });

    componentEdges.forEach((edge) => {
      componentGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(componentGraph);
    
    // Check if dagre actually separated the nodes
    const positions = componentNodes.map(node => {
      const pos = componentGraph.node(node.id);
      return { id: node.id, x: pos.x, y: pos.y };
    });
    
    // Count how many nodes are at the exact same position
    const positionGroups = new Map();
    positions.forEach(pos => {
      const key = `${pos.x},${pos.y}`;
      const existing = positionGroups.get(key) || [];
      existing.push(pos.id);
      positionGroups.set(key, existing);
    });
    
    const maxStackedNodes = Math.max(...Array.from(positionGroups.values()).map(group => group.length));
    const stackedPercentage = maxStackedNodes / componentNodes.length;
    
    console.log(`DAGRE DEBUG - Component ${componentIndex + 1}: ${componentNodes.length} nodes, max stacked: ${maxStackedNodes} (${(stackedPercentage * 100).toFixed(1)}%)`);
    
    // If too many nodes are stacked (>50%), use grid fallback
    const USE_GRID_FALLBACK = stackedPercentage > 0.5;
    
    let componentLayoutedNodes: Node[];
    
    if (USE_GRID_FALLBACK) {
      console.log(`DAGRE DEBUG - Using hierarchical grid fallback for component ${componentIndex + 1}`);
      
      // Calculate dependency levels - lower level = further left
      const levelMap = new Map<string, number>();
      const calculateLevel = (nodeId: string, visited = new Set<string>()): number => {
        if (levelMap.has(nodeId)) return levelMap.get(nodeId)!;
        if (visited.has(nodeId)) return 0; // Cycle detection
        
        visited.add(nodeId);
        
        // Find all dependencies of this node
        const dependencies = componentEdges
          .filter(edge => edge.target === nodeId)
          .map(edge => edge.source);
        
        let maxDepLevel = 0;
        if (dependencies.length > 0) {
          maxDepLevel = Math.max(...dependencies.map(dep => calculateLevel(dep, visited)));
        }
        
        const level = maxDepLevel + 1;
        levelMap.set(nodeId, level);
        visited.delete(nodeId);
        return level;
      };
      
      // Calculate levels for all nodes
      componentNodes.forEach(node => calculateLevel(node.id));
      
      // Group nodes by level
      const nodesByLevel = new Map<number, Node[]>();
      componentNodes.forEach(node => {
        const level = levelMap.get(node.id) || 1;
        const existing = nodesByLevel.get(level) || [];
        existing.push(node);
        nodesByLevel.set(level, existing);
      });
      
      const levels = Array.from(nodesByLevel.keys()).sort((a, b) => a - b);
      console.log(`DAGRE DEBUG - Component ${componentIndex + 1} levels:`, levels.map(l => `L${l}: ${nodesByLevel.get(l)?.length} nodes`).join(', '));
      
      // Layout nodes hierarchically: left-to-right by level, top-to-bottom within level
      const levelSpacing = 300; // Horizontal spacing between levels
      const nodeSpacing = 120;  // Vertical spacing between nodes in same level
      
      componentLayoutedNodes = [];
      levels.forEach((level, levelIndex) => {
        const nodesAtLevel = nodesByLevel.get(level) || [];
        nodesAtLevel.forEach((node, nodeIndex) => {
          componentLayoutedNodes.push({
            ...node,
            position: {
              x: levelIndex * levelSpacing + 50,
              y: nodeIndex * nodeSpacing + 50 + currentY,
            },
          });
        });
      });
    } else {
      console.log(`DAGRE DEBUG - Using dagre layout for component ${componentIndex + 1}`);
      
      // Use dagre positions
      componentLayoutedNodes = componentNodes.map((node) => {
        const nodeWithPosition = componentGraph.node(node.id);
        const centerX = nodeSize.width / 2;
        const centerY = nodeSize.height / 2;
        
        return {
          ...node,
          position: {
            x: nodeWithPosition.x - centerX,
            y: nodeWithPosition.y - centerY + currentY,
          },
        };
      });
    }
    
    allLayoutedNodes.push(...componentLayoutedNodes);
    
    // Update Y offset for next component
    const componentHeight = Math.max(...componentLayoutedNodes.map(n => n.position.y)) - Math.min(...componentLayoutedNodes.map(n => n.position.y)) + nodeSize.height;
    currentY += componentHeight + componentSpacing;
  });
  
  console.log('DAGRE DEBUG - Total layouted nodes:', allLayoutedNodes.length);
  
  // Show first few nodes for debugging
  allLayoutedNodes.slice(0, 5).forEach(node => {
    console.log(`DAGRE DEBUG - Node ${node.id}: final(${node.position.x}, ${node.position.y})`);
  });

  return { nodes: allLayoutedNodes, edges };
};

// Custom control panel component
function CustomControls() {
  const { fitView } = useReactFlow();
  
  const resetView = useCallback(() => {
    fitView({ 
      padding: 0.1, 
      duration: 800,
      minZoom: 0.05,
      maxZoom: 2
    });
  }, [fitView]);
  
  return (
    <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
      <button
        onClick={resetView}
        className="px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        🔍 Reset View
      </button>
    </div>
  );
}

export default function DependencyGraph({ models, onNodeClick, selectedModel, isolateModel }: DependencyGraphProps) {
  const isIsolated = !!isolateModel;
  const [reactFlowInstance, setReactFlowInstance] = React.useState<any>(null);
  
  // Convert models to nodes and edges with optional isolation
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const modelArray = Object.values(models);
    let filteredModels = modelArray;
    
    // If isolateModel is specified, filter to only show connected models
    if (isolateModel && models[isolateModel]) {
      const connectedModelNames = getConnectedModels(isolateModel, models);
      filteredModels = modelArray.filter(model => connectedModelNames.has(model.name));
    }
    
    // Create nodes
    const nodes: Node[] = filteredModels.map(model => ({
      id: model.name,
      type: 'modelNode',
      position: { x: 0, y: 0 }, // Will be set by layout
      data: {
        model,
        onClick: onNodeClick,
      },
      selected: selectedModel === model.name,
    }));
    
    // Create edges
    const edges: Edge[] = [];
    filteredModels.forEach(model => {
      model.dependencies.forEach(dep => {
        if (models[dep] && filteredModels.some(m => m.name === dep)) {
          edges.push({
            id: `${dep}-${model.name}`,
            source: dep,
            target: model.name,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
            },
            style: {
              strokeWidth: isolateModel ? 4 : 2.5,
              stroke: isolateModel && (dep === isolateModel || model.name === isolateModel) 
                ? '#0ea5e9' 
                : '#4b5563',
            },
            animated: !!(isolateModel && (dep === isolateModel || model.name === isolateModel)),
          });
        }
      });
    });
    
    return getLayoutedElements(nodes, edges, 'LR', isIsolated);
  }, [models, onNodeClick, selectedModel, isolateModel, isIsolated]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Update nodes and edges when they change (for isolation)
  React.useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Update nodes when selectedModel changes
  React.useEffect(() => {
    setNodes(nodes => 
      nodes.map(node => ({
        ...node,
        selected: selectedModel === node.id,
      }))
    );
  }, [selectedModel, setNodes]);

  // Auto-zoom to fit isolated pipeline
  React.useEffect(() => {
    if (isolateModel && reactFlowInstance && nodes.length > 0) {
      // Small delay to let nodes settle after layout
      const timer = setTimeout(() => {
        reactFlowInstance.fitView({
          padding: 0.15,
          duration: 800,
          minZoom: 0.1,
          maxZoom: 1.5,
        });
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [isolateModel, reactFlowInstance, nodes.length]);

  return (
    <div className="w-full h-full bg-gray-50 rounded-lg border border-gray-200 relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onInit={setReactFlowInstance}
        fitView
        fitViewOptions={{
          padding: 0.1,
          minZoom: 0.05,
          maxZoom: 2,
        }}
        minZoom={0.05}
        maxZoom={2}
      >
        <Controls className="bg-white border border-gray-200 rounded-md shadow-sm" />
        <CustomControls />
        <MiniMap 
          className="bg-white border border-gray-200 rounded-md shadow-sm"
          nodeColor={(node) => {
            switch (node.data?.model?.type) {
              case 'table': return '#dbeafe';
              case 'view': return '#dcfce7';
              case 'incremental': return '#f3e8ff';
              case 'assertion': return '#fef2f2';
              case 'operation': return '#fff7ed';
              default: return '#f9fafb';
            }
          }}
        />
        <Background color="#e5e7eb" gap={16} />
      </ReactFlow>
    </div>
  );
}