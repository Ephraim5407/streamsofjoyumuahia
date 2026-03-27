import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Calendar, Plus, Phone, MessageSquare, Edit2,
  Trash2, X, ArrowLeft, RefreshCw, User, MapPin,
  ShieldCheck, Share2, Filter, Check, Star, ExternalLink, ChevronDown
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
    return u?.activeUnitId || u?.activeUnit?._id || u?.activeUnit || (u?.roles || []).find((r: any) => r.role === "UnitLeader" && r.unit)?.unit || (u?.roles || []).find((r: any) => r.role === "Member" && r.unit)?.unit || null;
};

export default function PeopleInvitedScreen() {
  const navigate = useNavigate();
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("All");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingInvite, setEditingInvite] = useState<any>(null);

  const fetchInvites = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    else setRefreshing(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const rawUser = await AsyncStorage.getItem("user");
      const u = rawUser ? JSON.parse(rawUser) : null;
      let scope = "mine";
      if (u?.activeRole === "SuperAdmin" || u?.activeRole === "MinistryAdmin") {
          scope = "all";
      } else if (u?.activeRole === "UnitLeader") {
          scope = "unit";
      }
      
      const targetUnitId = await getUnitId();

      const res = await axios.get(`${BASE_URl}/api/invites`, {
        params: { scope, unitId: scope === "unit" ? targetUnitId : undefined, year: selectedYear === "All" ? undefined : selectedYear },
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data?.invites || res.data || [];
      setInvites(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error("Failed to sync invitation ledger");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedYear]);

  useEffect(() => { fetchInvites(); }, [fetchInvites]);

  const filteredInvites = useMemo(() => {
    return invites.filter((inv) => {
      const matchesSearch = (inv.name || "").toLowerCase().includes(search.toLowerCase()) || (inv.phone || "").includes(search);
      const matchesYear = selectedYear === "All" || (inv.invitedAt && new Date(inv.invitedAt).getFullYear().toString() === selectedYear);
      return matchesSearch && matchesYear;
    });
  }, [invites, search, selectedYear]);

  const years = ["All", ...Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString())];

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this invitation record?")) return;
    try {
      const token = await AsyncStorage.getItem("token");
      await axios.delete(`${BASE_URl}/api/invites/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Record purged");
      fetchInvites(true);
    } catch (e) {
      toast.error("Operation failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0f1113] pb-32">
      <div className="bg-[#00204a] pt-12 sm:pt-16 pb-32 sm:pb-24 px-6 sm:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-20 opacity-10 pointer-events-none">
          <Share2 size={300} className="text-[#349DC5] -rotate-12" />
        </div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 sm:gap-8 relative z-10">
          <div className="flex items-start sm:items-center gap-4 sm:gap-6">
            <button onClick={() => navigate(-1)} className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-2xl bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-95 mt-1 sm:mt-0">
              <ArrowLeft size={28} />
            </button>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight leading-[1.1] sm:leading-none">People You Invited to Church</h1>
              <div className="flex items-center gap-3 mt-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#349DC5] animate-pulse" />
                <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Personal Outreach Registry</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => fetchInvites(true)} className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center border border-white/10 hover:bg-white/20 transition-all active:scale-95">
              <RefreshCw size={22} className={refreshing ? "animate-spin text-[#349DC5]" : "text-white/60"} />
            </button>
            <button onClick={() => { setEditingInvite(null); setShowAddModal(true); }} className="h-14 px-8 bg-[#349DC5] text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-3 active:scale-95 transition-all shadow-lg shadow-cyan-500/20">
              <Plus size={18} /> Log Invitation
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-8">
        {/* Premium Count Card */}
        <div className="bg-white dark:bg-[#1a1c1e] rounded-[40px] p-10 border border-gray-100 dark:border-white/5 shadow-sm mb-12 flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
            <Share2 size={100} className="text-[#349DC5]" />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] mb-3">Total Invited</p>
            <h2 className="text-6xl font-black text-[#00204a] dark:text-white leading-none tracking-tighter tabular-nums">
              {filteredInvites.length}
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search record by name or phone..." className="w-full h-20 pl-16 pr-8 bg-white dark:bg-[#1a1c1e] rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 font-bold text-lg outline-none focus:border-[#349DC5]/20 transition-all placeholder:text-gray-200" />
        </div>

        <div className="space-y-6">
          {loading ? (
            <div className="flex flex-col items-center py-24 gap-6 text-center">
              <div className="w-12 h-12 rounded-full border-4 border-[#349DC5] border-t-transparent animate-spin" />
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] animate-pulse">Syncing Outreach Catalog...</p>
            </div>
          ) : filteredInvites.length === 0 ? (
            <div className="flex flex-col items-center py-32 gap-6 text-center bg-white dark:bg-[#1a1c1e] rounded-[48px] border-2 border-dashed border-gray-100 dark:border-white/5">
              <div className="w-24 h-24 rounded-[40px] bg-blue-50 dark:bg-blue-900/10 flex items-center justify-center text-6xl shadow-inner animate-pulse mx-auto opacity-50">🤝</div>
              <div>
                <p className="text-sm font-black text-[#00204a] dark:text-white uppercase tracking-widest mb-2">No Records Detected</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-loose">The outreach ledger is currently empty.<br/>Record your first invitation today.</p>
              </div>
            </div>
          ) : (
            filteredInvites.map((inv) => (
              <motion.div key={inv._id} layout className="bg-white dark:bg-[#1a1c1e] p-8 rounded-[40px] shadow-sm border border-gray-100 dark:border-white/5 hover:border-[#349DC5]/10 transition-all group relative overflow-hidden">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/10 text-[#349DC5] rounded-[28px] flex items-center justify-center text-4xl font-black shadow-inner">
                      {(inv.name || "?")[0]}
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-[#00204a] dark:text-white uppercase tracking-tight leading-none mb-2">{inv.name || "Anonymous Invite"}</h3>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-md ${inv.gender === "Male" ? "text-blue-500 bg-blue-50" : "text-rose-400 bg-rose-50"}`}>
                          {inv.gender || "Not Specified"}
                        </span>
                        {inv.ageRange && (
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 bg-gray-50 px-3 py-1 rounded-md">
                                {inv.ageRange}
                            </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => { setEditingInvite(inv); setShowAddModal(true); }} className="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 hover:text-[#349DC5] hover:bg-white transition-all"><Edit2 size={18} /></button>
                    <button onClick={() => handleDelete(inv._id)} className="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 hover:text-rose-500 hover:bg-white transition-all"><Trash2 size={18} /></button>
                  </div>
                </div>
                <div className="space-y-4">
                  <DetailRow label="Invitation Date" value={inv.invitedAt ? new Date(inv.invitedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—"} />
                  <DetailRow label="Contact Tether" value={inv.phone || "—"} />
                  {inv.note && (
                    <div className="mt-6 pt-6 border-t border-gray-50 dark:border-white/5">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Meeting Context</p>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300 leading-relaxed italic border-l-4 border-[#349DC5] pl-4 py-2 bg-blue-50/20 dark:bg-blue-900/5 rounded-r-2xl">
                        {inv.note}
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
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)} className="absolute inset-0 bg-[#00204a]/80 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-xl bg-white dark:bg-[#1a1c1e] rounded-[50px] p-12 shadow-2xl overflow-y-auto max-h-[92vh]">
               <div className="flex items-center justify-between mb-10">
                  <h3 className="text-3xl font-black text-[#00204a] dark:text-white uppercase">{editingInvite ? "Edit Entry" : "Log Outreach"}</h3>
                  <button onClick={() => setShowAddModal(false)} className="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center"><X size={20} className="text-gray-400" /></button>
               </div>
               <InviteForm invite={editingInvite} onSuccess={() => { setShowAddModal(false); fetchInvites(true); }} onCancel={() => setShowAddModal(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InviteForm({ invite, onSuccess, onCancel }: any) {
  const [formData, setFormData] = useState({
    name: invite?.name || "",
    phone: invite?.phone || "",
    gender: invite?.gender || "Male",
    ageRange: invite?.ageRange || "Adult",
    note: invite?.note || "",
    method: invite?.method || "",
    invitedAt: invite?.invitedAt ? new Date(invite.invitedAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) { toast.error("Name is required"); return; }
    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const unitId = await getUnitId();
      if (invite) {
        await axios.put(`${BASE_URl}/api/invites/${invite._id}`, formData, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post(`${BASE_URl}/api/invites`, { ...formData, unitId }, { headers: { Authorization: `Bearer ${token}` } });
      }
      onSuccess();
    } catch { toast.error("Submission failed"); }
    finally { setSubmitting(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">Invitee Name</label>
            <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Full Name" className="w-full h-16 px-6 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold text-lg focus:ring-2 ring-blue-500/20" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">Phone</label>
            <input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="Contact Number" className="w-full h-16 px-6 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold text-lg focus:ring-2 ring-blue-500/20" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">Date</label>
            <input type="date" value={formData.invitedAt} onChange={e => setFormData({ ...formData, invitedAt: e.target.value })} className="w-full h-16 px-6 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold text-lg focus:ring-2 ring-blue-500/20 uppercase" />
          </div>
       </div>
       <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">Gender</label>
            <select value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })} className="w-full h-16 px-6 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold text-lg appearance-none">
                <option>Male</option><option>Female</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">Age Group</label>
            <select value={formData.ageRange} onChange={e => setFormData({ ...formData, ageRange: e.target.value })} className="w-full h-16 px-6 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold text-lg appearance-none">
                <option>Child</option><option>Teenager</option><option>Adult</option><option>Elder</option>
            </select>
          </div>
       </div>
       <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">Meeting Context / Location</label>
          <textarea rows={3} value={formData.note} onChange={e => setFormData({ ...formData, note: e.target.value })} placeholder="Where did you meet this person?" className="w-full p-6 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-medium text-lg resize-none focus:ring-2 ring-blue-500/20" />
       </div>
       <div className="flex gap-4 pt-4">
          <button type="button" onClick={onCancel} className="flex-1 h-16 rounded-2xl border-2 border-gray-100 dark:border-white/5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Discard</button>
          <button type="submit" disabled={submitting} className="flex-[2] h-16 bg-[#349DC5] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-cyan-500/20 disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95 transition-all">
            {submitting ? <RefreshCw className="animate-spin" /> : invite ? "Update" : "Save Outreach"}
          </button>
       </div>
    </form>
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
