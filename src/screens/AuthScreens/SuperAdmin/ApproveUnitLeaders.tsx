import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { ChevronLeft, Check, X } from "lucide-react";
import apiClient from "../../../api/client";
import { BASE_URl } from "../../../api/users";
import AsyncStorage from "../../../utils/AsyncStorage";

const PRIMARY = "#349DC5";
const AVATAR = "https://www.w3schools.com/w3images/avatar2.png";

interface PendingUser {
  _id: string;
  firstName: string;
  surname: string;
  middleName?: string;
  email?: string;
  phone?: string;
  unitLeaderUnit?: { _id: string; name: string } | null;
  roles: { role: string; unit?: { _id: string; name: string } | null }[];
}

export default function ApproveUnitLeadersScreen() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [modalType, setModalType] = useState<"approve" | "deny" | null>(null);
  const [target, setTarget] = useState<PendingUser | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchPending = async () => {
    try {
      setLoading(true);

      // 1. Try to fetch categorised unit leaders first
      const resp = await apiClient.get(`/api/users/pending/list?type=unit-leaders`);
      
      // 2. Also fetch ALL pending to find those with incomplete role data
      const allResp = await apiClient.get(`/api/users/pending/list`);

      const categorized: PendingUser[] = resp.data.users || [];
      const allPending: PendingUser[] = allResp.data.users || [];

      // Combine both lists, avoiding duplicates by ID
      const combined = [...categorized];
      allPending.forEach(u => {
        if (!combined.some(c => c._id === u._id)) {
          // Rule: If they're not a MinistryAdmin and not a SuperAdmin, show them here as potential ULs or pending members
          const isMA = (u.roles || []).some(r => r.role === 'MinistryAdmin');
          const isSA = (u.roles || []).some(r => r.role === 'SuperAdmin');
          if (!isMA && !isSA) {
            combined.push(u);
          }
        }
      });

      setUsers(combined);
    } catch (e: any) {
      console.log("fetch pending leaders error", e?.response?.data || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const closeModal = () => {
    if (!submitting) {
      setModalType(null);
      setTarget(null);
    }
  };

  const approve = async () => {
    if (!target) return;
    setSubmitting(true);
    try {
      const resp = await apiClient.post(`/api/users/approve`, { userId: target._id });
      if (resp.data.ok) {
        setUsers((u) => u.filter((x) => x._id !== target._id));
        toast.success("Leader approved successfully");
      }
      closeModal();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Approval failed");
      setSubmitting(false);
    }
  };

  const deny = async () => {
    if (!target) return;
    setSubmitting(true);
    try {
      const resp = await apiClient.post(`/api/users/reject`, { userId: target._id });
      if (resp.data.ok) {
        setUsers((u) => u.filter((x) => x._id !== target._id));
        toast.success("Leader rejected");
      }
      closeModal();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Rejection failed");
      setSubmitting(false);
    }
  };

  const empty = !loading && users.length === 0;

  const targetUnitName = (u: PendingUser | null) =>
    u?.unitLeaderUnit?.name ||
    u?.roles.find((r) => r.role === "UnitLeader")?.unit?.name ||
    "this unit";

  return (
    <div className="min-h-screen bg-background dark:bg-dark-background flex flex-col font-sans">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-[env(safe-area-inset-top,16px)] pb-4 border-b border-border dark:border-dark-border bg-surface/80 dark:bg-dark-surface/80 backdrop-blur-xl sticky top-0 z-10 transition-colors">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 -ml-2 hover:bg-background dark:hover:bg-dark-background rounded-full transition-colors active:scale-90"
        >
          <ChevronLeft size={22} className="text-text-primary dark:text-dark-text-primary" strokeWidth={2.5} />
        </button>
        <h1 className="text-[17px] font-bold text-text-primary dark:text-dark-text-primary tracking-tight uppercase">
          Approve Unit Leaders
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 pb-28">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div
              className="w-8 h-8 border-3 rounded-full border-t-transparent animate-spin"
              style={{ borderColor: PRIMARY }}
            />
            <p className="text-xs font-medium text-gray-500 animate-pulse">Fetching records...</p>
          </div>
        )}

        {empty && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center flex-1 pt-12 text-center px-8"
          >
            <div className="w-48 h-40 relative mb-6">
              <svg viewBox="0 0 120 100" className="w-full h-full drop-shadow-xl">
                <rect x="20" y="20" width="80" height="60" rx="12" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#0B2540]/10 dark:text-white/10" transform="rotate(-10,60,50)" />
                <rect x="25" y="15" width="80" height="60" rx="12" fill="white" stroke="currentColor" strokeWidth="1.5" className="text-[#0B2540] dark:text-white dark:fill-[#1a1a2e]" />
                <rect x="35" y="32" width="60" height="32" rx="6" fill="#F3F4F6" className="dark:fill-[#222]" />
                <rect x="35" y="23" width="60" height="12" rx="4" fill={PRIMARY} />
              </svg>
            </div>
            <p className="text-lg font-extrabold text-[#0B2540] dark:text-white mb-2 leading-tight">
              All Caught Up!
            </p>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 font-medium leading-relaxed max-w-[240px]">
              No pending registrations found for unit leaders at this time.
            </p>
          </motion.div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((u, idx) => {
            const unitName =
              u.unitLeaderUnit?.name ||
              u.roles.find((r) => r.role === "UnitLeader")?.unit?.name ||
              "";
            const roleCount = (u.roles || []).length;
            
            return (
              <motion.div
                key={u._id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group relative bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-3xl p-4 sm:p-5 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/40 transition-all duration-300"
              >
                <div className="flex items-center gap-4 mb-5">
                  <div className="relative shrink-0">
                    <img
                      src={AVATAR}
                      alt="avatar"
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 object-cover bg-background p-1 border-primary"
                    />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-lg flex items-center justify-center border-2 border-surface dark:border-dark-surface shadow-sm">
                      <span className="text-[10px] font-black text-white">UL</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm sm:text-[15px] font-bold text-text-primary dark:text-dark-text-primary leading-tight truncate px-1">
                      {u.firstName} {u.surname}
                    </h3>
                    <p className="text-[11px] font-extrabold text-primary mt-1 bg-primary/5 inline-block px-2 py-0.5 rounded-md truncate max-w-full uppercase tracking-wider">
                      {unitName || (roleCount === 0 ? "Role Data Missing" : "Pending Assignment")}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                    <span className="shrink-0 w-5 h-5 bg-gray-100 dark:bg-white/5 rounded-md flex items-center justify-center">📞</span>
                    <span className="truncate">{u.phone || "No phone provided"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                    <span className="shrink-0 w-5 h-5 bg-gray-100 dark:bg-white/5 rounded-md flex items-center justify-center">✉️</span>
                    <span className="truncate">{u.email || "No email provided"}</span>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <button
                    onClick={() => {
                      setTarget(u);
                      setModalType("approve");
                    }}
                    className="flex-1 h-10 sm:h-11 rounded-xl text-xs sm:text-[13px] font-bold text-white bg-primary shadow-lg shadow-primary/20 active:scale-[0.97] transition-all hover:brightness-110 uppercase tracking-widest"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      setTarget(u);
                      setModalType("deny");
                    }}
                    className="flex-1 h-10 sm:h-11 rounded-xl text-xs sm:text-[13px] font-bold text-white bg-error shadow-lg shadow-error/20 active:scale-[0.97] transition-all hover:brightness-110 uppercase tracking-widest"
                  >
                    Deny
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Confirmation Bottom Sheet */}
      <AnimatePresence>
        {modalType && target && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-text-primary/40 dark:bg-black/80 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-6"
            onClick={closeModal}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-surface dark:bg-dark-surface rounded-t-[2.5rem] sm:rounded-[2rem] p-6 sm:p-8 w-full max-w-sm shadow-2xl relative border border-border dark:border-dark-border"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-1.5 bg-border dark:bg-dark-border rounded-full mx-auto mb-6 sm:hidden" />
              
              <div className="flex flex-col items-center text-center">
                <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center mb-5 ${modalType === 'approve' ? 'bg-primary/10 text-primary' : 'bg-error/10 text-error'}`}>
                  {modalType === 'approve' ? <Check size={32} strokeWidth={3} /> : <X size={32} strokeWidth={3} />}
                </div>
                
                <h3 className="text-xl font-bold text-text-primary dark:text-dark-text-primary mb-2 uppercase tracking-tight">
                  {modalType === "approve"
                    ? "Confirm Approval"
                    : "Confirm Rejection"}
                </h3>
                
                <p className="text-sm text-text-muted dark:text-dark-text-muted leading-relaxed max-w-[280px] mb-8 font-medium">
                  {modalType === "approve"
                    ? "Are you sure you want to approve "
                    : "Are you sure you want to reject "}
                  <span className="font-bold text-text-primary dark:text-dark-text-primary">{target.firstName} {target.surname}</span>
                  {modalType === "approve"
                    ? ` for ${targetUnitName(target)}?`
                    : "?"}
                </p>
                
                <div className="flex flex-col w-full gap-3">
                  <button
                    onClick={modalType === 'approve' ? approve : deny}
                    disabled={submitting}
                    className={`w-full h-12 rounded-2xl font-bold text-[13px] text-white shadow-xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all uppercase tracking-widest ${modalType === 'approve' ? 'bg-primary' : 'bg-error'}`}
                  >
                    {submitting ? (
                      <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>{modalType === 'approve' ? "Yes, Approve" : "Yes, Reject"}</span>
                    )}
                  </button>
                  <button
                    onClick={closeModal}
                    disabled={submitting}
                    className="w-full h-12 rounded-2xl font-bold text-[13px] text-text-muted dark:text-dark-text-muted bg-background dark:bg-dark-background border border-border dark:border-dark-border active:scale-[0.98] transition-all uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
