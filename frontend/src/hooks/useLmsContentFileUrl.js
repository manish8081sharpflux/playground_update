import { useEffect, useState } from 'react';
import { api } from '../api';

export default function useLmsContentFileUrl(courseSlug, item, options = {}) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const itemId = item?.id || item?._id;
  const fileUrl = item?.fileUrl || '';
  const preferSignedUrl = Boolean(options.preferSignedUrl);

  useEffect(() => {
    if (!fileUrl) {
      setUrl('');
      setLoading(false);
      setError(null);
      return undefined;
    }

    const studentId = localStorage.getItem('userId') || 'student1';
    if (/youtube\.com|youtu\.be|vimeo\.com/i.test(fileUrl)) {
      setUrl(fileUrl);
      setLoading(false);
      setError(null);
      return undefined;
    }

    if (!courseSlug || !studentId || !itemId) {
      setUrl(fileUrl);
      setLoading(false);
      setError(null);
      return undefined;
    }

    let isMounted = true;
    let blobUrl = '';
    setLoading(true);
    setError(null);

    const fileEndpoint = `/api/v2/lms/student/${studentId}/courses/${courseSlug}/content/${itemId}/file`;
    const request = preferSignedUrl
      ? api.get(`${fileEndpoint}?signed=1`)
      : api.get(fileEndpoint, { responseType: 'blob' });

    request
      .then((response) => {
        if (!isMounted) return;
        if (preferSignedUrl) {
          setUrl(response.data?.fileUrl || fileUrl);
        } else {
          blobUrl = URL.createObjectURL(response.data);
          setUrl(blobUrl);
        }
      })
      .catch((requestError) => {
        console.error('Failed to load LMS content file:', requestError);
        if (!isMounted) return;
        setError(requestError);
        setUrl(fileUrl);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [courseSlug, fileUrl, itemId, preferSignedUrl]);

  return { url, loading, error };
}
