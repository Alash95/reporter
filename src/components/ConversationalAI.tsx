import React, { useState, useEffect, useRef } from 'react';
import { useAuthenticatedFetch } from '../contexts/AuthContext';
import { Send, Bot, User, Sparkles, Clock, Copy, Download, Code, FileText } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    query?: string;
    chart?: any;
    data?: any[];
    insights?: string[];
    visualizations?: any[];
    analysis?: any;
  };
}

const ConversationalAI: React.FC = () => {
  const authenticatedFetch = useAuthenticatedFetch();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hello! I'm your AI Analytics Assistant. I can help you:

📊 **Analyze your uploaded data** - Ask questions about trends, patterns, and insights
🔍 **Generate SQL queries** - Convert natural language to optimized queries  
📈 **Create visualizations** - Automatically generate charts and graphs
💡 **Provide insights** - Get AI-powered recommendations and summaries
🤖 **Conversational analysis** - Have natural conversations about your data

Try asking me something like:
- "Show me the sales trend over the last 6 months"
- "What are the top performing products?"
- "Create a chart comparing revenue by region"
- "Analyze customer segments and their behavior"
- "Generate insights from my latest uploaded file"

What would you like to explore today?`,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [availableData, setAvailableData] = useState([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAvailableData();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchAvailableData = async () => {
    try {
      const response = await authenticatedFetch('http://localhost:8000/api/files/');
      if (response.ok) {
        const files = await response.json();
        setAvailableData(files.filter((f: any) => f.processing_status === 'completed'));
      }
    } catch (error) {
      console.error('Failed to fetch available data:', error);
    }
  };

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
      // Check if the input looks like it's asking for SQL generation
      const isQueryRequest = /\b(query|sql|select|show|get|find|list|count|sum|average|max|min)\b/i.test(currentInput);
      
      if (isQueryRequest) {
        // Try to generate a SQL query first
        const queryResponse = await authenticatedFetch('http://localhost:8000/api/ai/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: currentInput,
            model_id: 'ecommerce'
          }),
        });

        if (queryResponse.ok) {
          const queryResult = await queryResponse.json();
          
          // Execute the generated query
          const executeResponse = await authenticatedFetch('http://localhost:8000/api/queries/execute', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sql: queryResult.sql,
              model_id: 'ecommerce'
            }),
          });

          if (executeResponse.ok) {
            const executeResult = await executeResponse.json();
            
            const assistantMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: `I've generated and executed a SQL query based on your request. Here are the results:

**Query Explanation:** ${queryResult.explanation}

The query returned ${executeResult.row_count} rows in ${executeResult.execution_time}ms.`,
              timestamp: new Date(),
              metadata: {
                query: queryResult.sql,
                data: executeResult.data,
                insights: [`Query executed successfully with ${executeResult.row_count} results`, `Execution time: ${executeResult.execution_time}ms`]
              }
            };

            setMessages(prev => [...prev, assistantMessage]);
          } else {
            throw new Error('Failed to execute query');
          }
        } else {
          throw new Error('Failed to generate query');
        }
      } else {
        // Use conversational AI
        const response = await authenticatedFetch('http://localhost:8000/api/ai/conversation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: currentInput,
            context: {
              available_data: availableData,
              conversation_history: messages.slice(-5) // Last 5 messages for context
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
              analysis: result.analysis
            }
          };

          setMessages(prev => [...prev, assistantMessage]);
        } else {
          throw new Error('Failed to get AI response');
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Fallback response with helpful suggestions
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I apologize, but I'm having trouble processing your request right now. Here are some things you can try:

🔄 **Try again** - Sometimes a simple retry helps
📁 **Check your data** - Make sure you have uploaded and processed data files
💬 **Rephrase your question** - Try asking in a different way
🛠️ **Use specific requests** - Try queries like:
   - "Show me my data summary"
   - "Generate a revenue chart" 
   - "What insights can you find in my data?"

**Available data sources:** ${availableData.length} file(s) uploaded

Would you like me to help you explore any specific aspect of your data?`,
        timestamp: new Date(),
        metadata: {
          insights: [
            `You have ${availableData.length} data files available`,
            'Try being more specific in your questions',
            'I can help with SQL queries, data analysis, and visualizations'
          ]
        }
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadData = (data: any[], filename: string) => {
    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const executeQuery = async (sql: string) => {
    try {
      const response = await authenticatedFetch('http://localhost:8000/api/queries/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sql,
          model_id: 'ecommerce'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        const resultMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Query executed successfully! Returned ${result.row_count} rows in ${result.execution_time}ms.`,
          timestamp: new Date(),
          metadata: {
            data: result.data,
            insights: [`${result.row_count} rows returned`, `Execution time: ${result.execution_time}ms`]
          }
        };

        setMessages(prev => [...prev, resultMessage]);
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Query execution failed');
      }
    } catch (error) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Failed to execute query: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const suggestedQuestions = [
    "What are the key trends in my data?",
    "Show me a summary of performance metrics",
    "Create a chart showing monthly trends",
    "What insights can you find in my customer data?",
    "Compare performance across different categories",
    "Find any anomalies or outliers in the data"
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              AI Analytics Assistant
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Conversational data analysis and insights
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {availableData.length} data source(s) available
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
            <span>AI Online</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50 dark:bg-gray-900">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-4xl ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
              <div className={`flex items-start space-x-3 ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === 'user' 
                    ? 'bg-blue-500' 
                    : 'bg-gradient-to-r from-purple-500 to-pink-500'
                }`}>
                  {message.role === 'user' ? (
                    <User className="h-4 w-4 text-white" />
                  ) : (
                    <Bot className="h-4 w-4 text-white" />
                  )}
                </div>
                
                <div className={`flex-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                  <div className={`inline-block px-4 py-3 rounded-2xl max-w-none ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                  }`}>
                    <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                      {message.content}
                    </div>
                  </div>
                  
                  {/* Metadata (Charts, Queries, etc.) */}
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
                                className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                              >
                                Execute
                              </button>
                            </div>
                          </div>
                          <pre className="p-4 text-sm bg-gray-900 text-green-400 overflow-x-auto">
                            {message.metadata.query}
                          </pre>
                        </div>
                      )}
                      
                      {/* Data Table */}
                      {message.metadata.data && message.metadata.data.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <FileText className="h-4 w-4 text-gray-500" />
                              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                Data Results ({message.metadata.data.length} rows)
                              </h4>
                            </div>
                            <button
                              onClick={() => downloadData(message.metadata!.data!, 'query-results')}
                              className="flex items-center space-x-1 px-2 py-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                              <Download className="h-4 w-4" />
                              <span>Download</span>
                            </button>
                          </div>
                          <div className="overflow-x-auto max-h-64">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                              <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                  {Object.keys(message.metadata.data[0]).map((key) => (
                                    <th
                                      key={key}
                                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                                    >
                                      {key}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {message.metadata.data.slice(0, 10).map((row: any, index: number) => (
                                  <tr key={index}>
                                    {Object.values(row).map((value: any, cellIndex: number) => (
                                      <td
                                        key={cellIndex}
                                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
                                      >
                                        {typeof value === 'number' ? value.toLocaleString() : String(value)}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                      
                      {/* Insights */}
                      {message.metadata.insights && message.metadata.insights.length > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
                          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2 flex items-center space-x-2">
                            <Sparkles className="h-4 w-4" />
                            <span>Key Insights</span>
                          </h4>
                          <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                            {message.metadata.insights.map((insight, index) => (
                              <li key={index} className="flex items-start space-x-2">
                                <span className="text-blue-500">•</span>
                                <span>{insight}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <Clock className="h-3 w-3" />
                    <span>{message.timestamp.toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-4xl">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-r from-purple-500 to-pink-500">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="inline-block px-4 py-3 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      {messages.length === 1 && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Try these sample questions:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => setInput(question)}
                className="px-3 py-2 text-sm bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/75 transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex space-x-4">
          <div className="flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your data..."
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              rows={1}
              disabled={isLoading}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Send className="h-4 w-4" />
            <span>Send</span>
          </button>
        </div>
        
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span>{availableData.length} data source(s) available</span>
        </div>
      </div>
    </div>
  );
};

export default ConversationalAI;