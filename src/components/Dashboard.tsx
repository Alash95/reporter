// src/components/Dashboard.tsx - CORRECTED VERSION
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Activity,
  Database,
  MessageSquare,
  Search,
  BarChart3,
  Brain,
  Upload,
  CheckCircle,
  AlertCircle,
  XCircle,
  RefreshCw,
  Sparkles,
  Eye,
  ArrowRight,
  Layers,
  Network,
  Cpu
} from 'lucide-react';
import { useIntegration } from '../contexts/IntegrationContext';
import { useAuthenticatedFetch } from '../contexts/AuthContext';
import { useRefreshManager } from '../hooks/useRefreshManager';

interface DashboardStats {
  totalFiles: number;
  processedFiles: number;
  totalQueries: number;
  totalDashboards: number;
  totalInsights: number;
  activeUsers: number;
}

interface RecentActivity {
  id: string;
  type: 'file_upload' | 'query_execution' | 'dashboard_creation' | 'ai_interaction';
  title: string;
  description: string;
  timestamp: string;
  status: 'success' | 'pending' | 'error';
  feature: string;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  href: string;
  color: string;
  bgColor: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'upload',
    title: 'Upload Data',
    description: 'Upload CSV, Excel, or other data files',
    icon: Upload,
    href: '/dashboard/files',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/50'
  },
  {
    id: 'chat',
    title: 'Chat with AI',
    description: 'Ask questions about your data',
    icon: MessageSquare,
    href: '/dashboard/conversational-ai',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-900/50'
  },
  {
    id: 'query',
    title: 'Build Query',
    description: 'Create SQL queries with visual tools',
    icon: Search,
    href: '/dashboard/query-builder',
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-900/50'
  },
  {
    id: 'dashboard',
    title: 'Create Dashboard',
    description: 'Build interactive visualizations',
    icon: BarChart3,
    href: '/dashboard/dashboard-builder',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-900/50'
  },
  {
    id: 'assistant',
    title: 'AI Assistant',
    description: 'Get AI-powered help and insights',
    icon: Brain,
    href: '/dashboard/ai-assistant',
    color: 'text-pink-600',
    bgColor: 'bg-pink-50 dark:bg-pink-900/50'
  },
  {
    id: 'models',
    title: 'Data Models',
    description: 'Manage semantic data models',
    icon: Database,
    href: '/dashboard/models',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/50'
  }
];

const EnhancedDashboard: React.FC = () => {
  const { state: integrationState, actions } = useIntegration();
  // integrationState.
  const authenticatedFetch = useAuthenticatedFetch();
  const refreshManager = useRefreshManager();
  
  // State management
  const [stats, setStats] = useState<DashboardStats>({
    totalFiles: 0,
    processedFiles: 0,
    totalQueries: 0,
    totalDashboards: 0,
    totalInsights: 0,
    activeUsers: 1
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<number>(0);
  
  // Refs for component lifecycle management
  const loadingRef = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(true);

  // Main data loading function with proper error handling and debouncing
  const loadDashboardData = useCallback(async (): Promise<void> => {
    // Prevent multiple simultaneous calls and respect minimum refresh interval
    const now = Date.now();
    if (loadingRef.current || now - lastRefresh < 5000) {
      return;
    }

    loadingRef.current = true;
    
    try {
      if (!mountedRef.current) return;
      
      setIsLoading(true);
      
      // Use Promise.allSettled to handle partial failures gracefully
      const responses = await Promise.allSettled([
        authenticatedFetch('http://localhost:8000/api/files/'),
        authenticatedFetch('http://localhost:8000/api/queries/history?limit=50'),
        authenticatedFetch('http://localhost:8000/api/dashboards/'),
        authenticatedFetch('http://localhost:8000/api/insights/')
      ]);

      if (!mountedRef.current) return;

      // Extract data from successful responses
      const results = await Promise.allSettled(
        responses.map(async (response, index) => {
          if (response.status === 'fulfilled' && response.value.ok) {
            return response.value.json();
          }
          console.warn(`API call ${index} failed:`, response);
          return [];
        })
      );

      const [files, queries, dashboards, insights] = results.map(
        result => result.status === 'fulfilled' ? result.value : []
      );

      if (!mountedRef.current) return;

      setStats({
        totalFiles: files.length || 0,
        processedFiles: files.filter((f: any) => f.processing_status === 'completed').length || 0,
        totalQueries: queries.length || 0,
        totalDashboards: dashboards.length || 0,
        totalInsights: insights.length || 0,
        activeUsers: 1
      });

      // Generate recent activity (limit to prevent excessive updates)
      const activities: RecentActivity[] = [];
      
      // Add file activities (max 3)
      files.slice(0, 3).forEach((file: any) => {
        activities.push({
          id: `file_${file.id}`,
          type: 'file_upload',
          title: `File "${file.filename}" processed`,
          description: `${file.file_type?.toUpperCase() || 'Unknown'} file with ${file.file_size || 0} bytes`,
          timestamp: file.created_at,
          status: file.processing_status === 'completed' ? 'success' : 
                  file.processing_status === 'failed' ? 'error' : 'pending',
          feature: 'File Upload'
        });
      });

      // Add query activities (max 2)
      queries.slice(0, 2).forEach((query: any) => {
        activities.push({
          id: `query_${query.id}`,
          type: 'query_execution',
          title: `Query executed`,
          description: `${query.row_count || 0} rows returned in ${query.execution_time || 0}ms`,
          timestamp: query.created_at,
          status: query.status === 'completed' ? 'success' : 
                  query.status === 'failed' ? 'error' : 'pending',
          feature: 'Query Builder'
        });
      });

      // Sort by timestamp and limit to 5 items
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivity(activities.slice(0, 5));
      setLastRefresh(now);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      // Only show error notification if component is still mounted
      if (mountedRef.current) {
        actions.addNotification({
          type: 'error',
          title: 'Dashboard Error',
          message: 'Failed to load dashboard data. Retrying...'
        });
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
      loadingRef.current = false;
    }
  }, [authenticatedFetch, actions, lastRefresh]);

  // Setup component lifecycle and refresh manager
  useEffect(() => {
    mountedRef.current = true;
    
    // Register with refresh manager
    refreshManager.register('dashboard-data', loadDashboardData, {
      interval: 30000, // 30 seconds
      enabled: true,
      minInterval: 5000, // Don't refresh more than once every 5 seconds
      maxRetries: 3
    });

    // Initial load
    refreshManager.refresh('dashboard-data', true);

    // Cleanup function with explicit void return
    return (): void => {
      mountedRef.current = false;
      refreshManager.unregister('dashboard-data');
    };
  }, []); // ✅ FIXED: Empty dependency array to prevent recreation

  // Manual refresh handler
  const handleRefresh = useCallback(() => {
    refreshManager.refresh('dashboard-data', true);
  }, [refreshManager]);

  // Utility functions
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'success':
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
      case 'pending':
      case 'processing':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'error':
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getFeatureStatus = (feature: keyof typeof integrationState.featureState) => {
    console.log(feature);
    let status: string | undefined;
    if(integrationState.featureState){
      status = integrationState?.featureState.status;
        
    }
    return {
      status,
      icon: getStatusIcon(status? status : 'unknown'),
      color: status === 'completed' || status === 'idle' ? 'text-green-600' :
             status === 'error' ? 'text-red-600' : 'text-yellow-600'
    };
  };

  // Loading state - show skeleton while initial data loads
  if (isLoading) {
    return (
      <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="animate-pulse">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-96"></div>
            </div>
            <div className="flex space-x-3">
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-10"></div>
            </div>
          </div>

          {/* System Health Skeleton */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm mb-6">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              ))}
            </div>
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>

          {/* Quick Actions Skeleton */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm mb-6">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              ))}
            </div>
          </div>

          {/* Recent Activity Skeleton */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-4"></div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            AI Analytics Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive analytics platform with AI-powered insights
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={handleRefresh}
            disabled={loadingRef.current}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loadingRef.current ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                {integrationState.notifications.length}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* System Health & Integration Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          System Health & Integration Status
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[
            { key: 'fileUpload', label: 'File Upload', icon: Upload },
            { key: 'conversationalAI', label: 'Conversational AI', icon: MessageSquare },
            { key: 'queryBuilder', label: 'Query Builder', icon: Search },
            { key: 'dashboardBuilder', label: 'Dashboard Builder', icon: BarChart3 },
            { key: 'aiAssistant', label: 'AI Assistant', icon: Brain }
          ].map(({ key, label, icon: Icon }) => {
            const feature = getFeatureStatus(key as keyof typeof integrationState.featureState);
            return (
              <div key={key} className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex-shrink-0">
                  <Icon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {label}
                  </p>
                  <div className="flex items-center space-x-2">
                    {feature.icon}
                    <p className={`text-xs ${feature.color} capitalize`}>
                      {feature.status}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Data Sources</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {loadingRef.current ? (
                  <span className="inline-block w-16 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></span>
                ) : (
                  stats.totalFiles
                )}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                {loadingRef.current ? (
                  <span className="inline-block w-12 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></span>
                ) : (
                  `${stats.processedFiles} active`
                )}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Database className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Queries</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {loadingRef.current ? (
                  <span className="inline-block w-16 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></span>
                ) : (
                  stats.totalQueries
                )}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                +5 this week
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <Search className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Dashboards</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {loadingRef.current ? (
                  <span className="inline-block w-16 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></span>
                ) : (
                  stats.totalDashboards
                )}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Create your first
              </p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <BarChart3 className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">AI Insights</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {loadingRef.current ? (
                  <span className="inline-block w-16 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></span>
                ) : (
                  stats.totalInsights
                )}
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400">
                AI-powered analysis
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.id}
              to={action.href}
              className={`p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow ${action.bgColor}`}
            >
              <div className="flex items-start space-x-3">
                <div className={`p-2 ${action.bgColor} rounded-lg`}>
                  <action.icon className={`h-5 w-5 ${action.color}`} />
                </div>
                <div className="flex-1">
                  <h3 className={`font-medium ${action.color}`}>{action.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {action.description}
                  </p>
                  <div className="flex items-center mt-2">
                    <span className={`text-sm ${action.color}`}>Get started</span>
                    <ArrowRight className={`h-4 w-4 ml-1 ${action.color}`} />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Activity
          </h2>
          <Link
            to="/dashboard/analytics"
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center"
          >
            <Eye className="h-4 w-4 mr-1" />
            View all
          </Link>
        </div>
        
        {recentActivity.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No recent activity</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Upload data or create queries to see activity here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-4 p-3 border border-gray-100 dark:border-gray-700 rounded-lg">
                <div className="flex-shrink-0">
                  {getStatusIcon(activity.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {activity.title}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {activity.description}
                  </p>
                  <div className="flex items-center mt-1 space-x-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {activity.feature}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(activity.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cross-Feature Integration Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Cross-Feature Integration Overview
          </h2>
          <button
            onClick={handleRefresh}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Network className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Data Flow</h3>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              {stats.processedFiles} successful syncs
            </p>
          </div>
          
          <div className="text-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Layers className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Feature Sync</h3>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">All features connected</p>
          </div>
          
          <div className="text-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Cpu className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">AI Processing</h3>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Real-time insights enabled</p>
          </div>
        </div>
      </div>

      {/* Notifications Panel */}
      {showNotifications && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-gray-800 shadow-xl z-50 overflow-y-auto">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Notifications
              </h3>
              <button
                onClick={() => setShowNotifications(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {integrationState.notifications.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center">
                No notifications
              </p>
            ) : (
              integrationState.notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border ${
                    notification.type === 'error' ? 'border-red-200 bg-red-50 dark:bg-red-900/50' :
                    notification.type === 'warning' ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/50' :
                    'border-green-200 bg-green-50 dark:bg-green-900/50'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {getStatusIcon(notification.type === 'error' ? 'error' : 'success')}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        {notification.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {new Date(notification.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => actions.removeNotification(notification.id)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedDashboard;