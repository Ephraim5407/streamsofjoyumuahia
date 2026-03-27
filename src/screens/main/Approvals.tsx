import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Check,
  UserPlus,
  Search,
  RefreshCw,
  Mail,
  Phone,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Users,
  UserCheck,
  X,
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { BASE_URl } from "../../api/users";
import AsyncStorage from "../../utils/AsyncStorage";

interface PendingUser {
  _id: string;
  firstName: string;
  surname: string;
  email?: string;
  phone?: string;
  roles: { role: string; unit?: { _id: string; name: string } | null }[];
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

function SidebarRule({
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  return (
    <div>
      <h4 className="text-[10px] font-bold uppercase text-[#349DC5] mb-1">
        {label}
      </h4>
      <p className="text-[11px] font-bold text-white/50 leading-relaxed uppercase">
        {description}
      </p>
    </div>
  );
}

function QueueStat({ label, value, icon: Icon, color }: any) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            color,
            "bg-white dark:bg-black/20",
          )}
        >
          <Icon size={18} />
        </div>
        <span className="text-[11px] font-bold text-gray-400 uppercase">
          {label}
        </span>
      </div>
      <span className={cn("text-xl font-bold", color)}>{value}</span>
    </div>
  );
}

export default function ApprovalsScreen() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [targetUser, setTargetUser] = useState<PendingUser | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");

  const fetchPending = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const resp = await axios.get(`${BASE_URl}/api/users/pending/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const list: PendingUser[] = resp.data.users || [];
      const filtered = list.filter((u) =>
        (u.roles || []).some((r) => r.role === "Member"),
      );
      setUsers(filtered);
    } catch (e) {
      toast.error("Failed to sync pending application buffer");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const approve = async () => {
    if (!targetUser) return;
    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const resp = await axios.post(
        `${BASE_URl}/api/users/approve`,
        { userId: targetUser._id },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (resp.data.ok) {
        setUsers((u) => u.filter((x) => x._id !== targetUser._id));
        toast.success(`Access granted to ${targetUser.firstName}`);
      }
      setTargetUser(null);
    } catch (e) {
      toast.error("Decisions engine failure");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      `${u.firstName} ${u.surname}`.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.phone?.includes(search),
  );

  return (
    <div className="pb-32 max-w-7xl mx-auto px-4 sm:px-6 pt-10">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate(-1)}
            className="p-3.5 rounded-2xl bg-white dark:bg-[#1a1c1e] shadow-sm border border-gray-100 dark:border-white/5 text-gray-400 hover:text-[#349DC5] transition-all active:scale-95"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-[#00204a] dark:text-white leading-none">
              Access Control
            </h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase mt-2">
              Pending Member Admissions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex -space-x-3">
            {users.slice(0, 3).map((u, i) => (
              <div
                key={i}
                className="w-10 h-10 rounded-full bg-[#00204a] text-white border-2 border-white dark:border-[#1a1c1e] flex items-center justify-center font-bold text-[10px] uppercase shadow-sm"
              >
                {u.firstName[0]}
                {u.surname[0]}
              </div>
            ))}
          </div>
          <button
            onClick={fetchPending}
            className="h-12 px-6 bg-[#00204a] text-white rounded-xl font-bold text-[10px] uppercase flex items-center gap-3 hover:bg-[#349DC5] transition-all active:scale-95 shadow"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Sync Buffer
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8">
          <div className="relative mb-10 group">
            <Search
              className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#349DC5] transition-colors"
              size={20}
            />
            <input
              type="text"
              placeholder="Search candidate registry..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-16 pl-14 pr-8 bg-white dark:bg-[#1a1c1e] rounded-xl shadow-sm border-2 border-transparent focus:border-[#349DC5]/20 font-bold text-sm outline-none transition-all placeholder:text-gray-300"
            />
          </div>

          <div className="space-y-4">
            {loading ? (
              Array(3)
                .fill(0)
                .map((_, i) => (
                  <div
                    key={i}
                    className="h-28 bg-white/50 dark:bg-white/5 animate-pulse rounded-xl"
                  />
                ))
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map((u) => {
                const unitName =
                  (u.roles || []).find((r) => r.role === "Member" && r.unit)
                    ?.unit?.name || "Global Deployment";
                return (
                  <motion.div
                    layout
                    key={u._id}
                    className="group bg-white dark:bg-[#1a1c1e] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6 transition-all"
                  >
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-xl bg-gray-50 dark:bg-black/20 flex items-center justify-center text-[#349DC5] text-xl font-bold uppercase shadow-inner">
                        {u.firstName[0]}
                        {u.surname[0]}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-[#00204a] dark:text-white uppercase leading-tight">
                            {u.firstName} {u.surname}
                          </h3>
                          <span className="px-3 py-1 bg-[#349DC5]/10 text-[#349DC5] text-[9px] font-bold uppercase rounded-lg border border-[#349DC5]/20">
                            {unitName}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-gray-400 font-bold text-[10px] uppercase">
                          <span className="flex items-center gap-2">
                            <Mail size={14} className="text-gray-300" />
                            {u.email || "NO EMAIL"}
                          </span>
                          <span className="flex items-center gap-2">
                            <Phone size={14} className="text-gray-300" />
                            {u.phone || "NO CONTACT"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setTargetUser(u)}
                      className="h-14 px-8 bg-[#00204a] text-white rounded-xl font-bold text-[10px] uppercase hover:bg-[#349DC5] active:scale-95 transition-all shadow-sm flex items-center gap-3 w-full sm:w-auto justify-center"
                    >
                      <UserCheck size={18} /> Authorize Admission
                    </button>
                  </motion.div>
                );
              })
            ) : (
              <div className="py-32 text-center bg-gray-50 dark:bg-white/5 rounded-2xl border-2 border-dashed border-gray-100 dark:border-white/5">
                <UserPlus size={48} className="text-gray-200 mx-auto mb-6" />
                <h3 className="text-xl font-bold text-[#00204a] dark:text-white uppercase">
                  Queue Synchronized
                </h3>
                <p className="text-gray-400 font-bold text-[10px] uppercase mt-2 px-10">
                  All member admissions have been processed for this session.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="bg-gradient-to-br from-[#00204a] to-[#042e61] p-10 rounded-xl text-white shadow-lg relative overflow-hidden group">
            <h3 className="text-lg font-bold uppercase mb-8 flex items-center gap-3">
              <ShieldCheck size={24} className="text-[#349DC5]" /> Governance
            </h3>
            <div className="space-y-6 relative z-10">
              <SidebarRule
                label="Identity Verification"
                description="Cross-reference with unit roster."
              />
              <SidebarRule
                label="Unit Alignment"
                description="Verify requested deployment zone."
              />
              <SidebarRule
                label="Access Tier"
                description="Standard member permissions apply."
              />
            </div>
            <div className="absolute -bottom-10 -right-10 opacity-10 rotate-12 transition-transform group-hover:rotate-0">
              <ShieldCheck size={180} />
            </div>
          </div>

          <div className="bg-white dark:bg-[#1a1c1e] p-8 rounded-xl shadow-sm border border-gray-100 dark:border-white/5">
            <h3 className="text-base font-bold text-[#00204a] dark:text-white uppercase mb-8">
              Buffer Insights
            </h3>
            <div className="space-y-4">
              <QueueStat
                label="Pending Admits"
                value={users.length}
                icon={Users}
                color="text-[#349DC5]"
              />
              <QueueStat
                label="Today's Velocity"
                value="12"
                icon={CheckCircle2}
                color="text-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {targetUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTargetUser(null)}
              className="absolute inset-0 bg-[#00204a]/70 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-white dark:bg-[#1a1c1e] rounded-[32px] p-10 text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-blue-50 dark:bg-[#349DC5]/10 rounded-2xl flex items-center justify-center mx-auto mb-8 text-[#349DC5]">
                <UserCheck size={40} />
              </div>
              <h3 className="text-2xl font-bold text-[#00204a] dark:text-white uppercase mb-3">
                Grant Access?
              </h3>
              <p className="text-gray-400 font-bold text-[10px] uppercase leading-relaxed mb-10 px-4">
                You are authorizing{" "}
                <span className="text-[#349DC5]">{targetUser.firstName}</span> for
                Global Member permissions.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={approve}
                  disabled={submitting}
                  className="h-16 bg-[#00204a] text-white rounded-xl font-bold text-xs uppercase shadow active:scale-95 transition-all flex items-center justify-center"
                >
                  {submitting ? (
                    <RefreshCw className="animate-spin" />
                  ) : (
                    "Confirm Protocol"
                  )}
                </button>
                <button
                  onClick={() => setTargetUser(null)}
                  disabled={submitting}
                  className="h-16 bg-gray-50 dark:bg-white/5 text-gray-400 rounded-xl font-bold text-xs uppercase"
                >
                  Abort
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
