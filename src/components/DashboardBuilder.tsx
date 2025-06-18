import React, { useState, useEffect } from 'react';
import { useAuthenticatedFetch } from '../contexts/AuthContext';
import { Plus, Edit, Trash2, Save, BarChart3, Table,  Download} from 'lucide-react';
import { LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart as RechartsBar, Bar, PieChart as RechartsPie, Pie, Cell, ResponsiveContainer } from 'recharts';

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

const DashboardBuilder: React.FC = () => {
  const authenticatedFetch = useAuthenticatedFetch();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [currentDashboard, setCurrentDashboard] = useState<Dashboard | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showWidgetModal, setShowWidgetModal] = useState(false);
  const [availableData, setAvailableData] = useState([]);
  const [availableQueries, setAvailableQueries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboards();
    fetchAvailableData();
    fetchAvailableQueries();
  }, []);

  const fetchDashboards = async () => {
    try {
      const response = await authenticatedFetch('http://localhost:8000/api/dashboards/');
      if (response.ok) {
        const data = await response.json();
        setDashboards(data);
        if (data.length > 0 && !currentDashboard) {
          setCurrentDashboard(data[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch dashboards:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableData = async () => {
    try {
      const response = await authenticatedFetch('http://localhost:8000/api/files/');
      if (response.ok) {
        const files = await response.json();
        setAvailableData(files.filter((f: any) => f.processing_status === 'completed'));
      }
    } catch (error) {
      console.error('Failed to fetch available data:', error);
    }
  };

  const fetchAvailableQueries = async () => {
    try {
      const response = await authenticatedFetch('http://localhost:8000/api/queries/');
      if (response.ok) {
        const queries = await response.json();
        setAvailableQueries(queries);
      }
    } catch (error) {
      console.error('Failed to fetch available queries:', error);
    }
  };

  const createNewDashboard = async () => {
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
        setDashboards(prev => [...prev, newDashboard]);
        setCurrentDashboard(newDashboard);
        setIsEditing(true);
      } else {
        const errorData = await response.json();
        alert(`Failed to create dashboard: ${errorData.detail}`);
      }
    } catch (error) {
      alert('Failed to create dashboard. Please try again.');
    }
  };

  const saveDashboard = async () => {
    if (!currentDashboard) return;

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
        fetchDashboards();
        alert('Dashboard saved successfully!');
      } else {
        const errorData = await response.json();
        alert(`Failed to save dashboard: ${errorData.detail}`);
      }
    } catch (error) {
      alert('Failed to save dashboard. Please try again.');
    }
  };

  const deleteDashboard = async (dashboardId: string) => {
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
          setCurrentDashboard(dashboards.length > 1 ? dashboards[0] : null);
        }
      } else {
        alert('Failed to delete dashboard.');
      }
    } catch (error) {
      alert('Failed to delete dashboard. Please try again.');
    }
  };

  const addWidget = async (widgetData: any) => {
    if (!currentDashboard) return;

    try {
      const response = await authenticatedFetch(`http://localhost:8000/api/dashboards/${currentDashboard.id}/widgets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: widgetData.name,
          widget_type: widgetData.type,
          configuration: {
            chart_type: widgetData.chart_type,
            data_config: widgetData.data_config,
            data: widgetData.data
          },
          data_source: { type: widgetData.data_source_type, id: widgetData.data_source_id },
          position: { x: 0, y: 0, w: 6, h: 4 }
        }),
      });

      if (response.ok) {
        const newWidget = await response.json();
        setCurrentDashboard({
          ...currentDashboard,
          widgets: [...currentDashboard.widgets, {
            id: newWidget.id,
            name: widgetData.name,
            type: widgetData.type,
            chart_type: widgetData.chart_type,
            data: widgetData.data || [],
            config: widgetData.data_config || {},
            position: { x: 0, y: 0, w: 6, h: 4 }
          }]
        });
        setShowWidgetModal(false);
      } else {
        const errorData = await response.json();
        alert(`Failed to add widget: ${errorData.detail}`);
      }
    } catch (error) {
      alert('Failed to add widget. Please try again.');
    }
  };

  const removeWidget = async (widgetId: string) => {
    if (!currentDashboard || !confirm('Are you sure you want to remove this widget?')) {
      return;
    }

    try {
      const response = await authenticatedFetch(`http://localhost:8000/api/dashboards/widgets/${widgetId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setCurrentDashboard({
          ...currentDashboard,
          widgets: currentDashboard.widgets.filter(w => w.id !== widgetId)
        });
      } else {
        alert('Failed to remove widget.');
      }
    } catch (error) {
      alert('Failed to remove widget. Please try again.');
    }
  };

  const renderWidget = (widget: Widget) => {
    switch (widget.type) {
      case 'chart':
        return renderChart(widget);
      case 'metric':
        return renderMetric(widget);
      case 'table':
        return renderTable(widget);
      default:
        return <div className="flex items-center justify-center h-full text-gray-500">Unknown widget type</div>;
    }
  };

  const renderChart = (widget: Widget) => {
    if (!widget.data || widget.data.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-gray-500">
          No data available
        </div>
      );
    }

    const chartData = widget.data.map((item, index) => ({
      name: item.x || item.label || item.name || `Item ${index + 1}`,
      value: item.y || item.value || item.count || 0,
      ...item
    }));

    switch (widget.chart_type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLine data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} />
            </RechartsLine>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPie>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 60%)`} />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPie>
          </ResponsiveContainer>
        );
      default: // bar
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBar data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8B5CF6" />
            </RechartsBar>
          </ResponsiveContainer>
        );
    }
  };

  const renderMetric = (widget: Widget) => {
    const value = widget.data?.[0]?.value || 0;
    const label = widget.data?.[0]?.label || widget.name;
    const change = widget.data?.[0]?.change;

    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <div className="text-3xl font-bold text-gray-900 dark:text-white">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
          {label}
        </div>
        {change && (
          <div className={`text-sm mt-2 ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change > 0 ? '+' : ''}{change}%
          </div>
        )}
      </div>
    );
  };

  const renderTable = (widget: Widget) => {
    if (!widget.data || widget.data.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-gray-500">
          No data available
        </div>
      );
    }

    const columns = Object.keys(widget.data[0]);

    return (
      <div className="overflow-auto h-full">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {widget.data.slice(0, 10).map((row: any, index: number) => (
              <tr key={index}>
                {columns.map((col) => (
                  <td
                    key={col}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
                  >
                    {typeof row[col] === 'number' ? row[col].toLocaleString() : row[col]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const exportDashboard = () => {
    if (!currentDashboard) return;

    const dataStr = JSON.stringify(currentDashboard, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dashboard-${currentDashboard.name.replace(/\s+/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

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
          {currentDashboard && (
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
                    ? 'bg-gray-600 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <Edit className="h-4 w-4" />
                <span>{isEditing ? 'Exit Edit' : 'Edit'}</span>
              </button>
              
              {isEditing && (
                <>
                  <button
                    onClick={() => setShowWidgetModal(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Widget</span>
                  </button>
                  
                  <button
                    onClick={saveDashboard}
                    className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save</span>
                  </button>
                </>
              )}

              <button
                onClick={exportDashboard}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>

              <button
                onClick={() => deleteDashboard(currentDashboard.id)}
                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-lg"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Dashboard Content */}
      {currentDashboard ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
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
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {currentDashboard.widgets.length} widget(s)
            </div>
          </div>

          {currentDashboard.widgets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentDashboard.widgets.map((widget) => (
                <div
                  key={widget.id}
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 h-64 relative group border border-gray-200 dark:border-gray-600"
                >
                  {isEditing && (
                    <div className="absolute top-2 right-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => removeWidget(widget.id)}
                        className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                        title="Remove widget"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {widget.name}
                    </h3>
                    <div className="flex items-center space-x-1">
                      {widget.type === 'chart' && <BarChart3 className="h-4 w-4 text-gray-400" />}
                      {widget.type === 'metric' && <div className="h-4 w-4 bg-gray-400 rounded"></div>}
                      {widget.type === 'table' && <Table className="h-4 w-4 text-gray-400" />}
                    </div>
                  </div>
                  <div className="h-48">
                    {renderWidget(widget)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No widgets yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Add your first widget to get started with your dashboard
              </p>
              {isEditing && (
                <button
                  onClick={() => setShowWidgetModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Widget
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No dashboards yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Create your first dashboard to start building visualizations
          </p>
          <button
            onClick={createNewDashboard}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Dashboard
          </button>
        </div>
      )}

      {/* Widget Modal */}
      {showWidgetModal && (
        <WidgetModal
          availableData={availableData}
          availableQueries={availableQueries}
          onAdd={addWidget}
          onClose={() => setShowWidgetModal(false)}
        />
      )}
    </div>
  );
};

// Widget Modal Component
const WidgetModal: React.FC<{
  availableData: any[];
  availableQueries: any[];
  onAdd: (widget: any) => void;
  onClose: () => void;
}> = ({ availableData, availableQueries, onAdd, onClose }) => {
  const [widgetType, setWidgetType] = useState('chart');
  const [chartType, setChartType] = useState('bar');
  const [widgetName, setWidgetName] = useState('');
  const [dataSourceType, setDataSourceType] = useState('query');
  const [selectedDataSource, setSelectedDataSource] = useState('');

  const handleSubmit = () => {
    if (!widgetName || !selectedDataSource) {
      alert('Please fill in all required fields');
      return;
    }

    // Generate mock data based on the widget type and chart type
    let mockData: any[] = [];

    if (widgetType === 'metric') {
      mockData = [{ 
        value: Math.floor(Math.random() * 10000) + 1000, 
        label: widgetName,
        change: Math.floor(Math.random() * 20) - 10
      }];
    } else if (widgetType === 'chart') {
      if (chartType === 'pie') {
        mockData = [
          { name: 'Category A', value: Math.floor(Math.random() * 100) + 20 },
          { name: 'Category B', value: Math.floor(Math.random() * 100) + 20 },
          { name: 'Category C', value: Math.floor(Math.random() * 100) + 20 },
          { name: 'Category D', value: Math.floor(Math.random() * 100) + 20 }
        ];
      } else {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        mockData = months.map(month => ({
          name: month,
          value: Math.floor(Math.random() * 1000) + 100
        }));
      }
    } else if (widgetType === 'table') {
      mockData = [
        { name: 'Product A', sales: 1250, growth: '12%' },
        { name: 'Product B', sales: 890, growth: '8%' },
        { name: 'Product C', sales: 650, growth: '-3%' },
        { name: 'Product D', sales: 420, growth: '15%' }
      ];
    }

    onAdd({
      name: widgetName,
      type: widgetType,
      chart_type: widgetType === 'chart' ? chartType : undefined,
      data: mockData,
      data_config: {
        x_column: 'name',
        y_column: 'value',
        aggregation: 'sum'
      },
      data_source_type: dataSourceType,
      data_source_id: selectedDataSource
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Add New Widget
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Widget Name *
            </label>
            <input
              type="text"
              value={widgetName}
              onChange={(e) => setWidgetName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter widget name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Widget Type *
            </label>
            <select
              value={widgetType}
              onChange={(e) => setWidgetType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="chart">Chart</option>
              <option value="metric">Metric</option>
              <option value="table">Table</option>
            </select>
          </div>

          {widgetType === 'chart' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Chart Type
              </label>
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="bar">Bar Chart</option>
                <option value="line">Line Chart</option>
                <option value="pie">Pie Chart</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Data Source Type
            </label>
            <select
              value={dataSourceType}
              onChange={(e) => setDataSourceType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="query">Saved Query</option>
              <option value="file">Uploaded File</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Data Source *
            </label>
            <select
              value={selectedDataSource}
              onChange={(e) => setSelectedDataSource(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Select data source</option>
              {dataSourceType === 'query' 
                ? availableQueries.map((query: any) => (
                    <option key={query.id} value={query.id}>
                      {query.name || `Query ${query.id}`}
                    </option>
                  ))
                : availableData.map((data: any) => (
                    <option key={data.id} value={data.id}>
                      {data.filename}
                    </option>
                  ))
              }
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!widgetName || !selectedDataSource}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Widget
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardBuilder;