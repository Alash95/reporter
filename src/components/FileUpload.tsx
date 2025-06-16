import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, CheckCircle, AlertCircle, Clock, X, Eye, Download } from 'lucide-react';

interface UploadedFile {
  id: string;
  filename: string;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  size: number;
  type: string;
  created_at: string;
}

const FileUpload: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [previewData, setPreviewData] = useState<any>(null);

  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  const fetchUploadedFiles = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/files/');
      if (response.ok) {
        const files = await response.json();
        setUploadedFiles(files.map((file: any) => ({
          id: file.id,
          filename: file.filename,
          status: file.processing_status,
          progress: file.processing_status === 'completed' ? 100 : 
                   file.processing_status === 'processing' ? 50 : 0,
          size: file.file_size,
          type: file.file_type,
          created_at: file.created_at
        })));
      }
    } catch (error) {
      console.error('Failed to fetch files:', error);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      const fileId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      
      // Add file to state
      const uploadFile: UploadedFile = {
        id: fileId,
        filename: file.name,
        status: 'uploading',
        progress: 0,
        size: file.size,
        type: file.name.split('.').pop() || '',
        created_at: new Date().toISOString()
      };
      
      setUploadedFiles(prev => [...prev, uploadFile]);
      
      // Upload file
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('http://localhost:8000/api/files/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (response.ok) {
          const result = await response.json();
          
          setUploadedFiles(prev => 
            prev.map(f => 
              f.id === fileId 
                ? { ...f, status: 'processing', progress: 100, id: result.file_id }
                : f
            )
          );
          
          // Poll for processing status
          pollProcessingStatus(result.file_id);
        } else {
          setUploadedFiles(prev => 
            prev.map(f => 
              f.id === fileId 
                ? { ...f, status: 'failed', progress: 100 }
                : f
            )
          );
        }
      } catch (error) {
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === fileId 
              ? { ...f, status: 'failed', progress: 100 }
              : f
          )
        );
      }
    }
  }, []);

  const pollProcessingStatus = async (fileId: string) => {
    const maxAttempts = 30; // 30 seconds max
    let attempts = 0;
    
    const poll = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/files/${fileId}/status`);
        
        if (response.ok) {
          const status = await response.json();
          
          setUploadedFiles(prev => 
            prev.map(f => 
              f.id === fileId 
                ? { 
                    ...f, 
                    status: status.status === 'completed' ? 'completed' : 
                           status.status === 'failed' ? 'failed' : 'processing'
                  }
                : f
            )
          );
          
          if (status.status === 'processing' && attempts < maxAttempts) {
            attempts++;
            setTimeout(poll, 1000);
          }
        }
      } catch (error) {
        console.error('Error polling status:', error);
      }
    };
    
    poll();
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    maxSize: 50 * 1024 * 1024 // 50MB
  });

  const removeFile = async (fileId: string) => {
    try {
      await fetch(`http://localhost:8000/api/files/${fileId}`, {
        method: 'DELETE'
      });
      setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  };

  const previewFile = async (fileId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/files/${fileId}/preview`);
      if (response.ok) {
        const data = await response.json();
        setPreviewData(data);
        setSelectedFile(uploadedFiles.find(f => f.id === fileId));
      }
    } catch (error) {
      console.error('Failed to preview file:', error);
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
      case 'uploading':
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          File Upload & Analysis
        </h1>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Upload files to start AI-powered analysis
        </div>
      </div>

      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800'
        }`}
      >
        <input {...getInputProps()} />
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
          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">PDF</span>
          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">Word</span>
          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">Text</span>
        </div>
        <p className="text-xs text-gray-400 mt-2">Maximum file size: 50MB</p>
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              Uploaded Files ({uploadedFiles.length})
            </h4>
          </div>
          <div className="p-4 space-y-3">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-center space-x-3 flex-1">
                  {getStatusIcon(file.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {file.filename}
                    </p>
                    <div className="flex items-center space-x-4 mt-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatFileSize(file.size)}
                      </p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        file.status === 'completed' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' :
                        file.status === 'failed' ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' :
                        'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      }`}>
                        {file.status === 'uploading' ? 'Uploading...' :
                         file.status === 'processing' ? 'Processing...' :
                         file.status === 'completed' ? 'Ready' : 'Failed'}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(file.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                
                {file.status === 'uploading' && (
                  <div className="w-24 bg-gray-200 dark:bg-gray-600 rounded-full h-2 mr-4">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${file.progress}%` }}
                    ></div>
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  {file.status === 'completed' && (
                    <button
                      onClick={() => previewFile(file.id)}
                      className="p-1 text-blue-500 hover:text-blue-700 transition-colors"
                      title="Preview data"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => removeFile(file.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
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
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-auto max-h-[70vh]">
              {previewData.type === 'tabular' && (
                <div>
                  <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                    {previewData.row_count} rows × {previewData.column_count} columns
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
                              {col.name}
                              <span className={`ml-2 px-2 py-1 rounded text-xs ${
                                col.type === 'number' ? 'bg-blue-100 text-blue-800' :
                                col.type === 'datetime' ? 'bg-purple-100 text-purple-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {col.type}
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {previewData.rows.slice(0, 20).map((row: any, rowIndex: number) => (
                          <tr key={rowIndex}>
                            {previewData.columns.map((col: any, colIndex: number) => (
                              <td
                                key={colIndex}
                                className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
                              >
                                {row[col.name]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {previewData.rows.length > 20 && (
                    <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      Showing first 20 rows of {previewData.rows.length} total rows
                    </div>
                  )}
                </div>
              )}
              
              {previewData.type === 'text' && (
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