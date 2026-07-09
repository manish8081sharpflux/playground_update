import React, { useState } from 'react';
import { api } from '../../api';
import toast from 'react-hot-toast';
import { confirmDialog } from '../../utils/dialogs';

/**
 * ProductImageUpload Component - Story-14
 * Allows coaches/admins to upload, delete, and manage product images
 * Max 5 images per product
 */
const ProductImageUpload = ({ productId, existingImages = [], onUploadSuccess }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const MAX_IMAGES = 5;
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  /**
   * Handle file selection with validation
   */
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);

    // Validation: File type and size
    const validFiles = [];
    for (const file of files) {
      // Check file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`${file.name} is not a valid image type (JPEG, PNG, WebP only)`);
        continue;
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is too large (max 5MB)`);
        continue;
      }

      validFiles.push(file);
    }

    // Check total count
    const totalImages = existingImages.length + validFiles.length;
    if (totalImages > MAX_IMAGES) {
      toast.error(`Maximum ${MAX_IMAGES} images allowed per product. You can upload ${MAX_IMAGES - existingImages.length} more.`);
      return;
    }

    if (validFiles.length === 0) {
      return;
    }

    setSelectedFiles(validFiles);

    // Generate previews
    const newPreviews = validFiles.map(file => ({
      url: URL.createObjectURL(file),
      name: file.name,
      size: (file.size / 1024).toFixed(2) + ' KB'
    }));
    setPreviews(newPreviews);
  };

  /**
   * Upload images to S3 via backend
   */
  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select images to upload');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('images', file);
      });

      const response = await api.post(
        `/api/v2/shop/products/${productId}/images`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );

      if (response.data.success) {
        toast.success(response.data.message);

        // Clear selection
        setSelectedFiles([]);
        setPreviews([]);

        // Clear file input
        const fileInput = document.getElementById(`imageInput-${productId}`);
        if (fileInput) {
          fileInput.value = '';
        }

        // Callback to refresh product data
        if (onUploadSuccess) {
          onUploadSuccess();
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      const errorMsg = error.response?.data?.message || 'Failed to upload images';
      toast.error(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  /**
   * Delete an image from S3 and product
   */
  const handleDelete = async (imageId, imageUrl) => {
    if (!(await confirmDialog('Are you sure you want to delete this image?', { danger: true, confirmText: 'Delete' }))) {
      return;
    }

    setDeleting(imageId);

    try {
      const response = await api.delete(
        `/api/v2/shop/products/${productId}/images/${imageId}`
      );

      if (response.data.success) {
        toast.success('Image deleted successfully');

        // Callback to refresh product data
        if (onUploadSuccess) {
          onUploadSuccess();
        }
      }
    } catch (error) {
      console.error('Delete error:', error);
      const errorMsg = error.response?.data?.message || 'Failed to delete image';
      toast.error(errorMsg);
    } finally {
      setDeleting(null);
    }
  };

  /**
   * Set an image as primary
   */
  const handleSetPrimary = async (imageId) => {
    try {
      const response = await api.put(
        `/api/v2/shop/products/${productId}/images/${imageId}/primary`
      );

      if (response.data.success) {
        toast.success('Primary image updated');

        if (onUploadSuccess) {
          onUploadSuccess();
        }
      }
    } catch (error) {
      console.error('Set primary error:', error);
      toast.error('Failed to set primary image');
    }
  };

  /**
   * Cancel file selection
   */
  const handleCancel = () => {
    setSelectedFiles([]);
    setPreviews([]);

    const fileInput = document.getElementById(`imageInput-${productId}`);
    if (fileInput) {
      fileInput.value = '';
    }
  };

  return (
    <div className="product-image-upload bg-white rounded-lg border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">
        Product Images ({existingImages.length}/{MAX_IMAGES})
      </h3>

      {/* Existing Images Grid */}
      {existingImages.length > 0 && (
        <div className="mb-6">
          <p className="text-sm text-slate-600 mb-3">
            Current Images:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {existingImages.map((img) => (
              <div key={img._id} className="relative group">
                <img
                  src={img.url}
                  alt="Product"
                  className={`w-full h-32 object-cover rounded-lg border-2 ${
                    img.isPrimary ? 'border-blue-500' : 'border-slate-200'
                  }`}
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/150?text=No+Image';
                  }}
                />

                {/* Primary Badge */}
                {img.isPrimary && (
                  <span className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                    Primary
                  </span>
                )}

                {/* Hover Actions */}
                <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col items-center justify-center gap-2 p-2">
                  {!img.isPrimary && (
                    <button
                      onClick={() => handleSetPrimary(img._id)}
                      className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 w-full"
                    >
                      Set Primary
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(img._id, img.url)}
                    disabled={deleting === img._id}
                    className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 disabled:opacity-50 w-full"
                  >
                    {deleting === img._id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload New Images */}
      {existingImages.length < MAX_IMAGES && (
        <div className="border-2 border-dashed border-slate-300 rounded-lg p-6">
          <label
            htmlFor={`imageInput-${productId}`}
            className="block cursor-pointer"
          >
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-slate-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="mt-2 text-sm text-slate-600">
                <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
              </p>
              <p className="mt-1 text-xs text-slate-500">
                JPEG, PNG, WebP (max 5MB each, up to {MAX_IMAGES - existingImages.length} more)
              </p>
            </div>
          </label>

          <input
            id={`imageInput-${productId}`}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Selected Files Preview */}
          {previews.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-semibold text-slate-700 mb-2">
                Selected Files ({selectedFiles.length}):
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-4">
                {previews.map((preview, index) => (
                  <div key={index} className="relative">
                    <img
                      src={preview.url}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border-2 border-blue-300"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-1 rounded-b-lg">
                      <p className="truncate">{preview.name}</p>
                      <p>{preview.size}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Upload Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {uploading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Uploading...
                    </span>
                  ) : (
                    'Upload Images'
                  )}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={uploading}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Max Images Reached */}
      {existingImages.length >= MAX_IMAGES && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            Maximum {MAX_IMAGES} images reached. Delete an image to upload more.
          </p>
        </div>
      )}
    </div>
  );
};

export default ProductImageUpload;
