// src/components/EnhancedQueryBuilder.tsx - Auto-populating query builder with integrated schemas

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Save, 
  Copy, 
  Download, 
  RefreshCw, 
  Database, 
  Table, 
  BarChart3,
  Eye,
  Code,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Search,
  Filter,
  BookOpen,
  TrendingUp,
  CheckCircle
} from 'lucide-react';
import { useAuthenticatedFetch } from '../contexts/AuthContext';

interface Column {
  name: string;
  type: string;
  nullable?: boolean;
}

interface TableSchema {
  name: string;
  columns: Column[];
  source_type: string;
  source_id: string;
  row_count?: number;
}

interface Metric {
  name: string;
  title: string;
  type: string;
  sql: string;
  format?: string;
  original_column?: string;
}

interface Dimension {
  name: string;
  title: string;
  sql: string;
  type: string;
  original_column?: string;
}

interface SchemaInfo {
  model_id: string;
  model_name: string;
  tables: TableSchema[];
  metrics: Metric[];
  dimensions: Dimension[];
  data_source: any;
}

interface QueryResult {
  data: any[];
  columns: any[];
  row_count: number;
  execution_time: number;
  query_id: string;
  from_cache: boolean;
}

interface QueryBuilderContext {
  available_schemas: SchemaInfo[];
  recent_queries: string[];
  sample_queries: string[];
  query_templates: any[];
}

const EnhancedQueryBuilder: React.FC = () => {
  // ✅ FIXED: Properly call the hook to get the authenticatedFetch function
  const authenticatedFetch = useAuthenticatedFetch();
  
  const [sql, setSql] = useState('');
  const [context, setContext] = useState<QueryBuilderContext | null>(null);
  const [selectedSchema, setSelectedSchema] = useState<string>('');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['tables', 'metrics', 'dimensions']));
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'editor' | 'results' | 'history'>('editor');
  const [queryHistory, setQueryHistory] = useState<any[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  const sqlEditorRef = useRef<HTMLTextAreaElement>(null);

  // ✅ FIXED: Moved all functions that use authenticatedFetch after the hook call
  const loadQueryBuilderContext = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await authenticatedFetch('http://localhost:8000/api/integration/context/query-builder');
      
      if (response.ok) {
        const contextData = await response.json();
        setContext(contextData);
        
        // Auto-expand first schema tables
        if (contextData.available_schemas.length > 0) {
          const firstSchema = contextData.available_schemas[0];
          setExpandedTables(new Set(firstSchema.tables.map((t: TableSchema) => t.name)));
        }
      }
    } catch (error) {
      console.error('Failed to load query builder context:', error);
    } finally {
      setIsLoading(false);
    }
  }, [authenticatedFetch]);

  const loadQueryHistory = useCallback(async () => {
    try {
      const response = await authenticatedFetch('http://localhost:8000/api/queries/history?limit=10');
      if (response.ok) {
        const history = await response.json();
        setQueryHistory(history);
      }
    } catch (error) {
      console.error('Failed to load query history:', error);
    }
  }, [authenticatedFetch]);

  const generateAISuggestions = useCallback(async () => {
    if (!selectedSchema || !context) return;

    try {
      const schema = context.available_schemas.find(s => s.model_id === selectedSchema);
      if (!schema) return;

      const response = await authenticatedFetch('http://localhost:8000/api/ai/query-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schema_id: selectedSchema,
          schema_info: schema
        })
      });

      if (response.ok) {
        const suggestions = await response.json();
        setAiSuggestions(suggestions.suggestions || []);
      }
    } catch (error) {
      console.error('Failed to generate AI suggestions:', error);
    }
  }, [authenticatedFetch, selectedSchema, context]);

  const executeQuery = async () => {
    if (!sql.trim()) return;

    setIsExecuting(true);
    try {
      const response = await authenticatedFetch('http://localhost:8000/api/queries/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql: sql,
          model_id: selectedSchema,
          use_cache: true
        })
      });

      if (response.ok) {
        const result = await response.json();
        setQueryResult(result);
        setActiveTab('results');
        
        // Refresh query history
        await loadQueryHistory();
      } else {
        const error = await response.json();
        alert(`Query execution failed: ${error.detail}`);
      }
    } catch (error) {
      console.error('Query execution error:', error);
      alert('Failed to execute query. Please check your SQL syntax.');
    } finally {
      setIsExecuting(false);
    }
  };

  const generateQueryWithAI = async (prompt: string) => {
    try {
      const response = await authenticatedFetch('http://localhost:8000/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          model_id: selectedSchema
        })
      });

      if (response.ok) {
        const result = await response.json();
        setSql(result.sql);
        
        // Show explanation
        if (result.explanation) {
          alert(`AI Generated Query:\n\n${result.explanation}`);
        }
      }
    } catch (error) {
      console.error('AI query generation failed:', error);
    }
  };

  const saveQuery = async () => {
    if (!sql.trim()) return;

    const name = prompt('Enter a name for this query:');
    if (!name) return;

    try {
      const response = await authenticatedFetch('http://localhost:8000/api/queries/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name,
          sql_query: sql,
          model_id: selectedSchema
        })
      });

      if (response.ok) {
        alert('Query saved successfully!');
        await loadQueryHistory();
      }
    } catch (error) {
      console.error('Failed to save query:', error);
    }
  };

  // ✅ FIXED: Proper useEffect with correct dependencies
  useEffect(() => {
    loadQueryBuilderContext();
    loadQueryHistory();
  }, [loadQueryBuilderContext, loadQueryHistory]);

  useEffect(() => {
    if (context?.available_schemas.length && !selectedSchema) {
      setSelectedSchema(context.available_schemas[0].model_id);
    }
  }, [context, selectedSchema]);

  useEffect(() => {
    if (selectedSchema && context) {
      generateAISuggestions();
    }
  }, [selectedSchema, context, generateAISuggestions]);

  const insertText = (text: string) => {
    if (sqlEditorRef.current) {
      const start = sqlEditorRef.current.selectionStart;
      const end = sqlEditorRef.current.selectionEnd;
      const newSql = sql.substring(0, start) + text + sql.substring(end);
      setSql(newSql);
      
      // Set cursor position after inserted text
      setTimeout(() => {
        if (sqlEditorRef.current) {
          sqlEditorRef.current.selectionStart = start + text.length;
          sqlEditorRef.current.selectionEnd = start + text.length;
          sqlEditorRef.current.focus();
        }
      }, 0);
    }
  };

  const insertColumn = (column: Column, tableName?: string) => {
    const columnRef = tableName ? `${tableName}.${column.name}` : column.name;
    insertText(columnRef);
  };

  const insertMetric = (metric: Metric) => {
    insertText(metric.sql);
  };

  const insertDimension = (dimension: Dimension) => {
    insertText(dimension.sql);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadResults = () => {
    if (!queryResult?.data.length) return;

    const headers = queryResult.columns.map(col => col.name);
    const csvContent = [
      headers.join(','),
      ...queryResult.data.map(row => 
        headers.map(header => `"${row[header] || ''}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_results_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatSQL = () => {
    // Basic SQL formatting
    const formatted = sql
      .replace(/\bSELECT\b/gi, '\nSELECT')
      .replace(/\bFROM\b/gi, '\nFROM')
      .replace(/\bWHERE\b/gi, '\nWHERE')
      .replace(/\bGROUP BY\b/gi, '\nGROUP BY')
      .replace(/\bORDER BY\b/gi, '\nORDER BY')
      .replace(/\bHAVING\b/gi, '\nHAVING')
      .replace(/\bJOIN\b/gi, '\nJOIN')
      .replace(/\bLEFT JOIN\b/gi, '\nLEFT JOIN')
      .replace(/\bRIGHT JOIN\b/gi, '\nRIGHT JOIN')
      .replace(/\bINNER JOIN\b/gi, '\nINNER JOIN')
      .trim();
    
    setSql(formatted);
  };

  const toggleTableExpansion = (tableName: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
    } else {
      newExpanded.add(tableName);
    }
    setExpandedTables(newExpanded);
  };

  const toggleSectionExpansion = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getCurrentSchema = (): SchemaInfo | undefined => {
    return context?.available_schemas.find(s => s.model_id === selectedSchema);
  };

  const filteredItems = (items: any[], searchTerm: string) => {
    if (!searchTerm) return items;
    return items.filter(item => 
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-lg text-gray-600 dark:text-gray-400">Loading query builder...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Schema Browser Sidebar */}
      <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Schema Browser
            </h3>
            <button
              onClick={loadQueryBuilderContext}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              title="Refresh schemas"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {/* Schema Selector */}
          {context?.available_schemas.length ? (
            <select
              value={selectedSchema}
              onChange={(e) => setSelectedSchema(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {context.available_schemas.map((schema) => (
                <option key={schema.model_id} value={schema.model_id}>
                  {schema.model_name}
                </option>
              ))}
            </select>
          ) : (
            <div className="text-center p-4 text-gray-500 dark:text-gray-400">
              <Database className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">No schemas available</p>
              <p className="text-xs">Upload data files to create schemas</p>
            </div>
          )}

          {/* Search */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tables, columns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
        </div>

        {/* Schema Content */}
        <div className="flex-1 overflow-y-auto">
          {getCurrentSchema() && (
            <div className="p-4 space-y-4">
              {/* Tables Section */}
              <div>
                <button
                  onClick={() => toggleSectionExpansion('tables')}
                  className="flex items-center justify-between w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
                >
                  <div className="flex items-center space-x-2">
                    <Table className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      Tables ({getCurrentSchema()?.tables.length || 0})
                    </span>
                  </div>
                  {expandedSections.has('tables') ? 
                    <ChevronDown className="h-4 w-4" /> : 
                    <ChevronRight className="h-4 w-4" />
                  }
                </button>
                
                {expandedSections.has('tables') && (
                  <div className="ml-6 space-y-2">
                    {filteredItems(getCurrentSchema()?.tables || [], searchTerm).map((table) => (
                      <div key={table.name} className="border border-gray-200 dark:border-gray-600 rounded">
                        <button
                          onClick={() => toggleTableExpansion(table.name)}
                          className="flex items-center justify-between w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <div className="flex items-center space-x-2">
                            <Database className="h-3 w-3 text-gray-500" />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {table.name}
                            </span>
                            {table.row_count && (
                              <span className="text-xs text-gray-500">
                                ({table.row_count} rows)
                              </span>
                            )}
                          </div>
                          {expandedTables.has(table.name) ? 
                            <ChevronDown className="h-3 w-3" /> : 
                            <ChevronRight className="h-3 w-3" />
                          }
                        </button>
                        
                        {expandedTables.has(table.name) && (
                          <div className="border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
                            {filteredItems(table.columns, searchTerm).map((column) => (
                              <button
                                key={column.name}
                                onClick={() => insertColumn(column, table.name)}
                                className="w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center justify-between group"
                              >
                                <div className="flex items-center space-x-2">
                                  <div className={`w-2 h-2 rounded-full ${
                                    column.type === 'string' ? 'bg-green-500' :
                                    column.type === 'number' || column.type === 'integer' ? 'bg-blue-500' :
                                    column.type === 'datetime' ? 'bg-purple-500' :
                                    'bg-gray-500'
                                  }`} />
                                  <span className="text-xs text-gray-700 dark:text-gray-300">
                                    {column.name}
                                  </span>
                                </div>
                                <span className="text-xs text-gray-500 opacity-0 group-hover:opacity-100">
                                  {column.type}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Metrics Section */}
              <div>
                <button
                  onClick={() => toggleSectionExpansion('metrics')}
                  className="flex items-center justify-between w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
                >
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      Metrics ({getCurrentSchema()?.metrics.length || 0})
                    </span>
                  </div>
                  {expandedSections.has('metrics') ? 
                    <ChevronDown className="h-4 w-4" /> : 
                    <ChevronRight className="h-4 w-4" />
                  }
                </button>
                
                {expandedSections.has('metrics') && (
                  <div className="ml-6 space-y-1">
                    {filteredItems(getCurrentSchema()?.metrics || [], searchTerm).map((metric) => (
                      <button
                        key={metric.name}
                        onClick={() => insertMetric(metric)}
                        className="w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 group"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {metric.title}
                            </div>
                            <div className="text-xs text-gray-500">
                              {metric.type} • {metric.format || 'number'}
                            </div>
                          </div>
                          <BarChart3 className="h-3 w-3 text-green-500 opacity-0 group-hover:opacity-100" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Dimensions Section */}
              <div>
                <button
                  onClick={() => toggleSectionExpansion('dimensions')}
                  className="flex items-center justify-between w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
                >
                  <div className="flex items-center space-x-2">
                    <Filter className="h-4 w-4 text-purple-600" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      Dimensions ({getCurrentSchema()?.dimensions.length || 0})
                    </span>
                  </div>
                  {expandedSections.has('dimensions') ? 
                    <ChevronDown className="h-4 w-4" /> : 
                    <ChevronRight className="h-4 w-4" />
                  }
                </button>
                
                {expandedSections.has('dimensions') && (
                  <div className="ml-6 space-y-1">
                    {filteredItems(getCurrentSchema()?.dimensions || [], searchTerm).map((dimension) => (
                      <button
                        key={dimension.name}
                        onClick={() => insertDimension(dimension)}
                        className="w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 group"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {dimension.title}
                            </div>
                            <div className="text-xs text-gray-500">
                              {dimension.type}
                            </div>
                          </div>
                          <Filter className="h-3 w-3 text-purple-500 opacity-0 group-hover:opacity-100" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* AI Suggestions */}
        {aiSuggestions.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                AI Suggestions
              </span>
            </div>
            <div className="space-y-1">
              {aiSuggestions.slice(0, 3).map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => generateQueryWithAI(suggestion)}
                  className="w-full text-left p-2 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded border border-gray-200 dark:border-gray-600"
                >
                  "{suggestion}"
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Query Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Enhanced Query Builder
              </h1>
              {getCurrentSchema() && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Schema: {getCurrentSchema()?.model_name}
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={formatSQL}
                className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Format
              </button>
              <button
                onClick={saveQuery}
                disabled={!sql.trim()}
                className="px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
              >
                <Save className="h-4 w-4" />
                <span>Save</span>
              </button>
              <button
                onClick={executeQuery}
                disabled={!sql.trim() || isExecuting}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Play className="h-4 w-4" />
                <span>{isExecuting ? 'Executing...' : 'Execute'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex space-x-8 px-4">
            {(['editor', 'results', 'history'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab}
                {tab === 'results' && queryResult && (
                  <span className="ml-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-xs">
                    {queryResult.row_count}
                  </span>
                )}
                {tab === 'history' && queryHistory.length > 0 && (
                  <span className="ml-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded-full text-xs">
                    {queryHistory.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'editor' && (
            <div className="h-full flex flex-col">
              {/* SQL Editor */}
              <div className="flex-1 p-4">
                <textarea
                  ref={sqlEditorRef}
                  value={sql}
                  onChange={(e) => setSql(e.target.value)}
                  placeholder="Enter your SQL query here... or click on tables, metrics, and dimensions to build your query"
                  className="w-full h-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  spellCheck={false}
                />
              </div>
              
              {/* Sample Queries */}
              {context?.sample_queries.length && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
                  <div className="flex items-center space-x-2 mb-2">
                    <BookOpen className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Sample Queries
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {context.sample_queries.slice(0, 5).map((query, index) => (
                      <button
                        key={index}
                        onClick={() => setSql(query)}
                        className="px-3 py-1 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
                      >
                        {query.substring(0, 50)}...
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'results' && (
            <div className="h-full flex flex-col">
              {queryResult ? (
                <>
                  {/* Results Header */}
                  <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <span className="font-medium text-gray-900 dark:text-white">
                            Query Successful
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {queryResult.row_count} rows • {queryResult.execution_time}ms
                          {queryResult.from_cache && ' • cached'}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => copyToClipboard(JSON.stringify(queryResult.data, null, 2))}
                          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                          title="Copy results as JSON"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          onClick={downloadResults}
                          className="px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 flex items-center space-x-1"
                        >
                          <Download className="h-4 w-4" />
                          <span>Download CSV</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Results Table */}
                  <div className="flex-1 overflow-auto p-4">
                    <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          {queryResult.columns.map((column) => (
                            <th
                              key={column.name}
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600"
                            >
                              {column.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                        {queryResult.data.map((row, index) => (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            {queryResult.columns.map((column) => (
                              <td
                                key={column.name}
                                className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white"
                              >
                                {row[column.name] !== null && row[column.name] !== undefined 
                                  ? String(row[column.name]) 
                                  : <span className="text-gray-400 italic">null</span>
                                }
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    <Eye className="h-12 w-12 mx-auto mb-4" />
                    <p className="text-lg font-medium">No Results Yet</p>
                    <p className="text-sm">Execute a query to see results here</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="h-full overflow-y-auto p-4">
              {queryHistory.length > 0 ? (
                <div className="space-y-4">
                  {queryHistory.map((query, index) => (
                    <div
                      key={query.id || index}
                      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Code className="h-4 w-4 text-gray-500" />
                          <span className="font-medium text-gray-900 dark:text-white">
                            {query.name || 'Untitled Query'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                          <span>{new Date(query.created_at).toLocaleDateString()}</span>
                          <button
                            onClick={() => setSql(query.sql_query)}
                            className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs hover:bg-blue-200 dark:hover:bg-blue-800"
                          >
                            Load
                          </button>
                        </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded p-3">
                        <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap overflow-x-auto">
                          {query.sql_query}
                        </pre>
                      </div>
                      {query.execution_time && (
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          Executed in {query.execution_time}ms • {query.row_count || 0} rows
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    <BookOpen className="h-12 w-12 mx-auto mb-4" />
                    <p className="text-lg font-medium">No Query History</p>
                    <p className="text-sm">Your executed queries will appear here</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedQueryBuilder;