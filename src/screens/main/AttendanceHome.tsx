import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  Users,
  ChevronDown,
  Plus,
  ClipboardList,
  ArrowRight,
  Download,
  RefreshCw,
  ShieldCheck,
  Activity,
  ChevronRight,
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { BASE_URl } from "../../api/users";
import AsyncStorage from "../../utils/AsyncStorage";

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

function StatCard({
  label,
  value,
  trend,
  icon,
  subtitle,
}: {
  label: string;
  value: any;
  trend?: string;
  icon: any;
  subtitle: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-white dark:bg-[#1a1c1e] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 relative group"
    >
      <div className="flex justify-between items-start mb-6">
        <div className="p-2.5 bg-gray-50 dark:bg-white/5 rounded-xl group-hover:scale-110 transition-transform">
          {icon}
        </div>
        {trend && (
          <span className="text-[10px] font-bold text-green-500 bg-green-50 dark:bg-green-950/20 px-2.5 py-1.5 rounded-lg uppercase">
            {trend}
          </span>
        )}
      </div>
      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1.5">
        {label}
      </p>
      <h3 className="text-2xl font-bold text-[#00204a] dark:text-white mb-4">
        {value}
      </h3>
      <div className="h-px bg-gray-50 dark:bg-white/5 mb-4" />
      <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">
        {subtitle}
      </p>
    </motion.div>
  );
}

function CommandButton({
  label,
  desc,
  icon,
  onClick,
  primary = false,
}: {
  label: string;
  desc: string;
  icon: any;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-6 rounded-xl border text-left transition-all active:scale-[0.98] group relative",
        primary
          ? "bg-[#349DC5] border-transparent text-white shadow"
          : "bg-white dark:bg-[#1a1c1e] border-gray-100 dark:border-white/5 shadow-sm hover:border-[#349DC5]/30",
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "p-3 rounded-lg shrink-0",
            primary ? "bg-white/10" : "bg-gray-50 dark:bg-white/5",
          )}
        >
          {icon}
        </div>
        <div>
          <h4
            className={cn(
              "font-bold text-base uppercase leading-none mb-2",
              primary ? "text-white" : "text-[#00204a] dark:text-white",
            )}
          >
            {label}
          </h4>
          <p
            className={cn(
              "text-[10px] font-bold leading-tight uppercase opacity-60",
              primary ? "text-blue-50" : "text-gray-400",
            )}
          >
            {desc}
          </p>
        </div>
      </div>
    </button>
  );
}

export default function AttendanceHomeScreen() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [weeklyRecords, setWeeklyRecords] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setLoading(true);
      else setRefreshing(true);
      try {
        const token = await AsyncStorage.getItem("token");
        const res = await axios.get(`${BASE_URl}/api/attendance/summary`, {
          params: { year: selectedYear },
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data) {
          setStats(res.data.stats);
          setWeeklyRecords(res.data.weeklyBreakdown || []);
        }
      } catch (e) {
        toast.error("Failed to sync attendance analytics");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedYear],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="pb-32 max-w-7xl mx-auto px-4 sm:px-6 pt-10">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate(-1)}
            className="p-3.5 rounded-2xl bg-white dark:bg-[#1a1c1e] shadow-sm border border-gray-100 dark:border-white/5 text-gray-400 hover:text-[#349DC5] transition-all active:scale-95"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-[#00204a] dark:text-white leading-none">
              Attendance Matrix
            </h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase mt-2">
              Operational Engagement Metrics
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="h-14 px-6 bg-white dark:bg-[#1a1c1e] rounded-xl shadow-sm border border-gray-100 dark:border-white/5 font-bold text-[11px] uppercase text-[#00204a] dark:text-gray-300 outline-none appearance-none cursor-pointer pr-12 transition-all hover:border-[#349DC5]/20"
            >
              {[2023, 2024, 2025, 2026].map((y) => (
                <option key={y} value={y}>
                  Session {y}
                </option>
              ))}
            </select>
            <ChevronDown
              className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              size={14}
            />
          </div>
          <button
            onClick={() => fetchData(true)}
            className="w-14 h-14 bg-white dark:bg-[#1a1c1e] rounded-xl shadow-sm border border-gray-100 dark:border-white/5 flex items-center justify-center text-gray-400 hover:text-[#349DC5] transition-all"
          >
            <RefreshCw
              size={22}
              className={refreshing ? "animate-spin text-[#349DC5]" : ""}
            />
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <StatCard
          label="Avg. Session Data"
          value={stats?.avgMonthly || 30}
          trend="+12%"
          icon={<TrendingUp className="text-green-500" size={24} />}
          subtitle={`${selectedYear} Cumulative`}
        />
        <StatCard
          label="Peak Mobilization"
          value={stats?.peak || 100}
          icon={<Users className="text-blue-500" size={24} />}
          subtitle="Max Engagement"
        />
        <StatCard
          label="Minimum Record"
          value={stats?.min || 20}
          icon={<Activity className="text-rose-500" size={24} />}
          subtitle="Base Line Log"
        />
        <StatCard
          label="Yield Delta"
          value={`${stats?.comparison || 20}%`}
          icon={<BarChart3 className="text-purple-500" size={24} />}
          subtitle="vs Previous Cycle"
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-12">
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white dark:bg-[#1a1c1e] p-8 rounded-xl shadow-sm border border-gray-100 dark:border-white/5">
            <h2 className="text-lg font-bold text-[#00204a] dark:text-white uppercase mb-6 flex items-center gap-3">
              <ClipboardList size={20} className="text-[#349DC5]" /> Engagement Pulse
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">
                  Global Engagement Mean
                </p>
                <p className="text-3xl font-bold text-[#00204a] dark:text-white">
                  27.4
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">
                  Last Mobilization Date
                </p>
                <p className="text-xl font-bold text-[#00204a] dark:text-white uppercase">
                  June 15, 2025
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ShieldCheck size={18} className="text-[#349DC5]" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Session History
            </span>
            <div className="h-px flex-1 bg-gray-100 dark:bg-white/5" />
            <button className="flex items-center gap-2 text-[9px] font-bold text-[#349DC5] uppercase">
              <Download size={14} /> Export XLS
            </button>
          </div>

          <div className="space-y-4">
            {loading ? (
              Array(3)
                .fill(0)
                .map((_, i) => (
                  <div
                    key={i}
                    className="h-28 bg-white dark:bg-white/5 animate-pulse rounded-xl"
                  />
                ))
            ) : (
              (weeklyRecords.length > 0
                ? weeklyRecords
                : [
                    {
                      _id: "1",
                      week: 1,
                      date: "10 AUG 2025",
                      male: 10,
                      female: 13,
                      total: 23,
                    },
                    {
                      _id: "2",
                      week: 2,
                      date: "17 AUG 2025",
                      male: 12,
                      female: 15,
                      total: 27,
                    },
                  ]
              ).map((w, idx) => (
                <motion.div
                  key={w._id || idx}
                  whileHover={{ x: 4 }}
                  className="bg-white dark:bg-[#1a1c1e] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/10 rounded-xl flex flex-col items-center justify-center">
                      <p className="text-[8px] font-bold text-[#349DC5] uppercase leading-none mb-1">
                        WK
                      </p>
                      <p className="text-xl font-bold text-[#349DC5] leading-none">
                        {w.week}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">
                        Mobilization: {w.date}
                      </p>
                      <h4 className="text-base font-bold text-[#00204a] dark:text-white">
                        Total {w.total} Personnel
                      </h4>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="hidden sm:flex gap-4 px-6 border-r border-gray-100 dark:border-white/5">
                      <div className="text-center">
                        <p className="text-sm font-bold text-blue-500">
                          {w.male}
                        </p>
                        <p className="text-[8px] font-bold text-gray-300 uppercase">
                          M
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-rose-500">
                          {w.female}
                        </p>
                        <p className="text-[8px] font-bold text-gray-300 uppercase">
                          F
                        </p>
                      </div>
                    </div>
                    <ChevronRight
                      size={20}
                      className="text-gray-200 group-hover:text-[#349DC5] transition-all"
                    />
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <CommandButton
            label="Registry Management"
            desc="Examine complete mobilization logs"
            icon={<Users className="text-blue-500" size={24} />}
            onClick={() => navigate("/attendance/students")}
          />
          <CommandButton
            label="Initialize Session"
            desc="Capture new real-time deployment data"
            icon={<Plus className="text-emerald-500" size={24} />}
            onClick={() => navigate("/attendance/take")}
            primary
          />
          <CommandButton
            label="Historical Archive"
            desc="Access previous cycle intelligence"
            icon={<BarChart3 className="text-purple-500" size={24} />}
            onClick={() => navigate("/attendance/records")}
          />

          <div className="bg-gradient-to-br from-[#00204a] to-[#042e61] p-10 rounded-xl text-white shadow-lg relative overflow-hidden group">
            <h3 className="text-lg font-bold uppercase mb-4">
              Details
            </h3>
            <p className="text-xs font-medium text-blue-100 leading-relaxed mb-8 opacity-80">
              Aggregated engagement data is synchronized with the central
              registry for auditing.
            </p>
            <button className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest bg-white/10 hover:bg-white/20 px-6 py-3 rounded-xl transition-all">
              Full Strategy Report <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
