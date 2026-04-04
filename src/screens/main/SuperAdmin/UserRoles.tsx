import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Shield,
  Plus,
  X,
  CheckCircle2,
  Trash2,
  User,
  Zap
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { BASE_URl } from "../../../api/users";
import AsyncStorage from "../../../utils/AsyncStorage";

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

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
      if (!token) {
        navigate("/login");
        return;
      }
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
      if (unitsRes.data?.units) {
        setUnits(unitsRes.data.units);
      }
    } catch (e: any) {
      toast.error("Failed to load user intelligence");
    } finally {
      setLoading(false);
    }
  }, [userId, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddRole = async () => {
    if (!selectedRole) {
      toast.error("Please select a role to delegate");
      return;
    }
    if ((selectedRole === "UnitLeader" || selectedRole === "Member") && !selectedUnit) {
      toast.error("Please specify a deployment unit");
      return;
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
        toast.success("Personnel Role Updated Successfully");
        setShowAddModal(false);
        fetchData();
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-[#0f1218]">
        <div className="w-12 h-12 border-4 border-[#349DC5] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f1218] pb-32">
      {/* Premium Header */}
      <div className="bg-[#00204a] px-6 py-12 pb-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#349DC5]/10 rounded-full blur-[100px] -mr-20 -mt-20" />
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-8 relative z-10">
          <button
            onClick={() => navigate(-1)}
            className="p-4 rounded-2xl bg-white/10 text-white hover:bg-white/20 transition-all border border-white/10 shadow-2xl backdrop-blur-md"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-none mb-2">
              Role Management
            </h1>
            <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.4em]">
              Authorized Personnel Access
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-12 relative z-20">
        {/* User Profile Card */}
        <div className="bg-white dark:bg-[#1a1c1e] rounded-[40px] p-8 shadow-2xl border border-gray-100 dark:border-white/5 flex flex-col md:flex-row items-center gap-8 mb-12">
          <div className="w-32 h-32 rounded-[32px] overflow-hidden bg-[#00204a]/5 border-4 border-white dark:border-[#349DC510] shadow-xl shrink-0">
            {user?.profile?.avatar ? (
              <img src={user.profile.avatar} className="w-full h-full object-cover" alt="Avatar" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#00204a] text-white font-black text-3xl">
                {user?.firstName?.[0]}{user?.surname?.[0]}
              </div>
            )}
          </div>
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-black text-[#00204a] dark:text-white uppercase mb-2">
              {user?.title} {user?.firstName} {user?.surname}
            </h2>
            <div className="flex flex-wrap justify-center md:justify-start gap-4">
               <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-50/50 dark:bg-blue-900/10 rounded-full border border-blue-100 dark:border-blue-900/20">
                 <User size={14} className="text-[#349DC5]" />
                 <span className="text-[10px] font-black text-[#349DC5] uppercase">{user?.email || 'N/A'}</span>
               </div>
            </div>
          </div>
        </div>

        {/* Roles List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-4 mb-4">
            <h3 className="text-sm font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Active Deployments</h3>
            <span className="text-[10px] font-bold text-[#349DC5] uppercase px-3 py-1 bg-[#349DC510] rounded-lg">
              {user?.roles?.length || 0} Records
            </span>
          </div>

          {(user?.roles || []).map((role: any, idx: number) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={idx}
              className="group bg-white dark:bg-[#1a1c1e] p-8 rounded-[36px] shadow-sm border border-gray-100 dark:border-white/5 flex flex-col md:flex-row items-start md:items-center gap-6 hover:shadow-xl transition-all hover:border-[#349DC540]"
            >
              <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-[#349DC5] shrink-0 border border-blue-100 dark:border-blue-500/20 group-hover:scale-110 transition-transform">
                <Shield size={28} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-[#349DC5] animate-pulse" />
                  <h4 className="text-xl font-black text-[#00204a] dark:text-white uppercase tracking-tight">
                    {role.role}
                  </h4>
                </div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-tighter">
                  {role.unit?.name || (typeof role.unit === 'string' ? role.unit : "Global Deployment")}
                </p>
                {role.duties && role.duties.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {role.duties.map((duty: string, dIdx: number) => (
                      <span key={dIdx} className="px-3 py-1 bg-gray-50 dark:bg-white/[0.03] rounded-lg text-[9px] font-black text-gray-400 dark:text-gray-600 uppercase border border-gray-100 dark:border-white/5">
                        {duty}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button className="p-4 rounded-xl text-gray-200 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100">
                <Trash2 size={20} />
              </button>
            </motion.div>
          ))}

          {(!user?.roles || user?.roles.length === 0) && (
            <div className="text-center py-20 bg-white/50 dark:bg-white/[0.01] rounded-[40px] border-2 border-dashed border-gray-100 dark:border-white/5">
               <Shield size={48} className="mx-auto text-gray-200 mb-4" />
               <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No active roles found in database</p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-10 left-0 right-0 px-6 max-w-4xl mx-auto flex justify-center z-[50]">
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full h-18 bg-[#00204a] text-white rounded-[28px] shadow-[0_20px_40px_-10px_rgba(0,32,74,0.4)] flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-95 transition-all text-xs font-black uppercase tracking-[0.2em] border border-white/10"
        >
          <Plus size={24} /> Modify Permissions or Assign Role
        </button>
      </div>

      {/* Add Role Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl bg-white dark:bg-[#0f1218] rounded-[40px] shadow-2xl overflow-hidden border border-white/10"
            >
              <div className="p-8 border-b border-gray-50 dark:border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-[#00204a] dark:text-white uppercase tracking-tighter">New Delegation</h3>
                  <p className="text-[9px] font-black text-[#349DC5] uppercase tracking-widest">Update personnel status</p>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-3 rounded-2xl bg-gray-50 dark:bg-white/5 text-gray-400 hover:text-primary transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 space-y-8">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase block mb-4 ml-2">Designatory Role</label>
                  <div className="grid grid-cols-2 gap-3">
                    {["SuperAdmin", "MinistryAdmin", "UnitLeader", "Member"].map((r) => (
                      <button
                        key={r}
                        onClick={() => setSelectedRole(r)}
                        className={cn(
                          "h-14 rounded-2xl font-black text-[11px] uppercase transition-all active:scale-95 border-2",
                          selectedRole === r
                            ? "bg-[#349DC510] text-[#349DC5] border-[#349DC5]"
                            : "bg-gray-50 dark:bg-white/5 text-gray-400 border-transparent hover:border-gray-200 dark:hover:border-white/10"
                        )}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {(selectedRole === "UnitLeader" || selectedRole === "Member") && (
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-4 ml-2">Assigned Unit</label>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-white/5 rounded-[24px] border border-gray-100 dark:border-white/5 p-2">
                       {units.map((u) => (
                         <button
                           key={u._id}
                           onClick={() => setSelectedUnit(u._id)}
                           className={cn(
                             "w-full h-12 flex items-center justify-between px-6 rounded-xl transition-all mb-1 uppercase font-black text-[10px]",
                             selectedUnit === u._id
                               ? "bg-white dark:bg-[#0f1218] text-[#349DC5] shadow-sm"
                               : "text-gray-400 hover:bg-white/40 dark:hover:bg-white/5"
                           )}
                         >
                           {u.name}
                           {selectedUnit === u._id && <CheckCircle2 size={16} />}
                         </button>
                       ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleAddRole}
                  disabled={submitting}
                  className="w-full h-16 bg-[#349DC5] text-white rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  {submitting ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>Update Delegation <Zap size={18} /></>
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
