import React, { useState } from 'react';
import ArtCourseContentList from './ArtCourseContentList';
import ArtworkTaskCards from './ArtworkTaskCards';

/**
 * WorkshopsMode Component - Story 12.9 (FIX-014)
 * Guided art lessons with instructor videos.
 * Now wires real file upload via SubmissionModal.
 */
export default function WorkshopsMode({ data, studentId, onRefresh }) {
  const [selectedWorkshop, setSelectedWorkshop] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedContentChapter, setSelectedContentChapter] = useState(null);

  const workshops = data?.workshops || [];
  const isDirectVideoFile = (url = '') =>
    /\.(mp4|webm|ogg|mov)(?:$|[?#])/i.test(url);
  const visibleTasks = React.useMemo(() => {
    const tasks = selectedWorkshop?.tasks || [];
    if (!selectedContentChapter?.chapterId) return tasks;

    return tasks.filter(task =>
      String(task.chapterId) === String(selectedContentChapter.chapterId)
    );
  }, [selectedWorkshop, selectedContentChapter?.chapterId]);

  const handleChapterChange = React.useCallback((chapter) => {
    setSelectedContentChapter(chapter);
  }, []);

  // Auto-select first workshop on load
  React.useEffect(() => {
    setSelectedWorkshop(current =>
      workshops.find(workshop => String(workshop.id) === String(current?.id)) ||
      workshops[0] ||
      null
    );
  }, [workshops]);

  React.useEffect(() => {
    setSelectedTask(visibleTasks.find(task => !task.completed) || visibleTasks[0] || null);
  }, [visibleTasks]);

  if (workshops.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No workshops available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Workshop Selector */}
      {workshops.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Workshop
          </label>
          <select
            value={selectedWorkshop?.id || ''}
            onChange={(e) => {
              const workshop = workshops.find(w => w.id === e.target.value);
              setSelectedWorkshop(workshop);
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
          >
            {workshops.map((workshop) => (
              <option key={workshop.id} value={workshop.id}>
                {workshop.title} - {workshop.instructor} ({workshop.level})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Workshop Details */}
      {selectedWorkshop && (
        <>
          <div className="bg-pink-50 rounded-lg p-4">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedWorkshop.title}
              </h2>
              {selectedWorkshop.completed && (
                <span className="rounded-full bg-green-100 px-4 py-1 text-sm font-semibold text-green-700">
                  Completed
                </span>
              )}
            </div>
            <div className="flex gap-4 text-sm text-gray-600">
              <span>Instructor: {selectedWorkshop.instructor}</span>
              <span>Duration: {selectedWorkshop.duration} mins</span>
              <span>Level: {selectedWorkshop.level}</span>
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

          {/* Video Player */}
          {selectedWorkshop.videoUrl && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Video Tutorial</h3>
              <div className="relative rounded-lg overflow-hidden shadow-lg" style={{ aspectRatio: '16/9' }}>
                {isDirectVideoFile(selectedWorkshop.videoUrl) ? (
                  <video
                    src={selectedWorkshop.videoUrl}
                    title={selectedWorkshop.title}
                    className="w-full h-full bg-black"
                    controls
                    preload="metadata"
                  >
                    Your browser does not support the video element.
                  </video>
                ) : (
                  <iframe
                    src={selectedWorkshop.videoUrl}
                    title={selectedWorkshop.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                )}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Instructions</h3>
            <div className="text-gray-700 whitespace-pre-line">
              {selectedWorkshop.instructions}
            </div>
          </div>

          <ArtCourseContentList
            modules={selectedWorkshop.modules || []}
            studentId={studentId}
            onChapterChange={handleChapterChange}
          />

          <ArtworkTaskCards
            tasks={visibleTasks}
            courseId={selectedWorkshop.id}
            mode="workshop"
            studentId={studentId}
            onRefresh={onRefresh}
            onTaskSelect={setSelectedTask}
          />
        </>
      )}
    </div>
  );
}
