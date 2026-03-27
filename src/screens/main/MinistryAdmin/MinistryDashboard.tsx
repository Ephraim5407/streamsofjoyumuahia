import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Users,
  Calendar,
  RefreshCw,
  Bell,
  ArrowUpRight,
  MapPin,
  Clock,
  TrendingUp,
  Wallet,
  X,
  UserCheck,
  Flame,
  LayoutGrid,
  Receipt,
  Briefcase,
  MessageSquare,
  PieChart,
  User,
  ChevronRight,
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { BASE_URl } from "../../../api/users";
import { getMinistrySummary } from "../../../api/summary";
import { getFinancialTotals } from "../../../api/adminFinance";
import {
  getYSAttendances,
  getMainChurchAttendances,
} from "../../../api/attendance";
import AsyncStorage from "../../../utils/AsyncStorage";
import RoleSwitcher from "../../../components/RoleSwitcher";

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

const MENU_ITEMS = [
  { title: "Unit Hubs", route: "/sa/unit-dashboards", icon: <LayoutGrid />, color: "bg-[#1e40af]" },
  { title: "Workers Demographics", route: "/member-list", icon: <Users />, color: "bg-[#166534]" },
  { title: "New Members", route: "/member-list", icon: <UserCheck />, color: "bg-[#c2410c]" },
  { title: "Income Records", route: "/admin-finance/income", icon: <TrendingUp />, color: "bg-[#991b1b]" },
  { title: "Expense Records", route: "/admin-finance/expenses", icon: <Receipt />, color: "bg-[#6b21a8]" },
  { title: "Finance Summary", route: "/admin-finance/summary", icon: <PieChart />, color: "bg-[#0f766e]" },
  { title: "Events & Announcements", route: "/sa/events-announcements", icon: <Calendar />, color: "bg-[#be185d]" },
  { title: "Manage Unit Leaders", route: "/sa/manage-unit", icon: <Shield />, color: "bg-[#4d7c0f]" },
  { title: "Notifications", route: "/notifications", icon: <Bell />, color: "bg-[#9a3412]" },
  { title: "Profile Settings", route: "/profile", icon: <User />, color: "bg-[#312e81]" },
  { title: "Messages", route: "/notifications/compose", icon: <MessageSquare />, color: "bg-[#0891b2]" },
  { title: "Help & Support", route: "/support", icon: <Briefcase />, color: "bg-[#374151]" },
];

export default function MinistryDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [finTotals, setFinTotals] = useState<any>(null);
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [avgAttendance, setAvgAttendance] = useState<number>(0);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRoleSwitcherOpen, setIsRoleSwitcherOpen] = useState(false);

  const currentMinistry = useMemo(() => {
    if (!profile?.roles) return "Global Ministry";
    const activeRoleData = profile.roles.find((r: any) => r?.role === profile?.activeRole);
    return activeRoleData?.ministryName || "Global Ministry";
  }, [profile]);

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

        const meRes = await axios.get(`${BASE_URl}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const u = meRes.data?.ok ? meRes.data.user : null;
        setProfile(u);

        const activeRoleData = (u?.roles || []).find((r: any) => r?.role === u?.activeRole);
        const minName = activeRoleData?.ministryName || "Global Ministry";

        const [sumRes, eventsRes, attendances] = await Promise.all([
          getMinistrySummary({ ministry: minName }),
          axios
            .get(`${BASE_URl}/api/events`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .catch(() => ({ data: { ok: false, events: [] } })),
          (minName.toLowerCase().includes("youth") ||
          minName.toLowerCase().includes("single")
            ? getYSAttendances()
            : getMainChurchAttendances()
          ).catch(() => []),
        ]);

        if (sumRes?.ok) setSummary(sumRes);

        // Calculate Average Attendance
        if (Array.isArray(attendances) && attendances.length > 0) {
          const currentYear = new Date().getFullYear();
          const yearData = attendances.filter(
            (a: any) => new Date(a.date).getFullYear() === currentYear,
          );
          const total = yearData.reduce((sum, a) => sum + (a.total || 0), 0);
          const avg =
            yearData.length > 0 ? Math.round(total / yearData.length) : 0;
          setAvgAttendance(avg);
        }

        const rawE = eventsRes.data?.events || eventsRes.data?.data || (Array.isArray(eventsRes.data) ? eventsRes.data : []);
        const now = new Date();
        const mappedE = rawE
          .map((e: any) => {
            const dStr = e.isoDate || e.date || e.dateTime || e.startDate;
            const d = dStr ? new Date(dStr) : null;
            return d && !isNaN(d.getTime()) ? { ...e, _d: d } : null;
          })
          .filter((e: any) => e)
          .sort((a: any, b: any) => a._d.getTime() - b._d.getTime())
          .filter((e: any) => e._d >= now || allEvents.length < 4) // Show future, or fallback to soonest if none
          .slice(0, 4);
        setAllEvents(mappedE);
      } catch (err) {
        toast.error("Process Failed");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [navigate],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (profile) {
      getFinancialTotals(currentMinistry).then(setFinTotals).catch(() => null);
    }
  }, [profile, currentMinistry]);

  if (loading) return null;

  return (
    <div className="flex-1 bg-gray-50 dark:bg-[#0f1218] min-h-screen pb-32">
      {/* Ministry Header */}
      <div className="bg-[#00204a] px-6 py-12 pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col gap-10">
            {/* Identity & Actions Container */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div 
                  onClick={() => navigate("/profile")}
                  className="w-16 h-16 rounded-2xl bg-[#349DC5] border-4 border-white/10 shadow-xl overflow-hidden cursor-pointer active:scale-95 transition-all"
                >
                   {profile?.profile?.avatar ? (
                    <img src={profile.profile.avatar} className="w-full h-full object-cover" alt="Profile" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white">
                      <User size={30} />
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white leading-tight uppercase tracking-tight">
                    {profile?.firstName ? `Welcome, ${profile?.title ? profile.title + ' ' : ''}${profile.firstName}` : "Ministry Admin"}
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-white/40 text-[9px] font-black uppercase tracking-[0.2em]">
                      {currentMinistry} Authority
                    </span>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setIsRoleSwitcherOpen(true)}
                className="hidden sm:flex items-center gap-3 px-6 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-xl transition-all active:scale-95"
              >
                <LayoutGrid size={18} className="text-[#349DC5]" />
                <span className="text-[10px] font-black uppercase tracking-widest leading-none">Switch Role</span>
              </button>
            </div>

            {/* Mobile Selection & Intelligence Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <button 
                onClick={() => setIsRoleSwitcherOpen(true)}
                className="flex sm:hidden flex-1 items-center justify-center gap-3 h-14 bg-[#349DC5] text-white rounded-2xl shadow-lg shadow-blue-900/40 active:scale-95 transition-all"
              >
                <LayoutGrid size={20} />
                <span className="text-[11px] font-black uppercase tracking-widest">Switch Role</span>
              </button>
              
              <button
                onClick={() => fetchData(true)}
                className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all border border-white/10 text-white/60"
              >
                <RefreshCw size={22} className={refreshing ? "animate-spin text-[#349DC5]" : ""} />
              </button>
              
              <button
                onClick={() => navigate("/notifications")}
                className="flex items-center gap-3 h-14 px-6 bg-white/5 text-white rounded-2xl border border-white/10 hover:bg-white/10 transition-all active:scale-95"
              >
                <Bell size={20} className="text-[#349DC5]" />
                <span className="text-[10px] font-black uppercase tracking-widest">Notifications</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-8">
        {/* Core KPIs */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
          <div className="lg:col-span-8">
            <div className="bg-white dark:bg-[#1a1c1e] p-10 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 relative overflow-hidden h-full flex flex-col justify-between group">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-[#00204a] dark:text-[#349DC5]">
                    <Users size={32} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                      Total Number of Workers
                    </h3>
                    <p className="text-[10px] font-bold text-[#349DC5] uppercase mt-1">
                      Active Unit Members
                    </p>
                  </div>
                </div>
                <h2 className="text-7xl font-bold text-[#00204a] dark:text-white leading-none tabular-nums">
                  {(summary?.totals?.workersTotal || 0).toLocaleString()}
                </h2>
              </div>
              <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all">
                <Users size={200} />
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-white dark:bg-[#1a1c1e] p-8 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 flex flex-col justify-center">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-500 flex items-center justify-center">
                  <Flame size={24} />
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  No. of Soul Harvested
                </span>
              </div>
              <h3 className="text-4xl font-bold text-[#00204a] dark:text-white leading-none">
                {(summary?.totals?.soulsWon || 0).toLocaleString()}
              </h3>
            </div>
            <div className="bg-white dark:bg-[#1a1c1e] p-8 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 flex flex-col justify-center">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 flex items-center justify-center">
                  <UserCheck size={24} />
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Average Attendance
                </span>
              </div>
              <h3 className="text-4xl font-bold text-[#00204a] dark:text-white leading-none">
                {avgAttendance.toLocaleString()}
              </h3>
            </div>
          </div>
        </div>

        {/* Global Treasury Briefing */}
        <section className="mb-14">
          <div className="flex items-center gap-4 mb-8">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-none">
              Financial Summary
            </h3>
            <div className="h-px flex-1 bg-gray-100 dark:bg-white/5" />
          </div>

          <div
            onClick={() => navigate("/admin-finance/summary", { state: { ministry: currentMinistry } })}
            className="bg-[#00204a] p-10 rounded-xl text-white shadow-lg cursor-pointer group relative overflow-hidden"
          >
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-10">
              <div className="md:col-span-2">
                <div className="flex items-center gap-4 mb-6">
                  <Wallet size={20} className="text-cyan-400" />
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                    Total Balance
                  </span>
                </div>
                <h3 className="text-5xl font-bold leading-none tabular-nums">
                  ₦{(finTotals?.balance || 0).toLocaleString()}
                </h3>
                <p className="text-[10px] font-bold text-cyan-400 uppercase mt-4 tracking-widest">
                  Current Liquidity Pool ({currentMinistry})
                </p>
              </div>
              <div className="flex flex-col justify-end">
                <p className="text-[10px] font-bold text-white/30 uppercase mb-4 tracking-widest">
                  Total Income
                </p>
                <h4 className="text-2xl font-bold text-emerald-400">
                  ₦{(finTotals?.totalIncome || 0).toLocaleString()}
                </h4>
              </div>
              <div className="flex flex-col justify-end">
                <p className="text-[10px] font-bold text-white/30 uppercase mb-4 tracking-widest">
                  Total Expenditure
                </p>
                <h4 className="text-2xl font-bold text-rose-400">
                  ₦{(finTotals?.totalExpense || 0).toLocaleString()}
                </h4>
              </div>
            </div>
            <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-110 transition-transform">
              <PieChart size={180} />
            </div>
          </div>
        </section>

        {/* Upcoming Events */}
        <section className="mb-20">
          <div className="flex items-center justify-between mb-10 px-2">
            <div className="flex items-center gap-4">
              <div className="w-1.5 h-8 bg-[#349DC5] rounded-full" />
              <div>
                <h3 className="text-xl font-black text-[#00204a] dark:text-white uppercase tracking-tighter">Upcoming Events</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1 opacity-60">Latest church activities & services</p>
              </div>
            </div>
            <button
               onClick={() => navigate("/sa/events-announcements")}
              className="px-6 py-3 rounded-xl bg-gray-50 dark:bg-white/5 text-[10px] font-black text-[#349DC5] uppercase tracking-widest hover:bg-[#349DC5] hover:text-white transition-all shadow-sm"
            >
              View Full Feed
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {allEvents.length > 0 ? (
              allEvents.map((ev, i) => (
                <motion.div
                  key={ev._id || i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => {
                    setSelectedEvent(ev);
                    setEventModalOpen(true);
                  }}
                  className="bg-white dark:bg-[#1a1c1e] p-7 rounded-[32px] shadow-sm border border-gray-100 dark:border-white/5 cursor-pointer group hover:shadow-2xl hover:shadow-blue-900/5 transition-all relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#349DC5]/5 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform" />
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/10 dark:to-white/5 rounded-2xl flex flex-col items-center justify-center text-[#349DC5] border border-blue-100 dark:border-blue-900/20 shadow-inner shrink-0 group-hover:rotate-6 transition-transform">
                      <span className="text-[8px] font-black uppercase tracking-tighter mb-0.5 opacity-60 font-mono">
                         {ev._d.toLocaleDateString(undefined, { month: "short" })}
                      </span>
                      <span className="text-2xl font-black leading-none tracking-tighter">
                        {ev._d.getDate()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-black text-[#00204a] dark:text-white uppercase leading-tight line-clamp-2 min-h-[2.5rem] group-hover:text-[#349DC5] transition-colors tracking-tight">
                        {ev.title}
                      </h4>
                    </div>
                  </div>
                  <div className="pt-5 border-t border-gray-50 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin size={12} className="text-gray-300" />
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest truncate max-w-[100px]">
                        {ev.venue || "HQ Ops"}
                      </span>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-300 group-hover:bg-[#349DC5] group-hover:text-white transition-all shrink-0">
                      <ChevronRight size={18} />
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full py-24 text-center bg-white/50 dark:bg-white/[0.02] rounded-[40px] border-2 border-dashed border-gray-100 dark:border-white/5">
                <div className="w-20 h-20 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center mx-auto mb-6">
                  <Calendar size={40} className="text-gray-200" />
                </div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-[0.4em]">Zero Active Registry</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-2 opacity-60">Awaiting central command broadcast</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Command Modals */}
      <AnimatePresence>
        {isMenuOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="absolute inset-0 bg-[#00204a]/70 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-4xl bg-white dark:bg-[#1a1c1e] rounded-[32px] p-10 overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h3 className="text-2xl font-bold text-[#00204a] dark:text-white uppercase leading-none">
                    Menu
                  </h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mt-2">
                    Ministry Access
                  </p>
                </div>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl text-gray-400 hover:text-rose-500 transition-all border border-gray-100 dark:border-white/5"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {MENU_ITEMS.map((m, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      navigate(m.route);
                      setIsMenuOpen(false);
                    }}
                    className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-gray-50 dark:bg-white/5 hover:bg-[#349DC5]/10 group transition-all border border-transparent hover:border-[#349DC5]/20"
                  >
                    <div
                      className={cn(
                        "w-14 h-14 rounded-xl flex items-center justify-center text-white shadow shadow-blue-900/10 group-hover:scale-110 transition-transform",
                        m.color,
                      )}
                    >
                      {m.icon}
                    </div>
                    <span className="text-[10px] font-bold text-[#00204a] dark:text-white uppercase tracking-wider text-center">
                      {m.title}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}

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
              <div className="bg-[#00204a] p-10 text-white relative flex flex-col justify-end h-44">
                <Calendar size={80} className="absolute -top-4 -right-4 opacity-10 rotate-12" />
                <h3 className="text-2xl font-bold uppercase leading-tight mb-3">
                  {selectedEvent.title}
                </h3>
                <div className="flex items-center gap-4 text-white/40 text-[10px] font-bold uppercase tracking-widest">
                  <span className="flex items-center gap-2">
                    <Clock size={12} /> {selectedEvent._d.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="p-10">
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium leading-relaxed mb-10">
                  {selectedEvent.description || "No event details available."}
                </p>
                <button
                  onClick={() => setEventModalOpen(false)}
                  className="w-full h-14 bg-[#349DC5] text-white rounded-xl font-bold text-xs uppercase shadow hover:bg-[#2d8ab0] transition-all active:scale-95"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <RoleSwitcher
        isOpen={isRoleSwitcherOpen}
        onClose={() => setIsRoleSwitcherOpen(false)}
      />
    </div>
  );
}
