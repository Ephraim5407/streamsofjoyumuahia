import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { ArrowLeft, ArrowRight, X as Delete } from "lucide-react";
import AsyncStorage from "../../../utils/AsyncStorage";
import { BASE_URl } from "../../../api/users";

const OTP_LENGTH = 6;
const KEYPAD_LAYOUT: string[][] = [
  ["1", "2", "3", "-"],
  ["4", "5", "6", "space"],
  ["7", "8", "9", "backspace"],
  [",", "0", ".", "submit"],
];

export default function MailOtpScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = (location.state as any) || {};

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [email, setEmail] = useState<string>(
    params?.email ? String(params.email) : "",
  );
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [info, setInfo] = useState("");
  const [infoType, setInfoType] = useState<"success" | "error" | "info">(
    "info",
  );
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSentRef = useRef(false);
  const shortCircuitedRef = useRef(false);
  const checkingRef = useRef(false);

  const showInfo = (
    msg: string,
    type: "success" | "error" | "info" = "info",
  ) => {
    setInfo(msg);
    setInfoType(type);
  };

  const startCooldown = (seconds: number) => {
    if (seconds <= 0) return;
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    setCooldown(seconds);
    cooldownTimerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownTimerRef.current)
            clearInterval(cooldownTimerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, []);

  /* Restore email from storage if not passed */
  useEffect(() => {
    if (!email) {
      (async () => {
        const stored = await AsyncStorage.getItem("pendingEmail");
        if (stored) setEmail(stored);
      })();
    }
  }, [email]);

  /* Early fast-path */
  useEffect(() => {
    (async () => {
      if (shortCircuitedRef.current) return;
      const pre = params?.prefills || null;
      if (pre && pre.isVerified === true && pre.registrationCompleted !== false) {
        shortCircuitedRef.current = true;
        if (pre.approved === true)
          navigate("/login", { state: { noPrecheck: true }, replace: true });
        else
          navigate("/awaiting-approval", {
            state: { userId: params?.userId },
            replace: true,
          });
        return;
      }
      try {
        const raw = await AsyncStorage.getItem("user");
        if (raw) {
          const su = JSON.parse(raw);
          if (su?.isVerified === true && su?.registrationCompleted !== false) {
            shortCircuitedRef.current = true;
            if (su?.approved)
              navigate("/login", { state: { noPrecheck: true }, replace: true });
            else
              navigate("/awaiting-approval", {
                state: { userId: su?._id },
                replace: true,
              });
            return;
          }
        }
      } catch {}

      if (!email) return;
      checkingRef.current = true;
      try {
        const cleaned = email.trim();
        const resp = await axios.post(`${BASE_URl}/api/users/lookup-email`, {
          email: cleaned,
        });
        if (resp.data?.ok && resp.data.exists) {
          const { approved, registrationCompleted, hasPassword, userId } =
            resp.data;
          if (registrationCompleted && hasPassword) {
            try {
              await AsyncStorage.setItem("pendingEmail", cleaned);
            } catch {}
            if (userId) {
              try {
                await AsyncStorage.setItem("pendingUserId", String(userId));
              } catch {}
            }
            shortCircuitedRef.current = true;
            if (approved)
              navigate("/login", { state: { noPrecheck: true }, replace: true });
            else
              navigate("/awaiting-approval", {
                state: { userId },
                replace: true,
              });
            return;
          }
        }
      } catch {} finally {
        checkingRef.current = false;
      }
    })();
  }, [email, navigate]);

  /* Auto-send OTP */
  useEffect(() => {
    const shouldAutoSend = params?.sendOtp === true;
    if (
      shouldAutoSend &&
      email &&
      !sent &&
      cooldown === 0 &&
      !loading &&
      !autoSentRef.current &&
      !shortCircuitedRef.current &&
      !checkingRef.current
    ) {
      autoSentRef.current = true;
      sendMailOtp();
    }
  }, [email, sent, cooldown, params?.sendOtp]);

  const sendMailOtp = async () => {
    if (!email) {
      showInfo("Enter your email to receive a code.", "error");
      return;
    }
    if (cooldown > 0) return;
    setLoading(true);
    showInfo("");
    try {
      const cleaned = email.trim();
      const res = await axios.post(`${BASE_URl}/api/send-mail-otp`, {
        email: cleaned,
        changePassword: false,
      });
      const {
        status,
        message,
        devOtp: dOtp,
        cooldownRemaining,
        userId,
        existing,
        approved,
      } = res.data || {};
      if (status === "throttled") {
        showInfo(message || "Please wait before retrying.", "error");
        if (cooldownRemaining) startCooldown(cooldownRemaining);
      } else if (status === "verified") {
        showInfo("Email already verified. Redirecting...", "success");
        if (userId) {
          await AsyncStorage.setItem("pendingEmail", cleaned);
          await AsyncStorage.setItem("pendingUserId", String(userId));
          if (existing) {
            if (approved)
              navigate("/login", { state: { noPrecheck: true }, replace: true });
            else
              navigate("/awaiting-approval", {
                state: { userId },
                replace: true,
              });
          } else {
            navigate("/register/complete", { state: { userId, email: cleaned } });
          }
        }
      } else if (status === "sent" || status === "sentDev") {
        const infoMsg = dOtp
          ? `${message || "OTP sent."} (dev: ${dOtp})`
          : message || "OTP sent to your email.";
        showInfo(infoMsg, "success");
        setSent(true);
        if (userId) {
          await AsyncStorage.setItem("pendingEmail", cleaned);
          await AsyncStorage.setItem("pendingUserId", String(userId));
        }
        startCooldown(45);
      } else {
        showInfo(message || "Unexpected response.", "error");
      }
    } catch (e: any) {
      const status = e?.response?.data?.status;
      if (status === "throttled" && e?.response?.data?.cooldownRemaining)
        startCooldown(e.response.data.cooldownRemaining);
      showInfo(e?.response?.data?.message || "Failed to send OTP.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length !== OTP_LENGTH) {
      showInfo("Enter the full 6-digit code.", "error");
      return;
    }
    setVerifying(true);
    try {
      const cleaned = email
        .trim()
        .replace(/[\s]+/g, "")
        .replace(/[.,;:]+$/, "");
      const res = await axios.post(`${BASE_URl}/api/verify-mail-otp`, {
        email: cleaned,
        otp: code,
      });
      if (res.data.ok) {
        showInfo("Email verified!", "success");
        const serverUserId = res.data.userId || params.userId;
        const alreadyHasPassword = !!res.data.existing;
        const isApproved = !!res.data.approved;
        if (params.flow === "superadmin") {
          if (alreadyHasPassword) {
            if (isApproved)
              navigate("/login", { state: { noPrecheck: true }, replace: true });
            else
              navigate("/awaiting-approval", {
                state: { userId: serverUserId },
                replace: true,
              });
          } else {
            navigate("/sa/registration", {
              state: {
                userId: serverUserId,
                prefills: params.prefills,
                email,
              },
            });
          }
        } else {
          if (alreadyHasPassword) {
            if (isApproved)
              navigate("/login", { state: { noPrecheck: true }, replace: true });
            else
              navigate("/awaiting-approval", {
                state: { userId: serverUserId },
                replace: true,
              });
          } else {
            navigate("/register/complete", {
              state: {
                userId: serverUserId,
                email,
                prefills: params.prefills,
              },
            });
          }
        }
      } else {
        showInfo(res.data.message || "Invalid OTP.", "error");
      }
    } catch (e: any) {
      showInfo(e?.response?.data?.message || "Verification failed.", "error");
    } finally {
      setVerifying(false);
    }
  };

  const handleKeyPress = (key: string) => {
    if (key === "backspace") {
      const lastFilled = [...otp].reverse().findIndex((v) => v !== "");
      if (lastFilled !== -1) {
        const idx = OTP_LENGTH - 1 - lastFilled;
        const n = [...otp];
        n[idx] = "";
        setOtp(n);
      }
    } else if (/^\d$/.test(key)) {
      const nextIndex = otp.findIndex((d) => d === "");
      if (nextIndex !== -1) {
        const n = [...otp];
        n[nextIndex] = key;
        setOtp(n);
      }
    } else if (key === "submit") {
      handleVerify();
    }
  };

  const keypadLayout = useMemo(() => KEYPAD_LAYOUT, []);
  const infoColor =
    infoType === "success" ? "#10B981" : infoType === "error" ? "#EF4444" : "#64748B";

  return (
    <div className="w-full min-h-screen bg-white dark:bg-[#0f1218] flex flex-col overflow-x-hidden overflow-y-auto">
      {/* Back button */}
      <div className="px-6 pt-10 relative shrink-0">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
          <ArrowLeft size={24} className="text-gray-900 dark:text-white" />
        </button>
      </div>

      <div className="flex-1 w-full max-w-md mx-auto px-6 pb-32 flex flex-col items-center">
        {/* Icon */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex justify-center mt-4 mb-6"
        >
          <div className="w-16 h-16 rounded-3xl bg-[#e8f5fb] dark:bg-[#1a3a4a] flex items-center justify-center shadow-lg shadow-[#349DC5]/10 border border-[#349DC5]/20">
            <img
              src="/mail_logo.png"
              alt="mail"
              className="w-10 h-10 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        </motion.div>

        <h1 className="text-[28px] font-bold text-gray-900 dark:text-white text-center mb-3 tracking-tight">
          Verify Your Email
        </h1>

        <div className="mb-8 text-center max-w-[280px]">
          {!email ? (
            <p className="text-[15px] text-gray-500 dark:text-gray-400">
              Enter your email to receive an OTP.
            </p>
          ) : (
            <p className="text-[15px] text-gray-500 dark:text-gray-400">
              Enter the 6-digit code sent to <br/>
              <span className="font-bold text-gray-900 dark:text-white underline decoration-[#349DC5]/30 decoration-2 underline-offset-4">{email}</span>
            </p>
          )}
        </div>

        {/* OTP boxes */}
        <div className="flex justify-center gap-3 mb-8">
          {otp.map((digit, idx) => (
            <motion.div
              key={idx}
              initial={false}
              animate={{ 
                scale: digit ? 1.05 : 1,
                borderColor: digit ? "#349DC5" : "transparent"
              }}
              className={`w-11 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold transition-all border-2 ${digit ? "bg-[#e8f5fb] dark:bg-[#1a3a4a] text-[#349DC5]" : "bg-gray-100 dark:bg-white/5 border-transparent text-gray-900 dark:text-white"}`}
            >
              {digit || ""}
            </motion.div>
          ))}
        </div>

        {/* Info message */}
        {info ? (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[14px] text-center mb-6 font-semibold"
            style={{ color: infoColor }}
          >
            {info}
          </motion.p>
        ) : null}

        {/* Verify Button */}
        <motion.button
          onClick={handleVerify}
          disabled={loading || verifying}
          whileTap={{ scale: 0.98 }}
          className="w-full bg-[#349DC5] h-14 rounded-[20px] text-white font-bold text-[17px] shadow-xl shadow-[#349DC5]/20 hover:opacity-90 active:opacity-100 disabled:opacity-50 transition-all mb-8 flex items-center justify-center gap-3"
        >
          {verifying ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Verifying...</span>
            </>
          ) : (
            "Verify OTP"
          )}
        </motion.button>

        {/* Keypad */}
        <div className="w-full max-w-[320px] mb-8 space-y-3">
          {keypadLayout.map((row, rowIndex) => (
            <div key={rowIndex} className="flex justify-between gap-3">
              {row.map((key, idx) => {
                const isBlue = key === "submit";
                const isGray = ["backspace", "space", "-"].includes(key);
                return (
                  <button
                    key={idx}
                    onClick={() => handleKeyPress(key)}
                    className={`h-14 flex-1 rounded-2xl flex items-center justify-center text-xl font-bold transition-all active:scale-[0.9] hover:bg-opacity-80 ${isBlue ? "bg-[#349DC5] text-white shadow-lg shadow-[#349DC5]/20" : isGray ? "bg-gray-100 dark:bg-white/5 text-gray-500" : "bg-gray-50 dark:bg-white/10 text-gray-900 dark:text-white"}`}
                  >
                    {key === "backspace" ? (
                      <Delete size={22} className="text-gray-900 dark:text-white" />
                    ) : key === "submit" ? (
                      <ArrowRight size={22} color="white" />
                    ) : key === "space" || key === "-" ? (
                      <div className="w-4 h-1 bg-gray-300 dark:bg-white/20 rounded-full" />
                    ) : (
                      key
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Resend button */}
        <div className="w-full flex flex-col items-center gap-4">
          <div className="h-[1px] w-full bg-gray-100 dark:bg-white/5" />
          <button
            onClick={sendMailOtp}
            disabled={loading || verifying || !email || cooldown > 0}
            className="flex flex-col items-center transition-all active:scale-95 disabled:opacity-50"
          >
            <span className="text-gray-500 dark:text-gray-400 text-sm mb-1">
              {cooldown > 0 ? "You can request a new code in" : "Didn't receive the code?"}
            </span>
            <span className="text-[#349DC5] font-black text-base uppercase tracking-wider underline underline-offset-4 decoration-2">
              {loading
                ? "Sending..."
                : cooldown > 0
                  ? `${cooldown} Seconds`
                  : sent
                    ? "Resend OTP"
                    : "Send OTP"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

