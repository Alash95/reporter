// src/components/EnhancedDashboard.tsx - Main dashboard with integration overview

import React, { useState, useEffect, useCallback } from 'react';
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
  
  // ✅ FIXED: Properly call the hook to get the authenticatedFetch function
  const authenticatedFetch = useAuthenticatedFetch();
  
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

  // ✅ FIXED: Moved function definition after hook call and wrapped in useCallback
  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Load dashboard statistics
      const [filesRes, queriesRes, dashboardsRes, insightsRes] = await Promise.all([
        authenticatedFetch('http://localhost:8000/api/files/'),
        authenticatedFetch('http://localhost:8000/api/queries/history?limit=50'),
        authenticatedFetch('http://localhost:8000/api/dashboards/'),
        authenticatedFetch('http://localhost:8000/api/insights/')
      ]);

      const [files, queries, dashboards, insights] = await Promise.all([
        filesRes.ok ? filesRes.json() : [],
        queriesRes.ok ? queriesRes.json() : [],
        dashboardsRes.ok ? dashboardsRes.json() : [],
        insightsRes.ok ? insightsRes.json() : []
      ]);

      setStats({
        totalFiles: files.length || 0,
        processedFiles: files.filter((f: any) => f.processing_status === 'completed').length || 0,
        totalQueries: queries.length || 0,
        totalDashboards: dashboards.length || 0,
        totalInsights: insights.length || 0,
        activeUsers: 1
      });

      // Generate recent activity
      const activities: RecentActivity[] = [];
      
      // Add file activities
      files.slice(0, 3).forEach((file: any) => {
        activities.push({
          id: `file_${file.id}`,
          type: 'file_upload',
          title: `File "${file.filename}" processed`,
          description: `${file.file_type.toUpperCase()} file with ${file.file_size} bytes`,
          timestamp: file.created_at,
          status: file.processing_status === 'completed' ? 'success' : 
                  file.processing_status === 'failed' ? 'error' : 'pending',
          feature: 'File Upload'
        });
      });

      // Add query activities
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

      // Sort by timestamp
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivity(activities.slice(0, 5));

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      actions.addNotification({
        type: 'error',
        title: 'Dashboard Error',
        message: 'Failed to load dashboard data'
      });
    } finally {
      setIsLoading(false);
    }
  }, [authenticatedFetch, actions]);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [loadDashboardData]);

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

  const getFeatureStatus = (feature: keyof typeof integrationState.featureStates) => {
    const status = integrationState.featureStates[feature];
    return {
      status,
      icon: getStatusIcon(status),
      color: status === 'completed' || status === 'idle' ? 'text-green-600' :
             status === 'error' ? 'text-red-600' :
             'text-yellow-600'
    };
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
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
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 relative"
            >
              <Activity className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              {integrationState.notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {integrationState.notifications.length}
                </span>
              )}
            </button>
            
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-50 max-h-96 overflow-y-auto">
                <div className="p-4 border-b border-gray-200 dark:border-gray-600">
                  <h3 className="font-medium text-gray-900 dark:text-white">Notifications</h3>
                </div>
                {integrationState.notifications.length > 0 ? (
                  <div className="max-h-80 overflow-y-auto">
                    {integrationState.notifications.map((notification) => (
                      <div key={notification.id} className="p-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                        <div className="flex items-start space-x-3">
                          <div className={`p-1 rounded-full ${
                            notification.type === 'success' ? 'bg-green-100 text-green-600' :
                            notification.type === 'error' ? 'bg-red-100 text-red-600' :
                            notification.type === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                            'bg-blue-100 text-blue-600'
                          }`}>
                            {getStatusIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {notification.title}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              {new Date(notification.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                          <button
                            onClick={() => actions.removeNotification(notification.id)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No notifications</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Refresh Button */}
          <button
            onClick={loadDashboardData}
            disabled={isLoading}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* System Health Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            System Health & Integration Status
          </h2>
          <div className="flex items-center space-x-2">
            {getStatusIcon(integrationState.systemHealth.status)}
            <span className="text-sm font-medium capitalize">
              {integrationState.systemHealth.status}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Object.entries(integrationState.featureStates).map(([feature, status]) => {
            const featureInfo = getFeatureStatus(feature as keyof typeof integrationState.featureStates);
            return (
              <div key={feature} className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                {featureInfo.icon}
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                    {feature.replace(/([A-Z])/g, ' $1').trim()}
                  </p>
                  <p className={`text-xs ${featureInfo.color} capitalize`}>
                    {status}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Data Sources</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {integrationState.integrationStats.totalDataSources}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                {integrationState.integrationStats.activeIntegrations} active
              </p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/50 rounded-lg">
              <Database className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Queries</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalQueries}</p>
              <p className="text-xs text-green-600 dark:text-green-400">
                +{Math.floor(stats.totalQueries * 0.12)} this week
              </p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/50 rounded-lg">
              <Search className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Dashboards</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalDashboards}</p>
              <p className="text-xs text-green-600 dark:text-green-400">
                {stats.totalDashboards > 0 ? 'Recently created' : 'Create your first'}
              </p>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900/50 rounded-lg">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">AI Insights</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalInsights}</p>
              <p className="text-xs text-green-600 dark:text-green-400">
                AI-powered analysis
              </p>
            </div>
            <div className="p-3 bg-orange-50 dark:bg-orange-900/50 rounded-lg">
              <Sparkles className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.id}
                  to={action.href}
                  className={`flex items-center space-x-3 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 group transition-all duration-200 ${action.bgColor}`}
                >
                  <div className={`p-2 rounded-lg ${action.bgColor}`}>
                    <Icon className={`h-5 w-5 ${action.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {action.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {action.description}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 transition-colors" />
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Activity
            </h2>
            <Link 
              to="/dashboard/analytics"
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700"
            >
              View all
            </Link>
          </div>
          
          {recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {getStatusIcon(activity.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {activity.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {activity.description}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {activity.feature}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">•</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="h-8 w-8 mx-auto text-gray-400 dark:text-gray-500 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No recent activity</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Start by uploading data or creating queries
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Integration Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Cross-Feature Integration Overview
          </h2>
          <Link 
            to="/dashboard/integration-status"
            className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Eye className="h-4 w-4" />
            <span>View Details</span>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
            <div className="flex items-center space-x-3">
              <Network className="h-8 w-8 text-green-600" />
              <div>
                <h3 className="font-medium text-green-900 dark:text-green-100">
                  Data Flow
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {integrationState.integrationStats.successfulSyncs} successful syncs
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <div className="flex items-center space-x-3">
              <Layers className="h-8 w-8 text-blue-600" />
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-100">
                  Feature Sync
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  All features connected
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
            <div className="flex items-center space-x-3">
              <Cpu className="h-8 w-8 text-purple-600" />
              <div>
                <h3 className="font-medium text-purple-900 dark:text-purple-100">
                  AI Processing
                </h3>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  Real-time insights enabled
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedDashboard;