import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Search, RefreshCw, User, Phone, Calendar, UserCheck
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { BASE_URl } from "../../api/users";
import AsyncStorage from "../../utils/AsyncStorage";

const getUnitId = async () => {
  const direct = await AsyncStorage.getItem("activeUnitId");
  if (direct) return direct;
  const rawUser = await AsyncStorage.getItem("user");
  if (!rawUser) return null;
  const u = JSON.parse(rawUser);
  return u?.activeUnitId || u?.activeUnit?._id || u?.activeUnit ||
    (u?.roles || []).find((r: any) => r.role === "UnitLeader" && r.unit)?.unit ||
    (u?.roles || []).find((r: any) => r.role === "Member" && r.unit)?.unit || null;
};

interface AssignedDoc {
  _id: string;
  name: string;
  phone?: string;
  gender?: string;
  ageRange?: string;
  address?: string;
  note?: string;
  visitDate?: string;
  assignedTo?: string;
  status?: string;
  createdAt: string;
}

export default function AssignedFirstTimers() {
  const navigate = useNavigate();
  const [items, setItems] = useState<AssignedDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState("All");

  const fetchItems = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    else setRefreshing(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const unitId = await getUnitId();
      // Try assigned-to-me endpoint; fallback to general first-timers with assigned filter
      const res = await axios.get(`${BASE_URl}/api/first-timers/assigned`, {
        params: { unitId: unitId || undefined, year: selectedYear === "All" ? undefined : selectedYear },
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() =>
        axios.get(`${BASE_URl}/api/first-timers`, {
          params: { unitId: unitId || undefined, assigned: true, year: selectedYear === "All" ? undefined : selectedYear },
          headers: { Authorization: `Bearer ${token}` },
        })
      );
      const data = res.data?.firstTimers || res.data?.items || res.data || [];
      setItems(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load assigned follow-ups");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedYear]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const filtered = useMemo(() => {
    return items.filter(ft => {
      const matchSearch = (ft.name || "").toLowerCase().includes(search.toLowerCase()) || (ft.phone || "").includes(search);
      const matchYear = selectedYear === "All" || ((ft.visitDate || ft.createdAt || "") && new Date(ft.visitDate || ft.createdAt).getFullYear().toString() === selectedYear);
      return matchSearch && matchYear;
    });
  }, [items, search, selectedYear]);

  const years = ["All", ...Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString())];

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0f1113] pb-32">
      {/* Header */}
      <div className="bg-[#00204a] pt-12 sm:pt-16 pb-32 sm:pb-24 px-6 sm:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-20 opacity-10 pointer-events-none">
          <UserCheck size={300} className="text-[#349DC5] -rotate-12" />
        </div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-4 sm:gap-6">
            <button onClick={() => navigate(-1)} className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-2xl bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-95">
              <ArrowLeft size={28} />
            </button>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight leading-[1.1] sm:leading-none">First Timers Assigned to You</h1>
              <div className="flex items-center gap-3 mt-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#349DC5] animate-pulse" />
                <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Personal Follow-Up Roster</span>
              </div>
            </div>
          </div>
          <button onClick={() => fetchItems(true)} className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center border border-white/10 hover:bg-white/20 transition-all active:scale-95">
            <RefreshCw size={22} className={refreshing ? "animate-spin text-[#349DC5]" : "text-white/60"} />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-8">
        {/* Count Card */}
        <div className="bg-white dark:bg-[#1a1c1e] rounded-[40px] p-10 border border-gray-100 dark:border-white/5 shadow-sm mb-12 flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
            <UserCheck size={100} className="text-[#349DC5]" />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] mb-3">Assigned to Me</p>
            <h2 className="text-6xl font-black text-[#00204a] dark:text-white leading-none tracking-tighter tabular-nums">{filtered.length}</h2>
          </div>
          <div className="flex bg-gray-50 dark:bg-white/5 p-2 rounded-2xl gap-2 max-w-[50%] overflow-x-auto no-scrollbar">
            {years.slice(0, 4).map(y => (
              <button key={y} onClick={() => setSelectedYear(y)}
                className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedYear === y ? "bg-[#00204a] text-white shadow-md" : "text-gray-400 hover:text-gray-600"}`}>
                {y === "All" ? "Lifetime" : y}
              </button>
            ))}
          </div>
        </div>

        <div className="relative group mb-12">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#349DC5] transition-colors" size={24} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or phone..."
            className="w-full h-20 pl-16 pr-8 bg-white dark:bg-[#1a1c1e] rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 font-bold text-lg outline-none focus:border-[#349DC5]/20 transition-all placeholder:text-gray-200" />
        </div>

        <div className="space-y-6">
          {loading ? (
            <div className="flex flex-col items-center py-24 gap-6 text-center">
              <div className="w-12 h-12 rounded-full border-4 border-[#349DC5] border-t-transparent animate-spin" />
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] animate-pulse">Loading Your Follow-Up Roster...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-32 gap-6 text-center bg-white dark:bg-[#1a1c1e] rounded-[48px] border-2 border-dashed border-gray-100 dark:border-white/5">
              <div className="w-24 h-24 rounded-[40px] bg-sky-50 dark:bg-sky-900/10 flex items-center justify-center text-6xl shadow-inner animate-pulse">📋</div>
              <div>
                <p className="text-sm font-black text-[#00204a] dark:text-white uppercase tracking-widest mb-2">No Assignments Found</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-loose">You have no first-timers assigned to you in this period.</p>
              </div>
            </div>
          ) : filtered.map(ft => (
            <motion.div layout key={ft._id}
              className="bg-white dark:bg-[#1a1c1e] p-8 rounded-[40px] shadow-sm border border-gray-100 dark:border-white/5 hover:border-[#349DC5]/10 transition-all group">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-sky-50 dark:bg-sky-900/10 text-sky-500 rounded-[28px] flex items-center justify-center text-3xl font-black shadow-inner">
                    {(ft.name || "?")[0]}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-[#00204a] dark:text-white uppercase tracking-tight leading-none mb-2 group-hover:text-[#349DC5] transition-colors">
                      {ft.name || "Unknown"}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {ft.gender && <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-md ${ft.gender === "Male" ? "text-blue-500 bg-blue-50" : "text-rose-400 bg-rose-50"}`}>{ft.gender}</span>}
                      {ft.ageRange && <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 px-3 py-1 rounded-md">{ft.ageRange}</span>}
                      {ft.status && <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-md ${ft.status === "Followed Up" ? "text-emerald-600 bg-emerald-50" : "text-amber-600 bg-amber-50"}`}>{ft.status}</span>}
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {ft.phone && (
                  <div className="flex items-center justify-between py-3 border-b border-gray-50 dark:border-white/5">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Phone size={12} />Phone</span>
                    <a href={`tel:${ft.phone}`} className="text-sm font-bold text-[#349DC5] hover:underline">{ft.phone}</a>
                  </div>
                )}
                {ft.visitDate && (
                  <div className="flex items-center justify-between py-3 border-b border-gray-50 dark:border-white/5">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Calendar size={12} />Visit Date</span>
                    <span className="text-sm font-bold text-[#00204a] dark:text-white">{new Date(ft.visitDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
                  </div>
                )}
                {ft.address && (
                  <div className="flex items-center justify-between py-3 border-b border-gray-50 dark:border-white/5">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Address</span>
                    <span className="text-sm font-bold text-[#00204a] dark:text-white">{ft.address}</span>
                  </div>
                )}
                {ft.note && <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400 leading-relaxed border-l-4 border-sky-400/30 pl-4 py-2">{ft.note}</p>}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
