import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Activity, Clock, Database, TrendingUp, Zap } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, ResponsiveContainer } from 'recharts';

const Analytics: React.FC = () => {
  const { token } = useAuth();
  const [queryStats, setQueryStats] = useState(null);
  const [cacheStats, setCacheStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/analytics/queries', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setQueryStats(data);
      
      // Mock cache stats
      setCacheStats({
        hitRate: 0.75,
        size: 45,
        maxSize: 100,
        ttl: 300000
      });
      
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setIsLoading(false);
    }
  };

  // Mock performance data
  const performanceData = [
    { time: '00:00', queries: 12, avgTime: 120 },
    { time: '04:00', queries: 8, avgTime: 95 },
    { time: '08:00', queries: 45, avgTime: 150 },
    { time: '12:00', queries: 78, avgTime: 180 },
    { time: '16:00', queries: 65, avgTime: 160 },
    { time: '20:00', queries: 35, avgTime: 140 },
  ];

  const queryTypeData = [
    { type: 'SELECT', count: 145, percentage: 68 },
    { type: 'AI Generated', count: 45, percentage: 21 },
    { type: 'Aggregation', count: 23, percentage: 11 },
  ];

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-80 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Platform Analytics
        </h1>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Real-time performance metrics
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Queries
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                {queryStats?.totalQueries || 0}
              </p>
            </div>
            <div className="p-3 rounded-full bg-blue-50 dark:bg-blue-900/50">
              <Database className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="flex items-center mt-4">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium text-green-600 ml-1">+12%</span>
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">from yesterday</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Avg Execution Time
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                {queryStats?.avgExecutionTime || 0}ms
              </p>
            </div>
            <div className="p-3 rounded-full bg-green-50 dark:bg-green-900/50">
              <Clock className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="flex items-center mt-4">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium text-green-600 ml-1">-8%</span>
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">faster than yesterday</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Cache Hit Rate
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                {Math.round((cacheStats?.hitRate || 0) * 100)}%
              </p>
            </div>
            <div className="p-3 rounded-full bg-purple-50 dark:bg-purple-900/50">
              <Zap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="flex items-center mt-4">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium text-green-600 ml-1">+5%</span>
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">from last hour</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Active Connections
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                24
              </p>
            </div>
            <div className="p-3 rounded-full bg-orange-50 dark:bg-orange-900/50">
              <Activity className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <div className="flex items-center mt-4">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium text-green-600 ml-1">+3</span>
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">new connections</span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Query Performance Over Time */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Query Performance (24h)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#6B7280" />
              <YAxis yAxisId="left" stroke="#6B7280" />
              <YAxis yAxisId="right" orientation="right" stroke="#6B7280" />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
              />
              <Bar yAxisId="left" dataKey="queries" fill="#3B82F6" />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="avgTime" 
                stroke="#10B981" 
                strokeWidth={3}
                dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Query Types Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Query Types Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={queryTypeData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" stroke="#6B7280" />
              <YAxis dataKey="type" type="category" stroke="#6B7280" />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
              />
              <Bar dataKey="count" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Queries */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Queries
          </h3>
          <div className="space-y-3">
            {queryStats?.recentQueries?.map((query: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-mono text-gray-600 dark:text-gray-300 truncate">
                    {query.sql.substring(0, 60)}...
                  </p>
                  <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <span>{query.rowCount} rows</span>
                    <span>{query.executionTime}ms</span>
                    <span>{new Date(query.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            )) || (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                No recent queries
              </div>
            )}
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            System Health
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">API Server</span>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-600">Healthy</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Query Engine</span>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-600">Operational</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Cache Service</span>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-600">Running</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">AI Engine</span>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-yellow-600">Limited</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;