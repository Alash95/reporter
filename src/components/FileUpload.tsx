// src/components/FileUpload.tsx - FIXED VERSION
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthenticatedFetch } from '../contexts/AuthContext';
import { useIntegration } from '../contexts/IntegrationContext';
import { Upload, FileText, Trash2, Download, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface UploadedFile {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  extracted_data?: any;
  metadata?: any;
}

const FileUpload: React.FC = () => {
  const authenticatedFetch = useAuthenticatedFetch();
  const { actions } = useIntegration();
  
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  // FIXED: Use refs to prevent interval recreation and race conditions
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef<boolean>(true);
  const lastFetchRef = useRef<number>(0);
  const fetchingRef = useRef<boolean>(false);

  const ALLOWED_TYPES = [
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/json'
  ];

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  // FIXED: Stable fetch function with debouncing
  const fetchUploadedFiles = useCallback(async (force: boolean = false) => {
    const now = Date.now();
    
    // Prevent multiple simultaneous fetches and implement debouncing
    if (fetchingRef.current || (!force && now - lastFetchRef.current < 2000)) {
      return;
    }

    fetchingRef.current = true;
    lastFetchRef.current = now;

    try {
      if (!mountedRef.current) return;

      const response = await authenticatedFetch('http://localhost:8000/api/files/');
      if (response.ok && mountedRef.current) {
        const files = await response.json();
        setUploadedFiles(files);
      }
    } catch (error) {
      console.error('Failed to fetch files:', error);
      if (mountedRef.current) {
        actions.addNotification({
          type: 'error',
          title: 'Fetch Error',
          message: 'Failed to fetch uploaded files'
        });
      }
    } finally {
      fetchingRef.current = false;
    }
  }, [authenticatedFetch, actions]);

  // FIXED: Proper interval management
  const setupAutoRefresh = useCallback(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Only set up interval if there are files being processed
    const processingFiles = uploadedFiles.filter(
      file => file.processing_status === 'pending' || file.processing_status === 'processing'
    );

    if (processingFiles.length > 0 && mountedRef.current) {
      console.log(`Setting up auto-refresh for ${processingFiles.length} processing files`);
      intervalRef.current = setInterval(() => {
        if (mountedRef.current) {
          fetchUploadedFiles();
        }
      }, 3000); // 3 seconds for processing files
    }
  }, [uploadedFiles, fetchUploadedFiles]);

  // FIXED: Initial fetch with proper cleanup
  useEffect(() => {
    mountedRef.current = true;
    fetchUploadedFiles(true);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []); // Only run once on mount

  // FIXED: Setup auto-refresh only when processing status changes
  useEffect(() => {
    setupAutoRefresh();
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [uploadedFiles.length, setupAutoRefresh]); // Only depend on file count, not full file objects

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    await processFiles(files);
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      await processFiles(files);
    }
  }, []);

  const processFiles = async (files: File[]) => {
    if (isUploading || files.length === 0) return;
    
    setIsUploading(true);
    
    try {
      for (const file of files) {
        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
          actions.addNotification({
            type: 'error',
            title: 'Invalid File Type',
            message: `${file.name}: File type ${file.type} not supported`
          });
          continue;
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          actions.addNotification({
            type: 'error',
            title: 'File Too Large',
            message: `${file.name}: File size exceeds 50MB limit`
          });
          continue;
        }

        // Upload file
        const formData = new FormData();
        formData.append('file', file);

        try {
          const response = await authenticatedFetch('http://localhost:8000/api/files/upload', {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            const uploadedFile = await response.json();
            
            // Add to state immediately with pending status
            setUploadedFiles(prev => [uploadedFile, ...prev]);

            actions.addNotification({
              type: 'success',
              title: 'Upload Successful',
              message: `${file.name} uploaded and processing started`
            });
          } else {
            const errorData = await response.json();
            actions.addNotification({
              type: 'error',
              title: 'Upload Failed',
              message: `${file.name}: ${errorData.detail || 'Upload failed'}`
            });
          }
        } catch (uploadError) {
          console.error('Upload error:', uploadError);
          actions.addNotification({
            type: 'error',
            title: 'Upload Error',
            message: `${file.name}: Network error during upload`
          });
        }
      }

      // Force refresh after uploads
      setTimeout(() => {
        if (mountedRef.current) {
          fetchUploadedFiles(true);
        }
      }, 1000);

    } finally {
      setIsUploading(false);
    }
  };

  const deleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      const response = await authenticatedFetch(`http://localhost:8000/api/files/${fileId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
        setSelectedFiles(prev => prev.filter(id => id !== fileId));
        
        actions.addNotification({
          type: 'success',
          title: 'File Deleted',
          message: 'File has been successfully deleted'
        });
      } else {
        actions.addNotification({
          type: 'error',
          title: 'Delete Failed',
          message: 'Failed to delete file'
        });
      }
    } catch (error) {
      console.error('Delete error:', error);
      actions.addNotification({
        type: 'error',
        title: 'Delete Error',
        message: 'Network error while deleting file'
      });
    }
  };

  const downloadFile = async (fileId: string, filename: string) => {
    try {
      const response = await authenticatedFetch(`http://localhost:8000/api/files/${fileId}/download`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        actions.addNotification({
          type: 'error',
          title: 'Download Failed',
          message: 'Failed to download file'
        });
      }
    } catch (error) {
      console.error('Download error:', error);
      actions.addNotification({
        type: 'error',
        title: 'Download Error',
        message: 'Network error while downloading file'
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'processing':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 dark:bg-green-900/50';
      case 'failed':
        return 'text-red-600 bg-red-50 dark:bg-red-900/50';
      case 'processing':
        return 'text-blue-600 bg-blue-50 dark:bg-blue-900/50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/50';
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-900/50';
    }
  };

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev =>
      prev.includes(fileId)
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };

  const handleRefresh = () => {
    fetchUploadedFiles(true);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const processingCount = uploadedFiles.filter(
    file => file.processing_status === 'pending' || file.processing_status === 'processing'
  ).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            File Upload
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Upload and manage your data files
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {processingCount > 0 && (
            <div className="flex items-center space-x-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/50 rounded-full">
              <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
              <span className="text-sm text-blue-600 dark:text-blue-400">
                {processingCount} processing
              </span>
            </div>
          )}
          
          <button
            onClick={handleRefresh}
            disabled={fetchingRef.current}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${fetchingRef.current ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/50'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {isUploading ? 'Uploading...' : 'Upload your data files'}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Drag and drop files here, or click to select files
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Supports: CSV, Excel, PDF, Word, Text, JSON (Max 50MB)
        </p>
        
        <input
          type="file"
          multiple
          accept=".csv,.xlsx,.xls,.pdf,.docx,.txt,.json"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
          disabled={isUploading}
        />
        <label
          htmlFor="file-upload"
          className={`inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer ${
            isUploading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <Upload className="h-5 w-5" />
          <span>Choose Files</span>
        </label>
      </div>

      {/* Files List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Uploaded Files ({uploadedFiles.length})
            </h2>
            {selectedFiles.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedFiles.length} selected
                </span>
                <button
                  onClick={() => {
                    selectedFiles.forEach(fileId => deleteFile(fileId));
                    setSelectedFiles([]);
                  }}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete Selected
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {uploadedFiles.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No files uploaded yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Upload your first file to get started
              </p>
            </div>
          ) : (
            uploadedFiles.map((file) => (
              <div key={file.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    checked={selectedFiles.includes(file.id)}
                    onChange={() => toggleFileSelection(file.id)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  
                  <div className="flex-shrink-0">
                    <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {file.filename}
                    </p>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {file.file_type?.toUpperCase() || 'Unknown'}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {formatFileSize(file.file_size)}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(file.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${getStatusColor(file.processing_status)}`}>
                      {getStatusIcon(file.processing_status)}
                      <span className="capitalize">{file.processing_status}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => downloadFile(file.id, file.filename)}
                      className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteFile(file.id)}
                      className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                {file.processing_status === 'failed' && file.metadata?.error && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      Error: {file.metadata.error}
                    </p>
                  </div>
                )}
                
                {file.processing_status === 'completed' && file.metadata && (
                  <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/50 border border-green-200 dark:border-green-800 rounded">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {file.metadata.rows && (
                        <div>
                          <span className="font-medium text-green-700 dark:text-green-300">Rows:</span>
                          <span className="ml-1 text-green-600 dark:text-green-400">{file.metadata.rows}</span>
                        </div>
                      )}
                      {file.metadata.columns && (
                        <div>
                          <span className="font-medium text-green-700 dark:text-green-300">Columns:</span>
                          <span className="ml-1 text-green-600 dark:text-green-400">{file.metadata.columns}</span>
                        </div>
                      )}
                      {file.metadata.processing_time && (
                        <div>
                          <span className="font-medium text-green-700 dark:text-green-300">Processed in:</span>
                          <span className="ml-1 text-green-600 dark:text-green-400">{file.metadata.processing_time}s</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default FileUpload;