import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Play, Save, Download, Copy, Clock, Database } from 'lucide-react';

interface QueryResult {
  data: any[];
  columns: any[];
  rowCount: number;
  executionTime: number;
  queryId: string;
  fromCache?: boolean;
}

const QueryBuilder: React.FC = () => {
  const { token } = useAuth();
  const [sql, setSql] = useState('SELECT region, SUM(total) as revenue FROM orders GROUP BY region ORDER BY revenue DESC');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState('');
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('ecommerce');

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
    } catch (error) {
      console.error('Failed to fetch models:', error);
    }
  };

  const executeQuery = async () => {
    if (!sql.trim()) return;

    setIsExecuting(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8000/api/query/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          sql,
          model: selectedModel,
          useCache: true
        }),
      });

      if (!response.ok) {
        throw new Error('Query execution failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsExecuting(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sql);
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Query Builder
        </h1>
        <div className="flex items-center space-x-3">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Query Editor */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                SQL Editor
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={copyToClipboard}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <Copy className="h-4 w-4" />
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
            <div className="p-4">
              <textarea
                value={sql}
                onChange={(e) => setSql(e.target.value)}
                className="w-full h-64 p-4 font-mono text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Enter your SQL query here..."
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
                        <span>{result.rowCount} rows</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{result.executionTime}ms</span>
                      </div>
                      {result.fromCache && (
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
              <div className="p-4">
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
                    {result.rowCount > 100 && (
                      <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        Showing first 100 rows of {result.rowCount} total rows
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Schema Browser */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Schema Browser
            </h3>
          </div>
          <div className="p-4 space-y-4">
            {models.map((model: any) => (
              <div key={model.id} className="space-y-2">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {model.name}
                </h4>
                <div className="space-y-1 ml-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Tables:
                    </p>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                      {Object.keys(model.tables || {}).map((table) => (
                        <li key={table} className="cursor-pointer hover:text-blue-600">
                          {table}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Metrics:
                    </p>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                      {(model.metrics || []).map((metric: any) => (
                        <li key={metric.name} className="cursor-pointer hover:text-blue-600">
                          {metric.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Dimensions:
                    </p>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                      {(model.dimensions || []).map((dimension: any) => (
                        <li key={dimension.name} className="cursor-pointer hover:text-blue-600">
                          {dimension.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QueryBuilder;