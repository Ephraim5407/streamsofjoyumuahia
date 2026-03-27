import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Star, StarHalf, ChevronDown, ChevronUp, AlertCircle,
  MessageSquare, CheckCircle2, XCircle, BarChart3, Clock, X
} from "lucide-react";
import axios from "axios";
import { BASE_URl } from "../../api/users";
import toast from "react-hot-toast";

const token = () => localStorage.getItem("token");

interface Activity {
  _id: string; title: string; description?: string; progressPercent?: number; status?: string;
  reviewStatus?: string; reviewRating?: number; reviewRejectionReason?: string;
  reviewComments?: { _id: string; message: string; user?: string; createdAt?: string }[];
  resources?: string[];
  progressUpdates?: { _id: string; message?: string; progressPercent?: number; createdAt?: string }[];
}
interface Plan { _id: string; title: string; activities: Activity[]; }
interface WorkPlan {
  _id: string; title: string; generalGoal?: string; status: string; progressPercent: number;
  plans: Plan[]; startDate?: string; endDate?: string; reviewRating?: number;
  reviewComments?: { _id: string; message: string; user?: string; createdAt?: string }[];
  rejectionReason?: string; successRate?: number; successCategory?: "low" | "good" | "perfect";
  successRatedAt?: string; successFeedback?: string;
}

const statusColors: Record<string, string> = { approved: "#0f766e", pending: "#f59e0b", draft: "#64748b", rejected: "#dc2626", ignored: "#475569" };

export default function AdminViewWorkPlan() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const [item, setItem] = useState<WorkPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPlans, setExpandedPlans] = useState<Record<string, boolean>>({});
  
  // Modals
  const [decisionModal, setDecisionModal] = useState<"approve" | "reject" | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reason, setReason] = useState("");
  const [savingDecision, setSavingDecision] = useState(false);

  const [activityModal, setActivityModal] = useState<{ activity: Activity; mode: "approve" | "reject" } | null>(null);
  const [activityRating, setActivityRating] = useState(5);
  const [activityComment, setActivityComment] = useState("");
  const [activityReason, setActivityReason] = useState("");
  const [savingActivityDecision, setSavingActivityDecision] = useState(false);

  const [successModal, setSuccessModal] = useState(false);
  const [successStars, setSuccessStars] = useState(0); // 0 to 5
  const [successFeedback, setSuccessFeedback] = useState("");
  const [successSaving, setSuccessSaving] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState<"low" | "good" | "perfect" | null>(null);

  const load = useCallback(async () => {
    if (!id) return; setLoading(true); setError(null);
    try {
      const res = await axios.get(`${BASE_URl}/api/workplans/${id}`, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.data?.ok) setItem(res.data.item);
      else throw new Error("Failed to load");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const submitDecision = async (mode: "approve" | "reject") => {
    if (!item) return; setSavingDecision(true);
    try {
      const body: any = { rating: rating, comment: comment || undefined };
      if (mode === "reject") body.reason = reason || "No reason provided";
      const url = mode === "approve" ? `${BASE_URl}/api/workplans/${item._id}/review/approve` : `${BASE_URl}/api/workplans/${item._id}/review/reject`;
      const res = await axios.post(url, body, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.data?.ok) {
        setItem(res.data.item); setDecisionModal(null); setRating(5); setComment(""); setReason("");
        toast.success(`Work Plan ${mode === "approve" ? "Approved" : "Rejected"} successfully`);
      } else throw new Error(res.data?.error || "Failed");
    } catch (e: any) { toast.error(e.response?.data?.error || e.message); }
    finally { setSavingDecision(false); }
  };

  const submitActivityDecision = async () => {
    if (!item || !activityModal) return; setSavingActivityDecision(true);
    try {
      const body: any = { 
        activityId: activityModal.activity._id, 
        decision: activityModal.mode === "approve" ? "approve" : "reject", 
        rating: activityRating, 
        comment: activityComment || undefined 
      };
      if (activityModal.mode === "reject") body.reason = activityReason || "No reason provided";
      const res = await axios.post(`${BASE_URl}/api/workplans/${item._id}/review/activity`, body, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.data?.ok) {
        setItem(res.data.item); setActivityModal(null); setActivityRating(5); setActivityComment(""); setActivityReason("");
        toast.success("Activity decision saved");
      } else throw new Error(res.data?.error || "Failed");
    } catch (e: any) { toast.error(e.response?.data?.error || e.message); }
    finally { setSavingActivityDecision(false); }
  };

  const starsToPercent = (s: number) => Math.round(s * 20);
  const deriveCategory = (pct: number) => pct < 40 ? "low" : pct < 85 ? "good" : "perfect";

  const submitSuccessRate = async () => {
    if (!item) return; setSuccessSaving(true);
    try {
      const pct = starsToPercent(successStars);
      const category = deriveCategory(pct);
      const res = await axios.post(`${BASE_URl}/api/workplans/${item._id}/success-rate`, {
        rate: pct, category, feedback: successFeedback || undefined
      }, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.data?.ok) {
        setItem(res.data.item); setSuccessModal(false); setFeedbackCategory(category);
        toast.success("Success Rate saved");
      } else throw new Error(res.data?.error || "Failed");
    } catch (e: any) { toast.error(e.response?.data?.error || e.message); }
    finally { setSuccessSaving(false); }
  };

  const StarsDisplay = ({ value, size = 16 }: { value: number; size?: number }) => (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => {
        const full = value >= i + 1;
        const half = !full && value >= i + 0.5;
        if (full) return <Star key={i} size={size} className="text-amber-400" fill="currentColor" strokeWidth={0} />;
        if (half) return <StarHalf key={i} size={size} className="text-amber-400" fill="currentColor" strokeWidth={0} />;
        return <Star key={i} size={size} className="text-gray-300 dark:text-gray-600" />;
      })}
    </div>
  );

  const StarRater = ({ value, onChange, size = 26 }: { value: number; onChange: (v: number) => void; size?: number }) => (
    <div className="flex items-center gap-2">
      <div className="flex items-center cursor-pointer">
        {Array.from({ length: 5 }).map((_, i) => (
          <button key={i} type="button" onClick={() => onChange(i + 1)} className="p-1 hover:scale-110 transition-transform">
            <Star size={size} className={value >= i + 1 ? "text-amber-400" : "text-gray-300 dark:text-gray-600"} fill={value >= i + 1 ? "currentColor" : "none"} />
          </button>
        ))}
      </div>
      <span className="font-bold text-[#0f172a] dark:text-white text-lg">{value.toFixed(1)}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#111] pb-24 relative overflow-hidden">
      {/* Header */}
      <div className="bg-white dark:bg-[#1a1a1a] border-b border-gray-100 dark:border-white/5 pt-10 sticky top-0 z-20">
        <div className="flex items-center gap-3 px-4 mb-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-base font-black text-[#00204a] dark:text-white flex-1 truncate pr-10">{item?.title || "Work Plan Review"}</h1>
        </div>
      </div>

      <div className="px-4 pt-5">
        {loading ? (
          <div className="flex flex-col items-center py-16 gap-4">
            <div className="w-10 h-10 rounded-full border-4 border-[#349DC5] border-t-transparent animate-spin" />
          </div>
        ) : error ? (
          <p className="text-red-500 font-bold p-4 text-center">{error}</p>
        ) : !item ? (
          <p className="text-gray-500 font-medium p-4 text-center">Plan not found.</p>
        ) : (
          <div className="space-y-5">
            {/* Status & Ratings */}
            <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-[#1e1e1e] p-4 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
              <span className="px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider text-white" style={{ backgroundColor: statusColors[item.status] || "#334155" }}>
                {item.status}
              </span>
              {typeof item.reviewRating === "number" && item.reviewRating > 0 && (
                <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-white/5 px-3 py-1.5 rounded-full border border-gray-100 dark:border-white/5">
                  <StarsDisplay value={item.reviewRating} size={14} />
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{item.reviewRating.toFixed(1)}</span>
                </div>
              )}
              {typeof item.successRate === "number" && (
                <div className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-full border border-indigo-100 dark:border-indigo-900/30">
                  <StarsDisplay value={(item.successRate / 20)} size={14} />
                  <span className="text-xs font-black text-indigo-700 dark:text-indigo-400">{item.successRate}%</span>
                </div>
              )}
            </div>

            {/* Success Feedback Box */}
            {item.successFeedback && (
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/20 rounded-2xl p-4">
                <p className="text-[11px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><BarChart3 size={14} /> Final Feedback</p>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100 leading-relaxed">{item.successFeedback}</p>
              </div>
            )}

            {/* Rate Success Button */}
            {item.status === "approved" && item.successRate === undefined && (
              <button onClick={() => { setSuccessStars(item.progressPercent ? item.progressPercent / 20 : 0); setSuccessFeedback(item.successFeedback || ""); setSuccessModal(true); }} className="w-fit flex items-center gap-2 px-5 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-lg shadow-indigo-500/20">
                <BarChart3 size={16} /> Rate Success
              </button>
            )}

            {/* Rejection Box */}
            {item.status === "rejected" && item.rejectionReason && (
              <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 rounded-2xl p-4 flex items-start gap-3">
                <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-black text-red-700 dark:text-red-400 uppercase tracking-widest mb-1.5">Rejected</p>
                  <p className="text-sm font-medium text-red-900 dark:text-red-100 leading-relaxed">{item.rejectionReason}</p>
                </div>
              </div>
            )}

            {/* General Goal */}
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">General Goal</p>
              <div className="bg-gray-100 dark:bg-white/5 rounded-xl p-4 border border-gray-200 dark:border-white/10">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.generalGoal || "—"}</p>
              </div>
            </div>

            {/* Global Review Comments */}
            {Array.isArray(item.reviewComments) && item.reviewComments.length > 0 && (
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Reviewer Comments</p>
                <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-3 space-y-3">
                  {item.reviewComments.map(c => (
                    <div key={c._id} className="flex gap-3">
                      <MessageSquare size={16} className="text-[#349DC5] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-800 dark:text-gray-200 mb-1">{c.message}</p>
                        {c.createdAt && <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{new Date(c.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Plans List */}
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 px-1 mt-6">Plans & Activities</p>
              <div className="space-y-4">
                {item.plans.map(plan => {
                  const expanded = expandedPlans[plan._id];
                  return (
                    <div key={plan._id} className="bg-white dark:bg-[#1e1e1e] rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
                      <button onClick={() => setExpandedPlans(p => ({ ...p, [plan._id]: !expanded }))} className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                        <span className="text-sm font-black text-[#00204a] dark:text-white">{plan.title}</span>
                        {expanded ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
                      </button>
                      
                      {expanded && (
                        <div className="p-4 space-y-4">
                          {plan.activities.map(act => (
                            <div key={act._id} className="border border-gray-200 dark:border-white/10 rounded-xl p-4 bg-gray-50/50 dark:bg-[#1a1a1a]">
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <p className="text-sm font-bold text-[#0f172a] dark:text-white flex-1">{act.title}</p>
                                {act.reviewStatus && (
                                  <span className="px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider text-white" style={{ backgroundColor: act.reviewStatus === "approved" ? "#0f766e" : act.reviewStatus === "rejected" ? "#dc2626" : "#f59e0b" }}>
                                    {act.reviewStatus}
                                  </span>
                                )}
                              </div>
                              {act.description && <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">{act.description}</p>}
                              
                              {/* Reason / Rating / Comments */}
                              {act.reviewRejectionReason && <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg mt-2 mb-2 font-medium">Reason: {act.reviewRejectionReason}</p>}
                              {typeof act.reviewRating === "number" && act.reviewRating > 0 && (
                                <div className="flex items-center gap-1.5 mt-2 mb-2">
                                  <StarsDisplay value={act.reviewRating} size={14} />
                                  <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200">{act.reviewRating.toFixed(1)}</span>
                                </div>
                              )}
                              
                              {Array.isArray(act.progressUpdates) && act.progressUpdates.length > 0 && (
                                <div className="mt-4 bg-white dark:bg-[#222] border border-gray-100 dark:border-white/5 rounded-xl p-3">
                                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 text-center">Progress Timeline</p>
                                  <div className="space-y-3">
                                    {act.progressUpdates.slice().sort((a,b) => new Date(a.createdAt||"").getTime() - new Date(b.createdAt||"").getTime()).map(up => (
                                      <div key={up._id} className="flex flex-col border-l-2 border-[#349DC5] pl-3 relative pr-2">
                                        <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-[#349DC5] border border-white dark:border-[#222]" />
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="text-xs font-bold text-[#00204a] dark:text-white">{up.progressPercent ?? "—"}%</span>
                                          <span className="text-[9px] font-bold text-gray-400 uppercase">{up.createdAt ? new Date(up.createdAt).toLocaleString("en-GB", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}</span>
                                        </div>
                                        {up.message && <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{up.message}</p>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {(!act.reviewStatus || act.reviewStatus === "pending") && item.status === "pending" && (
                                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
                                  <button onClick={() => setActivityModal({ activity: act, mode: "approve" })} className="flex-1 py-2.5 bg-[#349DC5] text-white rounded-lg text-xs font-black uppercase tracking-wider">Approve</button>
                                  <button onClick={() => setActivityModal({ activity: act, mode: "reject" })} className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-xs font-black uppercase tracking-wider">Reject</button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Global Decision Footer */}
      {!loading && item && item.status === "pending" && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1a1a1a] border-t border-gray-200 dark:border-white/10 p-4 z-10 grid grid-cols-2 gap-3 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.05)] dark:shadow-none">
          <button onClick={() => setDecisionModal("reject")} className="py-4 rounded-2xl bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 text-sm font-black uppercase tracking-widest transition-colors">Reject</button>
          <button onClick={() => setDecisionModal("approve")} className="py-4 rounded-2xl bg-[#349DC5] hover:bg-[#2b86a8] text-white text-sm font-black uppercase tracking-widest transition-colors shadow-lg shadow-[#349DC5]/20">Approve</button>
        </div>
      )}

      {/* Decision Modal */}
      <AnimatePresence>
        {decisionModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !savingDecision && setDecisionModal(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} onClick={e => e.stopPropagation()} className="relative bg-white dark:bg-[#1e1e1e] w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl flex flex-col max-h-[85vh]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-[#00204a] dark:text-white uppercase tracking-tight">{decisionModal === "approve" ? "Approve Work Plan" : "Reject Work Plan"}</h3>
                <button disabled={savingDecision} onClick={() => setDecisionModal(null)} className="p-2 bg-gray-100 dark:bg-white/10 rounded-full text-gray-500 hover:text-gray-900 dark:hover:text-white"><X size={16} /></button>
              </div>
              <div className="overflow-y-auto scrollbar-hide flex-1 space-y-6">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Reviewer Rating</label>
                  <StarRater value={rating} onChange={setRating} />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Reviewer Comment (optional)</label>
                  <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} placeholder="Add a comment..." className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm outline-none resize-none text-[#0f172a] dark:text-white" />
                </div>
                {decisionModal === "reject" && (
                  <div>
                    <label className="block text-xs font-black text-red-500 uppercase tracking-widest mb-3 flex items-center gap-1.5"><AlertCircle size={14} /> Rejection Reason</label>
                    <textarea value={reason} onChange={e => setReason(e.target.value)} rows={4} placeholder="Be specific and constructive..." className="w-full px-4 py-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl text-sm outline-none resize-none text-[#0f172a] dark:text-white focus:border-red-500" />
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-6 mt-auto">
                <button disabled={savingDecision} onClick={() => setDecisionModal(null)} className="flex-1 py-4 border border-gray-200 dark:border-white/10 rounded-2xl text-xs font-black text-gray-500 uppercase tracking-wider">Cancel</button>
                <button disabled={savingDecision} onClick={() => submitDecision(decisionModal)} className={`flex-1 py-4 rounded-2xl text-white text-xs font-black uppercase tracking-wider ${decisionModal === "approve" ? "bg-[#349DC5] shadow-lg shadow-[#349DC5]/20" : "bg-red-600 shadow-lg shadow-red-600/20"}`}>
                  {savingDecision ? "Processing..." : decisionModal === "approve" ? "Approve Plan" : "Reject Plan"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Activity Decision Modal */}
      <AnimatePresence>
        {activityModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !savingActivityDecision && setActivityModal(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} onClick={e => e.stopPropagation()} className="relative bg-white dark:bg-[#1e1e1e] w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl flex flex-col max-h-[85vh]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-[#00204a] dark:text-white uppercase tracking-tight">{activityModal.mode === "approve" ? "Approve Activity" : "Reject Activity"}</h3>
                <button disabled={savingActivityDecision} onClick={() => setActivityModal(null)} className="p-2 bg-gray-100 dark:bg-white/10 rounded-full text-gray-500"><X size={16} /></button>
              </div>
              <p className="text-sm font-bold text-[#349DC5] mb-6 line-clamp-2">{activityModal.activity.title}</p>
              
              <div className="overflow-y-auto scrollbar-hide flex-1 space-y-6">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Activity Rating</label>
                  <StarRater value={activityRating} onChange={setActivityRating} size={22} />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Comment (optional)</label>
                  <textarea value={activityComment} onChange={e => setActivityComment(e.target.value)} rows={3} className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm outline-none resize-none text-[#0f172a] dark:text-white" />
                </div>
                {activityModal.mode === "reject" && (
                  <div>
                    <label className="block text-xs font-black text-red-500 uppercase tracking-widest mb-3 flex items-center gap-1.5"><AlertCircle size={14} /> Rejection Reason</label>
                    <textarea value={activityReason} onChange={e => setActivityReason(e.target.value)} rows={3} className="w-full px-4 py-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl text-sm outline-none resize-none text-[#0f172a] dark:text-white" />
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-6 mt-auto">
                <button disabled={savingActivityDecision} onClick={() => setActivityModal(null)} className="flex-[0.8] py-3 border border-gray-200 dark:border-white/10 rounded-2xl text-xs font-black text-gray-500 uppercase tracking-wider">Cancel</button>
                <button disabled={savingActivityDecision} onClick={submitActivityDecision} className={`flex-1 py-3 rounded-2xl text-white text-xs font-black uppercase tracking-wider ${activityModal.mode === "approve" ? "bg-[#349DC5]" : "bg-red-600"}`}>
                  {savingActivityDecision ? "Wait..." : activityModal.mode === "approve" ? "Approve" : "Reject"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Modal */}
      <AnimatePresence>
        {successModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !successSaving && setSuccessModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} onClick={e => e.stopPropagation()} className="relative bg-white dark:bg-[#1e1e1e] w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-black text-[#00204a] dark:text-white uppercase tracking-tight">{item?.successRate !== undefined ? "Update Outcome" : "Rate Outcome"}</h3>
                  <p className="text-xs font-medium text-gray-500 mt-1">Provide the final success metric</p>
                </div>
                <button disabled={successSaving} onClick={() => setSuccessModal(false)} className="p-2 bg-gray-100 dark:bg-white/10 rounded-full text-gray-500"><X size={16} /></button>
              </div>

              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl py-6 px-4 flex flex-col items-center mb-6">
                <StarRater value={successStars} onChange={setSuccessStars} size={30} />
                <p className="text-4xl font-black text-[#00204a] dark:text-white mt-4">{starsToPercent(successStars)}%</p>
                <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 mt-2 uppercase tracking-[0.2em]">{deriveCategory(starsToPercent(successStars))}</p>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Reviewer Feedback</label>
                <textarea value={successFeedback} onChange={e => setSuccessFeedback(e.target.value)} rows={4} placeholder="Summarize key achievements..." className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm outline-none resize-none text-[#0f172a] dark:text-white" />
              </div>

              <button disabled={successSaving} onClick={submitSuccessRate} className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-colors shadow-lg shadow-indigo-500/20">
                {successSaving ? "Saving..." : item?.successRate !== undefined ? "Update Score" : "Lock Score"}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
