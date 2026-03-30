import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  User,
  CheckCircle2,
  X,
  RefreshCw,
  ChevronRight,
  Layers,
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import AsyncStorage from "../utils/AsyncStorage";
import { BASE_URl } from "../api/users";
import RoleSwitchCountdown from "./RoleSwitchCountdown";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRoleSwitched?: () => void;
}

export default function RoleSwitcher({
  isOpen,
  onClose,
  onRoleSwitched,
}: Props) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [unitNames, setUnitNames] = useState<Record<string, string>>({});
  const [churchName, setChurchName] = useState("");
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [showCountdown, setShowCountdown] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const res = await axios.get(`${BASE_URl}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.ok) {
        const u = res.data.user;
        setProfile(u);
        const cName = u.church?.name || u.activeChurch?.name || u.churchName || "";
        setChurchName(cName);

        const ids = new Set<string>();
        (u.roles || []).forEach((r: any) => {
          const uId = r.unit?._id || r.unit || r.unitId;
          if (uId) ids.add(String(uId));
        });

        if (ids.size > 0) {
          const names: Record<string, string> = { ...unitNames };
          await Promise.all(
            Array.from(ids).map(async (id: string) => {
              if (names[id]) return;
              try {
                const uRes = await axios.get(`${BASE_URl}/api/units/${id}/summary`, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                if (uRes.data?.unit?.name) names[id] = uRes.data.unit.name;
              } catch {}
            })
          );
          setUnitNames(names);
        }

        const currentUnitId = await AsyncStorage.getItem("activeUnitId");
        const activeUId = currentUnitId === "global" ? null : currentUnitId;
        const initialKey = `${u.activeRole}::${activeUId || "global"}`;
        setSelectedRole(u.activeRole);
        setSelectedKey(initialKey);
      }
    } catch (e) {
      console.error("RoleSwitcher Fetch Error:", e);
    } finally {
      setLoading(false);
    }
  }, [unitNames]);

  useEffect(() => {
    if (isOpen) fetchData();
    else {
      setShowCountdown(false);
      setIsSwitching(false);
    }
  }, [isOpen]);

  const handleSelect = (role: string, unitId?: string) => {
    const key = `${role}::${unitId || "global"}`;
    setSelectedRole(role);
    setSelectedKey(key);
  };

  const handleConfirm = () => {
    if (!selectedRole || !selectedKey) return;
    setShowCountdown(true);
  };

  const executeSwitch = async () => {
    setIsSwitching(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const unitId = selectedKey?.split("::")[1];
      const payload = {
        role: selectedRole,
        activeUnitId: unitId && unitId !== "global" ? unitId : null,
      };
      const res = await axios.post(`${BASE_URl}/api/auth/switch-role`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.token) {
        await AsyncStorage.setItem("token", res.data.token);
        if (payload.activeUnitId)
          await AsyncStorage.setItem("activeUnitId", payload.activeUnitId);
        else await AsyncStorage.setItem("activeUnitId", "global");

        const meRes = await axios.get(`${BASE_URl}/api/users/me`, {
          headers: { Authorization: `Bearer ${res.data.token}` },
        });
        if (meRes.data?.user) {
          await AsyncStorage.setItem("user", JSON.stringify(meRes.data.user));
        }
        toast.success(`Switched to acting as ${selectedRole}`);
        onClose();
        if (onRoleSwitched) onRoleSwitched();
        else navigate("/home");
        setTimeout(() => window.location.reload(), 500);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Switch failed");
    } finally {
      setIsSwitching(false);
      setShowCountdown(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && !showCountdown && (
          <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-lg bg-white dark:bg-[#1a1c1e] rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl border-t sm:border border-white/20 dark:border-white/5 pb-safe"
            >
              <div className="px-8 pt-8 pb-6 flex items-center justify-between border-b border-gray-100 dark:border-white/5">
                <div>
                  <h3 className="text-xl font-bold text-[#00204a] dark:text-white flex items-center gap-2">
                    <RefreshCw className={cn("w-5 h-5 text-[#349DC5]", loading && "animate-spin")} />
                    Switch Active Identity
                  </h3>
                  <p className="text-sm text-gray-500 font-bold uppercase mt-1">Authorized Roles</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl bg-gray-50 dark:bg-white/5 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 max-h-[50vh] overflow-y-auto no-scrollbar space-y-3">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-10 h-10 border-4 border-[#349DC5] border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-[0.2em]">Syncing permissions...</p>
                  </div>
                ) : (
                  profile?.roles?.map((r: any, idx: number) => {
                    const unitId = r.unit?._id || r.unit || r.unitId;
                    const uIdStr = unitId && unitId !== "global" ? String(unitId) : "global";
                    const itemKey = `${r.role}::${uIdStr}`;
                    const isActiveFlag =
                      profile.activeRole === r.role &&
                      (uIdStr === "global" ? !profile.activeUnitId : String(profile.activeUnitId) === uIdStr);
                    const isItemSelected = selectedKey === itemKey;
                    let displayLabel = r.role.replace(/([A-Z])/g, " $1").trim();
                    let subLabel =
                      r.ministryName || unitNames[unitId] || r.unitName || "Global Access";
                    if (r.role === "SuperAdmin") {
                      displayLabel = "Super Admin";
                      subLabel = churchName || "Central Administration";
                    }
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelect(r.role, unitId)}
                        className={cn(
                          "w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left group relative overflow-hidden",
                          isItemSelected
                            ? "border-[#349DC5] bg-blue-50/50 dark:bg-[#349DC5]/10"
                            : "border-gray-50 dark:border-white/5 hover:border-[#349DC5]/30 hover:bg-gray-50 dark:hover:bg-white/5"
                        )}
                      >
                        <div
                          className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center transition-all shrink-0",
                            isItemSelected
                              ? "bg-[#349DC5] text-white shadow-lg shadow-blue-500/20"
                              : "bg-gray-100 dark:bg-white/5 text-gray-400 group-hover:text-[#349DC5]"
                          )}
                        >
                          {r.role === "SuperAdmin" ? (
                            <Shield size={22} />
                          ) : r.role === "MinistryAdmin" ? (
                            <Layers size={22} />
                          ) : (
                            <User size={22} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4
                            className={cn(
                              "text-sm font-bold transition-colors uppercase",
                              isItemSelected ? "text-[#349DC5]" : "text-[#00204a] dark:text-white"
                            )}
                          >
                            {displayLabel}
                          </h4>
                          <p className="text-[10px] font-bold text-gray-400 uppercase truncate mt-0.5">
                            {subLabel}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isActiveFlag && (
                            <span className="text-[9px] font-bold text-white bg-[#349DC5] px-2 py-0.5 rounded-full shadow-sm">
                              CURRENT
                            </span>
                          )}
                          {isItemSelected ? (
                            <CheckCircle2 size={18} className="text-[#349DC5]" />
                          ) : (
                            <ChevronRight
                              size={18}
                              className="text-gray-200 group-hover:text-[#349DC5] transition-all"
                            />
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="p-6 bg-gray-50 dark:bg-white/5 border-t border-gray-100 dark:border-white/5 flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 h-12 bg-white dark:bg-[#1a1c1e] text-[#00204a] dark:text-white rounded-2xl text-[10px] font-bold uppercase border border-gray-200 dark:border-white/10 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!selectedKey || loading}
                  className="flex-[2] h-12 bg-[#349DC5] text-white rounded-2xl text-[10px] font-bold uppercase shadow-lg shadow-blue-500/20 hover:bg-[#2d8ab0] transition-all disabled:opacity-50"
                >
                  Switch Identity
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <RoleSwitchCountdown
        isOpen={showCountdown}
        targetRole={selectedRole}
        loading={isSwitching}
        onCancel={() => setShowCountdown(false)}
        onConfirmNow={executeSwitch}
        onAutoExecute={executeSwitch}
      />
    </>
  );
}
