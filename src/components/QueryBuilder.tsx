import React, { useState, useEffect } from 'react';
import { useAuthenticatedFetch } from '../contexts/AuthContext';
import { Play, Download, Copy, Clock, Database, Save, History, Sparkles} from 'lucide-react';

interface QueryResult {
  data: any[];
  columns: any[];
  row_count: number;
  execution_time: number;
  query_id: string;
  from_cache?: boolean;
}

interface SavedQuery {
  id: string;
  name: string;
  sql_query: string;
  created_at: string;
}

const QueryBuilder: React.FC = () => {
  const authenticatedFetch = useAuthenticatedFetch();
  const [sql, setSql] = useState('SELECT region, SUM(total) as revenue FROM orders GROUP BY region ORDER BY revenue DESC');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState('');
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('ecommerce');
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [queryName, setQueryName] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchModels();
    fetchSavedQueries();
  }, []);

  const fetchModels = async () => {
    try {
      const response = await authenticatedFetch('http://localhost:8000/api/models/');
      if (response.ok) {
        const data = await response.json();
        setModels(data);
        if (data.length > 0 && !selectedModel) {
          setSelectedModel(data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
    }
  };

  const fetchSavedQueries = async () => {
    try {
      const response = await authenticatedFetch('http://localhost:8000/api/queries/');
      if (response.ok) {
        const data = await response.json();
        setSavedQueries(data);
      }
    } catch (error) {
      console.error('Failed to fetch saved queries:', error);
    }
  };

  const executeQuery = async () => {
    if (!sql.trim()) return;

    setIsExecuting(true);
    setError('');

    try {
      const response = await authenticatedFetch('http://localhost:8000/api/queries/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sql,
          model_id: selectedModel,
          use_cache: true
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Query execution failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError(String(error));
      }
    } finally {
      setIsExecuting(false);
    }
  };

  const generateQuery = async () => {
    const prompt = window.prompt('Describe what you want to query:');
    if (!prompt) return;

    try {
      const response = await authenticatedFetch('http://localhost:8000/api/ai/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          model_id: selectedModel
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setSql(result.sql);
        setError('');
      } else {
        const errorData = await response.json();
        setError(`Failed to generate query: ${errorData.detail}`);
      }
    } catch (error) {
      setError('Failed to generate query. Please try again.');
    }
  };

  const saveQuery = async () => {
    if (!queryName.trim()) {
      alert('Please enter a name for the query');
      return;
    }

    try {
      const response = await authenticatedFetch('http://localhost:8000/api/queries/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: queryName,
          sql_query: sql,
          model_id: selectedModel
        }),
      });

      if (response.ok) {
        setShowSaveDialog(false);
        setQueryName('');
        fetchSavedQueries();
        alert('Query saved successfully!');
      } else {
        const errorData = await response.json();
        alert(`Failed to save query: ${errorData.detail}`);
      }
    } catch (error) {
      alert('Failed to save query. Please try again.');
    }
  };

  const loadQuery = (query: SavedQuery) => {
    setSql(query.sql_query);
    setShowHistory(false);
    setError('');
    setResult(null);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sql);
    alert('Query copied to clipboard!');
  };

  const downloadResults = () => {
    if (!result) return;

    const csv = [
      result.columns.map(col => col.name).join(','),
      ...result.data.map(row => 
        result.columns.map(col => row[col.name]).join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query-results-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatSQL = () => {
    // Basic SQL formatting
    const formatted = sql
      .replace(/\bSELECT\b/gi, 'SELECT')
      .replace(/\bFROM\b/gi, '\nFROM')
      .replace(/\bWHERE\b/gi, '\nWHERE')
      .replace(/\bGROUP BY\b/gi, '\nGROUP BY')
      .replace(/\bORDER BY\b/gi, '\nORDER BY')
      .replace(/\bJOIN\b/gi, '\nJOIN')
      .replace(/\bINNER JOIN\b/gi, '\nINNER JOIN')
      .replace(/\bLEFT JOIN\b/gi, '\nLEFT JOIN')
      .replace(/\bRIGHT JOIN\b/gi, '\nRIGHT JOIN');
    
    setSql(formatted);
  };

  const sampleQueries = [
    {
      name: 'Revenue by Region',
      sql: 'SELECT region, SUM(total) as revenue FROM orders GROUP BY region ORDER BY revenue DESC'
    },
    {
      name: 'Top Customers',
      sql: 'SELECT customer_id, COUNT(*) as order_count, SUM(total) as total_spent FROM orders GROUP BY customer_id ORDER BY total_spent DESC LIMIT 10'
    },
    {
      name: 'Monthly Sales Trend',
      sql: 'SELECT DATE_FORMAT(created_at, "%Y-%m") as month, SUM(total) as monthly_revenue FROM orders GROUP BY month ORDER BY month'
    },
    {
      name: 'Order Status Distribution',
      sql: 'SELECT status, COUNT(*) as count FROM orders GROUP BY status'
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Query Builder
        </h1>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center space-x-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <History className="h-4 w-4" />
            <span>History</span>
          </button>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {models.map((model: any) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
        {/* Query Editor */}
        <div className="xl:col-span-3 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 h-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                SQL Editor
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={generateQuery}
                  className="flex items-center space-x-1 px-3 py-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/50 rounded-lg transition-colors"
                  title="Generate query with AI"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>AI Generate</span>
                </button>
                <button
                  onClick={formatSQL}
                  className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Format SQL"
                >
                  Format
                </button>
                <button
                  onClick={copyToClipboard}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  title="Copy to clipboard"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowSaveDialog(true)}
                  className="flex items-center space-x-1 px-3 py-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/50 rounded-lg transition-colors"
                  title="Save query"
                >
                  <Save className="h-4 w-4" />
                  <span>Save</span>
                </button>
                <button
                  onClick={executeQuery}
                  disabled={isExecuting}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="h-4 w-4" />
                  <span>{isExecuting ? 'Executing...' : 'Execute'}</span>
                </button>
              </div>
            </div>
            <div className="flex-1 p-4">
              <textarea
                value={sql}
                onChange={(e) => setSql(e.target.value)}
                className="w-full h-full p-4 font-mono text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Enter your SQL query here..."
                style={{ minHeight: '300px' }}
              />
            </div>
          </div>

          {/* Results */}
          {(result || error) && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Query Results
                  </h3>
                  {result && (
                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center space-x-1">
                        <Database className="h-4 w-4" />
                        <span>{result.row_count} rows</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{result.execution_time}ms</span>
                      </div>
                      {result.from_cache && (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full text-xs">
                          Cached
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {result && (
                  <button
                    onClick={downloadResults}
                    className="flex items-center space-x-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download</span>
                  </button>
                )}
              </div>
              <div className="p-4 max-h-96 overflow-auto">
                {error ? (
                  <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <p className="text-red-700 dark:text-red-300">{error}</p>
                  </div>
                ) : result ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          {result.columns.map((column, index) => (
                            <th
                              key={index}
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                            >
                              {column.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {result.data.slice(0, 100).map((row, rowIndex) => (
                          <tr key={rowIndex}>
                            {result.columns.map((column, colIndex) => (
                              <td
                                key={colIndex}
                                className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
                              >
                                {typeof row[column.name] === 'number' 
                                  ? row[column.name].toLocaleString()
                                  : row[column.name]
                                }
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {result.row_count > 100 && (
                      <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700">
                        Showing first 100 rows of {result.row_count} total rows
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Schema Browser */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Schema Browser
              </h3>
            </div>
            <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
              {models.filter((m: any) => m.id === selectedModel).map((model: any) => (
                <div key={model.id} className="space-y-3">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      {model.name}
                    </h4>
                    
                    {/* Tables */}
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Tables:
                      </p>
                      <div className="space-y-1">
                        {Object.keys(model.schema_definition?.tables || {}).map((table) => (
                          <div key={table} className="text-sm">
                            <button
                              onClick={() => setSql(`SELECT * FROM ${table} LIMIT 10`)}
                              className="text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              {table}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Metrics:
                      </p>
                      <div className="space-y-1">
                        {(model.schema_definition?.metrics || []).map((metric: any) => (
                          <div key={metric.name} className="text-sm">
                            <button
                              onClick={() => setSql(`SELECT ${metric.sql} as ${metric.name}`)}
                              className="text-green-600 dark:text-green-400 hover:underline"
                              title={metric.sql}
                            >
                              {metric.title}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Dimensions */}
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Dimensions:
                      </p>
                      <div className="space-y-1">
                        {(model.schema_definition?.dimensions || []).map((dimension: any) => (
                          <div key={dimension.name} className="text-sm">
                            <button
                              onClick={() => setSql(`SELECT DISTINCT ${dimension.sql} as ${dimension.name} FROM orders`)}
                              className="text-purple-600 dark:text-purple-400 hover:underline"
                              title={dimension.sql}
                            >
                              {dimension.title}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sample Queries */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Sample Queries
              </h3>
            </div>
            <div className="p-4 space-y-2">
              {sampleQueries.map((query, index) => (
                <button
                  key={index}
                  onClick={() => setSql(query.sql)}
                  className="w-full text-left p-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded"
                >
                  {query.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Save Query Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Save Query
            </h3>
            <input
              type="text"
              value={queryName}
              onChange={(e) => setQueryName(e.target.value)}
              placeholder="Enter query name"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
            />
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={saveQuery}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Query History */}
      {showHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Saved Queries
              </h3>
              <button
                onClick={() => setShowHistory(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ×
              </button>
            </div>
            <div className="space-y-2 overflow-y-auto max-h-96">
              {savedQueries.map((query) => (
                <div
                  key={query.id}
                  className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  onClick={() => loadQuery(query)}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {query.name}
                    </h4>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(query.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 truncate">
                    {query.sql_query}
                  </p>
                </div>
              ))}
              {savedQueries.length === 0 && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No saved queries yet
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QueryBuilder;