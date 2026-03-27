import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Search, Plus, X, RefreshCw, User, Users,
  Phone, Calendar, Trash2, Edit2
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { BASE_URl } from "../../api/users";
import AsyncStorage from "../../utils/AsyncStorage";

const getUnitId = async () => {
  const direct = await AsyncStorage.getItem("activeUnitId");
  if (direct) return direct;
  const rawUser = await AsyncStorage.getItem("user");
  if (!rawUser) return null;
  const u = JSON.parse(rawUser);
  return u?.activeUnitId || u?.activeUnit?._id || u?.activeUnit ||
    (u?.roles || []).find((r: any) => r.role === "UnitLeader" && r.unit)?.unit ||
    (u?.roles || []).find((r: any) => r.role === "Member" && r.unit)?.unit || null;
};

interface FirstTimerDoc {
  _id: string;
  name: string;
  phone?: string;
  gender?: string;
  ageRange?: string;
  address?: string;
  note?: string;
  visitDate?: string;
  createdAt: string;
}

export default function FirstTimers() {
  const navigate = useNavigate();
  const [items, setItems] = useState<FirstTimerDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FirstTimerDoc | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("Male");
  const [ageRange, setAgeRange] = useState("Adult");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [visitDate, setVisitDate] = useState(new Date().toISOString().slice(0, 10));

  const fetchItems = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    else setRefreshing(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const unitId = await getUnitId();
      const res = await axios.get(`${BASE_URl}/api/first-timers`, {
        params: { unitId: unitId || undefined, year: selectedYear === "All" ? undefined : selectedYear },
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data?.firstTimers || res.data?.items || res.data || [];
      setItems(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load first-timers registry");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedYear]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const filtered = useMemo(() => {
    return items.filter(ft => {
      const matchSearch = (ft.name || "").toLowerCase().includes(search.toLowerCase()) || (ft.phone || "").includes(search);
      const matchYear = selectedYear === "All" || ((ft.visitDate || ft.createdAt || "") && new Date(ft.visitDate || ft.createdAt).getFullYear().toString() === selectedYear);
      return matchSearch && matchYear;
    });
  }, [items, search, selectedYear]);

  const years = ["All", ...Array.from({ length: 6 }, (_, i) => (new Date().getFullYear() - i).toString())];

  const resetForm = () => {
    setEditing(null); setName(""); setPhone(""); setGender("Male"); setAgeRange("Adult");
    setAddress(""); setNote(""); setVisitDate(new Date().toISOString().slice(0, 10));
  };

  const openEdit = (ft: FirstTimerDoc) => {
    setEditing(ft); setName(ft.name || ""); setPhone(ft.phone || ""); setGender(ft.gender || "Male");
    setAgeRange(ft.ageRange || "Adult"); setAddress(ft.address || ""); setNote(ft.note || "");
    setVisitDate((ft.visitDate || ft.createdAt || "").slice(0, 10));
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const unitId = await getUnitId();
      const payload = { name, phone, gender, ageRange, address, note, visitDate: new Date(visitDate).toISOString(), unitId };
      if (editing) {
        await axios.put(`${BASE_URl}/api/first-timers/${editing._id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
        toast.success("Record updated");
      } else {
        await axios.post(`${BASE_URl}/api/first-timers`, payload, { headers: { Authorization: `Bearer ${token}` } });
        toast.success("First-timer registered");
      }
      setShowForm(false); resetForm(); fetchItems();
    } catch { toast.error("Operation failed"); }
    finally { setSubmitting(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this record?")) return;
    try {
      const token = await AsyncStorage.getItem("token");
      await axios.delete(`${BASE_URl}/api/first-timers/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Record removed"); fetchItems();
    } catch { toast.error("Failed to remove"); }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0f1113] pb-32">
      {/* Header */}
      <div className="bg-[#00204a] pt-12 sm:pt-16 pb-32 sm:pb-24 px-6 sm:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-20 opacity-10 pointer-events-none">
          <Users size={300} className="text-[#349DC5] -rotate-12" />
        </div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-4 sm:gap-6">
            <button onClick={() => navigate(-1)} className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-2xl bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-95">
              <ArrowLeft size={28} />
            </button>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight leading-[1.1] sm:leading-none">First Timers</h1>
              <div className="flex items-center gap-3 mt-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#349DC5] animate-pulse" />
                <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest">First-Time Visitors Registry</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => fetchItems(true)} className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center border border-white/10 hover:bg-white/20 transition-all active:scale-95">
              <RefreshCw size={22} className={refreshing ? "animate-spin text-[#349DC5]" : "text-white/60"} />
            </button>
            <button onClick={() => { resetForm(); setShowForm(true); }} className="h-14 px-8 bg-[#349DC5] text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-3 active:scale-95 transition-all shadow-lg shadow-cyan-500/20">
              <Plus size={18} /> Log First Timer
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-8">
        {/* Count Card */}
        <div className="bg-white dark:bg-[#1a1c1e] rounded-[40px] p-10 border border-gray-100 dark:border-white/5 shadow-sm mb-12 flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
            <Users size={100} className="text-[#349DC5]" />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] mb-3">Total First Timers</p>
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or phone..."
            className="w-full h-20 pl-16 pr-8 bg-white dark:bg-[#1a1c1e] rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 font-bold text-lg outline-none focus:border-[#349DC5]/20 transition-all placeholder:text-gray-200" />
        </div>

        <div className="space-y-6">
          {loading ? (
            <div className="flex flex-col items-center py-24 gap-6 text-center">
              <div className="w-12 h-12 rounded-full border-4 border-[#349DC5] border-t-transparent animate-spin" />
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] animate-pulse">Syncing First-Timers Registry...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-32 gap-6 text-center bg-white dark:bg-[#1a1c1e] rounded-[48px] border-2 border-dashed border-gray-100 dark:border-white/5">
              <div className="w-24 h-24 rounded-[40px] bg-indigo-50 dark:bg-indigo-900/10 flex items-center justify-center text-6xl shadow-inner animate-pulse">🙏</div>
              <div>
                <p className="text-sm font-black text-[#00204a] dark:text-white uppercase tracking-widest mb-2">No Records Yet</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-loose">Log your first first-timer today.</p>
              </div>
            </div>
          ) : filtered.map(ft => (
            <motion.div layout key={ft._id}
              className="bg-white dark:bg-[#1a1c1e] p-8 rounded-[40px] shadow-sm border border-gray-100 dark:border-white/5 hover:border-[#349DC5]/10 transition-all group">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/10 text-indigo-500 rounded-[28px] flex items-center justify-center text-3xl font-black shadow-inner">
                    {(ft.name || "?")[0]}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-[#00204a] dark:text-white uppercase tracking-tight leading-none mb-2 group-hover:text-[#349DC5] transition-colors">
                      {ft.name || "Unknown"}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {ft.gender && <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-md ${ft.gender === "Male" ? "text-blue-500 bg-blue-50" : "text-rose-400 bg-rose-50"}`}>{ft.gender}</span>}
                      {ft.ageRange && <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 bg-gray-50 px-3 py-1 rounded-md">{ft.ageRange}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => openEdit(ft)} className="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 hover:text-[#349DC5] hover:bg-white transition-all"><Edit2 size={18} /></button>
                  <button onClick={() => remove(ft._id)} className="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 hover:text-rose-500 hover:bg-white transition-all"><Trash2 size={18} /></button>
                </div>
              </div>
              <div className="space-y-3">
                {ft.phone && <div className="flex items-center justify-between py-3 border-b border-gray-50 dark:border-white/5"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Phone size={12} />Phone</span><span className="text-sm font-bold text-[#00204a] dark:text-white">{ft.phone}</span></div>}
                {ft.visitDate && <div className="flex items-center justify-between py-3 border-b border-gray-50 dark:border-white/5"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Calendar size={12} />Visit Date</span><span className="text-sm font-bold text-[#00204a] dark:text-white">{new Date(ft.visitDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span></div>}
                {ft.address && <div className="flex items-center justify-between py-3 border-b border-gray-50 dark:border-white/5"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Address</span><span className="text-sm font-bold text-[#00204a] dark:text-white">{ft.address}</span></div>}
                {ft.note && <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400 leading-relaxed border-l-4 border-[#349DC5]/30 pl-4 py-2">{ft.note}</p>}
              </div>
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
                <h3 className="text-3xl font-black text-[#00204a] dark:text-white uppercase">{editing ? "Edit Record" : "Log First Timer"}</h3>
                <button onClick={() => { setShowForm(false); resetForm(); }} className="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center"><X size={20} className="text-gray-400" /></button>
              </div>
              <div className="space-y-5">
                <FieldWrap label="Full Name" required>
                  <div className="relative"><User className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={18} /><input value={name} onChange={e => setName(e.target.value)} placeholder="Full Name" className="w-full h-16 pl-14 pr-5 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold text-lg focus:ring-2 ring-blue-500/20" /></div>
                </FieldWrap>
                <div className="grid grid-cols-2 gap-4">
                  <FieldWrap label="Phone">
                    <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone" className="w-full h-16 px-5 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold text-lg focus:ring-2 ring-blue-500/20" />
                  </FieldWrap>
                  <FieldWrap label="Visit Date">
                    <input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)} className="w-full h-16 px-5 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold text-lg focus:ring-2 ring-blue-500/20 uppercase" />
                  </FieldWrap>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FieldWrap label="Gender">
                    <select value={gender} onChange={e => setGender(e.target.value)} className="w-full h-16 px-5 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold text-lg appearance-none">
                      <option>Male</option><option>Female</option>
                    </select>
                  </FieldWrap>
                  <FieldWrap label="Age Group">
                    <select value={ageRange} onChange={e => setAgeRange(e.target.value)} className="w-full h-16 px-5 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold text-lg appearance-none">
                      <option>Child</option><option>Teenager</option><option>Adult</option><option>Elder</option>
                    </select>
                  </FieldWrap>
                </div>
                <FieldWrap label="Address">
                  <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Home address" className="w-full h-16 px-5 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold text-lg focus:ring-2 ring-blue-500/20" />
                </FieldWrap>
                <FieldWrap label="Notes (Optional)">
                  <textarea rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Any additional context..." className="w-full p-5 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-medium text-lg resize-none focus:ring-2 ring-blue-500/20" />
                </FieldWrap>
                <div className="flex gap-4 pt-4">
                  <button onClick={() => { setShowForm(false); resetForm(); }} className="flex-1 h-16 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest">Cancel</button>
                  <button onClick={handleSubmit} disabled={submitting} className="flex-[2] h-16 bg-[#349DC5] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-cyan-500/20 disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95">
                    {submitting ? <RefreshCw className="animate-spin" size={18} /> : editing ? "Update Record" : "Save Record"}
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
