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
            navigate("/register/regular", { state: { userId, email: cleaned } });
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
            navigate("/register/super-admin", {
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
            navigate("/register/regular", {
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
      const idx = OTP_LENGTH - 1 - lastFilled;
      if (idx >= 0) {
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
    <div className="w-full min-h-screen bg-white dark:bg-[#0f1218] flex flex-col pb-8 overflow-y-auto">
      {/* Back button */}
      <div className="px-6 pt-12 relative">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft size={24} color="#333" />
        </button>
      </div>

      <div className="flex-1 px-6 pt-8 flex flex-col">
        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div className="w-[60px] h-[60px] rounded-full bg-[#e8f5fb] dark:bg-[#1a3a4a] flex items-center justify-center shadow-md">
            <img
              src="/mail_logo.png"
              alt="mail"
              className="w-10 h-10 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        </div>

        <h1 className="text-xl font-bold text-[#222] dark:text-white text-center mb-3">
          Verify Your Email
        </h1>

        {!email ? (
          <div className="mb-3">
            <p className="text-base text-[#555] dark:text-gray-400 text-center mb-3">
              Enter your email to receive an OTP.
            </p>
            <input
              type="email"
              className="w-full border border-[#ccc] rounded-lg px-4 py-3 text-base bg-[#f9f9f9] dark:bg-[#1e1e1e] dark:text-white dark:border-[#333] outline-none"
              placeholder="Enter email address"
              autoCapitalize="none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        ) : (
          <p className="text-base text-[#555] dark:text-gray-400 text-center mb-4">
            Enter the 6-digit code sent to{" "}
            <span className="font-bold text-[#222] dark:text-white">{email}</span>
          </p>
        )}

        {/* OTP boxes */}
        <div className="flex justify-center gap-2 mb-5">
          {otp.map((digit, idx) => (
            <div
              key={idx}
              className={`w-10 h-12 border rounded-lg flex items-center justify-center text-xl font-bold transition-all ${digit ? "border-[#349DC5] bg-[#e8f5fb] dark:bg-[#1a3a4a] text-[#349DC5]" : "border-[#ccc] bg-[#f9f9f9] dark:bg-[#1e1e1e] dark:border-[#333] text-[#222] dark:text-white"}`}
            >
              {digit || ""}
            </div>
          ))}
        </div>

        {/* Verify Button */}
        <motion.button
          onClick={handleVerify}
          disabled={loading || verifying}
          whileTap={{ scale: 0.97 }}
          className="w-full bg-[#349DC5] rounded-lg py-3.5 text-white font-bold text-base disabled:opacity-60 mb-4 shadow-md"
        >
          {verifying ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{" "}
              Verifying...
            </div>
          ) : (
            "Verify OTP"
          )}
        </motion.button>

        {/* Info message */}
        {info ? (
          <p
            className="text-sm text-center mb-3 font-medium"
            style={{ color: infoColor }}
          >
            {info}
          </p>
        ) : null}

        {/* Keypad */}
        <div className="mb-5">
          {keypadLayout.map((row, rowIndex) => (
            <div key={rowIndex} className="flex justify-evenly my-1.5">
              {row.map((key, idx) => {
                const isBlue = key === "submit";
                const isGray = ["backspace", "space", "-"].includes(key);
                return (
                  <button
                    key={idx}
                    onClick={() => handleKeyPress(key)}
                    className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-medium transition-all active:scale-90 ${isBlue ? "bg-[#349DC5] text-white shadow-md" : isGray ? "bg-[#e0e0e0] dark:bg-[#2a2a2a] text-[#333] dark:text-white" : "bg-[#f2f2f2] dark:bg-[#1e1e1e] text-[#222] dark:text-white"}`}
                  >
                    {key === "backspace" ? (
                      <Delete size={22} />
                    ) : key === "submit" ? (
                      <ArrowRight size={22} color="white" />
                    ) : key === "space" || key === "-" ? (
                      <span className="text-gray-400">–</span>
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
        <div className="flex justify-center">
          <button
            onClick={sendMailOtp}
            disabled={loading || verifying || !email || cooldown > 0}
            className="py-2 px-6 rounded-lg bg-[#e6f2fa] dark:bg-[#1a3a4a] disabled:opacity-50"
          >
            <span className="text-[#349DC5] font-bold text-sm">
              {loading
                ? "Sending..."
                : cooldown > 0
                  ? `Resend in ${cooldown}s`
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
