import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';

export default function EditChapterModal({ isOpen, chapter, moduleId, courseId, onClose, onUpdated }) {
    const [formData, setFormData] = useState({ title: '', description: '' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (chapter) {
            setFormData({
                title: chapter.title || '',
                description: chapter.description || ''
            });
        }
    }, [chapter]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title.trim()) return;

        try {
            setLoading(true);
            const response = await api.put(
                `/api/v2/lms/admin/courses/${courseId}/modules/${moduleId}/chapters/${chapter._id}`,
                formData
            );

            if (response.data.success) {
                toast.success('Chapter updated successfully');
                onUpdated();
                onClose();
            }
        } catch (error) {
            console.error('Error updating chapter:', error);
            toast.error('Failed to update chapter');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-purple-900">Edit Chapter</h3>
                    <button onClick={onClose}><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Chapter Title *</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg"
                            placeholder="Chapter Title"
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
                            placeholder="Description"
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-purple-400"
                            disabled={loading}
                        >
                            {loading ? 'Updating...' : 'Update Chapter'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
