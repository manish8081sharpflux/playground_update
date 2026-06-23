import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, File, Video, FileText, Music, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * FileUploadModal - Sprint 2 Epic 02 Story 02
 * Modal for uploading files with drag-and-drop support
 */

const FILE_TYPE_CONFIG = {
  video: {
    icon: Video,
    accept: 'video/*',
    maxSize: 500 * 1024 * 1024, // 500 MB
    label: 'Video',
    color: 'text-purple-500'
  },
  pdf: {
    icon: FileText,
    accept: 'application/pdf',
    maxSize: 50 * 1024 * 1024, // 50 MB
    label: 'PDF',
    color: 'text-red-500'
  },
  audio: {
    icon: Music,
    accept: 'audio/*',
    maxSize: 100 * 1024 * 1024, // 100 MB
    label: 'Audio',
    color: 'text-blue-500'
  },
  image: {
    icon: ImageIcon,
    accept: 'image/*',
    maxSize: 10 * 1024 * 1024, // 10 MB
    label: 'Image',
    color: 'text-green-500'
  }
};

export default function FileUploadModal({ isOpen, onClose, onFilesSelected, allowedTypes = ['video', 'pdf', 'audio', 'image'] }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const validateFile = (file) => {
    // Determine file type
    let fileType = null;
    if (file.type.startsWith('video/')) fileType = 'video';
    else if (file.type === 'application/pdf') fileType = 'pdf';
    else if (file.type.startsWith('audio/')) fileType = 'audio';
    else if (file.type.startsWith('image/')) fileType = 'image';

    // Check if file type is allowed
    if (!fileType || !allowedTypes.includes(fileType)) {
      return {
        valid: false,
        error: `File type not supported. Allowed types: ${allowedTypes.join(', ')}`
      };
    }

    // Check file size
    const config = FILE_TYPE_CONFIG[fileType];
    if (file.size > config.maxSize) {
      const maxSizeMB = config.maxSize / (1024 * 1024);
      return {
        valid: false,
        error: `File too large. Maximum size for ${config.label} is ${maxSizeMB} MB`
      };
    }

    return { valid: true, fileType };
  };

  const handleFiles = (files) => {
    const fileArray = Array.from(files);
    const validatedFiles = [];
    const newErrors = {};

    fileArray.forEach((file) => {
      const validation = validateFile(file);
      if (validation.valid) {
        validatedFiles.push({
          file,
          fileType: validation.fileType,
          id: `${file.name}-${Date.now()}-${Math.random()}`
        });
      } else {
        newErrors[file.name] = validation.error;
        toast.error(validation.error);
      }
    });

    setErrors(newErrors);
    setSelectedFiles((prev) => [...prev, ...validatedFiles]);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [allowedTypes]);

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const removeFile = (fileId) => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleSubmit = () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select at least one file');
      return;
    }

    onFilesSelected(selectedFiles);
    setSelectedFiles([]);
    onClose();
  };

  const handleCancel = () => {
    setSelectedFiles([]);
    setErrors({});
    onClose();
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const getAcceptedFileTypes = () => {
    return allowedTypes.map(type => FILE_TYPE_CONFIG[type].accept).join(',');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Upload Files</h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Drag and Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="mx-auto mb-4 text-gray-400" size={48} />
            <p className="text-lg font-medium text-gray-700 mb-2">
              Drag and drop files here
            </p>
            <p className="text-sm text-gray-500 mb-4">
              or
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Browse Files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={getAcceptedFileTypes()}
              onChange={handleFileInputChange}
              className="hidden"
            />
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {allowedTypes.map((type) => {
                const config = FILE_TYPE_CONFIG[type];
                const Icon = config.icon;
                return (
                  <span
                    key={type}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${config.color} bg-gray-100`}
                  >
                    <Icon size={14} className="mr-1" />
                    {config.label}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Selected Files ({selectedFiles.length})
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedFiles.map((fileObj) => {
                  const config = FILE_TYPE_CONFIG[fileObj.fileType];
                  const Icon = config.icon;
                  return (
                    <div
                      key={fileObj.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <Icon className={config.color} size={20} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {fileObj.file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(fileObj.file.size)} • {config.label}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(fileObj.id)}
                        className="ml-3 text-red-500 hover:text-red-700 transition-colors flex-shrink-0"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={selectedFiles.length === 0}
            className={`px-4 py-2 text-white rounded-lg transition-colors ${
              selectedFiles.length === 0
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            Upload {selectedFiles.length > 0 && `(${selectedFiles.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}
