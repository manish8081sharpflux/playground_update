import React, { useState } from 'react';
import { X } from 'lucide-react';

export default function AddChapterModal({ isOpen, onClose, onAdd }) {
  const [formData, setFormData] = useState({ title: '', description: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    await onAdd(formData);
    setFormData({ title: '', description: '' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-purple-900">Add New Chapter</h3>
          <button onClick={onClose}><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Chapter Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="e.g., Document Basics"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description (Optional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg">Add Chapter</button>
          </div>
        </form>
      </div>
    </div>
  );
}
