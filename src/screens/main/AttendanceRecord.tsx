import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, Trash2, X, ChevronDown, Check,
  Users, Calendar, Send, Edit3, Eye, AlertCircle
} from "lucide-react";
import {
  getMainChurchAttendances,
  submitMainChurchAttendance,
  updateMainChurchAttendance,
  deleteMainChurchAttendance,
  getYSAttendances,
  submitYSAttendance,
  updateYSAttendance,
  deleteYSAttendance,
  type AddAttendanceMainChurch,
  type AddAttendanceYS,
} from "../../api/attendance";
import toast from "react-hot-toast";

const SERVICE_TYPES_MAIN = ["Sunday First Service", "Sunday Second Service", "Midweek Service", "Special Service", "Prayer Meeting", "Outreach"];
const SERVICE_TYPES_YS = ["Youth Service", "Singles Meeting", "Combined Youth & Singles", "Campus Fellowship", "Special Youth Event"];

const formatDate = (iso?: string) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

type AttendanceView = "list" | "add" | "edit";
type AttendanceType = "main" | "ys";

type Record = AddAttendanceMainChurch & AddAttendanceYS;

export default function AttendanceScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const typeParam = (params.get("type") || "main") as AttendanceType;

  const [attendanceType, setAttendanceType] = useState<AttendanceType>(typeParam);
  const [view, setView] = useState<AttendanceView>("list");
  const [records, setRecords] = useState<Record[]>([]);
  const [editing, setEditing] = useState<Record | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showServicePicker, setShowServicePicker] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [serviceType, setServiceType] = useState("");
  const [maleCount, setMaleCount] = useState("");
  const [femaleCount, setFemaleCount] = useState("");

  const serviceTypes = attendanceType === "main" ? SERVICE_TYPES_MAIN : SERVICE_TYPES_YS;
  const total = useMemo(() => (parseInt(maleCount) || 0) + (parseInt(femaleCount) || 0), [maleCount, femaleCount]);
  const grandTotal = useMemo(() => records.reduce((s, r) => s + (r.total || 0), 0), [records]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = attendanceType === "main" ? await getMainChurchAttendances() : await getYSAttendances();
      setRecords(Array.isArray(data) ? data : []);
    } catch (e: any) { toast.error("Failed to load attendance records"); }
    finally { setLoading(false); }
  }, [attendanceType]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setDate(new Date().toISOString().slice(0, 10));
    setServiceType(""); setMaleCount(""); setFemaleCount(""); setEditing(null);
  };

  const openAdd = () => { resetForm(); setView("add"); };
  const openEdit = (rec: Record) => {
    setEditing(rec);
    setDate((rec.date || "").slice(0, 10));
    setServiceType(rec.serviceType || "");
    setMaleCount(String(rec.maleCount || 0));
    setFemaleCount(String(rec.femaleCount || 0));
    setView("edit");
  };

  const handleSubmit = async () => {
    if (!date || !serviceType) { toast.error("Please fill in all required fields"); return; }
    if (!maleCount && !femaleCount) { toast.error("Please enter at least one count"); return; }
    const payload = {
      date,
      serviceType,
      maleCount: parseInt(maleCount) || 0,
      femaleCount: parseInt(femaleCount) || 0,
      total,
    };
    setSubmitting(true);
    try {
      if (view === "edit" && editing?._id) {
        if (attendanceType === "main") await updateMainChurchAttendance(editing._id, payload);
        else await updateYSAttendance(editing._id, payload);
        toast.success("Record updated");
      } else {
        if (attendanceType === "main") await submitMainChurchAttendance(payload);
        else await submitYSAttendance(payload);
        toast.success("Attendance recorded");
      }
      setView("list"); resetForm(); load();
    } catch (e: any) { toast.error(e.response?.data?.message || e.message || "Failed"); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (rec: Record) => {
    if (!rec._id || !confirm("Delete this attendance record?")) return;
    try {
      if (attendanceType === "main") await deleteMainChurchAttendance(rec._id);
      else await deleteYSAttendance(rec._id);
      toast.success("Record deleted"); load();
    } catch { toast.error("Failed to delete"); }
  };

  // -------- List view --------
  if (view === "list") return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#111] pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-[#1a1a1a] border-b border-gray-100 dark:border-white/5 px-4 pt-10 pb-4 sticky top-0 z-20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-500">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-black text-[#00204a] dark:text-white uppercase tracking-tight">Attendance Records</h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{records.length} entries · {grandTotal.toLocaleString()} total attendees</p>
            </div>
          </div>
          <button onClick={openAdd} className="px-4 py-2 bg-[#349DC5] text-white rounded-2xl text-xs font-black uppercase flex items-center gap-1.5">
            <Plus size={15} /> Add New
          </button>
        </div>

        {/* Type toggle */}
        <div className="flex bg-gray-50 dark:bg-white/5 rounded-2xl p-1 border border-gray-100 dark:border-white/5">
          {(["main", "ys"] as AttendanceType[]).map(t => (
            <button
              key={t}
              onClick={() => { setAttendanceType(t); }}
              className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${attendanceType === t ? "bg-white dark:bg-[#2a2a2a] text-[#349DC5] shadow-sm" : "text-gray-400"}`}
            >
              {t === "main" ? "Main Church" : "Youth & Singles"}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            { label: "Total Sessions", value: records.length },
            { label: "Total Male", value: records.reduce((s, r) => s + (r.maleCount || 0), 0).toLocaleString() },
            { label: "Total Female", value: records.reduce((s, r) => s + (r.femaleCount || 0), 0).toLocaleString() },
          ].map(stat => (
            <div key={stat.label} className="bg-gray-50 dark:bg-white/5 rounded-2xl p-3 border border-gray-100 dark:border-white/5 text-center">
              <p className="text-lg font-black text-[#349DC5]">{stat.value}</p>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-tight">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center py-16 gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-[#349DC5] border-t-transparent animate-spin" />
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Loading Records...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-4 text-center">
            <div className="w-20 h-20 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center">
              <Users size={32} className="text-gray-300" />
            </div>
            <p className="text-sm font-black text-gray-400 uppercase tracking-widest">No Attendance Records</p>
            <button onClick={openAdd} className="px-6 py-3 bg-[#349DC5] text-white rounded-2xl font-black text-xs uppercase tracking-wider">
              Record Attendance
            </button>
          </div>
        ) : (
          records.map(rec => {
            const isExpanded = expandedId === rec._id;
            return (
              <motion.div key={rec._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-[#1e1e1e] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
                <button onClick={() => setExpandedId(isExpanded ? null : (rec._id || null))} className="w-full flex items-center justify-between p-4 text-left">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#349DC5]/10 flex items-center justify-center shrink-0">
                      <Calendar size={18} className="text-[#349DC5]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-[#00204a] dark:text-white">{rec.serviceType}</p>
                      <p className="text-xs text-gray-400 font-bold">{formatDate(rec.date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-lg font-black text-[#349DC5]">{(rec.total || 0).toLocaleString()}</p>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total</p>
                    </div>
                    <ChevronDown size={16} className={`text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </div>
                </button>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-4 pb-4 pt-0 border-t border-gray-50 dark:border-white/5">
                        <div className="grid grid-cols-2 gap-2 mb-3 mt-3">
                          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
                            <p className="text-lg font-black text-blue-600">{(rec.maleCount || 0).toLocaleString()}</p>
                            <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Male</p>
                          </div>
                          <div className="bg-pink-50 dark:bg-pink-900/20 rounded-xl p-3 text-center">
                            <p className="text-lg font-black text-pink-500">{(rec.femaleCount || 0).toLocaleString()}</p>
                            <p className="text-[9px] font-black text-pink-400 uppercase tracking-widest">Female</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(rec)} className="flex-1 py-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center gap-2 text-xs font-black text-[#349DC5]">
                            <Edit3 size={13} /> Edit
                          </button>
                          <button onClick={() => handleDelete(rec)} className="flex-1 py-2.5 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center gap-2 text-xs font-black text-red-400">
                            <Trash2 size={13} /> Delete Record
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );

  // -------- Add / Edit form --------
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#111] pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-[#1a1a1a] border-b border-gray-100 dark:border-white/5 px-4 pt-10 pb-4 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={() => { setView("list"); resetForm(); }} className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-500">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-black text-[#00204a] dark:text-white uppercase tracking-tight">
              {view === "edit" ? "Edit Attendance" : `Record Attendance`}
            </h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {attendanceType === "main" ? "Main Church" : "Youth & Singles"}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-6 space-y-4">
        {/* Service Type */}
        <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-4 border border-gray-100 dark:border-white/5 shadow-sm">
          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Service Type *</label>
          <button onClick={() => setShowServicePicker(true)} className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10">
            <span className={`text-sm font-bold ${serviceType ? "text-[#00204a] dark:text-white" : "text-gray-300"}`}>{serviceType || "Select service type"}</span>
            <ChevronDown size={16} className="text-gray-400" />
          </button>
        </div>

        {/* Date */}
        <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-4 border border-gray-100 dark:border-white/5 shadow-sm">
          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Date of Service *</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10 text-sm font-bold text-[#00204a] dark:text-white outline-none" />
        </div>

        {/* Counts */}
        <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-4 border border-gray-100 dark:border-white/5 shadow-sm">
          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Attendance Count</label>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <p className="text-xs font-black text-blue-400 uppercase tracking-widest mb-2">Male Count</p>
              <input
                type="number"
                min={0}
                value={maleCount}
                onChange={e => setMaleCount(e.target.value)}
                placeholder="0"
                className="w-full px-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30 text-xl font-black text-blue-600 outline-none text-center"
              />
            </div>
            <div>
              <p className="text-xs font-black text-pink-400 uppercase tracking-widest mb-2">Female Count</p>
              <input
                type="number"
                min={0}
                value={femaleCount}
                onChange={e => setFemaleCount(e.target.value)}
                placeholder="0"
                className="w-full px-4 py-3 bg-pink-50 dark:bg-pink-900/20 rounded-xl border border-pink-100 dark:border-pink-900/30 text-xl font-black text-pink-500 outline-none text-center"
              />
            </div>
          </div>
          {/* Total */}
          <div className="bg-[#349DC5]/10 rounded-xl p-4 text-center">
            <p className="text-[10px] font-black text-[#349DC5]/60 uppercase tracking-widest">Total Attendance</p>
            <p className="text-4xl font-black text-[#349DC5]">{total.toLocaleString()}</p>
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting || !serviceType || !date}
          className="w-full py-4 bg-[#349DC5] text-white rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {view === "edit" ? "Update Record" : "Save and Submit"}
        </button>
      </div>

      {/* Service type picker */}
      <AnimatePresence>
        {showServicePicker && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowServicePicker(false)}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} onClick={e => e.stopPropagation()} className="relative bg-white dark:bg-[#1e1e1e] w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-black text-[#00204a] dark:text-white uppercase tracking-widest">Service Type</p>
                <button onClick={() => setShowServicePicker(false)}><X size={18} className="text-gray-400" /></button>
              </div>
              {serviceTypes.map(st => (
                <button key={st} onClick={() => { setServiceType(st); setShowServicePicker(false); }} className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <span className="text-sm font-bold text-[#00204a] dark:text-white">{st}</span>
                  {serviceType === st && <Check size={15} className="text-[#349DC5]" />}
                </button>
              ))}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
