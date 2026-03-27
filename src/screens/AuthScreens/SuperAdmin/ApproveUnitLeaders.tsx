import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { ChevronLeft, X } from "lucide-react";
import { BASE_URl } from "../../../api/users";
// @ts-ignore
import AsyncStorage from "@react-native-async-storage/async-storage";
const PRIMARY = "#349DC5";
const AVATAR = "https://www.w3schools.com/w3images/avatar2.png";
interface PendingUser {
  _id: string;
  firstName: string;
  surname: string;
  email?: string;
  phone?: string;
  unitLeaderUnit?: { name: string };
  roles: { role: string; unit?: { name: string } }[];
}
export default function ApproveUnitLeadersScreen() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [modalType, setModalType] = useState<"approve" | "deny" | null>(null);
  const [target, setTarget] = useState<PendingUser | null>(null);
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const token = await AsyncStorage.getItem("token");
        if (!token) return;
        const resp = await axios.get(
          `${BASE_URl}/api/users/pending/list?type=unit-leaders`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const list: PendingUser[] = resp.data.users || [];
        setUsers(
          list.filter((u) =>
            (u.roles || []).some((r) => r.role === "UnitLeader"),
          ),
        );
      } catch {
      } finally {
        setLoading(false);
      }
    })();
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
  const empty = !loading && users.length === 0;
  const targetUnitName = (u: PendingUser | null) =>
    u?.unitLeaderUnit?.name ||
    u?.roles.find((r) => r.role === "UnitLeader")?.unit?.name ||
    "this unit";
  return (
    <div className="min-h-screen bg-white dark:bg-[#0f1218] flex flex-col">
      <div className="flex items-center gap-2 px-4 pt-12 pb-3 border-b border-[#EEF2F5] dark:border-[#222]">
        <button onClick={() => navigate(-1)} className="p-1.5">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-base font-semibold text-[#0B2540] dark:text-white flex-1">
          Approve Unit Leaders
        </h1>
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
        {empty && (
          <div className="flex flex-col items-center pt-20">
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
              Sorry
            </p>
            <p className="text-sm text-[#6B7280]">
              No pending unit leader registrations
            </p>
          </div>
        )}
        {users.map((u) => {
          const unitName =
            u.unitLeaderUnit?.name ||
            u.roles.find((r) => r.role === "UnitLeader")?.unit?.name ||
            "";
          return (
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
                  {u.firstName} {u.surname}
                  {unitName && (
                    <span style={{ color: PRIMARY }}>| {unitName}</span>
                  )}
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
          );
        })}
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
              <h3 className="text-base font-bold text-center text-[#0B2540] dark:text-white mt-1 mb-3">
                {modalType === "approve"
                  ? "Are you sure you want to approve this registration?"
                  : "Are you sure you want to deny this registration?"}
              </h3>
              <p className="text-sm text-center text-[#183B56] dark:text-gray-300 leading-5 mb-5">
                {modalType === "approve"
                  ? "This action will confirm"
                  : "If denied,"}
                <span className="font-bold text-[#0B2540] dark:text-white">
                  {target.firstName} {target.surname}
                </span>
                {modalType === "approve"
                  ? " as the unit leader for"
                  : "'s registration as Unit leader for"}
                <span className="font-bold text-[#0B2540] dark:text-white">
                  {targetUnitName(target)}
                </span>
                {modalType === "approve"
                  ? "."
                  : " will be permanently deleted from the system and cannot be restored."}
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
