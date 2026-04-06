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
    <div className="flex-1 bg-gray-50 dark:bg-[#0f1218] min-h-screen pb-32">
      {/* Professional Header */}
      <div className="bg-[#00204a] px-6 py-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div
              onClick={() => navigate("/profile")}
              className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center border-2 border-white/20 cursor-pointer overflow-hidden shadow-lg group relative"
            >
              {profile?.profile?.avatar ? (
                <img
                  src={profile.profile.avatar}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={40} className="text-white/40" />
              )}
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-2 leading-none">
                Welcome, {profile?.title ? `${profile.title} ` : ""}{profile?.firstName || "Member"}
              </h2>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-[#349DC5] text-white text-[10px] font-bold uppercase rounded-lg shadow-sm">
                  {profile?.activeRole || "Member"}
                </span>
                <span className="text-white/60 text-xs font-bold uppercase tracking-wider">
                  {profile?.activeUnitName || "Unit Hub"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/notifications")}
              className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center relative hover:bg-white/20 transition-all border border-white/10"
            >
              <Bell size={24} className="text-white" />
              <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-[#00204a]" />
            </button>
            {Array.isArray(profile?.roles) && profile.roles.length > 1 && (
              <button
                onClick={() => setSwitchModalVisible(true)}
                className="h-14 px-8 bg-white text-[#00204a] rounded-xl font-bold text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all"
              >
                Switch Role
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-8">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white dark:bg-[#1a1c1e] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-[#349DC5]">
                <Users size={20} />
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Total Unit Members
              </span>
            </div>
            <h3 className="text-3xl font-bold text-[#00204a] dark:text-white leading-none">
              {unitSummary?.counts?.membersCount || 0}
            </h3>
            <p className="text-[10px] font-bold text-[#349DC5] uppercase mt-1">
              Active Unit Members
            </p>
          </div>

          <div className="bg-white dark:bg-[#1a1c1e] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-rose-50 dark:bg-rose-950/20 rounded-lg text-rose-500">
                <Flame size={20} />
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Soul Harvested
              </span>
            </div>
            <h3 className="text-3xl font-bold text-[#00204a] dark:text-white leading-none">
              {unitCount || 0}
            </h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase mt-2">
              Soul Harvested (Unit)
            </p>
          </div>

          {hasFinSecDuty && (
            <div className="md:col-span-2 bg-white dark:bg-[#1a1c1e] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg text-emerald-500">
                    <Activity size={20} />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Financial Summary
                  </span>
                </div>
                <button
                  onClick={() => navigate("/finance-summary")}
                  className="text-[10px] font-bold text-[#349DC5] uppercase hover:underline"
                >
                  View Details
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">
                    Income
                  </p>
                  <p className="text-base font-bold text-emerald-500 tabular-nums">
                    ₦{summaryTotals.income.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">
                    Expenses
                  </p>
                  <p className="text-base font-bold text-rose-500 tabular-nums">
                    ₦{summaryTotals.expense.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">
                    Surplus/Deficit
                  </p>
                  <p className="text-base font-bold text-[#00204a] dark:text-white tabular-nums">
                    ₦{summaryTotals.net.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Links */}
        <section className="mb-14">
          <div className="flex items-center gap-4 mb-8">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-none">
              Quick Links
            </h3>
            <div className="h-px flex-1 bg-gray-100 dark:bg-white/5" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-6">
            {CORE_REPORTS.map((key) => {
              const card = UNIT_CARD_CONFIG[key];
              if (!card) return null;
              return (
                <button
                  key={key}
                  onClick={() => navigate(card.route!, { state: card.state })}
                  className="bg-white dark:bg-[#1a1c1e] p-8 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 flex flex-col items-center text-center group hover:border-[#349DC5]/30 transition-all active:scale-95"
                >
                  <div
                    className={cn(
                      "w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-inner",
                      card.bg,
                      card.color,
                    )}
                  >
                    {card.icon}
                  </div>
                  <span className="text-xs font-bold text-[#00204a] dark:text-white uppercase leading-tight">
                    {card.title}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Upcoming Events */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-none">
                Upcoming Events
              </h3>
              <div className="h-px w-24 bg-gray-100 dark:bg-white/5" />
            </div>
            <button
              onClick={() => navigate("/notifications")}
              className="text-[10px] font-bold text-[#349DC5] uppercase hover:underline"
            >
              View All
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingEvents.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-white dark:bg-[#1a1c1e] rounded-xl border-2 border-dashed border-gray-100 dark:border-white/5">
                <Calendar size={32} className="mx-auto text-gray-200 mb-4" />
                <p className="text-[10px] font-bold text-gray-400 uppercase">
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
                  className="bg-white dark:bg-[#1a1c1e] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 hover:border-[#349DC5]/20 group cursor-pointer transition-all flex flex-col h-full"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/10 rounded-lg flex items-center justify-center text-[#349DC5]">
                        <Clock size={18} />
                      </div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase tabular-nums">
                        {new Date(ev.date).toLocaleDateString()}
                      </span>
                    </div>
                    <ChevronRight
                      size={18}
                      className="text-gray-200 group-hover:text-[#349DC5] transition-all"
                    />
                  </div>
                  <h4 className="font-bold text-[#00204a] dark:text-white uppercase mb-4 line-clamp-2 min-h-[3rem]">
                    {ev.title}
                  </h4>
                  <div className="mt-auto flex items-center gap-3 py-3 border-t border-gray-50 dark:border-white/5">
                    <MapPin size={14} className="text-gray-300" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase truncate">
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
            className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-4 bg-[#00204a]/70 backdrop-blur-md"
            onClick={() => setEventModalVisible(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl bg-white dark:bg-[#1a1c1e] rounded-xl overflow-hidden shadow-2xl"
            >
              <div className="bg-[#00204a] p-10 text-white relative h-40 flex flex-col justify-end">
                <Calendar
                  size={80}
                  className="absolute -top-4 -right-4 opacity-10 rotate-12"
                />
                <h3 className="text-2xl font-bold uppercase leading-none mb-3">
                  {selectedEvent.title}
                </h3>
                <p className="text-[10px] font-bold text-white/40 uppercase">
                  {new Date(selectedEvent.date).toLocaleString()}
                </p>
              </div>
              <div className="p-10">
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium leading-relaxed mb-10">
                  {selectedEvent.description || "No event description available."}
                </p>
                <button
                  onClick={() => setEventModalVisible(false)}
                  className="w-full h-14 bg-[#349DC5] text-white rounded-xl font-bold text-xs uppercase shadow-md active:scale-95 transition-all"
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
