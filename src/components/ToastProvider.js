"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Info, WifiOff, X, XCircle } from "lucide-react";
import { subscribeToOfflineQueue } from "../lib/offlineQueue";

const ToastContext = createContext(null);

function variantStyles(variant) {
  switch (variant) {
    case "error":
      return {
        icon: XCircle,
        container: "border-red-200 bg-red-50 text-red-700",
        accent: "text-red-500",
      };
    case "warning":
      return {
        icon: WifiOff,
        container: "border-amber-200 bg-amber-50 text-amber-700",
        accent: "text-amber-500",
      };
    case "info":
      return {
        icon: Info,
        container: "border-slate-200 bg-slate-50 text-slate-700",
        accent: "text-slate-500",
      };
    default:
      return {
        icon: CheckCircle2,
        container: "border-emerald-200 bg-emerald-50 text-emerald-700",
        accent: "text-emerald-500",
      };
  }
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timeouts = useRef(new Map());

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const scheduleRemoval = useCallback((id, duration = 4200) => {
    if (timeouts.current.has(id)) {
      clearTimeout(timeouts.current.get(id));
    }
    const timeout = setTimeout(() => {
      removeToast(id);
      timeouts.current.delete(id);
    }, duration);
    timeouts.current.set(id, timeout);
  }, [removeToast]);

  const addToast = useCallback((toast) => {
    const id = crypto.randomUUID();
    const payload = { id, duration: 4200, variant: "success", ...toast };
    setToasts((prev) => [...prev, payload]);
    scheduleRemoval(id, payload.duration);
    return id;
  }, [scheduleRemoval]);

  useEffect(() => {
    const timers = timeouts.current;
    return () => {
      timers.forEach((timeout) => clearTimeout(timeout));
      timers.clear();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToOfflineQueue((event) => {
      if (event.type === "queued") {
        addToast({
          title: "Action queued",
          description: `${event.description} will sync once you are back online`,
          variant: "warning",
          duration: 5000,
        });
      }
      if (event.type === "synced") {
        addToast({
          title: "Action synced",
          description: `${event.description} successfully completed`,
          variant: "success",
        });
      }
      if (event.type === "sync-error") {
        addToast({
          title: "Sync failed",
          description: event.description,
          variant: "error",
          duration: 6000,
        });
      }
    });
    return unsubscribe;
  }, [addToast]);

  const value = useMemo(() => ({ addToast, removeToast }), [addToast, removeToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
  <div className="pointer-events-none fixed bottom-6 right-6 z-2000 flex w-full max-w-sm flex-col gap-3 sm:bottom-8 sm:right-8">
        {toasts.map((toast) => {
          const { icon: Icon, container, accent } = variantStyles(toast.variant);
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto overflow-hidden rounded-2xl border p-4 shadow-xl ring-1 ring-black/5 backdrop-blur ${container}`}
            >
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 rounded-full ${accent}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  {toast.title && (
                    <p className="text-sm font-semibold leading-5">{toast.title}</p>
                  )}
                  {toast.description && (
                    <p className="mt-1 text-sm leading-5 text-inherit/80">
                      {toast.description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  className="rounded-full p-1 text-inherit/60 transition hover:bg-white/40 hover:text-inherit"
                  aria-label="Dismiss notification"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
