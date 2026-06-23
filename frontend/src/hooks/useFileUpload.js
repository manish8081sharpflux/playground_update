import { useState, useCallback, useRef } from 'react';
import { apiWithoutContentType as api, isCancel } from '../api';
import toast from 'react-hot-toast';

/**
 * useFileUpload - Sprint 2 Epic 02 Story 02
 * Custom hook for uploading files to S3 with retry logic and progress tracking
 */

export default function useFileUpload() {
  const [uploads, setUploads] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const abortControllers = useRef({});

  /**
   * Retry logic with exponential backoff
   */
  const retryWithBackoff = async (fn, maxRetries = 3, delay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (isCancel(error)) throw error; // Don't retry cancelled requests
        if (i === maxRetries - 1) throw error;

        const backoffDelay = delay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }
  };

  /**
   * Upload a single file to S3 via backend (backend proxy pattern)
   */
  const uploadFile = useCallback(async (fileObj, metadata = {}) => {
    const { file, fileType, id } = fileObj;

    // Create AbortController for this upload
    const controller = new AbortController();
    abortControllers.current[id] = controller;

    try {
      // Update upload status
      setUploads(prev => ({
        ...prev,
        [id]: {
          id,
          fileName: file.name,
          fileType,
          status: 'preparing',
          progress: 0,
          error: null
        }
      }));

      // Create FormData to send file to backend
      const formData = new FormData();
      formData.append('files', file);

      // Add metadata if provided
      if (metadata.tags) {
        formData.append('tags', JSON.stringify(metadata.tags));
      }
      if (metadata.description) {
        formData.append('description', metadata.description);
      }

      // Update status to uploading
      setUploads(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          status: 'uploading'
        }
      }));

      // Upload file to backend with progress tracking and retry logic
      const uploadResponse = await retryWithBackoff(async () => {
        return await api.post('/api/v2/lms/admin/content/upload', formData, {
          signal: controller.signal, // Pass signal for cancellation
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploads(prev => ({
              ...prev,
              [id]: {
                ...prev[id],
                progress: percentCompleted
              }
            }));
          }
        });
      });

      if (!uploadResponse.data.success) {
        throw new Error(uploadResponse.data.message || 'Upload failed');
      }

      const uploadedFile = uploadResponse.data.files[0];

      // Update status to completed
      setUploads(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          status: 'completed',
          progress: 100,
          contentLibraryId: uploadedFile.id,
          cdnUrl: uploadedFile.fileUrl,
          s3Key: uploadedFile.s3Key
        }
      }));

      return {
        success: true,
        contentLibraryId: uploadedFile.id,
        cdnUrl: uploadedFile.fileUrl,
        s3Key: uploadedFile.s3Key
      };

    } catch (error) {
      if (isCancel(error)) {
        // Update status to cancelled
        setUploads(prev => ({
          ...prev,
          [id]: {
            ...prev[id],
            status: 'cancelled',
            error: 'Upload cancelled'
          }
        }));
        return { success: false, cancelled: true };
      }

      console.error('File upload error:', error);

      const errorMessage = error.response?.data?.message || error.message || 'Upload failed';

      // Update status to failed
      setUploads(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          status: 'failed',
          error: errorMessage
        }
      }));

      toast.error(`Failed to upload ${file.name}: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage
      };
    } finally {
      // Clean up controller
      delete abortControllers.current[id];
    }
  }, []);

  /**
   * Upload multiple files
   */
  const uploadFiles = useCallback(async (fileObjects, metadata = {}) => {
    setIsUploading(true);

    const results = [];

    // Upload files sequentially to avoid overwhelming the server
    for (const fileObj of fileObjects) {
      const result = await uploadFile(fileObj, metadata);
      results.push(result);
    }

    setIsUploading(false);

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    if (successCount > 0) {
      toast.success(`Successfully uploaded ${successCount} file(s)`);
    }
    if (failCount > 0) {
      toast.error(`Failed to upload ${failCount} file(s)`);
    }

    return results;
  }, [uploadFile]);

  /**
   * Cancel an upload
   */
  const cancelUpload = useCallback((uploadId) => {
    if (abortControllers.current[uploadId]) {
      abortControllers.current[uploadId].abort();
    }
    setUploads(prev => ({
      ...prev,
      [uploadId]: {
        ...(prev[uploadId] || {}), // Ensure object exists
        status: 'cancelled'
      }
    }));
  }, []);

  /**
   * Retry a failed upload
   */
  const retryUpload = useCallback(async (uploadId) => {
    const upload = uploads[uploadId];
    if (!upload || upload.status !== 'failed') {
      return;
    }

    // Find the original file object (this should be passed from the component)
    // For now, we'll just reset the status
    setUploads(prev => ({
      ...prev,
      [uploadId]: {
        ...prev[uploadId],
        status: 'preparing',
        progress: 0,
        error: null
      }
    }));
  }, [uploads]);

  /**
   * Clear completed/failed uploads
   */
  const clearUploads = useCallback(() => {
    setUploads(prev => {
      const filtered = {};
      Object.keys(prev).forEach(key => {
        if (prev[key].status === 'uploading' || prev[key].status === 'preparing') {
          filtered[key] = prev[key];
        }
      });
      return filtered;
    });
  }, []);

  /**
   * Get upload statistics
   */
  const getUploadStats = useCallback(() => {
    const uploadList = Object.values(uploads);
    return {
      total: uploadList.length,
      uploading: uploadList.filter(u => u.status === 'uploading' || u.status === 'preparing').length,
      completed: uploadList.filter(u => u.status === 'completed').length,
      failed: uploadList.filter(u => u.status === 'failed').length,
      cancelled: uploadList.filter(u => u.status === 'cancelled').length
    };
  }, [uploads]);

  return {
    uploads,
    isUploading,
    uploadFile,
    uploadFiles,
    cancelUpload,
    retryUpload,
    clearUploads,
    getUploadStats
  };
}
