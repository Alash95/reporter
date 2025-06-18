import React, { useState, useEffect } from 'react';
import { useAuthenticatedFetch } from '../contexts/AuthContext';
import { 
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Database,
  Sparkles,
  Activity,
  Clock,
  CheckCircle
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const Dashboard: React.FC = () => {
  const authenticatedFetch = useAuthenticatedFetch();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [files, setFiles] = useState([]);
  const [recentQueries, setRecentQueries] = useState([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Fetch multiple data sources in parallel
      const [filesRes, analyticsRes] = await Promise.all([
        authenticatedFetch('http://localhost:8000/api/files/'),
        authenticatedFetch('http://localhost:8000/api/analytics/queries')
      ]);

      if (filesRes.ok) {
        const filesData = await filesRes.json();
        setFiles(filesData);
      }

      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData);
        setRecentQueries(analyticsData.recentQueries || []);
      }

      // Try to fetch some sample data for charts
      await fetchSampleChartData();

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSampleChartData = async () => {
    try {
      // Try to execute a sample query for demo data
      const response = await authenticatedFetch('http://localhost:8000/api/queries/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sql: 'SELECT region, SUM(total) as revenue FROM orders GROUP BY region ORDER BY revenue DESC LIMIT 5',
          model_id: 'ecommerce'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setDashboardData({
          regionData: result.data,
          revenueData: generateMockTrendData(),
          segmentData: generateMockSegmentData()
        });
      } else {
        // Use mock data if real data isn't available
        setDashboardData({
          regionData: generateMockRegionData(),
          revenueData: generateMockTrendData(),
          segmentData: generateMockSegmentData()
        });
      }
    } catch (error) {
      // Use mock data as fallback
      setDashboardData({
        regionData: generateMockRegionData(),
        revenueData: generateMockTrendData(),
        segmentData: generateMockSegmentData()
      });
    }
  };

  const generateMockRegionData = () => [
    { region: 'North America', revenue: 1250000 },
    { region: 'Europe', revenue: 890000 },
    { region: 'Asia Pacific', revenue: 670000 },
    { region: 'Latin America', revenue: 340000 },
    { region: 'Middle East', revenue: 180000 }
  ];

  const generateMockTrendData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map((month, index) => ({
      month,
      revenue: 800000 + Math.random() * 400000 + (index * 50000),
      orders: 1200 + Math.random() * 800 + (index * 100),
      customers: 800 + Math.random() * 400 + (index * 50)
    }));
  };

  const generateMockSegmentData = () => [
    { segment: 'Enterprise', count: 45, revenue: 2100000 },
    { segment: 'SMB', count: 234, revenue: 1800000 },
    { segment: 'Startup', count: 567, revenue: 890000 },
    { segment: 'Individual', count: 1234, revenue: 340000 }
  ];

  const kpiCards = [
    {
      title: 'Total Files',
      value: files.length.toString(),
      change: '+12%',
      trend: 'up' as const,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/50'
    },
    {
      title: 'Processed Files',
      value: files.filter((f: any) => f.processing_status === 'completed').length.toString(),
      change: '+8%',
      trend: 'up' as const,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/50'
    },
    {
      title: 'Total Queries',
      value: analytics?.totalQueries?.toString() || '0',
      change: '+15%',
      trend: 'up' as const,
      icon: Database,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/50'
    },
    {
      title: 'Avg Query Time',
      value: `${analytics?.avgExecutionTime || 0}ms`,
      change: '-12%',
      trend: 'down' as const,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-900/50'
    }
  ];

  const pieColors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 dark:bg-gray-700 h-32 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 dark:bg-gray-700 h-80 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard Overview
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Welcome to your AI Analytics Platform
          </p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((kpi, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {kpi.title}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {kpi.value}
                </p>
              </div>
              <div className={`p-3 rounded-full ${kpi.bgColor}`}>
                <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
              </div>
            </div>
            <div className="flex items-center mt-4">
              {kpi.trend === 'up' ? (
                <ArrowUpRight className="h-4 w-4 text-green-500" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-500" />
              )}
              <span className={`text-sm font-medium ml-1 ${
                kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {kpi.change}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                from last period
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        {dashboardData?.revenueData && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Revenue Trend
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dashboardData.revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F9FAFB'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3B82F6" 
                  strokeWidth={3}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Regional Distribution */}
        {dashboardData?.regionData && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Revenue by Region
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dashboardData.regionData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="revenue"
                  nameKey="region"
                  label={({ region, percent }) => `${region} ${(percent * 100).toFixed(0)}%`}
                >
                  {dashboardData.regionData.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F9FAFB'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Customer Segments */}
        {dashboardData?.segmentData && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Customer Segments
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dashboardData.segmentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="segment" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F9FAFB'
                  }}
                />
                <Bar dataKey="revenue" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Activity
          </h3>
          <div className="space-y-4">
            {files.slice(0, 5).map((file: any, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className={`h-2 w-2 rounded-full ${
                  file.processing_status === 'completed' ? 'bg-green-500' : 
                  file.processing_status === 'processing' ? 'bg-blue-500' : 
                  file.processing_status === 'failed' ? 'bg-red-500' : 'bg-gray-400'
                }`}></div>
                <span className="text-sm text-gray-600 dark:text-gray-300 flex-1">
                  {file.filename} - {file.processing_status}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(file.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
            
            {recentQueries.slice(0, 3).map((query: any, index) => (
              <div key={`query-${index}`} className="flex items-center space-x-3">
                <div className="h-2 w-2 bg-purple-500 rounded-full"></div>
                <span className="text-sm text-gray-600 dark:text-gray-300 flex-1">
                  Query executed - {query.rowCount} rows
                </span>
                <span className="text-xs text-gray-400">
                  {query.executionTime}ms
                </span>
              </div>
            ))}

            {files.length === 0 && recentQueries.length === 0 && (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No activity yet
                </h4>
                <p className="text-gray-500 dark:text-gray-400">
                  Upload your first file or run a query to see activity here
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { 
              icon: FileText, 
              text: 'Upload new dataset', 
              color: 'text-blue-600',
              bgColor: 'bg-blue-50 dark:bg-blue-900/50',
              href: '/dashboard/files'
            },
            { 
              icon: Sparkles, 
              text: 'Chat with AI assistant', 
              color: 'text-purple-600',
              bgColor: 'bg-purple-50 dark:bg-purple-900/50',
              href: '/dashboard/conversational-ai'
            },
            { 
              icon: BarChart, 
              text: 'Create dashboard', 
              color: 'text-green-600',
              bgColor: 'bg-green-50 dark:bg-green-900/50',
              href: '/dashboard/dashboard-builder'
            },
            { 
              icon: Database, 
              text: 'Query builder', 
              color: 'text-orange-600',
              bgColor: 'bg-orange-50 dark:bg-orange-900/50',
              href: '/dashboard/query-builder'
            }
          ].map((action, index) => (
            <a
              key={index}
              href={action.href}
              className="flex items-center space-x-3 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors group"
            >
              <div className={`p-2 rounded-lg ${action.bgColor} group-hover:scale-110 transition-transform`}>
                <action.icon className={`h-5 w-5 ${action.color}`} />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
                {action.text}
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          System Status
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'API Server', status: 'Operational', color: 'green' },
            { label: 'Database', status: 'Healthy', color: 'green' },
            { label: 'AI Services', status: 'Limited', color: 'yellow' }
          ].map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {item.label}
              </span>
              <div className="flex items-center space-x-2">
                <div className={`h-2 w-2 rounded-full ${
                  item.color === 'green' ? 'bg-green-500' : 
                  item.color === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
                <span className={`text-sm ${
                  item.color === 'green' ? 'text-green-600' : 
                  item.color === 'yellow' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;