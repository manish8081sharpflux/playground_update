import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download,
  ExternalLink,
  FileText,
  Headphones,
  HelpCircle,
  Image as ImageIcon,
  Link as LinkIcon,
  PlayCircle,
  Type,
  ClipboardList,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../api';

const TYPE_CONFIG = {
  video: { label: 'Video', icon: PlayCircle, color: 'text-purple-600 bg-purple-50 border-purple-100' },
  pdf: { label: 'PDF', icon: FileText, color: 'text-red-600 bg-red-50 border-red-100' },
  audio: { label: 'Audio', icon: Headphones, color: 'text-blue-600 bg-blue-50 border-blue-100' },
  image: { label: 'Image', icon: ImageIcon, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
  text: { label: 'Text', icon: Type, color: 'text-gray-700 bg-gray-50 border-gray-100' },
  link: { label: 'Link', icon: LinkIcon, color: 'text-cyan-700 bg-cyan-50 border-cyan-100' },
  quiz: { label: 'Quiz', icon: HelpCircle, color: 'text-amber-700 bg-amber-50 border-amber-100' },
  task: { label: 'Artwork Task', icon: ClipboardList, color: 'text-pink-700 bg-pink-50 border-pink-100' },
};

const getItemUrl = (item) => item.fileUrl || item.externalUrl;

const getQuizId = (item) => (
  item.quizRef?._id ||
  item.quizRef ||
  item.metadata?.quizId?._id ||
  item.metadata?.quizId ||
  item.quizData?._id ||
  item.id
);

const isFileContentType = (type) => ['pdf', 'image', 'audio', 'video'].includes(type);

async function openContentFile(item, studentId, download = false) {
  const url = getItemUrl(item);
  const canUseBackendFile = studentId && item.id && isFileContentType(item.type);

  if (!canUseBackendFile) {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    return;
  }

  try {
    const response = await api.get(
      `/api/v2/lms/student/${studentId}/courses/art/content/${item.id}/file`,
      { responseType: 'blob' }
    );
    const blobUrl = URL.createObjectURL(response.data);

    if (download) {
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = item.title || 'content-file';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
    }

    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  } catch (error) {
    toast.error('Unable to load this file');
    console.error('Failed to load Art course content file:', error);
  }
}

async function markArtContentComplete(item, studentId) {
  try {
    if (!studentId || !item?.id) return;

    await api.post(`/api/v2/lms/student/${studentId}/courses/art/mark-complete`, {
      itemId: item.id,
      itemType: item.type,
      courseId: item.courseId
    });
  } catch (error) {
    console.error('Failed to mark Art content complete:', error);
  }
}

function ContentActions({ item, studentId, onView }) {
  const url = getItemUrl(item);
  if (!url) {
    return <span className="text-xs font-semibold text-gray-400">No file attached</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => {
          onView?.();
          openContentFile(item, studentId, false);
        }}
        className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
      >
        <ExternalLink size={14} />
        View
      </button>
      <button
        type="button"
        onClick={() => openContentFile(item, studentId, true)}
        className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
      >
        <Download size={14} />
        Download
      </button>
    </div>
  );
}

function ImagePreview({ item, studentId }) {
  const [hasError, setHasError] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const url = getItemUrl(item);
  const canUseBackendFile = studentId && item.id;
  const displayUrl = imageUrl || (!canUseBackendFile ? url : '');

  useEffect(() => {
    setHasError(false);

    if (!url) {
      setImageUrl('');
      return undefined;
    }

    if (!studentId || !item.id) {
      setImageUrl(url);
      return undefined;
    }

    let isMounted = true;
    let blobUrl = '';
    setLoading(true);

    api.get(
      `/api/v2/lms/student/${studentId}/courses/art/content/${item.id}/file`,
      { responseType: 'blob' }
    )
      .then((response) => {
        if (!isMounted) return;
        blobUrl = URL.createObjectURL(response.data);
        setImageUrl(blobUrl);
      })
      .catch((error) => {
        console.error('Failed to load Art image preview:', error);
        if (isMounted) {
          setImageUrl(url);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [item.id, studentId, url]);

  if (!url || hasError) {
    return (
      <div className="mt-3 rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
        Image preview unavailable.
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => displayUrl && window.open(displayUrl, '_blank', 'noopener,noreferrer')}
      className="mt-3 block w-full overflow-hidden rounded-md border border-gray-200 bg-gray-50 text-left"
    >
      {loading && (
        <p className="p-4 text-xs font-semibold text-gray-500">Loading image...</p>
      )}
      {displayUrl && (
        <img
          src={displayUrl}
          alt={item.title}
          onError={() => setHasError(true)}
          className="max-h-80 w-full object-contain"
        />
      )}
    </button>
  );
}

function VideoPreview({ item, studentId }) {
  const url = getItemUrl(item);
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!url) {
      setVideoUrl('');
      return undefined;
    }

    if (!studentId || !item.id) {
      setVideoUrl(url);
      return undefined;
    }

    let isMounted = true;
    setLoading(true);

    api.get(
      `/api/v2/lms/student/${studentId}/courses/art/content/${item.id}/file?signed=1`
    )
      .then((response) => {
        if (!isMounted) return;
        setVideoUrl(response.data?.fileUrl || url);
      })
      .catch((error) => {
        console.error('Failed to load Art video preview:', error);
        if (isMounted) setVideoUrl(url);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [item.id, studentId, url]);

  if (!url) {
    return (
      <div className="mt-3 rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
        Video file unavailable.
      </div>
    );
  }

  if (!/\.(mp4|webm|ogg|mov)(?:$|[?#])/i.test(url)) {
    return null;
  }

  return (
    <div className="mt-3 overflow-hidden rounded-md border border-gray-200 bg-black">
      {loading && (
        <p className="p-4 text-xs font-semibold text-white">Loading video...</p>
      )}
      <video
        src={videoUrl || url}
        controls
        preload="metadata"
        className="mx-auto block aspect-video max-h-[420px] w-full object-contain"
      >
        Your browser does not support the video element.
      </video>
    </div>
  );
}

function AudioPreview({ item, studentId }) {
  const url = getItemUrl(item);
  const [audioUrl, setAudioUrl] = useState(url || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!url) {
      setAudioUrl('');
      return undefined;
    }

    if (!studentId || !item.id) {
      setAudioUrl(url);
      return undefined;
    }

    let isMounted = true;
    let blobUrl = '';
    setLoading(true);

    api.get(
      `/api/v2/lms/student/${studentId}/courses/art/content/${item.id}/file`,
      { responseType: 'blob' }
    )
      .then((response) => {
        if (!isMounted) return;
        blobUrl = URL.createObjectURL(response.data);
        setAudioUrl(blobUrl);
      })
      .catch((error) => {
        console.error('Failed to load Art audio preview:', error);
        if (isMounted) setAudioUrl(url);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [item.id, studentId, url]);

  if (!url) {
    return (
      <div className="mt-3 rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
        Audio file unavailable.
      </div>
    );
  }

  return (
    <div className="mt-3">
      {loading && (
        <p className="mb-2 text-xs font-semibold text-gray-500">Loading audio...</p>
      )}
      <audio controls src={audioUrl} className="w-full">
        Your browser does not support the audio element.
      </audio>
    </div>
  );
}

function ContentItemCard({ item, studentId }) {
  const navigate = useNavigate();
  const typeConfig = TYPE_CONFIG[item.type] || {
    label: item.type || 'Unknown',
    icon: HelpCircle,
    color: 'text-gray-700 bg-gray-50 border-gray-100',
  };
  const Icon = typeConfig.icon;

  useEffect(() => {
    if (!TYPE_CONFIG[item.type]) {
      console.warn('Unknown Art course content type:', item.type, item);
    }
  }, [item]);

  useEffect(() => {
    if (item.type === 'text') {
      markArtContentComplete(item, studentId);
    }
  }, [item, studentId]);

  const handleStartQuiz = () => {
    const quizId = getQuizId(item);
    if (!quizId) {
      toast.error('Quiz is not linked yet');
      return;
    }

    toast.success('Starting Quiz...');
    navigate(`/student/art/quiz/${quizId}`, {
      state: {
        courseId: item.courseId,
        contentItemId: item.id,
      },
    });
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${typeConfig.color}`}>
              <Icon size={14} />
              {typeConfig.label}
            </span>
            {item.completed && (
              <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                Completed
              </span>
            )}
          </div>
          <h4 className="break-words text-lg font-bold text-gray-900">{item.title}</h4>
          {item.description && (
            <p className="mt-1 whitespace-pre-line text-sm text-gray-600">{item.description}</p>
          )}
        </div>
        {item.type === 'pdf' && <ContentActions item={item} studentId={studentId} />}
        {item.type === 'link' && (
          <ContentActions
            item={{ ...item, fileUrl: item.externalUrl }}
            studentId={studentId}
            onView={() => markArtContentComplete(item, studentId)}
          />
        )}
      </div>

      {item.type === 'video' && <VideoPreview item={item} studentId={studentId} />}
      {item.type === 'image' && <ImagePreview item={item} studentId={studentId} />}
      {item.type === 'audio' && <AudioPreview item={item} studentId={studentId} />}
      {item.type === 'pdf' && !getItemUrl(item) && (
        <div className="mt-3 rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
          PDF file unavailable.
        </div>
      )}
      {item.type === 'text' && (
        <div className="mt-3 whitespace-pre-line rounded-md bg-gray-50 p-4 text-sm leading-6 text-gray-700">
          {item.textContent || item.description || 'No text content provided.'}
        </div>
      )}
      {item.type === 'task' && (
        <div className="mt-3 rounded-md border border-pink-100 bg-pink-50 p-3 text-sm text-pink-900">
          Submit this artwork task using the Tasks section below.
        </div>
      )}
      {item.type === 'quiz' && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-100 bg-amber-50 p-3 text-sm text-amber-900">
          <span>Quiz content is available in this course item.</span>
          <button
            type="button"
            onClick={handleStartQuiz}
            className="rounded-md bg-amber-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-amber-700"
          >
            Start Quiz
          </button>
        </div>
      )}
      {!TYPE_CONFIG[item.type] && (
        <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
          Content type: {item.type || 'Unknown'}
        </div>
      )}
    </div>
  );
}

export default function ArtCourseContentList({ modules = [], studentId, onChapterChange }) {
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState('');
  const hasContent = modules.some(module =>
    (module.chapters || []).some(chapter => (chapter.contentItems || []).length > 0)
  );
  const selectedModule =
    modules.find(module => String(module.id) === String(selectedModuleId)) ||
    modules[0] ||
    null;
  const chapters = selectedModule?.chapters || [];
  const selectedChapter =
    chapters.find(chapter => String(chapter.id) === String(selectedChapterId)) ||
    chapters[0] ||
    null;

  useEffect(() => {
    const firstModule = modules[0];
    if (!firstModule) {
      setSelectedModuleId('');
      setSelectedChapterId('');
      return;
    }

    setSelectedModuleId(current =>
      modules.some(module => String(module.id) === String(current))
        ? current
        : String(firstModule.id)
    );
  }, [modules]);

  useEffect(() => {
    const firstChapter = chapters[0];
    if (!firstChapter) {
      setSelectedChapterId('');
      return;
    }

    setSelectedChapterId(current =>
      chapters.some(chapter => String(chapter.id) === String(current))
        ? current
        : String(firstChapter.id)
    );
  }, [chapters, selectedModuleId]);

  useEffect(() => {
    if (!onChapterChange) return;

    onChapterChange({
      moduleId: selectedModule?.id || null,
      moduleTitle: selectedModule?.title || '',
      chapterId: selectedChapter?.id || null,
      chapterTitle: selectedChapter?.title || '',
    });
  }, [
    onChapterChange,
    selectedModule?.id,
    selectedModule?.title,
    selectedChapter?.id,
    selectedChapter?.title,
  ]);

  if (!hasContent) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-5 text-center text-sm text-gray-500">
        No learning content has been added yet.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xl font-bold text-gray-900">Course Content</h3>
        <p className="mt-1 text-sm text-gray-500">All materials added by the admin are listed below.</p>
      </div>
      <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-gray-700">Select Module</span>
            <select
              value={selectedModuleId}
              onChange={(event) => setSelectedModuleId(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 text-gray-800 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
              style={{
                height: '48px',
                lineHeight: '48px',
                paddingTop: 0,
                paddingBottom: 0,
                appearance: 'auto',
                boxSizing: 'border-box',
              }}
            >
              {modules.map(module => (
                <option key={module.id} value={String(module.id)}>
                  {module.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-gray-700">Select Chapter</span>
            <select
              value={selectedChapterId}
              onChange={(event) => setSelectedChapterId(event.target.value)}
              disabled={chapters.length === 0}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 text-gray-800 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100 disabled:bg-gray-100 disabled:text-gray-400"
              style={{
                height: '48px',
                lineHeight: '48px',
                paddingTop: 0,
                paddingBottom: 0,
                appearance: 'auto',
                boxSizing: 'border-box',
              }}
            >
              {chapters.map(chapter => (
                <option key={chapter.id} value={String(chapter.id)}>
                  {chapter.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        {selectedModule && (
          <div className="mt-5 rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-4">
              <h4 className="text-lg font-bold text-gray-900">{selectedModule.title}</h4>
              {selectedModule.description && (
                <p className="mt-1 text-sm text-gray-600">{selectedModule.description}</p>
              )}
            </div>

            {selectedChapter ? (
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="mb-3">
                  <h5 className="font-bold text-gray-900">{selectedChapter.title}</h5>
                  {selectedChapter.description && (
                    <p className="mt-1 text-sm text-gray-600">{selectedChapter.description}</p>
                  )}
                </div>
                <div className="space-y-3">
                  {(selectedChapter.contentItems || []).map(item => (
                    <ContentItemCard key={item.id} item={item} studentId={studentId} />
                  ))}
                  {(selectedChapter.contentItems || []).length === 0 && (
                    <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
                      No content items in this chapter.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
                No chapters available in this module.
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
