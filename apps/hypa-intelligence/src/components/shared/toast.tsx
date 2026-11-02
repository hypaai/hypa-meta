import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, AlertCircle } from "@/lucide-compat";

type ToastType = "success" | "error";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

let addToastGlobal: ((message: string, type?: ToastType) => void) | null = null;

export function showToast(message: string, type: ToastType = "success") {
  addToastGlobal?.(message, type);
}

export function ToastProvider() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const addToast = useCallback(
    (message: string, type: ToastType = "success") => {
      const id = ++idRef.current;

      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    },
    [],
  );

  addToastGlobal = addToast;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="pointer-events-auto flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-3 shadow-lg"
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            {toast.type === "error" ? (
              <AlertCircle className="size-4 text-red-500 shrink-0" />
            ) : (
              <Check className="size-4 text-green-500 shrink-0" />
            )}
            <span className="text-sm">{toast.message}</span>
            <button
              className="ml-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              onClick={() =>
                setToasts((prev) => prev.filter((t) => t.id !== toast.id))
              }
            >
              <X className="size-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
