import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Building2,
  ChevronDown,
  X,
  CheckCircle2,
  AlertCircle,
  Layers,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "../../../api/client";
import { BASE_URl } from "../../../api/users";
import AsyncStorage from "../../../utils/AsyncStorage";
interface UnitItem {
  _id: string;
  name: string;
  ministryName?: string | null;
  leaderName?: string | null;
}
export default function SuperAdminAddUnitScreen() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [churchId, setChurchId] = useState("");
  const [ministries, setMinistries] = useState<string[]>([]);
  const [selectedMinistry, setSelectedMinistry] = useState("");
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [name, setName] = useState("");
  const [showMinistryPicker, setShowMinistryPicker] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }
      const [meRes, unitsRes] = await Promise.all([
        apiClient.get(`/api/users/me`),
        apiClient.get(`/api/units?churchId=${AsyncStorage.getItem("activeChurchId") || ""}`),
      ]);
      const user = meRes.data?.user;
      const cid = user?.church?._id || user?.church;
      if (!cid) throw new Error("Church context missing");
      setChurchId(cid);

      const churchRes = await apiClient.get(`/api/churches/${cid}`);
      const mins = (churchRes.data?.church?.ministries || [])
        .map((m: any) => m.name)
        .filter(Boolean);
      setMinistries(mins);
      if (mins.length > 0) setSelectedMinistry(mins[0]);
      setUnits(unitsRes.data?.units || []);
    } catch (e: any) {
      toast.error(e.message || "Failed to load church data");
    } finally {
      setLoading(false);
    }
  }, [navigate]);
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  const existingNames = useMemo(
    () => new Set(units.map((u) => (u.name || "").trim().toLowerCase())),
    [units],
  );
  const suggestions = useMemo(() => {
    const t = name.trim().toLowerCase();
    if (!t || t.length < 2) return [];
    const pool = Array.from(new Set(units.map((u) => u.name)));
    return pool
      .filter((n) => n.toLowerCase().includes(t) && n.toLowerCase() !== t)
      .slice(0, 4);
  }, [name, units]);
  const canSubmit =
    !!selectedMinistry &&
    !!name.trim() &&
    !existingNames.has(name.trim().toLowerCase());
  const handleAddUnit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const payload = {
        name: name.trim(),
        ministryName: selectedMinistry,
        churchId,
      };
      const res = await apiClient.post(`/api/units`, payload);
      if (res.data?.ok) {
        setShowSuccess(true);
        setName("");
        fetchData();
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to create unit");
    } finally {
      setSubmitting(false);
    }
  };
  if (loading && units.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  return (
    <div className="pb-24 max-w-4xl mx-auto px-4 pt-6 min-h-screen bg-background dark:bg-dark-background">
      <header className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-surface dark:bg-dark-surface text-text-muted border border-border dark:border-dark-border shadow-sm active:scale-95 transition-all"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-text-primary dark:text-dark-text-primary uppercase pr-4 border-r border-border dark:border-dark-border">
          Manage Units
        </h1>
        <div className="flex-1 overflow-hidden">
          <p className="text-[10px] font-bold text-text-muted uppercase truncate">
            Structure Setup
          </p>
        </div>
      </header>
      {/* Hero Input Section */}
      <section className="bg-surface dark:bg-dark-surface rounded-[32px] p-8 shadow-md border border-border dark:border-dark-border mb-10">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
            <Plus size={20} />
          </div>
          <h2 className="font-bold text-text-primary dark:text-dark-text-primary">
            Create New Unit
          </h2>
        </div>
        <div className="space-y-6">
          {/* Ministry Picker */}
          <div className="relative">
            <label className="text-[10px] font-bold text-text-muted uppercase pl-1 mb-2 block tracking-widest">
              Origin Ministry
            </label>
            <button
              onClick={() => setShowMinistryPicker(!showMinistryPicker)}
              className="w-full h-12 bg-background dark:bg-dark-background rounded-2xl px-5 flex items-center justify-between group transition-all border border-border dark:border-dark-border hover:border-primary/50"
            >
              <div className="flex items-center gap-3">
                <Building2 size={18} className="text-primary" />
                <span className="text-sm font-bold text-text-primary dark:text-dark-text-primary">
                  {selectedMinistry || "Select a ministry"}
                </span>
              </div>
              <ChevronDown
                size={18}
                className={cn(
                  "text-text-muted transition-transform",
                  showMinistryPicker && "rotate-180",
                )}
              />
            </button>
            <AnimatePresence>
              {showMinistryPicker && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute z-50 left-0 right-0 top-full mt-2 bg-surface dark:bg-dark-surface rounded-2xl shadow-xl border border-border dark:border-dark-border overflow-hidden"
                >
                  {ministries.map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        setSelectedMinistry(m);
                        setShowMinistryPicker(false);
                      }}
                      className="w-full px-5 py-4 text-left text-sm font-bold hover:bg-background dark:hover:bg-dark-background transition-colors border-b border-border last:border-none dark:border-dark-border text-text-primary dark:text-dark-text-primary"
                    >
                      {m}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {/* Unit Name Input */}
          <div className="relative">
            <label className="text-[10px] font-bold text-text-muted uppercase pl-1 mb-2 block tracking-widest">
              Unit Name
            </label>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Protocol Alpha"
                  className="w-full h-12 bg-background dark:bg-dark-background rounded-2xl px-5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/50 transition-all text-text-primary dark:text-dark-text-primary border border-border dark:border-dark-border"
                />
                {name && (
                  <button
                    onClick={() => setName("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <button
                disabled={!canSubmit || submitting}
                onClick={handleAddUnit}
                className="h-12 px-8 bg-primary text-white rounded-2xl font-bold text-[10px] uppercase shadow-lg shadow-primary/20 disabled:opacity-50 active:scale-95 transition-all whitespace-nowrap"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Create Unit"
                )}
              </button>
            </div>
            {/* Warnings & Suggestions */}
            <AnimatePresence>
              {!!name.trim() &&
                existingNames.has(name.trim().toLowerCase()) && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 flex items-center gap-2 text-red-500 text-[10px] font-bold uppercase pl-1"
                  >
                    <AlertCircle size={12} />
                    <span>Unit identity already exists</span>
                  </motion.div>
                )}
              {suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 flex flex-wrap gap-2"
                >
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => setName(s)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50/50 dark:bg-blue-900/10 rounded-full text-[10px] font-bold text-[#349DC5] hover:bg-blue-100 transition-colors"
                    >
                      <Sparkles size={10} /> {s}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>
      {/* Existing Units List */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-bold text-[#00204a] dark:text-gray-400 uppercase">
            Current Units
          </h3>
          <div className="px-3 py-1 bg-gray-50 dark:bg-[#1e1e1e] rounded-full text-[10px] font-bold text-gray-400 border border-gray-100 dark:border-[#333]">
            {units.length} TOTAL
          </div>
        </div>
        <div className="grid gap-4">
          {units.length > 0 ? (
            units.map((u) => (
              <div
                key={u._id}
                className="bg-surface dark:bg-dark-surface p-5 rounded-[24px] shadow-sm border border-border dark:border-dark-border flex items-center justify-between group hover:border-primary/30 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-background dark:bg-dark-background rounded-2xl flex items-center justify-center text-text-muted group-hover:bg-primary/10 group-hover:text-primary transition-all">
                    <Layers size={22} />
                  </div>
                  <div>
                    <h4 className="font-bold text-text-primary dark:text-dark-text-primary leading-tight">
                      {u.name}
                    </h4>
                    <p className="text-[10px] font-bold text-text-muted uppercase mt-1">
                      {u.ministryName || "General Ministry"} • {u.leaderName || "No leader assigned"}
                    </p>
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-background dark:bg-dark-background text-text-muted group-hover:text-primary transition-all border border-border dark:border-dark-border">
                  <ChevronRight size={18} />
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 text-center">
              <div className="w-16 h-16 bg-gray-50 dark:bg-[#1e1e1e] rounded-3xl flex items-center justify-center mx-auto mb-4 text-gray-200">
                <Layers size={32} />
              </div>
              <p className="text-sm text-gray-400 font-bold uppercase">
                Workspace is empty
              </p>
            </div>
          )}
        </div>
      </section>
      {/* Success Modal */}
      <AnimatePresence>
        {showSuccess && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSuccess(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white dark:bg-[#1e1e1e] w-full max-w-sm rounded-[40px] p-8 text-center shadow-md overflow-hidden"
            >
              {/* Decoration */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-green-50/50 rounded-full blur-2xl" />
              <div className="w-20 h-20 bg-green-50 dark:bg-green-900/10 rounded-3xl flex items-center justify-center mx-auto mb-6 text-green-500">
                <CheckCircle2 size={40} />
              </div>
              <h3 className="text-2xl font-bold text-[#00204a] dark:text-white mb-2">
                Unit Created!
              </h3>
              <p className="text-sm text-gray-500 mb-8 font-medium">
                The new operational unit has been successully registered in the
                system cloud.
              </p>
              <button
                onClick={() => setShowSuccess(false)}
                className="w-full h-14 bg-[#10B981] text-white font-bold rounded-3xl shadow shadow-green-100 dark:shadow-none uppercase active:scale-95 transition-all"
              >
                Confirm & Dismiss
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join("");
}
