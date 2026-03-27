import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Camera,
  Phone,
  Mail,
  Lock,
  Bell,
  LogOut,
  Trash2,
  Edit2,
  Shield,
  X,
  ChevronRight,
  Save,
  Key,
  Users,
  Flame,
  Award,
  User,
  Globe,
  ArrowRight,
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { BASE_URl } from "../../api/users";
import AsyncStorage from "../../utils/AsyncStorage";
import { AppEventBus } from "../../utils/AppEventBus";

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

function MetricCard({ label, value, icon, desc }: any) {
  return (
    <div className="bg-white dark:bg-[#1a1c1e] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 group hover:border-[#349DC5]/20 transition-all">
      <div className="w-12 h-12 bg-gray-50 dark:bg-white/5 rounded-xl flex items-center justify-center mb-6 text-gray-400 group-hover:bg-[#349DC5] group-hover:text-white transition-all">
        {icon}
      </div>
      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">
        {label}
      </p>
      <h4 className="text-2xl font-bold text-[#00204a] dark:text-white mb-2">
        {value}
      </h4>
      <p className="text-[9px] font-bold text-[#349DC5] uppercase opacity-0 group-hover:opacity-100 transition-opacity">
        {desc}
      </p>
    </div>
  );
}

function MenuButton({ icon, label, desc, onClick, danger }: any) {
  return (
    <button
      onClick={onClick}
      className="w-full group bg-white dark:bg-[#1a1c1e] p-5 pr-6 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm hover:translate-x-1 transition-all flex items-center gap-5"
    >
      <div
        className={cn(
          "w-14 h-14 rounded-xl flex items-center justify-center shrink-0 border border-gray-100 dark:border-white/5 transition-all text-gray-400",
          danger
            ? "bg-rose-50 dark:bg-rose-900/10 text-rose-500"
            : "bg-gray-50 dark:bg-white/5 group-hover:bg-[#349DC5]/10 group-hover:text-[#349DC5]",
        )}
      >
        {icon}
      </div>
      <div className="flex-1 text-left">
        <h4
          className={cn(
            "text-sm font-bold uppercase leading-none mb-1.5",
            danger ? "text-rose-500" : "text-[#00204a] dark:text-white",
          )}
        >
          {label}
        </h4>
        <p className="text-[10px] font-bold text-gray-400 uppercase opacity-60">
          {desc}
        </p>
      </div>
      <ChevronRight
        size={20}
        className="text-gray-200 group-hover:text-[#349DC5] transition-colors"
      />
    </button>
  );
}

function Input({ label, value, onChange, type = "text", disabled = false }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-2">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          "w-full h-14 bg-white dark:bg-[#1c1e20] border-2 border-gray-100 dark:border-white/5 focus:border-[#349DC5] outline-none rounded-xl px-6 text-sm font-bold transition-all placeholder:text-gray-200",
          disabled && "opacity-50 cursor-not-allowed bg-gray-50/50",
        )}
      />
    </div>
  );
}

function Toggle({ label, checked, onChange }: any) {
  return (
    <div className="flex items-center justify-between p-5 bg-gray-50 dark:bg-white/5 rounded-xl border border-transparent hover:border-gray-100 dark:hover:border-white/10 transition-all">
      <span className="text-[11px] font-bold text-[#00204a] dark:text-gray-200 uppercase">
        {label}
      </span>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          "w-12 h-7 rounded-full relative transition-colors p-1 border-2",
          checked
            ? "bg-[#349DC5] border-transparent"
            : "bg-transparent border-gray-200 dark:border-white/10",
        )}
      >
        <div
          className={cn(
            "w-4 h-4 rounded-full transition-all shadow-sm",
            checked ? "translate-x-5 bg-white" : "translate-x-0 bg-gray-400",
          )}
        />
      </button>
    </div>
  );
}

export default function UniversalProfileScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const viewingUserId = queryParams.get("userId");
  const viewingUnitId = queryParams.get("unitId");
  const readOnly = !!viewingUserId;

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [unitSummary, setUnitSummary] = useState<any>(null);

  const [editForm, setEditForm] = useState({
    title: "",
    firstName: "",
    middleName: "",
    surname: "",
    phone: "",
    email: "",
  });
  const [passForm, setPassForm] = useState({ current: "", new: "", confirm: "" });
  const [notifs, setNotifs] = useState({
    reports: true,
    announcements: true,
    finance: true,
    events: true,
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }
      if (readOnly) {
        const [userRes, summaryRes] = await Promise.all([
          axios.get(`${BASE_URl}/api/users/${viewingUserId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          viewingUnitId
            ? axios.get(`${BASE_URl}/api/units/${viewingUnitId}/summary`, {
                headers: { Authorization: `Bearer ${token}` },
              })
            : Promise.resolve({ data: null }),
        ]);
        if (userRes.data?.user || userRes.data) {
          const u = userRes.data?.user || userRes.data;
          setProfile(u);
          setAvatarPreview(u?.profile?.avatar || null);
        }
        if (summaryRes.data?.ok) {
          setUnitSummary(summaryRes.data);
        }
      } else {
        const res = await axios.get(`${BASE_URl}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data?.ok) {
          const u = res.data.user;
          setProfile(u);
          setEditForm({
            title: u.title || "",
            firstName: u.firstName || "",
            middleName: u.middleName || "",
            surname: u.surname || "",
            phone: u.phone || "",
            email: u.email || "",
          });
          setAvatarPreview(u?.profile?.avatar || null);
          await AsyncStorage.setItem("user", JSON.stringify(u));
        }
      }
    } catch (e) {
      toast.error("Resource synchronization failed");
    } finally {
      setLoading(false);
    }
  }, [navigate, readOnly, viewingUserId, viewingUnitId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePickAvatar = () => {
    if (readOnly) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await axios.put(`${BASE_URl}/api/users/${profile._id}`, editForm, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.ok) {
        if (avatarFile) {
          const formData = new FormData();
          formData.append("file", avatarFile);
          formData.append("userId", profile._id);
          await axios.post(`${BASE_URl}/api/upload/profile`, formData);
        }
        toast.success("Identity updated successfully");
        AppEventBus.emit("profileRefreshed");
        setActiveModal(null);
        fetchData();
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to update record");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (passForm.new !== passForm.confirm) {
      toast.error("Hash mismatch — confirm password");
      return;
    }
    if (passForm.new.length < 6) {
      toast.error("Security criteria unmet — 6 chars min");
      return;
    }
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await axios.post(
        `${BASE_URl}/api/users/change-password`,
        { currentPassword: passForm.current, newPassword: passForm.new },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.data?.ok) {
        toast.success("Security credentials updated");
        setPassForm({ current: "", new: "", confirm: "" });
        setActiveModal(null);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Authentication update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("user");
    toast.success("Session terminated");
    navigate("/login");
  };

  if (loading && !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-[#121212]">
        <div className="w-14 h-14 border-4 border-[#349DC5] border-t-transparent rounded-full animate-spin mb-6" />
        <p className="text-[10px] font-bold text-[#349DC5] uppercase animate-pulse">
          Syncing Unified Profile...
        </p>
      </div>
    );
  }

  const fullName = [
    profile?.title,
    profile?.firstName,
    profile?.middleName,
    profile?.surname,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 pb-32">
      <header className="flex items-center gap-6 mb-12">
        <button
          onClick={() => navigate(-1)}
          className="p-3.5 rounded-2xl bg-white dark:bg-[#1a1c1e] shadow-sm border border-gray-100 dark:border-white/5 text-gray-400 hover:text-[#349DC5] transition-all active:scale-95"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-[#00204a] dark:text-white leading-none">
            {readOnly ? "Identity Overview" : "Account Management"}
          </h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase mt-2">
            User Registry | {profile?._id?.slice(-8).toUpperCase()}
          </p>
        </div>
      </header>

      <section className="mb-14">
        <div className="flex flex-col items-center text-center">
          <div
            className="relative group cursor-pointer"
            onClick={handlePickAvatar}
          >
            <div className="relative w-36 h-36 rounded-2xl border-[6px] border-white dark:border-[#1a1c1e] shadow-lg overflow-hidden bg-slate-100">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  className="w-full h-full object-cover"
                  alt="Profile"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#349DC5] bg-blue-50/50">
                  <User size={48} strokeWidth={1.5} />
                </div>
              )}
            </div>
            {!readOnly && (
              <div className="absolute -bottom-2 -right-2 p-2.5 bg-[#00204a] text-white rounded-xl shadow-md border-4 border-white dark:border-[#1a1c1e] hover:bg-[#349DC5] transition-colors">
                <Camera size={18} />
              </div>
            )}
          </div>
          <div className="mt-8 mb-8">
            <h2 className="text-3xl font-bold text-[#00204a] dark:text-white leading-none mb-4">
              {fullName || "Secure Identity"}
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <div className="px-4 py-2 bg-[#349DC5]/10 text-[#349DC5] rounded-xl flex items-center gap-2 border border-[#349DC5]/20">
                <Shield size={14} fill="currentColor" opacity={0.2} />
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {profile?.activeRole || "Global Member"}
                </span>
              </div>
              {profile?.unit?.name && (
                <div className="px-4 py-2 bg-slate-50 dark:bg-white/5 text-gray-500 rounded-xl flex items-center gap-2 border border-gray-100 dark:border-white/5">
                  <Globe size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {profile.unit.name}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
            <div className="bg-white dark:bg-[#1a1c1e] p-5 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm text-left">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                Verified Contact
              </p>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/10 rounded-lg text-[#349DC5]">
                  <Phone size={16} />
                </div>
                <span className="text-xs font-bold text-[#00204a] dark:text-white truncate">
                  {profile?.phone || "No Data"}
                </span>
              </div>
            </div>
            <div className="bg-white dark:bg-[#1a1c1e] p-5 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm text-left">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                Primary Email
              </p>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg text-emerald-500">
                  <Mail size={16} />
                </div>
                <span className="text-xs font-bold text-[#00204a] dark:text-white truncate">
                  {profile?.email || "No Data"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {readOnly && unitSummary && (
        <div className="space-y-12">
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              label="Deployment Size"
              value={unitSummary?.counts?.membersCount || 0}
              icon={<Users className="text-blue-500" />}
              desc="Active Personnel"
            />
            <MetricCard
              label="Harvest Index"
              value={unitSummary?.counts?.soulsCount || 0}
              icon={<Flame className="text-orange-500" />}
              desc="Verified Conversions"
            />
            <MetricCard
              label="Operational Honor"
              value={unitSummary?.counts?.achievementsCount || 0}
              icon={<Award className="text-purple-500" />}
              desc="Unit Milestones"
            />
          </section>

          <section>
            <div
              className="bg-white dark:bg-[#1a1c1e] p-8 rounded-2xl border-2 border-slate-50 dark:border-white/5 shadow-sm cursor-pointer group hover:border-[#349DC5]/30 transition-all"
              onClick={() =>
                navigate(
                  `/finance-summary?unitId=${viewingUnitId}&unitName=${unitSummary?.unit?.name}`,
                )
              }
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl flex items-center justify-center text-emerald-500">
                    <Shield size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#00204a] dark:text-white uppercase leading-none">
                      Financial Intelligence
                    </h3>
                    <p className="text-[10px] font-bold text-emerald-500 uppercase mt-2">
                      Operational Reserves
                    </p>
                  </div>
                </div>
                <ArrowRight
                  size={20}
                  className="text-gray-300 group-hover:text-[#349DC5] transition-colors"
                />
              </div>
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-gray-400 uppercase">
                    Income
                  </p>
                  <p className="text-lg font-bold text-[#00204a] dark:text-white tabular-nums">
                    ₦{(unitSummary?.finance?.income || 0).toLocaleString()}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-gray-400 uppercase">
                    Expenditure
                  </p>
                  <p className="text-lg font-bold text-rose-500 tabular-nums">
                    ₦{(unitSummary?.finance?.expense || 0).toLocaleString()}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-gray-400 uppercase">
                    Surplus
                  </p>
                  <p className="text-lg font-bold text-[#349DC5] tabular-nums">
                    ₦{(unitSummary?.finance?.balance || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {!readOnly && (
        <section className="space-y-4">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6 block px-2">
            Access & Security Suite
          </label>
          <MenuButton
            icon={<Edit2 size={20} />}
            label="Modify Identity"
            desc="Update names, phone and avatar"
            onClick={() => setActiveModal("edit")}
          />
          <MenuButton
            icon={<Key size={20} />}
            label="Security Protocols"
            desc="Change access password"
            onClick={() => setActiveModal("pass")}
          />
          <MenuButton
            icon={<Bell size={20} />}
            label="Alert Governance"
            desc="Manage push notification filters"
            onClick={() => setActiveModal("notif")}
          />
          <div className="pt-8 space-y-4">
            <MenuButton
              icon={<LogOut size={20} />}
              label="Terminate Session"
              desc="Sign out from this device"
              danger
              onClick={() => setActiveModal("logout")}
            />
            <MenuButton
              icon={<Trash2 size={20} />}
              label="Purge Evidence"
              desc="Permanently delete user data"
              danger
              onClick={() => setActiveModal("delete")}
            />
          </div>
        </section>
      )}

      <AnimatePresence>
        {activeModal && (
          <div
            className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            onClick={() => setActiveModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl bg-white dark:bg-[#1a1c1e] rounded-[32px] overflow-hidden shadow-2xl"
            >
              <div className="p-8 pb-4 flex items-center justify-between border-b border-gray-100 dark:border-white/5 mb-8">
                <h3 className="text-xl font-bold text-[#00204a] dark:text-white uppercase">
                  {activeModal === "edit" && "Modify Identity"}
                  {activeModal === "pass" && "Security Update"}
                  {activeModal === "notif" && "Alert Logic"}
                  {activeModal === "logout" && "Ending Session"}
                </h3>
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-2 bg-gray-50 dark:bg-white/5 rounded-xl text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="px-8 pb-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {activeModal === "edit" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Title"
                        value={editForm.title}
                        onChange={(v: string) =>
                          setEditForm((f) => ({ ...f, title: v }))
                        }
                      />
                      <Input
                        label="First Name"
                        value={editForm.firstName}
                        onChange={(v: string) =>
                          setEditForm((f) => ({ ...f, firstName: v }))
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Middle Name"
                        value={editForm.middleName}
                        onChange={(v: string) =>
                          setEditForm((f) => ({ ...f, middleName: v }))
                        }
                      />
                      <Input
                        label="Surname"
                        value={editForm.surname}
                        onChange={(v: string) =>
                          setEditForm((f) => ({ ...f, surname: v }))
                        }
                      />
                    </div>
                    <Input
                      label="Primary Phone"
                      value={editForm.phone}
                      onChange={(v: string) =>
                        setEditForm((f) => ({ ...f, phone: v }))
                      }
                    />
                    <button
                      onClick={saveProfile}
                      disabled={saving}
                      className="w-full h-16 bg-[#00204a] text-white rounded-xl text-xs font-bold uppercase tracking-widest mt-6 flex items-center justify-center gap-3 active:scale-95 transition-all shadow-md"
                    >
                      {saving ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          Update Registry <Save size={20} />
                        </>
                      )}
                    </button>
                  </div>
                )}
                {activeModal === "pass" && (
                  <div className="space-y-6">
                    <Input
                      label="Current Password"
                      type="password"
                      value={passForm.current}
                      onChange={(v: string) =>
                        setPassForm((f) => ({ ...f, current: v }))
                      }
                    />
                    <div className="h-px bg-gray-100 dark:bg-white/5" />
                    <Input
                      label="New Password"
                      type="password"
                      value={passForm.new}
                      onChange={(v: string) =>
                        setPassForm((f) => ({ ...f, new: v }))
                      }
                    />
                    <Input
                      label="Confirm Password"
                      type="password"
                      value={passForm.confirm}
                      onChange={(v: string) =>
                        setPassForm((f) => ({ ...f, confirm: v }))
                      }
                    />
                    <button
                      onClick={changePassword}
                      disabled={saving}
                      className="w-full h-16 bg-[#349DC5] text-white rounded-xl text-xs font-bold uppercase tracking-widest mt-6 flex items-center justify-center gap-3 active:scale-95 transition-all shadow-md"
                    >
                      {saving ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          Update Credentials <Lock size={20} />
                        </>
                      )}
                    </button>
                  </div>
                )}
                {activeModal === "notif" && (
                  <div className="space-y-4">
                    <Toggle
                      label="Operation Logs"
                      checked={notifs.reports}
                      onChange={(v: boolean) =>
                        setNotifs((n) => ({ ...n, reports: v }))
                      }
                    />
                    <Toggle
                      label="Ministry Broadcasts"
                      checked={notifs.announcements}
                      onChange={(v: boolean) =>
                        setNotifs((n) => ({ ...n, announcements: v }))
                      }
                    />
                    <Toggle
                      label="Local Events"
                      checked={notifs.events}
                      onChange={(v: boolean) =>
                        setNotifs((n) => ({ ...n, events: v }))
                      }
                    />
                    <button
                      onClick={() => {
                        toast.success("Filters updated");
                        setActiveModal(null);
                      }}
                      className="w-full h-16 bg-[#00204a] text-white rounded-xl text-xs font-bold uppercase tracking-widest mt-10 active:scale-95 transition-all"
                    >
                      Save Preferences
                    </button>
                  </div>
                )}
                {activeModal === "logout" && (
                  <div className="text-center py-6">
                    <div className="w-24 h-24 bg-rose-50 dark:bg-rose-950/20 rounded-2xl flex items-center justify-center mx-auto mb-8 text-rose-500 border border-rose-100 dark:border-rose-900/20">
                      <LogOut size={48} />
                    </div>
                    <h4 className="text-2xl font-bold text-[#00204a] dark:text-white mb-3">
                      Terminate Session?
                    </h4>
                    <p className="text-gray-400 font-bold text-[10px] uppercase leading-relaxed mb-10 px-8">
                      Your identity tokens will be cleared from this device.
                    </p>
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={handleLogout}
                        className="w-full h-16 bg-rose-500 text-white rounded-xl text-xs font-bold uppercase active:scale-95 transition-all shadow-md"
                      >
                        Yes, Sign Out
                      </button>
                      <button
                        onClick={() => setActiveModal(null)}
                        className="w-full h-16 bg-gray-50 dark:bg-white/5 text-gray-400 rounded-xl text-xs font-bold uppercase"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
