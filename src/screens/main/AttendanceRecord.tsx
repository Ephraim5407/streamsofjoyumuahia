import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, Trash2, X, ChevronDown, Check,
  Users, Calendar, Send, Edit3, Eye, AlertCircle, TrendingUp, TrendingDown, Award, Star, Info
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Text as RechartsText
} from 'recharts';
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
import AsyncStorage from "../../utils/AsyncStorage";

const SERVICE_TYPES_MAIN = ["1st Service", "2nd Service", "Wordshop Service", "Special Event"];
const SERVICE_TYPES_YS = ["Y&S Sunday Service", "Special program"];

const formatDate = (iso?: string) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

type AttendanceView = "list" | "add" | "edit" | "overview";
type AttendanceType = "main" | "ys";

type Record = AddAttendanceMainChurch & AddAttendanceYS;

const CATEGORIES_MAIN = [
  { 
    name: "Sunday Services", 
    services: ["1st Service", "2nd Service"],
    filter: (type: string) => type === '1st Service' || type === '2nd Service'
  },
  { 
    name: "Wordshop", 
    services: ["Wordshop Service"],
    filter: (type: string) => type === 'Wordshop Service'
  },
  { 
    name: "Special Events", 
    services: [],
    filter: (type: string) => type !== '1st Service' && type !== '2nd Service' && type !== 'Wordshop Service'
  },
];

const CATEGORIES_YS = [
  { 
    name: "Y&S Sunday Service", 
    services: ["Y&S Sunday Service"],
    filter: (type: string) => type === 'Y&S Sunday Service'
  },
  { 
    name: "Special program", 
    services: [],
    filter: (type: string) => type !== 'Y&S Sunday Service'
  },
];

export default function AttendanceScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const typeParam = (params.get("type") || "main") as AttendanceType;

  const [attendanceType, setAttendanceType] = useState<AttendanceType>(typeParam);
  const [view, setView] = useState<AttendanceView>("overview");
  const [records, setRecords] = useState<Record[]>([]);
  const [editing, setEditing] = useState<Record | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showServicePicker, setShowServicePicker] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showOverviewModal, setShowOverviewModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [customEvents, setCustomEvents] = useState<string[]>([]);
  const [customEventName, setCustomEventName] = useState("");
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userRaw = await AsyncStorage.getItem("user");
        if (userRaw) setProfile(JSON.parse(userRaw));
      } catch (e) {
        console.error("Failed to load user profile", e);
      }
    };
    fetchUser();
  }, []);

  const canEdit = useMemo(() => {
    if (!profile) return false;
    const role = profile.activeRole || profile.role;
    return role === "SuperAdmin" || role === "MinistryAdmin";
  }, [profile]);

  // Form state
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [serviceType, setServiceType] = useState("");
  const [maleCount, setMaleCount] = useState("");
  const [femaleCount, setFemaleCount] = useState("");

  const serviceTypes = useMemo(() => {
    const defaults = attendanceType === "main" ? SERVICE_TYPES_MAIN : SERVICE_TYPES_YS;
    return [...defaults, ...customEvents];
  }, [attendanceType, customEvents]);

  const total = useMemo(() => (parseInt(maleCount) || 0) + (parseInt(femaleCount) || 0), [maleCount, femaleCount]);
  const grandTotal = useMemo(() => records.reduce((s, r) => s + (r.total || 0), 0), [records]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = attendanceType === "main" ? await getMainChurchAttendances() : await getYSAttendances();
      const sortedRecords = Array.isArray(data) ? data : [];
      setRecords(sortedRecords);
      if (sortedRecords.length > 0 && !selectedDate) {
        setSelectedDate(sortedRecords[0].date.slice(0, 10));
      }
    } catch (e: any) { toast.error("Failed to load attendance records"); }
    finally { setLoading(false); }
  }, [attendanceType, selectedDate]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const defaultServices = attendanceType === "main" ? ["1st Service", "2nd Service", "Wordshop Service", "Special Event"] : ["Y&S Sunday Service", "Special program"];
    const extracted = Array.from(new Set(records.filter(r => !defaultServices.includes(r.serviceType)).map(r => r.serviceType)));
    setCustomEvents(extracted);
  }, [records, attendanceType]);

  const yearRecords = useMemo(() => records.filter(r => new Date(r.date).getFullYear() === selectedYear), [records, selectedYear]);

  const analytics = useMemo(() => {
    if (yearRecords.length === 0) return null;
    
    const categories = attendanceType === "main" ? CATEGORIES_MAIN : CATEGORIES_YS;
    const catStats = categories.map(cat => {
      const filtered = yearRecords.filter(r => cat.filter(r.serviceType));
      const total = filtered.reduce((s, r) => s + (r.total || 0), 0);
      const avg = filtered.length > 0 ? Math.round(total / filtered.length) : 0;
      return { name: cat.name, avg, total, count: filtered.length };
    });

    const typeAvgs: { [key: string]: { total: number, count: number } } = {};
    yearRecords.forEach(r => {
      if (!typeAvgs[r.serviceType]) typeAvgs[r.serviceType] = { total: 0, count: 0 };
      typeAvgs[r.serviceType].total += (r.total || 0);
      typeAvgs[r.serviceType].count++;
    });

    const sortedTypes = Object.entries(typeAvgs)
      .map(([name, stat]) => ({ name, avg: Math.round(stat.total / stat.count) }))
      .sort((a, b) => b.avg - a.avg);

    const highest = yearRecords.reduce((prev, current) => (prev.total > current.total) ? prev : current);
    const lowest = yearRecords.reduce((prev, current) => (prev.total < current.total) ? prev : current);

    return { catStats, sortedTypes, highest, lowest };
  }, [yearRecords, attendanceType]);

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
    const finalServiceType = serviceType === "NEW_SPECIAL_EVENT" ? customEventName.trim() : serviceType;
    if (serviceType === "NEW_SPECIAL_EVENT" && !customEventName.trim()) {
       toast.error("Please enter a custom event name");
       return;
    }
    const finalPayload = { ...payload, serviceType: finalServiceType };
    setSubmitting(true);
    try {
      if (view === "edit" && editing?._id) {
        if (attendanceType === "main") await updateMainChurchAttendance(editing._id, finalPayload);
        else await updateYSAttendance(editing._id, finalPayload);
        toast.success("Record updated");
      } else {
        if (attendanceType === "main") await submitMainChurchAttendance(finalPayload);
        else await submitYSAttendance(finalPayload);
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
  };  // -------- Views --------
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#111] pb-24">
      {view === "overview" || view === "list" ? (
        <>
          {/* Header */}
          <div className="bg-white dark:bg-[#1a1a1a] border-b border-gray-100 dark:border-white/5 px-4 pt-10 pb-4 sticky top-0 z-20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-500">
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h1 className="text-lg font-black text-[#00204a] dark:text-white uppercase tracking-tight leading-tight">Attendance Records</h1>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{records.length} entries · {grandTotal.toLocaleString()} total attendees</p>
                </div>
              </div>
              {canEdit && (
                <button onClick={openAdd} className="px-4 py-2 bg-[#349DC5] text-white rounded-2xl text-xs font-black uppercase flex items-center gap-1.5 shadow-lg shadow-[#349DC5]/20">
                  <Plus size={15} /> Add New
                </button>
              )}
            </div>

            {/* Type toggle */}
            <div className="flex bg-gray-50 dark:bg-white/5 rounded-2xl p-1 border border-gray-100 dark:border-white/5 mb-3">
              {(["main", "ys"] as AttendanceType[]).map(t => (
                <button
                  key={t}
                  onClick={() => { setAttendanceType(t); setView("overview"); }}
                  className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${attendanceType === t ? "bg-white dark:bg-[#2a2a2a] text-[#349DC5] shadow-sm" : "text-gray-400"}`}
                >
                  {t === "main" ? "Main Church" : "Youth & Singles"}
                </button>
              ))}
            </div>

            {/* View toggle */}
            <div className="flex gap-2 p-1 bg-gray-100 dark:bg-white/5 rounded-2xl">
              <button onClick={() => setView("overview")} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === "overview" ? "bg-[#349DC5] text-white" : "text-gray-400 hover:text-gray-600"}`}>Overview</button>
              <button onClick={() => setView("list")} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === "list" ? "bg-[#349DC5] text-white" : "text-gray-400 hover:text-gray-600"}`}>Detailed List</button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              {[
                { label: "Sessions", value: records.length },
                { label: "Total Male", value: records.reduce((s, r) => s + (r.maleCount || 0), 0).toLocaleString() },
                { label: "Total Female", value: records.reduce((s, r) => s + (r.femaleCount || 0), 0).toLocaleString() },
              ].map(stat => (
                <div key={stat.label} className="bg-gray-50 dark:bg-white/5 rounded-2xl p-3 border border-gray-100 dark:border-white/5 text-center">
                  <p className="text-lg font-black text-[#349DC5] leading-none mb-1">{stat.value}</p>
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-tight">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="px-4 pt-4 pb-20">
            {view === "overview" ? (
              <div className="space-y-6">
                {/* Year Selector & Quick Highlights */}
                <div className="bg-white dark:bg-[#1a1a1a] p-5 rounded-[2.5rem] border border-gray-100 dark:border-white/5 shadow-sm">
                  <div className="flex items-center justify-between mb-4 px-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Yearly Intelligence</label>
                    <select 
                      value={selectedYear}
                      onChange={e => setSelectedYear(parseInt(e.target.value))}
                      className="bg-gray-50 dark:bg-white/5 border-none text-[10px] font-black text-[#349DC5] uppercase tracking-widest outline-none px-3 py-1 rounded-full cursor-pointer"
                    >
                      {[...new Set(records.map(r => new Date(r.date).getFullYear()))].sort((a,b) => b-a).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  
                  {analytics && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-3xl border border-blue-100/50 dark:border-blue-900/20">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp size={14} className="text-blue-500" />
                          <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Highest Session</span>
                        </div>
                        <p className="text-lg font-black text-blue-600 leading-none">{(analytics.highest.total || 0).toLocaleString()}</p>
                        <p className="text-[7px] font-bold text-blue-400 uppercase mt-1 truncate">{analytics.highest.serviceType}</p>
                      </div>
                      <div className="bg-rose-50/50 dark:bg-rose-900/10 p-4 rounded-3xl border border-rose-100/50 dark:border-rose-900/20">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingDown size={14} className="text-rose-500" />
                          <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest">Lowest Session</span>
                        </div>
                        <p className="text-lg font-black text-rose-600 leading-none">{(analytics.lowest.total || 0).toLocaleString()}</p>
                        <p className="text-[7px] font-bold text-rose-400 uppercase mt-1 truncate">{analytics.lowest.serviceType}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chart Section */}
                <div className="bg-white dark:bg-[#1a1a1a] p-5 rounded-[2.5rem] border border-gray-100 dark:border-white/5 shadow-sm">
                  <div className="flex items-center justify-between mb-6 px-1">
                    <div>
                      <h3 className="text-sm font-black text-[#00204a] dark:text-white uppercase tracking-tight">Average Attendance</h3>
                      <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Per Service Category ({selectedYear})</p>
                    </div>
                    <Award size={20} className="text-[#349DC5] opacity-20" />
                  </div>

                  <div className="h-[280px] w-full">
                    {analytics ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.catStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }}
                            interval={0}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }}
                          />
                          <Tooltip 
                            cursor={{ fill: 'rgba(52, 157, 197, 0.05)' }}
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-white dark:bg-[#2a2a2a] p-3 rounded-2xl shadow-xl border border-gray-100 dark:border-white/10">
                                    <p className="text-[9px] font-black text-[#349DC5] uppercase tracking-widest mb-1">{payload[0].payload.name}</p>
                                    <p className="text-lg font-black text-[#00204a] dark:text-white leading-none">{payload[0].value?.toLocaleString()}</p>
                                    <p className="text-[7px] font-bold text-gray-400 uppercase mt-1">Average Attendees</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar 
                            dataKey="avg" 
                            radius={[8, 8, 0, 0]} 
                            barSize={32}
                            onClick={(data) => {
                              if (data && data.name) {
                                setSelectedCategory(data.name);
                                setShowOverviewModal(true);
                              }
                            }}
                          >
                            {analytics.catStats.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={['#349DC5', '#BA68C8', '#3949AB', '#4FC3F7'][index % 4]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center p-10">
                        <Info size={32} className="text-gray-200 mb-2" />
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Insufficient data for {selectedYear}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-50 dark:border-white/5 flex items-center justify-center gap-4">
                    {analytics?.catStats.map((cat, i) => (
                      <div key={cat.name} className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ['#349DC5', '#BA68C8', '#3949AB', '#4FC3F7'][i % 4] }} />
                        <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest">{cat.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Service Breakdown */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Service Performance</h2>
                    <span className="text-[8px] font-bold text-[#349DC5] uppercase tracking-widest">TAP CARDS FOR DETAILS</span>
                  </div>
                  
                  {analytics?.sortedTypes.map(type => (
                    <motion.button 
                      key={type.name} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => {
                        const categories = attendanceType === 'main' ? CATEGORIES_MAIN : CATEGORIES_YS;
                        const cat = categories.find(c => c.filter(type.name));
                        setSelectedCategory(cat?.name || type.name);
                        setShowOverviewModal(true);
                      }}
                      className="w-full bg-white dark:bg-[#1a1a1a] p-4 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm flex items-center justify-between group hover:border-[#349DC5]/30 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#349DC5]/5 flex items-center justify-center text-[#349DC5] group-hover:bg-[#349DC5]/10">
                          <Star size={20} className={type.avg > 100 ? "fill-[#349DC5]" : ""} />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-black text-[#00204a] dark:text-white uppercase tracking-tight">{type.name}</p>
                          <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest mt-0.5">Average Performance</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xl font-black text-[#349DC5] leading-none mb-1">{type.avg.toLocaleString()}</p>
                          <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Typical</p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center group-hover:bg-[#349DC5] group-hover:text-white transition-colors">
                          <ChevronDown size={16} className="-rotate-90" />
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3 pb-10">
                {loading ? (
                  <div className="flex flex-col items-center py-16 gap-4">
                    <div className="w-10 h-10 border-4 border-[#349DC5] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : records.length === 0 ? (
                  <div className="flex flex-col items-center py-20 gap-4 text-center">
                    <div className="w-20 h-20 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center">
                      <Users size={32} className="text-gray-300" />
                    </div>
                    <p className="text-sm font-black text-gray-400 uppercase tracking-widest">No Attendance Records</p>
                  </div>
                ) : (
                  records.map(rec => {
                    const isExpanded = expandedId === rec._id;
                    return (
                      <motion.div key={rec._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-[#1a1a1a] rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
                        <button onClick={() => setExpandedId(isExpanded ? null : (rec._id || null))} className="w-full flex items-center justify-between p-4 text-left">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-2xl bg-[#349DC5]/10 flex items-center justify-center shrink-0">
                              <Calendar size={18} className="text-[#349DC5]" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-black text-[#00204a] dark:text-white uppercase tracking-tight leading-tight mb-0.5">{rec.serviceType}</p>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{formatDate(rec.date)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <p className="text-lg font-black text-[#349DC5] leading-none mb-1">{(rec.total || 0).toLocaleString()}</p>
                              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-tight">Total</p>
                            </div>
                            <ChevronDown size={16} className={`text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                          </div>
                        </button>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="px-4 pb-4 pt-0 border-t border-gray-50 dark:border-white/5">
                                <div className="grid grid-cols-2 gap-2 mb-3 mt-3">
                                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-3 text-center">
                                    <p className="text-lg font-black text-blue-600">{(rec.maleCount || 0).toLocaleString()}</p>
                                    <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Male</p>
                                  </div>
                                  <div className="bg-pink-50 dark:bg-pink-900/20 rounded-2xl p-3 text-center">
                                    <p className="text-lg font-black text-pink-500">{(rec.femaleCount || 0).toLocaleString()}</p>
                                    <p className="text-[9px] font-black text-pink-400 uppercase tracking-widest">Female</p>
                                  </div>
                                </div>
                                  {canEdit && (
                                    <div className="flex gap-2">
                                      <button onClick={() => openEdit(rec)} className="flex-1 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black text-[#349DC5] uppercase tracking-widest">
                                        <Edit3 size={12} /> Edit
                                      </button>
                                      <button onClick={() => handleDelete(rec)} className="flex-1 py-3 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black text-red-400 uppercase tracking-widest">
                                        <Trash2 size={12} /> Delete
                                      </button>
                                    </div>
                                  )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Overview Detailed Modal */}
          <AnimatePresence>
            {showOverviewModal && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowOverviewModal(false)}>
                <motion.div 
                   initial={{ scale: 0.95, opacity: 0 }} 
                   animate={{ scale: 1, opacity: 1 }} 
                   exit={{ scale: 0.95, opacity: 0 }}
                   onClick={e => e.stopPropagation()}
                   className="bg-gray-50 dark:bg-[#111] w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
                >
                   <div className="bg-white dark:bg-[#1a1a1a] p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between shrink-0">
                     <div>
                       <p className="text-[10px] font-black text-[#349DC5] uppercase tracking-[0.3em] mb-1">Service Intelligence</p>
                       <h2 className="text-2xl font-black text-[#00204a] dark:text-white uppercase tracking-tight leading-none">{selectedCategory}</h2>
                     </div>
                     <button onClick={() => setShowOverviewModal(false)} className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors">
                       <X size={24} />
                     </button>
                   </div>

                   <div className="flex-1 overflow-y-auto p-6 space-y-4 pt-4 custom-scrollbar">
                     {(() => {
                       const categories = (attendanceType === 'main' ? CATEGORIES_MAIN : CATEGORIES_YS);
                       const cat = categories.find(c => c.name === selectedCategory);
                       
                       // Find all unique service types that belong to this category
                       const relevantServices = Array.from(new Set(
                         yearRecords
                           .filter(r => cat ? cat.filter(r.serviceType) : r.serviceType === selectedCategory)
                           .map(r => r.serviceType)
                       ));

                       if (relevantServices.length === 0) {
                          return (
                            <div className="py-20 text-center">
                               <p className="text-sm font-black text-gray-400 uppercase tracking-widest">No detailed data found</p>
                            </div>
                          );
                       }
                       
                       return (
                         <>
                           {relevantServices.map(serviceName => {
                             const serviceRecords = yearRecords.filter(r => r.serviceType === serviceName);
                             const male = serviceRecords.reduce((s, r) => s + (r.maleCount || 0), 0);
                             const female = serviceRecords.reduce((s, r) => s + (r.femaleCount || 0), 0);
                             const totalCount = male + female;
                             const avg = serviceRecords.length > 0 ? Math.round(totalCount / serviceRecords.length) : 0;

                             return (
                               <div key={serviceName} className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 border border-gray-100 dark:border-white/5 shadow-sm">
                                 <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-50 dark:border-white/5">
                                   <h3 className="text-sm font-black text-[#00204a] dark:text-white uppercase tracking-tight">{serviceName}</h3>
                                   <div className="bg-[#349DC5]/10 px-3 py-1 rounded-full text-[9px] font-extrabold text-[#349DC5] uppercase tracking-widest">{serviceRecords.length} Records</div>
                                 </div>
                                 <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                                   {[
                                     { label: "Total Male", value: male.toLocaleString() },
                                     { label: "Total Female", value: female.toLocaleString() },
                                     { label: "Volume Total", value: totalCount.toLocaleString(), highlight: true },
                                     { label: "Session Avg", value: avg.toLocaleString(), highlight: true },
                                   ].map(s => (
                                     <div key={s.label}>
                                       <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">{s.label}</p>
                                       <p className={`text-xl font-black ${s.highlight ? "text-[#349DC5]" : "text-[#00204a] dark:text-white"} leading-none`}>{s.value}</p>
                                     </div>
                                   ))}
                                 </div>
                               </div>
                             );
                           })}

                           <div className="bg-[#349DC5] p-8 rounded-[2.5rem] text-white shadow-xl shadow-[#349DC5]/20 mt-4 mb-4 relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-8 opacity-10">
                               <TrendingUp size={120} />
                             </div>
                             <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 opacity-70 relative z-10">Consolidated Performance</p>
                             <div className="grid grid-cols-2 gap-8 relative z-10">
                               <div>
                                 <p className="text-3xl font-black leading-none mb-1">
                                   {yearRecords.filter(r => cat ? cat.filter(r.serviceType) : r.serviceType === selectedCategory).reduce((s, r) => s + (r.maleCount || 0), 0).toLocaleString()}
                                 </p>
                                 <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Cumulative Male</p>
                               </div>
                               <div>
                                 <p className="text-3xl font-black leading-none mb-1">
                                   {yearRecords.filter(r => cat ? cat.filter(r.serviceType) : r.serviceType === selectedCategory).reduce((s, r) => s + (r.femaleCount || 0), 0).toLocaleString()}
                                 </p>
                                 <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Cumulative Female</p>
                               </div>
                             </div>
                             <div className="mt-8 pt-8 border-t border-white/20 relative z-10">
                               <p className="text-5xl font-black leading-none">
                                 {yearRecords.filter(r => cat ? cat.filter(r.serviceType) : r.serviceType === selectedCategory).reduce((s, r) => s + (r.total || 0), 0).toLocaleString()}
                               </p>
                               <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mt-2">Grand Total Attendance Accumulated</p>
                             </div>
                           </div>
                         </>
                       );
                     })()}
                   </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </>
      ) : (
        <>
          {/* Header */}
          <div className="bg-white dark:bg-[#1a1a1a] border-b border-gray-100 dark:border-white/5 px-4 pt-10 pb-4 sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <button onClick={() => { setView("overview"); resetForm(); }} className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-500">
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
            <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 border border-gray-100 dark:border-white/5 shadow-sm">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Service Type *</label>
              <button onClick={() => setShowServicePicker(true)} className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10">
                <span className={`text-sm font-bold ${serviceType ? "text-[#00204a] dark:text-white" : "text-gray-300"}`}>
                  {serviceType === "NEW_SPECIAL_EVENT" ? "Creating Custom Event..." : (serviceType || "Select service type")}
                </span>
                <ChevronDown size={18} className="text-gray-400" />
              </button>
              
              {serviceType === "NEW_SPECIAL_EVENT" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4">
                  <p className="text-[10px] font-black text-[#349DC5] uppercase tracking-widest mb-2">Event Name</p>
                  <input 
                    type="text" 
                    value={customEventName} 
                    onChange={e => setCustomEventName(e.target.value)} 
                    placeholder="Enter event name (e.g. Easter Youth Fest)"
                    className="w-full px-5 py-4 bg-[#349DC5]/5 rounded-2xl border border-[#349DC5]/20 text-sm font-bold text-[#349DC5] outline-none"
                  />
                </motion.div>
              )}
            </div>

            {/* Date */}
            <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 border border-gray-100 dark:border-white/5 shadow-sm">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Date of Service *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 text-sm font-bold text-[#00204a] dark:text-white outline-none" />
            </div>

            {/* Counts */}
            <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 border border-gray-100 dark:border-white/5 shadow-sm">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Attendance Count</label>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Male Count</p>
                  <input
                    type="number"
                    min={0}
                    value={maleCount}
                    onChange={e => setMaleCount(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-900/30 text-2xl font-black text-blue-600 outline-none text-center"
                  />
                </div>
                <div>
                  <p className="text-[10px] font-black text-pink-400 uppercase tracking-widest mb-2">Female Count</p>
                  <input
                    type="number"
                    min={0}
                    value={femaleCount}
                    onChange={e => setFemaleCount(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-4 bg-pink-50 dark:bg-pink-900/20 rounded-2xl border border-pink-100 dark:border-pink-900/30 text-2xl font-black text-pink-500 outline-none text-center"
                  />
                </div>
              </div>
              {/* Total */}
              <div className="bg-[#349DC5]/10 rounded-2xl p-6 text-center">
                <p className="text-[10px] font-black text-[#349DC5]/60 uppercase tracking-widest mb-1">Total Attendance</p>
                <p className="text-4xl font-black text-[#349DC5]">{total.toLocaleString()}</p>
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting || !serviceType || !date || (serviceType === "NEW_SPECIAL_EVENT" && !customEventName.trim())}
              className="w-full py-5 bg-[#349DC5] text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl shadow-[#349DC5]/20"
            >
              {submitting && <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {view === "edit" ? "Update Record" : "Save and Submit"}
            </button>
          </div>

          {/* Service type picker */}
          <AnimatePresence>
            {showServicePicker && (
              <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowServicePicker(false)}>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                <motion.div initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }} onClick={e => e.stopPropagation()} className="relative bg-white dark:bg-[#1a1a1a] w-full sm:max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 shadow-2xl max-h-[80vh] flex flex-col">
                  <div className="flex items-center justify-between mb-6 shrink-0">
                    <p className="text-[10px] font-black text-[#349DC5] uppercase tracking-[0.3em]">Select Service Type</p>
                    <button onClick={() => setShowServicePicker(false)} className="w-8 h-8 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400"><X size={18} /></button>
                  </div>
                  <div className="space-y-1 overflow-y-auto pr-2 custom-scrollbar">
                    {serviceTypes.map(st => (
                      <button key={st} onClick={() => { setServiceType(st); setShowServicePicker(false); }} className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all ${serviceType === st ? "bg-[#349DC5]/10 text-[#349DC5]" : "hover:bg-gray-50 dark:hover:bg-white/5 text-gray-600 dark:text-white/60"}`}>
                        <span className="text-sm font-black uppercase tracking-tight">{st}</span>
                        {serviceType === st && <Check size={18} />}
                      </button>
                    ))}
                    <div className="pt-2">
                      <button 
                        onClick={() => { setServiceType("NEW_SPECIAL_EVENT"); setShowServicePicker(false); }}
                        className="w-full flex items-center gap-3 px-5 py-5 rounded-2xl bg-gray-50 dark:bg-white/5 text-[#349DC5] hover:bg-[#349DC5]/5 transition-all"
                      >
                        <div className="w-8 h-8 rounded-xl bg-[#349DC5]/10 flex items-center justify-center">
                          <Plus size={18} />
                        </div>
                        <span className="text-sm font-black uppercase tracking-tight">Create New Special Event</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
