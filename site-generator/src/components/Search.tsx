import { useState, useMemo } from 'react';
import { Search as SearchIcon, Filter, X, ChevronDown } from 'lucide-react';
import Fuse from 'fuse.js';
import { DataformModel } from '../types';

interface SearchProps {
  models: Record<string, DataformModel>;
  onSearchChange: (term: string) => void;
  onTypeFilter: (type: string) => void;
  onTagFilter: (tag: string) => void;
  onClearFilters: () => void;
  searchTerm: string;
  filterType?: string;
  filterTag?: string;
}

export default function Search({
  models,
  onSearchChange,
  onTypeFilter,
  onTagFilter,
  onClearFilters,
  searchTerm,
  filterType,
  filterTag,
}: SearchProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Setup Fuse.js for fuzzy searching
  const fuse = useMemo(() => {
    const modelArray = Object.values(models);
    return new Fuse(modelArray, {
      keys: [
        { name: 'name', weight: 0.7 },
        { name: 'description', weight: 0.2 },
        { name: 'tags', weight: 0.1 },
      ],
      threshold: 0.3,
      includeScore: true,
    });
  }, [models]);

  // Get unique types and tags for filtering
  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    Object.values(models).forEach(model => types.add(model.type));
    return Array.from(types).sort();
  }, [models]);

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    Object.values(models).forEach(model => {
      model.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [models]);

  // Generate search suggestions
  const handleSearchInputChange = (value: string) => {
    onSearchChange(value);
    
    if (value.length > 0) {
      const results = fuse.search(value);
      const suggestions = results
        .slice(0, 5)
        .map(result => result.item.name)
        .filter(name => name !== value);
      
      setSearchSuggestions(suggestions);
      setShowSuggestions(true);
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (suggestion: string) => {
    onSearchChange(suggestion);
    setShowSuggestions(false);
  };

  const hasActiveFilters = filterType || filterTag || searchTerm;

  return (
    <div className="bg-white border-b border-gray-200 p-4">
      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearchInputChange(e.target.value)}
            onFocus={() => searchSuggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="Search models..."
            className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded transition-colors ${
              showFilters ? 'text-primary-600 bg-primary-50' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>

        {/* Search Suggestions */}
        {showSuggestions && searchSuggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
            {searchSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => selectSuggestion(suggestion)}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className="text-sm text-gray-600">Active filters:</span>
          
          {searchTerm && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm">
              Search: "{searchTerm}"
              <button
                onClick={() => onSearchChange('')}
                className="hover:bg-primary-200 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          
          {filterType && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm capitalize">
              Type: {filterType}
              <button
                onClick={() => onTypeFilter('')}
                className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          
          {filterTag && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
              Tag: {filterTag}
              <button
                onClick={() => onTagFilter('')}
                className="hover:bg-green-200 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          
          <button
            onClick={onClearFilters}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Filter Panel */}
      {showFilters && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Type
              </label>
              <div className="relative">
                <select
                  value={filterType || ''}
                  onChange={(e) => onTypeFilter(e.target.value)}
                  className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none appearance-none bg-white"
                >
                  <option value="">All types</option>
                  {availableTypes.map(type => (
                    <option key={type} value={type} className="capitalize">
                      {type} ({Object.values(models).filter(m => m.type === type).length})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Tag Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Tag
              </label>
              <div className="relative">
                <select
                  value={filterTag || ''}
                  onChange={(e) => onTagFilter(e.target.value)}
                  className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none appearance-none bg-white"
                >
                  <option value="">All tags</option>
                  {availableTags.map(tag => (
                    <option key={tag} value={tag}>
                      {tag} ({Object.values(models).filter(m => m.tags.includes(tag)).length})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}