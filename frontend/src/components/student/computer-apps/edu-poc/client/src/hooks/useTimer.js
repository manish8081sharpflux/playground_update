import { useEffect, useRef } from 'react';
import api from '../api/axios';

/**
 * Starts a backend session when a lesson mounts.
 * Ends it automatically when the component unmounts (navigation away, tab close).
 */
const useTimer = (courseId, lessonId) => {
  const sessionIdRef = useRef(null);

  useEffect(() => {
    if (!courseId || !lessonId) return;

    let mounted = true;

    // Start session
    api.post('/sessions/start', { courseId, lessonId })
      .then(({ data }) => { if (mounted) sessionIdRef.current = data.sessionId; })
      .catch(console.error);

    // End session on cleanup (navigate away, unmount, tab close)
    const endSession = () => {
      if (sessionIdRef.current) {
        // Use sendBeacon for reliability on page unload
        const token  = localStorage.getItem('token');
        const url    = `/api/sessions/${sessionIdRef.current}/end`;
        const body   = JSON.stringify({});
        const blob   = new Blob([body], { type: 'application/json' });
        if (navigator.sendBeacon) {
          // sendBeacon doesn't support custom headers, fall back to fetch keepalive
          fetch(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            keepalive: true,
            body
          }).catch(() => {});
        }
        sessionIdRef.current = null;
      }
    };

    window.addEventListener('beforeunload', endSession);

    return () => {
      mounted = false;
      endSession();
      window.removeEventListener('beforeunload', endSession);
    };
  }, [courseId, lessonId]);
};

export default useTimer;
