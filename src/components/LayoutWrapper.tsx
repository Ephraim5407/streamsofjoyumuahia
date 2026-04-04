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

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
} // Emulating React Native SafeArea / Notification system for the wrapper
export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return (
      localStorage.getItem("theme") === "dark" ||
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
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
    // Check missing token on mount or path change
    if (!hideNav) {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Session missing. Please log in.");
        navigate("/welcome", { replace: true });
      }
    }

    // Listen for 401 tokenExpired
    const unsubEventBus = eventBus.on("tokenExpired", () => {
      toast.error("Session expired. Please log in.");
      navigate("/welcome", { replace: true });
    });

    return () => {
      unsubEventBus();
    };
  }, [location.pathname, hideNav, navigate]);
  if (hideNav) {
    return (
      <div className="flex h-screen w-full flex-col bg-background dark:bg-dark-background text-text dark:text-dark-text overflow-hidden">
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
    <div className="flex h-screen w-full flex-col md:flex-row bg-gray-50 dark:bg-[#121212]">
      {/* Desktop Sidebar (Hide on Mobile) */}
      <aside
        className={cn(
          "hidden md:flex flex-col w-20 lg:w-72 bg-white dark:bg-[#1e1e1e] border-r border-border dark:border-dark-border h-screen sticky top-0 transition-all duration-300 z-30",
        )}
      >
        <div className="h-28 flex flex-col items-center justify-center px-4 mb-4 border-b border-gray-50 dark:border-white/5">
          <div className="flex flex-col items-center gap-3">
            <motion.div
              whileHover={{ rotate: -5, scale: 1.1 }}
              className="w-12 h-12 rounded-2xl bg-[#ffffff] flex items-center justify-center shadow shadow-white-500/10 p-2"
            >
              <img
                src="/pwa-192x192.png"
                className="w-full h-full object-contain rounded-lg"
                alt="Logo"
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
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto w-full relative pb-[70px] md:pb-0">
        {children}
      </main>
      {/* Mobile Bottom Tab Navigation (Hide on Desktop) */}
      <nav className="md:hidden flex flex-row items-center justify-around bg-white dark:bg-[#1e1e1e] h-[70px] pb-[10px] w-full fixed bottom-0 z-20 pb-safe rounded-t-[20px] shadow-[0_-2px_15px_rgba(0,0,0,0.05)] dark:shadow-none border-t border-[#f0f0f0] dark:border-dark-border">
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
