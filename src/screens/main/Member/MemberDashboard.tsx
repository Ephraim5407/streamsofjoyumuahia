import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { BASE_URl } from "../../../api/users";
import RoleSwitcher from "../../../components/RoleSwitcher";
import { useSoulsStore } from "../../../context/SoulsStore";
import { getUnitSummaryById } from "../../../api/unitSummary";
import AsyncStorage from "../../../utils/AsyncStorage";
import {
  User,
  Bell,
  Users,
  Flame,
  UserPlus,
  Heart,
  Handshake,
  Music,
  Car,
  Activity,
  GraduationCap,
  Home,
  MapPin,
  Calendar,
  Shield,
  List,
  ChevronRight,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type UnitCardKey =
  | "achievements"
  | "souls"
  | "members"
  | "invited"
  | "married"
  | "songs"
  | "car"
  | "testimonies"
  | "attendance"
  | "graduates"
  | "recovery"
  | "emporium"
  | "addAttendance";

type UnitCardConfig = {
  title: string;
  icon: React.ReactNode;
  route?: string;
  state?: any;
  color: string;
  bg: string;
};

const UNIT_CARD_CONFIG: Record<string, UnitCardConfig> = {
  achievements: {
    title: "Unit Achievements",
    icon: <Handshake size={24} />,
    route: "/achievements",
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/20",
  },
  souls: {
    title: "Soul Harvested",
    icon: <Flame size={24} />,
    route: "/soul-harvested",
    state: { scope: "mine" },
    color: "text-rose-500",
    bg: "bg-rose-50 dark:bg-rose-950/20",
  },
  members: {
    title: "Members Assisted",
    icon: <Users size={24} />,
    route: "/members/assisted",
    color: "text-indigo-500",
    bg: "bg-indigo-50 dark:bg-indigo-950/20",
  },
  invited: {
    title: "People Invited",
    icon: <UserPlus size={24} />,
    route: "/people-invited",
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/20",
  },
  married: {
    title: "Marriage Reports",
    icon: <Heart size={24} />,
    route: "/reports/married",
    color: "text-pink-500",
    bg: "bg-pink-50 dark:bg-pink-950/20",
  },
  songs: {
    title: "Songs Released",
    icon: <Music size={24} />,
    route: "/reports/songs",
    color: "text-fuchsia-500",
    bg: "bg-fuchsia-50 dark:bg-fuchsia-950/20",
  },
  attendance: {
    title: "Unit Attendance",
    icon: <List size={24} />,
    route: "/attendance-home",
    color: "text-[#349DC5]",
    bg: "bg-blue-50 dark:bg-blue-950/20",
  },
  graduates: {
    title: "Unit Graduates",
    icon: <GraduationCap size={24} />,
    route: "/reports/graduates",
    color: "text-purple-500",
    bg: "bg-purple-50 dark:bg-purple-950/20",
  },
};

const CORE_REPORTS: string[] = ["souls", "invited", "attendance", "members", "achievements", "married", "graduates", "songs"];

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

export default function DashboardMember() {
  const navigate = useNavigate();
  const { personalCount, unitCount, refreshAll } = useSoulsStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [switchModalVisible, setSwitchModalVisible] = useState(false);
  const [hasFinSecDuty, setHasFinSecDuty] = useState(false);
  const [summaryTotals, setSummaryTotals] = useState({
    income: 0,
    expense: 0,
    net: 0,
  });
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [unitSummary, setUnitSummary] = useState<any>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const res = await axios.get(`${BASE_URl}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.ok) {
        const serverUser = res.data.user || {};
        const aid = await AsyncStorage.getItem("activeUnitId");
        if (aid) serverUser.activeUnitId = aid === "global" ? null : aid;
        setProfile(serverUser);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const unitId = await AsyncStorage.getItem("activeUnitId");
      if (token && unitId) {
        const res = await getUnitSummaryById(token, unitId);
        if (res?.ok) setUnitSummary(res);
      }
    } catch { }
  }, []);

  useEffect(() => {
    fetchProfile();
    fetchSummary();
    refreshAll();
  }, [fetchProfile, fetchSummary, refreshAll]);

  useEffect(() => {
    (async () => {
      try {
        const u = profile;
        if (!u) {
          setHasFinSecDuty(false);
          return;
        }
        const roles = Array.isArray(u.roles) ? u.roles : [];
        const activeUnitId = await AsyncStorage.getItem("activeUnitId");
        let unitIdToCheck: string | null = activeUnitId || null;
        if (!unitIdToCheck) {
          const match = roles.find(
            (r: any) => r.role === (u.activeRole || "") && (r.unit || r.unitId),
          );
          if (match) unitIdToCheck = String(match.unit || match.unitId);
        }
        if (!unitIdToCheck) {
          setHasFinSecDuty(false);
          return;
        }
        const has = roles.some(
          (r: any) =>
            String(r.unit || r.unitId || "") === String(unitIdToCheck) &&
            Array.isArray(r.duties) &&
            (r.duties.includes("FinancialSecretary") ||
              r.duties.includes("Financial Secretary")),
        );
        setHasFinSecDuty(has);
        if (has) {
          const token = await AsyncStorage.getItem("token");
          const res = await axios.get(`${BASE_URl}/api/finance/summary`, {
            params: { unitId: unitIdToCheck },
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.data?.summary?.totals) {
            setSummaryTotals({
              income: Number(res.data.summary.totals.income) || 0,
              expense: Number(res.data.summary.totals.expense) || 0,
              net: Number(res.data.summary.totals.net) || 0,
            });
          }
        }
      } catch { }
    })();
  }, [profile]);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        const res = await axios.get(`${BASE_URl}/api/events`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = res.data?.events || (Array.isArray(res.data) ? res.data : []);
        setAllEvents(data);
      } catch { }
    })();
  }, []);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();
    return allEvents
      .map((ev) => {
        const d = new Date(ev.date || ev.isoDate || ev.dateTime);
        return !isNaN(d.getTime()) ? { ...ev, __date: d } : null;
      })
      .filter((ev: any) => ev && ev.__date.getTime() >= startOfToday)
      .sort((a: any, b: any) => a.__date.getTime() - b.__date.getTime())
      .slice(0, 5);
  }, [allEvents]);

  if (loading) return null;

  return (
    <div className="flex-1 bg-gray-50 dark:bg-[#0f1218] min-h-screen pb-24 md:pb-10">
      {/* Professional Header */}
      <div className="bg-[#00204a] px-4 sm:px-6 pt-5 sm:pt-10 pb-12 sm:pb-16">
        <div className="max-w-7xl mx-auto flex flex-col gap-4 sm:gap-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-5 min-w-0">
              <div
                onClick={() => navigate("/profile")}
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/10 flex items-center justify-center border-2 border-white/20 cursor-pointer overflow-hidden shadow-lg group relative shrink-0"
              >
                {profile?.profile?.avatar ? (
                  <img
                    src={profile.profile.avatar}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={24} className="text-white/40" />
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-xl md:text-2xl font-bold text-white leading-tight truncate">
                  Welcome, {profile?.title ? `${profile.title} ` : ""}{profile?.firstName || "Member"}
                </h2>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="px-2 py-0.5 bg-[#349DC5] text-white text-[8px] sm:text-[10px] font-bold uppercase rounded-md shadow-sm">
                    {profile?.activeRole || "Member"}
                  </span>
                  <span className="text-white/60 text-[9px] sm:text-xs font-bold uppercase tracking-wider truncate">
                    {profile?.activeUnitName || "Unit Hub"}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate("/notifications")}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/10 flex items-center justify-center relative hover:bg-white/20 transition-all border border-white/10 active:scale-95"
            >
              <Bell size={18} className="text-white" />
              <div className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-[#00204a]" />
            </button>
            {Array.isArray(profile?.roles) && profile.roles.length > 1 && (
              <button
                onClick={() => setSwitchModalVisible(true)}
                className="h-10 sm:h-12 flex-1 sm:flex-none px-4 sm:px-6 bg-white text-[#00204a] rounded-xl font-bold text-[9px] sm:text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all"
              >
                Switch Role
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 -mt-6 sm:-mt-8">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-10">
          <div className="bg-white dark:bg-[#1a1c1e] p-3 sm:p-5 rounded-xl shadow-sm border border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
              <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-[#349DC5]">
                <Users size={16} />
              </div>
              <span className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-tight">
                Members
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#00204a] dark:text-white leading-none">
              {unitSummary?.counts?.membersCount || 0}
            </h3>
            <p className="text-[7px] sm:text-[9px] font-bold text-[#349DC5] uppercase mt-1 hidden sm:block">
              Active Unit Members
            </p>
          </div>

          <div className="bg-white dark:bg-[#1a1c1e] p-3 sm:p-5 rounded-xl shadow-sm border border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
              <div className="p-1.5 bg-rose-50 dark:bg-rose-950/20 rounded-lg text-rose-500">
                <Flame size={16} />
              </div>
              <span className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-tight">
                Souls
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#00204a] dark:text-white leading-none">
              {unitCount || 0}
            </h3>
            <p className="text-[7px] sm:text-[9px] font-bold text-gray-400 uppercase mt-1 hidden sm:block">
              Soul Harvested (Unit)
            </p>
          </div>

          {hasFinSecDuty && (
            <div className="col-span-2 bg-white dark:bg-[#1a1c1e] p-3 sm:p-5 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg text-emerald-500">
                    <Activity size={16} />
                  </div>
                  <span className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Financial Summary
                  </span>
                </div>
                <button
                  onClick={() => navigate("/finance-summary")}
                  className="text-[8px] sm:text-[10px] font-bold text-[#349DC5] uppercase hover:underline"
                >
                  Details
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div>
                  <p className="text-[7px] sm:text-[9px] font-bold text-gray-400 uppercase mb-0.5">
                    Income
                  </p>
                  <p className="text-xs sm:text-base font-bold text-emerald-500 tabular-nums">
                    ₦{summaryTotals.income.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[7px] sm:text-[9px] font-bold text-gray-400 uppercase mb-0.5">
                    Expenses
                  </p>
                  <p className="text-xs sm:text-base font-bold text-rose-500 tabular-nums">
                    ₦{summaryTotals.expense.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[7px] sm:text-[9px] font-bold text-gray-400 uppercase mb-0.5">
                    Net
                  </p>
                  <p className="text-xs sm:text-base font-bold text-[#00204a] dark:text-white tabular-nums">
                    ₦{summaryTotals.net.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Links */}
        <section className="mb-6 sm:mb-12">
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <h3 className="text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-wider leading-none">
              Quick Links
            </h3>
            <div className="h-px flex-1 bg-gray-100 dark:bg-white/5" />
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
            {CORE_REPORTS.map((key) => {
              const card = UNIT_CARD_CONFIG[key];
              if (!card) return null;
              return (
                <button
                  key={key}
                  onClick={() => navigate(card.route!, { state: card.state })}
                  className="bg-white dark:bg-[#1a1c1e] p-3 sm:p-5 md:p-6 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 flex flex-col items-center text-center group hover:border-[#349DC5]/30 transition-all active:scale-95"
                >
                  <div
                    className={cn(
                      "w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-4 group-hover:scale-110 transition-transform",
                      card.bg,
                      card.color,
                    )}
                  >
                    {card.icon}
                  </div>
                  <span className="text-[8px] sm:text-[10px] md:text-xs font-bold text-[#00204a] dark:text-white uppercase leading-tight">
                    {card.title}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Upcoming Events */}
        <section className="pb-4">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-3">
              <h3 className="text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-wider leading-none">
                Upcoming Events
              </h3>
              <div className="h-px w-12 sm:w-24 bg-gray-100 dark:bg-white/5" />
            </div>
            <button
              onClick={() => navigate("/notifications")}
              className="text-[9px] sm:text-[10px] font-bold text-[#349DC5] uppercase hover:underline"
            >
              View All
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
            {upcomingEvents.length === 0 ? (
              <div className="col-span-full py-12 sm:py-16 text-center bg-white dark:bg-[#1a1c1e] rounded-xl border-2 border-dashed border-gray-100 dark:border-white/5">
                <Calendar size={24} className="mx-auto text-gray-200 mb-3" />
                <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase">
                  No Upcoming Events
                </p>
              </div>
            ) : (
              upcomingEvents.map((ev) => (
                <div
                  key={ev._id}
                  onClick={() => {
                    setSelectedEvent(ev);
                    setEventModalVisible(true);
                  }}
                  className="bg-white dark:bg-[#1a1c1e] p-3 sm:p-5 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 hover:border-[#349DC5]/20 group cursor-pointer transition-all flex flex-col h-full active:scale-95"
                >
                  <div className="flex items-center justify-between mb-3 sm:mb-5">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-50 dark:bg-blue-900/10 rounded-lg flex items-center justify-center text-[#349DC5]">
                        <Clock size={16} />
                      </div>
                      <span className="text-[8px] sm:text-[9px] font-bold text-gray-400 uppercase tabular-nums">
                        {new Date(ev.date).toLocaleDateString()}
                      </span>
                    </div>
                    <ChevronRight
                      size={14}
                      className="text-gray-200 group-hover:text-[#349DC5] transition-all"
                    />
                  </div>
                  <h4 className="font-bold text-[10px] sm:text-xs text-[#00204a] dark:text-white uppercase mb-2 sm:mb-3 line-clamp-2">
                    {ev.title}
                  </h4>
                  <div className="mt-auto flex items-center gap-2 py-2 border-t border-gray-50 dark:border-white/5">
                    <MapPin size={12} className="text-gray-300 shrink-0" />
                    <span className="text-[8px] sm:text-[10px] font-semibold text-gray-400 uppercase truncate">
                      {ev.venue || "Church Venue"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <RoleSwitcher
        isOpen={switchModalVisible}
        onClose={() => setSwitchModalVisible(false)}
      />

      <AnimatePresence>
        {eventModalVisible && selectedEvent && (
          <div
            className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center bg-[#00204a]/70 backdrop-blur-md"
            onClick={() => setEventModalVisible(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl bg-white dark:bg-[#1a1c1e] rounded-t-2xl sm:rounded-xl overflow-hidden shadow-2xl"
            >
              <div className="bg-[#00204a] p-5 sm:p-8 text-white relative h-28 sm:h-36 flex flex-col justify-end">
                <Calendar
                  size={60}
                  className="absolute -top-3 -right-3 opacity-10 rotate-12"
                />
                <h3 className="text-lg sm:text-xl font-bold uppercase leading-tight mb-1">
                  {selectedEvent.title}
                </h3>
                <p className="text-[9px] sm:text-[10px] font-bold text-white/40 uppercase">
                  {new Date(selectedEvent.date).toLocaleString()}
                </p>
              </div>
              <div className="p-5 sm:p-8">
                <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-medium leading-relaxed mb-5 sm:mb-8">
                  {selectedEvent.description || "No event description available."}
                </p>
                <button
                  onClick={() => setEventModalVisible(false)}
                  className="w-full h-10 sm:h-12 bg-[#349DC5] text-white rounded-xl font-bold text-[10px] sm:text-xs uppercase shadow-md active:scale-95 transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
