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
  Lock,
  Wallet,
  ArrowDownRight,
  ArrowUp,
  X,
  User,
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { BASE_URl } from "../../../api/users";
import {
  getUnitLeaderSummary,
  type UnitLeaderSummary,
} from "../../../api/unitLeader";
import { useSoulsStore } from "../../../context/SoulsStore";
import AsyncStorage from "../../../utils/AsyncStorage";
import RoleSwitcher from "../../../components/RoleSwitcher";

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
  const [switchModalVisible, setSwitchModalVisible] = useState(false);

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
          const meRes = await axios.get(`${BASE_URl}/api/users/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
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
          axios
            .get(`${BASE_URl}/api/messages/conversations`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .catch(() => null),
          axios
            .get(`${BASE_URl}/api/events`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .catch(() => ({ data: [] })),
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
    <div className="flex-1 bg-gray-50 dark:bg-[#0f1218] min-h-screen pb-32">
      {/* Leadership Header */}
      <div className="bg-[#00204a] px-6 py-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div
              onClick={() => navigate("/profile")}
              className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center border-2 border-white/20 cursor-pointer overflow-hidden shadow-lg group relative"
            >
              <div className="absolute inset-0 bg-[#349DC5]/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              {profile?.profile?.avatar ? (
                <img
                  src={profile.profile.avatar}
                  className="w-full h-full object-cover"
                  alt="Avatar"
                />
              ) : (
                <Shield size={32} className="text-white/40" />
              )}
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-2 leading-none">
                Welcome, {profile?.title ? `${profile.title} ` : ""}{profile?.firstName || ""}
              </h2>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest">
                  {summary?.unit?.name || "Active Unit"} • Unit Leader
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => fetchData(true)}
              className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all border border-white/10"
            >
              <RefreshCw
                size={22}
                className={refreshing ? "animate-spin text-[#349DC5]" : "text-white/60"}
              />
            </button>
            <button
              onClick={() => navigate("/notifications")}
              className="h-14 px-8 bg-[#349DC5] text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-md hover:bg-[#2d8ab0] active:scale-95 transition-all flex items-center gap-3"
            >
              <Bell size={18} />
              Notifications
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
        {/* Unit Performance Assets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div
            onClick={() => navigate("/member-list")}
            className="bg-white dark:bg-[#1a1c1e] p-8 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 cursor-pointer group hover:border-[#349DC5]/20 transition-all active:scale-95"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/10 rounded-xl flex items-center justify-center text-[#349DC5] shadow-inner">
                <Users size={32} />
              </div>
              <ArrowUpRight
                size={20}
                className="text-gray-200 group-hover:text-[#349DC5] transition-all"
              />
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
              Total Unit Members
            </p>
            <h3 className="text-5xl font-bold text-[#00204a] dark:text-white leading-none">
              {summary?.membersCount || 0}
            </h3>
            <p className="text-[9px] font-bold text-gray-300 uppercase mt-4">
              View Member List
            </p>
          </div>

          <div
            onClick={() => navigate("/soul-harvested", { state: { scope: "unit" } })}
            className="bg-white dark:bg-[#1a1c1e] p-8 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 cursor-pointer group hover:border-rose-500/20 transition-all active:scale-95"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/20 rounded-xl flex items-center justify-center text-rose-500 shadow-inner">
                <Flame size={32} />
              </div>
              <ArrowUpRight
                size={20}
                className="text-gray-200 group-hover:text-rose-500 transition-all"
              />
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
              Soul Harvested (Unit)
            </p>
            <h3 className="text-5xl font-bold text-[#00204a] dark:text-white leading-none">
              {unitCount || 0}
            </h3>
          </div>
        </div>

        {/* Global Treasury Access */}
        <section className="mb-14">
          <div className="flex items-center gap-4 mb-8">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-none">
              Financial Summary
            </h3>
            <div className="h-px flex-1 bg-gray-100 dark:bg-white/5" />
          </div>

          <div
            className={cn(
              "p-8 rounded-xl border transition-all cursor-pointer",
              isOwnUnit
                ? "bg-white dark:bg-[#1a1c1e] border-gray-100 dark:border-white/5 shadow-sm hover:border-[#349DC5]/20"
                : "bg-gray-50/50 dark:bg-black/20 border-2 border-dashed border-gray-200 dark:border-white/10 opacity-60",
            )}
            onClick={() => {
              if (isOwnUnit) navigate("/finance-summary");
            }}
          >
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between border-b border-gray-50 dark:border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/10 rounded-lg flex items-center justify-center text-indigo-500">
                    <Wallet size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Total Balance
                    </p>
                    <p className="text-[9px] font-bold text-emerald-500 uppercase mt-0.5">
                      Current Total
                    </p>
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-[#00204a] dark:text-white tabular-nums">
                  {isOwnUnit ? `₦${(summary?.finance?.balance || 0).toLocaleString()}` : "_"}
                </h3>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-[12px] font-bold text-gray-500 dark:text-gray-400">
                  Total Income
                </p>
                <div className="flex items-center gap-3">
                  <ArrowUp className="text-emerald-500" size={16} />
                  <h4 className="text-xl font-bold text-[#00204a] dark:text-white tabular-nums">
                    {isOwnUnit ? `₦${(summary?.finance?.income || 0).toLocaleString()}` : "_"}
                  </h4>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-[12px] font-bold text-gray-500 dark:text-gray-400">
                  Total Expenditure
                </p>
                <div className="flex items-center gap-3">
                  <ArrowDownRight className="text-rose-500" size={16} />
                  <h4 className="text-xl font-bold text-[#00204a] dark:text-white tabular-nums">
                    {isOwnUnit ? `₦${(summary?.finance?.expense || 0).toLocaleString()}` : "_"}
                  </h4>
                </div>
              </div>
            </div>
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
              onClick={() => navigate("/sa/events")}
              className="text-[10px] font-bold text-[#349DC5] uppercase hover:underline"
            >
              View All Events
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {allEvents.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-white dark:bg-[#1a1c1e] rounded-xl border-2 border-dashed border-gray-100 dark:border-white/5">
                <Calendar size={32} className="text-gray-200 mx-auto mb-4" />
                <p className="text-[10px] font-bold text-gray-400 uppercase">
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
                  className="bg-white dark:bg-[#1a1c1e] p-7 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 group cursor-pointer transition-all hover:border-[#349DC5]/20"
                >
                  <div className="flex items-center gap-5 mb-8">
                    <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/10 rounded-xl flex flex-col items-center justify-center border border-blue-100 dark:border-white/5 shrink-0 group-hover:bg-[#349DC5] group-hover:text-white transition-all">
                      <span className="text-[9px] font-bold uppercase leading-none mb-1 opacity-60">
                        {ev._d.toLocaleDateString(undefined, { month: "short" })}
                      </span>
                      <span className="text-2xl font-bold leading-none">
                        {ev._d.getDate()}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-[#00204a] dark:text-white uppercase leading-tight line-clamp-2">
                        {ev.title}
                      </h4>
                      <p className="text-[10px] font-bold text-gray-400 uppercase mt-2 tabular-nums">
                        {ev._d.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="mt-auto pt-5 border-t border-gray-50 dark:border-white/5 flex items-center gap-3">
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

      <AnimatePresence>
        {eventModalOpen && selectedEvent && (
          <div
            className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-[#00204a]/70 backdrop-blur-md"
            onClick={() => setEventModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl bg-white dark:bg-[#1a1c1e] rounded-xl overflow-hidden shadow-2xl"
            >
              <div className="bg-[#00204a] p-10 text-white relative flex flex-col justify-end h-48">
                <Calendar
                  size={100}
                  className="absolute -top-6 -right-6 opacity-10 rotate-12"
                />
                <h3 className="text-2xl font-bold uppercase leading-tight mb-3">
                  {selectedEvent.title}
                </h3>
                <div className="flex items-center gap-4 text-white/40 text-[10px] font-bold uppercase tracking-widest">
                  <span className="flex items-center gap-2">
                    <Clock size={12} /> {selectedEvent._d.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-2">
                    <MapPin size={12} /> {selectedEvent.venue}
                  </span>
                </div>
              </div>
              <div className="p-10">
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium leading-relaxed mb-10">
                  {selectedEvent.description || "No event description provided."}
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setEventModalOpen(false)}
                    className="flex-1 h-16 bg-gray-50 dark:bg-white/5 text-gray-400 rounded-xl font-bold text-xs uppercase"
                  >
                    Close
                  </button>
                  <button className="flex-[2] h-16 bg-[#349DC5] text-white rounded-xl font-bold text-xs uppercase shadow-md">
                    Share Event
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <RoleSwitcher
        isOpen={switchModalVisible}
        onClose={() => setSwitchModalVisible(false)}
      />
    </div>
  );
}
