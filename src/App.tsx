import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Components
import Login from './components/Login';
import Signup from './components/SignUp';
import LandingPage from './components/LandingPage';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';

// Dashboard Pages
import Dashboard from './components/Dashboard';
import FileUpload from './components/FileUpload';
import ConversationalAI from './components/ConversationalAI';
import QueryBuilder from './components/QueryBuilder';
import DashboardBuilder from './components/DashboardBuilder';
import AIAssistant from './components/AIAssistant';
import SemanticModels from './components/SemanticModels';
import Analytics from './components/Analytics';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              
              {/* Protected Dashboard Routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }>
                {/* Nested routes for dashboard */}
                <Route index element={<Dashboard />} />
                <Route path="files" element={<FileUpload />} />
                <Route path="conversational-ai" element={<ConversationalAI />} />
                <Route path="query-builder" element={<QueryBuilder />} />
                <Route path="dashboard-builder" element={<DashboardBuilder />} />
                <Route path="ai-assistant" element={<AIAssistant />} />
                <Route path="models" element={<SemanticModels />} />
                <Route path="analytics" element={<Analytics />} />
              </Route>

              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;