import React from "react";
import { Loader2 } from "lucide-react";

/**
 * One visual loading state for pages, sections, and compact actions.
 * Fetching and state management remain with the calling component.
 */
const LoadingState = ({
  message = "Loading...",
  fullScreen = false,
  compact = false,
  className = "",
}) => {
  if (compact) {
    return (
      <span
        className={`inline-flex items-center justify-center gap-2 ${className}`}
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        {message && <span>{message}</span>}
      </span>
    );
  }

  return (
    <div
      className={`flex w-full items-center justify-center px-4 ${
        fullScreen ? "min-h-screen" : "min-h-[18rem]"
      } ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <Loader2
          className="h-10 w-10 animate-spin text-purple-600"
          aria-hidden="true"
        />
        {message && <p className="text-base font-medium text-slate-600">{message}</p>}
      </div>
    </div>
  );
};

export default LoadingState;
