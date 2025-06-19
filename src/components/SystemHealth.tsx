// src/components/SystemHealth.tsx - System health monitoring dashboard

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  RefreshCw,
  Server,
  Database,
  Cpu,
  HardDrive,
  Network,
  Clock,
  TrendingUp,
  TrendingDown,
  Zap,
  Shield,
  AlertTriangle,
  Eye
} from 'lucide-react';
import { useAuthenticatedFetch } from '../contexts/AuthContext';
import { useIntegration } from '../contexts/IntegrationContext';

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  response_time: number;
  uptime_percentage: number;
  last_check: string;
  version?: string;
  dependencies?: string[];
  error_details?: string;
}

interface SystemMetrics {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_throughput: number;
  active_connections: number;
  queue_size: number;
  cache_hit_ratio: number;
  error_rate: number;
}

interface PerformanceMetric {
  timestamp: string;
  value: number;
  metric_name: string;
}

interface SystemAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: string;
  service?: string;
  resolved: boolean;
}

interface SystemHealthData {
  overall_status: 'healthy' | 'degraded' | 'critical';
  services: ServiceHealth[];
  metrics: SystemMetrics;
  performance_history: PerformanceMetric[];
  alerts: SystemAlert[];
  uptime_stats: {
    current_uptime: number;
    uptime_percentage_24h: number;
    uptime_percentage_7d: number;
    uptime_percentage_30d: number;
  };
}

const SystemHealth: React.FC = () => {
  const authenticatedFetch = useAuthenticatedFetch();
  const { actions } = useIntegration();
  
  const [healthData, setHealthData] = useState<SystemHealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('24h');
  const [showAlerts, setShowAlerts] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadSystemHealth = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const response = await authenticatedFetch(`http://localhost:8000/api/system/health?timeRange=${selectedTimeRange}`);
      
      if (response.ok) {
        const data = await response.json();
        setHealthData(data);
      } else {
        throw new Error('Failed to fetch system health data');
      }
    } catch (error) {
      console.error('Failed to load system health:', error);
      actions.addNotification({
        type: 'error',
        title: 'System Health Error',
        message: 'Failed to load system health data'
      });
    } finally {
      setIsLoading(false);
    }
  }, [authenticatedFetch, actions, selectedTimeRange]);

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const response = await authenticatedFetch(`http://localhost:8000/api/system/alerts/${alertId}/acknowledge`, {
        method: 'POST'
      });

      if (response.ok) {
        // Refresh health data
        loadSystemHealth();
        actions.addNotification({
          type: 'success',
          title: 'Alert Acknowledged',
          message: 'Alert has been marked as acknowledged'
        });
      }
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const restartService = async (serviceName: string) => {
    if (!confirm(`Are you sure you want to restart the ${serviceName} service?`)) {
      return;
    }

    try {
      const response = await authenticatedFetch(`http://localhost:8000/api/system/services/${serviceName}/restart`, {
        method: 'POST'
      });

      if (response.ok) {
        actions.addNotification({
          type: 'info',
          title: 'Service Restart',
          message: `${serviceName} service restart initiated`
        });
        
        // Refresh after delay to allow service to restart
        setTimeout(loadSystemHealth, 5000);
      }
    } catch (error) {
      console.error('Failed to restart service:', error);
      actions.addNotification({
        type: 'error',
        title: 'Restart Failed',
        message: `Failed to restart ${serviceName} service`
      });
    }
  };

  useEffect(() => {
    loadSystemHealth();
  }, [loadSystemHealth]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(loadSystemHealth, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, loadSystemHealth]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'down':
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getServiceIcon = (serviceName: string) => {
    const name = serviceName.toLowerCase();
    if (name.includes('database') || name.includes('db')) {
      return <Database className="h-5 w-5 text-blue-600" />;
    }
    if (name.includes('api') || name.includes('server')) {
      return <Server className="h-5 w-5 text-green-600" />;
    }
    if (name.includes('cache') || name.includes('redis')) {
      return <Zap className="h-5 w-5 text-orange-600" />;
    }
    if (name.includes('auth') || name.includes('security')) {
      return <Shield className="h-5 w-5 text-purple-600" />;
    }
    return <Activity className="h-5 w-5 text-gray-600" />;
  };

  const getMetricColor = (value: number, type: 'usage' | 'performance' | 'ratio') => {
    if (type === 'usage') {
      if (value > 90) return 'text-red-600';
      if (value > 75) return 'text-yellow-600';
      return 'text-green-600';
    }
    if (type === 'ratio') {
      if (value > 95) return 'text-green-600';
      if (value > 80) return 'text-yellow-600';
      return 'text-red-600';
    }
    // Performance metrics (lower is better for response time, error rate)
    if (value > 1000) return 'text-red-600';
    if (value > 500) return 'text-yellow-600';
    return 'text-green-600';
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-lg text-gray-600 dark:text-gray-400">Loading system health...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!healthData) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Unable to Load System Health
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            There was an issue connecting to the system health monitoring service.
          </p>
          <button
            onClick={loadSystemHealth}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const unresolvedAlerts = healthData.alerts.filter(alert => !alert.resolved);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              System Health
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Real-time monitoring of system performance and services
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(healthData.overall_status)}
            <span className={`font-medium capitalize ${
              healthData.overall_status === 'healthy' ? 'text-green-600' :
              healthData.overall_status === 'degraded' ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {healthData.overall_status}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Time Range Selector */}
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>

          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 text-sm rounded-md ${
              autoRefresh 
                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            Auto Refresh {autoRefresh ? 'On' : 'Off'}
          </button>

          {/* Alerts Button */}
          <button
            onClick={() => setShowAlerts(!showAlerts)}
            className="relative px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <AlertTriangle className="h-4 w-4" />
            {unresolvedAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {unresolvedAlerts.length}
              </span>
            )}
          </button>

          <button
            onClick={loadSystemHealth}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* System Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">CPU Usage</p>
              <p className={`text-2xl font-bold ${getMetricColor(healthData.metrics.cpu_usage, 'usage')}`}>
                {healthData.metrics.cpu_usage.toFixed(1)}%
              </p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/50 rounded-lg">
              <Cpu className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-2 flex items-center">
            {healthData.metrics.cpu_usage > 75 ? 
              <TrendingUp className="h-4 w-4 text-red-500" /> : 
              <TrendingDown className="h-4 w-4 text-green-500" />
            }
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Memory Usage</p>
              <p className={`text-2xl font-bold ${getMetricColor(healthData.metrics.memory_usage, 'usage')}`}>
                {healthData.metrics.memory_usage.toFixed(1)}%
              </p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/50 rounded-lg">
              <Activity className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Disk Usage</p>
              <p className={`text-2xl font-bold ${getMetricColor(healthData.metrics.disk_usage, 'usage')}`}>
                {healthData.metrics.disk_usage.toFixed(1)}%
              </p>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900/50 rounded-lg">
              <HardDrive className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Cache Hit Ratio</p>
              <p className={`text-2xl font-bold ${getMetricColor(healthData.metrics.cache_hit_ratio, 'ratio')}`}>
                {healthData.metrics.cache_hit_ratio.toFixed(1)}%
              </p>
            </div>
            <div className="p-3 bg-orange-50 dark:bg-orange-900/50 rounded-lg">
              <Zap className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Services Status */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Service Status
            </h2>
          </div>
          
          <div className="divide-y divide-gray-200 dark:divide-gray-600">
            {healthData.services.map((service) => (
              <div key={service.name} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {getServiceIcon(service.name)}
                      {getStatusIcon(service.status)}
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {service.name}
                      </h3>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                        <span>{service.response_time}ms response</span>
                        <span>•</span>
                        <span>{service.uptime_percentage.toFixed(2)}% uptime</span>
                        {service.version && (
                          <>
                            <span>•</span>
                            <span>v{service.version}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => restartService(service.name)}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      title="Restart service"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <button
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      title="View service details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {service.error_details && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-red-700 dark:text-red-300">
                        {service.error_details}
                      </span>
                    </div>
                  </div>
                )}

                {service.dependencies && service.dependencies.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Dependencies: {service.dependencies.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Uptime Stats & Alerts */}
        <div className="space-y-6">
          {/* Uptime Statistics */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Uptime Statistics
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Current Uptime</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatUptime(healthData.uptime_stats.current_uptime)}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">24h Uptime</span>
                <span className={`font-medium ${getMetricColor(healthData.uptime_stats.uptime_percentage_24h, 'ratio')}`}>
                  {healthData.uptime_stats.uptime_percentage_24h.toFixed(2)}%
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">7d Uptime</span>
                <span className={`font-medium ${getMetricColor(healthData.uptime_stats.uptime_percentage_7d, 'ratio')}`}>
                  {healthData.uptime_stats.uptime_percentage_7d.toFixed(2)}%
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">30d Uptime</span>
                <span className={`font-medium ${getMetricColor(healthData.uptime_stats.uptime_percentage_30d, 'ratio')}`}>
                  {healthData.uptime_stats.uptime_percentage_30d.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          {/* System Alerts */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  System Alerts
                </h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {unresolvedAlerts.length} unresolved
                </span>
              </div>
            </div>
            
            <div className="divide-y divide-gray-200 dark:divide-gray-600 max-h-64 overflow-y-auto">
              {unresolvedAlerts.length > 0 ? (
                unresolvedAlerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        {alert.type === 'error' ? 
                          <XCircle className="h-5 w-5 text-red-500" /> :
                          alert.type === 'warning' ?
                          <AlertTriangle className="h-5 w-5 text-yellow-500" /> :
                          <Activity className="h-5 w-5 text-blue-500" />
                        }
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {alert.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {alert.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {new Date(alert.timestamp).toLocaleTimeString()}
                          </span>
                          <button
                            onClick={() => acknowledgeAlert(alert.id)}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700"
                          >
                            Acknowledge
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p className="text-sm">All systems operating normally</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Additional Performance Metrics */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Performance Metrics
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center space-x-3">
              <Network className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Active Connections</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Current concurrent users</p>
              </div>
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {healthData.metrics.active_connections}
            </span>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Queue Size</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Pending operations</p>
              </div>
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {healthData.metrics.queue_size}
            </span>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Error Rate</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Errors per minute</p>
              </div>
            </div>
            <span className={`text-lg font-bold ${getMetricColor(healthData.metrics.error_rate, 'performance')}`}>
              {healthData.metrics.error_rate.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemHealth;