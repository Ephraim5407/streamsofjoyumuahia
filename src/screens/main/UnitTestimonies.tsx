import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, RefreshCw, Search, Calendar,
  ChevronDown, MessageSquare, Trash2, X, Sparkles,
  Edit3, Share2, Filter, Check, Star
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { BASE_URl } from "../../api/users";
import AsyncStorage from "../../utils/AsyncStorage";

interface Testimony {
  _id: string;
  name: string;
  date: string;
  description: string;
  ageRange?: string;
  unitId?: string;
}

const getUnitId = async () => {
    const direct = await AsyncStorage.getItem("activeUnitId");
    if (direct) return direct;
    const rawUser = await AsyncStorage.getItem("user");
    if (!rawUser) return null;
    const u = JSON.parse(rawUser);
    return u?.activeUnitId || u?.activeUnit?._id || u?.activeUnit || (u?.roles || []).find((r: any) => r.role === "UnitLeader" && r.unit)?.unit || (u?.roles || []).find((r: any) => r.role === "Member" && r.unit)?.unit || null;
};

export default function UnitTestimonies() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [testimonies, setTestimonies] = useState<Testimony[]>([]);
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("All");
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [unitId, setUnitId] = useState("");

  const [form, setForm] = useState({
    name: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
  });

  const fetchTestimonies = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    else setRefreshing(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const uid = await getUnitId();
      setUnitId(uid || "");
      const res = await axios.get(`${BASE_URl}/api/testimonies`, {
        params: { unitId: uid || undefined, year: selectedYear === "All" ? undefined : selectedYear },
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data?.testimonies || res.data || [];
      setTestimonies(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error("Failed to load records");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchTestimonies();
  }, [fetchTestimonies]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const filteredTestimonies = useMemo(() => {
    return testimonies.filter(
      (t) =>
        (t.name.toLowerCase().includes(search.toLowerCase()) || (t.description || "").toLowerCase().includes(search.toLowerCase())) &&
        (selectedYear === "All" || (t.date && new Date(t.date).getFullYear().toString() === selectedYear))
    );
  }, [testimonies, search, selectedYear]);

  const years = ["All", ...Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString())];

  const handleSubmit = async () => {
    if (!form.name || !form.description) {
      toast.error("Name and description are required");
      return;
    }
    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const payload = { ...form, unitId };
      if (editingId) {
        await axios.put(`${BASE_URl}/api/testimonies/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Manifestation updated");
      } else {
        await axios.post(`${BASE_URl}/api/testimonies`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Manifestation recorded");
      }
      setShowAddModal(false);
      setEditingId(null);
      setForm({ name: "", date: new Date().toISOString().split("T")[0], description: "" });
      fetchTestimonies();
    } catch (e) {
      toast.error("Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this manifestation record?")) return;
    try {
      const token = await AsyncStorage.getItem("token");
      await axios.delete(`${BASE_URl}/api/testimonies/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Record deleted");
      fetchTestimonies();
    } catch (e) {
      toast.error("Failed to delete record");
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0f1113] pb-32">
      {/* Header */}
      <div className="bg-[#00204a] pt-12 sm:pt-16 pb-32 sm:pb-24 px-6 sm:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-20 opacity-10 pointer-events-none">
          <Sparkles size={300} className="text-[#349DC5] -rotate-12" />
        </div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 sm:gap-8 relative z-10">
          <div className="flex items-start sm:items-center gap-4 sm:gap-6">
            <button onClick={() => navigate(-1)} className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-2xl bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-95 mt-1 sm:mt-0">
              <ArrowLeft size={28} />
            </button>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight leading-[1.1] sm:leading-none">
                Testimonies from Women
              </h1>
              <div className="flex items-center gap-3 mt-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#349DC5] animate-pulse" />
                <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest">
                  Strategic Unit manifestation registry
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => fetchTestimonies(true)} className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center border border-white/10 hover:bg-white/20 transition-all active:scale-95">
              <RefreshCw size={22} className={refreshing ? "animate-spin text-[#349DC5]" : "text-white/60"} />
            </button>
            <button onClick={() => { setEditingId(null); setShowAddModal(true); }} className="h-14 px-8 bg-[#349DC5] text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-3 active:scale-95 transition-all shadow-lg shadow-cyan-500/20">
              <Plus size={18} /> Record Testimony
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-8">
        {/* Premium Count Card */}
        <div className="bg-white dark:bg-[#1a1c1e] rounded-[40px] p-10 border border-gray-100 dark:border-white/5 shadow-sm mb-12 flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
            <Sparkles size={100} className="text-[#349DC5]" />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] mb-3">Total Manifestations</p>
            <h2 className="text-6xl font-black text-[#00204a] dark:text-white leading-none tracking-tighter tabular-nums">
              {filteredTestimonies.length}
            </h2>
          </div>
           <div className="flex bg-gray-50 dark:bg-white/5 p-2 rounded-2xl gap-2 max-w-[50%] overflow-x-auto no-scrollbar">
             {years.map(y => (
               <button 
                key={y}
                onClick={() => setSelectedYear(y)}
                className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedYear === y ? "bg-[#00204a] text-white shadow-md shadow-blue-500/20" : "text-gray-400 hover:text-gray-600"}`}
               >
                 {y === "All" ? "Lifetime" : y}
               </button>
             ))}
           </div>
        </div>

        <div className="relative group mb-12">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#349DC5] transition-colors" size={24} />
          <input
            type="text"
            placeholder="Search manifestations by name or detail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-20 pl-16 pr-8 bg-white dark:bg-[#1a1c1e] rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 font-bold text-lg outline-none focus:border-[#349DC5]/20 transition-all placeholder:text-gray-200"
          />
        </div>

        <div className="space-y-6">
          {loading ? (
            <div className="flex flex-col items-center py-24 gap-6 text-center">
              <div className="w-12 h-12 rounded-full border-4 border-[#349DC5] border-t-transparent animate-spin" />
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] animate-pulse">Syncing Cloud Feed...</p>
            </div>
          ) : filteredTestimonies.length === 0 ? (
            <div className="flex flex-col items-center py-32 gap-6 text-center bg-white dark:bg-[#1a1c1e] rounded-[48px] border-2 border-dashed border-gray-100 dark:border-white/5">
              <div className="w-24 h-24 rounded-[40px] bg-cyan-50 dark:bg-cyan-900/10 flex items-center justify-center text-6xl shadow-inner animate-pulse">✨</div>
              <div>
                <p className="text-sm font-black text-[#00204a] dark:text-white uppercase tracking-widest mb-2">No Manifestations Detected</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-loose">The unit testimony registry is currently quiet.<br/>Log your first manifestation journey today.</p>
              </div>
            </div>
          ) : (
            filteredTestimonies.map((t) => (
              <motion.div
                layout
                key={t._id}
                className="bg-white dark:bg-[#1a1c1e] p-8 rounded-[40px] shadow-sm border border-gray-100 dark:border-white/5 hover:border-[#349DC5]/10 transition-all group relative overflow-hidden"
              >
                <div className="flex items-center justify-between gap-6 mb-8">
                  <div className="flex items-center gap-6">
                    <div className="w-18 h-18 bg-cyan-50 dark:bg-cyan-900/10 text-[#349DC5] rounded-[28px] flex items-center justify-center text-4xl font-black shadow-inner group-hover:scale-110 transition-transform">
                      {t.name[0]}
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-[#00204a] dark:text-white uppercase tracking-tight leading-none group-hover:text-[#349DC5] transition-colors mb-2">
                        {t.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-[#349DC5] bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-md">
                          Divine Restoration
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => {
                        setEditingId(t._id);
                        setForm({ name: t.name, date: (t.date || "").slice(0, 10), description: t.description });
                        setShowAddModal(true);
                    }} className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 hover:text-[#349DC5] hover:bg-white transition-all">
                      <Edit3 size={18} />
                    </button>
                    <button onClick={() => handleDelete(t._id)} className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 hover:text-rose-500 hover:bg-white transition-all">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <DetailRow label="Event Registry Date" value={new Date(t.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} />
                  
                  <div className="mt-6 pt-6 border-t border-gray-50 dark:border-white/5">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Manifestation Narrative</p>
                    <div className="bg-blue-50/20 dark:bg-blue-900/5 p-6 rounded-3xl border-l-4 border-[#349DC5]">
                        <p className={`text-sm font-medium leading-relaxed italic ${expandedIds.includes(t._id) ? "text-gray-600 dark:text-gray-300" : "text-gray-400 line-clamp-3"}`}>
                          "{t.description}"
                        </p>
                        {t.description.length > 150 && (
                            <button onClick={() => toggleExpand(t._id)} className="mt-4 text-[9px] font-black uppercase tracking-[0.2em] text-[#349DC5]">
                                {expandedIds.includes(t._id) ? "Close Narrative" : "Open Narrative"}
                            </button>
                        )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)} className="absolute inset-0 bg-[#00204a]/80 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-xl bg-white dark:bg-[#1a1c1e] rounded-[50px] p-12 shadow-2xl overflow-hidden">
               <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                <Sparkles size={160} className="text-[#349DC5]" />
              </div>
              <h3 className="text-3xl font-black text-[#00204a] dark:text-white uppercase mb-10 relative z-10">
                {editingId ? "Update Manifesto" : "Log Journey"}
              </h3>
              <div className="space-y-6 relative z-10">
                <section>
                   <label className="block text-[10px] font-black text-gray-400 uppercase mb-4 ml-2 tracking-widest">Individual Name</label>
                   <div className="relative group">
                    <Star className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#349DC5] transition-colors" size={20} />
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Testifier full name" className="w-full h-18 pl-16 pr-6 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none outline-none font-bold text-lg focus:ring-2 ring-blue-500/20" />
                   </div>
                </section>
                <section>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-4 ml-2 tracking-widest">Victory Date</label>
                    <div className="relative group">
                      <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#349DC5] transition-colors" size={20} />
                      <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full h-18 pl-16 pr-6 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none outline-none font-bold text-lg focus:ring-2 ring-blue-500/20 uppercase" />
                    </div>
                </section>
                <section>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-4 ml-2 tracking-widest">Narrative Detail</label>
                    <textarea rows={6} placeholder="Provide details of the manifestation..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full p-6 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none outline-none font-medium text-lg resize-none focus:ring-2 ring-blue-500/20" />
                </section>
                <div className="flex gap-4 pt-4">
                  <button onClick={() => { setShowAddModal(false); setEditingId(null); }} className="flex-1 h-18 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:text-rose-500 transition-all">Discard</button>
                  <button onClick={handleSubmit} disabled={submitting} className="flex-[2] h-18 bg-[#349DC5] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-cyan-500/20 active:scale-95 transition-all flex items-center justify-center gap-3">
                    {submitting ? <RefreshCw className="animate-spin" /> : editingId ? "Update Manifesto" : "Seal Testimony"}
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

function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-50 dark:border-white/5 last:border-none hover:bg-gray-50/50 dark:hover:bg-white/5 px-2 rounded-xl transition-colors">
      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
      <span className="text-sm font-bold text-[#00204a] dark:text-white">{value}</span>
    </div>
  );
}
