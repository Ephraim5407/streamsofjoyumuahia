import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, FileText, Search, Star, StarHalf,
  ChevronRight, Calendar, AlertCircle, RefreshCw, MoreVertical, Trash2, Edit3, Eye, CheckCircle2
} from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "../../api/client";
import { BASE_URl } from "../../api/users";
import AsyncStorage from "../../utils/AsyncStorage";
import { loadLocalDrafts, removeLocalDraft, type LocalWorkPlanDraft } from "../../utils/localDrafts";

interface Activity {
  title?: string;
  description?: string;
  resources?: string[] | string;
  resourcesArr?: string[];
}
interface PlanItem {
  title?: string;
  activities?: Activity[];
}
interface WorkPlanSummary {
  _id: string;
  title: string;
  status: string;
  owner?: string | { _id: string; firstName?: string; surname?: string };
  progressPercent?: number;
  startDate?: string;
  endDate?: string;
  generalGoal?: string;
  plans?: PlanItem[];
  local?: boolean;
  successRate?: number;
  successCategory?: "low" | "good" | "perfect";
}

const statusColors: Record<string, string> = {
  draft: "#334155",
  pending: "#b45309",
  approved: "#0f766e",
  rejected: "#dc2626",
  ignored: "#6b7280",
  completed: "#4338ca",
};

const filters = [
  { key: "all", label: "All" },
  { key: "mydrafts", label: "My Drafts" },
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
        const res = await apiClient.get(`/api/users/me`);
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
      // Load remote workplans
      const res = await apiClient.get("/api/workplans");
      const remoteItems: WorkPlanSummary[] = res.data?.ok ? res.data.items || [] : [];
      
      // Load local drafts
      const drafts = await loadLocalDrafts();
      const localOnes: WorkPlanSummary[] = drafts.map((d) => ({
        _id: d.id,
        title: d.title || "Untitled Draft",
        status: "draft",
        owner: d.owner,
        startDate: d.startDate || undefined,
        endDate: d.endDate || undefined,
        generalGoal: d.generalGoal,
        plans: d.plans,
        local: true,
      }));
      
      setItems([...localOnes, ...remoteItems]);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredItems = useMemo(() => {
    if (!items.length) return [];
    if (activeFilter === "all") return items;
    if (activeFilter === "mydrafts") return items.filter(i => i.local === true);
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
      // Handle local draft deletion
      if (id.startsWith("local_")) {
        await removeLocalDraft(id);
        setItems((cur) => cur.filter((i) => i._id !== id));
        setShowDeleteModal(null);
        toast.success("Draft discarded");
        return;
      }
      // Handle remote workplan deletion
      await apiClient.delete(`/api/workplans/${id}`);
      setItems(cur => cur.filter(i => i._id !== id));
      setShowDeleteModal(null);
      toast.success("Work Plan deleted");
    } catch (e: any) {
      toast.error(e.response?.data?.error || "Delete failed");
    } finally { setDeleting(false); }
  };

const publishDraft = async (draft: WorkPlanSummary) => {
    try {
      const body: any = {
        title: draft.title,
        startDate: draft.startDate || null,
        endDate: draft.endDate || null,
        generalGoal: draft.generalGoal || "",
        status: "pending",
        plans: (draft.plans || []).map((p: any) => ({
          title: p.title,
          activities: (p.activities || []).map((a: any) => ({
            title: a.title,
            description: a.description,
            resources: a.resourcesArr || a.resources || [],
            estimatedHours: a.estimatedHours ? Number(a.estimatedHours) : 0,
          })),
        })),
      };
      // Create new work plan via POST (not PUT) - this publishes the draft as a new item
      const res = await apiClient.post("/api/workplans", body);
      if (!res.data?.ok) throw new Error(res.data?.error || "Failed to publish");
      // Remove local draft after successful publish
      await removeLocalDraft(draft._id);
      toast.success("Draft published — pending review");
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.error || e.message || "Publish failed");
    }
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
    <div className="min-h-screen bg-white pb-24 relative">
      {/* Header */}
      <div className="bg-white pt-10 sticky top-0 z-20 border-b border-[#e2e8ef]">
        <div className="flex items-center justify-between px-4 mb-3">
          <button onClick={() => navigate(-1)} className="p-1" style={{ padding: 4 }}>
            <ArrowLeft size={24} color="#111" />
          </button>
          <h1 className="text-base font-semibold text-[#0f172a] flex-1 text-center">Work Plans</h1>
          {userRole !== "SuperAdmin" && canCreate && (
            <button 
              onClick={() => navigate("/work-plans/new")} 
              className="w-10 h-10 rounded-full bg-[#349DC5] flex items-center justify-center text-white shrink-0"
            >
              <Plus size={22} />
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
          <div className="flex flex-col items-center py-16 gap-4 text-center px-4 mt-6 ">
            <div className="w-[30vw] h-[30vw] max-w-[120px] max-h-[120px] rounded-full bg-[#e7f5fa] flex items-center justify-center mb-2">
              <div className="w-[20vw] h-[20vw] max-w-[80px] max-h-[80px] rounded-full bg-white border border-[#c8e3ee] flex items-center justify-center">
                <Search size={28} className="text-[#349DC5]" />
              </div>
            </div>
            <p className="text-lg font-bold text-[#0f172a]">No work plans yet</p>
            <p className="text-sm text-[#64748b] leading-5 max-w-[75vw]">
              {userRole === "Member" ? "Work plans are created by unit leaders. Once a plan is available, you'll be able to view and follow all activities." : "Create your first work plan to start organizing\nyour goals and activities."}
            </p>
            {canCreate && (
              <button onClick={() => navigate("/work-plans/new")} className="mt-6 px-6 py-3.5 rounded-xl font-semibold text-white text-sm" style={{ backgroundColor: "#349DC5" }}>
                Create your first plan
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
          <div className="space-y-3">
            {filteredItems.map(item => {
              const plansCount = item.plans?.length || 0;
              const activitiesCount = (item.plans || []).reduce((a, p) => a + (p.activities?.length || 0), 0);
              const ownerId = typeof item.owner === "string" ? item.owner : item.owner?._id;
              const hasDates = item.startDate && item.endDate;
              const displayedTitle = hasDates
                ? `${new Date(item.startDate as string).toLocaleString("default", { month: "short" })} ${new Date(item.startDate as string).getFullYear()} – ${new Date(item.endDate as string).toLocaleString("default", { month: "short" })} ${new Date(item.endDate as string).getFullYear()} Work Plan`
                : item.title;
              const statusBg = statusColors[item.status] || "#334155";

              return (
                <div
                  key={item._id}
                  onClick={() => navigate(`/work-plans/${item._id}`)}
                  className="bg-white border border-[#dbe3ef] rounded-[10px] p-3.5 mb-4 relative overflow-visible cursor-pointer"
                >
<div className="flex items-start justify-between">
                    <p className="text-sm font-bold text-[#0f172a] flex-1 pr-6">{displayedTitle}</p>
                    {ownerId === currentUserId && item.status !== "completed" && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setMenuFor(menuFor === item._id ? null : item._id); }} 
                        className="absolute top-3 right-2 p-1"
                      >
                        <MoreVertical size={18} className="text-[#0f172a]" />
                      </button>
                    )}
                  </div>

                  {item.generalGoal && (
                    <p className="text-[12px] text-[#334155] mt-1">
                      General goal: {item.generalGoal}
                    </p>
                  )}

                  <div className="flex items-center mt-2.5">
                    <span 
                      className="px-2.5 py-1 rounded-xl text-[11px] font-semibold capitalize text-white"
                      style={{ backgroundColor: statusBg }}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="flex items-center mt-3 gap-2">
                    <span className="px-3 py-1.5 rounded-2xl text-[11px] font-semibold text-white" style={{ backgroundColor: "#0f89b8" }}>Plans: {plansCount}</span>
                    <span className="px-3 py-1.5 rounded-2xl text-[11px] font-semibold text-white" style={{ backgroundColor: "#0f89b8" }}>Activities: {activitiesCount}</span>
                    {typeof item.successRate === "number" ? (
                      <span className="px-3 py-1.5 rounded-2xl text-[11px] font-semibold text-[#4338ca]" style={{ backgroundColor: "#eef2ff" }}>{item.successRate}%</span>
                    ) : (
                      typeof item.progressPercent === "number" && (
                        <span className="px-3 py-1.5 rounded-2xl text-[11px] font-semibold text-white" style={{ backgroundColor: "#0f89b8" }}>{item.progressPercent}%</span>
                      )
                    )}
                  </div>

                  {typeof item.successRate === "number" && <Stars rate={item.successRate} />}

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {menuFor === item._id && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute top-8 right-2 bg-white rounded-lg shadow-lg border border-[#e2e8f0] z-30 min-w-[130px] overflow-hidden py-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button onClick={() => { setMenuFor(null); navigate(`/work-plans/${item._id}`); }} className="flex items-center w-full text-left px-3.5 py-2.5 hover:bg-gray-50 text-[12.5px] font-medium text-[#0f172a]">
                          View
                        </button>
                        <button onClick={() => { setMenuFor(null); navigate(`/work-plans/new?edit=${item._id}`); }} className="flex items-center w-full text-left px-3.5 py-2.5 hover:bg-gray-50 text-[12.5px] font-medium text-[#0f172a] border-t border-gray-50">
                          {item.local ? "Edit Draft" : "Edit"}
                        </button>
                        {item.status === "draft" && (
                          <button onClick={() => { setMenuFor(null); publishDraft(item); }} className="flex items-center w-full text-left px-3.5 py-2.5 hover:bg-gray-50 text-[12.5px] font-medium text-[#0f766e] border-t border-gray-50">
                            Publish
                          </button>
                        )}
                        <button onClick={() => { setMenuFor(null); setShowDeleteModal(item); }} className="flex items-center w-full text-left px-3.5 py-2.5 hover:bg-red-50 text-[12.5px] font-medium text-red-500 border-t border-gray-50">
                          {item.local ? "Discard" : "Delete"}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {menuFor && <div className="fixed inset-0 z-20" onClick={() => setMenuFor(null)} />}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ padding: "8vw" }}>
          <div className="absolute inset-0 bg-black/45" onClick={() => !deleting && setShowDeleteModal(null)} />
          <div className="relative bg-white w-full rounded-[20px] shadow-xl" style={{ padding: "5.5vw" }}>
            <h3 className="text-base font-bold text-[#0f172a] mb-3">Delete Work Plan</h3>
            <p className="text-sm text-[#475569] mt-3 leading-[18px]">Are you sure you want to delete "{showDeleteModal.title || "Untitled"}"? This cannot be undone.</p>
            <div className="flex justify-end gap-3 mt-6">
              <button 
                disabled={deleting} 
                onClick={() => setShowDeleteModal(null)} 
                className="px-5 py-3 rounded-[10px] bg-[#f1f5f9] text-[#0f172a] font-semibold text-sm"
              >
                Cancel
              </button>
              <button 
                disabled={deleting} 
                onClick={() => doDelete(showDeleteModal._id)} 
                className="px-5 py-3 rounded-[10px] bg-[#dc2626] text-white font-bold text-sm disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

