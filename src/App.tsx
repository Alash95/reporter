// src/App.tsx - Updated with enhanced components and integration

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { IntegrationProvider } from './contexts/IntegrationContext';

// Components
import Login from './components/Login';
import Signup from './components/SignUp';
import LandingPage from './components/LandingPage';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';
import ErrorBoundary from './components/ErrorBoundary';

// Enhanced Dashboard Pages
import EnhancedDashboard from './components/Dashboard';
import EnhancedFileUpload from './components/FileUpload';
import EnhancedConversationalAI from './components/ConversationalAI';
import EnhancedQueryBuilder from './components/QueryBuilder';
import EnhancedDashboardBuilder from './components/DashboardBuilder';
import EnhancedAIAssistant from './components/AIAssistant';
import SemanticModels from './components/SemanticModels';
import Analytics from './components/Analytics';
import IntegrationStatus from './components/IntegrationStatus';
import SystemHealth from './components/SystemHealth';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <IntegrationProvider>
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
                    {/* Enhanced nested routes for dashboard */}
                    <Route index element={<EnhancedDashboard />} />
                    <Route path="files" element={<EnhancedFileUpload />} />
                    <Route path="conversational-ai" element={<EnhancedConversationalAI />} />
                    <Route path="query-builder" element={<EnhancedQueryBuilder />} />
                    <Route path="dashboard-builder" element={<EnhancedDashboardBuilder />} />
                    <Route path="ai-assistant" element={<EnhancedAIAssistant />} />
                    <Route path="models" element={<SemanticModels />} />
                    <Route path="analytics" element={<Analytics />} />
                    <Route path="integration-status" element={<IntegrationStatus />} />
                    <Route path="system-health" element={<SystemHealth />} />
                  </Route>

                  {/* Catch all route */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            </Router>
          </IntegrationProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;