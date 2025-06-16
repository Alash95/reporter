import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit, Trash2, Database, Tag, BarChart3 } from 'lucide-react';

const SemanticModels: React.FC = () => {
  const { token } = useAuth();
  const [models, setModels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState(null);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/models', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setModels(data);
      if (data.length > 0 && !selectedModel) {
        setSelectedModel(data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Semantic Models
        </h1>
        <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          <span>New Model</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Models List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Available Models
            </h3>
          </div>
          <div className="p-4 space-y-2">
            {models.map((model: any) => (
              <div
                key={model.id}
                onClick={() => setSelectedModel(model)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedModel?.id === model.id
                    ? 'bg-blue-50 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {model.name}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {model.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
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
                    <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button className="p-2 text-red-500 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
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
                      {Object.keys(selectedModel.tables || {}).length}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Tables</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/50 rounded-lg">
                    <BarChart3 className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {(selectedModel.metrics || []).length}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Metrics</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/50 rounded-lg">
                    <Tag className="h-8 w-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {(selectedModel.dimensions || []).length}
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
                  {Object.entries(selectedModel.tables || {}).map(([tableName, table]: [string, any]) => (
                    <div key={tableName} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2">
                        {tableName}
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                        {Object.entries(table.columns || {}).map(([columnName, column]: [string, any]) => (
                          <div key={columnName} className="flex items-center space-x-2">
                            <span className="text-gray-600 dark:text-gray-300">{columnName}</span>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              column.type === 'string' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' :
                              column.type === 'number' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' :
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
                        ))}
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
                    {(selectedModel.metrics || []).map((metric: any) => (
                      <div key={metric.name} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-gray-900 dark:text-white">
                            {metric.title}
                          </h5>
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full text-xs">
                            {metric.type}
                          </span>
                        </div>
                        <code className="text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">
                          {metric.sql}
                        </code>
                      </div>
                    ))}
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
                    {(selectedModel.dimensions || []).map((dimension: any) => (
                      <div key={dimension.name} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-gray-900 dark:text-white">
                            {dimension.title}
                          </h5>
                          <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full text-xs">
                            {dimension.type}
                          </span>
                        </div>
                        <code className="text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">
                          {dimension.sql}
                        </code>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SemanticModels;