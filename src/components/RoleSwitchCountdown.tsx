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
            className="w-full max-w-sm bg-white dark:bg-[#1a1c1e] rounded-[32px] overflow-hidden shadow-md p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-50 dark:bg-[#349DC5]/10 rounded-2xl flex items-center justify-center text-[#349DC5]">
                <Timer size={24} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#00204a] dark:text-white leading-none">
                  Switching Role
                </h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">
                  Permission Update
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
              You are switching to
              <span className="font-bold text-[#349DC5] uppercase">
                {targetRole?.replace(/([A-Z])/g, " $1").trim() || "—"}
              </span>
              . This will finalize automatically in
              <span className="font-bold text-[#00204a] dark:text-white">
                {remaining}s
              </span>
              .
            </p>
            {/* Progress Bar */}
            <div className="h-2 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden mb-6">
              <motion.div
                initial={{ width: "0%" }}
                animate={{
                  width: `${((seconds - remaining) / seconds) * 100}%`,
                }}
                transition={{ duration: 1, ease: "linear" }}
                className="h-full bg-gradient-to-r from-[#349DC5] to-[#00204a]"
              />
            </div>
            <div className="flex items-center justify-between mb-8">
              <span className="text-[10px] font-bold text-gray-400 uppercase">
                Executing in {remaining}s...
              </span>
              {loading && (
                <RefreshCw size={14} className="text-[#349DC5] animate-spin" />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onCancel}
                disabled={loading}
                className="h-12 rounded-2xl bg-gray-50 dark:bg-white/5 text-[#00204a] dark:text-white text-xs font-bold uppercase hover:bg-gray-100 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
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
                className="h-12 rounded-2xl bg-[#349DC5] text-white text-xs font-bold uppercase hover:bg-[#2d8ab0] shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
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
