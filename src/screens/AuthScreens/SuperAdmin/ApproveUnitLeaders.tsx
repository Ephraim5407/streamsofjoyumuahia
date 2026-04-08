import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { ChevronLeft, X, Check } from "lucide-react";
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
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      // 1. Try to fetch categorised unit leaders first
      const resp = await axios.get(
        `${BASE_URl}/api/users/pending/list?type=unit-leaders`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // 2. Also fetch ALL pending to find those with incomplete role data (like the user just reported)
      const allResp = await axios.get(
        `${BASE_URl}/api/users/pending/list`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

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
      const token = await AsyncStorage.getItem("token");
      const resp = await axios.post(
        `${BASE_URl}/api/users/approve`,
        { userId: target._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (resp.data.ok) setUsers((u) => u.filter((x) => x._id !== target._id));
      closeModal();
    } catch (e: any) {
      console.log("approve error", e?.response?.data || e.message);
      setSubmitting(false);
    }
  };

  const deny = async () => {
    if (!target) return;
    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const resp = await axios.post(
        `${BASE_URl}/api/users/reject`,
        { userId: target._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (resp.data.ok) setUsers((u) => u.filter((x) => x._id !== target._id));
      closeModal();
    } catch (e: any) {
      console.log("deny error", e?.response?.data || e.message);
      setSubmitting(false);
    }
  };

  const empty = !loading && users.length === 0;

  const targetUnitName = (u: PendingUser | null) =>
    u?.unitLeaderUnit?.name ||
    u?.roles.find((r) => r.role === "UnitLeader")?.unit?.name ||
    "this unit";

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f1218] flex flex-col font-sans selection:bg-[#349DC5]/30">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-[env(safe-area-inset-top,16px)] pb-4 border-b border-[#EEF2F5] dark:border-[#222] bg-white/80 dark:bg-[#0f1218]/80 backdrop-blur-xl sticky top-0 z-10">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors active:scale-90"
        >
          <ChevronLeft size={22} strokeWidth={2.5} />
        </button>
        <h1 className="text-[17px] font-bold text-[#0B2540] dark:text-white tracking-tight">
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
                className="group relative bg-[#F9FBFE] dark:bg-[#1a1c23] border border-[#E8F0F7] dark:border-[#2a2d35] rounded-3xl p-4 sm:p-5 hover:shadow-xl hover:shadow-[#349DC5]/5 hover:border-[#349DC5]/40 transition-all duration-300"
              >
                <div className="flex items-center gap-4 mb-5">
                  <div className="relative shrink-0">
                    <img
                      src={AVATAR}
                      alt="avatar"
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 object-cover bg-white p-1"
                      style={{ borderColor: PRIMARY }}
                    />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#349DC5] rounded-lg flex items-center justify-center border-2 border-white dark:border-[#1a1c23] shadow-sm">
                      <span className="text-[10px] font-black text-white">UL</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm sm:text-[15px] font-bold text-[#101828] dark:text-white leading-tight truncate px-1">
                      {u.firstName} {u.surname}
                    </h3>
                    <p className="text-[11px] font-bold text-[#349DC5] mt-1 bg-[#349DC5]/5 inline-block px-2 py-0.5 rounded-md truncate max-w-full">
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
                    className="flex-1 h-10 sm:h-11 rounded-xl text-xs sm:text-[13px] font-bold text-white shadow-lg shadow-[#349DC5]/20 active:scale-[0.97] transition-all hover:brightness-110"
                    style={{ backgroundColor: PRIMARY }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      setTarget(u);
                      setModalType("deny");
                    }}
                    className="flex-1 h-10 sm:h-11 rounded-xl text-xs sm:text-[13px] font-bold text-white bg-[#E11D48] shadow-lg shadow-[#E11D48]/20 active:scale-[0.97] transition-all hover:brightness-110"
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
            className="fixed inset-0 bg-[#0B2540]/60 dark:bg-black/80 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center"
            onClick={closeModal}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-[#1a1c23] rounded-t-[2.5rem] sm:rounded-[2rem] p-6 sm:p-8 w-full max-w-md shadow-2xl relative border-t-4 border-[#349DC5]"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full mx-auto mb-6 sm:hidden" />
              
              <div className="flex flex-col items-center text-center">
                <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-5 ${modalType === 'approve' ? 'bg-[#349DC5]/10 text-[#349DC5]' : 'bg-red-50 text-red-500'}`}>
                  {modalType === 'approve' ? <Check size={32} strokeWidth={3} /> : <X size={32} strokeWidth={3} />}
                </div>
                
                <h3 className="text-xl font-black text-[#0B2540] dark:text-white mb-3 px-4">
                  {modalType === "approve"
                    ? "Confirm Approval"
                    : "Confirm Rejection"}
                </h3>
                
                <p className="text-[14px] text-gray-500 dark:text-gray-400 leading-relaxed max-w-[280px]">
                  {modalType === "approve"
                    ? "Are you sure you want to approve "
                    : "Are you sure you want to reject "}
                  <span className="font-bold text-[#0B2540] dark:text-white">{target.firstName} {target.surname}</span>
                  {modalType === "approve"
                    ? ` as a Unit Leader for ${targetUnitName(target)}?`
                    : "? This action cannot be undone."}
                </p>
                
                <div className="flex flex-col w-full gap-3 mt-8">
                  <button
                    onClick={modalType === 'approve' ? approve : deny}
                    disabled={submitting}
                    className="w-full h-14 rounded-2xl font-black text-[15px] text-white shadow-xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                    style={{ backgroundColor: modalType === 'approve' ? PRIMARY : '#E11D48' }}
                  >
                    {submitting ? (
                      <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>{modalType === 'approve' ? "Yes, Approve User" : "Yes, Reject User"}</span>
                    )}
                  </button>
                  <button
                    onClick={closeModal}
                    disabled={submitting}
                    className="w-full h-14 rounded-2xl font-bold text-[15px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/5 active:scale-[0.98] transition-all"
                  >
                    No, Go Back
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
