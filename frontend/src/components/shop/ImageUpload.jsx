import React, { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api';

/**
 * ImageUpload Component - Sprint5-Story-05
 * Simple image upload with preview (placeholder for S3 integration)
 * AWS S3 integration planned for future sprint
 */

export default function ImageUpload({ currentImageUrl, onUpload }) {
  const [imageUrl, setImageUrl] = useState(currentImageUrl || '');
  const [isManualInput, setIsManualInput] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  const handleUrlChange = (e) => {
    const url = e.target.value;
    setImageUrl(url);
    onUpload(url);
  };

  const handleRemoveImage = () => {
    setImageUrl('');
    onUpload('');
  };

  const handleSelectFile = () => {
    if (uploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Invalid image type (JPEG, PNG, WebP only)');
      e.target.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('Image is too large (max 5MB)');
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await api.post('/api/v2/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (!response.data?.success || !response.data?.url) {
        throw new Error(response.data?.message || 'Upload failed');
      }

      setImageUrl(response.data.url);
      onUpload(response.data.url);
      toast.success('Image uploaded');
    } catch (err) {
      console.error('Image upload failed:', err);
      toast.error(err.response?.data?.message || err.message || 'Image upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-3">
      {imageUrl ? (
        /* Image Preview */
        <div className="relative">
          <img
            src={imageUrl}
            alt="Product preview"
            className="w-full h-48 object-cover rounded-lg border border-slate-300"
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/400x300?text=Invalid+Image+URL';
            }}
          />
          <button
            type="button"
            onClick={handleRemoveImage}
            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            title="Remove image"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* Upload Area */
        <div
          className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
          onClick={handleSelectFile}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleSelectFile();
            }
          }}
        >
          <ImageIcon className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-sm text-slate-600 mb-2">
            {uploading ? 'Uploading...' : 'Click to upload image'}
          </p>
          <p className="text-xs text-slate-500">
            Or paste an image URL below
          </p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
        disabled={uploading}
      />

      {/* URL Input */}
      {(!imageUrl || isManualInput) && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Image URL
          </label>
          <input
            type="url"
            value={imageUrl}
            onChange={handleUrlChange}
            placeholder="https://example.com/image.jpg"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-slate-500">
            Paste an image URL or use a placeholder like https://via.placeholder.com/300
          </p>
        </div>
      )}

      {imageUrl && !isManualInput && (
        <button
          type="button"
          onClick={() => setIsManualInput(true)}
          className="text-sm text-purple-600 hover:text-purple-700"
        >
          Change image URL
        </button>
      )}

      {imageUrl && (
        <button
          type="button"
          onClick={handleSelectFile}
          disabled={uploading}
          className="inline-flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900 disabled:opacity-50"
        >
          <Upload className="w-4 h-4" />
          Upload a different image
        </button>
      )}
    </div>
  );
}
