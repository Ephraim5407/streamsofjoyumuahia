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

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

const MANAGEMENT_ROUTES = [
  { title: "Unit Dashboards", desc: "Global unit management and oversight", route: "/sa/unit-dashboards", icon: <LayoutGrid /> },
  { title: "Financial Summary", desc: "Consolidated financial overview", route: "/sa/finance-summary", icon: <PieChart /> },
  { title: "Events & Announcements", desc: "Manage church events and updates", route: "/sa/events-announcements", icon: <Calendar /> },
  { title: "Profile Admin", desc: "Manage your administrative profile", route: "/sa/profile", icon: <User /> },
  { title: "Notifications", desc: "System notifications and alerts", route: "/notifications", icon: <Bell /> },
  { title: "Income History", desc: "Detailed revenue and donation records", route: "/admin-finance/income", icon: <TrendingUp /> },
  { title: "Expense History", desc: "Detailed expenditure records", route: "/admin-finance/expenses", icon: <Receipt /> },
  { title: "Admin Finance Summary", desc: "Strategic financial briefing", route: "/admin-finance/summary", icon: <Shield /> },
  { title: "Ministry Dashboard", desc: "Ministry admin operational console", route: "/sa/dashboard", icon: <LayoutGrid /> },
  { title: "Workers Demographics", desc: "Personnel intelligence and data", route: "/member-list", icon: <Users /> },
  { title: "First-Timers & New Members", desc: "Growth and pipeline management", route: "/member-list", icon: <UserCheck /> },
];

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<ChurchSummary | null>(null);
  const [finTotals, setFinTotals] = useState<any>(null);
  const [attendances, setAttendances] = useState<any[]>([]);
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [isRoleSwitcherOpen, setIsRoleSwitcherOpen] = useState(false);
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
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.desc.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [searchQuery]);

  const avgAttendance = useMemo(() => {
    if (!attendances.length) return 0;
    return Math.round(attendances.reduce((acc, a) => acc + (a.total || 0), 0) / attendances.length);
  }, [attendances]);

  if (loading) return null;

  return (
    <div className="flex-1 bg-gray-50 dark:bg-[#0f1218] min-h-screen pb-32">
      {/* Search Header Area */}
      <div className="bg-[#00204a] px-6 py-12 pb-20">
        <div className="max-w-7xl mx-auto flex flex-col gap-10">
          <div className="flex flex-col gap-10">
            {/* Identity & Main Actions Container */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div 
                  onClick={() => navigate("/sa/profile")}
                  className="w-16 h-16 rounded-2xl bg-[#349DC5] border-4 border-white/10 shadow-xl overflow-hidden cursor-pointer active:scale-95 transition-all"
                >
                  {profile?.profile?.avatar ? (
                    <img src={profile.profile.avatar} className="w-full h-full object-cover" alt="Admin" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white">
                      <Shield size={30} />
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white leading-tight uppercase tracking-tight">
                    {profile?.firstName ? `Welcome, ${profile?.title ? profile.title + ' ' : ''}${profile.firstName}` : "Super Admin"}
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-white/40 text-[9px] font-black uppercase tracking-[0.2em]">
                      Global HQ Authority
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

          <div className="relative max-w-2xl group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#349DC5] transition-colors" size={20} />
            <input
              type="text"
              placeholder="Search members, units, or events..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchVisible(true);
              }}
              onFocus={() => setIsSearchVisible(true)}
              className="w-full h-16 pl-14 pr-6 bg-white/10 border-2 border-transparent focus:border-[#349DC5] rounded-xl text-sm font-bold text-white placeholder:text-white/20 transition-all outline-none"
            />
            <AnimatePresence>
              {isSearchVisible && searchQuery && (
                <>
                  <div className="fixed inset-0 z-[100]" onClick={() => setIsSearchVisible(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 right-0 mt-3 z-[110] bg-white dark:bg-[#1a1c1e] rounded-xl shadow-2xl border border-gray-100 dark:border-white/5 max-h-[400px] overflow-y-auto custom-scrollbar"
                  >
                    <div className="p-3">
                      {filteredRoutes.length > 0 ? (
                        filteredRoutes.map((r, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              navigate(r.route);
                              setIsSearchVisible(false);
                            }}
                            className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left group"
                          >
                            <div className="w-10 h-10 rounded-lg bg-[#349DC5]/10 text-[#349DC5] flex items-center justify-center shrink-0">
                              {r.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-bold text-[#00204a] dark:text-white uppercase leading-none">{r.title}</h4>
                              <p className="text-[10px] font-bold text-gray-400 uppercase mt-1 truncate">{r.desc}</p>
                            </div>
                            <ChevronRight size={18} className="text-gray-200 group-hover:text-[#349DC5]" />
                          </button>
                        ))
                      ) : (
                        <div className="p-8 text-center text-gray-400 text-xs font-bold uppercase">No matching intelligence</div>
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-8">
        {/* Key Metrics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white dark:bg-[#1a1c1e] p-8 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <Users className="text-[#349DC5]" size={20} />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Number of Workers</span>
              </div>
              <h3 className="text-5xl font-bold text-[#00204a] dark:text-white leading-none">
                {summary?.totals?.workersTotal || "—"}
              </h3>
              <p className="text-[9px] font-bold text-gray-300 uppercase mt-4">Active Personnel Registry</p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1a1c1e] p-8 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <Flame className="text-rose-500" size={20} />
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  No. of Soul Harvested
                </p>
              </div>
              <h3 className="text-5xl font-bold text-[#00204a] dark:text-white leading-none">
                {summary?.totals?.soulsWon || "—"}
              </h3>
              <p className="text-[9px] font-bold text-gray-300 uppercase mt-4">Total Soul Harvested Globally</p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1a1c1e] p-8 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <Calendar className="text-emerald-500" size={20} />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Average Attendance</span>
              </div>
              <h3 className="text-5xl font-bold text-[#00204a] dark:text-white leading-none">
                {avgAttendance || "—"}
              </h3>
              <p className="text-[9px] font-bold text-gray-300 uppercase mt-4">Main Church Deployment Average</p>
            </div>
          </div>
        </div>

        {/* Global Treasury Briefing */}
        <section className="mb-14">
          <div className="flex items-center gap-4 mb-8">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-none">Financial Summary</h3>
            <div className="h-px flex-1 bg-gray-100 dark:bg-white/5" />
          </div>

          <div
            onClick={() => navigate("/admin-finance/summary")}
            className="bg-[#00204a] p-10 rounded-xl text-white shadow-xl cursor-pointer group relative overflow-hidden"
          >
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-10">
              <div className="md:col-span-2">
                <div className="flex items-center gap-4 mb-6">
                  <Wallet size={20} className="text-cyan-400" />
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">High-Value Asset Pool</span>
                </div>
                <h3 className="text-5xl font-bold leading-none tabular-nums text-white">
                  ₦{(finTotals?.balance || 0).toLocaleString()}
                </h3>
                <p className="text-[10px] font-bold text-cyan-400 uppercase mt-4 tracking-widest">Global Liquid Reserve Balance</p>
              </div>
              <div className="flex flex-col justify-end">
                <p className="text-[10px] font-bold text-white/30 uppercase mb-4 tracking-widest">Total Income</p>
                <h4 className="text-2xl font-bold text-emerald-400">₦{(finTotals?.totalIncome || 0).toLocaleString()}</h4>
              </div>
              <div className="flex flex-col justify-end">
                <p className="text-[10px] font-bold text-white/30 uppercase mb-4 tracking-widest">Total Expenditure</p>
                <h4 className="text-2xl font-bold text-rose-400">₦{(finTotals?.totalExpense || 0).toLocaleString()}</h4>
              </div>
            </div>
          </div>
        </section>

        {/* Tactical Management Suite */}
        <section className="mb-14">
          <div className="flex items-center justify-between mb-8 px-2">
            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-none">Management Console</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase mt-2">Administrative Control Panel</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {MANAGEMENT_ROUTES.map((m, i) => (
              <button
                key={i}
                onClick={() => navigate(m.route)}
                className="bg-white dark:bg-[#1a1c1e] p-7 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 hover:border-[#349DC5]/20 group transition-all text-left flex flex-col h-full"
              >
                <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 group-hover:bg-[#349DC5] group-hover:text-white transition-all mb-6 shadow-inner">
                  {m.icon}
                </div>
                <h4 className="text-[11px] font-bold text-[#00204a] dark:text-white uppercase leading-tight mb-2">{m.title}</h4>
                <p className="text-[9px] font-bold text-gray-300 uppercase leading-relaxed mt-auto">{m.desc}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Global Strategy Feed */}
        <section>
          <div className="flex items-center justify-between mb-8 px-2">
            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-none">Upcoming Events</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase mt-2">Active Church Events</p>
            </div>
            <button
              onClick={() => navigate("/sa/events-announcements")}
              className="text-[10px] font-bold text-[#349DC5] uppercase hover:underline"
            >
              View All Events
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {allEvents.length > 0 ? (
              allEvents.map((ev) => (
                <div
                  key={ev._id}
                  onClick={() => {
                    setSelectedEvent(ev);
                    setEventModalOpen(true);
                  }}
                  className="bg-white dark:bg-[#1a1c1e] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 hover:border-[#349DC5]/20 group cursor-pointer transition-all flex flex-col h-full"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/10 rounded-xl flex flex-col items-center justify-center text-[#349DC5] group-hover:bg-[#349DC5] group-hover:text-white transition-all shrink-0">
                      <span className="text-[8px] font-bold uppercase leading-none mb-1 opacity-60">
                        {ev._d.toLocaleDateString(undefined, { month: "short" })}
                      </span>
                      <span className="text-xl font-bold leading-none">{ev._d.getDate()}</span>
                    </div>
                    <h4 className="font-bold text-[#00204a] dark:text-white uppercase leading-tight line-clamp-2 min-h-[2.5rem]">
                      {ev.title}
                    </h4>
                  </div>
                  <div className="mt-auto pt-4 border-t border-gray-50 dark:border-white/5 flex items-center gap-3 text-gray-300">
                    <MapPin size={14} />
                    <span className="text-[10px] font-bold text-gray-400 uppercase truncate">
                      {ev.venue || "Global Base"}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-20 text-center bg-white dark:bg-[#1a1c1e] rounded-xl border-2 border-dashed border-gray-100 dark:border-white/5 text-gray-300 uppercase font-bold text-xs">
                No upcoming events logged
              </div>
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
              <div className="bg-[#00204a] p-10 text-white relative h-40 flex flex-col justify-end">
                <Shield size={80} className="absolute -top-4 -right-4 opacity-10 rotate-12" />
                <h3 className="text-2xl font-bold uppercase mb-2">{selectedEvent.title}</h3>
                <p className="text-[10px] font-bold text-white/40 uppercase">
                  {new Date(selectedEvent.date).toLocaleString()}
                </p>
              </div>
              <div className="p-10">
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium leading-relaxed mb-10">
                  {selectedEvent.description || "No event details available."}
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setEventModalOpen(false)}
                    className="flex-1 h-14 bg-gray-50 dark:bg-white/5 text-gray-400 rounded-xl font-bold text-xs uppercase"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => setEventModalOpen(false)}
                    className="flex-[2] h-14 bg-[#349DC5] text-white rounded-xl font-bold text-xs uppercase shadow-md"
                  >
                    Share Event
                  </button>
                </div>
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
