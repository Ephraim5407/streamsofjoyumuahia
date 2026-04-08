import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { ChevronLeft, X } from "lucide-react";
import { BASE_URl } from "../../../api/users";
import AsyncStorage from "../../../utils/AsyncStorage";

const PRIMARY = "#349DC5";
interface PendingUser {
  _id: string;
  firstName: string;
  surname: string;
  email?: string;
  phone?: string;
  ministryName?: string;
  roles: { role: string; ministryName?: string }[];
}
export default function ApproveMinistryAdminsScreen() {
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
      const resp = await axios.get(
        `${BASE_URl}/api/users/pending/list?type=ministry-admins`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const list: PendingUser[] = resp.data.users || [];
      setUsers(
        list.filter((u) =>
          (u.roles || []).some((r) => r.role === "MinistryAdmin"),
        ),
      );
    } catch (e) {
      console.log("fetch ministry admins error", e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchPending();
  }, []);
  const openModal = (type: "approve" | "deny", user: PendingUser) => {
    setTarget(user);
    setModalType(type);
  };
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
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (resp.data.ok) setUsers((u) => u.filter((x) => x._id !== target._id));
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
      if (resp.data.ok) setUsers((u) => u.filter((x) => x._id !== target._id));
      closeModal();
    } catch {
      setSubmitting(false);
    }
  };
  return (
    <div className="min-h-screen bg-white dark:bg-[#0f1218] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-12 pb-3 border-b border-[#EEF2F5] dark:border-[#222] bg-white dark:bg-[#0f1218] z-10">
        <button onClick={() => navigate(-1)} className="p-1.5">
          <ChevronLeft size={24} color="#000" />
        </button>
        <h1 className="text-base font-semibold text-[#0B2540] dark:text-white flex-1">
          Approve Ministry Admins
        </h1>
      </div>
      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-10">
        {loading && (
          <div className="flex justify-center mt-5">
            <div
              className="w-6 h-6 border-2 rounded-full border-t-transparent animate-spin"
              style={{ borderColor: PRIMARY }}
            />
          </div>
        )}
        {!loading && users.length === 0 && (
          <div className="flex-1 flex items-center justify-center pt-20">
            <p className="text-sm text-[#6B7280] dark:text-gray-400 text-center">
              No pending ministry admin registrations
            </p>
          </div>
        )}
        {users.map((u) => (
          <div
            key={u._id}
            className="bg-[#F5F9FC] dark:bg-[#1a1a2e] border border-[#E3EDF3] dark:border-[#333] rounded-2xl p-4"
          >
            <p className="text-sm font-semibold text-[#111827] dark:text-white mb-1">
              {u.firstName} {u.surname}
            </p>
            <p className="text-xs text-[#374151] dark:text-gray-400 mb-3">
              {u.ministryName ||
                u.roles.find((r) => r.role === "MinistryAdmin")?.ministryName ||
                "Ministry"}
              &nbsp;|&nbsp; {u.email}
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => openModal("approve", u)}
                className="flex-1 h-10 rounded-full font-semibold text-sm text-white"
                style={{ backgroundColor: PRIMARY }}
              >
                Approve
              </button>
              <button
                onClick={() => openModal("deny", u)}
                className="flex-1 h-10 rounded-full font-semibold text-sm text-white bg-[#E11D48]"
              >
                Deny
              </button>
            </div>
          </div>
        ))}
      </div>
      {/* Confirm modal */}
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
                <X size={22} color="#0B2540" />
              </button>
              <h3 className="text-base font-bold text-[#0B2540] dark:text-white mt-1 mb-3 text-center">
                {modalType === "approve"
                  ? "Approve this ministry admin?"
                  : "Deny this ministry admin?"}
              </h3>
              <p className="text-sm text-[#183B56] dark:text-gray-300 text-center leading-5 mb-5">
                This will {modalType === "approve" ? "grant" : "remove"}
                ministry admin privileges for
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
                    {submitting ? "…" : "Yes, Approve"}
                  </button>
                ) : (
                  <button
                    onClick={deny}
                    disabled={submitting}
                    className="flex-1 h-11 rounded-full font-semibold text-sm text-white bg-[#E11D48] disabled:opacity-60"
                  >
                    {submitting ? "…" : "Yes, Deny"}
                  </button>
                )}
                <button
                  onClick={closeModal}
                  disabled={submitting}
                  className="flex-1 h-11 rounded-full font-semibold text-sm text-white bg-[#9CA3AF] disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
