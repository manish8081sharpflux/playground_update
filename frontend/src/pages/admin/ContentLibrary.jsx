import React, { useState, useEffect } from 'react';
import { Upload, Grid, List, Search, Filter, RefreshCw, Edit } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';
import FileUploadModal from '../../components/admin/FileUploadModal';
import FileDetailsModal from '../../components/admin/FileDetailsModal';
import EditMetadataModal from '../../components/admin/EditMetadataModal';
import UploadQueue from '../../components/admin/UploadQueue';
import useFileUpload from '../../hooks/useFileUpload';
import LoadingState from '../../components/common/LoadingState';

/**
 * ContentLibrary - Sprint 2 Epic 02 Story 02
 * Main page for managing content library with upload, filtering, and preview
 */

const FILE_TYPE_FILTERS = [
  { value: 'all', label: 'All Files', icon: '📁' },
  { value: 'video', label: 'Videos', icon: '🎥' },
  { value: 'pdf', label: 'PDFs', icon: '📄' },
  { value: 'audio', label: 'Audio', icon: '🎵' },
  { value: 'image', label: 'Images', icon: '🖼️' }
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'largest', label: 'Largest First' },
  { value: 'smallest', label: 'Smallest First' },
  { value: 'a-z', label: 'A-Z' },
  { value: 'z-a', label: 'Z-A' }
];

export default function ContentLibrary() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  // Modal state
  const [selectedFile, setSelectedFile] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Filters
  const [fileTypeFilter, setFileTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Upload hook
  const { uploads, uploadFiles, cancelUpload, retryUpload, clearUploads } = useFileUpload();

  useEffect(() => {
    fetchFiles();
    fetchStats();
  }, [fileTypeFilter, searchQuery, sortBy]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/v2/lms/admin/content/library', {
        params: {
          fileType: fileTypeFilter,
          search: searchQuery,
          sort: sortBy,
          limit: 100,
          offset: 0
        }
      });

      if (response.data.success) {
        setFiles(response.data.files);
      } else {
        toast.error(response.data.message || 'Failed to load files');
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Failed to load content library');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/v2/lms/admin/content/stats');
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleFilesSelected = async (selectedFiles) => {
    // Upload files using the hook
    await uploadFiles(selectedFiles);

    // Refresh the library after a short delay
    setTimeout(() => {
      fetchFiles();
      fetchStats();
    }, 1000);
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await api.delete(`/api/v2/lms/admin/content/library/${fileId}`);

      if (response.data.success) {
        toast.success('File deleted successfully');
        fetchFiles();
        fetchStats();
      } else {
        toast.error(response.data.message || 'Failed to delete file');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error(error.response?.data?.message || 'Failed to delete file');
    }
  };

  const handleFileClick = (file) => {
    setSelectedFile(file);
    setShowDetailsModal(true);
  };

  const handleEditClick = (file) => {
    setSelectedFile(file);
    setShowEditModal(true);
  };

  const handleMetadataSaved = (updatedFile) => {
    // Update the file in the files array
    setFiles(files.map(f => f._id === updatedFile._id ? updatedFile : f));
    fetchStats(); // Refresh stats in case tags changed search index
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Content Library</h1>
        <p className="text-gray-600">Manage and organize your learning content files</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <div className="text-2xl font-bold text-gray-800">
              {stats.totalFiles || 0}
            </div>
            <div className="text-sm text-gray-600">Total Files</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
            <div className="text-2xl font-bold text-gray-800">
              {stats.byType?.find(t => t._id === 'video')?.count || 0}
            </div>
            <div className="text-sm text-gray-600">Videos</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
            <div className="text-2xl font-bold text-gray-800">
              {stats.byType?.find(t => t._id === 'pdf')?.count || 0}
            </div>
            <div className="text-sm text-gray-600">PDFs</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <div className="text-2xl font-bold text-gray-800">
              {stats.byType?.find(t => t._id === 'audio')?.count || 0}
            </div>
            <div className="text-sm text-gray-600">Audio</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
            <div className="text-2xl font-bold text-gray-800">
              {formatFileSize(stats.totalSizeBytes || 0)}
            </div>
            <div className="text-sm text-gray-600">Total Size</div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Left Side - Filters and Search */}
          <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-3 flex-1">
            {/* File Type Filter */}
            <div className="flex space-x-2 overflow-x-auto">
              {FILE_TYPE_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setFileTypeFilter(filter.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    fileTypeFilter === filter.value
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filter.icon} {filter.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Right Side - Actions */}
          <div className="flex items-center space-x-3">
            {/* View Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow' : ''}`}
                title="Grid view"
              >
                <Grid size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow' : ''}`}
                title="List view"
              >
                <List size={18} />
              </button>
            </div>

            {/* Refresh */}
            <button
              onClick={() => {
                fetchFiles();
                fetchStats();
              }}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw size={18} />
            </button>

            {/* Upload Button */}
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Upload size={18} />
              <span>Upload Files</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-lg shadow p-6">
        {loading ? (
          <LoadingState message="Loading content..." />
        ) : files.length === 0 ? (
          <div className="text-center py-20">
            <Upload className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-lg font-medium text-gray-700 mb-2">No files found</h3>
            <p className="text-gray-500 mb-6">
              {searchQuery || fileTypeFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Upload your first file to get started'}
            </p>
            {!searchQuery && fileTypeFilter === 'all' && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Upload Files
              </button>
            )}
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-2'}>
            {files.map((file) => (
              <div
                key={file._id}
                onClick={() => handleFileClick(file)}
                className={`${
                  viewMode === 'grid'
                    ? 'border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow'
                    : 'border-b border-gray-200 py-3 hover:bg-gray-50'
                } cursor-pointer`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{file.fileName}</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      {file.fileType.toUpperCase()} • {formatFileSize(file.fileSize)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Uploaded {formatDate(file.uploadedAt)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1 ml-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditClick(file);
                      }}
                      className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded"
                      title="Edit metadata"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(file._id);
                      }}
                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                      title="Delete"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <FileUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onFilesSelected={handleFilesSelected}
      />

      {/* Upload Queue */}
      <UploadQueue
        uploads={uploads}
        onCancel={cancelUpload}
        onRetry={retryUpload}
        onClearCompleted={clearUploads}
      />

      {/* File Details Modal */}
      <FileDetailsModal
        file={selectedFile}
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedFile(null);
        }}
      />

      {/* Edit Metadata Modal */}
      <EditMetadataModal
        file={selectedFile}
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedFile(null);
        }}
        onSaved={handleMetadataSaved}
      />
    </div>
  );
}
