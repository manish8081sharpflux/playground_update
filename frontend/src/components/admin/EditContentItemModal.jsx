import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, File, Loader } from 'lucide-react';
import useFileUpload from '../../hooks/useFileUpload';
import { api } from '../../api';
import toast from 'react-hot-toast';

export default function EditContentItemModal({ isOpen, contentItem, chapterId, moduleId, courseId, onClose, onUpdated }) {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        fileUrl: '',
        type: 'video' // default, but will be overwritten
    });

    const { uploads, uploadFile, cancelUpload } = useFileUpload();
    const fileInputRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [currentUploadId, setCurrentUploadId] = useState(null);
    const [dragActive, setDragActive] = useState(false);

    useEffect(() => {
        if (contentItem) {
            setFormData({
                title: contentItem.title || '',
                description: contentItem.description || '',
                fileUrl: contentItem.fileUrl || '',
                type: contentItem.type || 'video',
                externalUrl: contentItem.externalUrl || '' // Handles links
            });
        }
    }, [contentItem]);

    const isValidUrl = (str) => {
        if (!str || !str.trim()) return true; // empty is ok
        try {
            const url = new URL(str);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
            return false;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title.trim()) return;

        if (uploadingFile) {
            toast.error('Please wait for the file upload to finish');
            return;
        }

        if (showUpload && !formData.fileUrl?.trim()) {
            toast.error(`Please upload a ${formData.type} file or enter its URL`);
            return;
        }

        // Validate URL if provided
        if (formData.fileUrl && !formData.fileUrl.startsWith('data:') && !isValidUrl(formData.fileUrl)) {
            toast.error('Please enter a valid URL (starting with http:// or https://)');
            return;
        }

        try {
            setLoading(true);

            // Construct updates object - preserve type
            const updates = {
                title: formData.title,
                description: formData.description,
                fileUrl: formData.fileUrl,
            };

            // Create endpoint specific to content item update
            const response = await api.put(
                `/api/v2/lms/admin/courses/${courseId}/modules/${moduleId}/chapters/${chapterId}/content/${contentItem._id}`,
                updates
            );

            if (response.data.success) {
                toast.success('Content item updated successfully');
                onUpdated();
                onClose();
            }
        } catch (error) {
            console.error('Error updating content item:', error);
            toast.error('Failed to update content item');
        } finally {
            setLoading(false);
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = async (file) => {
        // Validate file type matches the content item type
        const isValidType = (() => {
            switch (formData.type) {
                case 'pdf': return file.type === 'application/pdf';
                case 'video': return file.type.startsWith('video/');
                case 'audio': return file.type.startsWith('audio/');
                case 'image': return file.type.startsWith('image/');
                default: return true;
            }
        })();

        if (!isValidType) {
            toast.error(`Invalid file type "${file.type}". Expected a ${formData.type} file.`);
            return;
        }

        // Max size check (e.g. 500MB for video, 50MB others)
        const maxSize = formData.type === 'video' ? 500 * 1024 * 1024 : 50 * 1024 * 1024;
        if (file.size > maxSize) {
            toast.error(`File too large. Max size: ${formData.type === 'video' ? '500MB' : '50MB'}`);
            return;
        }

        const uploadId = `update-${contentItem._id}-${Date.now()}`;
        setCurrentUploadId(uploadId);

        try {
            setUploadingFile(true);
            const result = await uploadFile({
                file,
                fileType: formData.type,
                id: uploadId
            });

            if (result.success) {
                setFormData(prev => ({ ...prev, fileUrl: result.cdnUrl }));
                toast.success('File replaced successfully!');
            }
        } catch (error) {
            console.error('Upload failed:', error);
            toast.error('Upload failed');
        } finally {
            setUploadingFile(false);
            setCurrentUploadId(null);
        }
    };

    const handleCancel = () => {
        if (uploadingFile && currentUploadId) {
            cancelUpload(currentUploadId);
            toast('Upload cancelled');
        }
        onClose();
    };

    const showUpload = ['video', 'pdf', 'image', 'audio'].includes(formData.type);
    const currentUpload = currentUploadId ? uploads[currentUploadId] : null;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
                <div className="flex flex-shrink-0 items-center justify-between p-6 pb-4 border-b border-gray-200">
                    <h3 className="text-xl font-bold text-blue-900">Edit Content Item</h3>
                    <button onClick={handleCancel}><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-scroll custom-scrollbar p-6 space-y-4">
                    {/* Not allowing Type change to keep it simple */}
                    <div className="text-sm text-gray-500 mb-2">
                        Type: <span className="font-semibold capitalize">{formData.type}</span>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Title *</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg"
                            placeholder="Content Title"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg"
                            rows={3}
                        />
                    </div>

                    {showUpload && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">Replace File or URL</label>

                            {/* Drag & Drop Area */}
                            <div
                                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors mb-3 ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'
                                    }`}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                                onClick={() => !uploadingFile && fileInputRef.current.click()}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    onChange={handleFileSelect}
                                    accept={
                                        formData.type === 'video' ? 'video/*' :
                                            formData.type === 'image' ? 'image/*' :
                                                formData.type === 'audio' ? 'audio/*' :
                                                    formData.type === 'pdf' ? '.pdf,application/pdf' : '*/*'
                                    }
                                />

                                {uploadingFile ? (
                                    <div className="flex flex-col items-center">
                                        <Loader size={32} className="animate-spin text-blue-600 mb-2" />
                                        <p className="text-sm text-gray-600">
                                            {currentUpload?.progress >= 100
                                                ? 'Finishing upload...'
                                                : `Uploading${currentUpload?.progress ? `... ${currentUpload.progress}%` : '...'}`}
                                        </p>
                                        <div className="mt-3 h-2 w-full max-w-xs rounded-full bg-gray-200 overflow-hidden">
                                            <div
                                                className="h-full bg-blue-600 transition-all"
                                                style={{ width: `${currentUpload?.progress || 0}%` }}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <Upload size={32} className="text-gray-400 mb-2" />
                                        <p className="text-sm font-medium text-gray-700">Click to replace file</p>
                                        <p className="text-xs text-gray-500 mt-1">Current URL: {formData.fileUrl ? 'Set' : 'None'}</p>
                                    </div>
                                )}
                            </div>

                            {/* Manual URL Input */}
                            <div className="relative">
                                <input
                                    type="text"
                                    value={formData.fileUrl}
                                    onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg pl-10"
                                    placeholder="Or enter URL..."
                                />
                                <div className="absolute left-3 top-2.5 text-gray-400">
                                    <File size={16} />
                                </div>
                            </div>
                        </div>
                    )}

                    {formData.type === 'link' && (
                        <div>
                            <label className="block text-sm font-medium mb-1">Link URL</label>
                            <input
                                type="text"
                                value={formData.fileUrl} // Using fileUrl for link too for simplicity based on model
                                onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg"
                            />
                        </div>
                    )}

                    <div className="flex flex-shrink-0 justify-end gap-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                            disabled={loading && !uploadingFile}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
                            disabled={loading || uploadingFile}
                        >
                            {loading ? 'Updating...' : 'Update Content'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
