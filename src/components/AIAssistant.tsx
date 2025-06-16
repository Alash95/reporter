import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Send, Bot, User, Sparkles, Clock, Copy } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  query?: {
    sql: string;
    explanation: string;
    confidence: number;
  };
}

const AIAssistant: React.FC = () => {
  const { token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hello! I\'m your AI Analytics Assistant. I can help you generate SQL queries from natural language. Try asking me something like "Show me monthly revenue for 2024" or "What are the top performing customer segments?"',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/ai/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: input,
          model: 'ecommerce'
        }),
      });

      const queryResult = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'I\'ve generated a SQL query based on your request. Here\'s what it does:',
        timestamp: new Date(),
        query: queryResult
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'I apologize, but I encountered an error while processing your request. Please try again or rephrase your question.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyQuery = (sql: string) => {
    navigator.clipboard.writeText(sql);
  };

  const executeQuery = async (sql: string) => {
    try {
      const response = await fetch('http://localhost:8000/api/query/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          sql,
          model: 'ecommerce'
        }),
      });

      const result = await response.json();

      const resultMessage: Message = {
        id: Date.now().toString(),
        type: 'assistant',
        content: `Query executed successfully! Returned ${result.rowCount} rows in ${result.executionTime}ms.`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, resultMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'assistant',
        content: 'Failed to execute the query. Please check the SQL syntax and try again.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const suggestedPrompts = [
    "Show me monthly revenue trends for the last year",
    "What are the top performing customer segments?",
    "Compare revenue by region",
    "Show me customer acquisition trends"
  ];

  return (
    <div className="p-6 h-[calc(100vh-120px)] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          AI Analytics Assistant
        </h1>
        <div className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Powered by AI
          </span>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-3xl ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                <div className={`flex items-start space-x-3 ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.type === 'user' 
                      ? 'bg-blue-500' 
                      : 'bg-gradient-to-r from-purple-500 to-pink-500'
                  }`}>
                    {message.type === 'user' ? (
                      <User className="h-4 w-4 text-white" />
                    ) : (
                      <Bot className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <div className={`flex-1 ${message.type === 'user' ? 'text-right' : ''}`}>
                    <div className={`inline-block px-4 py-3 rounded-2xl ${
                      message.type === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                    }`}>
                      <p className="text-sm">{message.content}</p>
                    </div>
                    
                    {message.query && (
                      <div className="mt-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                              Generated SQL Query
                            </h4>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                message.query.confidence >= 0.8 
                                  ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                                  : message.query.confidence >= 0.6
                                  ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                                  : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                              }`}>
                                {Math.round(message.query.confidence * 100)}% confidence
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="p-4">
                          <pre className="text-sm bg-gray-900 text-green-400 p-3 rounded-lg overflow-x-auto">
                            {message.query.sql}
                          </pre>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                            {message.query.explanation}
                          </p>
                          <div className="flex items-center space-x-2 mt-4">
                            <button
                              onClick={() => copyQuery(message.query!.sql)}
                              className="flex items-center space-x-1 px-3 py-2 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
                            >
                              <Copy className="h-4 w-4" />
                              <span>Copy</span>
                            </button>
                            <button
                              onClick={() => executeQuery(message.query!.sql)}
                              className="flex items-center space-x-1 px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                            >
                              <span>Execute</span>
                            </button>
                          </div>
                        </div>
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
              <div className="max-w-3xl">
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
        </div>

        {/* Suggested Prompts */}
        {messages.length === 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Try these sample prompts:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedPrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => setInput(prompt)}
                  className="px-3 py-2 text-sm bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/75 transition-colors"
                >
                  {prompt}
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
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;