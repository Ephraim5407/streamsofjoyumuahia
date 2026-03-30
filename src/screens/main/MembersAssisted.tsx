import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Search,
  RefreshCw,
  HandHeart,
  Calendar,
  Plus,
  ChevronRight,
  X,
  Phone,
  Info,
  CheckCircle2,
  Users,
  ShieldCheck,
  Star,
  Check,
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { BASE_URl } from "../../api/users";
import AsyncStorage from "../../utils/AsyncStorage";

interface AssistedMember {
  _id: string;
  member: string;
  memberName: string;
  phone?: string;
  assistedOn: string;
  reason: string;
  howHelped: string;
}

export default function MembersAssisted() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assists, setAssists] = useState<AssistedMember[]>([]);
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState<number | "All">(
    new Date().getFullYear(),
  );
  const [showForm, setShowForm] = useState(false);
  const [unitId, setUnitId] = useState<string | null>(null);

  // Form State
  const [form, setForm] = useState({
    memberId: "",
    memberName: "",
    assistedOn: new Date().toISOString().split("T")[0],
    reason: "",
    howHelped: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [directory, setDirectory] = useState<any[]>([]);
  const [dirSearch, setDirSearch] = useState("");

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    else setRefreshing(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const rawUser = await AsyncStorage.getItem("user");
      const u = rawUser ? JSON.parse(rawUser) : null;
      const targetUnitId =
        u?.activeUnitId ||
        u?.activeUnit?._id ||
        (u?.roles || []).find((r: any) => r.role === "UnitLeader" && r.unit)?.unit ||
        (u?.roles || []).find((r: any) => r.role === "Member" && r.unit)?.unit;
      setUnitId(targetUnitId);
      if (targetUnitId) {
        const res = await axios.get(
          `${BASE_URl}/api/assists?unitId=${targetUnitId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (res.data?.assists) setAssists(res.data.assists);

        const memRes = await axios.get(
          `${BASE_URl}/api/units/${targetUnitId}/members/list`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (memRes.data?.members) setDirectory(memRes.data.members);
      }
    } catch (e) {
      toast.error("Failed to sync assistance registry");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredAssists = useMemo(() => {
    return assists
      .filter((a) => {
        const matchesSearch =
          (a.memberName || "").toLowerCase().includes(search.toLowerCase()) ||
          (a.reason || "").toLowerCase().includes(search.toLowerCase());
        const matchesYear =
          String(selectedYear) === "All" ||
          new Date(a.assistedOn).getFullYear() === Number(selectedYear);
        return matchesSearch && matchesYear;
      })
      .sort(
        (a, b) =>
          new Date(b.assistedOn).getTime() - new Date(a.assistedOn).getTime(),
      );
  }, [assists, search, selectedYear]);

  const handleSubmit = async () => {
    if (!form.memberId || !form.reason || !form.howHelped) {
      toast.error("Select member and provide account details");
      return;
    }
    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem("token");
      await axios.post(
        `${BASE_URl}/api/assists`,
        { ...form, unitId },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      toast.success("Assistance logged successfully");
      setShowForm(false);
      setForm({
        memberId: "",
        memberName: "",
        assistedOn: new Date().toISOString().split("T")[0],
        reason: "",
        howHelped: "",
      });
      fetchData();
    } catch (e) {
      toast.error("Resource logging failed");
    } finally {
      setSubmitting(false);
    }
  };

  const years = [
    "All",
    ...Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i),
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0f1113] pb-32">
      <div className="bg-[#00204a] pt-12 sm:pt-12 pb-28 sm:pb-20 px-6 sm:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-20 opacity-10 pointer-events-none">
          <HandHeart size={300} className="text-[#349DC5] -rotate-12" />
        </div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 sm:gap-8 relative z-10">
          <div className="flex items-start sm:items-center gap-4 sm:gap-6">
            <button
              onClick={() => navigate(-1)}
              className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-2xl bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-95 mt-1 sm:mt-0"
            >
              <ArrowLeft size={24} className="sm:hidden" />
              <ArrowLeft size={28} className="hidden sm:block" />
            </button>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight leading-[1.1] sm:leading-none">
                Unit Members Assisted
              </h1>
              <div className="flex items-center gap-3 mt-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#349DC5] animate-pulse" />
                <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest">
                  Strategic Member Support Registry
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => fetchData(true)}
              className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center border border-white/10 hover:bg-white/20 transition-all active:scale-95"
            >
              <RefreshCw
                size={22}
                className={refreshing ? "animate-spin text-[#349DC5]" : "text-white/60"}
              />
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="h-14 px-8 bg-[#349DC5] text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-3 active:scale-95 transition-all shadow-lg shadow-cyan-500/20"
            >
              <Plus size={18} /> Log Assistance
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-1">
        <div className="bg-white dark:bg-[#1e1e1e] rounded-[48px] no-scrollbar p-2 top-20 shadow-sm border border-gray-100 dark:border-white/5 mb-10 overflow-x-auto no-scrollbar flex gap-2">
          {years.map((y) => (
            <button
              key={y}
              onClick={() => setSelectedYear(y as any)}
              className={cn(
                "px-8 py-4 font-black text-[10px] uppercase tracking-[0.2em] rounded-[40px] transition-all shrink-0",
                selectedYear === y
                  ? "bg-[#00204a] text-white shadow shadow-blue-900/20"
                  : "text-gray-400 hover:text-gray-600",
              )}
            >
              {y === "All" ? "All Time" : y}
            </button>
          ))}
        </div>

        <div className="relative group mb-12">
          <Search
            className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#349DC5] transition-colors"
            size={24}
          />
          <input
            type="text"
            placeholder="Search registry by name/reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-20 pl-16 pr-8 bg-white dark:bg-[#1a1c1e] rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 font-bold text-lg outline-none focus:border-[#349DC5]/20 transition-all placeholder:text-gray-200"
          />
        </div>

        <div className="space-y-6">
          {loading ? (
            <div className="flex flex-col items-center py-24 gap-6">
              <div className="w-12 h-12 rounded-full border-4 border-[#349DC5] border-t-transparent animate-spin" />
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] animate-pulse">Syncing Benevolence Feed...</p>
            </div>
          ) : filteredAssists.length > 0 ? (
            filteredAssists.map((a) => (
              <motion.div
                layout
                key={a._id}
                className="bg-white dark:bg-[#1a1c1e] p-8 rounded-[36px] shadow-sm border border-gray-100 dark:border-white/5 hover:border-[#349DC5]/10 transition-all group relative overflow-hidden"
              >
                <div className="flex items-center justify-between gap-6 mb-8">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/10 text-[#349DC5] rounded-[24px] flex items-center justify-center text-3xl font-black shadow-inner">
                      {a.memberName[0]}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-[#00204a] dark:text-white uppercase tracking-tight leading-loose group-hover:text-[#349DC5] transition-colors">
                        {a.memberName}
                      </h3>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#349DC5] bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full">
                          Benevolence Entry
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <DetailRow label="Strategic Support Date" value={new Date(a.assistedOn).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} />
                  {a.reason && <DetailRow label="Support Objective" value={a.reason} />}

                  <div className="mt-6 pt-6 border-t border-gray-50 dark:border-white/5">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Intervention Details</p>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300 leading-relaxed italic border-l-4 border-[#349DC5] pl-4 py-2 bg-blue-50/30 dark:bg-blue-900/10 rounded-r-xl">
                      "{a.howHelped}"
                    </p>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="py-32 text-center bg-white dark:bg-[#1a1c1e] rounded-[48px] border-2 border-dashed border-gray-100 dark:border-white/5">
              <HandHeart size={48} className="text-gray-100 mx-auto mb-6" />
              <p className="text-sm font-black text-[#00204a] dark:text-white uppercase tracking-widest mb-2">No Support Records Detected</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">The benevolence feed is currently empty for this period.</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
              className="absolute inset-0 bg-[#00204a]/80 backdrop-blur-xl"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl bg-white dark:bg-[#1a1c1e] rounded-[50px] p-12 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                <HandHeart size={160} className="text-[#349DC5]" />
              </div>
              <h3 className="text-3xl font-black text-[#00204a] dark:text-white uppercase mb-10 relative z-10">
                Log Support Entry
              </h3>
              <div className="space-y-6 relative z-10">
                <section>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-4 ml-2 tracking-widest">
                    Identify Member
                  </label>
                  <div className="relative group">
                    <Users
                      className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#349DC5] transition-colors"
                      size={20}
                    />
                    <select
                      value={form.memberId}
                      onChange={(e) => {
                        const m = directory.find((x) => x._id === e.target.value);
                        setForm((f) => ({
                          ...f,
                          memberId: e.target.value,
                          memberName: m?.name || "",
                        }));
                      }}
                      className="w-full h-18 pl-14 pr-6 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none outline-none font-bold text-lg focus:ring-2 ring-blue-500/20 appearance-none"
                    >
                      <option value="">Select Member</option>
                      {directory.map((m) => (
                        <option key={m._id} value={m._id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </section>
                <section>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-4 ml-2 tracking-widest">
                    Tactical Support Date
                  </label>
                  <input
                    type="date"
                    value={form.assistedOn}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, assistedOn: e.target.value }))
                    }
                    className="w-full h-18 px-6 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none outline-none font-bold text-lg focus:ring-2 ring-blue-500/20 uppercase"
                  />
                </section>
                <section>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-4 ml-2 tracking-widest">
                    Assistance Objective
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Financial support, Hospital visit"
                    value={form.reason}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, reason: e.target.value }))
                    }
                    className="w-full h-18 px-6 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none outline-none font-bold text-lg focus:ring-2 ring-blue-500/20"
                  />
                </section>
                <section>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-4 ml-2 tracking-widest">
                    Strategic Support Account
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Provide details of the support..."
                    value={form.howHelped}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, howHelped: e.target.value }))
                    }
                    className="w-full p-6 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none outline-none font-medium text-lg resize-none focus:ring-2 ring-blue-500/20"
                  />
                </section>
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => setShowForm(false)}
                    className="flex-1 h-18 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:text-rose-500 transition-all h-[70px]"
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-[2] h-18 bg-[#349DC5] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-cyan-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 h-[70px]"
                  >
                    {submitting ? <RefreshCw className="animate-spin" /> : "Finalize Entry"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailRow({ label, value }: { label: string, value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-50 dark:border-white/5 last:border-none group/row hover:bg-gray-50/50 dark:hover:bg-white/5 px-2 rounded-xl transition-colors">
      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
      <span className="text-sm font-bold text-[#00204a] dark:text-white tracking-tight">{value}</span>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
