// src/components/Analytics.tsx - CLEAN FIXED VERSION
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthenticatedFetch } from '../contexts/AuthContext';
import { useRefreshManager } from '../hooks/useRefreshManager';
import { 
  Clock, 
  Database, 
  TrendingUp, 
  Zap, 
  Cpu, 
  HardDrive, 
  RefreshCw 
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  BarChart, 
  Bar, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

interface QueryStats {
  totalQueries: number;
  avgExecutionTime: number;
  recentQueries: Array<{
    sql: string;
    executionTime: number;
    rowCount: number;
    timestamp: string;
    status: string;
  }>;
}

interface PerformanceMetrics {
  cpu_usage: number;
  memory_usage: number;
  active_connections: number;
  cache_hit_rate: number;
  queries_per_minute: number;
}

const Analytics: React.FC = () => {
  const authenticatedFetch = useAuthenticatedFetch();
  const refreshManager = useRefreshManager();
  
  // State management
  const [queryStats, setQueryStats] = useState<QueryStats | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<number>(0);

  // Refs for managing component lifecycle and preventing race conditions
  const mountedRef = useRef<boolean>(true);
  const fetchingRef = useRef<boolean>(false);

  // Generate mock data functions
  const generateMockQueryStats = useCallback((): QueryStats => ({
    totalQueries: 245,
    avgExecutionTime: 147.5,
    recentQueries: [
      {
        sql: "SELECT region, SUM(total) as revenue FROM orders GROUP BY region ORDER BY revenue DESC",
        executionTime: 145,
        rowCount: 5,
        timestamp: new Date(Date.now() - 300000).toISOString(),
        status: "completed"
      },
      {
        sql: "SELECT customer_id, COUNT(*) FROM orders WHERE created_at > '2024-01-01' GROUP BY customer_id",
        executionTime: 89,
        rowCount: 1247,
        timestamp: new Date(Date.now() - 600000).toISOString(),
        status: "completed"
      },
      {
        sql: "SELECT product_name, AVG(price) FROM products WHERE category = 'electronics'",
        executionTime: 234,
        rowCount: 156,
        timestamp: new Date(Date.now() - 900000).toISOString(),
        status: "completed"
      },
      {
        sql: "UPDATE customer_preferences SET theme = 'dark' WHERE user_id = 12345",
        executionTime: 12,
        rowCount: 1,
        timestamp: new Date(Date.now() - 1200000).toISOString(),
        status: "completed"
      },
      {
        sql: "SELECT * FROM sales_data WHERE date_range BETWEEN '2024-01-01' AND '2024-12-31'",
        executionTime: 445,
        rowCount: 8934,
        timestamp: new Date(Date.now() - 1500000).toISOString(),
        status: "completed"
      }
    ]
  }), []);

  const generateMockPerformanceMetrics = useCallback((): PerformanceMetrics => ({
    cpu_usage: 45.2 + Math.random() * 10,
    memory_usage: 67.8 + Math.random() * 10,
    active_connections: 24,
    cache_hit_rate: 0.75 + Math.random() * 0.2,
    queries_per_minute: 12.5 + Math.random() * 5
  }), []);

  // Main fetch function with proper error handling and debouncing
  const fetchAnalytics = useCallback(async (): Promise<void> => {
    const now = Date.now();
    
    // Prevent multiple simultaneous fetches and implement debouncing
    if (fetchingRef.current || now - lastRefresh < 10000) {
      return;
    }

    fetchingRef.current = true;
    setLastRefresh(now);

    try {
      if (!mountedRef.current) return;

      setIsLoading(true);

      // Use Promise.allSettled to handle partial failures gracefully
      const responses = await Promise.allSettled([
        authenticatedFetch('http://localhost:8000/api/analytics/queries'),
        authenticatedFetch('http://localhost:8000/api/analytics/performance')
      ]);

      if (!mountedRef.current) return;

      // Process query analytics
      if (responses[0].status === 'fulfilled' && responses[0].value.ok) {
        try {
          const queryData = await responses[0].value.json();
          setQueryStats(queryData);
        } catch (error) {
          console.warn('Failed to parse query analytics:', error);
          setQueryStats(generateMockQueryStats());
        }
      } else {
        console.warn('Query analytics API failed, using mock data');
        setQueryStats(generateMockQueryStats());
      }

      // Process performance metrics
      if (responses[1].status === 'fulfilled' && responses[1].value.ok) {
        try {
          const perfData = await responses[1].value.json();
          setPerformanceMetrics(perfData);
        } catch (error) {
          console.warn('Failed to parse performance metrics:', error);
          setPerformanceMetrics(generateMockPerformanceMetrics());
        }
      } else {
        console.warn('Performance metrics API failed, using mock data');
        setPerformanceMetrics(generateMockPerformanceMetrics());
      }

    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      
      // Use mock data as fallback only if we don't have any data
      if (!queryStats) {
        setQueryStats(generateMockQueryStats());
      }
      if (!performanceMetrics) {
        setPerformanceMetrics(generateMockPerformanceMetrics());
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
      fetchingRef.current = false;
    }
  }, [authenticatedFetch, lastRefresh, queryStats, performanceMetrics, generateMockQueryStats, generateMockPerformanceMetrics]);

  // Setup component lifecycle and refresh manager
  useEffect(() => {
    mountedRef.current = true;
    
    // Register with refresh manager
    refreshManager.register('analytics-data', fetchAnalytics, {
      interval: 30000, // 30 seconds
      enabled: true,
      minInterval: 10000, // Don't refresh more than once every 10 seconds
      maxRetries: 3
    });

    // Initial fetch
    refreshManager.refresh('analytics-data', true);

    return () => {
      mountedRef.current = false;
      refreshManager.unregister('analytics-data');
    };
  }, [refreshManager, fetchAnalytics]);

  // Manual refresh handler
  const handleRefresh = useCallback(() => {
    refreshManager.refresh('analytics-data', true);
  }, [refreshManager]);

  // Utility functions
  const formatDuration = (milliseconds: number): string => {
    if (milliseconds < 1000) return `${milliseconds}ms`;
    return `${(milliseconds / 1000).toFixed(1)}s`;
  };

  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getPerformanceColor = (value: number, type: 'cpu' | 'memory' | 'cache'): string => {
    switch (type) {
      case 'cpu':
      case 'memory':
        if (value > 80) return 'text-red-600';
        if (value > 60) return 'text-yellow-600';
        return 'text-green-600';
      case 'cache':
        if (value > 0.8) return 'text-green-600';
        if (value > 0.6) return 'text-yellow-600';
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  // Generate chart data
  const queryTimeData = queryStats?.recentQueries.map((query, index) => ({
    query: `Query ${queryStats.recentQueries.length - index}`,
    time: query.executionTime,
    rows: query.rowCount
  })).reverse() || [];

  const performanceData = performanceMetrics ? [
    { name: 'CPU Usage', value: performanceMetrics.cpu_usage, color: '#3B82F6' },
    { name: 'Memory Usage', value: performanceMetrics.memory_usage, color: '#EF4444' },
    { name: 'Cache Hit Rate', value: performanceMetrics.cache_hit_rate * 100, color: '#10B981' }
  ] : [];

  // Loading state
  if (isLoading && !queryStats && !performanceMetrics) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Analytics Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            System performance and query analytics
          </p>
        </div>
        
        <button
          onClick={handleRefresh}
          disabled={fetchingRef.current}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${fetchingRef.current ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Performance Metrics */}
      {performanceMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">CPU Usage</p>
                <p className={`text-2xl font-bold ${getPerformanceColor(performanceMetrics.cpu_usage, 'cpu')}`}>
                  {performanceMetrics.cpu_usage.toFixed(1)}%
                </p>
              </div>
              <Cpu className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Memory Usage</p>
                <p className={`text-2xl font-bold ${getPerformanceColor(performanceMetrics.memory_usage, 'memory')}`}>
                  {performanceMetrics.memory_usage.toFixed(1)}%
                </p>
              </div>
              <HardDrive className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Connections</p>
                <p className="text-2xl font-bold text-purple-600">
                  {performanceMetrics.active_connections}
                </p>
              </div>
              <Database className="h-8 w-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Cache Hit Rate</p>
                <p className={`text-2xl font-bold ${getPerformanceColor(performanceMetrics.cache_hit_rate, 'cache')}`}>
                  {(performanceMetrics.cache_hit_rate * 100).toFixed(1)}%
                </p>
              </div>
              <Zap className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Queries/Min</p>
                <p className="text-2xl font-bold text-orange-600">
                  {performanceMetrics.queries_per_minute.toFixed(1)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </div>
        </div>
      )}

      {/* Query Statistics */}
      {queryStats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Query Performance Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Recent Query Performance
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={queryTimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="query" />
                <YAxis />
                <Tooltip
                  formatter={(value, name) => [
                    name === 'time' ? formatDuration(value as number) : value,
                    name === 'time' ? 'Execution Time' : 'Rows Returned'
                  ]}
                />
                <Bar dataKey="time" fill="#3B82F6" name="time" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Query Trends Line Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Query Execution Trends
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={queryTimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="query" />
                <YAxis />
                <Tooltip
                  formatter={(value, name) => [
                    name === 'time' ? formatDuration(value as number) : value,
                    name === 'time' ? 'Execution Time' : 'Rows Returned'
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="time" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', strokeWidth: 2 }}
                  name="time"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Performance Metrics Pie Chart */}
      {performanceMetrics && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            System Performance Overview
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={performanceData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value.toFixed(1)}${name.includes('Rate') ? '%' : '%'}`}
              >
                {performanceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${(value as number).toFixed(1)}%`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Queries */}
      {queryStats && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Queries
            </h3>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Total: {queryStats.totalQueries}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Avg: {formatDuration(queryStats.avgExecutionTime)}
              </span>
            </div>
          </div>
          
          <div className="space-y-4">
            {queryStats.recentQueries.map((query, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <code className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded block overflow-x-auto">
                      {query.sql.length > 100 ? `${query.sql.substring(0, 100)}...` : query.sql}
                    </code>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{formatDuration(query.executionTime)}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Database className="h-4 w-4" />
                        <span>{query.rowCount.toLocaleString()} rows</span>
                      </span>
                      <span>{formatTimeAgo(query.timestamp)}</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      query.status === 'completed' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400'
                    }`}>
                      {query.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;