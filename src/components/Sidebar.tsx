import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  BarChart3, 
  Database, 
  Sparkles, 
  Settings, 
  PieChart,
  Brain,
  Activity,
  Upload,
  Layout,
  MessageSquare
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
    { name: 'File Upload', href: '/dashboard/files', icon: Upload },
    { name: 'Conversational AI', href: '/dashboard/conversational-ai', icon: MessageSquare },
    { name: 'Query Builder', href: '/dashboard/query-builder', icon: Database },
    { name: 'Dashboard Builder', href: '/dashboard/dashboard-builder', icon: Layout },
    { name: 'AI Assistant', href: '/dashboard/ai-assistant', icon: Brain },
    { name: 'Semantic Models', href: '/dashboard/models', icon: Sparkles },
    { name: 'Analytics', href: '/dashboard/analytics', icon: Activity },
  ];

  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-6">
        <Link to="/" className="flex items-center space-x-2">
          <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900 dark:text-white">
            Analytics
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
          <div className="h-2 w-2 bg-green-500 rounded-full"></div>
          <span>All systems operational</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;