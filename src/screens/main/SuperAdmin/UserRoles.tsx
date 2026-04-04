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
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { BASE_URl } from "../../../api/users";
import AsyncStorage from "../../../utils/AsyncStorage";

// ─── helpers ────────────────────────────────────────────────────────────────

function getRoleStyle(role: string) {
  switch (role) {
    case "SuperAdmin":
      return { bg: "#0B2346", badge: "bg-[#0b2346]", accent: "#0B2346", light: "#e8eef8" };
    case "MinistryAdmin":
      return { bg: "#6c3483", badge: "bg-purple-700", accent: "#6c3483", light: "#f5eef8" };
    case "UnitLeader":
      return { bg: "#1a6e4c", badge: "bg-emerald-700", accent: "#1a6e4c", light: "#eafaf1" };
    case "Member":
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

function buildRoleContextLines(role: string, item: any, isMulti: boolean, user: any): RoleContext[] {
  const lines: RoleContext[] = [];

  // Helper: safely extract name from a populated ref (object) or skip if it's a raw ObjectId string
  const safeName = (field: any): string | null => {
    if (!field) return null;
    if (typeof field === 'object' && field.name) return field.name;
    // If it's still a raw ObjectId string, return null (don't expose the ID)
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
    // item.unit must be populated by the backend for name to appear
    const unitName = safeName(item.unit);
    if (unitName) {
      lines.push({ icon: Building2, label: "Unit", value: unitName });
      // Nested church from unit.church (populated via roles.unit → church)
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
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) { navigate("/login"); return; }

      const [userRes, unitsRes] = await Promise.all([
        axios.get(`${BASE_URl}/api/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${BASE_URl}/api/units`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => ({ data: { units: [] } })),
      ]);

      if (userRes.data?.user || userRes.data) {
        setUser(userRes.data.user || userRes.data);
      }
      if (unitsRes.data?.units) setUnits(unitsRes.data.units);
    } catch {
      toast.error("Failed to load user data");
    } finally {
      setLoading(false);
    }
  }, [userId, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddRole = async () => {
    if (!selectedRole) { toast.error("Please select a role"); return; }
    if ((selectedRole === "UnitLeader" || selectedRole === "Member") && !selectedUnit) {
      toast.error("Please select a unit"); return;
    }

    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const payload: any = { role: selectedRole };
      if (selectedUnit) payload.unitId = selectedUnit;

      const res = await axios.post(`${BASE_URl}/api/users/${userId}/add-role`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.ok) {
        toast.success(`${selectedRole} assigned successfully`);
        setShowAddModal(false);
        setSelectedRole("");
        setSelectedUnit("");
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
                const contextLines = buildRoleContextLines(role.role, role, isMulti, user);
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.07 }}
                    className="bg-white dark:bg-[#1a1c1e] rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                    style={{ borderLeftWidth: 4, borderLeftColor: styles.bg }}
                  >
                    {/* Role Name Badge Row */}
                    <div className="flex items-center justify-between px-5 pt-5 pb-3">
                      <span
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-black text-white uppercase tracking-wide"
                        style={{ backgroundColor: styles.bg }}
                      >
                        <Shield size={12} />
                        {role.role}
                      </span>
                    </div>

                    {/* Context lines */}
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

                      {/* Duties */}
                      {role.duties && role.duties.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-50 dark:border-white/5">
                          <p className="text-[9px] font-black text-gray-300 uppercase tracking-wider mb-1.5">Duties</p>
                          <div className="flex flex-wrap gap-1.5">
                            {role.duties.map((d: string, di: number) => (
                              <span key={di} className="px-2 py-0.5 bg-gray-50 dark:bg-white/5 rounded text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                                {d}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 bg-white dark:bg-[#1a1c1e] rounded-2xl border-2 border-dashed border-gray-100 dark:border-white/5">
              <Shield size={48} className="mx-auto text-gray-200 mb-4" />
              <p className="text-sm font-bold text-gray-400">No roles assigned yet</p>
              <p className="text-xs text-gray-300 mt-1">Use the button below to assign a role</p>
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
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
              className="relative w-full sm:max-w-xl bg-white dark:bg-[#0f1218] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-50 dark:border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-[#0B2346] dark:text-white uppercase tracking-tight">
                    Assign New Role
                  </h3>
                  <p className="text-[9px] font-black text-[#349DC5] uppercase tracking-widest mt-0.5">
                    Select a role &amp; target
                  </p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 text-gray-400 hover:text-primary transition-all">
                  <X size={22} />
                </button>
              </div>

              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* Role Picker */}
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">
                    Designatory Role
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {["SuperAdmin", "MinistryAdmin", "UnitLeader", "Member"].map((r) => {
                      const s = getRoleStyle(r);
                      return (
                        <button
                          key={r}
                          onClick={() => { setSelectedRole(r); setSelectedUnit(""); }}
                          className="h-12 rounded-xl font-black text-xs uppercase transition-all active:scale-95 border-2"
                          style={{
                            backgroundColor: selectedRole === r ? s.bg : "transparent",
                            color: selectedRole === r ? "#fff" : "#64748b",
                            borderColor: selectedRole === r ? s.bg : "#e2e8f0",
                          }}
                        >
                          {r}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Unit Picker */}
                {(selectedRole === "UnitLeader" || selectedRole === "Member") && (
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">
                      Assigned Unit
                    </label>
                    <div className="max-h-52 overflow-y-auto bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 divide-y divide-gray-100 dark:divide-white/5">
                      {units.map((u) => (
                        <button
                          key={u._id}
                          onClick={() => setSelectedUnit(u._id)}
                          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white dark:hover:bg-white/5 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <Building2 size={14} className={selectedUnit === u._id ? "text-[#0B2346]" : "text-gray-300"} />
                            <span className={`text-sm font-${selectedUnit === u._id ? "black" : "medium"} ${selectedUnit === u._id ? "text-[#0B2346] dark:text-white" : "text-gray-500 dark:text-gray-400"}`}>
                              {u.name}
                            </span>
                          </div>
                          {selectedUnit === u._id && <CheckCircle2 size={16} className="text-[#0B2346] dark:text-[#349DC5] shrink-0" />}
                        </button>
                      ))}
                      {units.length === 0 && (
                        <p className="text-center text-sm text-gray-400 py-8">No units available</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Confirm */}
                <button
                  onClick={handleAddRole}
                  disabled={submitting}
                  className="w-full h-14 bg-[#0B2346] text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-60"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <><Zap size={18} /> Confirm Assignment</>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
