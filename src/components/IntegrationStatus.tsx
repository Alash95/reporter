// src/components/IntegrationStatus.tsx - Integration status monitoring dashboard

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Database, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  RefreshCw,
  Clock,
  Activity,
  TrendingUp,
  FileText,
  Zap,
  Network,
  Eye,
  ArrowRight,
  Settings
} from 'lucide-react';
import { useAuthenticatedFetch } from '../contexts/AuthContext';
import { useIntegration } from '../contexts/IntegrationContext';

interface IntegrationInfo {
  id: string;
  name: string;
  type: 'file_upload' | 'database' | 'api' | 'warehouse' | 'streaming';
  status: 'active' | 'inactive' | 'error' | 'syncing';
  last_sync: string;
  sync_frequency: string;
  records_count: number;
  error_message?: string;
  health_score: number;
  features_connected: string[];
  configuration: any;
}

interface IntegrationMetrics {
  total_integrations: number;
  active_integrations: number;
  failed_integrations: number;
  total_records_synced: number;
  avg_sync_time: number;
  uptime_percentage: number;
}

interface SyncActivity {
  id: string;
  integration_name: string;
  status: 'success' | 'failed' | 'in_progress';
  timestamp: string;
  records_processed: number;
  duration_ms: number;
  error_details?: string;
}

const IntegrationStatus: React.FC = () => {
  const authenticatedFetch = useAuthenticatedFetch();
  const { state: integrationState, actions } = useIntegration();
  
  const [integrations, setIntegrations] = useState<IntegrationInfo[]>([]);
  const [metrics, setMetrics] = useState<IntegrationMetrics | null>(null);
  const [recentActivity, setRecentActivity] = useState<SyncActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'error' | 'inactive'>('all');
  const [showSettings, setShowSettings] = useState(false);

  const loadIntegrationStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const [integrationsRes, metricsRes, activityRes] = await Promise.all([
        authenticatedFetch('http://localhost:8000/api/integration/status'),
        authenticatedFetch('http://localhost:8000/api/integration/metrics'),
        authenticatedFetch('http://localhost:8000/api/integration/activity?limit=20')
      ]);

      if (integrationsRes.ok) {
        const integrationsData = await integrationsRes.json();
        setIntegrations(integrationsData.integrations || []);
      }

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData);
      }

      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setRecentActivity(activityData.activities || []);
      }

    } catch (error) {
      console.error('Failed to load integration status:', error);
      actions.addNotification({
        type: 'error',
        title: 'Integration Status Error',
        message: 'Failed to load integration status data'
      });
    } finally {
      setIsLoading(false);
    }
  }, [authenticatedFetch, actions]);

  const triggerSync = async (integrationId: string) => {
    try {
      const response = await authenticatedFetch(`http://localhost:8000/api/integration/${integrationId}/sync`, {
        method: 'POST'
      });

      if (response.ok) {
        actions.addNotification({
          type: 'success',
          title: 'Sync Triggered',
          message: 'Integration sync has been started'
        });
        
        // Refresh data after a brief delay
        setTimeout(loadIntegrationStatus, 2000);
      }
    } catch (error) {
      console.error('Failed to trigger sync:', error);
      actions.addNotification({
        type: 'error',
        title: 'Sync Failed',
        message: 'Failed to trigger integration sync'
      });
    }
  };

  useEffect(() => {
    loadIntegrationStatus();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(loadIntegrationStatus, 30000);
    return () => clearInterval(interval);
  }, [loadIntegrationStatus]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'syncing':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'inactive':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'file_upload':
        return <FileText className="h-5 w-5 text-blue-600" />;
      case 'database':
        return <Database className="h-5 w-5 text-green-600" />;
      case 'api':
        return <Zap className="h-5 w-5 text-purple-600" />;
      case 'warehouse':
        return <Database className="h-5 w-5 text-orange-600" />;
      case 'streaming':
        return <Activity className="h-5 w-5 text-red-600" />;
      default:
        return <Network className="h-5 w-5 text-gray-600" />;
    }
  };

  const filteredIntegrations = integrations.filter(integration => {
    if (filter === 'all') return true;
    return integration.status === filter;
  });

  const getHealthScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-lg text-gray-600 dark:text-gray-400">Loading integration status...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Integration Status
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Monitor and manage all data source integrations
            </p>
          </div>
          
          {/* System Health Indicator */}
          <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
            {integrationState.systemHealth.status === 'healthy' ? 
              <CheckCircle className="h-5 w-5 text-green-500" /> :
              integrationState.systemHealth.status === 'degraded' ? 
              <AlertCircle className="h-5 w-5 text-yellow-500" /> :
              <XCircle className="h-5 w-5 text-red-500" />
            }
            <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
              System {integrationState.systemHealth.status}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Notifications Indicator */}
          {integrationState.notifications.length > 0 && (
            <div className="flex items-center space-x-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/50 rounded-lg">
              <Activity className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-600 dark:text-blue-400">
                {integrationState.notifications.length} notification{integrationState.notifications.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md"
            title="Integration Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={loadIntegrationStatus}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      {(metrics || integrationState.integrationStats) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Integrations</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {metrics?.total_integrations || integrationState.integrationStats.totalDataSources}
                </p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/50 rounded-lg">
                <Network className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {metrics?.active_integrations || integrationState.integrationStats.activeIntegrations}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {metrics ? 
                    ((metrics.active_integrations / metrics.total_integrations) * 100).toFixed(1) :
                    integrationState.integrationStats.totalDataSources > 0 ?
                    ((integrationState.integrationStats.activeIntegrations / integrationState.integrationStats.totalDataSources) * 100).toFixed(1) :
                    '0'
                  }% uptime
                </p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/50 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Records Synced</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {metrics?.total_records_synced?.toLocaleString() || '0'}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Avg: {metrics?.avg_sync_time || 0}ms
                </p>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-900/50 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Successful Syncs</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {metrics?.uptime_percentage?.toFixed(1) || integrationState.integrationStats.successfulSyncs}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {integrationState.integrationStats.failedSyncs} failed
                </p>
              </div>
              <div className="p-3 bg-orange-50 dark:bg-orange-900/50 rounded-lg">
                <Activity className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Integrations List */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Data Source Integrations
              </h2>
              
              {/* Filter Buttons */}
              <div className="flex items-center space-x-2">
                {(['all', 'active', 'error', 'inactive'] as const).map((filterOption) => (
                  <button
                    key={filterOption}
                    onClick={() => setFilter(filterOption)}
                    className={`px-3 py-1 text-xs rounded-full capitalize ${
                      filter === filterOption
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {filterOption}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-600">
            {filteredIntegrations.length > 0 ? (
              filteredIntegrations.map((integration) => (
                <div 
                  key={integration.id} 
                  className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  onClick={() => setSelectedIntegration(integration.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        {getTypeIcon(integration.type)}
                        {getStatusIcon(integration.status)}
                      </div>
                      
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {integration.name}
                        </h3>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                          <span className="capitalize">{integration.type.replace('_', ' ')}</span>
                          <span>•</span>
                          <span>{integration.records_count.toLocaleString()} records</span>
                          <span>•</span>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>Last sync: {new Date(integration.last_sync).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className={`text-sm font-medium ${getHealthScoreColor(integration.health_score)}`}>
                          {integration.health_score}% Health
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {integration.features_connected.length} features
                        </div>
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerSync(integration.id);
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        title="Trigger sync"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIntegration(integration.id);
                          setShowDetails(true);
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>

                  {integration.error_message && (
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-red-700 dark:text-red-300">
                          {integration.error_message}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Network className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No integrations found</p>
                <p className="text-sm">
                  {filter === 'all' ? 'Set up your first data integration' : `No ${filter} integrations`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Sync Activity
            </h2>
          </div>
          
          <div className="divide-y divide-gray-200 dark:divide-gray-600 max-h-96 overflow-y-auto">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div key={activity.id} className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getStatusIcon(activity.status)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {activity.integration_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {activity.records_processed.toLocaleString()} records • {activity.duration_ms}ms
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                      
                      {activity.error_details && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          {activity.error_details}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Integration Details Modal */}
      {showDetails && selectedIntegration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Integration Details
              </h3>
              <button
                onClick={() => {
                  setShowDetails(false);
                  setSelectedIntegration(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ×
              </button>
            </div>
            
            {(() => {
              const integration = integrations.find(i => i.id === selectedIntegration);
              if (!integration) return null;
              
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Name
                      </label>
                      <p className="text-sm text-gray-900 dark:text-white">{integration.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Type
                      </label>
                      <p className="text-sm text-gray-900 dark:text-white capitalize">
                        {integration.type.replace('_', ' ')}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Status
                      </label>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(integration.status)}
                        <span className="text-sm text-gray-900 dark:text-white capitalize">
                          {integration.status}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Health Score
                      </label>
                      <p className={`text-sm ${getHealthScoreColor(integration.health_score)}`}>
                        {integration.health_score}%
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Records Count
                      </label>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {integration.records_count.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Last Sync
                      </label>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {new Date(integration.last_sync).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Connected Features
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {integration.features_connected.map((feature, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Sync Frequency
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {integration.sync_frequency}
                    </p>
                  </div>
                  
                  {integration.error_message && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Error Details
                      </label>
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                        <p className="text-sm text-red-700 dark:text-red-300">
                          {integration.error_message}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      onClick={() => {
                        setShowDetails(false);
                        setSelectedIntegration(null);
                      }}
                      className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        triggerSync(integration.id);
                        setShowDetails(false);
                        setSelectedIntegration(null);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Trigger Sync
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Integration Settings
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Auto Sync Settings */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Auto Sync Interval
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option value="300">5 minutes</option>
                  <option value="600">10 minutes</option>
                  <option value="1800">30 minutes</option>
                  <option value="3600">1 hour</option>
                  <option value="0">Disabled</option>
                </select>
              </div>

              {/* Retry Settings */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max Retry Attempts
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  defaultValue="3"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Timeout Settings */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Connection Timeout (seconds)
                </label>
                <input
                  type="number"
                  min="5"
                  max="300"
                  defaultValue="30"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Notification Settings */}
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Notify on sync failures
                  </span>
                </label>
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Enable health monitoring
                  </span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowSettings(false);
                  actions.addNotification({
                    type: 'success',
                    title: 'Settings Saved',
                    message: 'Integration settings have been updated'
                  });
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegrationStatus;