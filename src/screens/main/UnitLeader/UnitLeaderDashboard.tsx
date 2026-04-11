import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame,
  Users,
  Heart,
  Calendar,
  RefreshCw,
  Bell,
  Shield,
  ArrowUpRight,
  MapPin,
  Clock,
  LayoutGrid,
  Lock,
  Wallet,
  ArrowDownRight,
  ArrowUp,
  X,
  User,
} from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "../../../api/client";
import { BASE_URl } from "../../../api/users";
import {
  getUnitLeaderSummary,
  type UnitLeaderSummary,
} from "../../../api/unitLeader";
import { useSoulsStore } from "../../../context/SoulsStore";
import AsyncStorage from "../../../utils/AsyncStorage";
import RoleSwitcher from "../../../components/RoleSwitcher";
import { AppEventBus } from "../../../utils/AppEventBus";

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

export default function UnitLeaderDashboard() {
  const navigate = useNavigate();
  const { unitCount, refreshAll: refreshSouls } = useSoulsStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<UnitLeaderSummary | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [eventModalOpen, setEventModalOpen] = useState(false);

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setLoading(true);
      else setRefreshing(true);
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          navigate("/login");
          return;
        }

        let u: any = null;
        try {
          const meRes = await apiClient.get(`/api/users/me`);
          if (meRes.data?.ok) {
            u = meRes.data.user;
            const aid = await AsyncStorage.getItem("activeUnitId");
            if (aid) u.activeUnitId = aid === "global" ? null : aid;
          }
        } catch {
          const raw = await AsyncStorage.getItem("user");
          u = raw ? JSON.parse(raw) : null;
        }
        setProfile(u);

        const unitId = u?.activeUnitId || u?.activeUnit?._id || u?.activeUnit || null;
        const [sumRes, convRes, eventsRes] = await Promise.all([
          getUnitLeaderSummary(token, unitId),
          apiClient.get(`/api/messages/conversations`).catch(() => null),
          apiClient.get(`/api/events`).catch(() => ({ data: [] })),
        ]);

        if (sumRes?.ok) setSummary(sumRes);
        if (convRes?.data?.success) {
          const total = (convRes.data.data?.conversations || []).reduce(
            (acc: number, c: any) => acc + (c.unread || 0),
            0,
          );
          setUnreadCount(total);
        }

        const rawE = eventsRes.data?.events || (Array.isArray(eventsRes.data) ? eventsRes.data : []);
        const mappedE = rawE
          .map((e: any) => {
            const dStr = e.isoDate || e.date || e.dateTime || e.startDate;
            const d = dStr ? new Date(dStr) : null;
            return d && !isNaN(d.getTime()) ? { ...e, _d: d } : null;
          })
          .filter((e: any) => e)
          .sort((a: any, b: any) => a._d.getTime() - b._d.getTime())
          .slice(0, 5);
        setAllEvents(mappedE);
        refreshSouls();
      } catch (err) {
        toast.error("Process Failed");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [navigate, refreshSouls],
  );

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isOwnUnit = useMemo(() => {
    if (!summary?.unit || !profile) return false;
    const sUnitId = String(summary.unit._id || summary.unit);
    const pUnitId = String(
      profile.activeUnitId || profile.activeUnit?._id || profile.activeUnit || "",
    );
    return pUnitId === sUnitId;
  }, [summary, profile]);

  if (loading) return null;

  return (
    <div className="flex-1 bg-gray-50 dark:bg-[#0f1218] min-h-screen pb-24 md:pb-10">
      {/* Leadership Header */}
      <div className="bg-[#00204a] px-4 sm:px-6 pt-5 sm:pt-10 pb-12 sm:pb-16">
        <div className="max-w-7xl mx-auto flex flex-col gap-4 sm:gap-6">
          {/* Profile Row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-5 min-w-0">
              <div
                onClick={() => navigate("/profile")}
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-white/10 flex items-center justify-center border-2 border-white/20 cursor-pointer overflow-hidden shadow-lg group relative shrink-0"
              >
                <div className="absolute inset-0 bg-[#349DC5]/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                {profile?.profile?.avatar ? (
                  <img
                    src={profile.profile.avatar}
                    className="w-full h-full object-cover"
                    alt="Avatar"
                  />
                ) : (
                  <Shield size={24} className="text-white/40" />
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-xl md:text-2xl font-bold text-white leading-tight truncate">
                  Welcome, {profile?.title ? `${profile.title} ` : ""}{profile?.firstName || ""}
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-white/60 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider truncate">
                    {summary?.unit?.name || "Active Unit"} • Unit Leader
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              onClick={() => fetchData(true)}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all border border-white/10 active:scale-95"
            >
              <RefreshCw
                size={18}
                className={refreshing ? "animate-spin text-[#349DC5]" : "text-white"}
              />
            </button>
            {Array.isArray(profile?.roles) && profile.roles.length > 1 && (
              <button
                onClick={() => AppEventBus.emit("openRoleSwitcher")}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white text-[#00204a] flex items-center justify-center shadow-lg active:scale-95 transition-all border border-white/20"
                title="Switch Role"
              >
                <LayoutGrid size={18} className="text-[#349DC5]" />
              </button>
            )}
            <button
              onClick={() => navigate("/notifications")}
              className="h-10 sm:h-12 flex-1 px-4 sm:px-5 bg-[#349DC5] text-white rounded-xl font-bold text-[9px] sm:text-[10px] uppercase tracking-wider shadow-lg shadow-blue-900/20 hover:bg-[#2d8ab0] active:scale-95 transition-all flex items-center justify-center gap-2 relative"
            >
              <Bell size={16} />
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 text-white rounded-full text-[9px] font-black flex items-center justify-center px-1 shadow-md">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 -mt-6 sm:-mt-8">
        {/* Unit Performance Cards */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4 md:gap-6 mb-6 sm:mb-10">
          <div
            onClick={() => navigate("/member-list")}
            className="bg-white dark:bg-[#1a1c1e] p-4 sm:p-6 md:p-8 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 cursor-pointer group hover:border-[#349DC5]/20 transition-all active:scale-95"
          >
            <div className="flex items-center justify-between mb-3 sm:mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 dark:bg-blue-900/10 rounded-lg sm:rounded-xl flex items-center justify-center text-[#349DC5]">
                <Users size={20} />
              </div>
              <ArrowUpRight
                size={16}
                className="text-gray-200 group-hover:text-[#349DC5] transition-all"
              />
            </div>
            <p className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
              Unit Members
            </p>
            <h3 className="text-xl sm:text-3xl md:text-4xl font-bold text-[#00204a] dark:text-white leading-none">
              {summary?.membersCount || 0}
            </h3>
            <p className="text-[7px] sm:text-[9px] font-semibold text-gray-300 uppercase mt-1 sm:mt-3 hidden sm:block">
              View Member List
            </p>
          </div>

          <div
            onClick={() => navigate("/soul-harvested", { state: { scope: "unit" } })}
            className="bg-white dark:bg-[#1a1c1e] p-4 sm:p-6 md:p-8 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 cursor-pointer group hover:border-rose-500/20 transition-all active:scale-95"
          >
            <div className="flex items-center justify-between mb-3 sm:mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-rose-50 dark:bg-rose-950/20 rounded-lg sm:rounded-xl flex items-center justify-center text-rose-500">
                <Flame size={20} />
              </div>
              <ArrowUpRight
                size={16}
                className="text-gray-200 group-hover:text-rose-500 transition-all"
              />
            </div>
            <p className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
              Soul Harvested
            </p>
            <h3 className="text-xl sm:text-3xl md:text-4xl font-bold text-[#00204a] dark:text-white leading-none">
              {unitCount || 0}
            </h3>
          </div>
        </div>

        {/* Financial Summary */}
        <section className="mb-6 sm:mb-12">
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <h3 className="text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-wider leading-none whitespace-nowrap">
              Financial Summary
            </h3>
            <div className="h-px flex-1 bg-gray-100 dark:bg-white/5" />
          </div>

          <div
            className={cn(
              "p-4 sm:p-6 md:p-8 rounded-xl border transition-all cursor-pointer active:scale-[0.99]",
              isOwnUnit
                ? "bg-white dark:bg-[#1a1c1e] border-gray-100 dark:border-white/5 shadow-sm hover:border-[#349DC5]/20"
                : "bg-gray-50/50 dark:bg-black/20 border-2 border-dashed border-gray-200 dark:border-white/10 opacity-60",
            )}
            onClick={() => {
              if (isOwnUnit) navigate("/finance-summary");
            }}
          >
            <div className="flex flex-col gap-3 sm:gap-5">
              <div className="flex items-center justify-between border-b border-gray-50 dark:border-white/5 pb-3 sm:pb-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-50 dark:bg-indigo-900/10 rounded-lg flex items-center justify-center text-indigo-500">
                    <Wallet size={16} />
                  </div>
                  <div>
                    <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Total Balance
                    </p>
                    <p className="text-[8px] sm:text-[9px] font-bold text-emerald-500 uppercase mt-0.5">
                      Current Total
                    </p>
                  </div>
                </div>
                <h3 className="text-base sm:text-2xl md:text-3xl font-bold text-[#00204a] dark:text-white tabular-nums">
                  {isOwnUnit ? `₦${(summary?.finance?.balance || 0).toLocaleString()}` : "_"}
                </h3>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-[10px] sm:text-[12px] font-bold text-gray-500 dark:text-gray-400">
                  Total Income
                </p>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <ArrowUp className="text-emerald-500" size={14} />
                  <h4 className="text-sm sm:text-lg md:text-xl font-bold text-[#00204a] dark:text-white tabular-nums">
                    {isOwnUnit ? `₦${(summary?.finance?.income || 0).toLocaleString()}` : "_"}
                  </h4>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-[10px] sm:text-[12px] font-bold text-gray-500 dark:text-gray-400">
                  Total Expenditure
                </p>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <ArrowDownRight className="text-rose-500" size={14} />
                  <h4 className="text-sm sm:text-lg md:text-xl font-bold text-[#00204a] dark:text-white tabular-nums">
                    {isOwnUnit ? `₦${(summary?.finance?.expense || 0).toLocaleString()}` : "_"}
                  </h4>
                </div>
              </div>
            </div>
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
              onClick={() => navigate("/sa/events")}
              className="text-[9px] sm:text-[10px] font-bold text-[#349DC5] uppercase hover:underline"
            >
              View All
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
            {allEvents.length === 0 ? (
              <div className="col-span-full py-12 sm:py-16 text-center bg-white dark:bg-[#1a1c1e] rounded-xl border-2 border-dashed border-gray-100 dark:border-white/5">
                <Calendar size={24} className="text-gray-200 mx-auto mb-3" />
                <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase">
                  No Upcoming Events
                </p>
              </div>
            ) : (
              allEvents.map((ev) => (
                <div
                  key={ev._id}
                  onClick={() => {
                    setSelectedEvent(ev);
                    setEventModalOpen(true);
                  }}
                  className="bg-white dark:bg-[#1a1c1e] p-3 sm:p-5 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 group cursor-pointer transition-all hover:border-[#349DC5]/20 active:scale-95"
                >
                  <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-6">
                    <div className="w-11 h-11 sm:w-14 sm:h-14 bg-blue-50 dark:bg-blue-900/10 rounded-lg sm:rounded-xl flex flex-col items-center justify-center border border-blue-100 dark:border-white/5 shrink-0 group-hover:bg-[#349DC5] group-hover:text-white transition-all">
                      <span className="text-[7px] sm:text-[9px] font-bold uppercase leading-none mb-0.5 opacity-60">
                        {ev._d.toLocaleDateString(undefined, { month: "short" })}
                      </span>
                      <span className="text-lg sm:text-2xl font-bold leading-none">
                        {ev._d.getDate()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-[10px] sm:text-xs text-[#00204a] dark:text-white uppercase leading-tight line-clamp-2">
                        {ev.title}
                      </h4>
                      <p className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase mt-1 tabular-nums">
                        {ev._d.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="mt-auto pt-2 sm:pt-4 border-t border-gray-50 dark:border-white/5 flex items-center gap-2">
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

      {/* Event Modal */}
      <AnimatePresence>
        {eventModalOpen && selectedEvent && (
          <div
            className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center bg-[#00204a]/70 backdrop-blur-md"
            onClick={() => setEventModalOpen(false)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl bg-white dark:bg-[#1a1c1e] rounded-t-2xl sm:rounded-xl overflow-hidden shadow-2xl"
            >
              <div className="bg-[#00204a] p-5 sm:p-8 text-white relative flex flex-col justify-end h-28 sm:h-40">
                <Calendar
                  size={70}
                  className="absolute -top-4 -right-4 opacity-10 rotate-12"
                />
                <h3 className="text-lg sm:text-xl font-bold uppercase leading-tight mb-1 sm:mb-2">
                  {selectedEvent.title}
                </h3>
                <div className="flex items-center gap-3 text-white/40 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock size={10} /> {selectedEvent._d.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin size={10} /> {selectedEvent.venue}
                  </span>
                </div>
              </div>
              <div className="p-5 sm:p-8">
                <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-medium leading-relaxed mb-5 sm:mb-8">
                  {selectedEvent.description || "No event description provided."}
                </p>
                <div className="flex gap-2.5 sm:gap-3">
                  <button
                    onClick={() => setEventModalOpen(false)}
                    className="flex-1 h-10 sm:h-12 bg-gray-50 dark:bg-white/5 text-gray-400 rounded-xl font-bold text-[10px] sm:text-xs uppercase active:scale-95 transition-transform"
                  >
                    Close
                  </button>
                  <button className="flex-[2] h-10 sm:h-12 bg-[#349DC5] text-white rounded-xl font-bold text-[10px] sm:text-xs uppercase shadow-md active:scale-95 transition-transform">
                    Share Event
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
