import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Users,
  Calendar,
  RefreshCw,
  Bell,
  Search,
  ArrowUpRight,
  MapPin,
  Clock,
  TrendingUp,
  Wallet,
  ChevronRight,
  X,
  UserCheck,
  FileText,
  PieChart,
  Flame,
  LayoutGrid,
  Receipt,
  User,
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { BASE_URl } from "../../../api/users";
import { getChurchSummary, type ChurchSummary } from "../../../api/summary";
import { getFinancialTotals } from "../../../api/adminFinance";
import { getMainChurchAttendances } from "../../../api/attendance";
import AsyncStorage from "../../../utils/AsyncStorage";
import RoleSwitcher from "../../../components/RoleSwitcher";
import { AppEventBus } from "../../../utils/AppEventBus";

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

const MANAGEMENT_ROUTES = [
  { title: "Unit Dashboards", desc: "Global unit management and oversight", route: "/sa/unit-dashboards", icon: <LayoutGrid size={20} /> },
  { title: "Financial Summary", desc: "Consolidated financial overview", route: "/sa/finance-summary", icon: <PieChart size={20} /> },
  { title: "Events & Announcements", desc: "Manage church events and updates", route: "/sa/events-announcements", icon: <Calendar size={20} /> },
  { title: "Profile Admin", desc: "Manage your administrative profile", route: "/sa/profile", icon: <User size={20} /> },
  { title: "Notifications", desc: "System notifications and alerts", route: "/notifications", icon: <Bell size={20} /> },
  { title: "Income History", desc: "Detailed revenue and donation records", route: "/admin-finance/income", icon: <TrendingUp size={20} /> },
  { title: "Expense History", desc: "Detailed expenditure records", route: "/admin-finance/expenses", icon: <Receipt size={20} /> },
  { title: "Admin Finance Summary", desc: "View financial overview", route: "/admin-finance/summary", icon: <Shield size={20} /> },
  { title: "Ministry Dashboard", desc: "Ministry admin dashboard", route: "/sa/dashboard", icon: <LayoutGrid size={20} /> },
  { title: "Workers Demographics", desc: "View worker information", route: "/member-list", icon: <Users size={20} /> },
  { title: "First-Timers & New Members", desc: "Manage new and first-time members", route: "/member-list", icon: <UserCheck size={20} /> },
];

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<ChurchSummary|null>(null);
  const [finTotals, setFinTotals] = useState<any>(null);
  const [attendances, setAttendances] = useState<any[]>([]);
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchVisible, setIsSearchVisible] = useState(false);

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

        const [sumRes, finRes, attRes, eventsRes] = await Promise.all([
          getChurchSummary(),
          getFinancialTotals("Main Church"),
          getMainChurchAttendances().catch(() => []),
          axios.get(`${BASE_URl}/api/events`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
        ]);

        if (sumRes?.ok) setSummary(sumRes);
        setFinTotals(finRes);
        setAttendances(attRes);

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const rawE = eventsRes.data?.events || eventsRes.data?.data || (Array.isArray(eventsRes.data) ? eventsRes.data : []);
        const mappedE = rawE
          .map((e: any) => {
            const dStr = e.isoDate || e.date || e.dateTime || e.startDate;
            const d = dStr ? new Date(dStr) : null;
            return d && !isNaN(d.getTime()) ? { ...e, _d: d } : null;
          })
          .filter((e: any) => e?._d && e._d >= todayStart)
          .sort((a: any, b: any) => a._d.getTime() - b._d.getTime())
          .slice(0, 4);
        setAllEvents(mappedE);
      } catch (err) {
        toast.error("Global Sync Failed");
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

  const filteredRoutes = useMemo(() => {
    if (!searchQuery) return MANAGEMENT_ROUTES;
    return MANAGEMENT_ROUTES.filter(
      (r) =>
        (r.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.desc || "").toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [searchQuery]);

  const avgAttendance = useMemo(() => {
    if (!attendances.length) return 0;
    return Math.round(attendances.reduce((acc, a) => acc + (a.total || 0), 0) / attendances.length);
  }, [attendances]);

  if (loading) return null;

  return (
    <div className="flex-1 bg-background dark:bg-dark-background min-h-screen pb-24 md:pb-10 transition-colors">
      {/* Hero Header */}
      <div className="bg-surface dark:bg-dark-surface px-4 sm:px-6 pt-6 sm:pt-10 pb-14 sm:pb-20 border-b border-border dark:border-dark-border">
        <div className="max-w-7xl mx-auto flex flex-col gap-5 sm:gap-8">
          {/* Identity Row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div 
                onClick={() => navigate("/sa/profile")}
                className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-primary/10 border-2 sm:border-4 border-primary/20 shadow-lg overflow-hidden cursor-pointer active:scale-95 transition-all shrink-0 flex items-center justify-center"
              >
                {profile?.profile?.avatar ? (
                  <img src={profile.profile.avatar} className="w-full h-full object-cover" alt="Admin" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-primary">
                    <Shield size={24} />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-lg md:text-2xl font-black text-text-primary dark:text-dark-text-primary leading-tight uppercase tracking-tight truncate">
                  {profile?.firstName ? `Welcome, ${profile?.title ? profile.title + ' ' : ''}${profile.firstName}` : "Super Admin"}
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-text-muted text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.15em]">
                    Global HQ Authority
                  </span>
                </div>
              </div>
            </div>
            
            {Array.isArray(profile?.roles) && profile.roles.length > 1 && (
              <button 
                onClick={() => AppEventBus.emit("openRoleSwitcher")}
                className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-background dark:bg-dark-background hover:bg-border dark:hover:bg-dark-border text-text-primary dark:text-dark-text-primary border border-border dark:border-dark-border rounded-xl transition-all active:scale-95 shrink-0"
              >
                <LayoutGrid size={16} className="text-primary" />
                <span className="text-[9px] font-bold uppercase tracking-widest leading-none">Switch Role</span>
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {Array.isArray(profile?.roles) && profile.roles.length > 1 && (
              <button 
                onClick={() => AppEventBus.emit("openRoleSwitcher")}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-surface dark:bg-dark-surface text-text-primary dark:text-dark-text-primary flex items-center justify-center shadow-lg active:scale-95 transition-all border border-border dark:border-dark-border sm:hidden"
                title="Switch Role"
              >
                <LayoutGrid size={18} className="text-primary" />
              </button>
            )}
            
            <button
              onClick={() => fetchData(true)}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-background dark:bg-dark-background flex items-center justify-center border border-border dark:border-dark-border text-text-muted hover:bg-border dark:hover:bg-dark-border transition-all active:scale-95"
            >
              <RefreshCw size={18} className={refreshing ? "animate-spin text-primary" : "text-text-primary dark:text-dark-text-primary"} />
            </button>
            
            <button
              onClick={() => navigate("/notifications")}
              className="flex-1 sm:flex-none h-10 sm:h-12 px-4 sm:px-5 bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary rounded-xl sm:rounded-2xl border border-border dark:border-dark-border hover:bg-border dark:hover:bg-dark-border transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Bell size={16} className="text-primary" />
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider leading-none">Notifications</span>
            </button>
          </div>

          {/* Search */}
          <div className="relative max-w-2xl group">
            <Search className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors" size={18} />
            <input
              type="text"
              placeholder="Search members, units, or events..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchVisible(true);
              }}
              onFocus={() => setIsSearchVisible(true)}
              className="w-full h-11 sm:h-12 pl-10 sm:pl-12 pr-4 bg-background dark:bg-dark-background border-2 border-border dark:border-dark-border focus:border-primary/50 rounded-xl text-xs sm:text-sm font-semibold text-text-primary dark:text-dark-text-primary placeholder:text-text-muted transition-all outline-none"
            />
            <AnimatePresence>
              {isSearchVisible && searchQuery && (
                <>
                  <div className="fixed inset-0 z-[100]" onClick={() => setIsSearchVisible(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 right-0 mt-2 z-[110] bg-white dark:bg-[#1a1c1e] rounded-xl shadow-2xl border border-gray-100 dark:border-white/5 max-h-[320px] overflow-y-auto custom-scrollbar"
                  >
                    <div className="p-2">
                      {filteredRoutes.length > 0 ? (
                        filteredRoutes.map((r, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              navigate(r.route);
                              setIsSearchVisible(false);
                            }}
                            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-[#349DC5]/10 text-[#349DC5] flex items-center justify-center shrink-0">
                              {r.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                               <h4 className="text-xs font-bold text-text-primary dark:text-dark-text-primary uppercase leading-none">{r.title}</h4>
                               <p className="text-[9px] font-semibold text-text-muted uppercase mt-0.5 truncate">{r.desc}</p>
                            </div>
                            <ChevronRight size={14} className="text-gray-200 group-hover:text-[#349DC5] shrink-0" />
                          </button>
                        ))
                      ) : (
                        <div className="p-6 text-center text-gray-400 text-xs font-bold uppercase">No matching results</div>
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 -mt-6 sm:-mt-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6 mb-6 sm:mb-10">
          <div className="bg-surface dark:bg-dark-surface p-3 sm:p-5 md:p-8 rounded-xl shadow-md border border-border dark:border-dark-border">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-6">
              <Users className="text-primary" size={14} />
              <span className="text-[8px] sm:text-[10px] font-bold text-text-muted uppercase tracking-wider leading-tight">Workers</span>
            </div>
            <h3 className="text-lg sm:text-2xl md:text-4xl font-bold text-text-primary dark:text-dark-text-primary leading-none">
              {summary?.totals?.workersTotal || "—"}
            </h3>
            <p className="text-[7px] sm:text-[9px] font-semibold text-text-muted uppercase mt-1 sm:mt-3 hidden sm:block">Active Personnel</p>
          </div>

          <div className="bg-surface dark:bg-dark-surface p-3 sm:p-5 md:p-8 rounded-xl shadow-md border border-border dark:border-dark-border">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-6">
              <Flame className="text-error" size={14} />
              <span className="text-[8px] sm:text-[10px] font-bold text-text-muted uppercase tracking-wider leading-tight">Souls</span>
            </div>
            <h3 className="text-lg sm:text-2xl md:text-4xl font-bold text-text-primary dark:text-dark-text-primary leading-none">
              {summary?.totals?.soulsWon || "—"}
            </h3>
            <p className="text-[7px] sm:text-[9px] font-semibold text-text-muted uppercase mt-1 sm:mt-3 hidden sm:block">Total Harvested</p>
          </div>

          <div className="bg-surface dark:bg-dark-surface p-3 sm:p-5 md:p-8 rounded-xl shadow-md border border-border dark:border-dark-border">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-6">
              <Calendar className="text-success" size={14} />
              <span className="text-[8px] sm:text-[10px] font-bold text-text-muted uppercase tracking-wider leading-tight">Attendance</span>
            </div>
            <h3 className="text-lg sm:text-2xl md:text-4xl font-bold text-text-primary dark:text-dark-text-primary leading-none">
              {avgAttendance || "—"}
            </h3>
            <p className="text-[7px] sm:text-[9px] font-semibold text-text-muted uppercase mt-1 sm:mt-3 hidden sm:block">Average</p>
          </div>
        </div>

        {/* Financial Summary */}
        <section className="mb-6 sm:mb-12">
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <h3 className="text-xs sm:text-sm font-bold text-text-muted uppercase tracking-wider leading-none whitespace-nowrap">Financial Summary</h3>
            <div className="h-px flex-1 bg-border dark:bg-dark-border" />
          </div>

          <div
            onClick={() => navigate("/admin-finance/summary")}
            className="bg-surface dark:bg-dark-surface p-4 sm:p-6 md:p-8 rounded-xl text-text-primary dark:text-dark-text-primary shadow-lg border border-border dark:border-dark-border cursor-pointer group relative overflow-hidden active:scale-[0.99] transition-transform"
          >
            <div className="relative z-10">
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-5">
                <Wallet size={16} className="text-primary" />
                <span className="text-[8px] sm:text-[10px] font-bold text-text-muted uppercase tracking-wider">Total Balance</span>
              </div>
              <h3 className="text-xl sm:text-2xl md:text-4xl font-bold leading-none tabular-nums text-text-primary dark:text-dark-text-primary mb-4 sm:mb-6">
                ₦{(finTotals?.balance || 0).toLocaleString()}
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:gap-6 pt-3 sm:pt-4 border-t border-border dark:border-dark-border">
                <div>
                  <p className="text-[8px] sm:text-[10px] font-bold text-text-muted uppercase mb-1 sm:mb-2">Income</p>
                  <h4 className="text-sm sm:text-lg md:text-xl font-bold text-success tabular-nums">₦{(finTotals?.totalIncome || 0).toLocaleString()}</h4>
                </div>
                <div>
                  <p className="text-[8px] sm:text-[10px] font-bold text-text-muted uppercase mb-1 sm:mb-2">Expenditure</p>
                  <h4 className="text-sm sm:text-lg md:text-xl font-bold text-error tabular-nums">₦{(finTotals?.totalExpense || 0).toLocaleString()}</h4>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Management Console */}
        <section className="mb-6 sm:mb-12">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-text-muted uppercase tracking-wider leading-none">Management Console</h3>
              <p className="text-[8px] sm:text-[10px] text-text-muted font-black uppercase mt-1">Admin Control Panel</p>
            </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
            {MANAGEMENT_ROUTES.map((m, i) => (
              <button
                key={i}
                onClick={() => navigate(m.route)}
                className="bg-surface dark:bg-dark-surface p-3 sm:p-4 md:p-6 rounded-xl shadow-md border border-border dark:border-dark-border hover:border-primary/20 group transition-all text-left flex flex-col h-full active:scale-95"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-background dark:bg-dark-background flex items-center justify-center text-text-muted group-hover:bg-primary group-hover:text-white transition-all mb-2 sm:mb-4">
                  {m.icon}
                </div>
                <h4 className="text-[9px] sm:text-[10px] md:text-[11px] font-bold text-text-primary dark:text-dark-text-primary uppercase leading-tight mb-1">{m.title}</h4>
                <p className="text-[7px] sm:text-[8px] md:text-[9px] font-semibold text-text-muted uppercase leading-relaxed mt-auto hidden sm:block">{m.desc}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Upcoming Events */}
        <section className="pb-4">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-text-muted uppercase tracking-wider leading-none">Upcoming Events</h3>
              <p className="text-[8px] sm:text-[10px] text-text-muted font-black uppercase mt-1">Active Church Events</p>
            </div>
            <button
              onClick={() => navigate("/sa/events-announcements")}
              className="text-[9px] sm:text-[10px] font-bold text-primary uppercase hover:underline"
            >
              View All
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            {allEvents.length > 0 ? (
              allEvents.map((ev) => (
                <div
                  key={ev._id}
                  onClick={() => {
                    setSelectedEvent(ev);
                    setEventModalOpen(true);
                  }}
                  className="bg-surface dark:bg-dark-surface p-3 sm:p-5 rounded-xl shadow-md border border-border dark:border-dark-border hover:border-primary/20 group cursor-pointer transition-all flex flex-col h-full active:scale-95"
                >
                  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-5">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 bg-primary/10 rounded-lg sm:rounded-xl flex flex-col items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shrink-0">
                      <span className="text-[7px] sm:text-[8px] font-bold uppercase leading-none mb-0.5 opacity-60">
                        {ev._d.toLocaleDateString(undefined, { month: "short" })}
                      </span>
                      <span className="text-sm sm:text-lg font-bold leading-none">{ev._d.getDate()}</span>
                    </div>
                    <h4 className="font-bold text-[10px] sm:text-xs text-text-primary dark:text-dark-text-primary uppercase leading-tight line-clamp-2">
                      {ev.title}
                    </h4>
                  </div>
                  <div className="mt-auto pt-2 sm:pt-3 border-t border-border dark:border-dark-border flex items-center gap-1.5">
                    <MapPin size={11} className="text-text-muted shrink-0" />
                    <span className="text-[8px] sm:text-[10px] font-semibold text-text-muted uppercase truncate">
                      {ev.venue || "Global Base"}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 sm:py-16 text-center bg-white dark:bg-[#1a1c1e] rounded-xl border-2 border-dashed border-gray-100 dark:border-white/5 text-gray-300 uppercase font-bold text-[10px] sm:text-xs">
                No upcoming events logged
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Event Detail Modal */}
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
              <div className="bg-primary/90 p-5 sm:p-8 text-white relative h-28 sm:h-36 flex flex-col justify-end">
                <Shield size={60} className="absolute -top-3 -right-3 opacity-10 rotate-12 text-white" />
                <h3 className="text-lg sm:text-xl font-bold uppercase mb-1 leading-tight">{selectedEvent.title}</h3>
                <p className="text-[9px] sm:text-[10px] font-bold text-white/60 uppercase">
                  {new Date(selectedEvent.date).toLocaleString()}
                </p>
              </div>
              <div className="p-5 sm:p-8">
                <p className="text-text-muted dark:text-dark-text-muted text-xs sm:text-sm font-medium leading-relaxed mb-6 sm:mb-8">
                  {selectedEvent.description || "No event details available."}
                </p>
                <div className="flex gap-2.5 sm:gap-3">
                  <button
                    onClick={() => setEventModalOpen(false)}
                    className="flex-1 h-12 bg-background dark:bg-dark-background text-text-muted rounded-xl font-bold text-[10px] sm:text-xs uppercase active:scale-95 transition-transform border border-border dark:border-dark-border"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => setEventModalOpen(false)}
                    className="flex-[2] h-12 bg-primary text-white rounded-xl font-bold text-[10px] sm:text-xs uppercase shadow-md shadow-primary/20 active:scale-95 transition-transform"
                  >
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
