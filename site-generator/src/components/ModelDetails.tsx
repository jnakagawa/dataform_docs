import { Database, Eye, Layers, AlertTriangle, Play, FileText, ArrowRight, Tag, Code, FileCode, Table } from 'lucide-react';
import { DataformModel, Catalog } from '../types';

interface ModelDetailsProps {
  model: DataformModel;
  allModels: Record<string, DataformModel>;
  catalog?: Catalog | null;
  onModelSelect: (modelName: string) => void;
}

export default function ModelDetails({ model, allModels, catalog, onModelSelect }: ModelDetailsProps) {
  const getModelIcon = (type: string) => {
    switch (type) {
      case 'table':
        return <Database className="w-5 h-5" />;
      case 'view':
        return <Eye className="w-5 h-5" />;
      case 'incremental':
        return <Layers className="w-5 h-5" />;
      case 'assertion':
        return <AlertTriangle className="w-5 h-5" />;
      case 'operation':
        return <Play className="w-5 h-5" />;
      case 'declaration':
        return <FileText className="w-5 h-5" />;
      default:
        return <Database className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'table':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'view':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'incremental':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'assertion':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'operation':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'declaration':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Get models that depend on this model (downstream)
  const dependentModels = Object.values(allModels)
    .filter(m => m.dependencies.includes(model.name))
    .map(m => m.name);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg border ${getTypeColor(model.type)}`}>
              {getModelIcon(model.type)}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-semibold text-gray-900 break-words">
                {model.name}
              </h1>
              <div className="flex items-center gap-4 mt-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${getTypeColor(model.type)}`}>
                  {model.type}
                </span>
                {model.schema && (
                  <span className="text-sm text-gray-600">
                    Schema: <span className="font-medium">{model.schema}</span>
                  </span>
                )}
              </div>
              {model.description && (
                <p className="text-gray-700 mt-3 leading-relaxed">
                  {model.description}
                </p>
              )}
            </div>
          </div>

          {/* Tags */}
          {model.tags.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Tags</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {model.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Dependencies Section */}
        <div className="p-6 space-y-6">
          {/* Dependencies (Upstream) */}
          {model.dependencies.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Dependencies ({model.dependencies.length})
              </h3>
              <div className="space-y-2">
                {model.dependencies.map(dep => {
                  const depModel = allModels[dep];
                  return (
                    <div
                      key={dep}
                      className={`p-3 rounded-lg border transition-all duration-200 ${
                        depModel 
                          ? 'bg-white border-gray-200 hover:bg-gray-50 cursor-pointer' 
                          : 'bg-red-50 border-red-200'
                      }`}
                      onClick={() => depModel && onModelSelect(dep)}
                    >
                      <div className="flex items-center gap-3">
                        {depModel ? (
                          <>
                            <div className={`p-1.5 rounded ${getTypeColor(depModel.type)}`}>
                              {getModelIcon(depModel.type)}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-sm text-gray-900">
                                {dep}
                              </div>
                              {depModel.description && (
                                <div className="text-xs text-gray-500 mt-1 truncate">
                                  {depModel.description}
                                </div>
                              )}
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-400" />
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            <div className="flex-1">
                              <div className="font-medium text-sm text-red-700">
                                {dep}
                              </div>
                              <div className="text-xs text-red-500 mt-1">
                                Model not found
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dependent Models (Downstream) */}
          {dependentModels.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Used by ({dependentModels.length})
              </h3>
              <div className="space-y-2">
                {dependentModels.map(depName => {
                  const depModel = allModels[depName];
                  return (
                    <div
                      key={depName}
                      className="p-3 rounded-lg border bg-white border-gray-200 hover:bg-gray-50 cursor-pointer transition-all duration-200"
                      onClick={() => onModelSelect(depName)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded ${getTypeColor(depModel.type)}`}>
                          {getModelIcon(depModel.type)}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm text-gray-900">
                            {depName}
                          </div>
                          {depModel.description && (
                            <div className="text-xs text-gray-500 mt-1 truncate">
                              {depModel.description}
                            </div>
                          )}
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Configuration */}
          {Object.keys(model.config).length > 1 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Code className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-medium text-gray-900">Configuration</h3>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto">
                  {JSON.stringify(model.config, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Columns Section */}
          {catalog?.models[model.name]?.columns && Object.keys(catalog.models[model.name].columns!).length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Table className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-medium text-gray-900">Columns ({Object.keys(catalog.models[model.name].columns!).length})</h3>
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Column
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(catalog.models[model.name].columns!).map(([columnName, columnInfo]) => (
                      <tr key={columnName} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {columnName}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {columnInfo.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {columnInfo.description || <span className="italic text-gray-400">No description</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Optional: Table Stats */}
              {(() => {
                const stats = catalog.models[model.name].stats;
                if (!stats) return null;
                
                return (
                  <div className="mt-3 text-xs text-gray-500 space-y-1">
                    {stats.rowCount && (
                      <div>
                        <strong>Rows:</strong> {stats.rowCount.toLocaleString()}
                      </div>
                    )}
                    {stats.byteSize && (
                      <div>
                        <strong>Size:</strong> {(stats.byteSize / (1024 * 1024)).toFixed(2)} MB
                      </div>
                    )}
                    {stats.lastModified && (
                      <div>
                        <strong>Last modified:</strong> {new Date(stats.lastModified).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* JavaScript Block */}
          {model.jsBlock && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileCode className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-medium text-gray-900">JavaScript</h3>
              </div>
              <div className="bg-gray-900 rounded-lg p-4">
                <pre className="text-sm text-gray-100 whitespace-pre-wrap overflow-x-auto">
                  <code>{model.jsBlock}</code>
                </pre>
              </div>
            </div>
          )}

          {/* SQL Content */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Database className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-medium text-gray-900">SQL</h3>
            </div>
            <div className="bg-gray-900 rounded-lg p-4">
              <pre className="text-sm text-gray-100 whitespace-pre-wrap overflow-x-auto">
                <code>{model.sqlContent || 'No SQL content'}</code>
              </pre>
            </div>
          </div>

          {/* File Path */}
          <div className="text-xs text-gray-500 pt-4 border-t border-gray-200">
            <strong>File:</strong> definitions/{model.filePath}
          </div>
        </div>
      </div>
    </div>
  );
}