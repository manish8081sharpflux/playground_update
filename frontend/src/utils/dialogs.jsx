import React, { useState } from "react";
import toast from "react-hot-toast";

const PopupCard = ({ title, message, children }) => (
  <div className="w-[min(92vw,28rem)] rounded-2xl border border-purple-200 bg-white p-6 shadow-2xl">
    <h3 className="mb-2 text-xl font-bold text-slate-900">{title}</h3>
    <p className="whitespace-pre-line text-sm leading-6 text-slate-600">
      {String(message)}
    </p>
    <div className="mt-6 flex justify-end gap-3">{children}</div>
  </div>
);

export const alertDialog = (message, type) => {
  const notify = type && toast[type] ? toast[type] : toast;
  return notify(String(message), { duration: 4500 });
};

export const confirmDialog = (message, options = {}) =>
  new Promise((resolve) => {
    let settled = false;
    const finish = (answer, toastId) => {
      if (settled) return;
      settled = true;
      toast.dismiss(toastId);
      resolve(answer);
    };

    toast.custom(
      (currentToast) => (
        <PopupCard
          title={options.title || "Please confirm"}
          message={message}
        >
          <button
            type="button"
            onClick={() => finish(false, currentToast.id)}
            className="rounded-xl border border-slate-300 px-5 py-2.5 font-semibold text-slate-700 hover:bg-slate-50"
          >
            {options.cancelText || "Cancel"}
          </button>
          <button
            type="button"
            onClick={() => finish(true, currentToast.id)}
            className={`rounded-xl px-5 py-2.5 font-semibold text-white ${
              options.danger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-purple-600 hover:bg-purple-700"
            }`}
          >
            {options.confirmText || "Confirm"}
          </button>
        </PopupCard>
      ),
      { duration: Infinity },
    );
  });

const PromptPopup = ({ message, options, toastId, resolveOnce }) => {
  const [value, setValue] = useState(options.defaultValue || "");

  return (
    <PopupCard title={options.title || "Enter details"} message={message}>
      <div className="w-full">
        <input
          autoFocus
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") resolveOnce(value, toastId);
            if (event.key === "Escape") resolveOnce(null, toastId);
          }}
          placeholder={options.placeholder || ""}
          className="mb-4 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
        />
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => resolveOnce(null, toastId)}
            className="rounded-xl border border-slate-300 px-5 py-2.5 font-semibold text-slate-700 hover:bg-slate-50"
          >
            {options.cancelText || "Cancel"}
          </button>
          <button
            type="button"
            onClick={() => resolveOnce(value, toastId)}
            className="rounded-xl bg-purple-600 px-5 py-2.5 font-semibold text-white hover:bg-purple-700"
          >
            {options.confirmText || "Submit"}
          </button>
        </div>
      </div>
    </PopupCard>
  );
};

export const promptDialog = (message, options = {}) =>
  new Promise((resolve) => {
    let settled = false;
    const resolveOnce = (value, toastId) => {
      if (settled) return;
      settled = true;
      toast.dismiss(toastId);
      resolve(value);
    };

    toast.custom(
      (currentToast) => (
        <PromptPopup
          message={message}
          options={options}
          toastId={currentToast.id}
          resolveOnce={resolveOnce}
        />
      ),
      { duration: Infinity },
    );
  });

export const installAlertReplacement = () => {
  if (typeof window === "undefined") return () => {};
  const originalAlert = window.alert;
  window.alert = (message) => alertDialog(message);
  return () => {
    window.alert = originalAlert;
  };
};
