"use client";

import { useEffect } from "react";

import { useUIStore } from "@/stores/uiStore";

/**
 * Lightweight toast viewport for async operation feedback.
 */
export function ToastViewport() {
  const toasts = useUIStore((state) => state.toasts);
  const dismissToast = useUIStore((state) => state.dismissToast);

  useEffect(() => {
    if (toasts.length === 0) {
      return;
    }

    const timers = toasts.map((toast) =>
      window.setTimeout(() => dismissToast(toast.id), 3000),
    );
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [dismissToast, toasts]);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={[
            "rounded border px-3 py-2 text-sm shadow-lg",
            toast.tone === "error"
              ? "border-red-500 bg-red-950 text-red-100"
              : toast.tone === "success"
                ? "border-lime-500 bg-lime-950 text-lime-100"
                : "border-zinc-600 bg-zinc-900 text-zinc-100",
          ].join(" ")}
        >
          <p className="font-semibold">{toast.title}</p>
          {toast.detail ? <p className="text-xs opacity-90">{toast.detail}</p> : null}
        </div>
      ))}
    </div>
  );
}
