import React from "react";
import { toast } from "react-hot-toast";

const showToast = (message, type = "success") => {
  const dismissToast = (event, toastId) => {
    event?.preventDefault();
    event?.stopPropagation();
    toast.remove(toastId);
  };

  return toast.custom(
    (t) => (
      <div
        role="status"
        style={{
          background: type === "success" ? "#4caf50" : "#f44336",
          color: "#fff",
          padding: "10px 14px",
          borderRadius: "8px",
          fontSize: "16px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          minWidth: "280px",
        }}
      >
        {/* Icon */}
        <span>{type === "success" ? "✅" : "❌"}</span>

        {/* Message */}
        <span
          style={{
            flex: 1,
          }}
        >
          {message}
        </span>

        {/* Close Button */}
        <button
          type="button"
          onMouseDown={(event) => dismissToast(event, t.id)}
          onTouchStart={(event) => dismissToast(event, t.id)}
          onClick={(event) => dismissToast(event, t.id)}
          aria-label="Close notification"
          style={{
            background: "transparent",
            border: "none",
            color: "#fff",
            fontSize: "22px",
            fontWeight: "bold",
            cursor: "pointer",
            padding: "0 4px",
            lineHeight: 1,
            pointerEvents: "auto",
            position: "relative",
            zIndex: 1,
          }}
        >
          ×
        </button>
      </div>
    ),
    {
      duration: 4000,
      position: "top-center",
    }
  );
};

export default showToast;
