import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const Dashboard: React.FC = () => {
  const { token } = useAuth();
  const [revenueData, setRevenueData] = useState([]);
  const [segmentData, setSegmentData] = useState([]);
  const [regionData, setRegionData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch revenue by period
      const revenueResponse = await fetch('http://localhost:8000/api/query/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          sql: 'SELECT period, revenue FROM revenue_by_month',
          model: 'ecommerce'
        }),
      });
      const revenueResult = await revenueResponse.json();
      setRevenueData(revenueResult.data);

      // Fetch customer segments
      const segmentResponse = await fetch('http://localhost:8000/api/query/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          sql: 'SELECT segment, total_revenue FROM customer_segments',
          model: 'ecommerce'
        }),
      });
      const segmentResult = await segmentResponse.json();
      setSegmentData(segmentResult.data);

      // Fetch region data
      const regionResponse = await fetch('http://localhost:8000/api/query/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          sql: 'SELECT region, revenue FROM revenue_by_region',
          model: 'ecommerce'
        }),
      });
      const regionResult = await regionResponse.json();
      setRegionData(regionResult.data);

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setIsLoading(false);
    }
  };

  const kpiCards = [
    {
      title: 'Total Revenue',
      value: '$1,234,567',
      change: '+12.5%',
      trend: 'up',
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      title: 'Active Customers',
      value: '8,432',
      change: '+8.2%',
      trend: 'up',
      icon: Users,
      color: 'text-blue-600'
    },
    {
      title: 'Total Orders',
      value: '15,678',
      change: '+15.3%',
      trend: 'up',
      icon: ShoppingCart,
      color: 'text-purple-600'
    },
    {
      title: 'Conversion Rate',
      value: '3.24%',
      change: '-2.1%',
      trend: 'down',
      icon: TrendingUp,
      color: 'text-orange-600'
    }
  ];

  const pieColors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B'];

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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard Overview
        </h1>
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
              <div className={`p-3 rounded-full bg-gray-50 dark:bg-gray-700 ${kpi.color}`}>
                <kpi.icon className="h-6 w-6" />
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
                from last month
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Revenue Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="period" stroke="#6B7280" />
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

        {/* Customer Segments */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Revenue by Customer Segment
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={segmentData}>
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
              <Bar dataKey="total_revenue" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Regional Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Revenue by Region
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={regionData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="revenue"
                nameKey="region"
                label={({ region, percent }) => `${region} ${(percent * 100).toFixed(0)}%`}
              >
                {regionData.map((entry, index) => (
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

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Activity
          </h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                New customer segment analysis completed
              </span>
              <span className="text-xs text-gray-400">2m ago</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Monthly revenue report generated
              </span>
              <span className="text-xs text-gray-400">15m ago</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="h-2 w-2 bg-purple-500 rounded-full"></div>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                AI query optimization improved performance by 23%
              </span>
              <span className="text-xs text-gray-400">1h ago</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="h-2 w-2 bg-orange-500 rounded-full"></div>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Cache optimization completed
              </span>
              <span className="text-xs text-gray-400">2h ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;