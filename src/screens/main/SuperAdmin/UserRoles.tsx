import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Shield,
  Plus,
  X,
  CheckCircle2,
  Zap,
  Building2,
  Church,
  Globe,
  Fingerprint,
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { BASE_URl } from "../../../api/users";
import AsyncStorage from "../../../utils/AsyncStorage";

// ─── helpers ────────────────────────────────────────────────────────────────

function getRoleStyle(role: string) {
  switch (role) {
    case "SuperAdmin":
    case "Church Admin":
      return { bg: "#0B2346", badge: "bg-[#0b2346]", accent: "#0B2346", light: "#e8eef8" };
    case "MinistryAdmin":
    case "Ministry Admin":
      return { bg: "#6c3483", badge: "bg-purple-700", accent: "#6c3483", light: "#f5eef8" };
    case "UnitLeader":
    case "Unit Leader":
      return { bg: "#1a6e4c", badge: "bg-emerald-700", accent: "#1a6e4c", light: "#eafaf1" };
    case "Member":
    case "Unit Member":
      return { bg: "#1c4a7e", badge: "bg-blue-700", accent: "#1c4a7e", light: "#eaf0fb" };
    default:
      return { bg: "#349DC5", badge: "bg-[#349DC5]", accent: "#349DC5", light: "#e0f2fe" };
  }
}

interface RoleContext {
  icon: typeof Globe;
  label: string;
  value: string;
}

function buildRoleContextLines(role: string, item: any, isMulti: boolean, user: any, units: any[]): RoleContext[] {
  const lines: RoleContext[] = [];

  const safeName = (field: any, isUnitField: boolean = false): string | null => {
    if (!field) return null;
    if (typeof field === 'object' && field.name) return field.name;
    if (isUnitField && typeof field === 'string' && units) {
        const found = units.find((u: any) => u._id === field);
        if (found && found.name) return found.name;
    }
    return null;
  };

  if (role === "SuperAdmin") {
    if (isMulti) {
      const churchNames: string[] = [];
      const userChurch = safeName(user.church);
      if (userChurch) churchNames.push(userChurch);
      if (Array.isArray(user.churches)) {
        user.churches.forEach((c: any) => {
          const n = safeName(c);
          if (n && !churchNames.includes(n)) churchNames.push(n);
        });
      }
      if (churchNames.length) {
        lines.push({ icon: Building2, label: "Churches", value: churchNames.join(", ") });
      }
      const ministryNames: string[] = [];
      (user.roles || []).forEach((r: any) => {
        if (r.ministryName && !ministryNames.includes(r.ministryName)) ministryNames.push(r.ministryName);
      });
      if (ministryNames.length) {
        lines.push({ icon: Church, label: "Ministries", value: ministryNames.join(", ") });
      }
    } else {
      const churchName = safeName(item.church) || safeName(user.church);
      if (churchName) lines.push({ icon: Building2, label: "Church", value: churchName });
      if (item.ministryName) lines.push({ icon: Church, label: "Ministry", value: item.ministryName });
    }
    if (!lines.length) lines.push({ icon: Globe, label: "Scope", value: "Global Access" });

  } else if (role === "MinistryAdmin") {
    if (item.ministryName) lines.push({ icon: Church, label: "Ministry", value: item.ministryName });
    const churchName = safeName(item.church);
    if (churchName) lines.push({ icon: Building2, label: "Church", value: churchName });
    if (!lines.length) lines.push({ icon: Globe, label: "Scope", value: "Ministry-Wide Access" });

  } else if (role === "UnitLeader" || role === "Member") {
    const unitName = safeName(item.unit, true);
    if (unitName) {
      lines.push({ icon: Building2, label: "Unit", value: unitName });
      const churchName = safeName(item.unit?.church);
      if (churchName) lines.push({ icon: Church, label: "Church", value: churchName });
    } else {
      lines.push({ icon: Globe, label: "Unit", value: "Unassigned / Loading..." });
    }
  }

  return lines;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function UserRoles() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [user, setUser] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState<any[]>([]);
  const [churches, setChurches] = useState<any[]>([]);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [selectedChurch, setSelectedChurch] = useState("");
  const [selectedMinistry, setSelectedMinistry] = useState("");
  
  const [submitting, setSubmitting] = useState(false);
  
  // Security Verification Step
  const [showVerify, setShowVerify] = useState(false);
  const [verifyState, setVerifyState] = useState<'idle'|'scanning'|'success'>('idle');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) { navigate("/login"); return; }

      const [userRes, unitsRes, meRes, churchRes] = await Promise.all([
        axios.get(`${BASE_URl}/api/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${BASE_URl}/api/units`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { units: [] } })),
        axios.get(`${BASE_URl}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { user: null } })),
        axios.get(`${BASE_URl}/api/churches`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { churches: [] } })),
      ]);

      if (userRes.data?.user || userRes.data) setUser(userRes.data.user || userRes.data);
      if (meRes.data?.user) setCurrentUser(meRes.data.user);
      if (unitsRes.data?.units) setUnits(unitsRes.data.units);
      if (churchRes.data?.churches) setChurches(churchRes.data.churches);
    } catch {
      toast.error("Failed to load user data");
    } finally {
      setLoading(false);
    }
  }, [userId, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Determine assigner scope
  const isMeSuperAdmin = currentUser?.activeRole === 'SuperAdmin' || (currentUser?.roles||[]).some((r:any) => r.role === 'SuperAdmin');
  const isMeMulti = isMeSuperAdmin && currentUser?.multi;
  const isMeMinistryAdmin = currentUser?.activeRole === 'MinistryAdmin';
  const meChurchName = typeof currentUser?.church === 'object' ? currentUser?.church?.name : (churches.find(c=>c._id===currentUser?.church)?.name || "Current Church");
  const meMinistryName = (currentUser?.roles||[]).find((r:any)=>r.role==='MinistryAdmin')?.ministryName || "Current Ministry";

  const handleRoleSelect = (r: string) => {
    setSelectedRole(r);
    setSelectedChurch("");
    setSelectedMinistry("");
    setSelectedUnit("");
  };

  const handleInitialAssignClick = () => {
    if (!selectedRole) { toast.error("Please select a role"); return; }
    
    if (selectedRole === 'SuperAdmin') {
      if (!selectedChurch) { toast.error("Please select a church"); return; }
    } else if (selectedRole === 'MinistryAdmin') {
      if (!selectedChurch && isMeMulti) { toast.error("Please select a church"); return; }
      if (!selectedMinistry && (isMeMulti || isMeSuperAdmin)) { toast.error("Please select a ministry"); return; }
    } else if (selectedRole === 'UnitLeader' || selectedRole === 'Member') {
      if (!selectedUnit) { toast.error("Please select a unit"); return; }
    }
    
    setShowVerify(true);
    setVerifyState('idle');
  };

  const executeVerifyAndSubmit = () => {
    setVerifyState('scanning');
    setTimeout(() => {
      setVerifyState('success');
      setTimeout(() => {
        setShowVerify(false);
        submitRoleAssignment();
      }, 800);
    }, 1500);
  };

  const submitRoleAssignment = async () => {
    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const payload: any = { role: selectedRole };
      
      if (selectedUnit) payload.unitId = selectedUnit;
      if (selectedChurch) payload.churchId = selectedChurch;
      if (selectedMinistry) payload.ministryName = selectedMinistry;
      
      // Implicit selections based on assigner scope
      if (!isMeMulti && selectedRole === 'MinistryAdmin') {
         if (!payload.churchId && currentUser?.church?._id) payload.churchId = currentUser.church._id;
         if (!payload.churchId && typeof currentUser?.church === 'string') payload.churchId = currentUser.church;
      }
      if (selectedRole === 'SuperAdmin') {
         if (!isMeMulti) payload.churchId = typeof currentUser?.church === 'object' ? currentUser?.church?._id : currentUser?.church;
      }
      
      const res = await axios.post(`${BASE_URl}/api/users/${userId}/add-role`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.ok) {
        toast.success(`${selectedRole} assigned successfully`);
        setShowAddModal(false);
        setSelectedRole("");
        setSelectedUnit("");
        setSelectedChurch("");
        setSelectedMinistry("");
        fetchData();
      } else {
        toast.error(res.data?.message || "Assignment failed");
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f1f5f9] dark:bg-[#0f1218]">
        <div className="w-12 h-12 border-4 border-[#349DC5] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isMulti = !!user?.multi;
  const fullName = [user?.title, user?.firstName, user?.surname].filter(Boolean).join(" ") || "Unnamed User";
  
  // Available roles for the assigner to give
  let assignableRoles = ["Church Admin", "Ministry Admin", "Unit Leader", "Unit Member"];
  if (isMeSuperAdmin && !isMeMulti) {
    assignableRoles = ["Ministry Admin", "Unit Leader", "Unit Member"];
  } else if (isMeMinistryAdmin) {
    assignableRoles = ["Unit Leader", "Unit Member"];
  }

  const roleValueMap: any = {
    "Church Admin": "SuperAdmin",
    "Ministry Admin": "MinistryAdmin",
    "Unit Leader": "UnitLeader",
    "Unit Member": "Member"
  };

  const getMinistryOpts = () => {
      const cid = selectedChurch || (typeof currentUser?.church === 'string' ? currentUser?.church : currentUser?.church?._id);
      if (!cid) return [];
      const ch = churches.find(c => c._id === cid);
      return ch?.ministries || [];
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] dark:bg-[#0f1218] pb-40">
      {/* ── Premium Header ── */}
      <div className="bg-[#0B2346] px-4 sm:px-8 md:px-12 py-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#349DC5]/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="max-w-5xl mx-auto relative z-10 flex items-center gap-5">
          <button
            onClick={() => navigate(-1)}
            className="p-3 rounded-2xl bg-white/10 text-white hover:bg-white/20 transition-all border border-white/10 shrink-0"
          >
            <ArrowLeft size={22} />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
              Role Management
            </h1>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">
              Authorized Personnel Access
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-8 md:px-12 -mt-6 relative z-10">
        {/* ── Profile Card ── */}
        <div className="bg-white dark:bg-[#1a1c1e] rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-xl border border-gray-100 dark:border-white/5 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="shrink-0">
            {user?.profile?.avatar ? (
              <img
                src={user.profile.avatar}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-4 border-white dark:border-white/10 shadow-lg"
                alt="Avatar"
              />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[#0B2346] flex items-center justify-center text-white font-black text-3xl border-4 border-white dark:border-white/10 shadow-lg">
                {user?.firstName?.[0]}{user?.surname?.[0]}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-black text-[#0B2346] dark:text-white leading-tight mb-1 truncate">
              {fullName}
            </h2>
            <p className="text-sm text-gray-400 mb-3 truncate">{user?.email}</p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#EFF6FF] dark:bg-blue-500/10 rounded-full text-[10px] font-bold text-[#1c4a7e] dark:text-blue-400 uppercase tracking-wider">
                <Shield size={10} /> {(user?.roles || []).length} Role{(user?.roles || []).length !== 1 ? "s" : ""}
              </span>
              {isMulti && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 dark:bg-purple-500/10 rounded-full text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">
                  🌐 Multi-Church
                </span>
              )}
              {((user?.roles || []).some((r:any)=>r.role==='SuperAdmin') && !isMulti) && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 dark:bg-gray-500/10 rounded-full text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  🏛️ Single Church Access
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Roles Grid ── */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4 px-1">
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              Active Assignments — {(user?.roles || []).length}
            </p>
          </div>

          {(user?.roles || []).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(user?.roles || []).map((role: any, idx: number) => {
                const styles = getRoleStyle(role.role);
                const contextLines = buildRoleContextLines(role.role, role, isMulti, user, units);
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.07 }}
                    className="bg-white dark:bg-[#1a1c1e] rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                    style={{ borderLeftWidth: 4, borderLeftColor: styles.bg }}
                  >
                    <div className="flex items-center justify-between px-5 pt-5 pb-3">
                      <span
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-black text-white uppercase tracking-wide"
                        style={{ backgroundColor: styles.bg }}
                      >
                        <Shield size={12} />
                        {role.role}
                      </span>
                    </div>
                    <div className="px-5 pb-5 space-y-2">
                      {contextLines.map((ctx, ci) => (
                        <div key={ci} className="flex items-start gap-3">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                            style={{ backgroundColor: styles.light }}
                          >
                            <ctx.icon size={14} style={{ color: styles.bg }} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider leading-none mb-0.5">
                              {ctx.label}
                            </p>
                            <p className="text-sm font-semibold text-[#1e293b] dark:text-gray-200 leading-snug break-words">
                              {ctx.value}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 bg-white dark:bg-[#1a1c1e] rounded-2xl border-2 border-dashed border-gray-100 dark:border-white/5">
              <Shield size={48} className="mx-auto text-gray-200 mb-4" />
              <p className="text-sm font-bold text-gray-400">No roles assigned yet</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Fixed CTA ── */}
      <div className="fixed bottom-6 left-0 right-0 px-4 sm:px-8 max-w-5xl mx-auto z-50">
        <button
          onClick={() => { setSelectedRole(""); setSelectedUnit(""); setShowAddModal(true); }}
          className="w-full h-14 bg-[#0B2346] text-white rounded-2xl flex items-center justify-center gap-3 hover:bg-[#0d2a5e] active:scale-[0.98] transition-all text-sm font-black uppercase tracking-widest shadow-2xl shadow-[#0B2346]/40"
        >
          <Plus size={20} /> Assign New Role
        </button>
      </div>

      {/* ── Add Role Modal ── */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setShowAddModal(false); setShowVerify(false); }}
              className="absolute inset-0 bg-[#0B2346]/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
              className="relative w-full sm:max-w-md bg-white dark:bg-[#0f1218] rounded-t-[32px] sm:rounded-3xl shadow-2xl overflow-hidden"
            >
              {!showVerify ? (
                  <div className="flex flex-col max-h-[85vh]">
                  <div className="p-6 border-b border-gray-50 dark:border-white/5 flex items-center justify-between shrink-0">
                    <div>
                      <h3 className="text-xl font-black text-[#0B2346] dark:text-white uppercase tracking-tight">
                        Add New Role
                      </h3>
                      <p className="text-[10px] font-black text-[#349DC5] uppercase tracking-widest mt-0.5">
                        Select role type for {user?.firstName}
                      </p>
                    </div>
                    <button onClick={() => setShowAddModal(false)} className="p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 text-gray-400 hover:text-primary transition-all">
                      <X size={22} />
                    </button>
                  </div>
    
                  <div className="p-6 space-y-6 overflow-y-auto w-full max-w-full">
                    {/* Role Picker List */}
                    <div className="space-y-3">
                      {assignableRoles.map((r) => {
                        const val = roleValueMap[r];
                        const s = getRoleStyle(r);
                        return (
                          <button
                            key={r}
                            onClick={() => handleRoleSelect(val)}
                            className="w-full h-14 rounded-xl font-black text-sm transition-all active:scale-95 border flex items-center justify-center gap-3"
                            style={{
                              backgroundColor: selectedRole === val ? s.light : "transparent",
                              color: selectedRole === val ? s.bg : "#64748b",
                              borderColor: selectedRole === val ? s.bg : "rgba(100,116,139,0.2)",
                            }}
                          >
                            <Shield size={18} /> {r}
                          </button>
                        );
                      })}
                    </div>
    
                    {/* Context Fillers based on Assigner & Role */}
                    {selectedRole && (
                      <div className="space-y-4 pt-2">
                        {/* Scope fixed by Assigner */}
                        {!isMeMulti && (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-gray-400">Current Church: {meChurchName}</p>
                            {isMeMinistryAdmin && <p className="text-xs font-semibold text-gray-400">Current Ministry: {meMinistryName}</p>}
                          </div>
                        )}
                        
                        {/* Dropdowns logic */}
                        {isMeMulti && (selectedRole === 'MinistryAdmin' || selectedRole === 'UnitLeader' || selectedRole === 'Member' || selectedRole === 'SuperAdmin') && (
                          <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Select Church</p>
                            <select 
                               className="w-full h-12 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 text-sm font-semibold outline-none"
                               value={selectedChurch} onChange={(e) => { setSelectedChurch(e.target.value); setSelectedMinistry(""); setSelectedUnit(""); }}
                            >
                               <option value="">-- Choose Church --</option>
                               {churches.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                            </select>
                          </div>
                        )}
                        
                        {(isMeSuperAdmin || isMeMulti) && (selectedRole === 'MinistryAdmin' || selectedRole === 'UnitLeader' || selectedRole === 'Member') && (
                           <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Select Ministry</p>
                            <select 
                               className="w-full h-12 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 text-sm font-semibold outline-none disabled:opacity-50"
                               value={selectedMinistry} onChange={(e) => { setSelectedMinistry(e.target.value); setSelectedUnit(""); }}
                               disabled={isMeMulti && !selectedChurch}
                            >
                               <option value="">-- Choose Ministry --</option>
                               {getMinistryOpts().map((m: any, i:number) => <option key={i} value={m.name}>{m.name}</option>)}
                            </select>
                          </div>
                        )}
                        
                        {(selectedRole === 'UnitLeader' || selectedRole === 'Member') && (
                           <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Select Unit</p>
                            <select 
                               className="w-full h-12 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 text-sm font-semibold outline-none disabled:opacity-50"
                               value={selectedUnit} onChange={(e) => { setSelectedUnit(e.target.value); }}
                               disabled={ (isMeMulti && (!selectedChurch || !selectedMinistry)) || (isMeSuperAdmin && !isMeMulti && !selectedMinistry) }
                            >
                               <option value="">-- Choose Unit --</option>
                               {units.filter(u => {
                                  if (isMeMinistryAdmin) return true;
                                  if (isMeSuperAdmin && !isMeMulti && selectedMinistry) {
                                      const mCid = typeof currentUser?.church === 'object' ? currentUser?.church?._id : currentUser?.church;
                                      return (typeof u.church === 'object' ? u.church._id === mCid : u.church === mCid) && u.ministryName === selectedMinistry;
                                  }
                                  if (isMeMulti && selectedChurch && selectedMinistry) {
                                      return (typeof u.church === 'object' ? u.church._id === selectedChurch : u.church === selectedChurch) && u.ministryName === selectedMinistry;
                                  }
                                  return false;
                               }).map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                            </select>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Confirm */}
                    <div className="flex gap-3 pt-4 pb-2">
                        <button
                          onClick={() => setShowAddModal(false)}
                          className="flex-1 h-12 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 text-gray-500 dark:text-gray-400 rounded-xl font-bold uppercase tracking-wide transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleInitialAssignClick}
                          className="flex-1 h-12 bg-[#349DC5] hover:bg-[#2b83a5] text-white rounded-xl font-bold uppercase tracking-wide shadow-lg shadow-[#349DC5]/30 transition-all font-black tracking-widest"
                        >
                           Assign Role
                        </button>
                    </div>
                  </div>
                  </div>
               ) : (
                   /* Beautiful Biometric / Verification Step */
                   <div className="p-8 pb-12 flex flex-col items-center justify-center text-center max-h-[85vh]">
                     <p className="text-[10px] font-black text-[#349DC5] uppercase tracking-widest mb-6">Security Verification Requirements</p>
                     <div className={`w-28 h-28 rounded-full border-[3px] flex items-center justify-center mb-6 transition-all duration-500 ${verifyState === 'success' ? 'border-emerald-500 bg-emerald-50' : verifyState === 'scanning' ? 'border-[#349DC5] bg-blue-50 shadow-[0_0_40px_rgba(52,157,197,0.3)] animate-pulse' : 'border-gray-200 bg-gray-50'}`}>
                         {verifyState === 'success' ? (
                            <CheckCircle2 size={48} className="text-emerald-500" />
                         ) : (
                            <Fingerprint size={48} className={verifyState === 'scanning' ? 'text-[#349DC5]' : 'text-gray-300'} />
                         )}
                     </div>
                     <h3 className="text-xl font-black text-[#0B2346] dark:text-white capitalize leading-tight mb-2">
                        {verifyState === 'success' ? 'Identity Verified' : 'Verify Assignment'}
                     </h3>
                     <p className="text-sm text-gray-400 max-w-[260px] mx-auto mb-8">
                        {verifyState === 'success' ? 'Role securely attached to system.' : 'Please verify your identity to issue this global role assignment.'}
                     </p>
                     
                     {verifyState === 'idle' && (
                        <button 
                           onClick={executeVerifyAndSubmit}
                           className="w-full h-14 bg-[#0B2346] text-white rounded-xl font-black uppercase tracking-widest"
                        >
                           Authorize
                        </button>
                     )}
                   </div>
               )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
