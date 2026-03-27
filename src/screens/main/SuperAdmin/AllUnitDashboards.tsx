import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Search,
  Filter,
  Users,
  ChevronRight,
  RefreshCw,
  Shield,
  Calendar,
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { BASE_URl } from "../../../api/users";
import AsyncStorage from "../../../utils/AsyncStorage";

interface UnitDashboardItem {
  _id: string;
  name: string;
  leaderId?: string | null;
  leaderName: string;
  membersCount: number;
  activeCount: number;
  lastReportAt: string | null;
  ministryName?: string | null;
}

export default function AllUnitDashboards() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const restrictToMinistry = queryParams.get("restrictToMinistry") === "true";
  const presetMinistry = queryParams.get("ministry") || "";

  const [search, setSearch] = useState("");
  const [data, setData] = useState<UnitDashboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ministry, setMinistry] = useState(presetMinistry);
  const [ministryList, setMinistryList] = useState<string[]>([]);
  const [showFilter, setShowFilter] = useState(false);

  const fetchUnits = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          navigate("/login");
          return;
        }
        const params = new URLSearchParams();
        params.append("days", "14");
        if (ministry) params.append("ministry", ministry);
        const res = await axios.get(`${BASE_URl}/api/units/dashboard?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data?.ok) {
          const list = (res.data.units || []).map((u: any) => ({
            _id: String(u._id),
            name: u.name,
            leaderName: u.leaderName || "Unassigned",
            leaderId: u.leaderId || null,
            membersCount: u.membersCount || 0,
            activeCount: u.activeCount || 0,
            lastReportAt: u.lastReportAt || null,
            ministryName: u.ministry?.name || u.ministryName || null,
          }));
          setData(list);
          if (!restrictToMinistry) {
            const mins = Array.from(
              new Set(list.map((u: any) => u.ministryName).filter(Boolean)),
            ) as string[];
            setMinistryList(mins.sort());
          }
        }
      } catch (e) {
        toast.error("Sync Failure");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [navigate, ministry, restrictToMinistry],
  );

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const filteredData = useMemo(() => {
    if (!search.trim()) return data;
    const lower = search.toLowerCase();
    return data.filter(
      (u) =>
        u.name.toLowerCase().includes(lower) || u.leaderName.toLowerCase().includes(lower),
    );
  }, [search, data]);

  const formatDate = (dt: string | null) => {
    if (!dt) return "Never";
    return new Date(dt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading && data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-[#0f1218]">
        <div className="w-16 h-16 border-4 border-[#349DC5] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[10px] font-bold text-[#349DC5] uppercase tracking-widest animate-pulse">
          Aggregating Unit Intelligence...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-32">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate(-1)}
            className="p-4 rounded-2xl bg-white dark:bg-[#1a1c1e] shadow-sm border border-gray-100 dark:border-white/5 text-gray-400 hover:text-[#349DC5] transition-all active:scale-95"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-[#00204a] dark:text-white uppercase leading-none">
              Unit Fleet Status
            </h1>
            <p className="text-[10px] font-bold text-[#349DC5] uppercase mt-2">
              Global Deployment Overview
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Filter units..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-14 pl-14 pr-6 bg-white dark:bg-[#1a1c1e] border border-gray-100 dark:border-white/5 rounded-xl text-sm font-bold focus:border-[#349DC5] transition-all outline-none"
            />
          </div>
          <button
            onClick={() => fetchUnits(true)}
            className="w-14 h-14 rounded-xl bg-white dark:bg-[#1a1c1e] border border-gray-100 dark:border-white/5 text-gray-400 hover:text-[#349DC5] transition-all shadow-sm flex items-center justify-center"
          >
            <RefreshCw size={20} className={refreshing ? "animate-spin text-[#349DC5]" : ""} />
          </button>
          {!restrictToMinistry && (
            <button
              onClick={() => setShowFilter(!showFilter)}
              className={`h-14 px-6 rounded-xl border transition-all flex items-center gap-3 font-bold text-[10px] uppercase active:scale-95 ${ministry ? "bg-[#349DC5] text-white border-[#349DC5]" : "bg-white dark:bg-[#1a1c1e] border-gray-100 dark:border-white/5 text-gray-400"}`}
            >
              <Filter size={18} /> {ministry || "Ministry Filter"}
            </button>
          )}
        </div>
      </header>

      <AnimatePresence>
        {showFilter && !restrictToMinistry && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-10"
          >
            <div className="flex flex-wrap gap-3 p-6 bg-gray-50/50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10">
              <button
                onClick={() => {
                  setMinistry("");
                  setShowFilter(false);
                }}
                className={`px-5 py-2.5 rounded-lg text-[10px] font-bold uppercase transition-all ${!ministry ? "bg-[#00204a] text-white" : "bg-white dark:bg-gray-800 text-gray-500"}`}
              >
                All Regions
              </button>
              {ministryList.map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMinistry(m);
                    setShowFilter(false);
                  }}
                  className={`px-5 py-2.5 rounded-lg text-[10px] font-bold uppercase transition-all ${ministry === m ? "bg-[#349DC5] text-white" : "bg-white dark:bg-gray-800 text-gray-500"}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
        <div className="bg-[#00204a] p-8 rounded-3xl text-white shadow-xl relative overflow-hidden group">
          <Users
            size={120}
            className="absolute -top-4 -right-4 opacity-5 group-hover:scale-110 transition-transform duration-700"
          />
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-2">
            Global Personnel
          </p>
          <h3 className="text-4xl font-black mb-1">
            {data.reduce((acc, curr) => acc + curr.membersCount, 0).toLocaleString()}
          </h3>
          <p className="text-[10px] font-bold opacity-40 uppercase">Total Field Agents</p>
        </div>
        <div className="bg-white dark:bg-[#1a1c1e] p-8 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
          <p className="text-[10px] font-bold text-[#349DC5] uppercase tracking-widest mb-2">
            Unit Distribution
          </p>
          <h3 className="text-4xl font-black text-[#00204a] dark:text-white mb-1">
            {data.length}
          </h3>
          <p className="text-[10px] font-bold text-gray-400 uppercase">Operational Hubs</p>
        </div>
        <div className="bg-white dark:bg-[#1a1c1e] p-8 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm text-center md:text-left">
          <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-2">
            Strategic Engagement
          </p>
          <h3 className="text-4xl font-black text-[#00204a] dark:text-white mb-1">
            {data.reduce((acc, curr) => acc + curr.activeCount, 0).toLocaleString()}
          </h3>
          <p className="text-[10px] font-bold text-gray-400 uppercase">Active Engagement</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredData.map((unit) => (
          <motion.div
            layout
            key={unit._id}
            whileHover={{ y: -5 }}
            className="group bg-white dark:bg-[#1a1c1e] p-8 rounded-[40px] border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col"
          >
            <div className="flex items-start justify-between mb-8">
              <div className="w-14 h-14 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center justify-center text-[#349DC5] transition-transform group-hover:scale-110">
                <Shield size={28} />
              </div>
              {unit.lastReportAt && (
                <div className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-500 dark:text-emerald-400 rounded-full text-[9px] font-black uppercase">
                  Connected
                </div>
              )}
            </div>
            <h3 className="text-xl font-bold text-[#00204a] dark:text-white uppercase leading-tight mb-6">
              {unit.name}
            </h3>
            <div className="space-y-4 mb-10 flex-1">
              <div className="flex items-center gap-3 opacity-80">
                <Calendar size={14} className="text-gray-400" />
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  Updated: {formatDate(unit.lastReportAt)}
                </p>
              </div>
              <div className="flex items-center gap-3 opacity-80">
                <Users size={14} className="text-gray-400" />
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  Lead: {unit.leaderName}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-10 p-5 bg-gray-50/50 dark:bg-white/2 rounded-3xl border border-gray-100 dark:border-white/5">
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase mb-2">Personnel</p>
                <p className="text-xl font-bold text-[#00204a] dark:text-white">
                  {unit.membersCount}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase mb-2">Activity</p>
                <p className="text-xl font-bold text-[#349DC5]">
                  {unit.membersCount > 0
                    ? Math.round((unit.activeCount / unit.membersCount) * 100)
                    : 0}
                  %
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => navigate(`/sa/profile?userId=${unit.leaderId}&unitId=${unit._id}`)}
                className="flex-1 h-12 bg-[#00204a] text-white rounded-xl text-[10px] font-bold uppercase hover:bg-[#349DC5] transition-all"
              >
                Inspect Lead
              </button>
              <button
                onClick={async () => {
                  await AsyncStorage.setItem("activeUnitId", unit._id);
                  navigate(`/member-list?unitId=${unit._id}`);
                }}
                className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-white/5 text-gray-400 flex items-center justify-center hover:bg-[#349DC5] hover:text-white transition-all border border-gray-100 dark:border-white/5"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
