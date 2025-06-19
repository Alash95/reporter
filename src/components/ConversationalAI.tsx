// src/components/EnhancedConversationalAI.tsx - Updated with full data source integration

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Copy, 
  Play, 
  BarChart3, 
  Database,
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Code,
  TrendingUp,
  FileText,
  Download
} from 'lucide-react';
import { useAuthenticatedFetch } from '../contexts/AuthContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    query?: string;
    data?: any[];
    chart?: any;
    insights?: string[];
    analysis?: any;
    data_sources_used?: string[];
    error?: string;
  };
}

interface DataSource {
  source_id: string;
  source_name: string;
  source_type: string;
  data_type: string;
  schema: any;
  semantic_model_id?: string;
  status: string;
}

interface ConversationContext {
  available_data_sources: DataSource[];
  recent_queries: string[];
  suggested_questions: string[];
  current_session_data?: any;
}

const EnhancedConversationalAI: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [context, setContext] = useState<ConversationContext | null>(null);
  const [selectedDataSources, setSelectedDataSources] = useState<string[]>([]);
  const [isContextLoading, setIsContextLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ✅ FIXED: Properly call the hook to get the authenticatedFetch function
  const authenticatedFetch = useAuthenticatedFetch();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ✅ FIXED: Moved all functions that use authenticatedFetch after the hook call
  const initializeConversation = useCallback(async () => {
    try {
      setIsContextLoading(true);
      
      // Load conversational AI context
      const contextResponse = await authenticatedFetch('http://localhost:8000/api/integration/context/conversational-ai');
      if (contextResponse.ok) {
        const contextData = await contextResponse.json();
        setContext(contextData);
        
        // Set all data sources as selected by default
        setSelectedDataSources(contextData.available_data_sources.map((ds: DataSource) => ds.source_id));
      }

      // Set welcome message
      const welcomeMessage: Message = {
        id: 'welcome',
        role: 'assistant',
        content: `🎉 **Welcome to Enhanced AI Analytics!**

I'm your AI assistant with full access to your uploaded data sources. I can help you:

📊 **Smart Data Analysis** - Ask questions and get instant insights
🔍 **Intelligent Queries** - Generate SQL automatically from natural language  
📈 **Auto Visualizations** - Create charts and graphs with simple requests
💡 **AI Insights** - Discover patterns and trends in your data
🤝 **Seamless Integration** - Work across Query Builder, Dashboard Builder, and more

**Your Data Sources:**
${context?.available_data_sources.length ? 
  context.available_data_sources.map(ds => `• ${ds.source_name} (${ds.data_type})`).join('\n') :
  '• No data sources yet - upload a file to get started!'
}

**Try asking:**
${context?.suggested_questions.slice(0, 3).map(q => `• "${q}"`).join('\n') || 
  '• "Show me a summary of my data"\n• "Create a chart from my latest file"\n• "What insights can you find?"'}

What would you like to explore today?`,
        timestamp: new Date()
      };

      setMessages([welcomeMessage]);
    } catch (error) {
      console.error('Failed to initialize conversation:', error);
      setMessages([{
        id: 'error',
        role: 'assistant',
        content: 'Welcome! I had trouble loading your data sources, but I can still help you. Try uploading a data file first.',
        timestamp: new Date()
      }]);
    } finally {
      setIsContextLoading(false);
    }
  }, [authenticatedFetch, context?.available_data_sources, context?.suggested_questions]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      // Send message to enhanced conversational AI endpoint
      const response = await authenticatedFetch('http://localhost:8000/api/ai/conversation-enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentInput,
          context: {
            available_data_sources: selectedDataSources,
            conversation_history: messages.slice(-5), // Last 5 messages for context
            user_preferences: {
              preferred_chart_types: ['bar', 'line', 'pie'],
              detail_level: 'standard'
            }
          }
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.response,
          timestamp: new Date(),
          metadata: {
            query: result.generated_query,
            chart: result.suggested_chart,
            data: result.data,
            insights: result.insights,
            analysis: result.analysis,
            data_sources_used: result.data_sources_used
          }
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error('Failed to get AI response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I apologize, but I encountered an error processing your request. 

🔄 **What you can try:**
• Refresh the conversation context
• Check if your data sources are properly loaded
• Rephrase your question
• Try a simpler request first

**Quick suggestions:**
• "Show me my available data"
• "Summarize my latest file" 
• "Help me get started"

Would you like me to refresh the data context?`,
        timestamp: new Date(),
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const executeQuery = async (sql: string) => {
    try {
      const response = await authenticatedFetch('http://localhost:8000/api/queries/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sql: sql,
          use_cache: true
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        const resultMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `✅ **Query executed successfully!**

**Results:** ${result.row_count} rows in ${result.execution_time}ms
${result.from_cache ? '📋 (Results from cache)' : '🔄 (Fresh results)'}

The query has been executed and results are available in the Query Builder.`,
          timestamp: new Date(),
          metadata: {
            data: result.data,
            query: sql
          }
        };

        setMessages(prev => [...prev, resultMessage]);
      }
    } catch (error) {
      console.error('Failed to execute query:', error);
    }
  };

  const createDashboard = async (chartConfig: any) => {
    try {
      const response = await authenticatedFetch('http://localhost:8000/api/dashboards/quick-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `AI Generated Dashboard - ${new Date().toLocaleDateString()}`,
          description: 'Dashboard created from conversational AI',
          chart_config: chartConfig,
          data_sources: selectedDataSources
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        const dashboardMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `🎨 **Dashboard created successfully!**

**Dashboard Name:** ${result.dashboard_name}
**Chart Type:** ${chartConfig.type}
**Data Source:** ${chartConfig.data_source_id}

Your dashboard is ready! You can view and customize it in the Dashboard Builder.`,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, dashboardMessage]);
      }
    } catch (error) {
      console.error('Failed to create dashboard:', error);
    }
  };

  const refreshContext = async () => {
    setIsContextLoading(true);
    await initializeConversation();
  };

  // ✅ FIXED: Proper useEffect with correct dependencies
  useEffect(() => {
    initializeConversation();
  }, [initializeConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadData = (data: any[], filename: string = 'ai_analysis_data.csv') => {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleDataSource = (sourceId: string) => {
    setSelectedDataSources(prev => 
      prev.includes(sourceId) 
        ? prev.filter(id => id !== sourceId)
        : [...prev, sourceId]
    );
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Data Sources Sidebar */}
      <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Data Sources
            </h3>
            <button
              onClick={refreshContext}
              disabled={isContextLoading}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
              title="Refresh data sources"
            >
              <RefreshCw className={`h-4 w-4 ${isContextLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          {context?.available_data_sources.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400 p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center">
              <Database className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No data sources available</p>
              <p className="text-xs mt-1">Upload files to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {context?.available_data_sources.map((source) => (
                <div
                  key={source.source_id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedDataSources.includes(source.source_id)
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  }`}
                  onClick={() => toggleDataSource(source.source_id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {source.source_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {source.data_type} • {source.schema?.row_count || 0} rows
                      </p>
                    </div>
                    <div className="flex items-center space-x-1">
                      {source.status === 'available' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                      )}
                      {selectedDataSources.includes(source.source_id) && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                  </div>
                  
                  {source.schema?.columns && (
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>Columns: </span>
                      {source.schema.columns.slice(0, 3).map((col: any) => col.name).join(', ')}
                      {source.schema.columns.length > 3 && ` +${source.schema.columns.length - 3} more`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="p-4 space-y-2">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Quick Actions</h4>
          
          {context?.suggested_questions.slice(0, 4).map((question, index) => (
            <button
              key={index}
              onClick={() => setInput(question)}
              className="w-full text-left p-2 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded border border-gray-200 dark:border-gray-600"
            >
              "{question}"
            </button>
          ))}
        </div>

        {/* Context Info */}
        <div className="p-4 mt-auto border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <div className="flex items-center justify-between">
              <span>Active Sources:</span>
              <span className="font-medium">{selectedDataSources.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>AI Status:</span>
              <span className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Ready</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Enhanced AI Analytics
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Intelligent data analysis with {selectedDataSources.length} active sources
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex space-x-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              )}
              
              <div className={`flex-1 max-w-4xl ${message.role === 'user' ? 'text-right' : ''}`}>
                <div className={`inline-block px-4 py-3 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                }`}>
                  <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                    {message.content}
                  </div>
                </div>
                
                {/* Enhanced Metadata Display */}
                {message.metadata && (
                  <div className="mt-4 space-y-4">
                    {/* Generated Query */}
                    {message.metadata.query && (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Code className="h-4 w-4 text-gray-500" />
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                              Generated SQL Query
                            </h4>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => copyToClipboard(message.metadata!.query!)}
                              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                              title="Copy query"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => executeQuery(message.metadata!.query!)}
                              className="p-1 text-green-600 hover:text-green-700 dark:text-green-400"
                              title="Execute in Query Builder"
                            >
                              <Play className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div className="p-4">
                          <pre className="text-sm bg-gray-100 dark:bg-gray-900 p-3 rounded overflow-x-auto">
                            <code>{message.metadata.query}</code>
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Chart Suggestion */}
                    {message.metadata.chart && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 overflow-hidden">
                        <div className="px-4 py-3 border-b border-blue-200 dark:border-blue-700 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <BarChart3 className="h-4 w-4 text-blue-600" />
                            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                              Suggested Visualization
                            </h4>
                          </div>
                          <button
                            onClick={() => createDashboard(message.metadata!.chart)}
                            className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                          >
                            Create Dashboard
                          </button>
                        </div>
                        <div className="p-4">
                          <div className="text-sm space-y-2">
                            <p><strong>Chart Type:</strong> {message.metadata.chart.type}</p>
                            <p><strong>Title:</strong> {message.metadata.chart.title}</p>
                            {message.metadata.chart.x_axis && (
                              <p><strong>X-Axis:</strong> {message.metadata.chart.x_axis}</p>
                            )}
                            {message.metadata.chart.y_axis && (
                              <p><strong>Y-Axis:</strong> {message.metadata.chart.y_axis}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Data Results */}
                    {message.metadata.data && message.metadata.data.length > 0 && (
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700 overflow-hidden">
                        <div className="px-4 py-3 border-b border-green-200 dark:border-green-700 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-green-600" />
                            <h4 className="text-sm font-medium text-green-900 dark:text-green-100">
                              Data Results ({message.metadata.data.length} rows)
                            </h4>
                          </div>
                          <button
                            onClick={() => downloadData(message.metadata!.data!, `ai_results_${Date.now()}.csv`)}
                            className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                          >
                            <Download className="h-3 w-3" />
                            <span>Download CSV</span>
                          </button>
                        </div>
                        <div className="p-4 overflow-x-auto">
                          <table className="min-w-full text-xs">
                            <thead>
                              <tr className="border-b">
                                {Object.keys(message.metadata.data[0]).map((header) => (
                                  <th key={header} className="text-left p-2 font-medium">
                                    {header}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {message.metadata.data.slice(0, 5).map((row, index) => (
                                <tr key={index} className="border-b">
                                  {Object.values(row).map((value, cellIndex) => (
                                    <td key={cellIndex} className="p-2">
                                      {String(value)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {message.metadata.data.length > 5 && (
                            <p className="text-xs text-gray-500 mt-2">
                              ... and {message.metadata.data.length - 5} more rows
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Insights */}
                    {message.metadata.insights && message.metadata.insights.length > 0 && (
                      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700 p-4">
                        <div className="flex items-center space-x-2 mb-3">
                          <TrendingUp className="h-4 w-4 text-purple-600" />
                          <h4 className="text-sm font-medium text-purple-900 dark:text-purple-100">
                            AI Insights
                          </h4>
                        </div>
                        <ul className="text-sm space-y-1 text-purple-800 dark:text-purple-200">
                          {message.metadata.insights.map((insight, index) => (
                            <li key={index} className="flex items-start space-x-2">
                              <span className="text-purple-500 mt-1">•</span>
                              <span>{insight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Data Sources Used */}
                    {message.metadata.data_sources_used && message.metadata.data_sources_used.length > 0 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-2">
                        <Database className="h-3 w-3" />
                        <span>
                          Used data sources: {message.metadata.data_sources_used.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {message.role === 'user' && (
                <div className="flex-shrink-0 p-2 bg-blue-500 rounded-full">
                  <User className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex space-x-3">
              <div className="flex-shrink-0 p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">AI is analyzing...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex space-x-4">
            <div className="flex-1">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about your data... (Shift+Enter for new line)"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                rows={3}
                disabled={isLoading}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Send className="h-4 w-4" />
              <span>Send</span>
            </button>
          </div>
          
          {selectedDataSources.length > 0 && (
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Active sources: {selectedDataSources.length} • AI-powered analysis enabled
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedConversationalAI;