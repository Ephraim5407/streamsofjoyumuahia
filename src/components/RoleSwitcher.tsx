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
              className="relative w-full max-w-lg bg-surface dark:bg-dark-surface rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl border-t sm:border border-border dark:border-dark-border pb-safe"
            >
              <div className="px-8 pt-8 pb-6 flex items-center justify-between border-b border-border-light dark:border-dark-border-light">
                <div>
                  <h3 className="text-xl font-bold text-text-primary dark:text-dark-text-primary flex items-center gap-2">
                    <RefreshCw className={cn("w-5 h-5 text-primary", loading && "animate-spin")} />
                    Switch Active Identity
                  </h3>
                  <p className="text-sm text-text-muted font-bold uppercase mt-1">Authorized Roles</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl bg-surface-alt dark:bg-dark-surface-alt text-text-muted hover:text-text-primary dark:hover:text-dark-text-primary transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 max-h-[50vh] overflow-y-auto no-scrollbar space-y-3">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-xs text-text-muted font-bold uppercase tracking-[0.2em]">Syncing permissions...</p>
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
                            ? "border-primary bg-primary-muted dark:bg-dark-primary-muted"
                            : "border-border-light dark:border-dark-border-light hover:border-primary/30 hover:bg-surface-alt dark:hover:bg-dark-surface-alt"
                        )}
                      >
                        <div
                          className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center transition-all shrink-0",
                            isItemSelected
                              ? "bg-primary text-white shadow-lg shadow-primary/20"
                              : "bg-surface-alt dark:bg-dark-surface-alt text-text-muted group-hover:text-primary"
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
                              isItemSelected ? "text-primary" : "text-text-primary dark:text-dark-text-primary"
                            )}
                          >
                            {displayLabel}
                          </h4>
                          <p className="text-[10px] font-bold text-text-muted uppercase truncate mt-0.5">
                            {subLabel}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isActiveFlag && (
                            <span className="text-[9px] font-bold text-white bg-primary px-2 py-0.5 rounded-full shadow-sm">
                              CURRENT
                            </span>
                          )}
                          {isItemSelected ? (
                            <CheckCircle2 size={18} className="text-primary" />
                          ) : (
                            <ChevronRight
                              size={18}
                              className="text-border dark:text-dark-border group-hover:text-primary transition-all"
                            />
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="p-6 bg-surface-alt dark:bg-dark-surface-alt border-t border-border-light dark:border-dark-border-light flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 h-12 bg-surface dark:bg-dark-surface text-text-primary dark:text-dark-text-primary rounded-2xl text-[10px] font-bold uppercase border border-border dark:border-dark-border hover:bg-surface-alt transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!selectedKey || loading}
                  className="flex-[2] h-12 bg-primary text-white rounded-2xl text-[10px] font-bold uppercase shadow-lg shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50"
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
