import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Search, Plus, X, ChevronDown, Check,
  Heart, Calendar, RefreshCw, User, ShieldCheck, Edit3, Trash2
} from "lucide-react";
import toast from "react-hot-toast";
import AsyncStorage from "../../utils/AsyncStorage";
import apiClient from "../../api/client";
import { getUnitContext } from "../../utils/context";

interface MarriageDoc {
  _id: string;
  name: string;
  date: string;
  note?: string;
  unitId?: string;
}


// Context resolver

export default function UnitMarriages() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [marriages, setMarriages] = useState<MarriageDoc[]>([]);
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MarriageDoc | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [unitId, setUnitId] = useState("");

  // Form
  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");

  const fetchMarriages = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    else setRefreshing(true);
    try {
      const uid = await getUnitContext();
      setUnitId(uid || "");
      const res = await apiClient.get(`/api/marriages`, {
        params: { unitId: uid || undefined, year: selectedYear === "All" ? undefined : selectedYear },
      });
      const data = res.data?.marriages || res.data || [];
      setMarriages(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error("Failed to load records");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchMarriages();
  }, [fetchMarriages]);

  const filteredMarriages = useMemo(() => {
    return marriages.filter(
      (m) =>
        ((m.name || "").toLowerCase().includes(search.toLowerCase()) || (m.note || "").toLowerCase().includes(search.toLowerCase())) &&
        (selectedYear === "All" || (m.date && new Date(m.date).getFullYear().toString() === selectedYear))
    );
  }, [marriages, search, selectedYear]);

  const years = ["All", ...Array.from({ length: 11 }, (_, i) => (new Date().getFullYear() - i).toString())];

  const handleSubmit = async () => {
    if (!name.trim() || !date) {
      toast.error("Please provide member name and wedding date");
      return;
    }
    setSubmitting(true);
    try {
      const resolvedUnitId = await getUnitContext();
      const payload = { name, date: new Date(date).toISOString(), note, unitId: resolvedUnitId };
      if (editing) {
        await apiClient.put(`/api/marriages/${editing._id}`, payload);
        toast.success("Entry updated successfully");
      } else {
        await apiClient.post(`/api/marriages`, payload);
        toast.success("Record saved");
      }
      setShowForm(false);
      resetForm();
      fetchMarriages();
    } catch (e) {
      toast.error("Process failed");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Are you sure you want to remove this record?")) return;
    try {
      await apiClient.delete(`/api/marriages/${id}`);
      toast.success("Record removed");
      fetchMarriages();
    } catch (e) {
      toast.error("Failed to delete record");
    }
  };

  const resetForm = () => {
    setEditing(null);
    setName("");
    setDate(new Date().toISOString().slice(0, 10));
    setNote("");
  };

  const openEdit = (m: MarriageDoc) => {
    setEditing(m);
    setName(m.name);
    setDate((m.date || "").slice(0, 10));
    setNote(m.note || "");
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0f1113] pb-32">
      {/* Header */}
      <div className="bg-[#00204a] pt-12 sm:pt-16 pb-32 sm:pb-24 px-6 sm:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-20 opacity-10 pointer-events-none">
          <Heart size={300} className="text-[#349DC5] -rotate-12" fill="currentColor" />
        </div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 sm:gap-8 relative z-10">
          <div className="flex items-start sm:items-center gap-4 sm:gap-6">
            <button onClick={() => navigate(-1)} className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-2xl bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-95 mt-1 sm:mt-0">
              <ArrowLeft size={28} />
            </button>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight leading-[1.1] sm:leading-none">
                Married Members
              </h1>
              <div className="flex items-center gap-3 mt-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#349DC5] animate-pulse" />
                <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest">
                  Marriage Records
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => fetchMarriages(true)} className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center border border-white/10 hover:bg-white/20 transition-all active:scale-95">
              <RefreshCw size={22} className={refreshing ? "animate-spin text-[#349DC5]" : "text-white/60"} />
            </button>
            <button onClick={() => { resetForm(); setShowForm(true); }} className="h-14 px-8 bg-[#349DC5] text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-3 active:scale-95 transition-all shadow-lg shadow-cyan-500/20">
              <Plus size={18} /> Add Record
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-8">
        {/* Premium Count Card */}
        <div className="bg-white dark:bg-[#1a1c1e] rounded-[40px] p-10 border border-gray-100 dark:border-white/5 shadow-sm mb-12 flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
            <Heart size={100} className="text-[#349DC5]" />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] mb-3">Total Records</p>
            <h2 className="text-6xl font-black text-[#00204a] dark:text-white leading-none tracking-tighter tabular-nums">
              {filteredMarriages.length}
            </h2>
          </div>
           <div className="flex bg-gray-50 dark:bg-white/5 p-2 rounded-2xl gap-2 max-w-[50%] overflow-x-auto no-scrollbar">
             {["All", new Date().getFullYear().toString()].map(y => (
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
            placeholder="Search records..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-20 pl-16 pr-8 bg-white dark:bg-[#1a1c1e] rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 font-bold text-lg outline-none focus:border-[#349DC5]/20 transition-all placeholder:text-gray-200"
          />
        </div>

        <div className="space-y-6">
          {loading ? (
            <div className="flex flex-col items-center py-24 gap-6 text-center">
              <div className="w-12 h-12 rounded-full border-4 border-[#349DC5] border-t-transparent animate-spin" />
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] animate-pulse">Loading...</p>
            </div>
          ) : filteredMarriages.length === 0 ? (
            <div className="flex flex-col items-center py-32 gap-6 text-center bg-white dark:bg-[#1a1c1e] rounded-[48px] border-2 border-dashed border-gray-100 dark:border-white/5">
              <div className="w-24 h-24 rounded-[40px] bg-pink-50 dark:bg-pink-900/10 flex items-center justify-center text-6xl shadow-inner animate-pulse">💍</div>
              <div>
                <p className="text-sm font-black text-[#00204a] dark:text-white uppercase tracking-widest mb-2">No Records Found</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-loose">The records list is currently empty.<br/>Add your first record today.</p>
              </div>
            </div>
          ) : (
            filteredMarriages.map((m) => (
              <motion.div
                layout
                key={m._id}
                className="bg-white dark:bg-[#1a1c1e] p-8 rounded-[40px] shadow-sm border border-gray-100 dark:border-white/5 hover:border-[#349DC5]/10 transition-all group relative overflow-hidden"
              >
                <div className="flex items-center justify-between gap-6 mb-8">
                  <div className="flex items-center gap-6">
                    <div className="w-18 h-18 bg-pink-50 dark:bg-pink-900/10 text-pink-500 rounded-[28px] flex items-center justify-center text-4xl font-black shadow-inner group-hover:scale-110 transition-transform">
                      {(m.name || "?")[0]}
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-[#00204a] dark:text-white uppercase tracking-tight leading-none group-hover:text-[#349DC5] transition-colors mb-2">
                        {m.name}
                      </h3>
                      <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-[#349DC5] bg-blue-50 dark:bg-blue-900/20 px-4 py-1.5 rounded-full w-fit">
                        Married Member
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => openEdit(m)} className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 hover:text-[#349DC5] hover:bg-white transition-all">
                      <Edit3 size={18} />
                    </button>
                    <button onClick={() => remove(m._id)} className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 hover:text-rose-500 hover:bg-white transition-all">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <DetailRow label="Marriage Date" value={m.date ? new Date(m.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : ""} />
                  {m.note && (
                    <div className="mt-6 pt-6 border-t border-gray-50 dark:border-white/5">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Notes</p>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300 leading-relaxed italic border-l-4 border-pink-400 pl-4 py-2 bg-pink-50/20 dark:bg-pink-900/5 rounded-r-2xl">
                        {m.note}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowForm(false)} className="absolute inset-0 bg-[#00204a]/80 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-xl bg-white dark:bg-[#1a1c1e] rounded-[50px] p-12 shadow-2xl overflow-hidden">
               <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                <Heart size={160} className="text-[#349DC5]" />
              </div>
              <h3 className="text-3xl font-black text-[#00204a] dark:text-white uppercase mb-10 relative z-10">
                {editing ? "Edit Record" : "Add Marriage"}
              </h3>
              <div className="space-y-6 relative z-10">
                <section>
                   <label className="block text-[10px] font-black text-gray-400 uppercase mb-4 ml-2 tracking-widest">Full Name</label>
                   <div className="relative group">
                    <User className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#349DC5] transition-colors" size={20} />
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="Member's full name" className="w-full h-18 pl-16 pr-6 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none outline-none font-bold text-lg focus:ring-2 ring-blue-500/20" />
                   </div>
                </section>
                <section>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-4 ml-2 tracking-widest">Wedding Date</label>
                    <div className="relative group">
                      <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#349DC5] transition-colors" size={20} />
                      <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full h-18 pl-16 pr-6 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none outline-none font-bold text-lg focus:ring-2 ring-blue-500/20 uppercase" />
                    </div>
                </section>
                <section>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-4 ml-2 tracking-widest">Personal Note (Optional)</label>
                    <textarea rows={4} placeholder="e.g. Traditional wedding date..." value={note} onChange={e => setNote(e.target.value)} className="w-full p-6 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none outline-none font-medium text-lg resize-none focus:ring-2 ring-blue-500/20" />
                </section>
                <div className="flex gap-4 pt-4">
                  <button onClick={() => { setShowForm(false); resetForm(); }} className="flex-1 h-18 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:text-rose-500 transition-all">Discard</button>
                  <button onClick={handleSubmit} disabled={submitting} className="flex-[2] h-18 bg-[#349DC5] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-cyan-500/20 active:scale-95 transition-all flex items-center justify-center gap-3">
                    {submitting ? <RefreshCw className="animate-spin" /> : editing ? "Update" : "Save Record"}
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
