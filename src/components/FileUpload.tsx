import React, { useState, useEffect, useRef } from 'react';
import { Upload, File, CheckCircle, AlertCircle, Clock, X, Eye, Sparkles } from 'lucide-react';
import { useAuthenticatedFetch } from '../contexts/AuthContext';

interface UploadedFile {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  has_semantic_model: boolean;
}

const FileUpload: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const authenticatedFetch = useAuthenticatedFetch();

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

  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  const fetchUploadedFiles = async () => {
    try {
      const response = await authenticatedFetch('http://localhost:8000/api/files/');
      if (response.ok) {
        const files = await response.json();
        setUploadedFiles(files);
      }
    } catch (error) {
      console.error('Failed to fetch files:', error);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    await processFiles(files);
  };

  const processFiles = async (files: File[]) => {
    if (isUploading) return;
    
    setIsUploading(true);
    
    for (const file of files) {
      try {
        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
          alert(`File type ${file.type} not supported. Please upload CSV, Excel, PDF, Word, Text, or JSON files.`);
          continue;
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          alert(`File ${file.name} is too large. Maximum size is 50MB.`);
          continue;
        }

        const formData = new FormData();
        formData.append('file', file);
        
        const response = await authenticatedFetch('http://localhost:8000/api/files/upload', {
          method: 'POST',
          headers: {}, // Don't set Content-Type for FormData
          body: formData,
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('File uploaded successfully:', result);
          
          // Refresh the file list
          await fetchUploadedFiles();
          
          // Poll for processing status
          pollProcessingStatus(result.file_id);
        } else {
          const errorData = await response.json();
          console.error('Upload failed:', errorData);
          alert(`Upload failed: ${errorData.detail || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Upload error:', error);
        alert(`Upload error: ${error}`);
      }
    }
    
    setIsUploading(false);
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await processFiles(files);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const pollProcessingStatus = async (fileId: string) => {
    const maxAttempts = 30;
    let attempts = 0;
    
    const poll = async () => {
      try {
        const response = await authenticatedFetch(`http://localhost:8000/api/files/${fileId}/status`);
        
        if (response.ok) {
          const status = await response.json();
          
          // Update the file in the list
          setUploadedFiles(prev => 
            prev.map(f => 
              f.id === fileId 
                ? { ...f, processing_status: status.status }
                : f
            )
          );
          
          if (status.status === 'processing' && attempts < maxAttempts) {
            attempts++;
            setTimeout(poll, 2000); // Poll every 2 seconds
          }
        }
      } catch (error) {
        console.error('Error polling status:', error);
      }
    };
    
    poll();
  };

  const removeFile = async (fileId: string) => {
    try {
      const response = await authenticatedFetch(`http://localhost:8000/api/files/${fileId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  };

  const previewFile = async (fileId: string) => {
    try {
      const response = await authenticatedFetch(`http://localhost:8000/api/files/${fileId}/preview`);
      if (response.ok) {
        const data = await response.json();
        setPreviewData(data);
        setSelectedFile(uploadedFiles.find(f => f.id === fileId));
      }
    } catch (error) {
      console.error('Failed to preview file:', error);
    }
  };

  const generateDashboard = async (fileId: string) => {
    const problemStatement = prompt('Describe what you want to analyze or visualize from this data:');
    if (!problemStatement) return;

    try {
      const response = await authenticatedFetch('http://localhost:8000/api/ai/generate-dashboard', {
        method: 'POST',
        body: JSON.stringify({
          problem_statement: problemStatement,
          file_id: fileId,
          preferences: {}
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Dashboard generated successfully! Dashboard ID: ${result.dashboard_id}`);
      } else {
        const error = await response.json();
        alert(`Failed to generate dashboard: ${error.detail}`);
      }
    } catch (error) {
      console.error('Failed to generate dashboard:', error);
      alert('Failed to generate dashboard. Please try again.');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
      case 'processing':
        return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <File className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            File Upload & AI Analysis
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Upload your datasets and let AI generate insights and dashboards automatically
          </p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {uploadedFiles.length} files uploaded
        </div>
      </div>

      {/* Upload Area */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : isUploading
            ? 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 cursor-not-allowed'
            : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".csv,.xlsx,.xls,.pdf,.docx,.txt,.json"
          onChange={handleFileInput}
          className="hidden"
          disabled={isUploading}
        />
        
        {isUploading ? (
          <>
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Uploading files...
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Please wait while we process your files
            </p>
          </>
        ) : (
          <>
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Upload your data files
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Drag and drop files here, or click to browse
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">CSV</span>
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">Excel</span>
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">JSON</span>
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">PDF</span>
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">Word</span>
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">Text</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">Maximum file size: 50MB</p>
          </>
        )}
      </div>

      {/* Rest of the component remains the same */}
      {uploadedFiles.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              Your Files ({uploadedFiles.length})
            </h4>
          </div>
          <div className="p-4 space-y-3">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-center space-x-3 flex-1">
                  {getStatusIcon(file.processing_status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {file.filename}
                    </p>
                    <div className="flex items-center space-x-4 mt-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatFileSize(file.file_size)} • {file.file_type.toUpperCase()}
                      </p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        file.processing_status === 'completed' 
                          ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' 
                          : file.processing_status === 'failed' 
                          ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' 
                          : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      }`}>
                        {file.processing_status === 'pending' 
                          ? 'Uploading...' 
                          : file.processing_status === 'processing' 
                          ? 'Processing...' 
                          : file.processing_status === 'completed' 
                          ? 'Ready' 
                          : 'Failed'}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(file.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {file.processing_status === 'completed' && (
                    <>
                      <button
                        onClick={() => previewFile(file.id)}
                        className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
                        title="Preview data"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => generateDashboard(file.id)}
                        className="p-2 text-purple-500 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/50 rounded-lg transition-colors"
                        title="Generate AI Dashboard"
                      >
                        <Sparkles className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => removeFile(file.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-lg transition-colors"
                    title="Delete file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {selectedFile && previewData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Preview: {selectedFile.filename}
              </h3>
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewData(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-auto max-h-[70vh]">
              {previewData.columns && previewData.rows && (
                <div>
                  <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                    {previewData.rows.length} rows × {previewData.columns.length} columns
                    {previewData.preview_note && (
                      <span className="ml-2 text-orange-600 dark:text-orange-400">
                        ({previewData.preview_note})
                      </span>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          {previewData.columns.map((col: any, index: number) => (
                            <th
                              key={index}
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                            >
                              {typeof col === 'string' ? col : col.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {previewData.rows.slice(0, 20).map((row: any, rowIndex: number) => (
                          <tr key={rowIndex}>
                            {previewData.columns.map((col: any, colIndex: number) => {
                              const colName = typeof col === 'string' ? col : col.name;
                              return (
                                <td
                                  key={colIndex}
                                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
                                >
                                  {row[colName] ?? 'N/A'}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {previewData.content && (
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">
                    {previewData.content.substring(0, 2000)}
                    {previewData.content.length > 2000 && '...'}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;