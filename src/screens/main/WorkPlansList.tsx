import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, FileText, Search, Star, StarHalf,
  ChevronRight, Calendar, AlertCircle, RefreshCw, MoreVertical, Trash2, Edit3, Eye, CheckCircle2
} from "lucide-react";
import axios from "axios";
import { BASE_URl } from "../../api/users";
import toast from "react-hot-toast";

const token = () => localStorage.getItem("token");

interface WorkPlanSummary {
  _id: string;
  title: string;
  status: string;
  owner?: string | { _id: string; firstName?: string; surname?: string };
  progressPercent?: number;
  startDate?: string;
  endDate?: string;
  generalGoal?: string;
  plans?: { activities?: any[] }[];
  local?: boolean;
  successRate?: number;
  successCategory?: "low" | "good" | "perfect";
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
  { key: "active", label: "Active" },
  { key: "past", label: "Past" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "ignored", label: "Ignored" },
  { key: "completed", label: "Completed" },
];

export default function WorkPlansList() {
  const navigate = useNavigate();
  const [items, setItems] = useState<WorkPlanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [userRole, setUserRole] = useState<string>();
  const [canCreate, setCanCreate] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>();
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<WorkPlanSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${BASE_URl}/api/users/me`, { headers: { Authorization: `Bearer ${token()}` } });
        if (res.data?.ok) {
          const u = res.data.user;
          setCurrentUserId(u._id);
          setUserRole(u.activeRole);
          if (u.activeRole === "SuperAdmin" || u.activeRole === "MinistryAdmin") {
            navigate("/admin-work-plans", { replace: true });
            return;
          }
          if (u.activeRole === "UnitLeader") {
            setCanCreate(true);
          } else if (u.activeRole === "Member") {
            const roles = u.roles || [];
            const activeUnitId = u.activeUnitId || roles.find((r: any) => r.role === u.activeRole && r.unit)?.unit;
            const matchRole = roles.find((r: any) => String(r.unit) === String(activeUnitId) && (r.role === "Member" || r.role === "UnitLeader"));
            if (matchRole && Array.isArray(matchRole.duties) && matchRole.duties.includes("CreateWorkPlan")) {
              setCanCreate(true);
            }
          }
        }
      } catch {}
    })();
  }, [navigate]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const uRes = await axios.get(`${BASE_URl}/api/users/me`, { headers: { Authorization: `Bearer ${token()}` } }).catch(() => null);
      let activeUnitId = null;
      if (uRes?.data?.ok) {
        const u = uRes.data.user;
        activeUnitId = u.activeUnitId;
        if (!activeUnitId) {
          const match = (u.roles || []).find((r: any) => r.role === u.activeRole && r.unit);
          activeUnitId = match ? match.unit : null;
        }
      }
      const headers: any = { Authorization: `Bearer ${token()}` };
      if (activeUnitId) headers["x-active-unit"] = activeUnitId;

      const res = await axios.get(`${BASE_URl}/api/workplans`, { headers });
      if (res.data?.ok) {
        const remote = res.data.items || [];
        setItems(remote); // Local drafts logic skipped to prioritize backend sync parity
      } else throw new Error(res.data?.error || "Failed to load");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredItems = useMemo(() => {
    if (!items.length) return [];
    if (activeFilter === "all") return items;
    if (activeFilter === "active") return items.filter(i => {
      if (!i.startDate || !i.endDate) return false;
      const sd = new Date(i.startDate); const ed = new Date(i.endDate);
      return i.status === "approved" && sd <= today && ed >= today;
    });
    if (activeFilter === "past") return items.filter(i => {
      if (!i.endDate) return false;
      return i.status === "approved" && new Date(i.endDate) < today;
    });
    return items.filter(i => i.status === activeFilter);
  }, [items, activeFilter, today]);

  const doDelete = async (id: string) => {
    setDeleting(true);
    try {
      await axios.delete(`${BASE_URl}/api/workplans/${id}`, { headers: { Authorization: `Bearer ${token()}` } });
      setItems(cur => cur.filter(i => i._id !== id));
      setShowDeleteModal(null);
      toast.success("Work Plan deleted");
    } catch (e: any) {
      toast.error(e.response?.data?.error || "Delete failed");
    } finally { setDeleting(false); }
  };

  const publishDraft = async (draft: WorkPlanSummary) => {
    toast.error("Draft publishing is handled via New Work Plan screen on WebPWA");
  };

  const Stars = ({ rate }: { rate: number }) => (
    <div className="flex items-center gap-0.5 mt-2">
      {Array.from({ length: 5 }).map((_, i) => {
        const val = rate / 20;
        const full = val >= i + 1;
        const half = !full && val >= i + 0.5;
        if (full) return <Star key={i} size={14} className="text-indigo-500" fill="currentColor" strokeWidth={0} />;
        if (half) return <StarHalf key={i} size={14} className="text-indigo-500" fill="currentColor" strokeWidth={0} />;
        return <Star key={i} size={14} className="text-gray-300 dark:text-gray-600" />;
      })}
      <span className="ml-1 text-[11px] font-bold text-gray-800 dark:text-gray-200">{rate}%</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#111] pb-24 relative overflow-hidden">
      {/* Header */}
      <div className="bg-white dark:bg-[#1a1a1a] border-b border-gray-100 dark:border-white/5 pt-10 sticky top-0 z-20">
        <div className="flex items-center justify-between px-4 mb-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-500">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-base font-black text-[#00204a] dark:text-white flex-1 text-center pr-10">Work Plans</h1>
          </div>
          {userRole !== "SuperAdmin" && canCreate && (
             <button onClick={() => navigate("/work-plans/new")} className="w-10 h-10 rounded-2xl bg-[#349DC5] flex items-center justify-center text-white shrink-0 absolute right-4">
               <Plus size={20} />
             </button>
          )}
        </div>
        
        {/* Filter Chips */}
        {!loading && (
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
        )}
      </div>

      <div className="px-4 pt-4">
        {loading ? (
          <div className="flex flex-col items-center py-16 gap-4">
            <div className="w-10 h-10 rounded-full border-4 border-[#349DC5] border-t-transparent animate-spin" />
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading...</p>
          </div>
        ) : error ? (
          <p className="text-red-500 text-sm font-bold p-4">{error}</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-4 text-center px-4">
            <div className="w-20 h-20 rounded-full bg-blue-50 dark:bg-white/5 flex items-center justify-center mb-2">
              <Search size={32} className="text-[#349DC5]" />
            </div>
            <p className="text-lg font-black text-[#00204a] dark:text-white">No work plans yet</p>
            <p className="text-sm font-medium text-gray-500 leading-relaxed">
              {userRole === "Member" ? "Work plans are created by unit leaders. Once a plan is available, you'll be able to view and follow all activities." : "Create your first work plan to start organizing your goals and activities."}
            </p>
            {canCreate && (
              <button onClick={() => navigate("/work-plans/new")} className="mt-4 px-6 py-4 bg-[#349DC5] text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-xl shadow-[#349DC5]/20">
                Create First Plan
              </button>
            )}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 text-center">
            <Search size={40} className="text-gray-300" />
            <p className="font-bold text-gray-500">No results for this filter</p>
            <button onClick={() => setActiveFilter("all")} className="text-[#349DC5] text-sm font-black uppercase tracking-wider mt-2">Clear Filter</button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map(item => {
              const plansCount = item.plans?.length || 0;
              const activitiesCount = (item.plans || []).reduce((a, p) => a + (p.activities?.length || 0), 0);
              const ownerId = typeof item.owner === "string" ? item.owner : item.owner?._id;
              const hasDates = item.startDate && item.endDate;
              const displayedTitle = hasDates
                ? `${new Date(item.startDate as string).toLocaleString("en-GB", { month: "short", year: "numeric" })} – ${new Date(item.endDate as string).toLocaleString("en-GB", { month: "short", year: "numeric" })} Work Plan`
                : item.title;
              const sc = statusColors[item.status] || statusColors.draft;

              return (
                <motion.div 
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  key={item._id}
                  className="bg-white dark:bg-[#1e1e1e] rounded-2xl border border-gray-200 dark:border-white/10 p-4 shadow-sm relative overflow-visible"
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-bold text-[#0f172a] dark:text-white flex-1 pr-6 cursor-pointer" onClick={() => navigate(`/work-plans/${item._id}`)}>{displayedTitle}</p>
                    {ownerId === currentUserId && (
                      <button onClick={() => setMenuFor(menuFor === item._id ? null : item._id)} className="absolute top-3 right-2 p-2">
                        <MoreVertical size={18} className="text-gray-400" />
                      </button>
                    )}
                  </div>
                  
                  {item.generalGoal && <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">{item.generalGoal}</p>}
                  
                  <div className="flex items-center mb-3">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${sc.bg} ${sc.color}`}>
                      {item.status}
                    </span>
                  </div>

                  <div className="flex items-center flex-wrap gap-2 mb-2">
                    <span className="px-3 py-1 bg-[#0f89b8] text-white rounded-full text-[11px] font-bold shadow-sm">Plans: {plansCount}</span>
                    <span className="px-3 py-1 bg-[#0f89b8] text-white rounded-full text-[11px] font-bold shadow-sm">Activities: {activitiesCount}</span>
                    <span className="ml-auto px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 rounded-full text-[11px] font-black">{item.successRate ?? item.progressPercent ?? 0}%</span>
                  </div>

                  {typeof item.successRate === "number" && <Stars rate={item.successRate} />}

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {menuFor === item._id && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute top-12 right-2 bg-white dark:bg-[#2a2a2a] rounded-xl shadow-xl border border-gray-100 dark:border-white/10 z-30 min-w-[140px] overflow-hidden"
                      >
                        <button onClick={() => { setMenuFor(null); navigate(`/work-plans/${item._id}`); }} className="flex items-center gap-2 w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 text-sm font-bold text-[#00204a] dark:text-white">
                          <Eye size={14} className="text-gray-400" /> View
                        </button>
                        <button onClick={() => { setMenuFor(null); navigate(`/work-plans/new?edit=${item._id}`); }} className="flex items-center gap-2 w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 text-sm font-bold text-[#00204a] dark:text-white border-t border-gray-50 dark:border-white/5">
                          <Edit3 size={14} className="text-gray-400" /> Edit
                        </button>
                        {item.status === "draft" && (
                           <button onClick={() => { setMenuFor(null); publishDraft(item); }} className="flex items-center gap-2 w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 text-sm font-bold text-teal-600 border-t border-gray-50 dark:border-white/5">
                            <CheckCircle2 size={14} /> Publish
                          </button>
                        )}
                        <button onClick={() => { setMenuFor(null); setShowDeleteModal(item); }} className="flex items-center gap-2 w-full text-left px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/10 text-sm font-bold text-red-500 border-t border-gray-50 dark:border-white/5">
                          <Trash2 size={14} /> Delete
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {menuFor && <div className="fixed inset-0 z-20" onClick={() => setMenuFor(null)} />}

      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !deleting && setShowDeleteModal(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white dark:bg-[#1e1e1e] w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center">
              <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} className="text-red-500" />
              </div>
              <h3 className="text-xl font-black text-[#00204a] dark:text-white mb-2">Delete Work Plan</h3>
              <p className="text-sm font-medium text-gray-500 mb-6 px-2">This action cannot be undone. Delete "{showDeleteModal.title || "Untitled"}"?</p>
              <div className="flex gap-3">
                <button disabled={deleting} onClick={() => setShowDeleteModal(null)} className="flex-1 py-4 rounded-2xl border border-gray-200 dark:border-white/10 text-xs font-black text-gray-400 uppercase tracking-wider">Cancel</button>
                <button disabled={deleting} onClick={() => doDelete(showDeleteModal._id)} className="flex-1 py-4 bg-red-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider disabled:opacity-50">
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

