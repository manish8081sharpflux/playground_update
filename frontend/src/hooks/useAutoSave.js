import { useEffect, useRef, useState } from 'react';

/**
 * useAutoSave - Custom hook for auto-saving with debounce and retry logic
 *
 * @param {Function} saveFn - Async function to call for saving
 * @param {any} data - Data to save (will trigger save when changed)
 * @param {Object} options - Configuration options
 * @param {number} options.delay - Debounce delay in milliseconds (default: 1000)
 * @param {number} options.maxRetries - Maximum retry attempts (default: 3)
 * @param {boolean} options.enabled - Whether auto-save is enabled (default: true)
 *
 * @returns {Object} - { status: 'idle' | 'saving' | 'saved' | 'error', error: Error | null }
 */
export function useAutoSave(saveFn, data, options = {}) {
  const {
    delay = 1000,
    maxRetries = 3,
    enabled = true
  } = options;

  const [status, setStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const timeoutRef = useRef(null);
  const dataRef = useRef(data);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip auto-save on first render (initial data load)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      dataRef.current = data;
      return;
    }

    // Skip if auto-save is disabled
    if (!enabled) {
      return;
    }

    // Skip if data hasn't actually changed
    if (JSON.stringify(dataRef.current) === JSON.stringify(data)) {
      return;
    }

    // Update data reference
    dataRef.current = data;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set status to indicate pending save
    setStatus('idle');

    // Debounce the save operation
    timeoutRef.current = setTimeout(async () => {
      await performSave();
    }, delay);

    // Cleanup timeout on unmount or data change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, delay, enabled]);

  const performSave = async (attemptNumber = 0) => {
    try {
      setStatus('saving');
      setError(null);

      await saveFn(dataRef.current);

      setStatus('saved');
      setRetryCount(0);

      // Reset to idle after 2 seconds
      setTimeout(() => {
        setStatus('idle');
      }, 2000);

    } catch (err) {
      console.error(`Auto-save failed (attempt ${attemptNumber + 1}/${maxRetries + 1}):`, err);

      if (attemptNumber < maxRetries) {
        // Retry with exponential backoff
        const backoffDelay = Math.min(1000 * Math.pow(2, attemptNumber), 5000);
        setRetryCount(attemptNumber + 1);

        setTimeout(() => {
          performSave(attemptNumber + 1);
        }, backoffDelay);
      } else {
        // Max retries reached
        setStatus('error');
        setError(err);
        setRetryCount(0);
      }
    }
  };

  const retrySave = () => {
    if (status === 'error') {
      performSave(0);
    }
  };

  return {
    status,
    error,
    retryCount,
    retrySave
  };
}
