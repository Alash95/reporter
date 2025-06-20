// src/components/ConversationalAI.tsx - FIXED VERSION
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthenticatedFetch } from '../contexts/AuthContext';
import { useIntegration } from '../contexts/IntegrationContext';
import { useRefreshManager } from '../hooks/useRefreshManager';
import { 
  Send, 
  RefreshCw, 
  Download, 
  Copy, 
  Database, 
  FileText, 
  Bot,
  User
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    data?: any[];
    query?: string;
    error?: string;
    chart_config?: any;
  };
// interface Message {
//   id: string;
//   role: 'user' | 'assistant';
//   content: string;
//   timestamp: Date;
//   metadata?: {
//     data?: any[];
//     query?: string;
//     error?: string;
//     chart_config?: any;
//   };
}

interface DataSource {
  id: string;
  name: string;
  type: string;
  status: string;
  metadata: any;
}

interface ConversationContext {
  available_data_sources: DataSource[];
  recent_queries: any[];
  user_preferences: any;
}

const ConversationalAI: React.FC = () => {
  const authenticatedFetch = useAuthenticatedFetch();
  const { actions } = useIntegration();
  const refreshManager = useRefreshManager();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [context, setContext] = useState<ConversationContext | null>(null);
  const [isContextLoading, setIsContextLoading] = useState(false);
  const [selectedDataSources, setSelectedDataSources] = useState<string[]>([]);

  // FIXED: Use refs to prevent unnecessary re-renders and manage state properly
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mountedRef = useRef<boolean>(true);
  const contextLoadedRef = useRef<boolean>(false);

  // FIXED: Stable function that doesn't recreate on every render
  const initializeConversation = useCallback(async () => {
    if (!mountedRef.current || contextLoadedRef.current) return;

    setIsContextLoading(true);
    
    try {
      const response = await authenticatedFetch('http://localhost:8000/api/conversational-ai/context');
      
      if (response.ok && mountedRef.current) {
        const contextData = await response.json();
        setContext(contextData);
        contextLoadedRef.current = true;

        // Auto-select all available data sources
        const sourceIds = contextData.available_data_sources?.map((source: DataSource) => source.id) || [];
        setSelectedDataSources(sourceIds);

        // Add welcome message only if no messages exist
        if (messages.length === 0) {
          const welcomeMessage: Message = {
            id: 'welcome',
            role: 'assistant',
            content: `👋 **Welcome to AI Analytics!**

I'm here to help you analyze your data and answer questions. Here's what I can do:

🔍 **Query your data** - Ask questions in natural language
📊 **Create visualizations** - Generate charts and dashboards
📈 **Provide insights** - Analyze trends and patterns
🤖 **Execute SQL** - Run complex database queries

**Available data sources:** ${contextData.available_data_sources?.length || 0}

Try asking something like:
• "Show me sales trends for the last quarter"
• "What are the top performing products?"
• "Create a dashboard showing customer demographics"

What would you like to explore?`,
            timestamp: new Date()
          };
          
          setMessages([welcomeMessage]);
        }
      }
    } catch (error) {
      console.error('Failed to initialize conversation:', error);
      if (mountedRef.current) {
        const errorMessage: Message = {
          id: 'init_error',
          role: 'assistant',
          content: `❌ **Connection Error**

I'm having trouble connecting to the data sources. This could be due to:
• Network connectivity issues
• Server maintenance
• Authentication problems

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

        setMessages([errorMessage]);
      }
    } finally {
      if (mountedRef.current) {
        setIsContextLoading(false);
      }
    }
  }, [authenticatedFetch, messages.length]); // FIXED: Only depend on essential values

  // FIXED: Proper useEffect with correct dependencies and cleanup
  useEffect(() => {
    mountedRef.current = true;
    contextLoadedRef.current = false;

    // Initialize conversation
    initializeConversation();

    // Register with refresh manager for context updates
    refreshManager.register('conversational-ai-context', async () => {
      if (mountedRef.current && !isContextLoading) {
        await initializeConversation();
      }
    }, {
      interval: 120000, // 2 minutes
      enabled: true,
      minInterval: 30000, // Don't refresh more than once every 30 seconds
      maxRetries: 3
    });

    return () => {
      mountedRef.current = false;
      contextLoadedRef.current = false;
      refreshManager.unregister('conversational-ai-context');
    };
  }, []); // Empty dependency array

  // FIXED: Separate useEffect for scrolling to prevent loops
  useEffect(() => {
    scrollToBottom();
  }, [messages.length]); // Only scroll when message count changes

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const sendMessage = useCallback(async () => {
    if (!inputMessage.trim() || isLoading || !mountedRef.current) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await authenticatedFetch('http://localhost:8000/api/conversational-ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          context: {
            selected_data_sources: selectedDataSources,
            conversation_history: messages.slice(-5) // Last 5 messages for context
          }
        }),
      });

      if (response.ok && mountedRef.current) {
        const result = await response.json();
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.response,
          timestamp: new Date(),
          metadata: {
            data: result.data,
            query: result.generated_sql,
            chart_config: result.chart_config
          }
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Handle special actions based on response type
        if (result.action === 'execute_query' && result.generated_sql) {
          await executeQuery(result.generated_sql);
        }

        if (result.action === 'create_dashboard' && result.chart_config) {
          await createDashboard(result.chart_config);
        }
      } else {
        throw new Error('Failed to get AI response');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      
      if (mountedRef.current) {
        const errorMessage: Message = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: `❌ **I encountered an error while processing your request.**

${error instanceof Error ? error.message : 'Unknown error occurred'}

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
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [inputMessage, isLoading, selectedDataSources, messages, authenticatedFetch]);

  const executeQuery = useCallback(async (sql: string) => {
    if (!mountedRef.current) return;

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

      if (response.ok && mountedRef.current) {
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
  }, [authenticatedFetch]);

  const createDashboard = useCallback(async (chartConfig: any) => {
    if (!mountedRef.current) return;

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

      if (response.ok && mountedRef.current) {
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
  }, [authenticatedFetch, selectedDataSources]);

  const refreshContext = useCallback(async () => {
    if (!mountedRef.current) return;
    
    setIsContextLoading(true);
    contextLoadedRef.current = false;
    await refreshManager.refresh('conversational-ai-context', true);
  }, [refreshManager]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      actions.addNotification({
        type: 'success',
        title: 'Copied',
        message: 'Text copied to clipboard'
      });
    });
  }, [actions]);

  const downloadData = useCallback((data: any[] | undefined, filename: string = 'ai_analysis_data.csv') => {
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
  }, []);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  const toggleDataSource = useCallback((sourceId: string) => {
    setSelectedDataSources(prev => 
      prev.includes(sourceId) 
        ? prev.filter(id => id !== sourceId)
        : [...prev, sourceId]
    );
  }, []);

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
          
          {!context || context.available_data_sources.length === 0 ? (
            <div className="text-center py-8">
              <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No data sources available</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Upload files to get started
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {context.available_data_sources.map((source) => (
                <div key={source.id} className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <input
                    type="checkbox"
                    checked={selectedDataSources.includes(source.id)}
                    onChange={() => toggleDataSource(source.id)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {source.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {source.type} • {source.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Context Information */}
        <div className="flex-1 p-4 overflow-y-auto">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Quick Actions
          </h4>
          <div className="space-y-2">
            {[
              "Show me my data summary",
              "What are the latest trends?",
              "Create a sales dashboard",
              "Analyze customer behavior",
              "Show top performing products"
            ].map((suggestion, index) => (
              <button
                key={index}
                onClick={() => setInputMessage(suggestion)}
                className="w-full text-left p-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                AI Analytics Assistant
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedDataSources.length} data source{selectedDataSources.length !== 1 ? 's' : ''} selected
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {isLoading && (
                <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-3xl ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                <div className="flex items-start space-x-3">
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                  )}
                  
                  <div className={`flex-1 ${message.role === 'user' ? 'order-1' : 'order-2'}`}>
                    <div className={`p-4 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                    }`}>
                      <div className="whitespace-pre-wrap">
                        {message.content}
                      </div>
                      
                      {/* Message Actions */}
                      {message.role === 'assistant' && (
                        <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <button
                            onClick={() => copyToClipboard(message.content)}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            title="Copy message"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          
                          {message.metadata?.data? (
                            <button
                              onClick={() => downloadData(message.metadata?.data, `ai_data_${message.id}.csv`)}
                              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              title="Download data"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          ):""}
                          {/* {message.metadata?.data && (
                            <button
                              onClick={() => downloadData(message?.metadata?.data, `ai_data_${message.id}.csv`)}
                              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              title="Download data"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          )} */}
                          
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                            {message.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {message.role === 'user' && (
                    <div className="flex-shrink-0 order-2">
                      <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                    <span className="text-gray-600 dark:text-gray-400">AI is thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about your data..."
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={3}
                disabled={isLoading}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
          
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span>Press Enter to send, Shift+Enter for new line</span>
            {selectedDataSources.length > 0 && (
              <span>{selectedDataSources.length} data source{selectedDataSources.length !== 1 ? 's' : ''} active</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversationalAI;  