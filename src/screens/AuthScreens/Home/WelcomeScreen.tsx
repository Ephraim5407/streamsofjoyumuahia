import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, ArrowRight, X } from "lucide-react";
import axios from "axios";
import AsyncStorage from "../../../utils/AsyncStorage";
import { BASE_URl } from "../../../api/users";

const PRIMARY_BLUE = "#349DC5";
const LIGHT_BLUE = "#7DC3E8";

function GradientModal({
  visible,
  onClose,
  message,
}: {
  visible: boolean;
  onClose: () => void;
  message: string;
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bg-white dark:bg-[#1A1F26] rounded-[28px] p-8 w-full max-w-sm shadow-2xl relative border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-5 right-5 w-9 h-9 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
            >
              <X size={18} className="text-gray-500 dark:text-gray-400" />
            </button>
            <div className="flex flex-col items-center pt-2">
              <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-5">
                <X size={32} className="text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Attention</h3>
              <p className="text-[15px] font-medium text-gray-600 dark:text-gray-300 text-center leading-relaxed">
                {message}
              </p>
              <button
                onClick={onClose}
                className="w-full mt-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-black font-bold rounded-2xl text-[16px] hover:opacity-90 active:scale-[0.98] transition-all"
              >
                Got it
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function WelcomeScreen() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [storedUser, setStoredUser] = useState<any | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const didNavigateRef = useRef(false);
  const checkedRecoveryRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem("user");
        if (raw) setStoredUser(JSON.parse(raw));
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (didNavigateRef.current) return;
    const checkAuthAndNavigate = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (token) {
          didNavigateRef.current = true;
          navigate("/login", { state: { noPrecheck: true }, replace: true });
          return;
        }
        const raw = await AsyncStorage.getItem("user");
        if (raw) {
          try {
            const u = JSON.parse(raw || "{}");
            setStoredUser(u);
            const registrationCompleted = u?.registrationCompleted === true;
            const approved = u?.approved === true;
            const userId = u?._id;
            if (registrationCompleted) {
              didNavigateRef.current = true;
              if (!approved) {
                navigate("/awaiting-approval", {
                  state: { userId },
                  replace: true,
                });
              } else {
                navigate("/login", { replace: true });
              }
              return;
            }
          } catch {}
        }
        if (!checkedRecoveryRef.current) {
          checkedRecoveryRef.current = true;
          const pendingEmail = await AsyncStorage.getItem("pendingEmail");
          const pendingUserId = await AsyncStorage.getItem("pendingUserId");
          if (pendingEmail) {
            const cleaned = pendingEmail.trim().toLowerCase().replace(/\s+/g, "").replace(/[.,;:]+$/, "");
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 8000);
              const resp = await axios.post(
                `${BASE_URl}/api/users/lookup-email`,
                { email: cleaned },
                { signal: controller.signal },
              );
              clearTimeout(timeoutId);
              if (resp.data?.ok && resp.data.exists) {
                const { registrationCompleted, hasPassword, approved } = resp.data;
                didNavigateRef.current = true;
                if (!registrationCompleted || !hasPassword) {
                  navigate("/verify-email", {
                    state: {
                      email: cleaned,
                      userId: resp.data.userId || pendingUserId,
                      sendOtp: true
                    },
                    replace: true,
                  });
                } else if (!approved) {
                  navigate("/awaiting-approval", {
                    state: { userId: resp.data.userId || pendingUserId },
                    replace: true,
                  });
                } else {
                  navigate("/login", { replace: true });
                }
                return;
              } else {
                await AsyncStorage.removeItem("pendingEmail");
                await AsyncStorage.removeItem("pendingUserId");
              }
            } catch {
              await AsyncStorage.removeItem("pendingEmail");
              await AsyncStorage.removeItem("pendingUserId");
            }
          }
        }
        setIsChecking(false);
      } catch {
        setIsChecking(false);
      }
    };
    checkAuthAndNavigate();
  }, [navigate]);

  const continueButtonPress = async () => {
    if (!email.trim() || !email.includes("@")) {
      setModalMessage("Please enter a valid email address.");
      setModalVisible(true);
      return;
    }
    setLoading(true);
    let timedOut = false;
    const safetyTimer = setTimeout(() => {
      timedOut = true;
      setLoading(false);
      setModalMessage("Taking longer than expected. Please try again.");
      setModalVisible(true);
    }, 17000);
    try {
      const cleaned = email.trim().toLowerCase().replace(/[\s]+/g, "").replace(/[.,;:]+$/, "");
      await AsyncStorage.setItem("pendingEmail", cleaned);
      const resp = await axios.post(`${BASE_URl}/api/users/lookup-email`, {
        email: cleaned,
      });
      if (!resp.data?.ok) {
        setModalMessage(resp.data?.message || "Lookup failed");
        setModalVisible(true);
        return;
      }
      if (!resp.data.exists) {
        navigate("/verify-email", {
          state: { email: cleaned, flow: "regular", sendOtp: true },
        });
        return;
      }
      const { approved, hasPassword, userId } = resp.data;
      const user = resp.data.user || {};
      const roles = user.roles || [];
      const isSuperAdmin = roles.some((r: any) => r.role === "SuperAdmin");
      if (isSuperAdmin || approved) {
        navigate("/login", { replace: true });
        return;
      }
      if (!hasPassword) {
        navigate("/verify-email", {
          state: { email: cleaned, userId, flow: "regular", sendOtp: true },
        });
        return;
      }
      navigate("/awaiting-approval", { state: { userId }, replace: true });
    } catch (error: any) {
      if (!timedOut) {
        const backendMessage = error?.response?.data?.message || error?.message;
        setModalMessage(backendMessage || "Unexpected error occurred.");
        setModalVisible(true);
      }
    } finally {
      clearTimeout(safetyTimer);
      if (!timedOut) setLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white dark:bg-[#0f1218]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#349DC5]" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full bg-white dark:bg-[#0f1218] flex flex-col lg:flex-row items-stretch justify-center overflow-hidden">
      <GradientModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        message={modalMessage}
      />
      
      {/* Hero / Brand Section (Hidden on Mobile, Shows on Desktop) */}
      <div className="hidden lg:flex w-1/2 2xl:w-[55%] flex-col items-center justify-center p-12 bg-gradient-to-br from-[#00204a] to-[#00102a] relative overflow-hidden shadow-2xl z-10">
        {/* Dynamic Glowing Orbs */}
        <div className="absolute top-10 left-10 w-[30vw] h-[30vw] rounded-full bg-[#349DC5] opacity-20 blur-[100px] animate-pulse" />
        <div className="absolute -bottom-20 -right-20 w-[40vw] h-[40vw] rounded-full bg-[#10b981] opacity-10 blur-[120px]" />
        
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.8, ease: "easeOut" }}
           className="relative z-10 flex flex-col items-center"
        >
          <div className="bg-white/10 p-6 rounded-3xl backdrop-blur-md border border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] mb-10">
            <img src="/icon_app.png" alt="Streams of Joy" className="w-32 h-32 object-contain drop-shadow-2xl" />
          </div>
          <h2 className="text-4xl xl:text-5xl font-black text-white text-center tracking-tight mb-4 uppercase">
            Streams of Joy
          </h2>
          <div className="w-16 h-1 bg-[#349DC5] rounded-full mb-6" />
          <p className="text-white/70 text-lg xl:text-xl text-center max-w-sm font-medium leading-relaxed tracking-wide">
            Experience global connection and limitless spiritual growth.
          </p>
        </motion.div>

        <div className="absolute bottom-10 left-0 right-0 text-center pointer-events-none text-white/30 text-xs font-black uppercase tracking-[0.3em]">
          Powered by Skyrazor Digital
        </div>
      </div>

      {/* Right Form Section */}
      <div className="w-full lg:w-1/2 2xl:w-[45%] flex flex-col items-center justify-center p-8 sm:p-12 xl:p-16 relative overflow-y-auto min-h-[100dvh]">
        <div className="w-full max-w-md flex flex-col justify-center h-full">
          {/* Logo Section (Hidden on Desktop) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex justify-center mb-8 lg:hidden"
          >
            <img
              src="/pwa-192x192.png"
              alt="Streams of Joy"
              className="w-[120px] h-[120px] object-contain rounded-[32px] shadow-xl"
            />
          </motion.div>

          {/* Heading */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-center lg:text-left mb-10"
          >
            <h1 className="text-3xl lg:text-4xl xl:text-[40px] font-black text-[#00204a] dark:text-white leading-tight tracking-tight uppercase">
              {storedUser?.firstName || storedUser?.title
                ? <>Welcome Back<span className="text-[#349DC5]">.</span><br/><span className="text-xl lg:text-2xl mt-1 block truncate text-[#349DC5]">{storedUser?.title ? storedUser.title + " " : ""}{storedUser?.firstName}</span></>
                : <>Welcome<span className="text-[#349DC5]">.</span></>}
            </h1>
            <p className="text-[15px] lg:text-[16px] text-[#64748B] dark:text-gray-400 mt-4 leading-6 font-medium">
              Access your digital sanctuary.
            </p>
          </motion.div>

          {/* Form Container */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="space-y-6 w-full"
          >
            <div>
              <div
                className={`flex items-center h-16 rounded-2xl border-[2px] px-5 transition-all duration-300 bg-white dark:bg-[#1A1F26] shadow-sm ${
                  inputFocused 
                  ? "border-[#349DC5] shadow-[0_10px_30px_-10px_rgba(52,157,197,0.3)] bg-blue-50/50 dark:bg-blue-900/10" 
                  : "border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10"
                }`}
              >
                <Mail 
                  size={20} 
                  className={`mr-4 shrink-0 transition-colors duration-300 ${inputFocused ? "text-[#349DC5]" : "text-gray-400"}`} 
                />
                <input
                  type="email"
                  className="flex-1 text-[16px] font-bold text-[#00204a] dark:text-white outline-none bg-transparent placeholder:text-gray-400 dark:placeholder:text-gray-600 placeholder:font-medium"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  onKeyDown={(e) => e.key === "Enter" && continueButtonPress()}
                  autoComplete="email"
                />
              </div>
            </div>

            <button
              onClick={continueButtonPress}
              disabled={loading}
              className="w-full h-16 rounded-2xl font-black text-xs uppercase tracking-widest text-white flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 shadow-xl shadow-[#349DC5]/20 hover:shadow-[#349DC5]/40 hover:-translate-y-0.5"
              style={{ backgroundColor: "#349DC5" }}
            >
              {loading ? (
                <div className="w-5 h-5 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Continue Securely</span>
                  <ArrowRight size={18} className="transition-transform" />
                </>
              )}
            </button>
          </motion.div>
        </div>

        <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none lg:hidden">
          <p className="text-[12px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">
            © 2026 Streams of Joy
          </p>
        </div>
      </div>
    </div>
  );
}

