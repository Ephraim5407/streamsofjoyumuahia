import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Search, Plus, X, RefreshCw, Trash2, Edit2, Flame, MonitorPlay } from "lucide-react";
import toast from "react-hot-toast";
import AsyncStorage from "../../utils/AsyncStorage";

interface BroadcastDoc {
  id: string;
  title: string;
  platform: string;
  views: number;
  durationMins: number;
  quality: string;
  notes: string;
  dateLogged: string;
}

export default function Broadcast() {
  const navigate = useNavigate();
  const [items, setItems] = useState<BroadcastDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BroadcastDoc | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState("YouTube");
  const [views, setViews] = useState<number | "">("");
  const [durationMins, setDurationMins] = useState<number | "">("");
  const [quality, setQuality] = useState("1080p");
  const [notes, setNotes] = useState("");
  const [dateLogged, setDateLogged] = useState(new Date().toISOString().slice(0, 10));

  const fetchItems = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    else setRefreshing(true);
    try {
      const stored = await AsyncStorage.getItem("mock_broadcast_data");
      if (stored) {
        setItems(JSON.parse(stored));
      } else {
        setItems([]);
      }
    } catch {
      toast.error("Failed to load broadcast timeline");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const filtered = useMemo(() => {
    return items.filter(item => 
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.platform.toLowerCase().includes(search.toLowerCase())
    ).sort((a,b) => new Date(b.dateLogged).getTime() - new Date(a.dateLogged).getTime());
  }, [items, search]);

  const resetForm = () => {
    setEditing(null);
    setTitle("");
    setPlatform("YouTube");
    setViews("");
    setDurationMins("");
    setQuality("1080p");
    setNotes("");
    setDateLogged(new Date().toISOString().slice(0, 10));
  };

  const openEdit = (item: BroadcastDoc) => {
    setEditing(item);
    setTitle(item.title);
    setPlatform(item.platform);
    setViews(item.views);
    setDurationMins(item.durationMins);
    setQuality(item.quality);
    setNotes(item.notes);
    setDateLogged(item.dateLogged.slice(0, 10));
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSubmitting(true);
    try {
      const payload: BroadcastDoc = {
        id: editing ? editing.id : Date.now().toString(),
        title, 
        platform, 
        views: Number(views || 0), 
        durationMins: Number(durationMins || 0), 
        quality, 
        notes, 
        dateLogged
      };
      
      let updated = [];
      if (editing) {
        updated = items.map(i => i.id === editing.id ? payload : i);
        toast.success("Broadcast updated");
      } else {
        updated = [payload, ...items];
        toast.success("Broadcast logged");
      }
      
      await AsyncStorage.setItem("mock_broadcast_data", JSON.stringify(updated));
      setItems(updated);
      setShowForm(false);
      resetForm();
    } catch {
      toast.error("Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Remove this broadcast record?")) return;
    try {
      const updated = items.filter(i => i.id !== id);
      await AsyncStorage.setItem("mock_broadcast_data", JSON.stringify(updated));
      setItems(updated);
      toast.success("Record deleted");
    } catch {
      toast.error("Failed to remove");
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0f1113] pb-32">
      <div className="bg-[#00204a] pt-12 sm:pt-16 pb-32 sm:pb-24 px-6 sm:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-20 opacity-10 pointer-events-none">
          <MonitorPlay size={300} className="text-[#349DC5] -rotate-12" />
        </div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-4 sm:gap-6">
            <button onClick={() => navigate(-1)} className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-2xl bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-95">
              <ArrowLeft size={28} />
            </button>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight leading-[1.1] sm:leading-none">Broadcasts</h1>
              <div className="flex items-center gap-3 mt-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2196F3] animate-pulse" />
                <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Broadcast History</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => fetchItems(true)} className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center border border-white/10 hover:bg-white/20 transition-all active:scale-95">
              <RefreshCw size={22} className={refreshing ? "animate-spin text-[#2196F3]" : "text-white/60"} />
            </button>
            <button onClick={() => { resetForm(); setShowForm(true); }} className="h-14 px-8 bg-[#2196F3] text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-3 active:scale-95 transition-all shadow-lg shadow-blue-500/20">
              <Plus size={18} /> New Broadcast
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-8">
        <div className="grid md:grid-cols-2 gap-6 mb-12">
           <div className="bg-white dark:bg-[#1a1c1e] rounded-[40px] p-8 border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden relative group">
             <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
               <Flame size={80} className="text-[#2196F3]" />
             </div>
             <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] mb-2 relative z-10">Total Streams</p>
             <h2 className="text-5xl font-black text-[#00204a] dark:text-white leading-none tracking-tighter tabular-nums relative z-10">{items.length}</h2>
           </div>
           
           <div className="bg-white dark:bg-[#1a1c1e] rounded-[40px] p-8 border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden relative group">
             <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
               <MonitorPlay size={80} className="text-emerald-500" />
             </div>
             <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] mb-2 relative z-10">Total Reach</p>
             <h2 className="text-5xl font-black text-emerald-500 leading-none tracking-tighter tabular-nums relative z-10">
                {items.reduce((acc, curr) => acc + curr.views, 0).toLocaleString()}
             </h2>
           </div>
        </div>

        <div className="relative group mb-12">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#2196F3] transition-colors" size={24} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title or platform..."
            className="w-full h-20 pl-16 pr-8 bg-white dark:bg-[#1a1c1e] rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 font-bold text-lg outline-none focus:border-[#2196F3]/20 transition-all placeholder:text-gray-300" />
        </div>

        <div className="space-y-6">
          {loading ? (
            <div className="flex flex-col items-center py-24 gap-6 text-center">
              <div className="w-12 h-12 rounded-full border-4 border-[#2196F3] border-t-transparent animate-spin" />
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] animate-pulse">Syncing Streams...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-32 gap-6 text-center bg-white dark:bg-[#1a1c1e] rounded-[48px] border-2 border-dashed border-gray-100 dark:border-white/5">
              <div className="w-24 h-24 rounded-[40px] bg-blue-50 dark:bg-blue-900/10 flex items-center justify-center text-6xl shadow-inner animate-pulse">📡</div>
              <div>
                <p className="text-sm font-black text-[#00204a] dark:text-white uppercase tracking-widest mb-2">No Broadcasts Found</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-loose">Log your first stream today.</p>
              </div>
            </div>
          ) : filtered.map(item => (
            <motion.div layout key={item.id}
              className="bg-white dark:bg-[#1a1c1e] p-8 rounded-[40px] shadow-sm border border-gray-100 dark:border-white/5 hover:border-[#2196F3]/10 transition-all group">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/10 text-blue-500 rounded-[28px] flex items-center justify-center text-3xl font-black shadow-inner">
                    <MonitorPlay size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-[#00204a] dark:text-white uppercase tracking-tight leading-none mb-2 group-hover:text-[#2196F3] transition-colors">
                      {item.title}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-md text-blue-500 bg-blue-50 dark:bg-blue-500/10">{item.platform}</span>
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-md text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10">{item.quality}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => openEdit(item)} className="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 hover:text-[#2196F3] hover:bg-white transition-all"><Edit2 size={18} /></button>
                  <button onClick={(e) => remove(item.id, e)} className="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 hover:text-rose-500 hover:bg-white transition-all"><Trash2 size={18} /></button>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-3 border-b border-gray-50 dark:border-white/5"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">Total Reach</span><span className="text-sm font-bold text-[#00204a] dark:text-white uppercase">{item.views.toLocaleString()}</span></div>
                <div className="flex items-center justify-between py-3 border-b border-gray-50 dark:border-white/5"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">Date Broadcasted</span><span className="text-sm font-bold text-[#00204a] dark:text-white uppercase">{new Date(item.dateLogged).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span></div>
                {item.notes && <p className="mt-4 text-sm font-medium text-gray-500 dark:text-gray-400 leading-relaxed border-l-4 border-[#2196F3]/30 pl-4 py-2 bg-gray-50/50 dark:bg-white/[0.02] rounded-r-xl">Notes: {item.notes}</p>}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowForm(false)} className="absolute inset-0 bg-[#00204a]/80 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl bg-white dark:bg-[#1a1c1e] rounded-[50px] p-12 shadow-2xl overflow-y-auto max-h-[92vh]">
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-3xl font-black text-[#00204a] dark:text-white uppercase">{editing ? "Update Broadcast" : "Log Broadcast"}</h3>
                <button onClick={() => { setShowForm(false); resetForm(); }} className="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center"><X size={20} className="text-gray-400" /></button>
              </div>
              <div className="space-y-5">
                <FieldWrap label="Broadcast Title" required>
                  <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Sunday Service - 1st Service" className="w-full h-16 px-5 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold text-lg focus:ring-2 ring-blue-500/20" />
                </FieldWrap>

                <div className="grid grid-cols-2 gap-4">
                  <FieldWrap label="Platform">
                    <select value={platform} onChange={e => setPlatform(e.target.value)} className="w-full h-16 px-5 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold text-lg appearance-none">
                      <option>YouTube</option><option>Mixlr</option><option>Facebook</option><option>Instagram</option>
                    </select>
                  </FieldWrap>
                  <FieldWrap label="Quality">
                    <select value={quality} onChange={e => setQuality(e.target.value)} className="w-full h-16 px-5 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold text-lg appearance-none">
                      <option>1080p</option><option>720p</option><option>Audio Only</option><option>4K</option>
                    </select>
                  </FieldWrap>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FieldWrap label="Peak Viewers / Reach">
                    <input type="number" min="0" value={views} onChange={e => setViews(e.target.value === "" ? "" : Number(e.target.value))} placeholder="0" className="w-full h-16 px-5 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold text-lg focus:ring-2 ring-blue-500/20" />
                  </FieldWrap>
                  <FieldWrap label="Date Broadcasted">
                     <input type="date" value={dateLogged} onChange={e => setDateLogged(e.target.value)} className="w-full h-16 px-5 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold text-lg focus:ring-2 ring-blue-500/20 uppercase" />
                  </FieldWrap>
                </div>

                <FieldWrap label="Notes (Optional)">
                  <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any issues, delays, or highlights..." className="w-full p-5 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-medium text-lg resize-none focus:ring-2 ring-blue-500/20" />
                </FieldWrap>
                
                <div className="flex gap-4 pt-4">
                  <button onClick={() => { setShowForm(false); resetForm(); }} className="flex-1 h-16 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:text-gray-600 transition-colors">Cancel</button>
                  <button onClick={handleSubmit} disabled={submitting} className="flex-[2] h-16 bg-[#2196F3] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95 transition-transform">
                    {submitting ? <RefreshCw className="animate-spin" size={18} /> : editing ? "Save Changes" : "Save Record"}
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

function FieldWrap({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">
        {label}{required && <span className="text-rose-400 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}
