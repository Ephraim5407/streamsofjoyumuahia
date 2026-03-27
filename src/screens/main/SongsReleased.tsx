import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Search, Plus, X, Calendar, Edit3, Trash2, 
  Music, User, Link as LinkIcon, ExternalLink, RefreshCw
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { BASE_URl } from "../../api/users";
import AsyncStorage from "../../utils/AsyncStorage";
import { listSongs, createSong, updateSong, deleteSong } from "../../api/songs";
import type { SongDoc } from "../../api/songs";

export default function SongsReleased() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [songs, setSongs] = useState<SongDoc[]>([]);
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SongDoc | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [canAdd, setCanAdd] = useState(true);

  // Form
  const [title, setTitle] = useState("");
  const [releaseDate, setReleaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [composer, setComposer] = useState("");
  const [vocalLeads, setVocalLeads] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");

  const fetchItems = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    else setRefreshing(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const rawUser = await AsyncStorage.getItem("user");
      const u = rawUser ? JSON.parse(rawUser) : null;
      const role = u?.activeRole;
      setCanAdd(role !== "SuperAdmin" && role !== "MinistryAdmin");

      const res = await listSongs(token as string);
      setSongs(res.songs || []);
    } catch {
      toast.error("Failed to load songs");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const filtered = useMemo(() => {
    return songs.filter(s => {
      const matchSearch = (s.title || "").toLowerCase().includes(search.toLowerCase()) || 
                          (s.composer || "").toLowerCase().includes(search.toLowerCase()) ||
                          (s.vocalLeads || "").toLowerCase().includes(search.toLowerCase());
      const matchYear = selectedYear === "All" || ((s.releaseDate || "") && new Date(s.releaseDate || "").getFullYear().toString() === selectedYear);
      return matchSearch && matchYear;
    }).sort((a, b) => {
      if (!a.releaseDate) return 1;
      if (!b.releaseDate) return -1;
      return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
    });
  }, [songs, search, selectedYear]);

  const years = ["All", ...Array.from({ length: 11 }, (_, i) => (new Date().getFullYear() - i).toString())];

  const resetForm = () => {
    setEditing(null); setTitle(""); setReleaseDate(new Date().toISOString().slice(0, 10));
    setComposer(""); setVocalLeads(""); setDescription(""); setLink("");
  };

  const openEdit = (s: SongDoc) => {
    setEditing(s);
    setTitle(s.title || "");
    setReleaseDate((s.releaseDate || "").slice(0, 10));
    setComposer(s.composer || "");
    setVocalLeads(s.vocalLeads || "");
    setDescription(s.description || "");
    setLink(s.link || "");
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !composer.trim()) { toast.error("Title and Composer are required"); return; }
    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const payload = { title, releaseDate: releaseDate ? new Date(releaseDate).toISOString() : undefined, composer, vocalLeads, description, link };
      if (editing) {
        await updateSong(editing._id, payload, token as string);
        toast.success("Song updated");
      } else {
        await createSong(payload, token as string);
        toast.success("Song released");
      }
      setShowForm(false); resetForm(); fetchItems();
    } catch { toast.error("Operation failed"); }
    finally { setSubmitting(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this song from the registry?")) return;
    try {
      const token = await AsyncStorage.getItem("token");
      await deleteSong(id, token as string);
      toast.success("Song removed");
      fetchItems();
    } catch { toast.error("Failed to remove"); }
  };

  const getEmbedUrl = (url?: string) => {
    if (!url) return null;
    try {
      const uri = new URL(url);
      if (uri.hostname.includes("youtube.com") || uri.hostname.includes("youtu.be")) {
        const vid = uri.searchParams.get("v") || uri.pathname.split("/").pop();
        return `https://www.youtube.com/embed/${vid}`;
      }
    } catch {}
    return null;
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0f1113] pb-32">
      {/* Header */}
      <div className="bg-[#00204a] pt-12 sm:pt-16 pb-32 sm:pb-24 px-6 sm:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-20 opacity-10 pointer-events-none">
          <Music size={300} className="text-[#349DC5] -rotate-12" />
        </div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-4 sm:gap-6">
            <button onClick={() => navigate(-1)} className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-2xl bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-95">
              <ArrowLeft size={28} />
            </button>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight leading-[1.1] sm:leading-none">Songs Released</h1>
              <div className="flex items-center gap-3 mt-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#349DC5] animate-pulse" />
                <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Music Ministry Discography</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => fetchItems(true)} className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center border border-white/10 hover:bg-white/20 transition-all active:scale-95">
              <RefreshCw size={22} className={refreshing ? "animate-spin text-[#349DC5]" : "text-white/60"} />
            </button>
            {canAdd && (
              <button onClick={() => { resetForm(); setShowForm(true); }} className="h-14 px-8 bg-[#349DC5] text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-3 active:scale-95 transition-all shadow-lg shadow-cyan-500/20">
                <Plus size={18} /> New Release
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-8">
        {/* Count Card */}
        <div className="bg-white dark:bg-[#1a1c1e] rounded-[40px] p-10 border border-gray-100 dark:border-white/5 shadow-sm mb-12 flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
            <Music size={100} className="text-[#349DC5]" />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] mb-3">Total Releases</p>
            <h2 className="text-6xl font-black text-[#00204a] dark:text-white leading-none tracking-tighter tabular-nums">{filtered.length}</h2>
          </div>
          <div className="flex bg-gray-50 dark:bg-white/5 p-2 rounded-2xl gap-2 max-w-[50%] overflow-x-auto no-scrollbar">
            {years.slice(0, 4).map(y => (
              <button key={y} onClick={() => setSelectedYear(y)}
                className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedYear === y ? "bg-[#00204a] text-white shadow-md" : "text-gray-400 hover:text-gray-600"}`}>
                {y === "All" ? "Lifetime" : y}
              </button>
            ))}
          </div>
        </div>

        <div className="relative group mb-12">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#349DC5] transition-colors" size={24} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title, composer, or lead vocal..."
            className="w-full h-20 pl-16 pr-8 bg-white dark:bg-[#1a1c1e] rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 font-bold text-lg outline-none focus:border-[#349DC5]/20 transition-all placeholder:text-gray-200" />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {loading ? (
            <div className="md:col-span-2 flex flex-col items-center py-24 gap-6 text-center">
              <div className="w-12 h-12 rounded-full border-4 border-[#349DC5] border-t-transparent animate-spin" />
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] animate-pulse">Loading Catalog...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="md:col-span-2 flex flex-col items-center py-32 gap-6 text-center bg-white dark:bg-[#1a1c1e] rounded-[48px] border-2 border-dashed border-gray-100 dark:border-white/5">
              <div className="w-24 h-24 rounded-[40px] bg-indigo-50 dark:bg-indigo-900/10 flex items-center justify-center text-6xl shadow-inner animate-pulse">📻</div>
              <div>
                <p className="text-sm font-black text-[#00204a] dark:text-white uppercase tracking-widest mb-2">No Releases Found</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-loose">Upload or register your first original soul.</p>
              </div>
            </div>
          ) : filtered.map(s => (
            <motion.div layout key={s._id}
              className="bg-white dark:bg-[#1a1c1e] rounded-[40px] shadow-sm border border-gray-100 dark:border-white/5 hover:border-[#349DC5]/10 flex flex-col overflow-hidden transition-all group">
              <div className="p-8 pb-6 flex-1">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/10 text-indigo-500 rounded-[20px] flex items-center justify-center text-2xl font-black shadow-inner shadow-indigo-500/10">
                    <Music size={24} />
                  </div>
                  {canAdd && (
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(s)} className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 hover:text-[#349DC5] hover:bg-white transition-all"><Edit3 size={16} /></button>
                      <button onClick={() => remove(s._id)} className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 hover:text-rose-500 hover:bg-white transition-all"><Trash2 size={16} /></button>
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-black text-[#00204a] dark:text-white uppercase tracking-tight leading-none mb-4 group-hover:text-[#349DC5] transition-colors line-clamp-2">
                  {s.title}
                </h3>
                
                <div className="space-y-3 mb-6">
                  {s.composer && (
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500 shrink-0"><User size={10} /></div>
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300 line-clamp-1">{s.composer}</span>
                    </div>
                  )}
                  {s.vocalLeads && (
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-500 shrink-0"><User size={10} className="ml-0.5" /><User size={10} className="-ml-1" /></div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Leads</span>
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300 line-clamp-1">{s.vocalLeads}</span>
                      </div>
                    </div>
                  )}
                  {s.releaseDate && (
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-500 shrink-0"><Calendar size={10} /></div>
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{new Date(s.releaseDate).toLocaleDateString("en-GB", { month: "long", year: "numeric", day: "numeric" })}</span>
                    </div>
                  )}
                </div>

                {s.description && <p className="text-xs font-medium text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-3">{s.description}</p>}
              </div>

              {s.link && (
                <div className="p-4 border-t border-gray-50 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
                  {getEmbedUrl(s.link) ? (
                    <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black/5">
                      <iframe src={getEmbedUrl(s.link)!} className="w-full h-full" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                    </div>
                  ) : (
                    <a href={s.link} target="_blank" rel="noreferrer" className="h-12 bg-white dark:bg-white/5 rounded-2xl flex items-center justify-center gap-2 text-xs font-black text-[#349DC5] uppercase tracking-widest hover:bg-blue-50 transition-all border border-[#349DC5]/10">
                      <ExternalLink size={14} /> Listen Tracks
                    </a>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowForm(false)} className="absolute inset-0 bg-[#00204a]/80 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl bg-white dark:bg-[#1a1c1e] rounded-[50px] p-12 shadow-2xl overflow-y-auto max-h-[92vh]">
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-3xl font-black text-[#00204a] dark:text-white uppercase">{editing ? "Edit Release" : "New Release"}</h3>
                <button onClick={() => { setShowForm(false); resetForm(); }} className="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center"><X size={20} className="text-gray-400" /></button>
              </div>
              <div className="space-y-5">
                <FieldWrap label="Song Title" required>
                  <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" className="w-full h-16 px-6 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold text-lg focus:ring-2 ring-blue-500/20" />
                </FieldWrap>
                <div className="grid grid-cols-2 gap-4">
                  <FieldWrap label="Composer" required>
                    <input value={composer} onChange={e => setComposer(e.target.value)} placeholder="Composer name" className="w-full h-16 px-6 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold text-lg focus:ring-2 ring-blue-500/20" />
                  </FieldWrap>
                  <FieldWrap label="Release Date">
                    <input type="date" value={releaseDate} onChange={e => setReleaseDate(e.target.value)} className="w-full h-16 px-6 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold text-lg focus:ring-2 ring-blue-500/20 uppercase" />
                  </FieldWrap>
                </div>
                <FieldWrap label="Vocal Lead(s)">
                   <input value={vocalLeads} onChange={e => setVocalLeads(e.target.value)} placeholder="e.g. Grace, David" className="w-full h-16 px-6 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold text-lg focus:ring-2 ring-blue-500/20" />
                </FieldWrap>
                <FieldWrap label="Description">
                  <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief back-story or message..." className="w-full p-6 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-medium text-lg resize-none focus:ring-2 ring-blue-500/20" />
                </FieldWrap>
                <FieldWrap label="Link to Song (YouTube, Audiomack, Spotify)">
                  <div className="relative">
                    <LinkIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input value={link} type="url" onChange={e => setLink(e.target.value)} placeholder="https://..." className="w-full h-16 pl-14 pr-6 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold text-lg focus:ring-2 ring-blue-500/20" />
                  </div>
                </FieldWrap>
                <div className="flex gap-4 pt-4">
                  <button onClick={() => { setShowForm(false); resetForm(); }} className="flex-1 h-16 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest">Discard</button>
                  <button onClick={handleSubmit} disabled={submitting} className="flex-[2] h-16 bg-[#349DC5] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 transition-all">
                    {submitting ? <RefreshCw className="animate-spin" size={18} /> : editing ? "Update Song" : "Publish Release"}
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
