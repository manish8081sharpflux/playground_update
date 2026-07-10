import React, { useState } from 'react';
import ArtCourseContentList from './ArtCourseContentList';
import ArtworkTaskCards from './ArtworkTaskCards';

/**
 * ArtStoriesMode Component - Story 12.9 (FIX-014)
 * Drawing based on story prompts with audio narration.
 * Now wires real file upload via SubmissionModal.
 */
export default function ArtStoriesMode({ data, studentId, onRefresh }) {
  const [selectedStory, setSelectedStory] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedContentChapter, setSelectedContentChapter] = useState(null);

  const stories = data?.stories || [];
  const visibleTasks = React.useMemo(() => {
    const tasks = selectedStory?.tasks || [];
    if (!selectedContentChapter?.chapterId) return tasks;

    return tasks.filter(task =>
      String(task.chapterId) === String(selectedContentChapter.chapterId)
    );
  }, [selectedStory, selectedContentChapter?.chapterId]);

  const handleChapterChange = React.useCallback((chapter) => {
    setSelectedContentChapter(chapter);
  }, []);

  React.useEffect(() => {
    setSelectedStory(current =>
      stories.find(story => String(story.id) === String(current?.id)) ||
      stories[0] ||
      null
    );
  }, [stories]);

  React.useEffect(() => {
    setSelectedTask(visibleTasks.find(task => !task.completed) || visibleTasks[0] || null);
  }, [visibleTasks]);

  if (stories.length === 0) {
    return <div className="text-center py-12"><p className="text-gray-500">No stories available</p></div>;
  }

  return (
    <div className="space-y-6">
      {/* Story Selector */}
      {stories.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Story</label>
          <select
            value={selectedStory?.id || ''}
            onChange={(e) => setSelectedStory(stories.find(s => s.id === e.target.value))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
          >
            {stories.map((story) => (
              <option key={story.id} value={story.id}>
                {story.title} ({story.difficulty})
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedStory && (
        <>
          {/* Story Header */}
          <div className="bg-pink-50 rounded-lg p-4">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
              <h2 className="text-2xl font-bold text-gray-900">{selectedStory.title}</h2>
              {selectedStory.completed && (
                <span className="rounded-full bg-green-100 px-4 py-1 text-sm font-semibold text-green-700">
                  Completed
                </span>
              )}
            </div>
            <div className="flex gap-4 text-sm text-gray-600">
              <span>Difficulty: {selectedStory.difficulty}</span>
              <span>Estimated Time: {selectedStory.estimatedTime} mins</span>
            </div>
            {selectedTask && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold text-gray-700">Selected Task:</span>
                <span className="text-gray-700">{selectedTask.title}</span>
                {selectedTask.completed && (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                    Completed
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Audio Player (if audioUrl exists) */}
          {selectedStory.audioUrl && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Listen to the Story</h3>
              <audio controls className="w-full">
                <source src={selectedStory.audioUrl} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>
          )}

          {/* Story Text */}
          {selectedStory.storyText && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Story</h3>
              <div className="text-gray-700 whitespace-pre-line leading-relaxed">
                {selectedStory.storyText}
              </div>
            </div>
          )}

          {/* Drawing Prompt */}
          {selectedStory.prompt && (
            <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Drawing Prompt</h3>
              <div className="text-blue-800 whitespace-pre-line">
                {selectedStory.prompt}
              </div>
            </div>
          )}

          <ArtCourseContentList
            modules={selectedStory.modules || []}
            studentId={studentId}
            onChapterChange={handleChapterChange}
          />

          <ArtworkTaskCards
            tasks={visibleTasks}
            courseId={selectedStory.id}
            mode="art_story"
            studentId={studentId}
            onRefresh={onRefresh}
            onTaskSelect={setSelectedTask}
          />
        </>
      )}
    </div>
  );
}
