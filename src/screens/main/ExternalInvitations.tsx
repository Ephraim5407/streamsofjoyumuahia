import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Search, Plus, X, Calendar, MapPin,
  Handshake, RefreshCw, Link, Clock, Trash2, Edit3
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { BASE_URl } from "../../api/users";
import AsyncStorage from "../../utils/AsyncStorage";

interface InvitationDoc {
  _id: string;
  title: string;
  date?: string;
  time?: string;
  venue?: string;
  description?: string;
  tags?: string[];
  createdAt: string;
}

export default function ExternalInvitations() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<InvitationDoc[]>([]);
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<InvitationDoc | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [canAdd, setCanAdd] = useState(true);

  // Form state
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("");
  const [venue, setVenue] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");

  const fetchItems = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    else setRefreshing(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const rawUser = await AsyncStorage.getItem("user");
      const u = rawUser ? JSON.parse(rawUser) : null;
      const role = u?.activeRole;
      setCanAdd(role !== "MinistryAdmin" && role !== "SuperAdmin");

      const res = await axios.get(`${BASE_URl}/api/invitations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data?.invitations || res.data || [];
      setItems(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load invitations");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const filtered = useMemo(() => {
    return items.filter((e) => {
      const matchSearch = (e.title || "").toLowerCase().includes(search.toLowerCase()) ||
        (e.venue || "").toLowerCase().includes(search.toLowerCase());
      const matchYear = selectedYear === "All" || (e.date || "").startsWith(selectedYear);
      return matchSearch && matchYear;
    });
  }, [items, search, selectedYear]);

  const years = ["All", ...Array.from({ length: 8 }, (_, i) => (new Date().getFullYear() - i).toString())];

  const resetForm = () => {
    setEditing(null);
    setTitle(""); setDate(new Date().toISOString().slice(0, 10));
    setTime(""); setVenue(""); setDescription(""); setUrl("");
  };

  const openEdit = (item: InvitationDoc) => {
    setEditing(item);
    setTitle(item.title || "");
    setDate((item.date || "").slice(0, 10));
    setTime(item.time || "");
    setVenue(item.venue || "");
    setDescription(item.description || "");
    setUrl(item.tags?.[0] || "");
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const payload = { title, date: date ? new Date(date).toISOString() : undefined, time, venue, description, tags: url ? [url] : [] };
      if (editing) {
        await axios.put(`${BASE_URl}/api/invitations/${editing._id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
        toast.success("Updated successfully");
      } else {
        await axios.post(`${BASE_URl}/api/invitations`, payload, { headers: { Authorization: `Bearer ${token}` } });
        toast.success("Invitation logged");
      }
      setShowForm(false);
      resetForm();
      fetchItems();
    } catch { toast.error("Operation failed"); }
    finally { setSubmitting(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this invitation record?")) return;
    try {
      const token = await AsyncStorage.getItem("token");
      await axios.delete(`${BASE_URl}/api/invitations/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Record removed");
      fetchItems();
    } catch { toast.error("Failed to remove"); }
  };

  const fmtDate = (raw?: string) => {
    if (!raw) return "";
    const d = new Date(raw);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0f1113] pb-32">
      {/* Header */}
      <div className="bg-[#00204a] pt-12 sm:pt-16 pb-32 sm:pb-24 px-6 sm:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-20 opacity-10 pointer-events-none">
          <Handshake size={300} className="text-[#349DC5] -rotate-12" />
        </div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-4 sm:gap-6">
            <button onClick={() => navigate(-1)} className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-2xl bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-95">
              <ArrowLeft size={28} />
            </button>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight leading-[1.1] sm:leading-none">
                External Invitations & Partnerships
              </h1>
              <div className="flex items-center gap-3 mt-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#349DC5] animate-pulse" />
                <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Outreach Collaboration Registry</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => fetchItems(true)} className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center border border-white/10 hover:bg-white/20 transition-all active:scale-95">
              <RefreshCw size={22} className={refreshing ? "animate-spin text-[#349DC5]" : "text-white/60"} />
            </button>
            {canAdd && (
              <button onClick={() => { resetForm(); setShowForm(true); }} className="h-14 px-8 bg-[#349DC5] text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-3 active:scale-95 transition-all shadow-lg shadow-cyan-500/20">
                <Plus size={18} /> Log Invitation
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-8">
        {/* Count Card */}
        <div className="bg-white dark:bg-[#1a1c1e] rounded-[40px] p-10 border border-gray-100 dark:border-white/5 shadow-sm mb-12 flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
            <Handshake size={100} className="text-[#349DC5]" />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] mb-3">Total Records</p>
            <h2 className="text-6xl font-black text-[#00204a] dark:text-white leading-none tracking-tighter tabular-nums">
              {filtered.length}
            </h2>
          </div>
          <div className="flex bg-gray-50 dark:bg-white/5 p-2 rounded-2xl gap-2 max-w-[55%] overflow-x-auto no-scrollbar flex-wrap justify-end">
            {years.slice(0, 5).map(y => (
              <button key={y} onClick={() => setSelectedYear(y)}
                className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedYear === y ? "bg-[#00204a] text-white shadow-md" : "text-gray-400 hover:text-gray-600"}`}>
                {y === "All" ? "Lifetime" : y}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative group mb-12">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#349DC5] transition-colors" size={24} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invitations or partnerships..."
            className="w-full h-20 pl-16 pr-8 bg-white dark:bg-[#1a1c1e] rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 font-bold text-lg outline-none focus:border-[#349DC5]/20 transition-all placeholder:text-gray-200" />
        </div>

        {/* List */}
        <div className="space-y-6">
          {loading ? (
            <div className="flex flex-col items-center py-24 gap-6 text-center">
              <div className="w-12 h-12 rounded-full border-4 border-[#349DC5] border-t-transparent animate-spin" />
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] animate-pulse">Loading Partnership Ledger...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-32 gap-6 text-center bg-white dark:bg-[#1a1c1e] rounded-[48px] border-2 border-dashed border-gray-100 dark:border-white/5">
              <div className="w-24 h-24 rounded-[40px] bg-indigo-50 dark:bg-indigo-900/10 flex items-center justify-center text-6xl shadow-inner animate-pulse">🤝</div>
              <div>
                <p className="text-sm font-black text-[#00204a] dark:text-white uppercase tracking-widest mb-2">No Records Found</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-loose">Log your first external invitation or collaboration.</p>
              </div>
            </div>
          ) : (
            filtered.map(item => (
              <motion.div layout key={item._id}
                className="bg-white dark:bg-[#1a1c1e] p-8 rounded-[40px] shadow-sm border border-gray-100 dark:border-white/5 hover:border-[#349DC5]/10 transition-all group">
                <div className="flex items-start justify-between gap-6 mb-6">
                  <div className="flex-1">
                    <h3 className="text-2xl font-black text-[#00204a] dark:text-white uppercase tracking-tight leading-none mb-3 group-hover:text-[#349DC5] transition-colors">
                      {item.title}
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {item.date && (
                        <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-[#349DC5] bg-blue-50 dark:bg-blue-900/20 px-4 py-1.5 rounded-full">
                          <Calendar size={10} /> {fmtDate(item.date)}{item.time ? ` · ${item.time}` : ""}
                        </span>
                      )}
                      {item.venue && (
                        <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-4 py-1.5 rounded-full">
                          <MapPin size={10} /> {item.venue}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button onClick={() => openEdit(item)} className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 hover:text-[#349DC5] hover:bg-white transition-all">
                      <Edit3 size={18} />
                    </button>
                    <button onClick={() => remove(item._id)} className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 hover:text-rose-500 hover:bg-white transition-all">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                {item.description && (
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 leading-relaxed mb-4 border-l-4 border-[#349DC5]/30 pl-4 py-2">
                    {item.description}
                  </p>
                )}
                {item.tags?.[0] && (
                  <a href={item.tags[0]} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-2 text-[10px] font-black text-[#349DC5] uppercase tracking-widest hover:underline">
                    <Link size={12} /> {item.tags[0].slice(0, 40)}{item.tags[0].length > 40 ? "..." : ""}
                  </a>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowForm(false)} className="absolute inset-0 bg-[#00204a]/80 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl bg-white dark:bg-[#1a1c1e] rounded-[50px] p-12 shadow-2xl overflow-y-auto max-h-[92vh]">
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-3xl font-black text-[#00204a] dark:text-white uppercase">{editing ? "Edit Invitation" : "Log Invitation"}</h3>
                <button onClick={() => { setShowForm(false); resetForm(); }} className="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center"><X size={20} className="text-gray-400" /></button>
              </div>
              <div className="space-y-6">
                <FormField label="Event Title" required>
                  <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. City-wide Gospel Rally" className="w-full h-16 px-6 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold text-lg focus:ring-2 ring-blue-500/20" />
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Date">
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full h-16 px-6 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold text-lg focus:ring-2 ring-blue-500/20 uppercase" />
                  </FormField>
                  <FormField label="Time">
                    <input value={time} onChange={e => setTime(e.target.value)} placeholder="e.g. 10:00 AM" className="w-full h-16 px-6 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold text-lg focus:ring-2 ring-blue-500/20" />
                  </FormField>
                </div>
                <FormField label="Venue / Location">
                  <input value={venue} onChange={e => setVenue(e.target.value)} placeholder="Event location" className="w-full h-16 px-6 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold text-lg focus:ring-2 ring-blue-500/20" />
                </FormField>
                <FormField label="Description">
                  <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description of the event..." className="w-full p-6 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-medium text-lg resize-none focus:ring-2 ring-blue-500/20" />
                </FormField>
                <FormField label="Reference URL (Optional)">
                  <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." className="w-full h-16 px-6 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold text-lg focus:ring-2 ring-blue-500/20" />
                </FormField>
                <div className="flex gap-4 pt-4">
                  <button onClick={() => { setShowForm(false); resetForm(); }} className="flex-1 h-16 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:text-rose-500 transition-all">Discard</button>
                  <button onClick={handleSubmit} disabled={submitting} className="flex-[2] h-16 bg-[#349DC5] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-cyan-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                    {submitting ? <RefreshCw className="animate-spin" /> : editing ? "Update Record" : "Save Invitation"}
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

function FormField({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">
        {label}{required && <span className="text-rose-400 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}
