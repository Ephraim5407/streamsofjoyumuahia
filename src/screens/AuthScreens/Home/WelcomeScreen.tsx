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
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bg-white dark:bg-[#1e1e1e] rounded-3xl p-6 w-full max-w-sm shadow-md relative"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: `linear-gradient(135deg, #fff 0%, #e8f5fb 100%)`,
            }}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/10 flex items-center justify-center"
            >
              <X size={14} />
            </button>
            <p className="text-sm font-medium text-[#333] text-center mt-2 leading-relaxed">
              {message}
            </p>
            <button
              onClick={onClose}
              className="w-full mt-5 py-3 bg-[#349DC5] text-white font-bold rounded-xl text-sm"
            >
              OK
            </button>
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

  /* Load stored user for welcome back message */
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem("user");
        if (raw) setStoredUser(JSON.parse(raw));
      } catch {}
    })();
  }, []);

  /* Auto-routing: check token / stored user state / pending email */
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
            const cleaned = pendingEmail
              .trim()
              .toLowerCase()
              .replace(/\s+/g, "")
              .replace(/[.,;:]+$/, "");
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
                const { registrationCompleted, hasPassword, approved } =
                  resp.data;
                didNavigateRef.current = true;
                if (!registrationCompleted || !hasPassword) {
                  navigate("/verify-email", {
                    state: {
                      email: cleaned,
                      userId: resp.data.userId || pendingUserId,
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
      const cleaned = email
        .trim()
        .toLowerCase()
        .replace(/[\s]+/g, "")
        .replace(/[.,;:]+$/, "");
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
    <div className="min-h-screen w-full bg-white dark:bg-[#0f1218] flex flex-col items-center justify-center overflow-y-auto">
      <GradientModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        message={modalMessage}
      />
      <div className="w-full max-w-sm px-8 py-12 flex flex-col items-center">
        {/* Animated logo */}
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="w-[160px] h-[138px] flex items-center justify-center mb-10"
        >
          <img
            src="/icon_app.png"
            alt="Streams of Joy"
            className="w-full h-full object-contain drop-shadow"
          />
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.7 }}
          className="text-center mb-10"
        >
          <h1 className="text-[32px] font-bold text-[#349DC5] text-center leading-tight">
            {storedUser?.firstName
              ? `Welcome back, ${storedUser?.title ? storedUser.title + " " : ""}${storedUser.firstName}!`
              : "Welcome!"}
          </h1>
          <p className="text-base text-[#64748B] dark:text-gray-400 text-center mt-3 leading-relaxed">
            Sign in to your account to continue your spiritual journey.
          </p>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.7 }}
          className="w-full"
        >
          {/* Email input */}
          <div className="mb-6">
            <div
              className="flex items-center h-[60px] rounded-2xl border-[1.5px] px-4 transition-all duration-200"
              style={{
                borderColor: inputFocused ? PRIMARY_BLUE : "#E0E0E0",
                boxShadow: inputFocused
                  ? `0 4px 14px rgba(52,157,197,0.15)`
                  : "none",
                backgroundColor: "#FFF",
              }}
            >
              <Mail size={20} color={PRIMARY_BLUE} className="mr-3 shrink-0" />
              <input
                type="email"
                className="flex-1 text-base font-medium text-[#1E293B] outline-none bg-transparent placeholder:text-[#999]"
                placeholder="Enter Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                onKeyDown={(e) => e.key === "Enter" && continueButtonPress()}
                autoComplete="email"
              />
            </div>
          </div>

          {/* Continue Button */}
          <motion.button
            onClick={continueButtonPress}
            disabled={loading}
            whileTap={{ scale: 0.97 }}
            whileHover={{ scale: 1.02 }}
            className="w-full h-[60px] rounded-2xl flex items-center justify-center font-bold text-lg text-white disabled:opacity-75 transition-all py-4"
            style={{
              background: `linear-gradient(90deg, ${PRIMARY_BLUE} 0%, ${LIGHT_BLUE} 100%)`,
              boxShadow: "0 8px 20px rgba(52,157,197,0.30)",
            }}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="flex items-center gap-2">
                Continue <ArrowRight size={18} />
              </span>
            )}
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
