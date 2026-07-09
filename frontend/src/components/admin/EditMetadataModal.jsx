import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2 } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';

/**
 * EditMetadataModal - Sprint 2 Epic 02 Story 02
 * Modal for editing file metadata (description and tags)
 */

export default function EditMetadataModal({ file, isOpen, onClose, onSaved }) {
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (file) {
      setDescription(file.description || '');
      setTags(file.tags || []);
    }
  }, [file]);

  if (!isOpen || !file) return null;

  const handleAddTag = () => {
    const trimmedTag = newTag.trim();
    if (!trimmedTag) {
      toast.error('Tag cannot be empty');
      return;
    }
    if (tags.includes(trimmedTag)) {
      toast.error('Tag already exists');
      return;
    }
    if (tags.length >= 10) {
      toast.error('Maximum 10 tags allowed');
      return;
    }
    setTags([...tags, trimmedTag]);
    setNewTag('');
  };

  const handleRemoveTag = (index) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const response = await api.put(`/api/v2/lms/admin/content/library/${file._id}`, {
        description: description.trim(),
        tags: tags
      });

      if (response.data.success) {
        toast.success('File metadata updated successfully!');
        onSaved(response.data.file);
        onClose();
      } else {
        toast.error(response.data.message || 'Failed to update metadata');
      }
    } catch (error) {
      console.error('Error updating metadata:', error);
      toast.error(error.response?.data?.message || 'Failed to update metadata');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to original values
    setDescription(file.description || '');
    setTags(file.tags || []);
    setNewTag('');
    onClose();
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
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-purple-50">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getFileTypeIcon(file.fileType)}</span>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Edit File Metadata</h2>
              <p className="text-sm text-gray-600">{file.fileName}</p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Description Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
              <span className="text-gray-500 font-normal ml-2">(Optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description for this file..."
              rows={4}
              maxLength={500}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
            />
            <div className="flex justify-between mt-1">
              <p className="text-xs text-gray-500">
                Describe the content, purpose, or context of this file
              </p>
              <p className="text-xs text-gray-500">
                {description.length}/500
              </p>
            </div>
          </div>

          {/* Tags Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
              <span className="text-gray-500 font-normal ml-2">(Max 10)</span>
            </label>

            {/* Existing Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {tags.map((tag, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                  >
                    <span>{tag}</span>
                    <button
                      onClick={() => handleRemoveTag(index)}
                      className="ml-1 hover:text-purple-900 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Tag */}
            {tags.length < 10 && (
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter a tag (e.g., 'introduction', 'beginner', 'chapter-1')"
                  maxLength={30}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
                <button
                  onClick={handleAddTag}
                  disabled={!newTag.trim()}
                  className="flex items-center space-x-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus size={18} />
                  <span>Add</span>
                </button>
              </div>
            )}

            <p className="text-xs text-gray-500 mt-2">
              Tags help organize and search for files. Press Enter or click Add to create a tag.
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Changes to description and tags will be saved immediately and reflected in search results and file listings.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleCancel}
            disabled={saving}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <Save size={18} />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
