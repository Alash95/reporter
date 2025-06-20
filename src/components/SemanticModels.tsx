// src/components/SemanticModels.tsx - Semantic Models Manager matching backend
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthenticatedFetch } from '../contexts/AuthContext';
import { useRefreshManager } from '../hooks/useRefreshManager';
import { 
  Database, 
  Plus, 
  Trash2, 
  X, 
  Layers, 
  Table, 
  BarChart3, 
  Tag,
  RefreshCw,
  Copy,
  Download  
} from 'lucide-react';

interface Column {
  name: string;
  type: 'string' | 'number' | 'integer' | 'datetime' | 'boolean';
  primary?: boolean;
  description?: string;
}

interface TableSchema {
  name: string;
  sql: string;
  columns: Record<string, Column>;
  description?: string;
}

interface Metric {
  name: string;
  title: string;
  type: 'sum' | 'count' | 'avg' | 'min' | 'max' | 'count_distinct';
  sql: string;
  format?: 'currency' | 'percentage' | 'number';
  description?: string;
}

interface Dimension {
  name: string;
  title: string;
  type: 'string' | 'time' | 'number';
  sql: string;
  description?: string;
}

interface SemanticModel {
  id: string;
  name: string;
  description: string;
  schema_definition: {
    tables: Record<string, TableSchema>;
    metrics: Metric[];
    dimensions: Dimension[];
    data_source?: {
      type: string;
      connection_id?: string;
    };
  };
  created_at: string;
  updated_at: string;
  is_default: boolean;
}

const SemanticModels: React.FC = () => {
  const authenticatedFetch = useAuthenticatedFetch();
  const refreshManager = useRefreshManager();
  
  const [models, setModels] = useState<SemanticModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<SemanticModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  console.log({isEditing, setIsEditing});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingModel, setEditingModel] = useState<Partial<SemanticModel> | null>(null);
  const [activeTab, setActiveTab] = useState<'tables' | 'metrics' | 'dimensions'>('tables');

  const mountedRef = useRef<boolean>(true);

  // Load semantic models
  const loadModels = useCallback(async () => {
    if (!mountedRef.current) return;

    setIsLoading(true);
    try {
      const response = await authenticatedFetch('http://localhost:8000/api/models/');
      if (response.ok && mountedRef.current) {
        const data = await response.json();
        setModels(data);
        
        // Select first model if none selected
        if (data.length > 0 && !selectedModel) {
          setSelectedModel(data[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load semantic models:', error);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [authenticatedFetch, selectedModel]);

  // Initialize component
  useEffect(() => {
    mountedRef.current = true;

    // Register with refresh manager
    refreshManager.register('semantic-models', loadModels, {
      interval: 60000, // 1 minute
      enabled: true,
      minInterval: 10000,
      maxRetries: 3
    });

    // Initial load
    loadModels();

    return () => {
      mountedRef.current = false;
      refreshManager.unregister('semantic-models');
    };
  }, [refreshManager, loadModels]);

  // Create new semantic model
  const createModel = useCallback(async (modelData: Partial<SemanticModel>) => {
    try {
      const response = await authenticatedFetch('http://localhost:8000/api/models/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: modelData.name,
          description: modelData.description,
          schema_definition: modelData.schema_definition || {
            tables: {},
            metrics: [],
            dimensions: []
          }
        })
      });

      if (response.ok) {
        const newModel = await response.json();
        setModels(prev => [newModel, ...prev]);
        setSelectedModel(newModel);
        setShowCreateModal(false);
        setEditingModel(null);
      } else {
        const error = await response.json();
        alert(`Failed to create model: ${error.detail}`);
      }
    } catch (error) {
      console.error('Failed to create model:', error);
      alert('Failed to create model. Please try again.');
    }
  }, [authenticatedFetch]);

  // Update semantic model
  // const updateModel = useCallback(async (modelId: string, updates: Partial<SemanticModel>) => {
  //   try {
  //     const response = await authenticatedFetch(`http://localhost:8000/api/models/${modelId}`, {
  //       method: 'PUT',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify(updates)
  //     });

  //     if (response.ok) {
  //       const updatedModel = await response.json();
  //       setModels(prev => prev.map(m => m.id === modelId ? updatedModel : m));
  //       if (selectedModel?.id === modelId) {
  //         setSelectedModel(updatedModel);
  //       }
  //       setIsEditing(false);
  //       setEditingModel(null);
  //     } else {
  //       const error = await response.json();
  //       alert(`Failed to update model: ${error.detail}`);
  //     }
  //   } catch (error) {
  //     console.error('Failed to update model:', error);
  //     alert('Failed to update model. Please try again.');
  //   }
  // }, [authenticatedFetch, selectedModel]);

  // Delete semantic model
  const deleteModel = useCallback(async (modelId: string) => {
    if (!confirm('Are you sure you want to delete this semantic model?')) return;

    try {
      const response = await authenticatedFetch(`http://localhost:8000/api/models/${modelId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setModels(prev => prev.filter(m => m.id !== modelId));
        if (selectedModel?.id === modelId) {
          const remainingModels = models.filter(m => m.id !== modelId);
          setSelectedModel(remainingModels.length > 0 ? remainingModels[0] : null);
        }
      } else {
        alert('Failed to delete model.');
      }
    } catch (error) {
      console.error('Failed to delete model:', error);
      alert('Failed to delete model. Please try again.');
    }
  }, [authenticatedFetch, selectedModel, models]);

  // Export model as JSON
  const exportModel = useCallback((model: SemanticModel) => {
    const dataStr = JSON.stringify(model, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `semantic-model-${model.name.replace(/\s+/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  // Copy schema as JSON
  const copySchema = useCallback((schema: any) => {
    navigator.clipboard.writeText(JSON.stringify(schema, null, 2));
  }, []);

  const handleRefresh = useCallback(() => {
    refreshManager.refresh('semantic-models', true);
  }, [refreshManager]);

  // Render table schema
  const renderTableSchema = (tableName: string, table: TableSchema) => (
    <div key={tableName} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Table className="h-5 w-5 text-blue-600" />
          <h4 className="font-medium text-gray-900 dark:text-white">{tableName}</h4>
        </div>
        <button
          onClick={() => copySchema(table)}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>
      
      {table.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{table.description}</p>
      )}
      
      <div className="bg-gray-50 dark:bg-gray-700 rounded p-3 mb-3">
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">SQL:</label>
        <code className="text-sm text-gray-800 dark:text-gray-200 block mt-1">{table.sql}</code>
      </div>
      
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Columns:</label>
        {Object.entries(table.columns).map(([colName, column]) => (
          <div key={colName} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-sm text-gray-900 dark:text-white">{colName}</span>
              <span className={`px-2 py-1 text-xs rounded ${
                column.type === 'string' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400' :
                column.type === 'number' || column.type === 'integer' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-400' :
                column.type === 'datetime' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-400' :
                'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-400'
              }`}>
                {column.type}
              </span>
              {column.primary && (
                <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-400 rounded">
                  PRIMARY
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Render metric
  const renderMetric = (metric: Metric) => (
    <div key={metric.name} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5 text-green-600" />
          <h4 className="font-medium text-gray-900 dark:text-white">{metric.title}</h4>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 text-xs rounded ${
            metric.type === 'sum' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-400' :
            metric.type === 'count' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400' :
            metric.type === 'avg' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-400' :
            'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-400'
          }`}>
            {metric.type.toUpperCase()}
          </span>
          <button
            onClick={() => copySchema(metric)}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {metric.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{metric.description}</p>
      )}
      
      <div className="bg-gray-50 dark:bg-gray-700 rounded p-3">
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">SQL:</label>
        <code className="text-sm text-gray-800 dark:text-gray-200 block mt-1">{metric.sql}</code>
      </div>
      
      {metric.format && (
        <div className="mt-2">
          <span className="text-xs text-gray-600 dark:text-gray-400">
            Format: <span className="font-mono">{metric.format}</span>
          </span>
        </div>
      )}
    </div>
  );

  // Render dimension
  const renderDimension = (dimension: Dimension) => (
    <div key={dimension.name} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Tag className="h-5 w-5 text-orange-600" />
          <h4 className="font-medium text-gray-900 dark:text-white">{dimension.title}</h4>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 text-xs rounded ${
            dimension.type === 'string' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400' :
            dimension.type === 'time' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-400' :
            'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-400'
          }`}>
            {dimension.type.toUpperCase()}
          </span>
          <button
            onClick={() => copySchema(dimension)}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {dimension.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{dimension.description}</p>
      )}
      
      <div className="bg-gray-50 dark:bg-gray-700 rounded p-3">
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">SQL:</label>
        <code className="text-sm text-gray-800 dark:text-gray-200 block mt-1">{dimension.sql}</code>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="lg:col-span-2 h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Semantic Models
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Define logical data structures, metrics, and dimensions
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            <span>New Model</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Models List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Models ({models.length})
            </h3>
          </div>
          
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {models.length === 0 ? (
              <div className="p-8 text-center">
                <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No semantic models yet</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-3 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  Create your first model
                </button>
              </div>
            ) : (
              models.map((model) => (
                <div
                  key={model.id}
                  className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    selectedModel?.id === model.id ? 'bg-blue-50 dark:bg-blue-900/50' : ''
                  }`}
                  onClick={() => setSelectedModel(model)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {model.name}
                        </h4>
                        {model.is_default && (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400 rounded">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {model.description}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>{Object.keys(model.schema_definition.tables).length} tables</span>
                        <span>{model.schema_definition.metrics.length} metrics</span>
                        <span>{model.schema_definition.dimensions.length} dimensions</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          exportModel(model);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      
                      {!model.is_default && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteModel(model.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Model Details */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          {selectedModel ? (
            <>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {selectedModel.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {selectedModel.description}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => copySchema(selectedModel.schema_definition)}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => exportModel(selectedModel)}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                {/* Tabs */}
                <div className="flex space-x-4 mt-4">
                  {[
                    { key: 'tables', label: 'Tables', icon: Table, count: Object.keys(selectedModel.schema_definition.tables).length },
                    { key: 'metrics', label: 'Metrics', icon: BarChart3, count: selectedModel.schema_definition.metrics.length },
                    { key: 'dimensions', label: 'Dimensions', icon: Tag, count: selectedModel.schema_definition.dimensions.length }
                  ].map(({ key, label, icon: Icon, count }) => (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key as any)}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium ${
                        activeTab === key
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{label}</span>
                      <span className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full px-2 py-1 text-xs">
                        {count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                {activeTab === 'tables' && (
                  <div className="space-y-4">
                    {Object.keys(selectedModel.schema_definition.tables).length === 0 ? (
                      <div className="text-center py-8">
                        <Table className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">No tables defined</p>
                      </div>
                    ) : (
                      Object.entries(selectedModel.schema_definition.tables).map(([name, table]) =>
                        renderTableSchema(name, table)
                      )
                    )}
                  </div>
                )}

                {activeTab === 'metrics' && (
                  <div className="space-y-4">
                    {selectedModel.schema_definition.metrics.length === 0 ? (
                      <div className="text-center py-8">
                        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">No metrics defined</p>
                      </div>
                    ) : (
                      selectedModel.schema_definition.metrics.map(renderMetric)
                    )}
                  </div>
                )}

                {activeTab === 'dimensions' && (
                  <div className="space-y-4">
                    {selectedModel.schema_definition.dimensions.length === 0 ? (
                      <div className="text-center py-8">
                        <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">No dimensions defined</p>
                      </div>
                    ) : (
                      selectedModel.schema_definition.dimensions.map(renderDimension)
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-8 text-center">
              <Layers className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Select a Semantic Model
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Choose a model from the list to view its schema definition
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Model Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Create Semantic Model
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Model Name
                </label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter model name"
                  value={editingModel?.name || ''}
                  onChange={(e) => setEditingModel(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter model description"
                  rows={3}
                  value={editingModel?.description || ''}
                  onChange={(e) => setEditingModel(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => editingModel && createModel(editingModel)}
                disabled={!editingModel?.name}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Create Model
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SemanticModels;