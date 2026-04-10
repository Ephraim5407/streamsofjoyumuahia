import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Search, Plus, X, ChevronDown, Filter,
  Edit3, Trash2, Users, User, Phone, Calendar, Sparkles, RefreshCw
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { BASE_URl } from "../../api/users";
import AsyncStorage from "../../utils/AsyncStorage";

interface RecoveredDoc {
  _id: string;
  fullName: string;
  gender: "Male" | "Female";
  age?: number;
  maritalStatus?: string;
  addictionType: string;
  dateOfRecovery: string;
  phone?: string;
  unitId?: string;
}

const ADDICTION_TYPES = ["Alchohol", "Drugs", "Pornography", "Theif", "Killing", "Fight", "Lazy"];
const GENDER_OPTIONS = ["Male", "Female"];
const MARITAL_OPTIONS = ["Single", "Married", "Divorced", "Widowed"];

const getUnitId = async () => {
    const direct = await AsyncStorage.getItem("activeUnitId");
    if (direct) return direct;
    const rawUser = await AsyncStorage.getItem("user");
    if (!rawUser) return null;
    const u = JSON.parse(rawUser);
    return u?.activeUnitId || u?.activeUnit?._id || u?.activeUnit || (u?.roles || []).find((r: any) => r.role === "UnitLeader" && r.unit)?.unit || (u?.roles || []).find((r: any) => r.role === "Member" && r.unit)?.unit || null;
};

export default function RecoveredAddicts() {
  const navigate = useNavigate();
  const [addicts, setAddicts] = useState<RecoveredDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RecoveredDoc | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [unitId, setUnitId] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("All");

  // form
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [surname, setSurname] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [addictionType, setAddictionType] = useState("");
  const [dateOfRecovery, setDateOfRecovery] = useState(new Date().toISOString().slice(0, 10));
  const [phone, setPhone] = useState("");

  const [showFormGenderPicker, setShowFormGenderPicker] = useState(false);
  const [showFormMaritalPicker, setShowFormMaritalPicker] = useState(false);
  const [showFormAddictionPicker, setShowFormAddictionPicker] = useState(false);

  const fetchAddicts = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    else setRefreshing(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const uid = await getUnitId();
      setUnitId(uid || "");
      const res = await axios.get(`${BASE_URl}/api/recovered`, {
        params: { unitId: uid || undefined, year: selectedYear === "All" ? undefined : selectedYear },
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.data?.recovered || res.data || [];
      setAddicts(Array.isArray(data) ? data : []);
    } catch { toast.error("Failed to load records"); }
    finally { setLoading(false); setRefreshing(false); }
  }, [selectedYear]);

  useEffect(() => { fetchAddicts(); }, [fetchAddicts]);

  const filteredAddicts = useMemo(() => {
    return addicts.filter(a =>
      ((a.fullName || "").toLowerCase().includes(search.toLowerCase()) || (a.addictionType || "").toLowerCase().includes(search.toLowerCase())) &&
      (selectedYear === "All" || (a.dateOfRecovery && new Date(a.dateOfRecovery).getFullYear().toString() === selectedYear))
    );
  }, [addicts, search, selectedYear]);

  const years = ["All", ...Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString())];

  const submit = async () => {
    const fullName = [firstName, middleName, surname].filter(Boolean).join(" ").trim();
    if (!fullName || !gender || !addictionType || !dateOfRecovery) {
      toast.error("Please fill all required fields"); return;
    }
    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const payload = { fullName, gender, age: age ? parseInt(age) : undefined, maritalStatus, addictionType, dateOfRecovery, phone, unitId };
      if (editing) {
        await axios.put(`${BASE_URl}/api/recovered/${editing._id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
        toast.success("Record updated");
      } else {
        await axios.post(`${BASE_URl}/api/recovered`, payload, { headers: { Authorization: `Bearer ${token}` } });
        toast.success("Record added");
      }
      setShowForm(false); resetForm(); fetchAddicts();
    } catch (e: any) { toast.error("Process failed"); }
    finally { setSubmitting(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      const token = await AsyncStorage.getItem("token");
      await axios.delete(`${BASE_URl}/api/recovered/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Record deleted"); fetchAddicts();
    } catch { toast.error("Delete failed"); }
  };

  const resetForm = () => {
    setEditing(null); setFirstName(""); setMiddleName(""); setSurname("");
    setGender(""); setAge(""); setMaritalStatus(""); setAddictionType("");
    setDateOfRecovery(new Date().toISOString().slice(0, 10)); setPhone("");
  };

  const openEdit = (doc: RecoveredDoc) => {
    setEditing(doc);
    const parts = (doc.fullName || "").split(" ");
    setFirstName(parts[0] || "");
    setMiddleName(parts.length > 2 ? parts.slice(1, -1).join(" ") : "");
    setSurname(parts.length > 1 ? parts[parts.length - 1] : "");
    setGender(doc.gender); setAge(doc.age ? String(doc.age) : "");
    setMaritalStatus(doc.maritalStatus || ""); setAddictionType(doc.addictionType);
    setDateOfRecovery(doc.dateOfRecovery.slice(0, 10)); setPhone(doc.phone || "");
    setShowForm(true);
  };

  const ModalPicker = ({ open, onClose, options, onSelect, value, title }: any) => (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={e => e.stopPropagation()} className="relative bg-white dark:bg-[#1e1e1e] w-full sm:max-w-xs rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[60vh] overflow-y-auto">
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">{title}</p>
            {options.map((o: string) => (
              <button key={o} onClick={() => { onSelect(o); onClose(); }} className="w-full flex items-center justify-between py-4 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 px-2">
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
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0f1113] pb-32">
      <div className="bg-[#00204a] pt-12 sm:pt-16 pb-32 sm:pb-24 px-6 sm:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-20 opacity-10 pointer-events-none">
          <Sparkles size={300} className="text-[#349DC5] rotate-12" />
        </div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 sm:gap-8 relative z-10">
          <div className="flex items-start sm:items-center gap-4 sm:gap-6">
            <button onClick={() => navigate(-1)} className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-2xl bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-95 mt-1 sm:mt-0">
              <ArrowLeft size={28} />
            </button>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight leading-[1.1] sm:leading-none">Recovered Addicts</h1>
              <div className="flex items-center gap-3 mt-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#349DC5] animate-pulse" />
                <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Official Transformation Registry</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => fetchAddicts(true)} className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center border border-white/10 hover:bg-white/20 transition-all active:scale-95">
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
            <Sparkles size={100} className="text-[#349DC5]" />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] mb-3">Total Recovered</p>
            <h2 className="text-6xl font-black text-[#00204a] dark:text-white leading-none tracking-tighter tabular-nums">
              {filteredAddicts.length}
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or addiction category..." className="w-full h-20 pl-16 pr-8 bg-white dark:bg-[#1a1c1e] rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 font-bold text-lg outline-none focus:border-[#349DC5]/20 transition-all placeholder:text-gray-200" />
        </div>

        <div className="space-y-6">
          {loading ? (
            <div className="flex flex-col items-center py-24 gap-6 text-center">
              <div className="w-12 h-12 rounded-full border-4 border-[#349DC5] border-t-transparent animate-spin" />
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] animate-pulse">Syncing Cloud Database...</p>
            </div>
          ) : filteredAddicts.length === 0 ? (
            <div className="flex flex-col items-center py-32 gap-6 text-center bg-white dark:bg-[#1a1c1e] rounded-[48px] border-2 border-dashed border-gray-100 dark:border-white/5">
              <div className="w-24 h-24 rounded-[40px] bg-emerald-50 dark:bg-emerald-900/10 flex items-center justify-center text-6xl shadow-inner animate-pulse mx-auto opacity-50">♻️</div>
              <div>
                <p className="text-sm font-black text-[#00204a] dark:text-white uppercase tracking-widest mb-2">No Records Detected</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-loose">The transformation registry is currently empty.<br/>Log your first recovery story today.</p>
              </div>
            </div>
          ) : (
            filteredAddicts.map(item => (
              <motion.div key={item._id} layout className="bg-white dark:bg-[#1a1c1e] p-8 rounded-[40px] shadow-sm border border-gray-100 dark:border-white/5 hover:border-[#349DC5]/10 transition-all group relative overflow-hidden">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-500 rounded-[28px] flex items-center justify-center text-4xl font-black shadow-inner">
                      {(item.fullName || "?")[0]}
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-[#00204a] dark:text-white uppercase tracking-tight leading-none mb-2">{item.fullName}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-md">
                          {item.addictionType} Recovery
                        </span>
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#349DC5] bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-md uppercase">
                          {item.gender}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => openEdit(item)} className="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 hover:text-[#349DC5] hover:bg-white transition-all"><Edit3 size={18} /></button>
                    <button onClick={() => remove(item._id)} className="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 hover:text-rose-500 hover:bg-white transition-all"><Trash2 size={18} /></button>
                  </div>
                </div>
                <div className="space-y-4">
                  <DetailRow label="Date of Recovery" value={new Date(item.dateOfRecovery).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} />
                  <DetailRow label="Addiction Profile" value={item.addictionType} />
                  <DetailRow label="Gender" value={item.gender} />
                  <DetailRow label="Age Bracket" value={item.age ? `${item.age} years` : "—"} />
                  <DetailRow label="Marital Status" value={item.maritalStatus || "—"} />
                  <DetailRow label="Digital Contact" value={item.phone || "—"} />
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      <ModalPicker open={showFormGenderPicker} onClose={() => setShowFormGenderPicker(false)} options={GENDER_OPTIONS} onSelect={setGender} value={gender} title="Select Gender" />
      <ModalPicker open={showFormMaritalPicker} onClose={() => setShowFormMaritalPicker(false)} options={MARITAL_OPTIONS} onSelect={setMaritalStatus} value={maritalStatus} title="Marital Status" />
      <ModalPicker open={showFormAddictionPicker} onClose={() => setShowFormAddictionPicker(false)} options={ADDICTION_TYPES} onSelect={setAddictionType} value={addictionType} title="Addiction Type" />

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowForm(false)} className="absolute inset-0 bg-[#00204a]/80 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-lg bg-white dark:bg-[#1a1c1e] rounded-[50px] p-12 shadow-2xl overflow-y-auto max-h-[92vh]">
               <h3 className="text-3xl font-black text-[#00204a] dark:text-white uppercase mb-10">{editing ? "Update Record" : "New Testimony"}</h3>
               <div className="space-y-6">
                  {/* Form fields... */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="sm:col-span-2">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">First Name</label>
                        <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Full Name" className="w-full h-16 px-6 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none outline-none font-bold text-lg focus:ring-2 ring-blue-500/20" />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">Surname</label>
                        <input value={surname} onChange={e => setSurname(e.target.value)} placeholder="Last Name" className="w-full h-16 px-6 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none outline-none font-bold text-lg focus:ring-2 ring-blue-500/20" />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">Age</label>
                        <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="Years" className="w-full h-16 px-6 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none outline-none font-bold text-lg focus:ring-2 ring-blue-500/20" />
                     </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">Gender</label>
                    <button onClick={() => setShowFormGenderPicker(true)} className="w-full h-16 flex items-center justify-between px-6 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                      <span className={`text-lg font-bold ${gender ? "text-[#00204a] dark:text-white" : "text-gray-300"}`}>{gender || "Select orientation"}</span>
                      <ChevronDown size={18} className="text-gray-400" />
                    </button>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">Addiction Type</label>
                    <button onClick={() => setShowFormAddictionPicker(true)} className="w-full h-16 flex items-center justify-between px-6 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                      <span className={`text-lg font-bold ${addictionType ? "text-[#00204a] dark:text-white" : "text-gray-300"}`}>{addictionType || "Select category"}</span>
                      <ChevronDown size={18} className="text-gray-400" />
                    </button>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">Recovery Date</label>
                    <input type="date" value={dateOfRecovery} onChange={e => setDateOfRecovery(e.target.value)} className="w-full h-16 px-6 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none outline-none font-bold text-lg focus:ring-2 ring-blue-500/20 uppercase" />
                  </div>
                  <div className="flex gap-4 pt-6">
                    <button onClick={() => { setShowForm(false); resetForm(); }} className="flex-1 h-16 rounded-2xl border-2 border-gray-100 dark:border-white/5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Cancel</button>
                    <button onClick={submit} disabled={submitting} className="flex-[2] h-16 bg-[#349DC5] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-cyan-500/20 disabled:opacity-50 flex items-center justify-center gap-3">
                      {submitting && <RefreshCw size={18} className="animate-spin" />}
                      Save Entry
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

function Check({ size, className }: any) {
    return <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></motion.svg>;
}
