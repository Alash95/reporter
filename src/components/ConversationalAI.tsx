import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Send, Bot, User, Sparkles, Clock, Copy, Download, BarChart3 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Plot from 'react-plotly.js';

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
  };
}

const ConversationalAI: React.FC = () => {
  const { token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hello! I'm your AI Analytics Assistant. I can help you:

📊 **Analyze your uploaded data** - Ask questions about trends, patterns, and insights
🔍 **Generate SQL queries** - Convert natural language to optimized queries  
📈 **Create visualizations** - Automatically generate charts and graphs
💡 **Provide insights** - Get AI-powered recommendations and summaries

Try asking me something like:
- "Show me the sales trend over the last 6 months"
- "What are the top performing products?"
- "Create a chart comparing revenue by region"
- "Analyze customer segments and their behavior"

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
      const response = await fetch('http://localhost:8000/api/files/', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const files = await response.json();
      setAvailableData(files.filter((f: any) => f.processing_status === 'completed'));
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
    setInput('');
    setIsLoading(true);

    try {
      // Send to AI assistant
      const response = await fetch('http://localhost:8000/api/ai/conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: input,
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
            insights: result.insights
          }
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error('Failed to get AI response');
      }
    } catch (error) {
      // Fallback response
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I apologize, but I'm having trouble processing your request right now. Here are some things you can try:

🔄 **Refresh and try again** - Sometimes a simple refresh helps
📁 **Check your data** - Make sure you have uploaded and processed data files
💬 **Rephrase your question** - Try asking in a different way
🛠️ **Use the Query Builder** - For complex queries, try the manual query builder

Is there anything specific about your data you'd like to explore?`,
        timestamp: new Date()
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

  const suggestedQuestions = [
    "What are the key trends in my data?",
    "Show me a summary of sales performance",
    "Create a chart of revenue by month",
    "What insights can you find in my customer data?",
    "Compare performance across different regions",
    "Identify any anomalies or outliers"
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
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
        
        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <div className="h-2 w-2 bg-green-500 rounded-full"></div>
          <span>AI Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                  }`}>
                    {message.role === 'assistant' ? (
                      <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none">
                        {message.content}
                      </ReactMarkdown>
                    ) : (
                      <p className="text-sm">{message.content}</p>
                    )}
                  </div>
                  
                  {/* Metadata (Charts, Queries, etc.) */}
                  {message.metadata && (
                    <div className="mt-4 space-y-4">
                      {/* Generated Query */}
                      {message.metadata.query && (
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                              Generated SQL Query
                            </h4>
                            <button
                              onClick={() => copyToClipboard(message.metadata!.query!)}
                              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                          <pre className="p-4 text-sm bg-gray-900 text-green-400 overflow-x-auto">
                            {message.metadata.query}
                          </pre>
                        </div>
                      )}
                      
                      {/* Chart */}
                      {message.metadata.chart && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                          <Plot
                            data={message.metadata.chart.data}
                            layout={{
                              ...message.metadata.chart.layout,
                              autosize: true,
                              paper_bgcolor: 'transparent',
                              plot_bgcolor: 'transparent'
                            }}
                            style={{ width: '100%', height: '400px' }}
                            config={{ responsive: true }}
                          />
                        </div>
                      )}
                      
                      {/* Data Table */}
                      {message.metadata.data && message.metadata.data.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                              Data Results ({message.metadata.data.length} rows)
                            </h4>
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
                          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                            💡 Key Insights
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
                  <div className="inline-block px-4 py-3 rounded-2xl bg-gray-100 dark:bg-gray-700">
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
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
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
      <div className="p-6 border-t border-gray-200 dark:border-gray-700">
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