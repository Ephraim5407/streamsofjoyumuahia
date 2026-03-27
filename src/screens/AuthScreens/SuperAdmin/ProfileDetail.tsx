import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Shield,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  Settings,
  ChevronRight,
  ShieldCheck,
  Users,
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { BASE_URl } from "../../../api/users";
import AsyncStorage from "../../../utils/AsyncStorage";

const PRIMARY = "#349DC5";

interface UserRole {
  role: string;
  unit?: any;
  ministryName?: string;
}

interface UserProfile {
  avatar?: string | null;
  address?: any;
  [key: string]: any;
}

interface User {
  _id: string;
  firstName: string;
  surname: string;
  middleName?: string;
  email?: string;
  phone?: string;
  roles: UserRole[];
  approved: boolean;
  church?: any;
  churchName?: string;
  profile?: UserProfile;
  multi?: boolean;
  superAdminPending?: boolean;
  activeRole?: string;
}

const resolveAvatarUri = (raw?: string | null): string | undefined => {
  if (!raw) return undefined;
  const trimmed = String(raw).trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `${BASE_URl.replace(/\/$/, "")}/${trimmed.replace(/^\/+/, "")}`;
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

export default function SuperAdminProfileDetail() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<Record<string, boolean>>({});
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [conflictModal, setConflictModal] = useState<{
    visible: boolean;
    user: User | null;
    role: string | null;
  }>({ visible: false, user: null, role: null });

  const isOwnProfile = useMemo(
    () => user && currentUser && user._id === currentUser._id,
    [user, currentUser],
  );

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("Authentication failed");
      const userRaw = await AsyncStorage.getItem("user");
      if (userRaw) setCurrentUser(JSON.parse(userRaw));

      const [respAll, resp] = await Promise.all([
        axios.get(`${BASE_URl}/api/users`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${BASE_URl}/api/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (respAll.data?.users) setAllUsers(respAll.data.users);
      if (resp.data?.user) setUser(resp.data.user);
    } catch (err: any) {
      toast.error(err.message || "Registry access denied");
      navigate(-1);
    } finally {
      setLoading(false);
    }
  }, [userId, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const fullName = useMemo(() => {
    if (!user) return "";
    return `${user.firstName || ""} ${user.middleName ? user.middleName + " " : ""}${user.surname || ""}`.trim();
  }, [user]);

  const churchName = user?.church?.name || user?.churchName || "";
  const avatarUri = resolveAvatarUri(user?.profile?.avatar);

  const hasRole = (roleName: string) => {
    if (!user?.roles) return false;
    if (roleName === "YouthLeader") {
      return user.roles.some(
        (r: any) => r.role === "MinistryAdmin" && r.ministryName === "Youth and Singles Church",
      );
    }
    return user.roles.some((r: any) => (r?.role || "").toLowerCase() === roleName.toLowerCase());
  };

  const hasRoleForUser = (u: User, roleName: string) => {
    if (!u?.roles) return false;
    if (roleName === "YouthLeader") {
      return u.roles.some(
        (r: any) => r.role === "MinistryAdmin" && r.ministryName === "Youth and Singles Church",
      );
    }
    return u.roles.some((r: any) => (r?.role || "").toLowerCase() === roleName.toLowerCase());
  };

  const performToggle = async (roleName: string, shouldAdd: boolean) => {
    if (!user) return;
    const token = await AsyncStorage.getItem("token");
    const key = `${roleName}-${shouldAdd ? "add" : "remove"}`;
    setToggling((prev) => ({ ...prev, [key]: true }));
    try {
      const resp = await axios.post(
        `${BASE_URl}/api/users/${user._id}/assign-role`,
        { role: roleName, assign: shouldAdd },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (resp.data?.ok) {
        const serverUser = resp.data.user;
        if (serverUser) {
          setUser(serverUser);
          if (isOwnProfile) {
            setCurrentUser(serverUser);
            await AsyncStorage.setItem("user", JSON.stringify(serverUser));
          }
        }
        toast.success(shouldAdd ? `Assigned correctly` : `Revoked correctly`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setToggling((prev) => ({ ...prev, [key]: false }));
    }
  };

  const toggleRole = async (roleName: string, value: boolean) => {
    if (value) {
      const conflict = allUsers.find((u) => u._id !== user?._id && hasRoleForUser(u, roleName));
      if (conflict) {
        setConflictModal({ visible: true, user: conflict, role: roleName });
        return;
      }
    }
    await performToggle(roleName, value);
  };

  const handleRemoveConflictAccess = async () => {
    const { user: conflictUser, role } = conflictModal;
    if (!conflictUser || !role) return;
    const token = await AsyncStorage.getItem("token");
    try {
      await Promise.all(
        conflictUser.roles.map((r) =>
          axios.post(
            `${BASE_URl}/api/users/${conflictUser._id}/assign-role`,
            {
              role: r.role === "FinancialSecretary" ? "FinancialSecretary" : r.role,
              assign: false,
            },
            { headers: { Authorization: `Bearer ${token}` } },
          ),
        ),
      );
      setAllUsers((prev) =>
        prev.map((u) => (u._id === conflictUser._id ? { ...u, roles: [] } : u)),
      );
      setConflictModal({ visible: false, user: null, role: null });
      if (role) await performToggle(role, true);
    } catch {
      toast.error("Conflict resolution failed");
    }
  };

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-[#0f1218]">
        <div className="w-12 h-12 border-4 border-[#349DC5] border-t-transparent rounded-full animate-spin" />
      </div>
    );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f1218] flex flex-col">
      <div className="bg-[#00204a] p-10 pb-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6 text-white">
            <button
              onClick={() => navigate(-1)}
              className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-all active:scale-95"
            >
              <ChevronLeft size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-bold uppercase leading-none mb-2">Personnel File</h1>
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest leading-none">
                {user.activeRole || "Member Registry"} Hub
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/sa/edit-profile/${user._id}`)}
            className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-white hover:bg-[#349DC5] transition-all"
          >
            <Settings size={22} />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full px-6 -mt-10 flex-1 pb-32">
        <div className="bg-white dark:bg-[#1a1c1e] p-10 rounded-[40px] shadow-xl border border-gray-100 dark:border-white/5 flex flex-col items-center text-center">
          <div className="relative mb-8">
            <div
              className="w-32 h-32 rounded-3xl border-4 overflow-hidden shadow-xl p-1 bg-white"
              style={{ borderColor: PRIMARY }}
            >
              {avatarUri ? (
                <img
                  src={avatarUri}
                  alt="avatar"
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                <div className="w-full h-full bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                  <User size={64} className="text-gray-300" />
                </div>
              )}
            </div>
            {user.approved && (
              <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-xl shadow-lg border-4 border-white dark:border-[#1a1c1e]">
                <ShieldCheck size={20} />
              </div>
            )}
          </div>
          <h2 className="text-2xl font-black text-[#00204a] dark:text-white uppercase leading-tight mb-2">
            {fullName}
          </h2>
          <p className="text-[11px] font-black uppercase tracking-widest text-[#349DC5] mb-8">
            Global High Command {churchName ? `· ${churchName}` : ""}
          </p>

          <div className="w-full h-px bg-gray-100 dark:bg-white/5 mb-8" />

          <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center justify-center text-[#349DC5]">
                <Phone size={20} />
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Contact</p>
                <p className="text-xs font-black text-[#00204a] dark:text-white">
                  {user.phone || "N/A"}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center justify-center text-[#349DC5]">
                <Mail size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Email Base</p>
                <p className="text-xs font-black text-[#00204a] dark:text-white truncate max-w-[150px]">
                  {user.email || "N/A"}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center justify-center text-[#349DC5]">
                <MapPin size={20} />
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Deployment Zone</p>
                <p className="text-xs font-black text-[#00204a] dark:text-white">Global Base</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 space-y-12">
          {!isOwnProfile && (
            <section className="space-y-6">
              <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">
                Registry Verification
              </h3>
              <div className="bg-white dark:bg-[#1a1c1e] p-8 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl flex items-center justify-center text-emerald-500">
                    <CheckCircle size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-[#00204a] dark:text-white uppercase">
                      Approved Member
                    </h4>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">
                      Identity verified by High Command
                    </p>
                  </div>
                </div>
                <div className="h-8 px-4 bg-emerald-500 text-white rounded-lg flex items-center justify-center text-[10px] font-black uppercase">
                  ACTIVE
                </div>
              </div>
            </section>
          )}

          {isOwnProfile && (
            <section className="space-y-6 pb-20">
              <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">
                Strategic Access Control
              </h3>

              <div className="grid gap-4">
                {[
                  {
                    id: "FinancialSecretary",
                    label: "Financial Secretary",
                    desc: "Authorize fiscal intelligence rights",
                    icon: <Shield size={20} />,
                  },
                  {
                    id: "YouthLeader",
                    label: "Youth Operations Leader",
                    desc: "Enable ministry command for Youth Hub",
                    icon: <Users size={20} />,
                  },
                ].map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between bg-white dark:bg-[#1a1c1e] p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm group hover:border-[#349DC5]/30 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center justify-center text-[#349DC5] transition-transform group-hover:scale-110">
                        {item.icon}
                      </div>
                      <div>
                        <p className="text-sm font-black text-[#00204a] dark:text-white uppercase leading-none mb-1.5">
                          {item.label}
                        </p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleRole(item.id, !hasRole(item.id))}
                      disabled={toggling[`${item.id}-add`] || toggling[`${item.id}-remove`]}
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative p-1 shrink-0",
                        hasRole(item.id) ? "bg-emerald-500" : "bg-gray-200 dark:bg-gray-800",
                      )}
                    >
                      <div
                        className={cn(
                          "w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                          hasRole(item.id) ? "ml-6" : "ml-0",
                        )}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      <AnimatePresence>
        {conflictModal.visible && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConflictModal({ visible: false, user: null, role: null })}
              className="absolute inset-0 bg-[#00204a]/70 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-white dark:bg-[#1a1c1e] rounded-[40px] p-10 shadow-2xl overflow-hidden"
            >
              <div className="w-16 h-1 bg-[#349DC5] mx-auto rounded-full mb-8" />
              <h3 className="text-xl font-black text-[#00204a] dark:text-white uppercase text-center mb-4">
                Conflict Detected
              </h3>
              <p className="text-xs font-bold text-gray-400 uppercase text-center leading-relaxed mb-10 tracking-widest">
                Target authority role is already occupied by the following personnel:
              </p>
              {conflictModal.user && (
                <div className="bg-gray-50 dark:bg-white/5 rounded-3xl p-6 flex items-center gap-4 mb-10 border border-gray-100 dark:border-white/5">
                  <div className="w-14 h-14 rounded-full border-2 border-[#349DC5] p-0.5 overflow-hidden shrink-0">
                    <img
                      src={resolveAvatarUri(conflictModal.user.profile?.avatar) || ""}
                      alt="conf"
                      className="w-full h-full object-cover rounded-full bg-white"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-[#00204a] dark:text-white truncate uppercase">
                      {conflictModal.user.firstName} {conflictModal.user.surname}
                    </p>
                    <p className="text-[10px] font-bold text-rose-500 uppercase mt-1">
                      Current Holder
                    </p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setConflictModal({ visible: false, user: null, role: null })}
                  className="h-14 bg-gray-100 dark:bg-white/5 text-[10px] font-black uppercase tracking-widest rounded-2xl text-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRemoveConflictAccess}
                  className="h-14 bg-[#00204a] text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl active:scale-95"
                >
                  Confirm Takeover
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
