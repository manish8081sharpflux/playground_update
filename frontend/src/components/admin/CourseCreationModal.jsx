import React, { useState, useEffect } from 'react';
import { X, Upload, Trash2 } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';
import useFileUpload from '../../hooks/useFileUpload';

/**
 * CourseCreationModal - Sprint 2 Epic 02 Story 01
 * Modal for creating new courses or editing existing ones
 */

export default function CourseCreationModal({
  isOpen,
  onClose,
  onCourseCreated,
  courseToEdit = null
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    difficultyLevel: '',
    icon: '📚',
    thumbnail: ''
  });

  const [errors, setErrors] = useState({});
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const { uploadFile } = useFileUpload();

  const isEditMode = !!courseToEdit;

  // Populate form if editing
  useEffect(() => {
    if (courseToEdit) {
      setFormData({
        title: courseToEdit.title || '',
        description: courseToEdit.description || '',
        category: courseToEdit.category || '',
        difficultyLevel: courseToEdit.difficultyLevel || '',
        icon: courseToEdit.icon || '📚',
        thumbnail: courseToEdit.thumbnail || ''
      });

      if (courseToEdit.thumbnail) {
        setThumbnailPreview(courseToEdit.thumbnail);
      }
    }
  }, [courseToEdit]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({
        ...prev,
        thumbnail: 'Please select an image file (JPG or PNG)'
      }));
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        thumbnail: 'Image size must be less than 2MB'
      }));
      return;
    }

    setThumbnailFile(file);

    // Show preview immediately using base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result;
      setThumbnailPreview(base64);
      // Also store base64 as fallback thumbnail in case S3 upload fails later
      setFormData((prev) => ({ ...prev, thumbnail: base64 }));
    };
    reader.readAsDataURL(file);

    // Clear error
    setErrors((prev) => ({ ...prev, thumbnail: '' }));
    toast.success('Thumbnail selected — it will be uploaded when you save');
  };

  const removeThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setFormData((prev) => ({ ...prev, thumbnail: '' }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Course title is required';
    } else if (formData.title.length > 100) {
      newErrors.title = 'Title must be 100 characters or less';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length > 500) {
      newErrors.description = 'Description must be 500 characters or less';
    }

    if (!formData.category) {
      newErrors.category = 'Please select a category';
    }

    if (!formData.difficultyLevel) {
      newErrors.difficultyLevel = 'Please select a difficulty level';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    try {
      setLoading(true);

      let thumbnailUrl = formData.thumbnail;
      if (thumbnailFile) {
        try {
          const uploadResult = await uploadFile({
            file: thumbnailFile,
            fileType: 'image',
            id: `course-thumbnail-${Date.now()}`
          });

          if (uploadResult.success) {
            thumbnailUrl = uploadResult.cdnUrl;
          } else {
            // S3 upload failed — use base64 thumbnail as fallback so course can still be saved
            console.warn('Thumbnail S3 upload failed, using base64 fallback:', uploadResult.error);
            toast('Thumbnail saved locally — S3 upload can be retried later', { icon: '⚠️', duration: 4000 });
            // thumbnailUrl already has base64 from handleThumbnailChange
          }
        } catch (uploadError) {
          console.error('Thumbnail upload exception:', uploadError);
          toast('Thumbnail saved locally — S3 upload can be retried later', { icon: '⚠️', duration: 4000 });
          // thumbnailUrl already has base64 from handleThumbnailChange
        }
      }

      const courseData = {
        ...formData,
        thumbnail: thumbnailUrl
      };

      let response;
      if (isEditMode) {
        // Update existing course
        response = await api.put(`/api/v2/lms/admin/courses/${courseToEdit._id}`, courseData);
      } else {
        // Create new course
        response = await api.post('/api/v2/lms/admin/courses', courseData);
      }

      if (response.data.success) {
        onCourseCreated(response.data.data);
        onClose();
      }
    } catch (error) {
      console.error('Error saving course:', error);
      toast.error(
        error.response?.data?.error || `Failed to ${isEditMode ? 'update' : 'create'} course`
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-purple-50 border-b border-purple-100 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-purple-900">
            {isEditMode ? 'Edit Course Metadata' : 'Create New Course'}
          </h2>
          <button
            onClick={onClose}
            className="text-purple-400 hover:text-purple-600 transition-colors"
            disabled={loading}
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Course Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Course Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 ${errors.title ? 'border-red-500' : 'border-gray-300'
                }`}
              placeholder="e.g., Advanced Computer Apps"
              maxLength={100}
            />
            {errors.title && (
              <p className="text-sm text-red-600 mt-1">{errors.title}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {formData.title.length}/100 characters
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 resize-none ${errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
              rows={4}
              placeholder="Describe the course content and learning objectives..."
              maxLength={500}
            />
            {errors.description && (
              <p className="text-sm text-red-600 mt-1">{errors.description}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {formData.description.length}/500 characters
            </p>
          </div>

          {/* Category & Difficulty (2-column layout) */}
          <div className="grid grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 ${errors.category ? 'border-red-500' : 'border-gray-300'
                  }`}
              >
                <option value="">Select category</option>
                <option value="Computer Apps">Computer Apps</option>
                <option value="Art">Art</option>
                <option value="Spoken English">Spoken English</option>
                <option value="Life Skills">Life Skills</option>
              </select>
              {errors.category && (
                <p className="text-sm text-red-600 mt-1">{errors.category}</p>
              )}
            </div>

            {/* Difficulty Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Difficulty Level *
              </label>
              <div className="space-y-2">
                {['Beginner', 'Intermediate', 'Advanced'].map((level) => (
                  <label
                    key={level}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="difficultyLevel"
                      value={level}
                      checked={formData.difficultyLevel === level}
                      onChange={(e) =>
                        handleChange('difficultyLevel', e.target.value)
                      }
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700">{level}</span>
                  </label>
                ))}
              </div>
              {errors.difficultyLevel && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.difficultyLevel}
                </p>
              )}
            </div>
          </div>

          {/* Thumbnail Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Course Thumbnail <span className="text-red-500 font-bold">* (Required for publishing)</span>
            </label>

            {!thumbnailPreview ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors">
                <Upload className="mx-auto mb-2 text-gray-400" size={32} />
                <p className="text-gray-600 mb-1">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  Recommended: 1280x720px, JPG/PNG, max 2MB
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailChange}
                  className="hidden"
                  id="thumbnail-upload"
                />
                <label
                  htmlFor="thumbnail-upload"
                  className="inline-block px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer"
                >
                  Choose File
                </label>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={thumbnailPreview}
                  alt="Thumbnail preview"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={removeThumbnail}
                  className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}

            {errors.thumbnail && (
              <p className="text-sm text-red-600 mt-1">{errors.thumbnail}</p>
            )}
          </div>

          {/* Info Banner */}
          {!isEditMode && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                ⚠️ Course will be created in <strong>Draft</strong> status. You
                can add content and publish it later.
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 -mx-6 -mb-6 px-6 py-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading
                ? isEditMode
                  ? 'Updating...'
                  : 'Creating...'
                : isEditMode
                  ? 'Update Course'
                  : 'Create Course as Draft'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
