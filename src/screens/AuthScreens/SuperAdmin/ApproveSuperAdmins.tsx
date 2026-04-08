import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { ChevronLeft, X, ShieldCheck, UserCircle } from "lucide-react";
import toast from "react-hot-toast";
import { BASE_URl } from "../../../api/users";
import AsyncStorage from "../../../utils/AsyncStorage";
const PRIMARY = "#349DC5";
const AVATAR = "https://www.w3schools.com/w3images/avatar2.png";
interface PendingUser {
  _id: string;
  firstName: string;
  surname: string;
  email?: string;
  phone?: string;
}
export default function ApproveSuperAdminsScreen() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [forbidden, setForbidden] = useState<string | null>(null);
  const [modalType, setModalType] = useState<"approve" | "deny" | null>(null);
  const [target, setTarget] = useState<PendingUser | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fetch = async () => {
    try {
      setLoading(true);
      setForbidden(null);
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const resp = await axios.get(`${BASE_URl}/api/superadmins/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.data?.ok) setUsers(resp.data.users || []);
      else setUsers([]);
    } catch (e: any) {
      const s = e?.response?.status;
      if (s === 403) setForbidden(e?.response?.data?.message || "Forbidden");
      else setUsers([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetch();
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
        `${BASE_URl}/api/superadmins/approve`,
        { userId: target._id },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (resp.data?.ok) {
        setUsers((u) => u.filter((x) => x._id !== target._id));
        toast.success(`${target.firstName} ${target.surname} approved!`);
      }
      closeModal();
    } catch {
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
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (resp.data?.ok) {
        setUsers((u) => u.filter((x) => x._id !== target._id));
        toast.success(`${target.firstName} ${target.surname} denied.`);
      }
      closeModal();
    } catch {
      setSubmitting(false);
    }
  };
  const empty = !loading && users.length === 0 && !forbidden;
  return (
    <div className="min-h-screen bg-white dark:bg-[#0f1218] flex flex-col">
      <div className="flex items-center gap-2 px-4 pt-12 pb-3 border-b border-[#EEF2F5] dark:border-[#222]">
        <button onClick={() => navigate(-1)} className="p-1.5">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-base font-semibold text-[#0B2540] dark:text-white flex-1">
          Approve Super Admins
        </h1>
        <ShieldCheck size={20} color={PRIMARY} />
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-10">
        {loading && (
          <div className="flex justify-center mt-6">
            <div
              className="w-6 h-6 border-2 rounded-full border-t-transparent animate-spin"
              style={{ borderColor: PRIMARY }}
            />
          </div>
        )}
        {forbidden && !loading && (
          <div className="text-center pt-20">
            <p className="text-lg font-semibold text-[#111] dark:text-white mb-1">
              Not allowed
            </p>
            <p className="text-sm text-[#6B7280]">{forbidden}</p>
          </div>
        )}
        {empty && (
          <div className="flex flex-col items-center pt-20">
            {/* SVG illustration */}
            <svg
              width="120"
              height="100"
              viewBox="0 0 120 100"
              className="mb-4 opacity-30"
            >
              <rect
                x="20"
                y="20"
                width="80"
                height="60"
                rx="8"
                fill="none"
                stroke="#0B2540"
                strokeWidth="2"
                transform="rotate(-12,60,50)"
              />
              <rect
                x="20"
                y="20"
                width="80"
                height="60"
                rx="8"
                fill="white"
                stroke="#0B2540"
                strokeWidth="2"
                transform="rotate(3,60,50)"
              />
              <rect
                x="30"
                y="38"
                width="60"
                height="35"
                rx="4"
                fill="#E5E7EB"
                transform="rotate(3,60,50)"
              />
              <rect
                x="30"
                y="28"
                width="60"
                height="14"
                rx="4"
                fill={PRIMARY}
                transform="rotate(3,60,50)"
              />
            </svg>
            <p className="text-lg font-semibold text-[#111] dark:text-white mb-1">
              No Pending Approvals
            </p>
            <p className="text-sm text-[#6B7280]">
              No pending superadmin registrations
            </p>
          </div>
        )}
        {users.map((u) => (
          <div
            key={u._id}
            className="flex items-center gap-3 bg-[#F5F9FC] dark:bg-[#1a1a2e] border border-[#E3EDF3] dark:border-[#333] rounded-2xl p-4"
          >
            <img
              src={AVATAR}
              alt="avatar"
              className="w-14 h-14 rounded-full border-2 object-cover"
              style={{ borderColor: PRIMARY }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#111827] dark:text-white">
                {u.firstName} {u.surname} |
                <span style={{ color: PRIMARY }}>Super Admin</span>
              </p>
              <p className="text-[11px] text-[#374151] dark:text-gray-400 mt-1">
                📞 {u.phone || "N/A"} &nbsp;|&nbsp; {u.email || ""}
              </p>
              <div className="flex gap-2 mt-2.5">
                <button
                  onClick={() => {
                    setTarget(u);
                    setModalType("approve");
                  }}
                  className="flex-1 h-10 rounded-full text-sm font-semibold text-white"
                  style={{ backgroundColor: PRIMARY }}
                >
                  Approve
                </button>
                <button
                  onClick={() => {
                    setTarget(u);
                    setModalType("deny");
                  }}
                  className="flex-1 h-10 rounded-full text-sm font-semibold text-white bg-[#E11D48]"
                >
                  Deny
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <AnimatePresence>
        {modalType && target && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/25 z-50 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.88 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.88 }}
              className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 w-full max-w-sm shadow-md relative"
            >
              <button
                onClick={closeModal}
                disabled={submitting}
                className="absolute top-3 right-3 p-1"
              >
                <X size={22} />
              </button>
              <h3 className="text-base font-bold text-[#0B2540] dark:text-white mt-1 mb-3 text-center">
                {modalType === "approve"
                  ? "Approve this superadmin?"
                  : "Deny this superadmin?"}
              </h3>
              <p className="text-sm text-[#183B56] dark:text-gray-300 text-center leading-5 mb-5">
                This will {modalType === "approve" ? "grant" : "remove"}
                SuperAdmin privileges for
                <span className="font-bold text-[#0B2540] dark:text-white">
                  {target.firstName} {target.surname}
                </span>
                .
              </p>
              <div className="flex gap-3">
                {modalType === "approve" ? (
                  <button
                    onClick={approve}
                    disabled={submitting}
                    className="flex-1 h-11 rounded-full font-semibold text-sm text-white disabled:opacity-60"
                    style={{ backgroundColor: PRIMARY }}
                  >
                    {submitting ? "..." : "Yes, Approve"}
                  </button>
                ) : (
                  <button
                    onClick={deny}
                    disabled={submitting}
                    className="flex-1 h-11 rounded-full font-semibold text-sm text-white bg-[#E11D48] disabled:opacity-60"
                  >
                    {submitting ? "..." : "Yes, Deny"}
                  </button>
                )}
                <button
                  onClick={closeModal}
                  disabled={submitting}
                  className="flex-1 h-11 rounded-full font-semibold text-sm text-white bg-[#9CA3AF]"
                >
                  No, Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
