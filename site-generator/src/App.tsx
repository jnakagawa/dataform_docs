import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layers, BarChart3, Clock, AlertCircle } from 'lucide-react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import DependencyGraph from './components/DependencyGraph';
import ModelList from './components/ModelList';
import ModelDetails from './components/ModelDetails';
import Search from './components/Search';
import { DataLoader } from './utils/data-loader';
import { Manifest, Catalog } from './types';

// URL state management utilities
const parseUrlState = (location: any) => {
  // Use window.location.hash to get the actual browser hash
  const windowHash = window.location.hash;
  const urlParams = new URLSearchParams(location.search);

  let selectedModel: string | null = null;
  let viewMode: 'isolated' | 'full' = 'full';

  // Parse hash-based routing first (for static file serving)
  if (windowHash.startsWith('#/model/')) {
    // Extract model name from hash route
    const hashPath = windowHash.slice(1); // Remove #
    const parts = hashPath.split('?'); // Split path from query params
    const path = parts[0];

    if (path.startsWith('/model/')) {
      selectedModel = decodeURIComponent(path.slice(7));
      // Default to isolated view for model deep links
      viewMode = 'isolated';
    }

    // Parse query params from hash route
    if (parts[1]) {
      const hashParams = new URLSearchParams(parts[1]);
      const viewParam = hashParams.get('view');
      if (viewParam === 'full') {
        viewMode = 'full';
      } else if (viewParam === 'isolated') {
        viewMode = 'isolated';
      }
      // If selectedModel exists but no view param specified, keep default 'isolated'

      return {
        selectedModel,
        viewMode,
        searchTerm: hashParams.get('search') || '',
        filterType: hashParams.get('type') || '',
        filterTag: hashParams.get('tag') || '',
      };
    }
  }
  // Fall back to pathname-based routing (for proper web servers)
  else if (location.pathname.startsWith('/model/')) {
    selectedModel = decodeURIComponent(location.pathname.slice(7));
    // Default to isolated view for model deep links
    viewMode = 'isolated';
  }

  // Parse query params for additional state
  const viewParam = urlParams.get('view');
  if (viewParam === 'full') {
    viewMode = 'full';
  } else if (viewParam === 'isolated') {
    viewMode = 'isolated';
  }
  // If selectedModel exists but no view param specified, keep default 'isolated'

  return {
    selectedModel,
    viewMode,
    searchTerm: urlParams.get('search') || '',
    filterType: urlParams.get('type') || '',
    filterTag: urlParams.get('tag') || '',
  };
};

const buildUrl = (state: {
  selectedModel?: string | null;
  viewMode?: 'isolated' | 'full';
  searchTerm?: string;
  filterType?: string;
  filterTag?: string;
}) => {
  // Auto-detect if we're using hash routing by checking current location
  const isHashRouting = window.location.hash.startsWith('#/');

  let path = '/';

  // Set path for model selection
  if (state.selectedModel) {
    path = `/model/${encodeURIComponent(state.selectedModel)}`;
  }

  // Build query params
  const params = new URLSearchParams();
  if (state.viewMode === 'isolated') {
    params.set('view', 'isolated');
  }
  if (state.searchTerm) {
    params.set('search', state.searchTerm);
  }
  if (state.filterType) {
    params.set('type', state.filterType);
  }
  if (state.filterTag) {
    params.set('tag', state.filterTag);
  }

  const queryString = params.toString();
  const fullPath = queryString ? `${path}?${queryString}` : path;

  // If we're in hash routing mode, return hash-based URL
  if (isHashRouting) {
    return `#${fullPath}`;
  }

  return fullPath;
};


function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [isolatedModel, setIsolatedModel] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterTag, setFilterTag] = useState<string>('');

  // Deep link state
  const [isDeepLink, setIsDeepLink] = useState(false);

  const dataLoader = new DataLoader();

  // Smart navigation that handles both hash and pathname routing
  const navigateToUrl = (url: string, options?: { replace?: boolean }) => {
    if (url.startsWith('#')) {
      // For hash-based URLs, update the hash directly
      if (options?.replace) {
        window.location.replace(url);
      } else {
        window.location.hash = url.substring(1);
      }
    } else {
      // For pathname URLs, use React Router
      navigate(url, options);
    }
  };

  // Initialize state from URL on mount and when location changes
  useEffect(() => {
    const urlState = parseUrlState(location);
    const hasDeepLink = !!(urlState.selectedModel || urlState.searchTerm || urlState.filterType || urlState.filterTag);

    setSelectedModel(urlState.selectedModel);
    // If there's a selected model from URL (deep link), isolate it by default unless explicitly set to 'full'
    if (urlState.selectedModel) {
      const shouldIsolate = urlState.viewMode !== 'full';
      const isolatedModelValue = shouldIsolate ? urlState.selectedModel : null;
      setIsolatedModel(isolatedModelValue);
    } else {
      setIsolatedModel(urlState.viewMode === 'isolated' ? urlState.selectedModel : null);
    }
    setSearchTerm(urlState.searchTerm);
    setFilterType(urlState.filterType);
    setFilterTag(urlState.filterTag);
    setIsDeepLink(hasDeepLink);
  }, [location]);

  // Listen for hash changes (important for hash-based routing)
  useEffect(() => {
    const handleHashChange = () => {
      const urlState = parseUrlState(location);
      setSelectedModel(urlState.selectedModel);
      // If there's a selected model from URL (deep link), isolate it by default unless explicitly set to 'full'
      if (urlState.selectedModel) {
        setIsolatedModel(urlState.viewMode === 'full' ? null : urlState.selectedModel);
      } else {
        setIsolatedModel(urlState.viewMode === 'isolated' ? urlState.selectedModel : null);
      }
      setSearchTerm(urlState.searchTerm);
      setFilterType(urlState.filterType);
      setFilterTag(urlState.filterTag);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [location]);

  useEffect(() => {
    loadData();
  }, []);


  const loadData = async () => {
    try {
      setLoading(true);
      const { manifest, catalog } = await dataLoader.loadData();
      setManifest(manifest);
      setCatalog(catalog);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleModelSelect = (modelName: string) => {
    setSelectedModel(modelName);
    setIsolatedModel(modelName); // Also isolate the pipeline when selecting
    setIsDeepLink(false); // Reset deep link flag for user interactions

    // Update URL with isolated view
    const newUrl = buildUrl({
      selectedModel: modelName,
      viewMode: 'isolated',
      searchTerm,
      filterType,
      filterTag,
    });
    navigateToUrl(newUrl, { replace: true });
  };

  const handleClearIsolation = () => {
    setIsolatedModel(null);

    // Update URL to show full view while keeping model selected
    const newUrl = buildUrl({
      selectedModel,
      viewMode: 'full',
      searchTerm,
      filterType,
      filterTag,
    });
    navigateToUrl(newUrl, { replace: true });
  };

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);

    // Update URL with search term
    const newUrl = buildUrl({
      selectedModel,
      viewMode: isolatedModel ? 'isolated' : 'full',
      searchTerm: term,
      filterType,
      filterTag,
    });
    navigateToUrl(newUrl, { replace: true });
  };

  const handleTypeFilter = (type: string) => {
    setFilterType(type);

    // Update URL with type filter
    const newUrl = buildUrl({
      selectedModel,
      viewMode: isolatedModel ? 'isolated' : 'full',
      searchTerm,
      filterType: type,
      filterTag,
    });
    navigateToUrl(newUrl, { replace: true });
  };

  const handleTagFilter = (tag: string) => {
    setFilterTag(tag);

    // Update URL with tag filter
    const newUrl = buildUrl({
      selectedModel,
      viewMode: isolatedModel ? 'isolated' : 'full',
      searchTerm,
      filterType,
      filterTag: tag,
    });
    navigateToUrl(newUrl, { replace: true });
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterType('');
    setFilterTag('');

    // Update URL with cleared filters
    const newUrl = buildUrl({
      selectedModel,
      viewMode: isolatedModel ? 'isolated' : 'full',
      searchTerm: '',
      filterType: '',
      filterTag: '',
    });
    navigateToUrl(newUrl, { replace: true });
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Dataform documentation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Failed to load documentation</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={loadData}
            className="btn-primary"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!manifest) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">No manifest data available</p>
        </div>
      </div>
    );
  }

  const stats = dataLoader.getModelStats(manifest);
  const selectedModelData = selectedModel ? manifest.models[selectedModel] : null;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Layers className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Dataform Documentation: {(() => {
                  const projectPath = manifest.metadata?.projectPath || '';
                  return projectPath.split('/').pop() || 'Unknown Project';
                })()}
              </h1>
              <p className="text-sm text-gray-600">
                Generated {new Date(manifest.metadata.generatedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          {/* Stats */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <BarChart3 className="w-4 h-4" />
              {stats.totalModels} models
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              {stats.totalDependencies} dependencies
            </div>
          </div>
        </div>

      </header>

      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal">
          {/* Left Sidebar - Model List */}
          <Panel defaultSize={20} minSize={15} maxSize={35}>
            <div className="h-full flex flex-col bg-white border-r border-gray-200">
              <Search
                models={manifest.models}
                onSearchChange={handleSearchChange}
                onTypeFilter={handleTypeFilter}
                onTagFilter={handleTagFilter}
                onClearFilters={handleClearFilters}
                searchTerm={searchTerm}
                filterType={filterType}
                filterTag={filterTag}
              />
              
              <div className="flex-1 overflow-hidden">
                <ModelList
                  models={manifest.models}
                  selectedModel={selectedModel || undefined}
                  onModelSelect={handleModelSelect}
                  searchTerm={searchTerm}
                  filterType={filterType}
                  filterTag={filterTag}
                />
              </div>
            </div>
          </Panel>

          <PanelResizeHandle className="w-2 bg-gray-100 hover:bg-gray-200 cursor-col-resize transition-colors" />

          {/* Main Content - Graph/List View */}
          <Panel defaultSize={selectedModelData ? 45 : 80} minSize={30}>
            <div className="h-full">
              <div className="relative h-full">
                <DependencyGraph
                  models={manifest.models}
                  onNodeClick={(model) => handleModelSelect(model.name)}
                  selectedModel={selectedModel || undefined}
                  isolateModel={isolatedModel || undefined}
                  autoCenter={isDeepLink && !isolatedModel}
                  onAutoCenterComplete={() => setIsDeepLink(false)}
                />
                {isolatedModel && (
                  <div className="absolute top-4 left-4 bg-white rounded-lg shadow-md p-3 border border-gray-200">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">
                        Showing pipeline for: <span className="text-blue-600 font-semibold">{isolatedModel}</span>
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                        {(() => {
                          // Calculate connected models count for display
                          const getConnectedCount = (modelName: string, models: Record<string, any>) => {
                            const connected = new Set<string>([modelName]);
                            const visited = new Set<string>();
                            
                            const traverse = (name: string) => {
                              if (visited.has(name) || !models[name]) return;
                              visited.add(name);
                              connected.add(name);
                              
                              // Add dependencies
                              models[name].dependencies.forEach((dep: string) => {
                                if (models[dep]) traverse(dep);
                              });
                              
                              // Add dependents
                              Object.values(models).forEach((model: any) => {
                                if (model.dependencies.includes(name)) {
                                  traverse(model.name);
                                }
                              });
                            };
                            
                            traverse(modelName);
                            return connected.size;
                          };
                          
                          const connectedCount = getConnectedCount(isolatedModel, manifest.models);
                          return `${connectedCount} of ${Object.keys(manifest.models).length}`;
                        })()}
                      </span>
                      <button
                        onClick={handleClearIsolation}
                        className="px-3 py-1 text-xs bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors font-medium"
                      >
                        Show All
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Panel>

          {/* Right Sidebar - Model Details */}
          {selectedModelData && (
            <>
              <PanelResizeHandle className="w-2 bg-gray-100 hover:bg-gray-200 cursor-col-resize transition-colors" />
              <Panel defaultSize={35} minSize={25} maxSize={55}>
                <div className="h-full bg-white border-l border-gray-200">
                  <ModelDetails
                    model={selectedModelData}
                    allModels={manifest.models}
                    catalog={catalog}
                    onModelSelect={handleModelSelect}
                  />
                </div>
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>

      {/* Empty State for Model Details */}
      {!selectedModelData && (
        <div className="fixed bottom-6 right-6">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm">
            <p className="text-sm text-gray-600">
              Click on a node in the graph to view model details
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;