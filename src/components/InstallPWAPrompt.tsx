import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Share, PlusSquare } from "lucide-react";

export default function InstallPWAPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone;
    if (isStandalone) return;

    // Check if user previously dismissed
    const dismissed = localStorage.getItem("pwa-prompt-dismissed");
    if (dismissed === "true") return;

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    if (isIosDevice) {
      // iOS doesn't support beforeinstallprompt, so we just show the prompt after a delay
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    const checkPrompt = () => {
      if ((window as any).deferredPrompt) {
        setDeferredPrompt((window as any).deferredPrompt);
        setShowPrompt(true);
      }
    };
    checkPrompt();

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("deferredPromptReady", checkPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("deferredPromptReady", checkPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem("pwa-prompt-dismissed", "true");
    setShowPrompt(false);
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-0 mb-4 sm:mb-0">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: 200, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 200, opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-sm bg-white dark:bg-[#1e1e1e] rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-white/5 mx-auto"
          >
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-2 bg-gray-50 dark:bg-white/5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center text-center pt-2">
              <div className="w-20 h-20 rounded-[1.25rem] bg-[#f0f9ff] dark:bg-[#349DC5]/10 p-[2px] mb-4 flex items-center justify-center border border-[#349DC5]/20 shadow-sm">
                <img src="/pwa-192x192.png" alt="App Logo" className="w-16 h-16 rounded-2xl object-contain drop-shadow-sm" />
              </div>

              <h3 className="text-[1.2rem] font-black text-[#00204a] dark:text-white uppercase tracking-tight mb-2">
                Install Web App
              </h3>
              <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                Add Streams of Joy to your home screen for a faster, full-screen native experience.
              </p>

              {isIOS ? (
                <div className="w-full bg-gray-50 dark:bg-[#252525] rounded-2xl p-5 text-left border border-gray-100 dark:border-white/5 block">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#349DC5]"></span> How to install on iOS
                  </p>
                  <ol className="space-y-4">
                    <li className="flex items-center text-[13px] font-semibold text-[#00204a] dark:text-gray-200">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#349DC5]/10 text-[#349DC5] font-black mr-3 text-xs shrink-0">1</span>
                      Tap the <Share size={16} className="mx-1.5 text-[#349DC5]" /> Share button below
                    </li>
                    <li className="flex items-center text-[13px] font-semibold text-[#00204a] dark:text-gray-200">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#349DC5]/10 text-[#349DC5] font-black mr-3 text-xs shrink-0">2</span>
                      Scroll and tap <PlusSquare size={16} className="mx-1.5 text-[#349DC5]" /> "Add to Home Screen"
                    </li>
                  </ol>
                </div>
              ) : (
                <button
                  onClick={handleInstall}
                  className="w-full bg-[#349DC5] hover:bg-[#2b83a3] text-white py-4 rounded-2xl text-[13px] font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#349DC5]/20 active:scale-[0.98]"
                >
                  <Download size={18} />
                  Install App Now
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
