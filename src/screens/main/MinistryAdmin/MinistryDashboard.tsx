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
import { AppEventBus } from "../../../utils/AppEventBus";

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

        const isYS = minName &&
          (minName.toLowerCase().includes("youth") ||
          minName.toLowerCase().includes("single"));

        const [sumRes, eventsRes, attendances] = await Promise.all([
          getMinistrySummary({ ministry: minName }),
          axios
            .get(`${BASE_URl}/api/events`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .catch(() => ({ data: { ok: false, events: [] } })),
          (isYS
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
    <div className="flex-1 bg-background dark:bg-dark-background min-h-screen pb-32 transition-colors">
      {/* Ministry Header */}
      <div className="bg-surface dark:bg-dark-surface px-6 py-12 pb-20 border-b border-border dark:border-dark-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col gap-10">
            {/* Identity & Actions Container */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div 
                  onClick={() => navigate("/profile")}
                  className="w-16 h-16 rounded-2xl bg-primary shadow-xl overflow-hidden cursor-pointer active:scale-95 transition-all flex items-center justify-center p-3"
                >
                   {profile?.profile?.avatar ? (
                    <img src={profile.profile.avatar} className="w-full h-full object-cover rounded-xl" alt="Profile" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white">
                      <User size={30} />
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-text-primary dark:text-dark-text-primary leading-tight uppercase tracking-tight">
                    {profile?.firstName ? `Welcome, ${profile?.title ? profile.title + ' ' : ''}${profile.firstName}` : "Ministry Admin"}
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-text-muted text-[9px] font-black uppercase tracking-[0.2em]">
                      {currentMinistry} Admin
                    </span>
                  </div>
                </div>
              </div>
              
              {Array.isArray(profile?.roles) && profile.roles.length > 1 && (
                <button 
                  onClick={() => AppEventBus.emit("openRoleSwitcher")}
                  className="hidden sm:flex items-center gap-3 px-6 py-3 bg-background dark:bg-dark-background hover:bg-border dark:hover:bg-dark-border text-text-primary dark:text-dark-text-primary border border-border dark:border-dark-border rounded-xl transition-all active:scale-95"
                >
                  <LayoutGrid size={18} className="text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest leading-none">Switch Role</span>
                </button>
              )}
            </div>

            {/* Controls Container */}
            <div className="flex items-center gap-3 flex-wrap">
              {Array.isArray(profile?.roles) && profile.roles.length > 1 && (
                <button 
                  onClick={() => AppEventBus.emit("openRoleSwitcher")}
                  className="w-14 h-14 rounded-2xl bg-surface dark:bg-dark-surface text-text-primary dark:text-dark-text-primary flex items-center justify-center shadow-lg active:scale-95 transition-all border border-border dark:border-dark-border"
                  title="Switch Role"
                >
                  <LayoutGrid size={22} className="text-primary" />
                </button>
              )}
              
              <button
                onClick={() => fetchData(true)}
                className="w-14 h-14 rounded-2xl bg-background dark:bg-dark-background flex items-center justify-center border border-border dark:border-dark-border text-text-muted hover:bg-border dark:hover:bg-dark-border transition-all active:scale-95"
              >
                <RefreshCw size={22} className={refreshing ? "animate-spin text-primary" : "text-text-primary dark:text-dark-text-primary"} />
              </button>
              
              <button
                onClick={() => navigate("/notifications")}
                className="flex-1 sm:flex-none h-14 px-6 bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary rounded-2xl border border-border dark:border-dark-border hover:bg-border dark:hover:bg-dark-border transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                <Bell size={20} className="text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest leading-none">Notifications</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-8">
        {/* Key Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
          <div className="lg:col-span-8">
            <div className="bg-surface dark:bg-dark-surface p-10 rounded-xl shadow-md border border-border dark:border-dark-border relative overflow-hidden h-full flex flex-col justify-between group transition-all">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 bg-primary/10 rounded-xl text-primary">
                    <Users size={32} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-muted uppercase tracking-widest">
                      Total Number of Workers
                    </h3>
                    <p className="text-[10px] font-bold text-primary uppercase mt-1">
                      Total Active Members
                    </p>
                  </div>
                </div>
                <h2 className="text-7xl font-bold text-text-primary dark:text-dark-text-primary leading-none tabular-nums tracking-tighter">
                  {(summary?.totals?.workersTotal || 0).toLocaleString()}
                </h2>
              </div>
              <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all">
                <Users size={200} />
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-surface dark:bg-dark-surface p-8 rounded-xl shadow-md border border-border dark:border-dark-border flex flex-col justify-center transition-all">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-error/10 text-error flex items-center justify-center">
                  <Flame size={24} />
                </div>
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                  Soul Records
                </span>
              </div>
              <h3 className="text-4xl font-bold text-text-primary dark:text-dark-text-primary leading-none">
                {(summary?.totals?.soulsWon || 0).toLocaleString()}
              </h3>
            </div>
            <div 
              onClick={() => {
                const minName = currentMinistry || "";
                const isYS = minName.toLowerCase().includes("youth") || minName.toLowerCase().includes("single");
                navigate(isYS ? "/attendance/ys" : "/attendance/main-church");
              }}
              className="bg-surface dark:bg-dark-surface p-8 rounded-xl shadow-md border border-border dark:border-dark-border flex flex-col justify-center cursor-pointer active:scale-95 transition-all hover:border-primary/30 group"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-success/10 text-success flex items-center justify-center group-hover:scale-110 transition-transform">
                  <UserCheck size={24} />
                </div>
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                  Average Attendance
                </span>
              </div>
              <h3 className="text-4xl font-bold text-text-primary dark:text-dark-text-primary leading-none">
                {avgAttendance.toLocaleString()}
              </h3>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <section className="mb-14">
          <div className="flex items-center gap-4 mb-8">
            <h3 className="text-sm font-bold text-text-muted uppercase tracking-widest leading-none">
              Financial Summary
            </h3>
            <div className="h-px flex-1 bg-border dark:bg-dark-border" />
          </div>

          <div
            onClick={() => navigate("/admin-finance/summary", { state: { ministry: currentMinistry } })}
            className="bg-surface dark:bg-dark-surface p-10 rounded-xl text-text-primary dark:text-dark-text-primary shadow-xl border border-border dark:border-dark-border cursor-pointer group relative overflow-hidden transition-all"
          >
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-10">
              <div className="md:col-span-2">
                <div className="flex items-center gap-4 mb-6">
                  <Wallet size={20} className="text-primary" />
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                    Total Balance
                  </span>
                </div>
                <h3 className="text-5xl font-bold leading-none tabular-nums text-text-primary dark:text-dark-text-primary">
                  ₦{(finTotals?.balance || 0).toLocaleString()}
                </h3>
                <p className="text-[10px] font-bold text-primary uppercase mt-4 tracking-widest">
                  Available Funds ({currentMinistry})
                </p>
              </div>
              <div className="flex flex-col justify-end">
                <p className="text-[10px] font-bold text-text-muted uppercase mb-4 tracking-widest">
                  Total Income
                </p>
                <h4 className="text-2xl font-bold text-success">
                  ₦{(finTotals?.totalIncome || 0).toLocaleString()}
                </h4>
              </div>
              <div className="flex flex-col justify-end">
                <p className="text-[10px] font-bold text-text-muted uppercase mb-4 tracking-widest">
                  Total Expenditure
                </p>
                <h4 className="text-2xl font-bold text-error">
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
              <div className="w-1.5 h-8 bg-primary rounded-full" />
              <div>
                <h3 className="text-xl font-black text-text-primary dark:text-dark-text-primary uppercase tracking-tighter">Upcoming Events</h3>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mt-1 opacity-60">Latest church activities & services</p>
              </div>
            </div>
            <button
               onClick={() => navigate("/sa/events-announcements")}
              className="px-6 py-3 rounded-xl bg-background dark:bg-dark-background text-[10px] font-black text-primary uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-sm border border-border dark:border-dark-border"
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
                  className="bg-surface dark:bg-dark-surface p-7 rounded-[32px] shadow-md border border-border dark:border-dark-border cursor-pointer group hover:shadow-2xl hover:shadow-primary/5 transition-all relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#349DC5]/5 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform" />
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 bg-gradient-to-br from-primary/10 to-transparent rounded-2xl flex flex-col items-center justify-center text-primary border border-primary/20 shadow-inner shrink-0 group-hover:rotate-6 transition-transform">
                      <span className="text-[8px] font-black uppercase tracking-tighter mb-0.5 opacity-60 font-mono">
                         {ev._d.toLocaleDateString(undefined, { month: "short" })}
                      </span>
                      <span className="text-2xl font-black leading-none tracking-tighter">
                        {ev._d.getDate()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-black text-text-primary dark:text-dark-text-primary uppercase leading-tight line-clamp-2 min-h-[2.5rem] group-hover:text-primary transition-colors tracking-tight">
                        {ev.title}
                      </h4>
                    </div>
                  </div>
                  <div className="pt-5 border-t border-border dark:border-dark-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin size={12} className="text-text-muted" />
                      <span className="text-[9px] font-black text-text-muted uppercase tracking-widest truncate max-w-[100px]">
                        {ev.venue || "HQ Ops"}
                      </span>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-background dark:bg-dark-background flex items-center justify-center text-text-muted group-hover:bg-primary group-hover:text-white transition-all shrink-0">
                      <ChevronRight size={18} />
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full py-24 text-center bg-surface dark:bg-dark-surface rounded-[40px] border-2 border-dashed border-border dark:border-dark-border">
                <div className="w-20 h-20 rounded-full bg-background dark:bg-dark-background flex items-center justify-center mx-auto mb-6">
                  <Calendar size={40} className="text-text-muted opacity-40" />
                </div>
                <p className="text-xs font-black text-text-muted uppercase tracking-[0.4em]">No Events Recorded</p>
                <p className="text-[10px] text-text-muted uppercase tracking-widest mt-2 opacity-60">Check back later for updates</p>
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
              className="relative w-full max-w-4xl bg-surface dark:bg-dark-surface rounded-[32px] p-10 overflow-hidden shadow-2xl border border-border dark:border-dark-border"
            >
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h3 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary uppercase leading-none tracking-tighter">
                    Menu
                  </h3>
                  <p className="text-[10px] font-bold text-text-muted uppercase mt-2 tracking-widest">
                    Ministry Navigation
                  </p>
                </div>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-3 bg-background dark:bg-dark-background rounded-xl text-text-muted hover:text-error transition-all border border-border dark:border-dark-border"
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
                    className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-background dark:bg-dark-background hover:bg-primary/10 group transition-all border border-border dark:border-dark-border hover:border-primary/20"
                  >
                    <div
                      className={cn(
                        "w-14 h-14 rounded-xl flex items-center justify-center text-white shadow shadow-primary/10 group-hover:scale-110 transition-transform",
                        m.color,
                      )}
                    >
                      {m.icon}
                    </div>
                    <span className="text-[10px] font-bold text-text-primary dark:text-dark-text-primary uppercase tracking-wider text-center">
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
              className="w-full max-w-xl bg-surface dark:bg-dark-surface rounded-xl overflow-hidden shadow-2xl border border-border dark:border-dark-border"
            >
              <div className="bg-primary/90 p-10 text-white relative flex flex-col justify-end h-44">
                <Calendar size={80} className="absolute -top-4 -right-4 opacity-10 rotate-12 text-white" />
                <h3 className="text-2xl font-bold uppercase leading-tight mb-3 text-white">
                  {selectedEvent.title}
                </h3>
                <div className="flex items-center gap-4 text-white/60 text-[10px] font-bold uppercase tracking-widest">
                  <span className="flex items-center gap-2">
                    <Clock size={12} /> {selectedEvent._d.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="p-10">
                <p className="text-text-muted dark:text-dark-text-muted text-sm font-medium leading-relaxed mb-10">
                  {selectedEvent.description || "No event details available."}
                </p>
                <button
                  onClick={() => setEventModalOpen(false)}
                  className="w-full h-14 bg-primary text-white rounded-xl font-bold text-xs uppercase shadow-lg shadow-primary/20 hover:brightness-110 transition-all active:scale-95"
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
