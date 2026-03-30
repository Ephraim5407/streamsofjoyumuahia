import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Search, Plus, X, RefreshCw, Truck, MapPin,
  Calendar, Trash2, Edit2, ShieldCheck, User
} from "lucide-react";
import toast from "react-hot-toast";
import AsyncStorage from "../../utils/AsyncStorage";

interface LogisticsDoc {
  id: string;
  vehicleType: string;
  licensePlate: string;
  driverName: string;
  equipmentLoaded: string;
  destination: string;
  status: string;
  date: string;
}

export default function Logistics() {
  const navigate = useNavigate();
  const [items, setItems] = useState<LogisticsDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<LogisticsDoc | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [vehicleType, setVehicleType] = useState("Van");
  const [licensePlate, setLicensePlate] = useState("");
  const [driverName, setDriverName] = useState("");
  const [equipmentLoaded, setEquipmentLoaded] = useState("");
  const [destination, setDestination] = useState("");
  const [status, setStatus] = useState("Parked");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const fetchItems = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    else setRefreshing(true);
    try {
      const stored = await AsyncStorage.getItem("mock_logistics_data");
      if (stored) {
        setItems(JSON.parse(stored));
      } else {
        setItems([]);
      }
    } catch {
      toast.error("Failed to load transport registry");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const filtered = useMemo(() => {
    return items.filter(item => {
      const matchSearch =
        (item.driverName || "").toLowerCase().includes(search.toLowerCase()) ||
        (item.licensePlate || "").toLowerCase().includes(search.toLowerCase()) ||
        (item.equipmentLoaded || "").toLowerCase().includes(search.toLowerCase());
      return matchSearch;
    }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [items, search]);

  const resetForm = () => {
    setEditing(null);
    setVehicleType("Van");
    setLicensePlate("");
    setDriverName("");
    setEquipmentLoaded("");
    setDestination("");
    setStatus("Parked");
    setDate(new Date().toISOString().slice(0, 10));
  };

  const openEdit = (item: LogisticsDoc) => {
    setEditing(item);
    setVehicleType(item.vehicleType);
    setLicensePlate(item.licensePlate);
    setDriverName(item.driverName);
    setEquipmentLoaded(item.equipmentLoaded);
    setDestination(item.destination);
    setStatus(item.status);
    setDate(item.date);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!driverName.trim() || !licensePlate.trim()) {
      toast.error("Driver Name and License Plate are required");
      return;
    }
    setSubmitting(true);
    try {
      const payload: LogisticsDoc = {
        id: editing ? editing.id : Date.now().toString(),
        vehicleType, licensePlate, driverName, equipmentLoaded, destination, status, date
      };
      
      let updated = [];
      if (editing) {
        updated = items.map(i => i.id === editing.id ? payload : i);
        toast.success("Logistics record updated");
      } else {
        updated = [payload, ...items];
        toast.success("Logistics deployed successfully");
      }
      
      await AsyncStorage.setItem("mock_logistics_data", JSON.stringify(updated));
      setItems(updated);
      setShowForm(false);
      resetForm();
    } catch {
      toast.error("Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Remove this transport record?")) return;
    try {
      const updated = items.filter(i => i.id !== id);
      await AsyncStorage.setItem("mock_logistics_data", JSON.stringify(updated));
      setItems(updated);
      toast.success("Record removed");
    } catch {
      toast.error("Failed to remove");
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0f1113] pb-32">
      {/* Header */}
      <div className="bg-[#00204a] pt-12 sm:pt-16 pb-32 sm:pb-24 px-6 sm:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-20 opacity-10 pointer-events-none">
          <Truck size={300} className="text-[#349DC5] -rotate-12" />
        </div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-4 sm:gap-6">
            <button onClick={() => navigate(-1)} className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-2xl bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-95">
              <ArrowLeft size={28} />
            </button>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight leading-[1.1] sm:leading-none">Logistics</h1>
              <div className="flex items-center gap-3 mt-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#349DC5] animate-pulse" />
                <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Transport & Delivery</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => fetchItems(true)} className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center border border-white/10 hover:bg-white/20 transition-all active:scale-95">
              <RefreshCw size={22} className={refreshing ? "animate-spin text-[#349DC5]" : "text-white/60"} />
            </button>
            <button onClick={() => { resetForm(); setShowForm(true); }} className="h-14 px-8 bg-[#349DC5] text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-3 active:scale-95 transition-all shadow-lg shadow-cyan-500/20">
              <Plus size={18} /> New Dispatch
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-8">
        {/* Count Card */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
           <div className="bg-white dark:bg-[#1a1c1e] rounded-[40px] p-8 border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden relative group">
             <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
               <Truck size={80} className="text-[#349DC5]" />
             </div>
             <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] mb-2 relative z-10">Total Dispatches</p>
             <h2 className="text-5xl font-black text-[#00204a] dark:text-white leading-none tracking-tighter tabular-nums relative z-10">{items.length}</h2>
           </div>
           
           <div className="bg-white dark:bg-[#1a1c1e] rounded-[40px] p-8 border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden relative group">
             <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
               <ShieldCheck size={80} className="text-emerald-500" />
             </div>
             <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] mb-2 relative z-10">In Transit</p>
             <h2 className="text-5xl font-black text-emerald-500 leading-none tracking-tighter tabular-nums relative z-10">
                {items.filter(i => i.status === "In Transit").length}
             </h2>
           </div>
        </div>

        <div className="relative group mb-12">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#349DC5] transition-colors" size={24} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by driver, plate or equipment..."
            className="w-full h-20 pl-16 pr-8 bg-white dark:bg-[#1a1c1e] rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 font-bold text-lg outline-none focus:border-[#349DC5]/20 transition-all placeholder:text-gray-300" />
        </div>

        <div className="space-y-6">
          {loading ? (
            <div className="flex flex-col items-center py-24 gap-6 text-center">
              <div className="w-12 h-12 rounded-full border-4 border-[#349DC5] border-t-transparent animate-spin" />
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] animate-pulse">Syncing Telemetry...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-32 gap-6 text-center bg-white dark:bg-[#1a1c1e] rounded-[48px] border-2 border-dashed border-gray-100 dark:border-white/5">
              <div className="w-24 h-24 rounded-[40px] bg-sky-50 dark:bg-sky-900/10 flex items-center justify-center text-6xl shadow-inner animate-pulse">🚛</div>
              <div>
                <p className="text-sm font-black text-[#00204a] dark:text-white uppercase tracking-widest mb-2">No Transport Records</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-loose">Log your first vehicle dispatch today.</p>
              </div>
            </div>
          ) : filtered.map(item => (
            <motion.div layout key={item.id}
              className="bg-white dark:bg-[#1a1c1e] p-8 rounded-[40px] shadow-sm border border-gray-100 dark:border-white/5 hover:border-[#349DC5]/10 transition-all group">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-sky-50 dark:bg-sky-900/10 text-sky-500 rounded-[28px] flex items-center justify-center text-3xl font-black shadow-inner">
                    <Truck size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-[#00204a] dark:text-white uppercase tracking-tight leading-none mb-2 group-hover:text-[#349DC5] transition-colors">
                      {item.licensePlate}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-md text-sky-500 bg-sky-50 dark:bg-sky-500/10">{item.vehicleType}</span>
                      <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-md ${item.status === 'In Transit' ? 'text-amber-500 bg-amber-50 dark:bg-amber-500/10' : item.status === 'Delivered' ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'text-gray-500 bg-gray-50 dark:bg-gray-500/10'}`}>{item.status}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => openEdit(item)} className="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 hover:text-[#349DC5] hover:bg-white transition-all"><Edit2 size={18} /></button>
                  <button onClick={() => remove(item.id)} className="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 hover:text-rose-500 hover:bg-white transition-all"><Trash2 size={18} /></button>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-3 border-b border-gray-50 dark:border-white/5"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><User size={12} />Driver</span><span className="text-sm font-bold text-[#00204a] dark:text-white uppercase">{item.driverName}</span></div>
                <div className="flex items-center justify-between py-3 border-b border-gray-50 dark:border-white/5"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><MapPin size={12} />Destination</span><span className="text-sm font-bold text-[#00204a] dark:text-white uppercase">{item.destination || "N/A"}</span></div>
                <div className="flex items-center justify-between py-3 border-b border-gray-50 dark:border-white/5"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Calendar size={12} />Dispatch Date</span><span className="text-sm font-bold text-[#00204a] dark:text-white">{new Date(item.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span></div>
                {item.equipmentLoaded && <p className="mt-4 text-sm font-medium text-gray-500 dark:text-gray-400 leading-relaxed border-l-4 border-[#349DC5]/30 pl-4 py-2 bg-gray-50/50 dark:bg-white/[0.02] rounded-r-xl">Equipment: {item.equipmentLoaded}</p>}
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
                <h3 className="text-3xl font-black text-[#00204a] dark:text-white uppercase">{editing ? "Edit Record" : "New Dispatch"}</h3>
                <button onClick={() => { setShowForm(false); resetForm(); }} className="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center"><X size={20} className="text-gray-400" /></button>
              </div>
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <FieldWrap label="License Plate" required>
                    <input value={licensePlate} onChange={e => setLicensePlate(e.target.value)} placeholder="ABC-123XYZ" className="w-full h-16 px-5 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold text-lg focus:ring-2 ring-blue-500/20 uppercase" />
                  </FieldWrap>
                  <FieldWrap label="Vehicle Type">
                    <select value={vehicleType} onChange={e => setVehicleType(e.target.value)} className="w-full h-16 px-5 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold text-lg appearance-none">
                      <option>Car</option><option>Van</option><option>Bus</option><option>Truck</option>
                    </select>
                  </FieldWrap>
                </div>
                
                <FieldWrap label="Driver Name" required>
                  <input value={driverName} onChange={e => setDriverName(e.target.value)} placeholder="Driver full name" className="w-full h-16 px-5 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold text-lg focus:ring-2 ring-blue-500/20" />
                </FieldWrap>

                <FieldWrap label="Destination">
                  <input value={destination} onChange={e => setDestination(e.target.value)} placeholder="Target Location" className="w-full h-16 px-5 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold text-lg focus:ring-2 ring-blue-500/20" />
                </FieldWrap>

                <div className="grid grid-cols-2 gap-4">
                  <FieldWrap label="Transport Date">
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full h-16 px-5 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold text-lg focus:ring-2 ring-blue-500/20 uppercase" />
                  </FieldWrap>
                  <FieldWrap label="Status">
                    <select value={status} onChange={e => setStatus(e.target.value)} className="w-full h-16 px-5 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold text-lg appearance-none">
                      <option>Parked</option><option>In Transit</option><option>Delivered</option>
                    </select>
                  </FieldWrap>
                </div>

                <FieldWrap label="Equipment Loaded">
                  <textarea rows={3} value={equipmentLoaded} onChange={e => setEquipmentLoaded(e.target.value)} placeholder="List of assets and equipment..." className="w-full p-5 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-medium text-lg resize-none focus:ring-2 ring-blue-500/20" />
                </FieldWrap>
                
                <div className="flex gap-4 pt-4">
                  <button onClick={() => { setShowForm(false); resetForm(); }} className="flex-1 h-16 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:text-gray-600 transition-colors">Discard</button>
                  <button onClick={handleSubmit} disabled={submitting} className="flex-[2] h-16 bg-[#349DC5] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-cyan-500/20 disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95 transition-transform">
                    {submitting ? <RefreshCw className="animate-spin" size={18} /> : editing ? "Update Dispatch" : "Log Dispatch"}
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

