import React, { useState, useEffect } from 'react';
import { useAuthenticatedFetch } from '../contexts/AuthContext';
import { Plus, Edit, Trash2, Database, Tag, BarChart3, Code, Save, X } from 'lucide-react';

interface SemanticModel {
  id: string;
  name: string;
  description: string;
  schema_definition: {
    tables: Record<string, any>;
    metrics: any[];
    dimensions: any[];
    joins: any[];
  };
  created_at: string;
}

const SemanticModels: React.FC = () => {
  const authenticatedFetch = useAuthenticatedFetch();
  const [models, setModels] = useState<SemanticModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<SemanticModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingModel, setEditingModel] = useState<SemanticModel | null>(null);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const response = await authenticatedFetch('http://localhost:8000/api/models/');
      if (response.ok) {
        const data = await response.json();
        setModels(data);
        if (data.length > 0 && !selectedModel) {
          setSelectedModel(data[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createModel = async (modelData: any) => {
    try {
      const response = await authenticatedFetch('http://localhost:8000/api/models/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(modelData),
      });

      if (response.ok) {
        fetchModels();
        setShowCreateModal(false);
        alert('Model created successfully!');
      } else {
        const errorData = await response.json();
        alert(`Failed to create model: ${errorData.detail}`);
      }
    } catch (error) {
      alert('Failed to create model. Please try again.');
    }
  };

  const deleteModel = async (modelId: string) => {
    if (!confirm('Are you sure you want to delete this model?')) {
      return;
    }

    try {
      const response = await authenticatedFetch(`http://localhost:8000/api/models/${modelId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setModels(models.filter(m => m.id !== modelId));
        if (selectedModel?.id === modelId) {
          setSelectedModel(models.length > 1 ? models[0] : null);
        }
        alert('Model deleted successfully!');
      } else {
        alert('Failed to delete model.');
      }
    } catch (error) {
      alert('Failed to delete model. Please try again.');
    }
  };

//   const getMetricsData = async (modelId: string) => {
//     try {
//       const response = await authenticatedFetch(`http://localhost:8000/api/models/${modelId}/metrics`);
//       if (response.ok) {
//         const metrics = await response.json();
//         return metrics;
//       }
//     } catch (error) {
//       console.error('Failed to fetch metrics:', error);
//     }
//     return [];
//   };

//   const getDimensionsData = async (modelId: string) => {
//   try {
//     const response = await authenticatedFetch(`http://localhost:8000/api/models/${modelId}/dimensions`);
    
//     if (!response.ok) {
//       const errorData = await response.json();
//       throw new Error(errorData.detail || `Failed to fetch dimensions: ${response.status}`);
//     }
    
//     const dimensions = await response.json();
//     return dimensions;
//   } catch (error) {
//     console.error('Failed to fetch dimensions:', error);
//     throw error; // Re-throw to allow caller to handle the error
//   }
// };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="lg:col-span-2 h-96 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Semantic Models
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Define and manage your data models, metrics, and dimensions
          </p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          <span>New Model</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Models List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Available Models ({models.length})
            </h3>
          </div>
          <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
            {models.map((model) => (
              <div
                key={model.id}
                onClick={() => setSelectedModel(model)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedModel?.id === model.id
                    ? 'bg-blue-50 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 dark:text-white truncate">
                        {model.name}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                        {model.description}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
                        <span>{Object.keys(model.schema_definition?.tables || {}).length} tables</span>
                        <span>{(model.schema_definition?.metrics || []).length} metrics</span>
                        <span>{(model.schema_definition?.dimensions || []).length} dimensions</span>
                      </div>
                    </div>
                  </div>
                  {selectedModel?.id === model.id && (
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingModel(model);
                        }}
                        className="p-1 text-gray-500 hover:text-blue-600"
                        title="Edit model"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteModel(model.id);
                        }}
                        className="p-1 text-gray-500 hover:text-red-600"
                        title="Delete model"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {models.length === 0 && (
              <div className="text-center py-8">
                <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No models yet
                </h4>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Create your first semantic model to get started
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Model
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Model Details */}
        {selectedModel && (
          <div className="lg:col-span-2 space-y-6">
            {/* Model Overview */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {selectedModel.name}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => setEditingModel(selectedModel)}
                      className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  {selectedModel.description}
                </p>

                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/50 rounded-lg">
                    <Database className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {Object.keys(selectedModel.schema_definition?.tables || {}).length}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Tables</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/50 rounded-lg">
                    <BarChart3 className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {(selectedModel.schema_definition?.metrics || []).length}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Metrics</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/50 rounded-lg">
                    <Tag className="h-8 w-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {(selectedModel.schema_definition?.dimensions || []).length}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Dimensions</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tables */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Tables
                </h4>
                <div className="space-y-4">
                  {Object.entries(selectedModel.schema_definition?.tables || {}).map(([tableName, table]: [string, any]) => (
                    <div key={tableName} className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                        <div className="flex items-center justify-between">
                          <h5 className="font-medium text-gray-900 dark:text-white">
                            {tableName}
                          </h5>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {Object.keys(table.columns || {}).length} columns
                            </span>
                            <button
                              onClick={() => navigator.clipboard.writeText(table.sql || `SELECT * FROM ${tableName}`)}
                              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                              title="Copy SQL"
                            >
                              <Code className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {Object.entries(table.columns || {}).map(([columnName, column]: [string, any]) => (
                            <div key={columnName} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                              <span className="text-sm font-mono text-gray-700 dark:text-gray-300">{columnName}</span>
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  column.type === 'string' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' :
                                  column.type === 'number' || column.type === 'integer' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' :
                                  column.type === 'datetime' ? 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300' :
                                  'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                                }`}>
                                  {column.type}
                                </span>
                                {column.primary && (
                                  <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded-full text-xs">
                                    PK
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Metrics and Dimensions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Metrics */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="p-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Metrics
                  </h4>
                  <div className="space-y-3">
                    {(selectedModel.schema_definition?.metrics || []).map((metric: any, index: number) => (
                      <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-gray-900 dark:text-white">
                            {metric.title}
                          </h5>
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full text-xs">
                              {metric.type}
                            </span>
                            <button
                              onClick={() => navigator.clipboard.writeText(metric.sql)}
                              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                              title="Copy SQL"
                            >
                              <Code className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        <code className="text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded block overflow-x-auto">
                          {metric.sql}
                        </code>
                        {metric.format && (
                          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            Format: {metric.format}
                          </div>
                        )}
                      </div>
                    ))}
                    {(selectedModel.schema_definition?.metrics || []).length === 0 && (
                      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                        No metrics defined
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Dimensions */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="p-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Dimensions
                  </h4>
                  <div className="space-y-3">
                    {(selectedModel.schema_definition?.dimensions || []).map((dimension: any, index: number) => (
                      <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-gray-900 dark:text-white">
                            {dimension.title}
                          </h5>
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full text-xs">
                              {dimension.type}
                            </span>
                            <button
                              onClick={() => navigator.clipboard.writeText(dimension.sql)}
                              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                              title="Copy SQL"
                            >
                              <Code className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        <code className="text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded block overflow-x-auto">
                          {dimension.sql}
                        </code>
                      </div>
                    ))}
                    {(selectedModel.schema_definition?.dimensions || []).length === 0 && (
                      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                        No dimensions defined
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Joins */}
            {selectedModel.schema_definition?.joins && selectedModel.schema_definition.joins.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="p-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Joins
                  </h4>
                  <div className="space-y-3">
                    {selectedModel.schema_definition.joins.map((join: any, index: number) => (
                      <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center justify-between">
                          <h5 className="font-medium text-gray-900 dark:text-white">
                            {join.name}
                          </h5>
                          <button
                            onClick={() => navigator.clipboard.writeText(join.sql)}
                            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            title="Copy SQL"
                          >
                            <Code className="h-4 w-4" />
                          </button>
                        </div>
                        <code className="text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded mt-2 block overflow-x-auto">
                          {join.sql}
                        </code>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Model Modal */}
      {(showCreateModal || editingModel) && (
        <ModelModal
          model={editingModel}
          onSave={createModel}
          onClose={() => {
            setShowCreateModal(false);
            setEditingModel(null);
          }}
        />
      )}
    </div>
  );
};

// Modal component for creating/editing models
const ModelModal: React.FC<{
  model?: SemanticModel | null;
  onSave: (data: any) => void;
  onClose: () => void;
}> = ({ model, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: model?.name || '',
    description: model?.description || '',
    schema_definition: model?.schema_definition || {
      tables: {},
      metrics: [],
      dimensions: [],
      joins: []
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Please enter a model name');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {model ? 'Edit Model' : 'Create New Model'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Model Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter model name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter model description"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Schema Definition (JSON)
            </label>
            <textarea
              value={JSON.stringify(formData.schema_definition, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  setFormData({ ...formData, schema_definition: parsed });
                } catch (error) {
                  // Invalid JSON, keep the text for user to fix
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
              placeholder="Enter schema definition"
              rows={10}
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Save className="h-4 w-4" />
              <span>{model ? 'Update' : 'Create'} Model</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SemanticModels;