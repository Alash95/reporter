import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit, Trash2, Save, BarChart3, PieChart, LineChart, Table } from 'lucide-react';
import Plot from 'react-plotly.js';

interface Widget {
  id: string;
  name: string;
  type: 'chart' | 'metric' | 'table';
  chartType?: 'bar' | 'line' | 'pie' | 'scatter';
  data: any[];
  config: any;
  position: { x: number; y: number; w: number; h: number };
}

interface Dashboard {
  id: string;
  name: string;
  description: string;
  widgets: Widget[];
}

const DashboardBuilder: React.FC = () => {
  const { token } = useAuth();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [currentDashboard, setCurrentDashboard] = useState<Dashboard | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showWidgetModal, setShowWidgetModal] = useState(false);
  const [availableData, setAvailableData] = useState([]);

  useEffect(() => {
    fetchDashboards();
    fetchAvailableData();
  }, []);

  const fetchDashboards = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/dashboards/', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setDashboards(data);
      if (data.length > 0 && !currentDashboard) {
        setCurrentDashboard(data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch dashboards:', error);
    }
  };

  const fetchAvailableData = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/files/', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const files = await response.json();
      setAvailableData(files.filter((f: any) => f.processing_status === 'completed'));
    } catch (error) {
      console.error('Failed to fetch available data:', error);
    }
  };

  const createNewDashboard = async () => {
    const name = prompt('Dashboard name:');
    if (!name) return;

    try {
      const response = await fetch('http://localhost:8000/api/dashboards/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          description: '',
          layout: {},
          widgets: [],
          is_public: false
        }),
      });

      if (response.ok) {
        const newDashboard = await response.json();
        setDashboards(prev => [...prev, newDashboard]);
        setCurrentDashboard(newDashboard);
      }
    } catch (error) {
      console.error('Failed to create dashboard:', error);
    }
  };

  const saveDashboard = async () => {
    if (!currentDashboard) return;

    try {
      const response = await fetch(`http://localhost:8000/api/dashboards/${currentDashboard.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: currentDashboard.name,
          description: currentDashboard.description,
          layout: {},
          widgets: currentDashboard.widgets,
          is_public: false
        }),
      });

      if (response.ok) {
        setIsEditing(false);
        fetchDashboards();
      }
    } catch (error) {
      console.error('Failed to save dashboard:', error);
    }
  };

  const addWidget = (widgetData: any) => {
    if (!currentDashboard) return;

    const newWidget: Widget = {
      id: Date.now().toString(),
      name: widgetData.name,
      type: widgetData.type,
      chartType: widgetData.chartType,
      data: widgetData.data || [],
      config: widgetData.config || {},
      position: { x: 0, y: 0, w: 6, h: 4 }
    };

    setCurrentDashboard({
      ...currentDashboard,
      widgets: [...currentDashboard.widgets, newWidget]
    });
    setShowWidgetModal(false);
  };

  const removeWidget = (widgetId: string) => {
    if (!currentDashboard) return;

    setCurrentDashboard({
      ...currentDashboard,
      widgets: currentDashboard.widgets.filter(w => w.id !== widgetId)
    });
  };

  const onDragEnd = (result: any) => {
    if (!result.destination || !currentDashboard) return;

    const widgets = Array.from(currentDashboard.widgets);
    const [reorderedWidget] = widgets.splice(result.source.index, 1);
    widgets.splice(result.destination.index, 0, reorderedWidget);

    setCurrentDashboard({
      ...currentDashboard,
      widgets
    });
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
        return <div>Unknown widget type</div>;
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

    const plotData = [{
      x: widget.data.map((d: any) => d.x || d.label),
      y: widget.data.map((d: any) => d.y || d.value),
      type: widget.chartType === 'pie' ? 'pie' : widget.chartType || 'bar',
      name: widget.name
    }];

    return (
      <Plot
        data={plotData}
        layout={{
          title: widget.name,
          autosize: true,
          margin: { l: 40, r: 40, t: 40, b: 40 }
        }}
        style={{ width: '100%', height: '100%' }}
        config={{ responsive: true }}
      />
    );
  };

  const renderMetric = (widget: Widget) => {
    const value = widget.data?.[0]?.value || 0;
    const label = widget.data?.[0]?.label || widget.name;

    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-3xl font-bold text-gray-900 dark:text-white">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          {label}
        </div>
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
                    {row[col]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard Builder
          </h1>
          {currentDashboard && (
            <select
              value={currentDashboard.id}
              onChange={(e) => {
                const dashboard = dashboards.find(d => d.id === e.target.value);
                setCurrentDashboard(dashboard || null);
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
            </>
          )}
        </div>
      </div>

      {/* Dashboard Content */}
      {currentDashboard ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            {currentDashboard.name}
          </h2>

          {isEditing ? (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="widgets">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  >
                    {currentDashboard.widgets.map((widget, index) => (
                      <Draggable key={widget.id} draggableId={widget.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 h-64 relative group"
                          >
                            <button
                              onClick={() => removeWidget(widget.id)}
                              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            {renderWidget(widget)}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentDashboard.widgets.map((widget) => (
                <div
                  key={widget.id}
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 h-64"
                >
                  {renderWidget(widget)}
                </div>
              ))}
            </div>
          )}

          {currentDashboard.widgets.length === 0 && (
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
  onAdd: (widget: any) => void;
  onClose: () => void;
}> = ({ availableData, onAdd, onClose }) => {
  const [widgetType, setWidgetType] = useState('chart');
  const [chartType, setChartType] = useState('bar');
  const [widgetName, setWidgetName] = useState('');
  const [selectedData, setSelectedData] = useState('');

  const handleSubmit = () => {
    if (!widgetName || !selectedData) return;

    // Mock data for demonstration
    const mockData = [
      { x: 'Jan', y: 100 },
      { x: 'Feb', y: 150 },
      { x: 'Mar', y: 120 },
      { x: 'Apr', y: 180 },
    ];

    onAdd({
      name: widgetName,
      type: widgetType,
      chartType: widgetType === 'chart' ? chartType : undefined,
      data: widgetType === 'metric' ? [{ value: 1234, label: widgetName }] : mockData,
      config: {}
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Add New Widget
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Widget Name
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
              Widget Type
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
                <option value="scatter">Scatter Plot</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Data Source
            </label>
            <select
              value={selectedData}
              onChange={(e) => setSelectedData(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Select data source</option>
              {availableData.map((data: any) => (
                <option key={data.id} value={data.id}>
                  {data.filename}
                </option>
              ))}
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
            disabled={!widgetName || !selectedData}
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