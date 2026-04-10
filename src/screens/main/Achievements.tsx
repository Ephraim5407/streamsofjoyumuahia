import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Calendar,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  ArrowLeft,
  RefreshCw,
  ChevronDown,
  Star,
  Award,
  Target,
  ShieldCheck,
  Loader2,
  ChevronRight,
} from "lucide-react";
import axios from "axios";
import { BASE_URl } from "../../api/users";
import AsyncStorage from "../../utils/AsyncStorage";
import toast from "react-hot-toast";

interface Achievement {
  _id: string;
  title: string;
  description: string;
  date: string;
  unit: string;
  type?: string;
}

export default function Achievements() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const readOnly = searchParams.get("view") === "true";

  const [items, setItems] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Achievement | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    else setRefreshing(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const unitId = await AsyncStorage.getItem("activeUnitId");
      const res = await axios.get(`${BASE_URl}/api/achievements?unitId=${unitId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data?.achievements || res.data || [];
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error("Failed to sync records");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Permanently delete this record?")) return;
    try {
      const token = await AsyncStorage.getItem("token");
      await axios.delete(`${BASE_URl}/api/achievements/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Entry removed");
      fetchData();
    } catch (e) {
      toast.error("Operation failed");
    }
  };

  const filtered = useMemo(() => {
    return items.filter((i) =>
      (i.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (i.description || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [items, search]);

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0f1113] pb-32">
      <div className="bg-white dark:bg-[#1a1c1e] border-b border-gray-100 dark:border-white/5 pt-12 pb-8 px-6 sticky top-0 z-30 shadow-sm backdrop-blur-xl bg-white/80 dark:bg-[#1a1c1e]/80">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 sm:gap-8">
          <div className="flex items-start sm:items-center gap-4 sm:gap-6">
            <button
              onClick={() => navigate(-1)}
              className="w-12 h-12 shrink-0 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 hover:text-[#349DC5] transition-all mt-1 sm:mt-0"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#00204a] dark:text-white uppercase tracking-tight leading-[1.1] sm:leading-none">
                Unit Achievements
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">
                  {items.length} Entries
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => fetchData(true)}
              className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 hover:text-[#349DC5] transition-all"
            >
              <RefreshCw size={22} className={refreshing ? "animate-spin" : ""} />
            </button>
            {!readOnly && (
              <button
                onClick={() => {
                  setEditingItem(null);
                  setShowModal(true);
                }}
                className="h-14 px-8 bg-[#349DC5] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
              >
                <Plus size={20} /> Record Achievement
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 mt-12 mb-12">
        <div className="relative group">
          <Search size={24} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#349DC5] transition-colors" />
          <input
            type="text"
            placeholder="Search milestones..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-20 pl-16 pr-8 bg-white dark:bg-[#1a1c1e] rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 font-bold text-lg outline-none focus:border-[#349DC5]/20 transition-all placeholder:text-gray-200"
          />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-8 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center py-20 gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-[#349DC5] border-t-transparent animate-spin" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Synchronizing Records...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-32 gap-6 text-center">
            <div className="w-24 h-24 rounded-[40px] bg-gray-50 dark:bg-white/5 flex items-center justify-center text-6xl shadow-inner animate-pulse">🏆</div>
            <div>
              <p className="text-sm font-black text-[#00204a] dark:text-white uppercase tracking-widest mb-2">No Milestones Recorded</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-loose">No achievements recorded yet.<br/>Add your first unit achievement today.</p>
            </div>
          </div>
        ) : (
          filtered.map((a) => (
            <motion.div
              key={a._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-[#1a1c1e] rounded-[32px] p-8 border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-500">
                    <Trophy size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-[#00204a] dark:text-white uppercase tracking-tight leading-none mb-1">
                      {a.title}
                    </h3>
                    <div className="flex items-center gap-2">
                       <Calendar size={10} className="text-gray-400" />
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                         {a.date ? new Date(a.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—"}
                       </p>
                    </div>
                  </div>
                </div>
                {!readOnly && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingItem(a);
                        setShowModal(true);
                      }}
                      className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500 hover:scale-105 active:scale-95 transition-all"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(a._id)}
                      className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center text-rose-500 hover:scale-105 active:scale-95 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              {a.description && (
                <div className="pt-6 border-t border-gray-50 dark:border-white/5">
                  <p className={cn(
                    "text-sm font-medium text-gray-600 dark:text-gray-300 leading-relaxed",
                    expandedItems.has(a._id) ? "" : "line-clamp-3"
                  )}>
                    {a.description}
                  </p>
                  {a.description.length > 150 && (
                    <button
                      onClick={() => toggleExpand(a._id)}
                      className="mt-4 text-[10px] font-black text-[#349DC5] uppercase tracking-widest hover:underline"
                    >
                      {expandedItems.has(a._id) ? "Show Less" : "View Entire Narrative"}
                    </button>
                  )}
                  <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest block mt-4">
                    Achievement Record
                  </span>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-[#00204a]/70 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-xl bg-white dark:bg-[#1a1c1e] rounded-[32px] overflow-hidden shadow-2xl"
            >
              <div className="p-10 pb-4 flex items-center justify-between border-b border-gray-100 dark:border-white/5 mb-8">
                <h2 className="text-2xl font-bold text-[#00204a] dark:text-white uppercase leading-none">
                  {editingItem ? "Edit Achievement" : "Add Achievement"}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 border-2 border-gray-100 dark:border-white/5 rounded-xl text-gray-400 hover:text-rose-500 transition-all"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-10 pt-0">
                <AchievementForm
                  item={editingItem}
                  onSuccess={() => {
                    setShowModal(false);
                    fetchData(true);
                  }}
                  onCancel={() => setShowModal(false)}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AchievementForm({ item, onSuccess, onCancel }: any) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: item?.title || "",
    description: item?.description || "",
    date: item?.date ? item.date.slice(0, 10) : new Date().toISOString().split("T")[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.description) {
      toast.error("Fields required");
      return;
    }
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const unitId = await AsyncStorage.getItem("activeUnitId");
      if (item) {
        await axios.put(`${BASE_URl}/api/achievements/${item._id}`, { ...form, unit: unitId }, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post(`${BASE_URl}/api/achievements`, { ...form, unit: unitId }, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      toast.success("Saved");
      onSuccess();
    } catch (e) {
      toast.error("Failure");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Milestone Title</label>
        <input
          value={form.title}
          onChange={e => setForm({...form, title: e.target.value})}
          className="w-full h-16 px-6 bg-gray-50 dark:bg-white/5 rounded-2xl border-none outline-none font-bold text-[#00204a] dark:text-white ring-2 ring-transparent focus:ring-[#349DC5]/20 transition-all"
          placeholder="e.g. Souls Won This Month"
        />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Milestone Date</label>
        <input
          type="date"
          value={form.date}
          onChange={e => setForm({...form, date: e.target.value})}
          className="w-full h-16 px-6 bg-gray-50 dark:bg-white/5 rounded-2xl border-none outline-none font-bold text-[#00204a] dark:text-white ring-2 ring-transparent focus:ring-[#349DC5]/20 transition-all uppercase"
        />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Description Narrative</label>
        <textarea
          value={form.description}
          onChange={e => setForm({...form, description: e.target.value})}
          rows={5}
          className="w-full p-6 bg-gray-50 dark:bg-white/5 rounded-2xl border-none outline-none font-medium text-gray-600 dark:text-gray-300 ring-2 ring-transparent focus:ring-[#349DC5]/20 transition-all resize-none"
          placeholder="Detailed strategic account..."
        />
      </div>
      <div className="flex gap-4 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 h-16 rounded-2xl border-2 border-gray-100 dark:border-white/5 font-black text-[10px] uppercase text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
        >
          Discard
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-[2] h-16 rounded-2xl bg-[#349DC5] text-white font-black text-[10px] uppercase shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
        >
          {loading ? "Recording..." : "Finalize Entry"}
        </button>
      </div>
    </form>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
