import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Search,
  Building2,
  Users,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LayoutGrid,
  Shield,
  Loader2,
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { BASE_URl } from "../../../api/users";
import AsyncStorage from "../../../utils/AsyncStorage";

interface ChurchEntry {
  _id: string;
  name: string;
  superAdmins: { _id: string; firstName: string; surname: string }[];
  ministryAdmins?: { _id: string; firstName: string; surname: string }[];
  unitLeaders?: { _id: string; firstName: string; surname: string }[];
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

export default function SuperAdminChurchSwitchScreen() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [churches, setChurches] = useState<ChurchEntry[]>([]);
  const [switching, setSwitching] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }
      const res = await axios.get(`${BASE_URl}/api/superadmins/churches`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.ok) {
        setChurches(res.data.churches || []);
      }
    } catch (e: any) {
      if (e?.response?.status === 403) {
        setError("Elevated permissions required for target synchronization.");
      } else {
        setError(e.response?.data?.message || "Failure in church discovery.");
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredChurches = useMemo(() => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return churches;
    return churches.filter(
      (ch) =>
        ch.name.toLowerCase().includes(term) ||
        ch.superAdmins.some((s) => `${s.firstName} ${s.surname}`.toLowerCase().includes(term)),
    );
  }, [searchQuery, churches]);

  const handleSwitch = async (id: string) => {
    setSwitching(id);
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await axios.post(
        `${BASE_URl}/api/superadmins/switch-church`,
        { churchId: id },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.data?.ok) {
        toast.success("Authority switched successfully");
        setTimeout(() => window.location.reload(), 500);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Switch failed");
    } finally {
      setSwitching(null);
    }
  };

  if (loading && churches.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-[#0f1218]">
        <div className="w-12 h-12 border-4 border-[#349DC5] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f1218] flex flex-col">
      <div className="bg-[#00204a] p-10 pb-20 text-white selection:bg-white/10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate(-1)}
              className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-all active:scale-95"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-bold uppercase leading-none mb-2">Church Control</h1>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                  Strategic Authority Switch Hub
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center hover:bg-[#349DC5] transition-all active:scale-95"
          >
            <RefreshCw size={22} className={loading && churches.length > 0 ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full px-6 -mt-10 flex-1 pb-32">
        {error ? (
          <div className="bg-white dark:bg-[#1a1c1e] p-12 rounded-3xl border border-gray-100 dark:border-white/5 text-center shadow-xl">
            <div className="w-20 h-20 bg-rose-50 dark:bg-rose-950/20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-rose-500">
              <AlertCircle size={48} />
            </div>
            <h3 className="text-xl font-bold text-[#00204a] dark:text-white mb-4 uppercase">
              Access Restricted
            </h3>
            <p className="text-sm font-medium text-gray-500 mb-10 max-w-sm mx-auto">{error}</p>
            <button
              onClick={() => navigate(-1)}
              className="px-10 h-14 bg-[#00204a] text-white rounded-xl font-bold text-[10px] uppercase shadow-md active:scale-95 transition-all"
            >
              Retreat
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative group">
                <Search
                  className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#349DC5] transition-colors"
                  size={22}
                />
                <input
                  type="text"
                  placeholder="Filter by congregation signature..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-16 pl-14 pr-6 bg-white dark:bg-[#1a1c1e] border-none rounded-2xl shadow-sm focus:ring-4 ring-[#349DC5]/10 outline-none text-sm font-bold dark:text-white transition-all"
                />
              </div>
              <div className="bg-white dark:bg-[#1a1c1e] px-8 h-16 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 flex items-center justify-center text-[11px] font-black text-[#349DC5] uppercase tracking-widest shrink-0">
                {filteredChurches.length} Hubs Found
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredChurches.length > 0 ? (
                filteredChurches.map((ch) => (
                  <motion.div
                    layout
                    key={ch._id}
                    className="group bg-white dark:bg-[#1a1c1e] rounded-[40px] p-8 border border-gray-100 dark:border-white/5 shadow-sm hover:border-[#349DC5]/30 transition-all flex flex-col"
                  >
                    <div className="flex items-start justify-between mb-8">
                      <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-3xl flex items-center justify-center text-gray-300 group-hover:bg-[#349DC5]/10 group-hover:text-[#349DC5] transition-all">
                        <Building2 size={32} />
                      </div>
                      <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all">
                        <CheckCircle2 size={18} />
                      </div>
                    </div>
                    <div className="mb-8 flex-1">
                      <h4 className="text-xl font-bold text-[#00204a] dark:text-white leading-tight uppercase truncate">
                        {ch.name}
                      </h4>
                      <p className="text-[10px] font-bold text-gray-400 uppercase mt-2 tracking-widest">
                        Authority Level: Global
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-10">
                      <div className="bg-gray-50/50 dark:bg-white/2 p-4 rounded-2xl">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield size={14} className="text-[#349DC5]" />
                          <span className="text-[9px] font-black text-gray-400 uppercase">
                            Registry Lead
                          </span>
                        </div>
                        <p className="text-xs font-black text-[#00204a] dark:text-white truncate">
                          {ch.superAdmins[0]?.firstName || "Unassigned"}
                        </p>
                      </div>
                      <div className="bg-gray-50/50 dark:bg-white/2 p-4 rounded-2xl">
                        <div className="flex items-center gap-2 mb-2">
                          <Users size={16} className="text-emerald-500" />
                          <span className="text-[9px] font-black text-gray-400 uppercase">
                            Total Squads
                          </span>
                        </div>
                        <p className="text-xs font-black text-[#00204a] dark:text-white">
                          {ch.unitLeaders?.length || 0} Units
                        </p>
                      </div>
                    </div>

                    <button
                      disabled={!!switching}
                      onClick={() => handleSwitch(ch._id)}
                      className={cn(
                        "w-full h-15 rounded-2xl font-bold text-[10px] uppercase flex items-center justify-center gap-3 transition-all active:scale-95 shadow-md",
                        switching === ch._id
                          ? "bg-gray-100 text-gray-400"
                          : "bg-[#00204a] text-white hover:bg-[#349DC5]",
                      )}
                    >
                      {switching === ch._id ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : (
                        <>
                          <span>Establish Control</span>
                          <ChevronRight size={16} />
                        </>
                      )}
                    </button>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full py-32 text-center bg-white dark:bg-[#1a1c1e] rounded-[48px] border-2 border-dashed border-gray-100 dark:border-white/5">
                  <LayoutGrid size={48} className="text-gray-200 mx-auto mb-6" />
                  <p className="text-xs font-bold text-gray-400 uppercase">No context matched</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <footer className="mt-12 py-12 border-t border-gray-100 dark:border-white/5 flex flex-col items-center gap-4 opacity-40">
        <Shield size={20} className="text-[#349DC5]" />
        <p className="text-[9px] font-bold uppercase tracking-widest text-[#00204a] dark:text-white">
          STREAMS OF JOY GLOBAL HQ • SUPREME COMMAND
        </p>
      </footer>
    </div>
  );
}
