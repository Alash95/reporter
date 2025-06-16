import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import QueryBuilder from './components/QueryBuilder';
import SemanticModels from './components/SemanticModels';
import AIAssistant from './components/AIAssistant';
import Analytics from './components/Analytics';
import FileUpload from './components/FileUpload';
import DashboardBuilder from './components/DashboardBuilder';
import ConversationalAI from './components/ConversationalAI';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard/*" element={
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
                      <Route path="/files" element={<FileUpload />} />
                      <Route path="/dashboard-builder" element={<DashboardBuilder />} />
                      <Route path="/conversational-ai" element={<ConversationalAI />} />
                    </Routes>
                  </main>
                </div>
              </div>
            } />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;