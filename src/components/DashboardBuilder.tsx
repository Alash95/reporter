// src/components/DashboardBuilder.tsx - FIXED VERSION
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthenticatedFetch } from '../contexts/AuthContext';
import { useRefreshManager } from '../hooks/useRefreshManager';
import { Plus, Edit, Trash2, Save, BarChart3, Table, Download, RefreshCw, Settings } from 'lucide-react';
import { 
  LineChart as RechartsLine, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  BarChart as RechartsBar, 
  Bar, 
  PieChart as RechartsPie, 
  Pie,
  ResponsiveContainer 
} from 'recharts';

interface Widget {
  id: string;
  name: string;
  type: 'chart' | 'metric' | 'table';
  chart_type?: 'bar' | 'line' | 'pie' | 'scatter';
  data: any[];
  config: any;
  position: { x: number; y: number; w: number; h: number };
}

interface Dashboard {
  id: string;
  name: string;
  description: string;
  widgets: Widget[];
  layout: any;
  created_at: string;
}

interface DataFile {
  id: string;
  filename: string;
  processing_status: string;
}

interface QueryData {
  id: string;
  name: string;
  sql: string;
  result_data: any[];
}

const DashboardBuilder: React.FC = () => {
  const authenticatedFetch = useAuthenticatedFetch();
  const refreshManager = useRefreshManager();
  
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [currentDashboard, setCurrentDashboard] = useState<Dashboard | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showWidgetModal, setShowWidgetModal] = useState(false);
  const [availableData, setAvailableData] = useState<DataFile[]>([]);
  const [availableQueries, setAvailableQueries] = useState<QueryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState<Widget | null>(null);
  console.log({selectedWidget, availableData, availableQueries});

  // FIXED: Use refs to prevent unnecessary re-renders and manage state properly
  const mountedRef = useRef<boolean>(true);
  const lastFetchRef = useRef<number>(0);
  const fetchingRef = useRef<boolean>(false);

  // FIXED: Stable functions with proper error handling and debouncing
  const fetchDashboards = useCallback(async () => {
    const now = Date.now();
    
    // Debounce rapid calls
    if (fetchingRef.current || now - lastFetchRef.current < 5000) {
      return;
    }

    fetchingRef.current = true;
    lastFetchRef.current = now;

    try {
      if (!mountedRef.current) return;

      const response = await authenticatedFetch('http://localhost:8000/api/dashboards/');
      if (response.ok && mountedRef.current) {
        const data = await response.json();
        setDashboards(data);
        
        // Set current dashboard if none selected
        if (data.length > 0 && !currentDashboard) {
          setCurrentDashboard(data[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch dashboards:', error);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
      fetchingRef.current = false;
    }
  }, [authenticatedFetch, currentDashboard]);

  const fetchAvailableData = useCallback(async () => {
    try {
      if (!mountedRef.current) return;

      const response = await authenticatedFetch('http://localhost:8000/api/files/');
      if (response.ok && mountedRef.current) {
        const files = await response.json();
        setAvailableData(files.filter((f: DataFile) => f.processing_status === 'completed'));
      }
    } catch (error) {
      console.error('Failed to fetch available data:', error);
    }
  }, [authenticatedFetch]);

  const fetchAvailableQueries = useCallback(async () => {
    try {
      if (!mountedRef.current) return;

      const response = await authenticatedFetch('http://localhost:8000/api/queries/');
      if (response.ok && mountedRef.current) {
        const queries = await response.json();
        setAvailableQueries(queries);
      }
    } catch (error) {
      console.error('Failed to fetch available queries:', error);
    }
  }, [authenticatedFetch]);

  // FIXED: Combined initialization function
  const initializeDashboardBuilder = useCallback(async () => {
    if (!mountedRef.current) return;
    
    setIsLoading(true);
    
    try {
      await Promise.all([
        fetchDashboards(),
        fetchAvailableData(),
        fetchAvailableQueries()
      ]);
    } catch (error) {
      console.error('Failed to initialize dashboard builder:', error);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [fetchDashboards, fetchAvailableData, fetchAvailableQueries]);

  // FIXED: Proper useEffect with refresh manager
  useEffect(() => {
    mountedRef.current = true;

    // Initial load
    initializeDashboardBuilder();

    // Register with refresh manager
    refreshManager.register('dashboard-builder-data', initializeDashboardBuilder, {
      interval: 120000, // 2 minutes
      enabled: true,
      minInterval: 30000, // Don't refresh more than once every 30 seconds
      maxRetries: 3
    });

    return () => {
      mountedRef.current = false;
      refreshManager.unregister('dashboard-builder-data');
    };
  }, [refreshManager, initializeDashboardBuilder]);

  const createNewDashboard = useCallback(async () => {
    const name = prompt('Dashboard name:');
    if (!name) return;

    const description = prompt('Dashboard description (optional):') || '';

    try {
      const response = await authenticatedFetch('http://localhost:8000/api/dashboards/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          layout: {},
          widgets: [],
          is_public: false
        }),
      });

      if (response.ok) {
        const newDashboard = await response.json();
        setDashboards(prev => [newDashboard, ...prev]);
        setCurrentDashboard(newDashboard);
        setIsEditing(true);
      } else {
        const errorData = await response.json();
        alert(`Failed to create dashboard: ${errorData.detail}`);
      }
    } catch (error) {
      alert('Failed to create dashboard. Please try again.');
    }
  }, [authenticatedFetch]);

  const saveDashboard = useCallback(async () => {
    if (!currentDashboard || isSaving) return;

    setIsSaving(true);

    try {
      const response = await authenticatedFetch(`http://localhost:8000/api/dashboards/${currentDashboard.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: currentDashboard.name,
          description: currentDashboard.description,
          layout: currentDashboard.layout,
          widgets: currentDashboard.widgets,
          is_public: false
        }),
      });

      if (response.ok) {
        setIsEditing(false);
        
        // Update dashboard in list
        setDashboards(prev => 
          prev.map(d => d.id === currentDashboard.id ? currentDashboard : d)
        );
        
        alert('Dashboard saved successfully!');
      } else {
        const errorData = await response.json();
        alert(`Failed to save dashboard: ${errorData.detail}`);
      }
    } catch (error) {
      alert('Failed to save dashboard. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [currentDashboard, isSaving, authenticatedFetch]);

  const deleteDashboard = useCallback(async (dashboardId: string) => {
    if (!confirm('Are you sure you want to delete this dashboard?')) {
      return;
    }

    try {
      const response = await authenticatedFetch(`http://localhost:8000/api/dashboards/${dashboardId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDashboards(prev => prev.filter(d => d.id !== dashboardId));
        
        if (currentDashboard?.id === dashboardId) {
          const remainingDashboards = dashboards.filter(d => d.id !== dashboardId);
          setCurrentDashboard(remainingDashboards.length > 0 ? remainingDashboards[0] : null);
        }
      } else {
        alert('Failed to delete dashboard.');
      }
    } catch (error) {
      alert('Failed to delete dashboard. Please try again.');
    }
  }, [authenticatedFetch, currentDashboard, dashboards]);

  // const addWidget = useCallback(async (widgetData: any) => {
  //   if (!currentDashboard) return;

  //   try {
  //     const response = await authenticatedFetch(`http://localhost:8000/api/dashboards/${currentDashboard.id}/widgets`, {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({
  //         name: widgetData.name,
  //         widget_type: widgetData.type,
  //         configuration: {
  //           chart_type: widgetData.chart_type,
  //           data_config: widgetData.data_config,
  //           data: widgetData.data
  //         },
  //         data_source: { type: widgetData.data_source_type, id: widgetData.data_source_id },
  //         position: { x: 0, y: 0, w: 6, h: 4 }
  //       }),
  //     });

  //     if (response.ok) {
  //       const newWidget = await response.json();
  //       const updatedDashboard = {
  //         ...currentDashboard,
  //         widgets: [...currentDashboard.widgets, {
  //           id: newWidget.id,
  //           name: widgetData.name,
  //           type: widgetData.type,
  //           chart_type: widgetData.chart_type,
  //           data: widgetData.data || [],
  //           config: widgetData.data_config || {},
  //           position: { x: 0, y: 0, w: 6, h: 4 }
  //         }]
  //       };
        
  //       setCurrentDashboard(updatedDashboard);
  //       setShowWidgetModal(false);
  //     } else {
  //       const errorData = await response.json();
  //       alert(`Failed to add widget: ${errorData.detail}`);
  //     }
  //   } catch (error) {
  //     alert('Failed to add widget. Please try again.');
  //   }
  // }, [currentDashboard, authenticatedFetch]);

  const removeWidget = useCallback(async (widgetId: string) => {
    if (!currentDashboard || !confirm('Are you sure you want to remove this widget?')) {
      return;
    }

    try {
      const response = await authenticatedFetch(`http://localhost:8000/api/dashboards/widgets/${widgetId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const updatedDashboard = {
          ...currentDashboard,
          widgets: currentDashboard.widgets.filter(w => w.id !== widgetId)
        };
        setCurrentDashboard(updatedDashboard);
      } else {
        alert('Failed to remove widget.');
      }
    } catch (error) {
      alert('Failed to remove widget. Please try again.');
    }
  }, [currentDashboard, authenticatedFetch]);

  const exportDashboard = useCallback(() => {
    if (!currentDashboard) return;

    const dataStr = JSON.stringify(currentDashboard, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dashboard-${currentDashboard.name.replace(/\s+/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [currentDashboard]);

  const handleRefresh = useCallback(() => {
    refreshManager.refresh('dashboard-builder-data', true);
  }, [refreshManager]);

  const renderWidget = useCallback((widget: Widget) => {
    const data = widget.data || [];

    switch (widget.type) {
      case 'chart':
        return (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              {widget.chart_type === 'line' ? (
                <RechartsLine data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={Object.keys(data[0] || {})[0]} />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey={Object.keys(data[0] || {})[1]} stroke="#3B82F6" />
                </RechartsLine>
              ) : widget.chart_type === 'bar' ? (
                <RechartsBar data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={Object.keys(data[0] || {})[0]} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey={Object.keys(data[0] || {})[1]} fill="#3B82F6" />
                </RechartsBar>
              ) : widget.chart_type === 'pie' ? (
                <RechartsPie data={data}>
                  <Pie
                    dataKey={Object.keys(data[0] || {})[1]}
                    nameKey={Object.keys(data[0] || {})[0]}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#3B82F6"
                    label
                  />
                  <Tooltip />
                </RechartsPie>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  Unsupported chart type
                </div>
              )}
            </ResponsiveContainer>
          </div>
        );

      case 'metric':
        const value = data.length > 0 ? Object.values(data[0])[0] : 0;
        return (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {/* {typeof value === 'number' ? value.toLocaleString() : value} */}
                {value?.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {widget.config?.unit || ''}
              </div>
            </div>
          </div>
        );

      case 'table':
        if (!data || data.length === 0) {
          return (
            <div className="flex items-center justify-center h-32 text-gray-500">
              No data available
            </div>
          );
        }

        const columns = Object.keys(data[0]);
        const rows = data.slice(0, 10); // Limit to 10 rows

        return (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {columns.map((col) => (
                    <th key={col} className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {rows.map((row, index) => (
                  <tr key={index}>
                    {columns.map((col) => (
                      <td key={col} className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {typeof row[col] === 'number' ? row[col].toLocaleString() : row[col]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center h-32 text-gray-500">
            Unknown widget type
          </div>
        );
    }
  }, []);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
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
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Dashboard Builder
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Create and customize interactive dashboards
            </p>
          </div>
          {currentDashboard && dashboards.length > 1 && (
            <select
              value={currentDashboard.id}
              onChange={(e) => {
                const dashboard = dashboards.find(d => d.id === e.target.value);
                setCurrentDashboard(dashboard || null);
                setIsEditing(false);
              }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {dashboards.map((dashboard) => (
                <option key={dashboard.id} value={dashboard.id}>
                  {dashboard.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={fetchingRef.current}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <RefreshCw className={`h-4 w-4 ${fetchingRef.current ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={createNewDashboard}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            <span>New Dashboard</span>
          </button>
          
          {currentDashboard && (
            <>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                  isEditing 
                    ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                    : 'bg-gray-600 text-white hover:bg-gray-700'
                }`}
              >
                <Edit className="h-4 w-4" />
                <span>{isEditing ? 'View Mode' : 'Edit Mode'}</span>
              </button>

              {isEditing && (
                <button
                  onClick={saveDashboard}
                  disabled={isSaving}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{isSaving ? 'Saving...' : 'Save'}</span>
                </button>
              )}

              <button
                onClick={exportDashboard}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>

              <button
                onClick={() => deleteDashboard(currentDashboard.id)}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Dashboard Content */}
      {!currentDashboard ? (
        <div className="text-center py-12">
          <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No dashboards found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Create your first dashboard to get started with data visualization.
          </p>
          <button
            onClick={createNewDashboard}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mx-auto"
          >
            <Plus className="h-5 w-5" />
            <span>Create Dashboard</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Dashboard Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {currentDashboard.name}
                </h2>
                {currentDashboard.description && (
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    {currentDashboard.description}
                  </p>
                )}
              </div>
              
              {isEditing && (
                <button
                  onClick={() => setShowWidgetModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Widget</span>
                </button>
              )}
            </div>
          </div>

          {/* Widgets Grid */}
          {currentDashboard.widgets.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
              <Table className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No widgets yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Add widgets to visualize your data on this dashboard.
              </p>
              {isEditing && (
                <button
                  onClick={() => setShowWidgetModal(true)}
                  className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mx-auto"
                >
                  <Plus className="h-5 w-5" />
                  <span>Add First Widget</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentDashboard.widgets.map((widget) => (
                <div key={widget.id} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {widget.name}
                    </h3>
                    
                    {isEditing && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setSelectedWidget(widget)}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          <Settings className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => removeWidget(widget.id)}
                          className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {renderWidget(widget)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Widget Modal - simplified for this fix */}
      {showWidgetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Add Widget
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Widget Name
                </label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter widget name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Widget Type
                </label>
                <select className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option value="chart">Chart</option>
                  <option value="metric">Metric</option>
                  <option value="table">Table</option>
                </select>
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowWidgetModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowWidgetModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Widget
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardBuilder;