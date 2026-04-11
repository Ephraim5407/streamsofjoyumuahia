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
    <div className="min-h-[100dvh] w-full bg-background dark:bg-dark-background flex flex-col items-center justify-start pt-10 px-5">
      <div className="w-full max-w-md flex flex-col relative z-10 pb-[120px]">
        {/* Top bar */}
        {activeTab === "login" && (
          <div className="flex justify-end w-full mb-8 mt-2">
            <button
              onClick={() => toast.success("Login to access notifications")}
              className="p-[6px] hover:bg-surface-alt dark:hover:bg-dark-surface-alt transition-colors"
            >
              <Bell size={28} className="text-primary" strokeWidth={1.5} />
            </button>
          </div>
        )}

        <div className="w-full flex flex-col items-center">
          {/* Logo & Branding */}
          {activeTab === "login" && (
            <div className="flex flex-col items-center mb-6">
              <img
                src="/pwa-192x192.png"
                alt="Logo"
                className="w-[100px] h-[100px] object-contain mb-[10px]"
              />
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
                      className="w-full h-[48px] rounded-2xl bg-primary hover:opacity-90 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95 mb-4"
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
                <div className="flex flex-col w-full px-5">
                  <div className="text-center mb-[30px]">
                    <p className="text-[17px] font-medium text-text-secondary dark:text-dark-text-secondary">
                      {user
                        ? `Welcome back, ${user?.surname || ""} ${user?.firstName || ""}!`
                        : "Welcome back!"}
                    </p>
                  </div>

                  <div className="w-full mb-[10px]">
                    <label className="block text-[14px] font-medium text-text-secondary dark:text-dark-text-secondary mb-2 px-1">
                      Password
                    </label>
                    <div className="flex items-center w-full border border-border dark:border-dark-border rounded-lg bg-surface-alt dark:bg-dark-surface-alt px-2.5 h-[48px] transition-all duration-200">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handlePasswordLogin()
                        }
                        className="flex-1 h-full text-[16px] text-text-primary dark:text-dark-text-primary bg-transparent outline-none px-2 font-normal placeholder:text-text-muted dark:placeholder:text-dark-text-muted"
                      />
                      <button
                        onClick={() => setShowPassword((p) => !p)}
                        className="p-2 transition-transform active:scale-90 text-text-secondary dark:text-dark-text-secondary"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  <div className="w-full flex justify-end pr-10 mb-[30px] mt-[5px]">
                    <button
                      onClick={() =>
                        navigate("/forgot-password", {
                          state: { email: storedEmail || undefined },
                        })
                      }
                      className="text-[14px] font-normal text-[#666] hover:text-[#349DC5] transition-colors"
                    >
                      Forgot your password?{" "}
                      <span className="text-[#349DC5]">Click Here</span>
                    </button>
                  </div>

                  <div className="w-full flex justify-center mt-5">
                    <button
                      onClick={handlePasswordLogin}
                      disabled={loading}
                      className="w-[90%] h-[48px] rounded-lg bg-primary text-white font-semibold text-[16px] flex items-center justify-center disabled:opacity-60 transition-all cursor-pointer shadow-lg shadow-primary/20"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <LockKeyhole size={22} className="shrink-0 mr-1" />
                          <span className="ml-[10px]">Login</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Biometric */}
                  <div className="w-full flex justify-center mt-3">
                    <button
                      onClick={() =>
                        toast.success(
                          "Biometric login is available on the mobile app.",
                          { icon: "📱" },
                        )
                      }
                      className="w-[90%] h-[48px] rounded-lg bg-primary text-white font-semibold text-[16px] flex items-center justify-center transition-all cursor-pointer shadow-lg shadow-primary/20"
                    >
                      <Fingerprint size={22} className="shrink-0 mr-[2px]" />
                      <span>Biometric</span>
                    </button>
                  </div>
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

        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1a1c1e] border-t-2 border-[#eee] flex justify-around w-full h-[10vh] pt-[10px] pb-[1.2vh]">
          <button
            onClick={() => setActiveTab("login")}
            className="flex-1 flex flex-col items-center justify-center"
          >
            <LockKeyhole size={25} className="text-primary" />
            <span className="text-[12px] text-primary font-bold mt-[2px]">Login</span>
          </button>
          <button
            onClick={() => setActiveTab("support")}
            className="flex-1 flex flex-col items-center justify-center"
          >
            <Headset size={25} className="text-primary" />
            <span className="text-[12px] text-primary font-bold mt-[2px]">Support</span>
          </button>
        </div>
      </div>
    </div>
  );
}
