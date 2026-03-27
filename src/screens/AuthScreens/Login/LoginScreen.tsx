import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import axios from "axios";
import {
  Eye,
  EyeOff,
  Bell,
  LockKeyhole,
  Fingerprint,
  Headset,
  ChevronLeft,
  AlertCircle,
} from "lucide-react";
import AsyncStorage from "../../../utils/AsyncStorage";
import { BASE_URl } from "../../../api/users";
import LoginSupportScreen from "./LoginSupportScreen";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

type MinimalUser = {
  _id: string;
  firstName?: string;
  surname?: string;
  activeRole?: string;
  isVerified?: boolean;
};

export default function LoginScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const noPrecheck = !!(location.state as any)?.noPrecheck;
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<MinimalUser | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [storedEmail, setStoredEmail] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"login" | "support">("login");
  const [deactivatedUser, setDeactivatedUser] = useState<{
    firstName: string;
    surname: string;
    avatar: string | null;
  } | null>(null);

  const autoRedirectedRef = useRef(false);

  /* Load stored user / pending IDs */
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem("user");
        if (raw) setUser(JSON.parse(raw));
      } catch {}
      try {
        const pu = await AsyncStorage.getItem("pendingUserId");
        if (pu) setPendingUserId(pu);
      } catch {}
      try {
        const em = await AsyncStorage.getItem("pendingEmail");
        if (em) setStoredEmail(em);
      } catch {}
    })();
  }, []);

  /* Evaluate incomplete account and redirect if needed */
  const evaluateIncompleteAccount = useCallback(async () => {
    if (noPrecheck) return;
    if (autoRedirectedRef.current) return;
    try {
      let email: string | null = storedEmail;
      if (!email) {
        const raw = await AsyncStorage.getItem("user");
        if (raw) {
          try {
            email = JSON.parse(raw)?.email || null;
          } catch {}
        }
      }
      if (!pendingUserId) return;
      if (!email) {
        if (!autoRedirectedRef.current) {
          autoRedirectedRef.current = true;
          navigate("/register", { replace: true });
        }
        return;
      }
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 8000);
      const resp = await axios.post(
        `${BASE_URl}/api/users/lookup-email`,
        { email },
        { signal: controller.signal },
      );
      clearTimeout(t);
      if (resp.data?.ok && resp.data.exists) {
        if (!resp.data.hasPassword || !resp.data.registrationCompleted) {
          if (!autoRedirectedRef.current) {
            autoRedirectedRef.current = true;
            navigate("/verify-email", {
              state: { email, userId: resp.data.userId || pendingUserId },
              replace: true,
            });
          }
        } else if (
          resp.data.registrationCompleted &&
          resp.data.approved === false
        ) {
          if (!autoRedirectedRef.current) {
            autoRedirectedRef.current = true;
            navigate("/awaiting-approval", {
              state: { userId: resp.data.userId || pendingUserId },
              replace: true,
            });
          }
        }
      } else if (resp.data?.ok && resp.data.exists === false) {
        if (!autoRedirectedRef.current) {
          autoRedirectedRef.current = true;
          navigate("/register", { replace: true });
        }
      }
    } catch (e: any) {
      const code = e?.code || e?.name || "";
      const msg = e?.message || "";
      if (code !== "ERR_CANCELED" && !/aborted|canceled/i.test(msg))
        console.warn("[Login evaluate]", msg);
    }
  }, [pendingUserId, storedEmail, navigate, noPrecheck]);

  useEffect(() => {
    evaluateIncompleteAccount();
  }, [evaluateIncompleteAccount]);

  const persistAuth = async (token: string, backendUser: MinimalUser) => {
    await AsyncStorage.setItem("token", token);
    await AsyncStorage.setItem("user", JSON.stringify(backendUser));
  };

  const handlePasswordLogin = useCallback(async () => {
    let effectivePendingUserId = pendingUserId;
    try {
      if (!effectivePendingUserId) {
        const pu = await AsyncStorage.getItem("pendingUserId");
        if (pu) effectivePendingUserId = pu;
      }
      if (!user) {
        const raw = await AsyncStorage.getItem("user");
        if (raw) setUser(JSON.parse(raw));
      }
    } catch {}

    const effectiveUserId =
      effectivePendingUserId ||
      (user as any)?._id ||
      (user as any)?.userId ||
      null;
    let finalUserId = effectiveUserId;

    if (!finalUserId && storedEmail) {
      try {
        const cleaned = storedEmail
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "")
          .replace(/[.,;:]+$/, "");
        const resp = await axios.post(`${BASE_URl}/api/users/lookup-email`, {
          email: cleaned,
        });
        if (resp.data?.ok && resp.data.exists)
          finalUserId =
            resp.data.userId ||
            (resp.data.user && resp.data.user._id) ||
            finalUserId;
      } catch {}
    }

    if (!finalUserId) {
      toast.error("No pending user ID found. Please restart the flow.");
      setTimeout(() => navigate("/welcome", { replace: true }), 300);
      return;
    }
    if (!password) {
      toast.error("Enter your password to continue.");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${BASE_URl}/api/auth/login`, {
        userId: finalUserId,
        password,
      });
      if (!res.data?.ok) throw new Error(res.data?.message || "Login failed");
      const { token, user: backendUser } = res.data;
      await persistAuth(token, backendUser);
      navigate("/home", { replace: true });
    } catch (err: any) {
      if (err.response?.status === 403 && err.response?.data?.deactivated) {
        setDeactivatedUser(err.response.data.user);
        return;
      }
      toast.error(
        err?.response?.data?.message || err.message || "Network error",
      );
    } finally {
      setLoading(false);
    }
  }, [pendingUserId, password, navigate, storedEmail, user]);

  return (
    <div className="min-h-screen w-full bg-white dark:bg-[#0f1218] flex flex-col items-center justify-center overflow-y-auto p-4 md:p-8">
      {/* Background Decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20 dark:opacity-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#349DC5] rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#1282a2] rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md bg-white dark:bg-[#1a1c1e] rounded-[32px] shadow-md shadow-blue-500/5 border border-white/20 dark:border-white/5 flex flex-col relative z-10 overflow-hidden">
        {/* Top bar */}
        {activeTab === "login" && (
          <div className="flex justify-end px-6 pt-6 -mb-4">
            <button
              onClick={() => toast.success("Login to access notifications")}
              className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors"
            >
              <Bell size={24} color="#349DC5" />
            </button>
          </div>
        )}

        <div className="px-6 py-8 md:px-10 md:py-12 flex flex-col">
          {/* Logo & Branding */}
          {activeTab === "login" && (
            <div className="flex flex-col items-center mb-8">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-20 h-20 rounded-[22px] bg-gradient-to-br from-[#349DC5] to-[#1282a2] flex items-center justify-center p-3 shadow mb-4"
              >
                <img
                  src="/pwa-192x192.png"
                  alt="Logo"
                  className="w-full h-full object-contain brightness-0 invert"
                />
              </motion.div>
              <h1 className="text-[11px] font-bold bg-clip-text text-transparent bg-gradient-to-b from-[#00204a] via-[#349DC5] to-[#349DC5] dark:from-white dark:to-gray-400 leading-tight text-center uppercase whitespace-nowrap">
                Streams of Joy
              </h1>
            </div>
          )}

          {/* === LOGIN TAB === */}
          {activeTab === "login" && (
            <div className="flex flex-col">
              {deactivatedUser ? (
                /* Deactivated account UI */
                <div className="w-full">
                  <div className="flex items-center justify-between mb-8">
                    <button
                      onClick={() => setDeactivatedUser(null)}
                      className="p-2 rounded-xl bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                    >
                      <ChevronLeft size={24} color="#349DC5" />
                    </button>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                      Account Access
                    </h2>
                    <div className="w-10" />
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="relative mb-6">
                      {deactivatedUser.avatar ? (
                        <img
                          src={deactivatedUser.avatar}
                          alt="avatar"
                          className="w-24 h-24 rounded-full border-4 border-[#349DC5] object-cover shadow-lg"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#349DC5] to-[#1282a2] flex items-center justify-center shadow-lg">
                          <span className="text-white text-3xl font-bold">
                            {(deactivatedUser.firstName?.[0] || "") +
                              (deactivatedUser.surname?.[0] || "")}
                          </span>
                        </div>
                      )}
                      <div className="absolute bottom-0 right-0 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center border-4 border-white dark:border-[#1a1c1e] shadow-sm">
                        <LockKeyhole size={14} color="white" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 text-center">
                      Hello, {deactivatedUser.firstName}
                    </h3>
                    <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-2xl p-4 mb-6 w-full">
                      <AlertCircle
                        size={20}
                        className="text-amber-500 shrink-0 mt-0.5"
                      />
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                        Your account has been{" "}
                        <span className="text-amber-600 dark:text-amber-400 font-bold underline decoration-2 underline-offset-2">
                          deactivated
                        </span>{" "}
                        by administration.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setDeactivatedUser(null);
                        setActiveTab("support");
                      }}
                      className="w-full py-4 rounded-2xl bg-[#349DC5] hover:bg-[#2d8ab0] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95 mb-4"
                    >
                      <Headset size={18} /> Talk to Support
                    </button>
                    <button
                      onClick={() => setDeactivatedUser(null)}
                      className="text-sm text-slate-400 hover:text-[#349DC5] font-semibold transition-colors py-2"
                    >
                      Return to Login
                    </button>
                  </div>
                </div>
              ) : (
                /* Normal login form */
                <div className="flex flex-col">
                  <div className="text-center mb-10">
                    <p className="text-[17px] font-medium text-[#555555ff]">
                      {user
                        ? `Welcome back, ${user.firstName || ""}!`
                        : "Welcome back!"}
                    </p>
                    <p className="text-sm text-slate-400 mt-1 font-medium">
                      Please enter your credentials
                    </p>
                  </div>

                  <div className="w-full mb-6">
                    <label className="block text-[13px] font-medium text-[#555555ff] mb-2 px-1">
                      Password
                    </label>
                    <div className="group flex items-center w-full border border-[#e0e0e0] rounded-xl bg-[#fafcff] px-4 focus-within:ring-2 focus-within:ring-[#349DC5]/20 focus-within:border-[#349DC5] transition-all duration-200">
                      <LockKeyhole size={20} className="text-[#349DC5] shrink-0" />
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handlePasswordLogin()
                        }
                        className="flex-1 h-12 text-base text-[#222] bg-transparent outline-none px-3 font-medium placeholder:text-gray-400"
                      />
                      <button
                        onClick={() => setShowPassword((p) => !p)}
                        className="p-2 transition-transform active:scale-90 text-gray-500"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  <div className="w-full flex justify-end mb-8">
                    <button
                      onClick={() =>
                        navigate("/forgot-password", {
                          state: { email: storedEmail || undefined },
                        })
                      }
                      className="text-xs font-medium text-gray-500 hover:text-[#349DC5] transition-colors"
                    >
                      Forgot your password?{" "}
                      <span className="text-[#349DC5]">Click Here</span>
                    </button>
                  </div>

                  <motion.button
                    onClick={handlePasswordLogin}
                    disabled={loading}
                    whileTap={{ scale: 0.98 }}
                    className="w-full h-[56px] rounded-2xl bg-gradient-to-r from-[#349DC5] to-[#1282a2] text-white font-bold text-base flex items-center justify-center gap-3 shadow shadow-blue-500/20 disabled:opacity-60 transition-all hover:brightness-110"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <LockKeyhole size={22} className="shrink-0" />
                        <span>Sign In</span>
                      </>
                    )}
                  </motion.button>
                  <div className="flex items-center gap-4 my-6">
                    <div className="h-[1px] flex-1 bg-slate-100 dark:bg-white/5" />
                    <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em]">
                      OR
                    </span>
                    <div className="h-[1px] flex-1 bg-slate-100 dark:bg-white/5" />
                  </div>
                  <button
                    onClick={() =>
                      toast.success(
                        "Biometric login is available on the mobile app.",
                        { icon: "📱" },
                      )
                    }
                    className="w-full h-[56px] rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 text-slate-700 dark:text-slate-300 font-bold text-sm flex items-center justify-center gap-3 transition-all hover:bg-slate-100 dark:hover:bg-white/10"
                  >
                    <Fingerprint size={22} className="text-[#349DC5]" />
                    <span>Quick Access (Mobile)</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "support" && (
            <div className="flex-1">
              <LoginSupportScreen />
            </div>
          )}
        </div>

        <div className="bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5 flex p-2 gap-2">
          <button
            onClick={() => setActiveTab("login")}
            className={cn(
              "flex-1 flex items-center justify-center py-4 rounded-2xl gap-2 font-bold text-xs transition-all",
              activeTab === "login"
                ? "bg-white dark:bg-[#1a1c1e] text-[#349DC5] shadow-sm"
                : "text-slate-400 hover:text-slate-600",
            )}
          >
            <LockKeyhole size={18} />
            <span>Login</span>
          </button>
          <button
            onClick={() => setActiveTab("support")}
            className={cn(
              "flex-1 flex items-center justify-center py-4 rounded-2xl gap-2 font-bold text-xs transition-all",
              activeTab === "support"
                ? "bg-white dark:bg-[#1a1c1e] text-[#349DC5] shadow-sm"
                : "text-slate-400 hover:text-slate-600",
            )}
          >
            <Headset size={18} />
            <span>Support</span>
          </button>
        </div>
      </div>
    </div>
  );
}
