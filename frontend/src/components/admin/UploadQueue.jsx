import React from 'react';
import { CheckCircle, XCircle, Loader2, RotateCw, X, Trash2, Video, FileText, Music, Image as ImageIcon } from 'lucide-react';

/**
 * UploadQueue - Sprint 2 Epic 02 Story 02
 * Component to display upload progress with controls
 */

const FILE_TYPE_ICONS = {
  video: { icon: Video, color: 'text-purple-500' },
  pdf: { icon: FileText, color: 'text-red-500' },
  audio: { icon: Music, color: 'text-blue-500' },
  image: { icon: ImageIcon, color: 'text-green-500' }
};

const UploadItem = ({ upload, onRetry, onCancel }) => {
  const { fileName, fileType, status, progress, error } = upload;
  const iconConfig = FILE_TYPE_ICONS[fileType] || FILE_TYPE_ICONS.pdf;
  const FileIcon = iconConfig.icon;

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'failed':
        return <XCircle className="text-red-500" size={20} />;
      case 'cancelled':
        return <X className="text-gray-400" size={20} />;
      case 'uploading':
      case 'preparing':
        return <Loader2 className="text-blue-500 animate-spin" size={20} />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'preparing':
        return 'Preparing...';
      case 'uploading':
        return `Uploading... ${progress}%`;
      case 'completed':
        return 'Completed';
      case 'failed':
        return `Failed: ${error}`;
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const getProgressColor = () => {
    if (status === 'completed') return 'bg-green-500';
    if (status === 'failed') return 'bg-red-500';
    if (status === 'cancelled') return 'bg-gray-400';
    return 'bg-blue-500';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <FileIcon className={iconConfig.color} size={20} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {fileName}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {getStatusText()}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 ml-3">
          {getStatusIcon()}
          {status === 'failed' && onRetry && (
            <button
              onClick={() => onRetry(upload.id)}
              className="text-blue-500 hover:text-blue-700 transition-colors"
              title="Retry upload"
            >
              <RotateCw size={18} />
            </button>
          )}
          {(status === 'uploading' || status === 'preparing') && onCancel && (
            <button
              onClick={() => onCancel(upload.id)}
              className="text-red-500 hover:text-red-700 transition-colors"
              title="Cancel upload"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {(status === 'uploading' || status === 'preparing' || status === 'completed') && (
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full ${getProgressColor()} transition-all duration-300`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Error Message */}
      {status === 'failed' && error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          {error}
        </div>
      )}
    </div>
  );
};

export default function UploadQueue({ uploads, onRetry, onCancel, onClearCompleted }) {
  const uploadList = Object.values(uploads);

  if (uploadList.length === 0) {
    return null;
  }

  const completedCount = uploadList.filter(u => u.status === 'completed').length;
  const failedCount = uploadList.filter(u => u.status === 'failed').length;
  const uploadingCount = uploadList.filter(u => u.status === 'uploading' || u.status === 'preparing').length;

  const hasCompletedOrFailed = completedCount > 0 || failedCount > 0;

  return (
    <div className="fixed bottom-6 right-6 w-96 max-h-[600px] flex flex-col bg-white rounded-lg shadow-2xl border border-gray-200 z-40">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">
            Upload Queue
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {uploadingCount > 0 && `${uploadingCount} uploading`}
            {uploadingCount > 0 && (completedCount > 0 || failedCount > 0) && ' • '}
            {completedCount > 0 && `${completedCount} completed`}
            {completedCount > 0 && failedCount > 0 && ' • '}
            {failedCount > 0 && `${failedCount} failed`}
          </p>
        </div>
        {hasCompletedOrFailed && onClearCompleted && (
          <button
            onClick={onClearCompleted}
            className="text-gray-400 hover:text-gray-600 transition-colors flex items-center space-x-1 text-xs"
            title="Clear completed/failed"
          >
            <Trash2 size={14} />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Upload List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {uploadList.map((upload) => (
          <UploadItem
            key={upload.id}
            upload={upload}
            onRetry={onRetry}
            onCancel={onCancel}
          />
        ))}
      </div>

      {/* Overall Progress */}
      {uploadingCount > 0 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
            <span>Overall Progress</span>
            <span>
              {completedCount} / {uploadList.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{
                width: `${uploadList.length > 0 ? (completedCount / uploadList.length) * 100 : 0}%`
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
