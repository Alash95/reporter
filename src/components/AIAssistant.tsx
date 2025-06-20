// src/components/AIAssistant.tsx - AI Assistant Component matching backend
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthenticatedFetch } from '../contexts/AuthContext';
import { useRefreshManager } from '../hooks/useRefreshManager';
import { 
  Brain, 
  Send, 
  RefreshCw, 
  Copy, 
  Download, 
  BarChart3, 
  Database,
  Lightbulb,
  User,
  TrendingUp
} from 'lucide-react';

interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  assistant_type?: string;
  metadata?: {
    generated_query?: string;
    confidence?: number;
    data_source_used?: string;
    chart_config?: any;
    insights?: string[];
  };
}

interface AssistantType {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
}

interface Suggestion {
  id: string;
  text: string;
  category: string;
  assistant_type: string;
}

const ASSISTANT_TYPES: AssistantType[] = [
  {
    id: 'data_analyst',
    name: 'Data Analyst',
    description: 'General data analysis and insights',
    icon: BarChart3,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/50'
  },
  {
    id: 'sql_expert',
    name: 'SQL Expert',
    description: 'Generate and optimize SQL queries',
    icon: Database,
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-900/50'
  },
  {
    id: 'data_scientist',
    name: 'Data Scientist',
    description: 'Advanced analytics and ML insights',
    icon: Brain,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-900/50'
  },
  {
    id: 'business_analyst',
    name: 'Business Analyst',
    description: 'Business metrics and KPI analysis',
    icon: TrendingUp,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-900/50'
  }
];

const AIAssistant: React.FC = () => {
  const authenticatedFetch = useAuthenticatedFetch();
  const refreshManager = useRefreshManager();
  
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAssistant, setSelectedAssistant] = useState<string>('data_analyst');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mountedRef = useRef<boolean>(true);

  // Load suggestions for selected assistant
  const loadSuggestions = useCallback(async () => {
    if (!mountedRef.current) return;

    setIsLoadingSuggestions(true);
    try {
      const response = await authenticatedFetch('http://localhost:8000/api/ai-assistant/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assistant_type: selectedAssistant,
          context: {
            message_history: messages.slice(-3).map(m => ({
              role: m.role,
              content: m.content
            }))
          }
        })
      });

      if (response.ok && mountedRef.current) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    } finally {
      if (mountedRef.current) {
        setIsLoadingSuggestions(false);
      }
    }
  }, [authenticatedFetch, selectedAssistant, messages]);

  // Initialize component
  useEffect(() => {
    mountedRef.current = true;

    // Register with refresh manager for periodic suggestion updates
    refreshManager.register('ai-assistant-suggestions', loadSuggestions, {
      interval: 60000, // 1 minute
      enabled: true,
      minInterval: 10000,
      maxRetries: 3
    });

    // Load initial suggestions
    loadSuggestions();

    // Add welcome message
    if (messages.length === 0) {
      const welcomeMessage: AIMessage = {
        id: 'welcome',
        role: 'assistant',
        content: `🤖 **Welcome to AI Assistant!**

I'm your specialized AI helper. Choose an assistant type and I'll provide tailored help:

• **Data Analyst** - General data analysis and insights
• **SQL Expert** - Query generation and optimization  
• **Data Scientist** - Advanced analytics and ML
• **Business Analyst** - Business metrics and KPIs

Ask me anything about your data!`,
        timestamp: new Date(),
        assistant_type: selectedAssistant
      };
      setMessages([welcomeMessage]);
    }

    return () => {
      mountedRef.current = false;
      refreshManager.unregister('ai-assistant-suggestions');
    };
  }, [refreshManager, loadSuggestions, selectedAssistant, messages.length]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Send message to AI Assistant
  const sendMessage = useCallback(async () => {
    if (!inputMessage.trim() || isLoading || !mountedRef.current) return;

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
      assistant_type: selectedAssistant
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await authenticatedFetch('http://localhost:8000/api/ai-assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputMessage,
          assistant_type: selectedAssistant,
          context: {
            conversation_history: messages.slice(-5).map(m => ({
              role: m.role,
              content: m.content,
              assistant_type: m.assistant_type
            }))
          }
        })
      });

      if (response.ok && mountedRef.current) {
        const result = await response.json();
        
        const assistantMessage: AIMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.response || result.message,
          timestamp: new Date(),
          assistant_type: selectedAssistant,
          metadata: {
            generated_query: result.generated_query,
            confidence: result.confidence,
            data_source_used: result.data_source_used,
            chart_config: result.chart_config,
            insights: result.insights
          }
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Reload suggestions based on new context
        setTimeout(() => loadSuggestions(), 1000);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      
      if (mountedRef.current) {
        const errorMessage: AIMessage = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: `❌ **I encountered an error processing your request.**

${error instanceof Error ? error.message : 'Unknown error occurred'}

Please try:
• Rephrasing your question
• Switching to a different assistant type
• Checking your data sources

I'm here to help once the issue is resolved!`,
          timestamp: new Date(),
          assistant_type: selectedAssistant
        };

        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [inputMessage, isLoading, selectedAssistant, messages, authenticatedFetch, loadSuggestions]);

  // Handle assistant type change
  const handleAssistantChange = useCallback((assistantType: string) => {
    setSelectedAssistant(assistantType);
    loadSuggestions();
  }, [loadSuggestions]);

  // Copy message content
  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  // Download generated query
  const downloadQuery = useCallback((query: string, filename: string = 'generated_query.sql') => {
    const blob = new Blob([query], { type: 'text/sql' });
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

  const selectedAssistantInfo = ASSISTANT_TYPES.find(a => a.id === selectedAssistant) || ASSISTANT_TYPES[0];

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Assistant Types Sidebar */}
      <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            AI Assistants
          </h3>
          
          <div className="space-y-2">
            {ASSISTANT_TYPES.map((assistant) => (
              <button
                key={assistant.id}
                onClick={() => handleAssistantChange(assistant.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedAssistant === assistant.id
                    ? `${assistant.bgColor} border-current ${assistant.color}`
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <assistant.icon className={`h-5 w-5 ${
                    selectedAssistant === assistant.id ? assistant.color : 'text-gray-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${
                      selectedAssistant === assistant.id 
                        ? assistant.color 
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {assistant.name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {assistant.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Suggestions */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Suggestions
            </h4>
            <button
              onClick={loadSuggestions}
              disabled={isLoadingSuggestions}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingSuggestions ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          {isLoadingSuggestions ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              ))}
            </div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-8">
              <Lightbulb className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No suggestions available
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  onClick={() => setInputMessage(suggestion.text)}
                  className="w-full text-left p-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  {suggestion.text}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <selectedAssistantInfo.icon className={`h-6 w-6 ${selectedAssistantInfo.color}`} />
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedAssistantInfo.name}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedAssistantInfo.description}
                </p>
              </div>
            </div>
            
            {isLoading && (
              <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm">Processing...</span>
              </div>
            )}
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
                      <div className={`w-8 h-8 ${selectedAssistantInfo.bgColor} rounded-full flex items-center justify-center`}>
                        <selectedAssistantInfo.icon className={`h-5 w-5 ${selectedAssistantInfo.color}`} />
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

                      {/* SQL Query Display */}
                      {message.metadata?.generated_query && (
                        <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-700 rounded border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Generated SQL Query
                            </span>
                            <div className="flex space-x-1">
                              <button
                                onClick={() => copyToClipboard(message.metadata!.generated_query!)}
                                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => downloadQuery(message.metadata!.generated_query!)}
                                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          <code className="text-sm text-gray-800 dark:text-gray-200 block">
                            {message.metadata.generated_query}
                          </code>
                          {message.metadata.confidence && (
                            <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                              Confidence: {(message.metadata.confidence * 100).toFixed(1)}%
                            </div>
                          )}
                        </div>
                      )}

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
                <div className={`w-8 h-8 ${selectedAssistantInfo.bgColor} rounded-full flex items-center justify-center`}>
                  <selectedAssistantInfo.icon className={`h-5 w-5 ${selectedAssistantInfo.color}`} />
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                    <span className="text-gray-600 dark:text-gray-400">AI is analyzing...</span>
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
                onKeyDown={handleKeyPress}
                placeholder={`Ask ${selectedAssistantInfo.name} anything...`}
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
            <span>Assistant: {selectedAssistantInfo.name}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;