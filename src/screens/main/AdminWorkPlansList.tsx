import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Search, Star, StarHalf, CopyX, CheckCircle2,
  XCircle, Clock, AlertCircle, X
} from "lucide-react";
import axios from "axios";
import { BASE_URl } from "../../api/users";

const token = () => localStorage.getItem("token");

interface WorkPlanSummary {
  _id: string;
  title: string;
  status: string;
  startDate?: string;
  endDate?: string;
  progressPercent?: number;
  reviewRating?: number;
  rejectionReason?: string;
  successRate?: number;
  successCategory?: "low" | "good" | "perfect";
  unit?: { name: string } | null;
  owner?: { firstName?: string; surname?: string } | null;
  plans?: { activities?: any[] }[];
  generalGoal?: string;
}

const statusColors: Record<string, { bg: string, color: string }> = {
  draft: { bg: "bg-slate-100 dark:bg-slate-800", color: "text-slate-500" },
  pending: { bg: "bg-amber-100 dark:bg-amber-900/40", color: "text-amber-600 dark:text-amber-500" },
  approved: { bg: "bg-teal-100 dark:bg-teal-900/40", color: "text-teal-600 dark:text-teal-400" },
  rejected: { bg: "bg-red-100 dark:bg-red-900/40", color: "text-red-600 dark:text-red-400" },
  ignored: { bg: "bg-slate-200 dark:bg-slate-700", color: "text-slate-600 dark:text-slate-300" },
  completed: { bg: "bg-indigo-100 dark:bg-indigo-900/40", color: "text-indigo-600 dark:text-indigo-400" },
};

const filters = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "completed", label: "Completed" },
  { key: "rejected", label: "Rejected" },
  { key: "ignored", label: "Ignored" },
];

const monthMap: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};

function itDate(start?: string) {
  if (!start) return "—";
  try {
    return `Start: ${new Date(start).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
  } catch { return "—"; }
}

export default function AdminWorkPlansList() {
  const navigate = useNavigate();
  const [items, setItems] = useState<WorkPlanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState("pending");
  const [searchValue, setSearchValue] = useState("");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (activeFilter !== "all") params.append("status", activeFilter);
      if (q) params.append("q", q);
      const res = await axios.get(`${BASE_URl}/api/workplans?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      if (res.data?.ok) setItems(res.data.items || []);
      else throw new Error("Failed to load");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [activeFilter, q]);

  useEffect(() => { load(); }, [load]);

  const searchTokens = searchValue.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = useMemo(() => {
    if (!searchTokens.length) return items;
    return items.filter(it => {
      const title = (it.title || "").toLowerCase();
      const goal = (it.generalGoal || "").toLowerCase();
      const unitName = (it.unit?.name || "").toLowerCase();
      const leaderName = ((it.owner?.firstName || "") + " " + (it.owner?.surname || "")).trim().toLowerCase();
      let year: string | undefined;
      let month: number | undefined;
      if (it.startDate) {
        const d = new Date(it.startDate);
        year = String(d.getFullYear());
        month = d.getMonth();
      }
      return searchTokens.every(tok => {
        if (/^[0-9]{4}$/.test(tok)) return year === tok;
        if (monthMap[tok] !== undefined) return month === monthMap[tok];
        return title.includes(tok) || goal.includes(tok) || unitName.includes(tok) || leaderName.includes(tok);
      });
    });
  }, [items, searchTokens]);

  const Stars = ({ rating, base = 5, color }: { rating: number, base?: number, color: string }) => (
    <div className="flex items-center">
      {Array.from({ length: 5 }).map((_, i) => {
        const val = rating / (base / 5);
        const full = val >= i + 1;
        const half = !full && val >= i + 0.5;
        if (full) return <Star key={i} size={14} className={color} fill="currentColor" strokeWidth={0} />;
        if (half) return <StarHalf key={i} size={14} className={color} fill="currentColor" strokeWidth={0} />;
        return <Star key={i} size={14} className="text-gray-300 dark:text-gray-600" />;
      })}
      <span className="ml-1 text-[11px] font-bold text-gray-800 dark:text-gray-200">
        {base === 100 ? `${rating}%` : rating.toFixed(1)}
      </span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#111] pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-[#1a1a1a] border-b border-gray-100 dark:border-white/5 pt-10 sticky top-0 z-20">
        <div className="flex items-center px-4 mb-4 gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-500">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-base font-black text-[#00204a] dark:text-white flex-1 text-center pr-10">Review Work Plans</h1>
        </div>
        
        {/* Search */}
        <div className="px-4 mb-2">
          <div className="flex items-center bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2">
            <Search size={16} className="text-gray-400 mr-2" />
            <input 
              value={searchValue} 
              onChange={e => setSearchValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && setQ(searchValue.trim())}
              placeholder="Search work plans"
              className="flex-1 bg-transparent text-sm font-medium outline-none dark:text-white"
            />
            {searchValue && (
              <button onClick={() => { setSearchValue(""); setQ(""); }}>
                <X size={16} className="text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Chips */}
        <div className="overflow-x-auto scrollbar-hide px-4 pb-3 flex gap-2">
          {filters.map(f => {
            const act = activeFilter === f.key;
            return (
              <button 
                key={f.key} 
                onClick={() => setActiveFilter(f.key)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-[13px] font-bold transition-colors ${act ? "bg-[#349DC5] text-white" : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400"}`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 pt-4">
        {loading ? (
          <div className="flex flex-col items-center py-16 gap-4">
            <div className="w-10 h-10 rounded-full border-4 border-[#349DC5] border-t-transparent animate-spin" />
          </div>
        ) : error ? (
          <p className="text-red-500 text-sm font-bold p-4">{error}</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3 text-center">
            <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center">
              <Search size={32} className="text-gray-300" />
            </div>
            <p className="text-base font-black text-[#00204a] dark:text-white">No work plans</p>
            <p className="text-sm font-medium text-gray-500">Nothing to review in this filter.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(item => {
              const hasDates = item.startDate && item.endDate;
              const title = hasDates ? `${new Date(item.startDate as string).toLocaleString("en-GB", { month: "short", year: "numeric" })} – ${new Date(item.endDate as string).toLocaleString("en-GB", { month: "short", year: "numeric" })} Work Plan` : item.title;
              const leaderName = ((item.owner?.firstName || "") + " " + (item.owner?.surname || "")).trim();
              const plansCount = item.plans?.length || 0;
              const actCount = (item.plans || []).reduce((a, p) => a + (p.activities?.length || 0), 0);
              const sc = statusColors[item.status] || statusColors.draft;

              return (
                <motion.div 
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  key={item._id}
                  onClick={() => navigate(`/admin-work-plans/${item._id}`)} // Wait, AdminViewWorkPlan route. We will build it.
                  className="bg-white dark:bg-[#1e1e1e] rounded-xl border border-gray-200 dark:border-white/10 p-3.5 shadow-sm cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-[#0f172a] dark:text-white flex-1 pr-2">{title}</p>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${sc.bg} ${sc.color}`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mb-1.5 font-medium">
                    {itDate(item.startDate)} | Unit: {item.unit?.name || "—"}{leaderName ? ` • Leader: ${leaderName}` : ""}
                  </p>
                  {item.generalGoal && <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">{item.generalGoal}</p>}
                  
                  <div className="flex items-center flex-wrap gap-2 mb-2">
                    <span className="px-2.5 py-1 bg-slate-100 dark:bg-white/5 rounded-full text-[11px] font-bold text-slate-800 dark:text-slate-200">Plans: {plansCount}</span>
                    <span className="px-2.5 py-1 bg-slate-100 dark:bg-white/5 rounded-full text-[11px] font-bold text-slate-800 dark:text-slate-200">Activities: {actCount}</span>
                    <span className="ml-auto px-2.5 py-1 bg-[#349DC5] text-white rounded-full text-[11px] font-black">{item.progressPercent ?? 0}%</span>
                  </div>

                  <div className="flex items-center h-5">
                    {typeof item.successRate === "number" ? (
                      <Stars rating={item.successRate} base={100} color="text-indigo-500" />
                    ) : typeof item.reviewRating === "number" && item.reviewRating > 0 ? (
                      <Stars rating={item.reviewRating} base={5} color="text-amber-500" />
                    ) : null}
                  </div>

                  {item.status === "rejected" && item.rejectionReason && (
                    <div className="flex items-start bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 rounded-lg p-2.5 mt-2">
                      <AlertCircle size={14} className="text-red-600 mt-0.5 mr-2 shrink-0" />
                      <div>
                        <p className="text-[11px] font-bold text-red-700 uppercase mb-0.5">Rejected</p>
                        <p className="text-[11px] text-red-600 font-medium line-clamp-3">{item.rejectionReason}</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
