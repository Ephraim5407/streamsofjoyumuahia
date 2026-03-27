import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Search, Plus, X, ChevronDown, Check, Filter,
  User, Phone, MapPin, Calendar, Heart, Edit3, Trash2, Flame
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { BASE_URl } from "../../api/users";
import AsyncStorage from "../../utils/AsyncStorage";

interface SoulDoc {
  _id: string;
  name: string;
  gender: string;
  phone?: string;
  age?: string;
  through?: string;
  location?: string;
  date?: string;
  addedBy?: string;
}

const AGE_RANGES = ["Under 16", "16 - 20", "21 - 30", "31 - 40", "41 - 50", "51+"];
const CONVERTED_THROUGH = ["Evangelism", "Sunday Service", "Youth Programme", "A Friend", "Social Media", "Workshop", "Others"];
const GENDER_OPTIONS = ["Male", "Female"];

const getUnitId = async () => {
  const direct = await AsyncStorage.getItem("activeUnitId");
  if (direct) return direct;
  const rawUser = await AsyncStorage.getItem("user");
  if (!rawUser) return null;
  const u = JSON.parse(rawUser);
  return u?.activeUnitId || u?.activeUnit?._id || u?.activeUnit || (u?.roles || []).find((r: any) => r.role === "UnitLeader" && r.unit)?.unit || (u?.roles || []).find((r: any) => r.role === "Member" && r.unit)?.unit || null;
};

export default function SoulHarvestedScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { scope?: "mine" | "unit" } | null;
  const scope = state?.scope || "mine";

  const [unitId, setUnitId] = useState("");
  const [souls, setSouls] = useState<SoulDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SoulDoc | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [role, setRole] = useState("");

  // form
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [through, setThrough] = useState("");
  const [location2, setLocation2] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  // form pickers
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showAgePicker, setShowAgePicker] = useState(false);
  const [showThroughPicker, setShowThroughPicker] = useState(false);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2013 }, (_, i) => currentYear - i);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const uid = await getUnitId();
      setUnitId(uid || "");
      const res = await axios.get(`${BASE_URl}/api/souls`, {
        params: { unitId: uid || undefined, year },
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = Array.isArray(res.data) ? res.data : res.data?.souls || [];
      setSouls(Array.isArray(data) ? data : []);
      
      const rawUser = await AsyncStorage.getItem("user");
      if (rawUser) {
          const u = JSON.parse(rawUser);
          setRole(u.activeRole || "");
      }
    } catch { toast.error("Failed to load records"); }
    finally { setLoading(false); }
  }, [year]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return souls.filter(s => {
      const matchesSearch = !q || s.name.toLowerCase().includes(q) || (s.location || "").toLowerCase().includes(q) || (s.through || "").toLowerCase().includes(q);
      const matchesYear = (year === 0) || (s.date && new Date(s.date).getFullYear() === year);
      return matchesSearch && matchesYear;
    });
  }, [souls, search, year]);

  const canMutate = role === "UnitLeader" || role === "SuperAdmin" || role === "MinistryAdmin" || role === "Member";

  const resetForm = () => {
    setEditing(null); setName(""); setGender(""); setPhone("");
    setAge(""); setThrough(""); setLocation2(""); setDate(new Date().toISOString().slice(0, 10));
  };
  const openNew = () => { resetForm(); setShowForm(true); };
  const openEdit = (doc: SoulDoc) => {
    setEditing(doc); setName(doc.name); setGender(doc.gender || ""); setPhone(doc.phone || "");
    setAge(doc.age || ""); setThrough(doc.through || ""); setLocation2(doc.location || "");
    setDate((doc.date || "").slice(0, 10) || new Date().toISOString().slice(0, 10));
    setShowForm(true);
  };

  const submit = async () => {
    if (!name.trim() || !gender || !date) { toast.error("Please fill in required fields"); return; }
    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const payload = { name, gender, phone, age, through, location: location2, date, unitId: unitId || undefined };
      if (editing) {
        await axios.put(`${BASE_URl}/api/souls/${editing._id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
        toast.success("Record updated");
      } else {
        await axios.post(`${BASE_URl}/api/souls`, payload, { headers: { Authorization: `Bearer ${token}` } });
        toast.success("Soul Harvested recorded");
      }
      setShowForm(false); resetForm(); load();
    } catch (e: any) { toast.error(e.response?.data?.message || "Failed"); }
    finally { setSubmitting(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this record?")) return;
    try {
      const token = await AsyncStorage.getItem("token");
      await axios.delete(`${BASE_URl}/api/souls/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Record deleted"); load();
    } catch { toast.error("Failed to delete"); }
  };

  const PickerModal = ({ open, onClose, title, options, value, onSelect }: any) => (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={e => e.stopPropagation()} className="relative bg-white dark:bg-[#1e1e1e] w-full sm:max-w-xs rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl max-h-[60vh] overflow-y-auto">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">{title}</p>
            {options.map((o: string) => (
              <button key={o} onClick={() => { onSelect(o); onClose(); }} className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5">
                <span className="text-sm font-bold text-[#00204a] dark:text-white">{o}</span>
                {value === o && <Check size={14} className="text-[#349DC5]" />}
              </button>
            ))}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#111] pb-24">
      <div className="bg-white dark:bg-[#1a1a1a] border-b border-gray-100 dark:border-white/5 px-4 pt-10 pb-4 sticky top-0 z-20">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-500">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔥</span>
              <h1 className="text-xl sm:text-2xl font-black text-[#00204a] dark:text-white uppercase tracking-tight">
                Soul Harvested
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#349DC5] animate-pulse" />
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                {scope === "unit" ? "Unit Harvest Metrics" : "Personal Soul Records"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowYearPicker(true)} className="flex items-center gap-2 px-4 py-2 border border-gray-100 dark:border-white/10 rounded-2xl text-xs font-black text-[#00204a] dark:text-white uppercase tracking-widest bg-white dark:bg-white/5 shadow-sm">
              {year} <ChevronDown size={14} className="text-[#349DC5]" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-6">
        {/* Premium Count Card */}
        <div className="bg-white dark:bg-[#1a1c1e] rounded-[32px] p-8 border border-gray-100 dark:border-white/5 shadow-sm mb-10 flex items-center justify-between group overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Flame size={80} className="text-[#349DC5] -rotate-12" />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-3">Total Harvested</p>
            <h2 className="text-5xl font-black text-[#00204a] dark:text-white tabular-nums leading-none tracking-tighter">
              {filtered.length}
            </h2>
          </div>
          <div className="relative z-10 pointer-events-none sm:pointer-events-auto">
            <div className="bg-[#349DC5]/10 px-6 py-3 rounded-2xl flex items-center gap-2 border border-[#349DC5]/20">
              <span className="text-[10px] font-black text-[#349DC5] uppercase tracking-widest">Year {year}</span>
            </div>
          </div>
        </div>

        {/* Search + Add */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1 flex items-center gap-3 bg-white dark:bg-[#1a1c1e] rounded-[24px] px-6 py-4 border border-gray-100 dark:border-white/5 shadow-sm focus-within:border-[#349DC5]/30 transition-all">
            <Search size={18} className="text-gray-300 shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search record by name..." className="flex-1 bg-transparent text-sm font-bold text-[#00204a] dark:text-white placeholder:text-gray-200 outline-none uppercase tracking-wide" />
          </div>
          {canMutate && (
            <button onClick={openNew} className="h-16 px-8 bg-[#349DC5] text-white rounded-[24px] text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/10 active:scale-95 transition-all whitespace-nowrap">
              <Plus size={18} /> Log Harvest
            </button>
          )}
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center py-20 gap-4">
              <div className="w-12 h-12 rounded-full border-4 border-[#349DC5] border-t-transparent animate-spin" />
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Synchronizing Cloud...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-32 gap-6">
              <div className="w-24 h-24 rounded-[40px] bg-gray-50 dark:bg-white/5 flex items-center justify-center text-6xl shadow-inner animate-pulse">🔥</div>
              <div className="text-center">
                <p className="text-sm font-black text-[#00204a] dark:text-white uppercase tracking-widest mb-2">No Souls Logged</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-loose">The harvest field is currently empty.<br />Log your first tactical victory today.</p>
              </div>
            </div>
          ) : (
            filtered.map(soul => (
              <motion.div
                key={soul._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-[#1a1c1e] rounded-[32px] p-8 border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-900/10 flex items-center justify-center text-orange-500">
                      <Heart size={24} fill="currentColor" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-[#00204a] dark:text-white uppercase tracking-tight leading-none mb-1">
                        {soul.name}
                      </h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Captured Registry {soul.date ? new Date(soul.date).getFullYear() : year}
                      </p>
                    </div>
                  </div>
                  {canMutate && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(soul)}
                        className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-[#349DC5] hover:scale-105 active:scale-95 transition-all"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => remove(soul._id)}
                        className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-rose-400 hover:scale-105 active:scale-95 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <DetailRow label="Biological Gender" value={soul.gender} />
                  <DetailRow label="Temporal Window" value={soul.age} />
                  <DetailRow label="Contact Tether" value={soul.phone} />
                  <DetailRow label="Strategic Bridge" value={soul.through} />
                  <DetailRow label="Mission Location" value={soul.location} />
                  <DetailRow
                    label="Victory Date"
                    value={soul.date ? new Date(soul.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—"}
                  />
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>


      {/* Year picker */}
      <PickerModal open={showYearPicker} onClose={() => setShowYearPicker(false)} title="Select Year" options={years.map(String)} value={String(year)} onSelect={(v: string) => setYear(parseInt(v))} />
      {/* Form pickers */}
      <PickerModal open={showGenderPicker} onClose={() => setShowGenderPicker(false)} title="Gender" options={GENDER_OPTIONS} value={gender} onSelect={setGender} />
      <PickerModal open={showAgePicker} onClose={() => setShowAgePicker(false)} title="Age Range" options={AGE_RANGES} value={age} onSelect={setAge} />
      <PickerModal open={showThroughPicker} onClose={() => setShowThroughPicker(false)} title="Converted Through" options={CONVERTED_THROUGH} value={through} onSelect={setThrough} />

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowForm(false); resetForm(); }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} onClick={e => e.stopPropagation()} className="relative bg-white dark:bg-[#1e1e1e] w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col">
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-white/5">
                <h2 className="text-sm font-black text-[#00204a] dark:text-white uppercase tracking-widest">{editing ? "Edit Soul Record" : "Add New Soul"}</h2>
                <button onClick={() => { setShowForm(false); resetForm(); }} className="w-9 h-9 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center"><X size={18} className="text-gray-400" /></button>
              </div>
              <div className="overflow-y-auto px-6 py-5 space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Full Name *</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Enter full name" className="w-full px-4 py-3 border border-gray-100 dark:border-white/10 rounded-2xl bg-white dark:bg-[#2a2a2a] text-sm font-bold text-[#00204a] dark:text-white outline-none" />
                </div>
                {/* Gender */}
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Gender *</label>
                  <button onClick={() => setShowGenderPicker(true)} className="w-full flex items-center justify-between px-4 py-3 border border-gray-100 dark:border-white/10 rounded-2xl bg-white dark:bg-[#2a2a2a]">
                    <span className={`text-sm font-bold ${gender ? "text-[#00204a] dark:text-white" : "text-gray-300"}`}>{gender || "Select gender"}</span>
                    <ChevronDown size={16} className="text-gray-400" />
                  </button>
                </div>
                {/* Phone */}
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Phone Number</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g., 08040356328" className="w-full px-4 py-3 border border-gray-100 dark:border-white/10 rounded-2xl bg-white dark:bg-[#2a2a2a] text-sm font-bold text-[#00204a] dark:text-white outline-none" />
                </div>
                {/* Age */}
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Age</label>
                  <button onClick={() => setShowAgePicker(true)} className="w-full flex items-center justify-between px-4 py-3 border border-gray-100 dark:border-white/10 rounded-2xl bg-white dark:bg-[#2a2a2a]">
                    <span className={`text-sm font-bold ${age ? "text-[#00204a] dark:text-white" : "text-gray-300"}`}>{age || "Select age range"}</span>
                    <ChevronDown size={16} className="text-gray-400" />
                  </button>
                </div>
                {/* Converted Through */}
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Converted Through</label>
                  <button onClick={() => setShowThroughPicker(true)} className="w-full flex items-center justify-between px-4 py-3 border border-gray-100 dark:border-white/10 rounded-2xl bg-white dark:bg-[#2a2a2a]">
                    <span className={`text-sm font-bold ${through ? "text-[#00204a] dark:text-white" : "text-gray-300"}`}>{through || "How were they converted?"}</span>
                    <ChevronDown size={16} className="text-gray-400" />
                  </button>
                </div>
                {/* Location */}
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Location</label>
                  <input value={location2} onChange={e => setLocation2(e.target.value)} placeholder="e.g., Aba" className="w-full px-4 py-3 border border-gray-100 dark:border-white/10 rounded-2xl bg-white dark:bg-[#2a2a2a] text-sm font-bold text-[#00204a] dark:text-white outline-none" />
                </div>
                {/* Date */}
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Date *</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-3 border border-gray-100 dark:border-white/10 rounded-2xl bg-white dark:bg-[#2a2a2a] text-sm font-bold text-[#00204a] dark:text-white outline-none" />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-50 dark:border-white/5 flex gap-3">
                <button onClick={() => { setShowForm(false); resetForm(); }} className="flex-1 py-4 rounded-2xl border border-gray-200 dark:border-white/10 text-xs font-black text-gray-400 uppercase tracking-widest">Cancel</button>
                <button onClick={submit} disabled={submitting} className="flex-1 py-4 bg-[#349DC5] text-white rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {editing ? "Update" : "Save"}
                </button>
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
      <span className="text-sm font-bold text-[#00204a] dark:text-white">{value}</span>
    </div>
  );
}
