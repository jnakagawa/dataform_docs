import { Database, Eye, Layers, AlertTriangle, Play, FileText } from 'lucide-react';
import { DataformModel } from '../types';

interface ModelListProps {
  models: Record<string, DataformModel>;
  selectedModel?: string;
  onModelSelect: (modelName: string) => void;
  searchTerm?: string;
  filterType?: string;
  filterTag?: string;
}

export default function ModelList({
  models,
  selectedModel,
  onModelSelect,
  searchTerm = '',
  filterType,
  filterTag,
}: ModelListProps) {
  const getModelIcon = (type: string) => {
    switch (type) {
      case 'table':
        return <Database className="w-4 h-4" />;
      case 'view':
        return <Eye className="w-4 h-4" />;
      case 'incremental':
        return <Layers className="w-4 h-4" />;
      case 'assertion':
        return <AlertTriangle className="w-4 h-4" />;
      case 'operation':
        return <Play className="w-4 h-4" />;
      case 'declaration':
        return <FileText className="w-4 h-4" />;
      default:
        return <Database className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'table':
        return 'text-blue-600 bg-blue-50';
      case 'view':
        return 'text-green-600 bg-green-50';
      case 'incremental':
        return 'text-purple-600 bg-purple-50';
      case 'assertion':
        return 'text-red-600 bg-red-50';
      case 'operation':
        return 'text-orange-600 bg-orange-50';
      case 'declaration':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  // Filter models based on search term, type, and tag
  const filteredModels = Object.values(models).filter(model => {
    const matchesSearch = !searchTerm || 
      model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      model.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = !filterType || model.type === filterType;
    const matchesTag = !filterTag || model.tags.includes(filterTag);
    
    return matchesSearch && matchesType && matchesTag;
  });

  // Group models by type for better organization
  const modelsByType = filteredModels.reduce((acc, model) => {
    if (!acc[model.type]) acc[model.type] = [];
    acc[model.type].push(model);
    return acc;
  }, {} as Record<string, DataformModel[]>);

  if (filteredModels.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <Database className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-sm">No models match your current filters</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full">
      <div className="p-4 space-y-6">
        {Object.entries(modelsByType)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([type, typeModels]) => (
            <div key={type} className="space-y-2">
              <div className="flex items-center gap-2 px-2 py-1">
                <div className={`p-1 rounded ${getTypeColor(type)}`}>
                  {getModelIcon(type)}
                </div>
                <h3 className="font-medium text-sm text-gray-700 capitalize">
                  {type}s ({typeModels.length})
                </h3>
              </div>
              
              <div className="space-y-1 ml-4">
                {typeModels
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(model => (
                    <div
                      key={model.name}
                      className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                        selectedModel === model.name
                          ? 'bg-primary-50 border-primary-200 ring-1 ring-primary-500'
                          : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                      }`}
                      onClick={() => onModelSelect(model.name)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 truncate">
                            {model.name}
                          </div>
                          {model.schema && (
                            <div className="text-xs text-gray-500 mt-1">
                              Schema: {model.schema}
                            </div>
                          )}
                          {model.description && (
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                              {model.description}
                            </p>
                          )}
                        </div>
                        
                        {model.dependencies.length > 0 && (
                          <div className="ml-2 flex-shrink-0">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {model.dependencies.length} deps
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {model.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {model.tags.map(tag => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}