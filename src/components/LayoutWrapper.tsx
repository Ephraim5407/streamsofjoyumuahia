import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Home,
  BarChart2,
  Headphones,
  Menu,
  Moon,
  Sun,
  RefreshCw,
} from "lucide-react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import RoleSwitcher from "./RoleSwitcher";
import { AppEventBus } from "../utils/AppEventBus";
import { eventBus } from "../utils/eventBus";
import toast from "react-hot-toast";
import { registerWebPushSubscription } from "../utils/registerWebPush";
import { playSoftNotificationChime } from "../utils/notificationChime";

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
} // Emulating React Native SafeArea / Notification system for the wrapper
export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Default to Light Mode unless explicitly saved as dark
    return localStorage.getItem("theme") === "dark";
  });
  const [isRoleSwitcherOpen, setIsRoleSwitcherOpen] = useState(false);

  useEffect(() => {
    const unsub = AppEventBus.on((event, payload) => {
      if (event === "openRoleSwitcher") setIsRoleSwitcherOpen(true);
      if (event === "setDarkMode") setIsDarkMode(payload);
    });
    return unsub;
  }, []);

  const location = useLocation();
  const hideNavPaths = [
    "/login",
    "/welcome",
    "/verify-email",
    "/awaiting-approval",
    "/register",
    "/register/complete",
    "/forgot-password",
    "/sa/fingerprint-setup",
  ];
  const hideNav = hideNavPaths.some((p) => location.pathname.startsWith(p));
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
    AppEventBus.emit("themeChanged", isDarkMode);
  }, [isDarkMode]);

  const navigate = useNavigate();

  useEffect(() => {
    if (!hideNav) {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/welcome", { replace: true });
      } else {
        registerWebPushSubscription();
      }
    }

    const unsubEventBus = eventBus.on("tokenExpired", () => {
      toast.error("Session expired. Please log in.");
      navigate("/welcome", { replace: true });
    });

    return () => {
      unsubEventBus();
    };
  }, [location.pathname, hideNav, navigate]);

  useEffect(() => {
    if (hideNav || typeof navigator === "undefined" || !navigator.serviceWorker) return;
    const onSwMessage = (ev: MessageEvent) => {
      const t = ev.data?.type;
      if (t === "SOJ_PUSH_RECEIVED") {
        playSoftNotificationChime();
      }
      if (t === "SOJ_NAVIGATE" && typeof ev.data?.path === "string") {
        navigate(ev.data.path);
      }
    };
    navigator.serviceWorker.addEventListener("message", onSwMessage);
    return () =>
      navigator.serviceWorker.removeEventListener("message", onSwMessage);
  }, [hideNav, navigate]);
  if (hideNav) {
    return (
      <div className="flex min-h-[100dvh] w-full flex-col bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary">
        {children}
      </div>
    );
  }
  const navItems = [
    { label: "Home", path: "/home", icon: <Home size={24} /> },
    { label: "Reports", path: "/reports", icon: <BarChart2 size={24} /> },
    { label: "Support", path: "/support", icon: <Headphones size={24} /> },
    {
      label: "Switch Role",
      path: "#role",
      icon: <RefreshCw size={24} />,
      onClick: () => setIsRoleSwitcherOpen(true),
    },
    { label: "More", path: "/more", icon: <Menu size={24} /> },
  ];
  const mobileNavItems = [
    { label: "Home", path: "/home", icon: <Home size={24} /> },
    { label: "Reports", path: "/reports", icon: <BarChart2 size={24} /> },
    {
      label: "Switch Role",
      path: "#role",
      icon: <RefreshCw size={24} />,
      onClick: () => setIsRoleSwitcherOpen(true),
    },
    { label: "Support", path: "/support", icon: <Headphones size={24} /> },
    { label: "More", path: "/more", icon: <Menu size={24} /> },
  ];
  return (
    <div className="flex h-[100dvh] w-full flex-col md:flex-row overflow-hidden bg-[#f7f9fb] dark:bg-dark-background">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col w-20 lg:w-72 shrink-0 bg-white/95 dark:bg-dark-surface border-r border-[#e8ecf0] dark:border-dark-border h-full transition-all duration-300 z-30 shadow-[1px_0_0_rgba(0,0,0,0.04)]",
        )}
      >
        <div className="h-28 flex flex-col items-center justify-center px-4 mb-4 border-b border-[#eef2f6] dark:border-white/5">
          <div className="flex flex-col items-center gap-3">
            <motion.div
              whileHover={{ rotate: -5, scale: 1.05 }}
              className="w-12 h-12 rounded-2xl bg-[#349DC5]/10 flex items-center justify-center p-2 ring-1 ring-[#349DC5]/20"
            >
              <img
                src="/pwa-192x192.png"
                className="w-full h-full object-contain rounded-lg"
                alt="Streams of Joy"
              />
            </motion.div>
            <div className="hidden lg:flex flex-col items-center">
              <h1 className="text-[12px] font-black text-[#00204a] dark:text-white tracking-[0.05em] leading-none text-center uppercase whitespace-nowrap">
                Streams of Joy
              </h1>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-4 lg:px-6 space-y-1.5">
          {navItems.map((item) =>
            item.onClick ? (
              <button
                key={item.label}
                onClick={item.onClick}
                className="flex flex-row items-center justify-center lg:justify-start gap-4 px-4 py-3 rounded-xl transition-all font-medium text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-border hover:text-gray-900 dark:hover:text-gray-200 w-full"
              >
                <div className="shrink-0">{item.icon}</div>
                <span className="hidden lg:block truncate">{item.label}</span>
              </button>
            ) : (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "flex flex-row items-center justify-center lg:justify-start gap-4 px-4 py-3 rounded-xl transition-all font-medium text-sm",
                    isActive
                      ? "bg-blue-50 dark:bg-blue-900/20 text-primary shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-border hover:text-gray-900 dark:hover:text-gray-200",
                  )
                }
              >
                <div className="shrink-0">{item.icon}</div>
                <span className="hidden lg:block truncate">{item.label}</span>
              </NavLink>
            ),
          )}
        </nav>
        {/* Phase 6: Dark Mode Toggle */}
        <div className="px-4 lg:px-6 py-4 mt-auto border-t border-border dark:border-dark-border">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="flex items-center justify-center lg:justify-start gap-3 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 w-full p-2 lg:p-0 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 lg:hover:bg-transparent"
          >
            <div className="shrink-0">
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </div>
            <span className="hidden lg:block">
              {isDarkMode ? "Light Mode" : "Dark Mode"}
            </span>
          </button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0 min-h-0 relative pb-[calc(72px+env(safe-area-inset-bottom,0px))] md:pb-0">
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain w-full">
          {children}
        </div>
      </main>
      <nav
        className="md:hidden flex flex-row items-center justify-around h-[68px] px-1 pb-[max(8px,env(safe-area-inset-bottom))] w-full fixed bottom-0 left-0 right-0 z-40 rounded-t-[22px] border-t border-white/40 dark:border-white/10 bg-white/72 dark:bg-[#1a1c1e]/72 backdrop-blur-xl backdrop-saturate-150 shadow-[0_-8px_32px_rgba(0,32,74,0.08)]"
        aria-label="Primary"
      >
        {mobileNavItems.map((item) => {
          const content = (
            <>
              {item.icon}
              <span className="text-[10px] sm:text-[12px] font-medium leading-none mt-1">
                {item.label}
              </span>
            </>
          );
          if (item.onClick) {
            return (
              <button
                key={item.label}
                onClick={item.onClick}
                className="flex flex-col items-center justify-center gap-0.5 w-full h-full text-[#8e8e93] active:scale-95 transition-transform"
              >
                {content}
              </button>
            );
          }
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-0.5 w-full h-full transition-all",
                  isActive ? "text-[#349DC5] transform scale-105" : "text-[#8e8e93]",
                )
              }
            >
              {content}
            </NavLink>
          );
        })}
      </nav>
      <RoleSwitcher
        isOpen={isRoleSwitcherOpen}
        onClose={() => setIsRoleSwitcherOpen(false)}
      />
    </div>
  );
}
