import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Timer, X, RefreshCw } from "lucide-react";
interface Props {
  isOpen: boolean;
  targetRole: string | null;
  seconds?: number;
  onCancel: () => void;
  onConfirmNow: () => void;
  onAutoExecute: () => void;
  loading?: boolean;
}
export default function RoleSwitchCountdown({
  isOpen,
  targetRole,
  seconds = 8,
  onCancel,
  onConfirmNow,
  onAutoExecute,
  loading,
}: Props) {
  const [remaining, setRemaining] = useState(seconds);
  const executedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (isOpen) {
      setRemaining(seconds);
      executedRef.current = false;
      timerRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, seconds]);
  useEffect(() => {
    if (isOpen && remaining <= 0 && !executedRef.current) {
      executedRef.current = true;
      onAutoExecute();
    }
  }, [isOpen, remaining, onAutoExecute]);
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-sm bg-surface dark:bg-dark-surface rounded-[32px] overflow-hidden shadow-2xl p-8 border border-border dark:border-dark-border"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-primary-muted dark:bg-dark-primary-muted rounded-2xl flex items-center justify-center text-primary">
                <Timer size={24} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-text-primary dark:text-dark-text-primary leading-none">
                  Switching Role
                </h3>
                <p className="text-[10px] font-bold text-text-muted uppercase mt-1">
                  Permission Update
                </p>
              </div>
            </div>
            <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-6 leading-relaxed">
              You are switching to
              <span className="font-bold text-primary uppercase ml-1">
                {targetRole?.replace(/([A-Z])/g, " $1").trim() || "—"}
              </span>
              . This will finalize automatically in
              <span className="font-bold text-text-primary dark:text-dark-text-primary ml-1">
                {remaining}s
              </span>
              .
            </p>
            {/* Progress Bar */}
            <div className="h-2 w-full bg-surface-alt dark:bg-dark-surface-alt rounded-full overflow-hidden mb-6">
              <motion.div
                initial={{ width: "0%" }}
                animate={{
                  width: `${((seconds - remaining) / seconds) * 100}%`,
                }}
                transition={{ duration: 1, ease: "linear" }}
                className="h-full bg-gradient-to-r from-primary to-primary-dark"
              />
            </div>
            <div className="flex items-center justify-between mb-8">
              <span className="text-[10px] font-bold text-text-muted uppercase">
                Executing in {remaining}s...
              </span>
              {loading && (
                <RefreshCw size={14} className="text-primary animate-spin" />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onCancel}
                disabled={loading}
                className="h-12 rounded-2xl bg-surface-alt dark:bg-dark-surface-alt text-text-primary dark:text-dark-text-primary text-xs font-bold uppercase border border-border dark:border-dark-border hover:opacity-80 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!executedRef.current) {
                    executedRef.current = true;
                    onConfirmNow();
                  }
                }}
                disabled={loading}
                className="h-12 rounded-2xl bg-primary text-white text-xs font-bold uppercase hover:opacity-90 shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  "Switch Now"
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
