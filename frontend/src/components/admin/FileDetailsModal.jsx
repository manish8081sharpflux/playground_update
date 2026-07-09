import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, Calendar, Database, Tag, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * FileDetailsModal - Sprint 2 Epic 02 Story 02
 * Modal for viewing detailed file information including CDN URL, metadata, and usage
 */

export default function FileDetailsModal({ file, isOpen, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !file) return null;

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds) => {
    if (!seconds) return null;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(file.fileUrl);
    setCopied(true);
    toast.success('CDN URL copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenUrl = () => {
    window.open(file.fileUrl, '_blank');
  };

  const getFileTypeIcon = (type) => {
    const icons = {
      video: '🎥',
      pdf: '📄',
      audio: '🎵',
      image: '🖼️'
    };
    return icons[type] || '📁';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between p-6 border-b border-gray-200 bg-purple-50">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">{getFileTypeIcon(file.fileType)}</span>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">{file.fileName}</h2>
              <p className="text-sm text-gray-600">{file.fileType.toUpperCase()} • {formatFileSize(file.fileSize)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-scroll custom-scrollbar p-6 space-y-6">
          {/* CDN URL Section */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 flex items-center">
                <Database size={16} className="mr-2" />
                CDN URL
              </label>
              <div className="flex space-x-2">
                <button
                  onClick={handleCopyUrl}
                  className="flex items-center space-x-1 px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
                <button
                  onClick={handleOpenUrl}
                  className="flex items-center space-x-1 px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors"
                >
                  <ExternalLink size={14} />
                  <span>Open</span>
                </button>
              </div>
            </div>
            <div className="bg-white rounded border border-gray-300 p-3">
              <code className="text-xs text-gray-700 break-all">{file.fileUrl}</code>
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600 flex items-center mb-1">
                <FileText size={14} className="mr-1" />
                File Type
              </label>
              <p className="text-base text-gray-900 font-medium">{file.fileType.toUpperCase()}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 flex items-center mb-1">
                <Database size={14} className="mr-1" />
                MIME Type
              </label>
              <p className="text-base text-gray-900 font-mono text-sm">{file.mimeType}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 flex items-center mb-1">
                <Calendar size={14} className="mr-1" />
                Uploaded
              </label>
              <p className="text-base text-gray-900">{formatDate(file.uploadedAt)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1">Uploaded By</label>
              <p className="text-base text-gray-900">{file.uploadedBy?.name || 'Unknown'}</p>
            </div>
          </div>

          {/* Metadata Section (if exists) */}
          {file.metadata && Object.keys(file.metadata).length > 0 && (
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Media Metadata</h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Video/Audio Duration */}
                {file.metadata.duration && (
                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-1">Duration</label>
                    <p className="text-base text-gray-900">{formatDuration(file.metadata.duration)}</p>
                  </div>
                )}

                {/* Video/Image Dimensions */}
                {file.metadata.dimensions && (
                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-1">Dimensions</label>
                    <p className="text-base text-gray-900">
                      {file.metadata.dimensions.width} × {file.metadata.dimensions.height}
                    </p>
                  </div>
                )}

                {/* PDF Pages */}
                {file.metadata.pages && (
                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-1">Pages</label>
                    <p className="text-base text-gray-900">{file.metadata.pages}</p>
                  </div>
                )}

                {/* Audio Bitrate */}
                {file.metadata.bitrate && (
                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-1">Bitrate</label>
                    <p className="text-base text-gray-900">{file.metadata.bitrate}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {file.description && (
            <div className="border-t border-gray-200 pt-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Description</label>
              <p className="text-base text-gray-900">{file.description}</p>
            </div>
          )}

          {/* Tags */}
          {file.tags && file.tags.length > 0 && (
            <div className="border-t border-gray-200 pt-4">
              <label className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Tag size={14} className="mr-1" />
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {file.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Used In Courses */}
          {file.usedInCourses && file.usedInCourses.length > 0 && (
            <div className="border-t border-gray-200 pt-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Used In Courses ({file.usedInCourses.length})
              </label>
              <div className="space-y-2">
                {file.usedInCourses.map((usage, index) => (
                  <div key={index} className="bg-blue-50 rounded p-3 border border-blue-200">
                    <p className="text-sm font-medium text-blue-900">{usage.courseTitle}</p>
                    <p className="text-xs text-blue-700">Course ID: {usage.courseId}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* S3 Key (Technical Details) */}
          <div className="border-t border-gray-200 pt-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">S3 Key</label>
            <div className="bg-gray-100 rounded p-3 border border-gray-300">
              <code className="text-xs text-gray-700 break-all">{file.s3Key}</code>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-shrink-0 justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
