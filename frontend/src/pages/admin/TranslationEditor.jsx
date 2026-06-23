import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api';
import { useDebounce } from '../../hooks/useDebounce';
import PublishTranslationsModal from '../../components/admin/PublishTranslationsModal';

/**
 * TranslationEditor - Epic 02 Story 04
 * Side-by-side translation interface with auto-save
 * Updated: 2025-10-27 - Added quiz translation support and queue navigation
 */
const TranslationEditor = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [items, setItems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentItem, setCurrentItem] = useState(null);
  const [teluguTitle, setTeluguTitle] = useState('');
  const [teluguDescription, setTeluguDescription] = useState('');
  const [teluguOptions, setTeluguOptions] = useState([]); // For quiz MCQ options
  const [markAsTranslated, setMarkAsTranslated] = useState(false);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'editing', 'saving', 'error'
  const [error, setError] = useState(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [retryAttempts, setRetryAttempts] = useState(0);

  // Debounced translations for auto-save (1 second delay)
  const debouncedTitle = useDebounce(teluguTitle, 1000);
  const debouncedDescription = useDebounce(teluguDescription, 1000);
  const debouncedOptions = useDebounce(teluguOptions, 1000);

  // Fetch translatable items on mount
  useEffect(() => {
    fetchTranslatableItems();
    fetchProgress();
  }, [courseId]);

  // Handle item index from URL parameter (for queue navigation)
  useEffect(() => {
    const itemIndex = searchParams.get('itemIndex');
    if (itemIndex && items.length > 0) {
      const index = parseInt(itemIndex, 10);
      if (!isNaN(index) && index >= 0 && index < items.length) {
        setCurrentIndex(index);
      }
    }
  }, [searchParams, items.length]);

  // Keyboard shortcut: Ctrl+S to manually save
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveTranslation(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentItem, teluguTitle, teluguDescription, teluguOptions]);

  // Load current item when index changes
  useEffect(() => {
    if (items.length > 0) {
      const item = items[currentIndex];
      setCurrentItem(item);
      setTeluguTitle(item.telugu.title || '');
      setTeluguDescription(item.telugu.description || '');
      setTeluguOptions(item.telugu.options || []);
      setMarkAsTranslated(item.translationStatus === 'translated');
    }
  }, [currentIndex, items]);

  // Auto-save when debounced values change
  useEffect(() => {
    if (currentItem) {
      const titleChanged = debouncedTitle !== currentItem.telugu.title;
      const descChanged = debouncedDescription !== currentItem.telugu.description;
      const optionsChanged = JSON.stringify(debouncedOptions) !== JSON.stringify(currentItem.telugu.options || []);

      if (titleChanged || descChanged || optionsChanged) {
        saveTranslation(false);
      }
    }
  }, [debouncedTitle, debouncedDescription, debouncedOptions]);

  const fetchTranslatableItems = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/v2/lms/admin/translations/courses/${courseId}/items`);
      setItems(response.data.items || []);
    } catch (err) {
      console.error('Error fetching translatable items:', err);
      setError('Failed to load translatable items');
    } finally {
      setLoading(false);
    }
  };

  const fetchProgress = async () => {
    try {
      const response = await api.get(`/api/v2/lms/admin/translations/courses/${courseId}/progress`);
      setProgress(response.data.progress);
    } catch (err) {
      console.error('Error fetching progress:', err);
    }
  };

  const saveTranslation = async (markComplete = false, isRetry = false) => {
    if (!currentItem) return;

    // Check retry limit
    if (isRetry && retryAttempts >= 3) {
      setSaveStatus('error');
      setError('Maximum retry attempts reached. Please try again later.');
      return;
    }

    try {
      setSaveStatus('saving');
      if (isRetry) {
        setRetryAttempts(prev => prev + 1);
      } else {
        setRetryAttempts(0);
      }

      const translationPayload = {
        title: teluguTitle,
        description: teluguDescription
      };

      // Add options for quiz questions
      if (currentItem.type === 'quiz_question' && teluguOptions.length > 0) {
        translationPayload.options = teluguOptions;
      }

      await api.put(`/api/v2/lms/admin/translations/courses/${courseId}/items/${currentItem.id}`, {
        translations: translationPayload,
        markAsTranslated: markComplete
      });

      setSaveStatus('saved');
      setRetryAttempts(0);
      setError(null);

      // Refresh progress
      await fetchProgress();

      // If marking complete, update item status and move to next
      if (markComplete) {
        const updatedItems = [...items];
        updatedItems[currentIndex] = {
          ...currentItem,
          translationStatus: 'translated',
          telugu: {
            title: teluguTitle,
            description: teluguDescription,
            options: teluguOptions
          }
        };
        setItems(updatedItems);

        // Move to next untranslated item
        moveToNextUntranslated();
      }
    } catch (err) {
      console.error('Error saving translation:', err);
      setSaveStatus('error');
      setError(err.response?.data?.message || 'Failed to save translation');
    }
  };

  const handlePrevious = () => {
    setSaveStatus('saved');
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      // NAV-06: Wrap to last item
      setCurrentIndex(items.length - 1);
    }
  };

  const handleNext = () => {
    setSaveStatus('saved');
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // NAV-06: Wrap to first item
      setCurrentIndex(0);
    }
  };

  const handleSkip = () => {
    moveToNextUntranslated();
  };

  const moveToNextUntranslated = () => {
    // Find next untranslated or in_progress item
    let nextIndex = currentIndex + 1;
    while (nextIndex < items.length) {
      if (items[nextIndex].translationStatus !== 'translated') {
        setCurrentIndex(nextIndex);
        return;
      }
      nextIndex++;
    }

    // If no untranslated items found, go to first item
    setCurrentIndex(0);
  };

  const handleMarkAsTranslated = async () => {
    if (!markAsTranslated) {
      // Validate before marking as translated (SAVE-05)
      if (!teluguTitle.trim()) {
        setError('Cannot mark as translated: Title is required');
        setSaveStatus('error');
        return;
      }

      // For quiz questions with options, validate all options are translated
      if (currentItem.type === 'quiz_question' && currentItem.english.options && currentItem.english.options.length > 0) {
        const totalOptions = currentItem.english.options.length;
        let emptyCount = 0;

        for (let i = 0; i < totalOptions; i++) {
          const option = teluguOptions[i];
          if (!option || !option.trim()) {
            emptyCount++;
          }
        }

        if (emptyCount > 0) {
          setError(`Cannot mark as translated: ${emptyCount} option(s) not translated`);
          setSaveStatus('error');
          return;
        }
      }

      // If checking the box, save and mark complete
      setMarkAsTranslated(true);
      await saveTranslation(true);
    } else {
      // Unchecking - just toggle
      setMarkAsTranslated(false);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/admin/translations');
  };

  const handleOpenPublishModal = () => {
    setShowPublishModal(true);
  };

  const handleClosePublishModal = (published) => {
    setShowPublishModal(false);
    if (published) {
      // Refresh progress after successful publish
      fetchProgress();
    }
  };

  const getSaveStatusDisplay = () => {
    switch (saveStatus) {
      case 'saved':
        return <span className="text-green-600 font-medium">💾 Saved</span>;
      case 'editing':
        return <span className="text-blue-600 font-medium">✏️ Editing...</span>;
      case 'saving':
        return <span className="text-orange-600 font-medium">⏳ Saving...</span>;
      case 'error':
        return (
          <div className="flex items-center gap-3">
            <span className="text-red-600 font-medium">❌ Save failed. {error}</span>
            {retryAttempts < 3 && (
              <button
                onClick={() => saveTranslation(false, true)}
                className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 font-semibold rounded transition-colors text-sm"
              >
                Retry ({retryAttempts}/3)
              </button>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  // Update save status when user types
  const handleTitleChange = (e) => {
    setTeluguTitle(e.target.value);
    setSaveStatus('editing');
  };

  const handleDescriptionChange = (e) => {
    setTeluguDescription(e.target.value);
    setSaveStatus('editing');
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...teluguOptions];
    newOptions[index] = value;
    setTeluguOptions(newOptions);
    setSaveStatus('editing');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600"></div>
      </div>
    );
  }

  if (error || !currentItem) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-8 max-w-md">
          <p className="text-red-600 font-medium text-lg">⚠️ {error || 'No items to translate'}</p>
          <button
            onClick={handleBackToDashboard}
            className="mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 w-full">
      {/* Screen Reader Announcements (ACC-03) */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {saveStatus === 'saving' && 'Saving translation...'}
        {saveStatus === 'saved' && 'Translation saved successfully'}
        {saveStatus === 'error' && `Error: ${error}`}
        {progress && `Translation progress: ${progress.percentage}% complete. ${progress.translatedItems} of ${progress.totalItems} items translated.`}
      </div>

      {/* Header */}
      <div className="bg-purple-600 text-white shadow-lg" role="banner">
        <div className="flex justify-between items-center py-4 px-6">
          <div>
            <h1 className="text-2xl font-bold">Translation Editor</h1>
            <p className="text-purple-100 text-sm mt-1" aria-label={progress && `Translation progress: ${progress.translatedItems} of ${progress.totalItems} items, ${progress.percentage}% complete`}>
              {progress && `${progress.translatedItems} / ${progress.totalItems} items (${progress.percentage}%)`}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleOpenPublishModal}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded transition-colors flex items-center gap-2"
            >
              📢 Publish All Translations
            </button>
            <button
              onClick={handleBackToDashboard}
              className="bg-purple-500 hover:bg-purple-400 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {progress && (
        <div className="bg-white border-b-2 border-gray-200 py-4">
          <div className="px-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-700 font-medium">Progress</span>
              <div className="flex items-center gap-4">
                {getSaveStatusDisplay()}
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-purple-600 h-4 rounded-full transition-all duration-500"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Current Item Breadcrumb */}
      <div className="bg-gray-100 border-b-2 border-gray-200 py-3">
        <div className="px-6 flex justify-between items-center">
          <p className="text-gray-700 font-medium">
            Translating: {currentItem.breadcrumb}
          </p>
          <p className="text-gray-600 text-sm">
            Item {currentIndex + 1} of {items.length}
          </p>
        </div>
      </div>

      {/* Side-by-Side Editor */}
      <div className="p-6">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="grid grid-cols-2 divide-x-2 divide-gray-200">
            {/* English Column (Read-only) */}
            <div className="p-6 bg-gray-50">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xl font-bold text-gray-800">ENGLISH (Original)</h2>
                <span className="text-gray-500">🔒</span>
              </div>

              {/* Title */}
              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">
                  {currentItem.type === 'quiz_question' ? 'Question:' : 'Title:'}
                </label>
                <input
                  type="text"
                  value={currentItem.english.title || ''}
                  readOnly
                  className="w-full px-4 py-2 bg-gray-200 border border-gray-300 rounded text-gray-700 cursor-not-allowed"
                />
              </div>

              {/* Description */}
              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">
                  {currentItem.type === 'quiz_question' ? 'Explanation:' : 'Description:'}
                </label>
                <textarea
                  value={currentItem.english.description || ''}
                  readOnly
                  rows={6}
                  className="w-full px-4 py-2 bg-gray-200 border border-gray-300 rounded text-gray-700 cursor-not-allowed resize-none"
                />
              </div>

              {/* Quiz Options (English - Read-only) */}
              {currentItem.type === 'quiz_question' && currentItem.english.options && currentItem.english.options.length > 0 && (
                <div>
                  <label className="block text-gray-700 font-semibold mb-3">Options:</label>
                  <div className="space-y-2">
                    {currentItem.english.options.map((option, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <span className="font-bold text-gray-600 mt-2">{String.fromCharCode(65 + index)})</span>
                        <input
                          type="text"
                          value={option}
                          readOnly
                          className="flex-1 px-4 py-2 bg-gray-200 border border-gray-300 rounded text-gray-700 cursor-not-allowed"
                        />
                        {currentItem.metadata?.correctAnswer === index && (
                          <span className="text-green-600 font-bold mt-2">✓ Correct</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Telugu Column (Editable) */}
            <div className="p-6 bg-white">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xl font-bold text-gray-800">తెలుగు (Translation)</h2>
                <span className="text-green-500">✏️</span>
              </div>

              {/* Title */}
              <div className="mb-6">
                <label htmlFor="telugu-title" className="block text-gray-700 font-semibold mb-2">
                  {currentItem.type === 'quiz_question' ? 'Question:' : 'Title:'}
                </label>
                <input
                  id="telugu-title"
                  type="text"
                  value={teluguTitle}
                  onChange={handleTitleChange}
                  maxLength={120}
                  placeholder="Enter Telugu translation..."
                  aria-label={`Telugu translation for ${currentItem.type === 'quiz_question' ? 'question' : 'title'}`}
                  aria-required="true"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded focus:outline-none focus:border-purple-500"
                />
                <p className="text-gray-500 text-sm mt-1" aria-live="polite">{teluguTitle.length} / 120 characters</p>
              </div>

              {/* Description */}
              <div className="mb-6">
                <label htmlFor="telugu-description" className="block text-gray-700 font-semibold mb-2">
                  {currentItem.type === 'quiz_question' ? 'Explanation:' : 'Description:'}
                </label>
                <textarea
                  id="telugu-description"
                  value={teluguDescription}
                  onChange={handleDescriptionChange}
                  rows={6}
                  maxLength={1000}
                  placeholder="Enter Telugu translation..."
                  aria-label={`Telugu translation for ${currentItem.type === 'quiz_question' ? 'explanation' : 'description'}. Supports markdown formatting.`}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded focus:outline-none focus:border-purple-500 resize-none"
                />
                <div className="flex justify-between items-center mt-1">
                  <p className="text-gray-500 text-xs">
                    <strong>Formatting:</strong> **bold** *italic* • Bullet • 1. Numbered
                  </p>
                  <p className="text-gray-500 text-sm" aria-live="polite">{teluguDescription.length} / 1000 characters</p>
                </div>
              </div>

              {/* Quiz Options (Telugu - Editable) */}
              {currentItem.type === 'quiz_question' && currentItem.english.options && currentItem.english.options.length > 0 && (
                <div>
                  <label className="block text-gray-700 font-semibold mb-3">Options:</label>
                  <div className="space-y-2">
                    {currentItem.english.options.map((option, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <span className="font-bold text-gray-700 mt-2">{String.fromCharCode(65 + index)})</span>
                        <input
                          type="text"
                          value={teluguOptions[index] || ''}
                          onChange={(e) => handleOptionChange(index, e.target.value)}
                          maxLength={200}
                          placeholder={`Enter Telugu translation for option ${String.fromCharCode(65 + index)}...`}
                          className="flex-1 px-4 py-2 border-2 border-gray-300 rounded focus:outline-none focus:border-purple-500"
                        />
                        {currentItem.metadata?.correctAnswer === index && (
                          <span className="text-green-600 font-bold mt-2">✓ సరైనది</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mark as Translated Checkbox */}
          <div className="border-t-2 border-gray-200 px-8 py-4 bg-gray-50">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={markAsTranslated}
                onChange={handleMarkAsTranslated}
                aria-label="Mark this item as translated and move to next untranslated item"
                className="w-5 h-5 text-purple-600 focus:ring-purple-500 rounded cursor-pointer"
              />
              <span className="ml-3 text-gray-700 font-medium">
                ☑ Mark as Translated (saves and moves to next untranslated item)
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="border-t-2 border-gray-200 px-8 py-6 bg-white flex justify-between items-center">
            <button
              onClick={handlePrevious}
              className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold py-3 px-6 rounded transition-colors"
              title="Previous item (wraps to last)"
              aria-label={`Navigate to previous item. Currently on item ${currentIndex + 1} of ${items.length}.`}
            >
              ← Previous
            </button>

            <div className="flex gap-4">
              <button
                onClick={handleSkip}
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-6 rounded transition-colors"
                aria-label="Skip current item and move to next untranslated item"
              >
                Skip (move to next)
              </button>

              <button
                onClick={handleNext}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded transition-colors"
                title="Next item (wraps to first)"
                aria-label={`Save current translation and navigate to next item. Currently on item ${currentIndex + 1} of ${items.length}.`}
              >
                Save & Next →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Publish Translations Modal */}
      <PublishTranslationsModal
        isOpen={showPublishModal}
        onClose={handleClosePublishModal}
        courseId={courseId}
        progress={progress}
      />
    </div>
  );
};

export default TranslationEditor;
