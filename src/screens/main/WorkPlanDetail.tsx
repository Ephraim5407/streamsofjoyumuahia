import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, Trash2, X, Send, CheckCircle2, XCircle,
  ChevronDown, Target, Clock, Edit3, AlertCircle, Calendar
} from "lucide-react";
import {
  getWorkPlan,
  createWorkPlan,
  updateWorkPlan,
  submitWorkPlan,
  approveWorkPlan,
  rejectWorkPlan,
  updateActivityProgress,
  calcWeightedProgress,
  reviewApproveWorkPlan,
  reviewRejectWorkPlan,
} from "../../api/workPlans";
import toast from "react-hot-toast";
import axios from "axios";
import { BASE_URl } from "../../api/users";

const token = () => localStorage.getItem("token");

interface Activity {
  _id?: string;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  progressPercent?: number;
  completionSummary?: string;
  status?: string;
}

interface Plan {
  title: string;
  activities: Activity[];
}

interface WorkPlanDoc {
  _id: string;
  title?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  generalGoal?: string;
  notes?: string;
  plans: Plan[];
  weightedProgress?: number;
  rejectionReason?: string;
}

const isNew = (id?: string) => !id || id === "new";

export default function WorkPlanDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const creating = isNew(id);

  const [plan, setPlan] = useState<WorkPlanDoc | null>(null);
  const [loading, setLoading] = useState(!creating);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState("");
  // form fields
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [generalGoal, setGeneralGoal] = useState("");
  const [notes, setNotes] = useState("");
  const [plans, setPlans] = useState<Plan[]>([{ title: "Plan 1", activities: [{ title: "", description: "" }] }]);
  // progress modal
  const [progressModal, setProgressModal] = useState<{ planIdx: number; actIdx: number; act: Activity } | null>(null);
  const [progressVal, setProgressVal] = useState(0);
  const [progressSummary, setProgressSummary] = useState("");
  // review modal
  const [reviewModal, setReviewModal] = useState<"approve" | "reject" | null>(null);
  const [reviewReason, setReviewReason] = useState("");
  const [reviewRating, setReviewRating] = useState(5);

  useEffect(() => {
    (async () => {
      const res = await axios.get(`${BASE_URl}/api/users/me`, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.data?.ok) setRole(res.data.user?.activeRole || "");
    })();
  }, []);

  const load = useCallback(async () => {
    if (creating) return;
    try {
      const data = await getWorkPlan(id!);
      const wp = data.workPlan || data;
      setPlan(wp);
      setTitle(wp.title || "");
      setStartDate((wp.startDate || "").slice(0, 10));
      setEndDate((wp.endDate || "").slice(0, 10));
      setGeneralGoal(wp.generalGoal || "");
      setNotes(wp.notes || "");
      setPlans(wp.plans || []);
    } catch (e: any) { toast.error(e.message || "Failed to load"); }
    finally { setLoading(false); }
  }, [id, creating]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Please enter a plan title"); return; }
    if (plans.some(p => p.activities.some(a => !a.title.trim()))) { toast.error("Please fill in all activity titles"); return; }
    setSaving(true);
    try {
      const body = { title, startDate, endDate, generalGoal, notes, plans: plans.map(p => ({ title: p.title, activities: p.activities.map(a => ({ title: a.title, description: a.description, startDate: a.startDate, endDate: a.endDate })) })) };
      if (creating) {
        await createWorkPlan(body);
        toast.success("Work Plan created");
      } else {
        await updateWorkPlan(id!, body);
        toast.success("Work Plan updated");
      }
      navigate(-1);
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setSaving(false); }
  };

  const handleSubmit = async () => {
    if (!id) return;
    setSaving(true);
    try { await submitWorkPlan(id); toast.success("Work Plan submitted"); load(); }
    catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setSaving(false); }
  };

  const handleReview = async () => {
    if (!id) return;
    setSaving(true);
    try {
      if (reviewModal === "approve") await reviewApproveWorkPlan(id, { rating: reviewRating });
      else await reviewRejectWorkPlan(id, { reason: reviewReason });
      toast.success(`Work Plan ${reviewModal === "approve" ? "Approved" : "Rejected"}`);
      setReviewModal(null); load();
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setSaving(false); }
  };

  const handleProgress = async () => {
    if (!progressModal || !id) return;
    const act = progressModal.act;
    if (!act._id) return;
    setSaving(true);
    try {
      await updateActivityProgress(id, act._id, progressVal, progressSummary);
      toast.success("Progress updated"); setProgressModal(null); load();
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setSaving(false); }
  };

  const addPlan = () => setPlans(p => [...p, { title: `Plan ${p.length + 1}`, activities: [{ title: "", description: "" }] }]);
  const removePlan = (i: number) => setPlans(p => p.filter((_, idx) => idx !== i));
  const addActivity = (pIdx: number) => setPlans(p => { const n = [...p]; n[pIdx].activities.push({ title: "", description: "" }); return n; });
  const removeActivity = (pIdx: number, aIdx: number) => setPlans(p => { const n = [...p]; n[pIdx].activities = n[pIdx].activities.filter((_, i) => i !== aIdx); return n; });

  const canEdit = creating || (plan?.status === "draft");
  const canSubmit = false; // Submitting is handled via NewWorkPlan (Publish button)
  const canReview = !creating && (role === "SuperAdmin" || role === "MinistryAdmin") && (plan?.status === "pending" || plan?.status === "submitted");
  const canUpdateProgress = !creating && (role === "UnitLeader" || role === "Member");

  const progress = plan ? (plan.weightedProgress || calcWeightedProgress(plan.plans)) : 0;
  const statusLabel: Record<string, string> = { draft: "Draft", submitted: "Pending Review", pending: "Pending Review", approved: "Approved", rejected: "Rejected", ignored: "Ignored", completed: "Completed" };
  const statusColor: Record<string, string> = { draft: "#6B7280", submitted: "#F59E0B", pending: "#F59E0B", approved: "#10B981", rejected: "#EF4444", ignored: "#475569", completed: "#6366f1" };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#111]">
      <div className="w-12 h-12 rounded-full border-4 border-[#349DC5] border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#111] pb-32">
      {/* Header */}
      <div className="bg-white dark:bg-[#1a1a1a] border-b border-gray-100 dark:border-white/5 px-4 pt-10 pb-4 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-500">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-base font-black text-[#00204a] dark:text-white uppercase tracking-tight">{creating ? "New Work Plan" : "Work Plan"}</h1>
              {!creating && plan && (
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg" style={{ color: statusColor[plan.status || "draft"], backgroundColor: statusColor[plan.status || "draft"] + "20" }}>
                  {statusLabel[plan.status || "draft"]}
                </span>
              )}
            </div>
          </div>
          {/* Edit button for owners on draft/rejected plans */}
          {!creating && plan && (plan.status === "draft" || plan.status === "rejected") && (
            <button
              onClick={() => navigate(`/work-plans/new?edit=${id}`)}
              className="flex items-center gap-2 px-4 py-2 bg-[#349DC5] text-white rounded-2xl text-xs font-black uppercase tracking-wider"
            >
              Edit
            </button>
          )}
          {canEdit && creating && (
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-[#349DC5] text-white rounded-2xl text-xs font-black uppercase tracking-wider disabled:opacity-50">
              {saving ? <div className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : null}
              Create
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pt-5 space-y-4">
        {/* Rejection Warning */}
        {plan?.status === "rejected" && plan.rejectionReason && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 border border-red-100 dark:border-red-900/30 flex items-start gap-3">
            <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-red-500 uppercase tracking-widest mb-1">Rejection Reason</p>
              <p className="text-sm text-red-400 font-medium">{plan.rejectionReason}</p>
            </div>
          </div>
        )}

        {/* Progress bar (view mode) */}
        {!creating && plan && (
          <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-4 border border-gray-100 dark:border-white/5 shadow-sm">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Overall Progress</p>
              <p className="text-sm font-black text-[#349DC5]">{Math.round(progress)}%</p>
            </div>
            <div className="h-3 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
              <div className="h-full rounded-full bg-[#349DC5] transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
            </div>
          </div>
        )}

        {/* Basic info */}
        <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-4 border border-gray-100 dark:border-white/5 shadow-sm space-y-4">
          <FieldBlock label="Work Plan Title *" disabled={!canEdit}>
            <input value={title} onChange={e => setTitle(e.target.value)} disabled={!canEdit} placeholder="Enter title" className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 text-sm font-bold text-[#00204a] dark:text-white outline-none disabled:opacity-50" />
          </FieldBlock>
          <div className="grid grid-cols-2 gap-3">
            <FieldBlock label="Start Date" disabled={!canEdit}>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} disabled={!canEdit} className="w-full px-3 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 text-xs font-bold text-[#00204a] dark:text-white outline-none disabled:opacity-50" />
            </FieldBlock>
            <FieldBlock label="End Date" disabled={!canEdit}>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} disabled={!canEdit} className="w-full px-3 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 text-xs font-bold text-[#00204a] dark:text-white outline-none disabled:opacity-50" />
            </FieldBlock>
          </div>
          <FieldBlock label="General Goal" disabled={!canEdit}>
            <textarea value={generalGoal} onChange={e => setGeneralGoal(e.target.value)} disabled={!canEdit} rows={2} placeholder="Describe the overall goal..." className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 text-sm font-medium text-[#00204a] dark:text-white outline-none resize-none disabled:opacity-50" />
          </FieldBlock>
          <FieldBlock label="Strategy Notes" disabled={!canEdit}>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} disabled={!canEdit} rows={2} placeholder="Any strategy or additional notes..." className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 text-sm font-medium text-[#00204a] dark:text-white outline-none resize-none disabled:opacity-50" />
          </FieldBlock>
        </div>

        {/* Plans */}
        {plans.map((p, pIdx) => (
          <div key={pIdx} className="bg-white dark:bg-[#1e1e1e] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-[#349DC5]/5 border-b border-gray-100 dark:border-white/5">
              {canEdit ? (
                <input value={p.title} onChange={e => setPlans(pl => { const n = [...pl]; n[pIdx].title = e.target.value; return n; })} className="text-sm font-black text-[#00204a] dark:text-white bg-transparent outline-none flex-1" />
              ) : (
                <p className="text-sm font-black text-[#00204a] dark:text-white">{p.title}</p>
              )}
              {canEdit && plans.length > 1 && (
                <button onClick={() => removePlan(pIdx)} className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-400 ml-2">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
            <div className="p-4 space-y-3">
              {p.activities.map((act, aIdx) => (
                <div key={aIdx} className="bg-gray-50 dark:bg-white/5 rounded-xl p-3 border border-gray-100 dark:border-white/5">
                  {canEdit ? (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <input value={act.title} onChange={e => setPlans(pl => { const n = [...pl]; n[pIdx].activities[aIdx].title = e.target.value; return n; })} placeholder="Activity title *" className="flex-1 bg-transparent text-sm font-bold text-[#00204a] dark:text-white outline-none placeholder:text-gray-300" />
                        {p.activities.length > 1 && (
                          <button onClick={() => removeActivity(pIdx, aIdx)} className="w-6 h-6 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-400">
                            <X size={11} />
                          </button>
                        )}
                      </div>
                      <input value={act.description || ""} onChange={e => setPlans(pl => { const n = [...pl]; n[pIdx].activities[aIdx].description = e.target.value; return n; })} placeholder="Description (optional)" className="w-full bg-transparent text-xs text-gray-400 outline-none placeholder:text-gray-300 mb-2" />
                    </>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-bold text-[#00204a] dark:text-white">{act.title}</p>
                          {act.description && <p className="text-xs text-gray-400 mt-0.5">{act.description}</p>}
                        </div>
                        {canUpdateProgress && (
                          <button onClick={() => { setProgressModal({ planIdx: pIdx, actIdx: aIdx, act }); setProgressVal(act.progressPercent || 0); setProgressSummary(act.completionSummary || ""); }} className="px-2.5 py-1.5 bg-[#349DC5] text-white rounded-lg text-[10px] font-black">
                            Progress
                          </button>
                        )}
                      </div>
                      <div className="mt-2 text-right">
                        <span className="text-[9px] font-black text-[#349DC5]">{act.progressPercent || 0}%</span>
                        <div className="h-1 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden mt-1">
                          <div className="h-full rounded-full bg-[#349DC5]" style={{ width: `${Math.min(act.progressPercent || 0, 100)}%` }} />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {canEdit && (
                <button onClick={() => addActivity(pIdx)} className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-200 dark:border-white/10 flex items-center justify-center gap-2 text-xs font-black text-gray-400 hover:border-[#349DC5] hover:text-[#349DC5] transition-colors">
                  <Plus size={14} /> Add Activity
                </button>
              )}
            </div>
          </div>
        ))}

        {canEdit && (
          <button onClick={addPlan} className="w-full py-3.5 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 flex items-center justify-center gap-2 text-xs font-black text-gray-400 hover:border-[#349DC5] hover:text-[#349DC5] transition-colors">
            <Plus size={15} /> Add New Plan
          </button>
        )}

        {/* Actions */}
        <div className="space-y-2">
          {canSubmit && (
            <button onClick={handleSubmit} disabled={saving} className="w-full py-4 bg-[#349DC5] text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2">
              <Send size={15} /> Submit Work Plan
            </button>
          )}
          {canReview && (
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setReviewModal("approve")} className="py-4 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                <CheckCircle2 size={15} /> Approve
              </button>
              <button onClick={() => setReviewModal("reject")} className="py-4 bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                <XCircle size={15} /> Reject
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Progress Modal */}
      <AnimatePresence>
        {progressModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setProgressModal(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} onClick={e => e.stopPropagation()} className="relative bg-white dark:bg-[#1e1e1e] w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl">
              <p className="text-base font-black text-[#00204a] dark:text-white uppercase tracking-widest mb-4">Update Progress</p>
              <p className="text-sm font-bold text-gray-400 mb-4">{progressModal.act.title}</p>
              <div className="mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Progress</span>
                  <span className="text-sm font-black text-[#349DC5]">{progressVal}%</span>
                </div>
                <input type="range" min={0} max={100} value={progressVal} onChange={e => setProgressVal(Number(e.target.value))} className="w-full accent-[#349DC5]" />
              </div>
              <div className="mb-5">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Completion Summary</label>
                <textarea value={progressSummary} onChange={e => setProgressSummary(e.target.value)} rows={3} placeholder="Describe what was done..." className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 text-sm font-medium text-[#00204a] dark:text-white outline-none resize-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setProgressModal(null)} className="flex-1 py-3.5 rounded-2xl border border-gray-200 dark:border-white/10 text-xs font-black text-gray-400">Cancel</button>
                <button onClick={handleProgress} disabled={saving} className="flex-1 py-3.5 bg-[#349DC5] text-white rounded-2xl text-xs font-black">
                  {saving ? "Saving..." : "Save Progress"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Review Modal */}
      <AnimatePresence>
        {reviewModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setReviewModal(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} onClick={e => e.stopPropagation()} className="relative bg-white dark:bg-[#1e1e1e] w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl">
              <p className="text-sm font-black text-[#00204a] dark:text-white uppercase tracking-widest mb-4">
                {reviewModal === "approve" ? "Approve Work Plan" : "Reject Work Plan"}
              </p>
              {reviewModal === "approve" ? (
                <div className="mb-5">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Rating (1-5)</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(r => (
                      <button key={r} onClick={() => setReviewRating(r)} className={`flex-1 py-3 rounded-xl font-black text-sm transition-colors ${reviewRating >= r ? "bg-[#349DC5] text-white" : "bg-gray-100 dark:bg-white/5 text-gray-400"}`}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mb-5">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Rejection Reason</label>
                  <textarea value={reviewReason} onChange={e => setReviewReason(e.target.value)} rows={3} placeholder="Provide reason for rejection..." className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 text-sm text-[#00204a] dark:text-white outline-none resize-none" />
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setReviewModal(null)} className="flex-1 py-3.5 rounded-2xl border border-gray-200 text-xs font-black text-gray-400">Cancel</button>
                <button onClick={handleReview} disabled={saving} className={`flex-1 py-3.5 text-white rounded-2xl text-xs font-black ${reviewModal === "approve" ? "bg-emerald-500" : "bg-red-500"}`}>
                  {saving ? "Processing..." : reviewModal === "approve" ? "Approve" : "Reject"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FieldBlock({ label, disabled, children }: { label: string; disabled?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{label}</label>
      {children}
    </div>
  );
}
