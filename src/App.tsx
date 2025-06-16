import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import SignUp from './components/SignUp';
import Dashboard from './components/Dashboard';
import QueryBuilder from './components/QueryBuilder';
import SemanticModels from './components/SemanticModels';
import AIAssistant from './components/AIAssistant';
import Analytics from './components/Analytics';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/dashboard/*" element={
                <ProtectedRoute>
                  <div className="flex h-screen">
                    <Sidebar />
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <Header />
                      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                        <Routes>
                          <Route path="/" element={<Dashboard />} />
                          <Route path="/query-builder" element={<QueryBuilder />} />
                          <Route path="/models" element={<SemanticModels />} />
                          <Route path="/ai-assistant" element={<AIAssistant />} />
                          <Route path="/analytics" element={<Analytics />} />
                        </Routes>
                      </main>
                    </div>
                  </div>
                </ProtectedRoute>
              } />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;