// src/components/ErrorBoundary.tsx - Enhanced error handling with integration context

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, FileText, Mail } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId: string;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Send error to monitoring service
    this.reportError(error, errorInfo);
  }

  reportError = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      // In a real application, you would send this to your error monitoring service
      const errorReport = {
        errorId: this.state.errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: 'current_user', // Get from auth context
        platform: 'ai_analytics_platform',
        version: '2.0.0'
      };

      console.log('Error Report:', errorReport);
      
      // You could send this to your backend
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorReport)
      // });

    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: ''
    });
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  copyErrorDetails = () => {
    const errorDetails = {
      errorId: this.state.errorId,
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      timestamp: new Date().toISOString()
    };

    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
      .then(() => alert('Error details copied to clipboard'))
      .catch(() => alert('Failed to copy error details'));
  };

  downloadErrorLog = () => {
    const errorLog = {
      errorId: this.state.errorId,
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    const blob = new Blob([JSON.stringify(errorLog, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error_log_${this.state.errorId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-8">
              {/* Error Icon and Title */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full mb-4">
                  <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Oops! Something went wrong
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  The AI Analytics Platform encountered an unexpected error. Don't worry, we're here to help!
                </p>
              </div>

              {/* Error Details */}
              <div className="mb-8">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-4">
                  <div className="flex items-start space-x-3">
                    <Bug className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-red-900 dark:text-red-100 mb-1">
                        Error Details
                      </h3>
                      <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                        <strong>Error ID:</strong> {this.state.errorId}
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-300 font-mono bg-red-100 dark:bg-red-900/40 p-2 rounded">
                        {this.state.error?.message || 'Unknown error occurred'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Troubleshooting Tips */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-3">
                    💡 Quick Troubleshooting Tips
                  </h3>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <li>• Try refreshing the page</li>
                    <li>• Check your internet connection</li>
                    <li>• Clear your browser cache and cookies</li>
                    <li>• Make sure you're using a supported browser (Chrome, Firefox, Safari, Edge)</li>
                    <li>• Disable browser extensions temporarily</li>
                  </ul>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <button
                  onClick={this.handleRetry}
                  className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Try Again</span>
                </button>

                <button
                  onClick={this.handleReload}
                  className="flex items-center justify-center space-x-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Reload Page</span>
                </button>

                <button
                  onClick={this.handleGoHome}
                  className="flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Home className="h-4 w-4" />
                  <span>Go Home</span>
                </button>

                <button
                  onClick={this.copyErrorDetails}
                  className="flex items-center justify-center space-x-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  <span>Copy Error</span>
                </button>
              </div>

              {/* Additional Actions */}
              <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Need more help? Our support team is ready to assist you.
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={this.downloadErrorLog}
                      className="inline-flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <FileText className="h-4 w-4" />
                      <span>Download Log</span>
                    </button>
                    <a
                      href="mailto:support@aianalytics.com?subject=Error%20Report&body=Error%20ID:%20${this.state.errorId}"
                      className="inline-flex items-center space-x-2 px-3 py-2 text-sm bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/40 transition-colors"
                    >
                      <Mail className="h-4 w-4" />
                      <span>Contact Support</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Development Info (only in dev mode) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-6">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    🔧 Development Details (Click to expand)
                  </summary>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Error Stack:</h4>
                      <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-x-auto text-gray-800 dark:text-gray-200">
                        {this.state.error.stack}
                      </pre>
                    </div>
                    {this.state.errorInfo && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Component Stack:</h4>
                        <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-x-auto text-gray-800 dark:text-gray-200">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>

            {/* Additional Help */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                AI Analytics Platform v2.0.0 • Enhanced with Cross-Feature Integration
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                If this error persists, please check our{' '}
                <a 
                  href="/docs/troubleshooting" 
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  troubleshooting guide
                </a>
                {' '}or{' '}
                <a 
                  href="/dashboard/system-health" 
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  system health status
                </a>
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;