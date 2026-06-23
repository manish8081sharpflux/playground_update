import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, File, Loader, CheckCircle, Search, Plus } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import useFileUpload from '../../hooks/useFileUpload';
import toast from 'react-hot-toast';
import { api } from '../../api';

export default function AddContentItemModal({ isOpen, onClose, onAdd }) {
  const { courseId } = useParams(); // Get courseId from URL for "Create New" redirect
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    type: 'video',
    title: '',
    description: '',
    fileUrl: '',
    quizRef: '' // Store selected quiz ID
  });

  const { uploadFile, isUploading } = useFileUpload();
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  // Quiz Selection State
  const [quizMode, setQuizMode] = useState('existing'); // 'existing' or 'create'
  const [quizzes, setQuizzes] = useState([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [startNewQuiz, setStartNewQuiz] = useState(false); // Flag to redirect after close
  const [searchTerm, setSearchTerm] = useState('');

  const isValidUrl = (str) => {
    if (!str || !str.trim()) return true;
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

    // Validate URL if manually entered
    if (formData.fileUrl && !formData.fileUrl.startsWith('data:') && !isValidUrl(formData.fileUrl)) {
      toast.error('Please enter a valid URL (starting with http:// or https://)');
      return;
    }

    await onAdd(formData);
    setFormData({ type: 'video', title: '', description: '', fileUrl: '' });
  };

  // Fetch quizzes when type is 'quiz'
  useEffect(() => {
    if (isOpen && formData.type === 'quiz') {
      fetchQuizzes();
    }
  }, [isOpen, formData.type]);

  const fetchQuizzes = async () => {
    try {
      setLoadingQuizzes(true);
      const response = await api.get('/api/v2/lms/admin/quizzes?status=published'); // Fetch published quizzes
      // Or maybe allow drafts too? Let's show all for now, maybe filter in UI
      // Actually endpoint usually returns all for admin.
      if (response.data.success) {
        setQuizzes(response.data.quizzes);
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      toast.error('Failed to load quizzes');
    } finally {
      setLoadingQuizzes(false);
    }
  };

  const handleCreateNewQuiz = () => {
    // We can't easily pass the open modal state, so we'll just redirect
    // But we need to know the current module/chapter.
    // The AddContentItemModal is called from ModuleCard -> ChapterItem
    // It is passed an 'onAdd' but doesn't receive module/chapter IDs directly in props
    // We might need to ask the user to fill those in QuizBuilder, or pass them if available.
    // For now, let's just redirect to create page with courseId.
    onClose();
    navigate(`/admin/courses/${courseId}/quizzes/create`);
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
      e.target.value = ''; // Reset input so same file can be selected again
    }
  };

  const handleFile = async (file) => {
    // Validate file type matches the selected content type
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

    try {
      const result = await uploadFile({
        file,
        fileType: formData.type,
        id: `upload-${Date.now()}`
      });

      if (result.success) {
        setFormData(prev => ({ ...prev, fileUrl: result.cdnUrl }));
        toast.success('File uploaded successfully!');
      }
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const showUpload = ['video', 'pdf', 'image', 'audio'].includes(formData.type);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-blue-900">Add Content Item</h3>
          <button onClick={onClose}><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Content Type *</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="video">🎥 Video</option>
              <option value="pdf">📄 PDF</option>
              <option value="audio">🔊 Audio</option>
              <option value="image">🖼️ Image</option>
              <option value="text">📝 Text</option>
              <option value="link">🔗 Link</option>
              <option value="quiz">❓ Quiz</option>
              <option value="task">✅ Task</option>
            </select>
          </div>

          {/* Quiz Selection UI */}
          {formData.type === 'quiz' && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setQuizMode('existing')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md ${quizMode === 'existing'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  Link Existing
                </button>
                <button
                  type="button"
                  onClick={() => setQuizMode('create')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md ${quizMode === 'create'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  Create New
                </button>
              </div>

              {quizMode === 'existing' ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search quizzes..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto border rounded-lg bg-white">
                    {loadingQuizzes ? (
                      <div className="p-4 text-center text-gray-500">Loading...</div>
                    ) : quizzes.filter(q => q.title.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-sm">No quizzes found</div>
                    ) : (
                      <div className="divide-y">
                        {quizzes
                          .filter(q => q.title.toLowerCase().includes(searchTerm.toLowerCase()))
                          .map(quiz => (
                            <button
                              key={quiz._id}
                              type="button"
                              onClick={() => setFormData({
                                ...formData,
                                quizRef: quiz._id,
                                title: quiz.title, // Auto-fill title
                                description: quiz.description || ''
                              })}
                              className={`w-full px-4 py-2 text-left text-sm hover:bg-purple-50 flex items-center justify-between ${formData.quizRef === quiz._id ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-700'
                                }`}
                            >
                              <span>{quiz.title}</span>
                              {formData.quizRef === quiz._id && <CheckCircle size={16} />}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                  {formData.quizRef && (
                    <div className="text-xs text-green-600 font-medium flex items-center gap-1">
                      <CheckCircle size={12} />
                      Quiz selected. Click "Add Content" to link.
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-600 mb-3">
                    Create a new quiz in the Quiz Builder.<br />
                    You will be redirected away from this page.
                  </p>
                  <button
                    type="button"
                    onClick={handleCreateNewQuiz}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
                  >
                    <Plus size={16} />
                    Go to Quiz Builder
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Regular Inputs (Hidden for Quiz Create Mode) */}
          {!(formData.type === 'quiz' && quizMode === 'create') && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="e.g., How to Create a Document"
                  readOnly={formData.type === 'quiz'} // Read-only for quiz (auto-filled)
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  rows={2}
                />
              </div>
            </>
          )}

          {showUpload && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Upload File or URL</label>

              {/* Drag & Drop Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors mb-3 ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'
                  }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => !isUploading && fileInputRef.current.click()}
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

                {isUploading ? (
                  <div className="flex flex-col items-center">
                    <Loader size={32} className="animate-spin text-blue-600 mb-2" />
                    <p className="text-sm text-gray-600">Uploading...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload size={32} className="text-gray-400 mb-2" />
                    <p className="text-sm font-medium text-gray-700">Click to upload or drag & drop</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.type === 'video' ? 'MP4, WebM (Max 500MB)' :
                        formData.type === 'pdf' ? 'PDF (Max 50MB)' : 'Max 50MB'}
                    </p>
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
                  placeholder={`Or enter ${formData.type} URL...`}
                />
                <div className="absolute left-3 top-2.5 text-gray-400">
                  <File size={16} />
                </div>
              </div>
            </div>
          )}

          {!showUpload && formData.type === 'link' && (
            <div>
              <label className="block text-sm font-medium mb-1">Link URL</label>
              <input
                type="text"
                value={formData.fileUrl}
                onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="https://..."
              />
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 transition-colors">Cancel</button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              disabled={isUploading}
            >
              {isUploading ? <Loader size={16} className="animate-spin" /> : null}
              Add Content
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
