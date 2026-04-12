import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  ChevronRight,
  Phone,
  Mail,
  User,
  Shield,
  Trash2,
  UserMinus,
  X,
  ArrowLeft,
  MoreVertical,
  Briefcase,
  Heart,
  Calendar,
  MapPin,
  Wallet,
  Clock,
  RefreshCw,
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { BASE_URl } from "../../api/users";
import { listUnitMembers } from "../../api/unitMembers";
import { getUnitSummaryById } from "../../api/unitSummary";
import AsyncStorage from "../../utils/AsyncStorage";
import { resolveActiveUnitId } from "../../utils/context";

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

function extractId(v: any): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    if (v.$oid) return String(v.$oid);
    if (v._id) return extractId(v._id);
  }
  return String(v);
}

function fmtDate(raw?: any) {
  if (!raw) return "N/A";
  if (typeof raw === "object") {
    if (raw.$date) return fmtDate(raw.$date);
    if (raw.$numberLong) return fmtDate(new Date(Number(raw.$numberLong)));
    if (raw.seconds || raw._seconds) {
      const secs = raw.seconds ?? raw._seconds;
      const nanos = raw.nanoseconds ?? raw._nanoseconds ?? 0;
      return fmtDate(new Date(secs * 1000 + Math.floor(nanos / 1_000_000)));
    }
  }
  const dt = raw instanceof Date ? raw : new Date(raw);
  if (dt instanceof Date && !isNaN(dt.getTime())) {
    return dt.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
  return "N/A";
}

function DataRow({
  icon,
  label,
  value,
  isDate,
}: {
  icon: any;
  label: string;
  value: any;
  isDate?: boolean;
}) {
  const displayValue = useMemo(() => {
    if (value === undefined || value === null) return "—";
    if (isDate) return fmtDate(value);
    const s = String(value).trim();
    return s || "—";
  }, [value, isDate]);

  return (
    <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50/30 dark:bg-white/[0.02] border border-transparent transition-all">
      <div className="p-3 rounded-xl bg-white dark:bg-[#1a1c1e] text-gray-400 dark:text-gray-500 shadow-sm border border-gray-100 dark:border-white/5 shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-black text-gray-400 dark:text-gray-600 uppercase leading-none mb-1.5 tracking-widest">
          {label}
        </p>
        <p className="text-sm font-black text-[#00204a] dark:text-gray-200 truncate tracking-tight">
          {displayValue}
        </p>
      </div>
    </div>
  );
}

export default function MemberListScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const unitId = queryParams.get("unitId");

  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<any>({
    gender: "all",
    employment: "all",
    marital: "all",
  });
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, male: 0, female: 0 });
  const [viewer, setViewer] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }
      const rawUser = await AsyncStorage.getItem("user");
      let u = rawUser ? JSON.parse(rawUser) : null;
      setViewer(u);

      let targetUnitId: string | null = unitId;
      if (!targetUnitId || targetUnitId === "global") {
        targetUnitId = await resolveActiveUnitId();
      }

      const rawAfter = await AsyncStorage.getItem("user");
      if (rawAfter) {
        try {
          u = JSON.parse(rawAfter);
          setViewer(u);
        } catch {
          /* keep prior u */
        }
      }

      if (!targetUnitId || targetUnitId === "global") {
        toast.error("No active unit context found for this account.");
        setLoading(false);
        return;
      }

      const [membersRes, summaryRes] = await Promise.all([
        listUnitMembers(targetUnitId, token),
        getUnitSummaryById(token, targetUnitId).catch(() => null),
      ]);

      if (membersRes?.members) {
        setMembers(membersRes.members);
      }
      if (summaryRes?.ok && summaryRes.counts) {
        setStats({
          total: summaryRes.counts.membersCount || 0,
          male: summaryRes.counts.maleCount || 0,
          female: summaryRes.counts.femaleCount || 0,
        });
      }
    } catch (e: any) {
      console.error("Member sync error:", e?.message);
      toast.error("Failed to sync member database");
    } finally {
      setLoading(false);
    }
  }, [unitId, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const fullName = `${m.firstName || ""} ${m.middleName || ""} ${m.surname || ""}`.toLowerCase();
      const q = search.trim().toLowerCase();

      const matchesSearch = !q || fullName.includes(q) || (m.phone || "").toLowerCase().includes(q);

      if (activeFilter === "all") return matchesSearch;

      const gender = (m.gender || "").toLowerCase();
      const employment = (m.profile?.employmentStatus || "").toLowerCase();
      const marital = (m.profile?.maritalStatus || "").toLowerCase();

      switch (activeFilter) {
        case "male": return matchesSearch && gender === "male";
        case "female": return matchesSearch && gender === "female";
        case "employed": return matchesSearch && employment.includes("employ") && !employment.includes("unemploy");
        case "unemployed": return matchesSearch && employment.includes("unemploy");
        case "married": return matchesSearch && marital.includes("married");
        case "single": return matchesSearch && (marital.includes("single") || marital.includes("never married"));
        case "widowed": return matchesSearch && marital.includes("widow");
        case "divorced": return matchesSearch && marital.includes("divorc");
        default: return matchesSearch;
      }
    });
  }, [members, search, activeFilter]);

  const handleMemberClick = async (m: any) => {
    setSelectedMember(m);
    setDetailsLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const uid = extractId(m._id);
      if (!uid) throw new Error("Missing ID context");

      const res = await axios.get(`${BASE_URl}/api/users/${uid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("Member detail payload:", res.data); // Helpful for remote debugging
      if (res.data?.user || res.data?.data) {
        setSelectedMember(res.data.user || res.data.data);
      } else if (res.data && typeof res.data === "object" && !("ok" in res.data)) {
        // Fallback for cases where it's just the user object
        setSelectedMember(res.data);
      }
    } catch (e: any) {
      console.error("Deep intel error:", e.message);
      toast.error("Failed to load deeper intelligence");
    } finally {
      setDetailsLoading(false);
    }
  };

  const toggleFinSec = async (val: boolean) => {
    try {
      const token = await AsyncStorage.getItem("token");
      const unit = unitId || viewer?.activeUnitId;
      const endpoint = val ? "assign-finsec" : "unassign-finsec";
      const res = await axios.post(
        `${BASE_URl}/api/units/${unit}/${endpoint}`,
        val ? { userId: selectedMember._id } : {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.data?.ok) {
        toast.success(val ? "Financial Secretary Assigned" : "Duty Removed");
        handleMemberClick(selectedMember);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Operation failed");
    }
  };

  const canManageRoles = useMemo(() => {
    if (!viewer) return false;
    if (viewer.activeRole === "SuperAdmin" || viewer.activeRole === "MinistryAdmin") return true;
    if (viewer.activeRole === "UnitLeader") {
      const uId = unitId || viewer.activeUnitId || (viewer.roles || []).find((r: any) => r.role === "UnitLeader" && r.unit)?.unit;
      return (viewer.roles || []).some(
        (r: any) =>
          r.role === "UnitLeader" && (r.unit?._id === uId || r.unit === uId),
      );
    }
    return false;
  }, [viewer, unitId]);

  const renderMemberDetail = () => {
    if (detailsLoading) {
      return (
        <div className="p-16 md:p-32 flex flex-col items-center justify-center h-full gap-8">
          <div className="w-16 h-16 border-4 border-[#349DC5] border-t-transparent rounded-full animate-spin" />
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] animate-pulse">
            Pulling Intel...
          </p>
        </div>
      );
    }
    
    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-[#0f1218] relative w-full hide-scrollbar overflow-x-hidden">
        <div className="h-40 md:h-44 bg-[#00204a] p-6 md:p-10 flex items-start justify-end relative shrink-0">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#349DC5]/10 rounded-full -mr-48 -mt-48 blur-[100px] opacity-40" />
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-black/40" />
          <button
            onClick={() => setSelectedMember(null)}
            className="relative z-30 p-3 md:p-4 rounded-xl md:rounded-2xl bg-white/10 border border-white/20 text-white hover:bg-white/30 hover:scale-105 transition-all active:scale-90 shadow-2xl backdrop-blur-md"
          >
            <X size={24} />
          </button>
        </div>
        <div className="px-6 md:px-12 pb-12 relative z-10 w-full">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-10 mb-8 md:mb-16 pt-4 md:pt-0 md:-mt-[80px]">
            <div className="w-40 h-40 md:w-48 md:h-48 rounded-[32px] md:rounded-[48px] border-[6px] md:border-[10px] border-white dark:border-[#0f1218] p-1 shadow-2xl overflow-hidden bg-white dark:bg-white/10 backdrop-blur-xl shrink-0 group">
              {selectedMember.profile?.avatar || selectedMember.avatar ? (
                <img
                  src={selectedMember.profile?.avatar || selectedMember.avatar}
                  className="w-full h-full object-cover rounded-[24px] md:rounded-[38px] transition-transform duration-700 group-hover:scale-110"
                  alt="Avatar"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#00204a] text-white font-black text-4xl md:text-5xl">
                  {selectedMember.firstName?.[0]}{selectedMember.surname?.[0]}
                </div>
              )}
            </div>
            <div className="pt-4 md:pt-[100px] flex-1 text-center md:text-left min-w-0 w-full">
              <div className="flex items-center justify-center md:justify-start gap-2 md:gap-3 mb-4 md:mb-6">
                <div className="px-5 py-2 bg-white dark:bg-white/5 rounded-full flex items-center gap-3 border border-gray-100 dark:border-white/10 shadow-lg shadow-black/5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#349DC5] shadow-[0_0_10px_#349DC5]" />
                  <span className="text-[10px] font-black text-[#00204a] dark:text-white/80 uppercase tracking-widest">
                    {selectedMember.approved ? "Active Personnel" : "Restricted Access"}
                  </span>
                </div>
              </div>
              <h2 className="text-3xl lg:text-4xl xl:text-5xl font-black text-[#00204a] dark:text-white leading-[1.1] md:leading-[1] tracking-tighter uppercase mb-6 md:mb-8 drop-shadow-xl break-words">
                {selectedMember.title} {selectedMember.firstName} <br className="hidden xl:block" />
                {selectedMember.surname}
              </h2>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 md:gap-5 w-full">
                <span className="px-4 py-2 md:px-7 md:py-3 bg-[#00204a] text-white rounded-[16px] md:rounded-[20px] text-[10px] md:text-[11px] font-black uppercase tracking-wider md:tracking-[0.2em] shadow-xl shadow-blue-900/40 border border-white/5">
                  {selectedMember.activeRole || "Member"}
                </span>
                <span className="text-[10px] md:text-[11px] font-black text-[#349DC5] uppercase tracking-widest bg-blue-50 dark:bg-blue-500/10 px-3 md:px-4 py-2 rounded-xl truncate max-w-full">
                  {selectedMember.email || "UNIDENTIFIED_COMM"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 xl:gap-12 w-full">
            <div className="space-y-10 w-full">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-6 block border-b border-gray-100 dark:border-white/5 pb-2">
                  Deployment Actions
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => window.open(`tel:${selectedMember.phone}`)}
                    className="h-16 bg-white dark:bg-[#1a1c1e] border-2 border-gray-100 dark:border-white/5 rounded-[24px] flex flex-col items-center justify-center gap-1 text-[#00204a] dark:text-white hover:border-[#349DC5]/40 transition-all active:scale-95 group"
                  >
                    <Phone size={18} className="text-gray-400 group-hover:text-[#349DC5] transition-colors" />
                    <span className="font-black text-[8px] sm:text-[9px] uppercase tracking-tighter text-center px-1 truncate w-full">
                      Call Unit
                    </span>
                  </button>
                  <button
                    onClick={() => navigate(`/compose-email?userId=${selectedMember._id}`)}
                    className="h-16 bg-white dark:bg-[#1a1c1e] border-2 border-gray-100 dark:border-white/5 rounded-[24px] flex flex-col items-center justify-center gap-1 text-[#00204a] dark:text-white hover:border-[#349DC5]/40 transition-all active:scale-95 group"
                  >
                    <Mail size={18} className="text-gray-400 group-hover:text-[#349DC5] transition-colors" />
                    <span className="font-black text-[8px] sm:text-[9px] uppercase tracking-tighter text-center px-1 truncate w-full">
                      Send Message
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-6 block border-b border-gray-100 dark:border-white/5 pb-2">
                  Profile Insights
                </label>
                <div className="space-y-4 sm:space-y-6">
                  <DataRow
                    icon={<User size={18} />}
                    label="Gender"
                    value={selectedMember.gender || selectedMember.profile?.gender || selectedMember.userProfile?.gender || selectedMember.sex || selectedMember.profile?.sex || selectedMember.userData?.gender}
                  />
                  <DataRow
                    icon={<Calendar size={18} />}
                    label="Date of Birth"
                    value={selectedMember.dob || selectedMember.dateOfBirth || selectedMember.profile?.dob || selectedMember.profile?.dateOfBirth || selectedMember.userProfile?.dob || selectedMember.birthday || selectedMember.profile?.birthday}
                    isDate
                  />
                  <DataRow
                    icon={<Heart size={18} />}
                    label="Marital Status"
                    value={selectedMember.maritalStatus || selectedMember.profile?.maritalStatus || selectedMember.userProfile?.maritalStatus || selectedMember.userData?.maritalStatus}
                  />
                  <DataRow
                    icon={<Briefcase size={18} />}
                    label="Employment"
                    value={selectedMember.employmentStatus || selectedMember.profile?.employmentStatus || selectedMember.userProfile?.employmentStatus || selectedMember.employment || selectedMember.profile?.employment}
                  />
                  <DataRow
                    icon={<Briefcase size={18} />}
                    label="Occupation"
                    value={selectedMember.occupation || selectedMember.profile?.occupation || selectedMember.userProfile?.occupation || selectedMember.job || selectedMember.profile?.job}
                  />
                  <DataRow
                    icon={<Shield size={18} />}
                    label="Education"
                    value={selectedMember.education || selectedMember.profile?.education || selectedMember.userProfile?.education || selectedMember.qualification || selectedMember.profile?.qualification}
                  />
                  <DataRow
                    icon={<MapPin size={18} />}
                    label="Address"
                    value={selectedMember.address || selectedMember.profile?.address || selectedMember.userProfile?.address || selectedMember.location || selectedMember.profile?.location}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-10 w-full">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-6 block border-b border-gray-100 dark:border-white/5 pb-2">
                  Account Timeline
                </label>
                <div className="space-y-4 sm:space-y-6">
                  <DataRow
                    icon={<Calendar size={18} />}
                    label="Joined"
                    value={selectedMember.createdAt}
                    isDate
                  />
                  <DataRow
                    icon={<Clock size={18} />}
                    label="Last Login"
                    value={selectedMember.lastLoginAt}
                    isDate
                  />
                </div>
              </div>
              {canManageRoles && (
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-6 block border-b border-gray-100 dark:border-white/5 pb-2">
                    Access Delegation
                  </label>
                  <div className="bg-gray-50/50 dark:bg-white/[0.03] p-6 lg:p-8 rounded-[32px] border border-gray-100 dark:border-white/5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white dark:bg-[#1a1c1e] rounded-xl shadow-sm text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-white/5 shrink-0">
                          <Wallet size={18} />
                        </div>
                        <span className="text-[10px] lg:text-[11px] font-black text-[#00204a] dark:text-gray-200 uppercase tracking-wide lg:tracking-widest truncate">
                          Financial Secretary
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          toggleFinSec(
                            !selectedMember.roles?.some((r: any) =>
                              r.duties?.includes("FinancialSecretary"),
                            ),
                          )
                        }
                        className={cn(
                          "w-12 h-6 rounded-full relative transition-all p-1 shrink-0",
                          selectedMember.roles?.some((r: any) =>
                            r.duties?.includes("FinancialSecretary"),
                          )
                            ? "bg-[#349DC5]"
                            : "bg-gray-200 dark:bg-white/10",
                        )}
                      >
                        <div
                          className={cn(
                            "w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                            selectedMember.roles?.some((r: any) =>
                              r.duties?.includes("FinancialSecretary"),
                            )
                              ? "translate-x-6"
                              : "translate-x-0",
                          )}
                        />
                      </button>
                    </div>
                    <p className="text-[9px] text-gray-400 font-black leading-relaxed px-1 uppercase tracking-tighter opacity-60">
                      Authorized access to unit financial records
                    </p>
                  </div>
                </div>
              )}

              {canManageRoles && (
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-6 block border-b border-gray-100 dark:border-white/5 pb-2">
                    Security Operations
                  </label>
                  <div className="space-y-3">
                    {viewer?.activeRole === "SuperAdmin" && viewer?.multi && (
                      <button
                        onClick={() =>
                          navigate(
                            `/sa/user-roles/${extractId(
                              selectedMember._id,
                            )}`,
                          )
                        }
                        className="w-full h-auto min-h-[56px] py-2 flex items-center justify-between px-6 lg:px-8 bg-white dark:bg-[#1a1c1e] border border-gray-100 dark:border-white/5 rounded-[20px] text-[#00204a] dark:text-white hover:text-[#349DC5] hover:border-[#349DC5]/20 transition-all font-black text-[9px] uppercase tracking-wide lg:tracking-widest group"
                      >
                        <div className="flex items-center gap-3 lg:gap-4 overflow-hidden">
                          <div className="w-10 h-10 rounded-xl bg-[#00204a] flex items-center justify-center text-white shrink-0">
                            <User size={20} />
                          </div>
                          <span className="text-sm font-bold text-[#00204a] dark:text-white truncate">
                            View Active Roles
                          </span>
                        </div>
                        <ChevronRight
                          size={18}
                          className="text-gray-300 group-hover:text-[#349DC5] shrink-0 ml-2"
                        />
                      </button>
                    )}
                    <button className="w-full h-auto min-h-[56px] py-2 flex items-center justify-between px-6 lg:px-8 bg-white dark:bg-[#1a1c1e] border border-gray-100 dark:border-white/5 rounded-[20px] text-gray-400 hover:text-[#349DC5] hover:border-[#349DC5]/20 transition-all font-black text-[9px] uppercase tracking-wide lg:tracking-widest group">
                      <span className="truncate">Disable Account</span>
                      <Clock size={16} className="text-gray-300 group-hover:text-[#349DC5] shrink-0 ml-2" />
                    </button>
                    <button className="w-full h-auto min-h-[56px] py-2 flex items-center justify-between px-6 lg:px-8 bg-white dark:bg-[#1a1c1e] border border-red-100 dark:border-red-950/20 rounded-[20px] text-red-500/60 hover:bg-red-500 hover:text-white transition-all font-black text-[9px] uppercase tracking-wide lg:tracking-widest group">
                      <span className="truncate">Purge Profile / Delete Account</span>
                      <Trash2 size={16} className="text-red-200 group-hover:text-white shrink-0 ml-2" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex w-full min-h-[100dvh] lg:h-screen lg:overflow-hidden bg-background dark:bg-dark-background transition-colors">
      {/* Left List Pane */}
      <div className={cn(
        "flex-1 flex flex-col bg-background dark:bg-dark-background",
        selectedMember ? "lg:flex lg:w-[45%] lg:flex-none lg:border-r lg:border-border lg:dark:border-dark-border lg:overflow-y-auto hide-scrollbar" : "lg:w-full lg:overflow-y-auto hide-scrollbar"
      )}>
      {/* Mobile-Style Header Strategy */}
      <div className="bg-surface dark:bg-dark-surface px-4 sm:px-6 py-8 sm:py-12 pb-16 sm:pb-20 shrink-0 border-b border-border dark:border-dark-border">
        <div className="max-w-7xl mx-auto flex flex-col gap-6 sm:gap-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-6">
              <button
                onClick={() => navigate(-1)}
                className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary hover:bg-border transition-all active:scale-95 shadow-lg border border-border dark:border-dark-border"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-xl sm:text-3xl font-black text-text-primary dark:text-dark-text-primary leading-tight uppercase tracking-tight">
                  Members
                </h1>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <p className="text-text-muted text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em]">
                    Directory
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => fetchData()}
              className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-background dark:bg-dark-background text-text-muted hover:text-primary transition-all hover:bg-border border border-border dark:border-dark-border"
            >
              <RefreshCw
                size={20}
                className={loading ? "animate-spin" : ""}
              />
            </button>
          </div>

          {/* Stats — scrollable row on mobile, grid on md+ */}
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide md:grid md:grid-cols-3 md:gap-6">
            <div className="bg-surface-alt dark:bg-dark-surface-alt p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-border dark:border-dark-border shrink-0 min-w-[120px] sm:min-w-0">
              <p className="text-text-muted text-[9px] font-black uppercase tracking-widest mb-1 sm:mb-2">Total</p>
              <h3 className="text-2xl sm:text-3xl font-black text-text-primary dark:text-dark-text-primary">{stats.total}</h3>
            </div>
            <div className="bg-primary/5 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-primary/20 shrink-0 min-w-[120px] sm:min-w-0">
              <p className="text-primary text-[9px] font-black uppercase tracking-widest mb-1 sm:mb-2">Male</p>
              <h3 className="text-2xl sm:text-3xl font-black text-primary">{stats.male}</h3>
            </div>
            <div className="bg-error/5 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-error/20 shrink-0 min-w-[120px] sm:min-w-0">
              <p className="text-error text-[9px] font-black uppercase tracking-widest mb-1 sm:mb-2">Female</p>
              <h3 className="text-2xl sm:text-3xl font-black text-error">{stats.female}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-6 sm:-mt-8 flex-1 pb-32">

        <section className="mb-10 flex flex-col lg:flex-row gap-6">
          <div className="relative flex-1 group">
            <Search
              className="absolute left-6 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors"
              size={20}
            />
            <input
              type="text"
              placeholder="Search members by identity..."
              className="w-full h-[48px] pl-16 pr-8 bg-surface dark:bg-dark-surface rounded-[24px] shadow-sm border border-border dark:border-dark-border focus:ring-4 ring-primary/5 outline-none font-bold text-sm transition-all text-text-primary dark:text-dark-text-primary"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <AnimatePresence>
              {search.trim().length > 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute left-0 right-0 top-full mt-3 bg-white dark:bg-[#1a1c1e] rounded-[24px] shadow-2xl border border-gray-100 dark:border-white/5 z-[60] overflow-hidden p-2"
                >
                  {filteredMembers.slice(0, 5).map((m) => (
                    <button
                      key={m._id}
                      onClick={() => {
                        setSearch(`${m.firstName} ${m.surname}`);
                        handleMemberClick(m);
                      }}
                      className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-white/5 rounded-2xl transition-all"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#00204a] text-white flex items-center justify-center font-black text-xs shrink-0">
                        {m.firstName?.[0]}{m.surname?.[0]}
                      </div>
                      <div className="text-left overflow-hidden">
                        <p className="text-xs font-black text-[#00204a] dark:text-white truncate uppercase">
                          {m.title} {m.firstName} {m.surname}
                        </p>
                        <p className="text-[10px] font-bold text-[#349DC5] uppercase tracking-tighter">
                          {m.phone}
                        </p>
                      </div>
                    </button>
                  ))}
                  {filteredMembers.length === 0 && (
                    <div className="p-10 text-center">
                      <p className="text-[10px] font-black text-gray-300 uppercase italic">
                        No members found
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "h-[48px] px-10 rounded-[24px] shadow-sm flex items-center justify-center gap-3 font-black text-[11px] uppercase transition-all active:scale-95 border",
              showFilters
                ? "bg-primary text-white border-primary"
                : "bg-surface dark:bg-dark-surface text-text-muted border-border dark:border-dark-border",
            )}
          >
            <Filter size={20} /> Registry Filters
          </button>
        </section>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-10"
            >
              <div className="bg-white dark:bg-[#1a1c1e] p-8 rounded-[32px] border border-gray-100 dark:border-white/5 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-sm font-black text-[#00204a] dark:text-white uppercase tracking-wider">Refine Personnel View</h3>
                  <button
                    onClick={() => setActiveFilter("all")}
                    className="text-[10px] font-bold text-[#349DC5] uppercase hover:underline"
                  >
                    Clear All
                  </button>
                </div>

                <div className="flex flex-wrap gap-3">
                  {[
                    { id: "all", label: "All Members" },
                    { id: "male", label: "Male" },
                    { id: "female", label: "Female" },
                    { id: "employed", label: "Employed" },
                    { id: "unemployed", label: "Unemployed" },
                    { id: "married", label: "Married" },
                    { id: "single", label: "Single" },
                    { id: "widowed", label: "Widowed" },
                    { id: "divorced", label: "Divorced" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setActiveFilter(f.id)}
                      className={cn(
                        "px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all active:scale-95 border-2",
                        activeFilter === f.id
                          ? "bg-[#349DC5] text-white border-[#349DC5] shadow-md shadow-blue-500/20"
                          : "bg-gray-50 dark:bg-white/5 text-gray-400 border-transparent hover:border-gray-200 dark:hover:border-white/10"
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
          {loading
            ? Array(8)
              .fill(0)
              .map((_, i) => (
                <div
                  key={i}
                  className="h-40 sm:h-48 bg-white dark:bg-[#1a1c1e] animate-pulse rounded-[24px] sm:rounded-[32px] border border-gray-100 dark:border-white/5 shadow-sm"
                />
              ))
            : filteredMembers.map((m) => (
              <motion.div
                layoutId={m._id}
                key={m._id}
                onClick={() => handleMemberClick(m)}
                whileHover={{ y: -4, scale: 1.02 }}
                className="bg-white dark:bg-[#1a1c1e] p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] shadow-sm border border-gray-100 dark:border-white/5 cursor-pointer group flex items-start gap-3 sm:gap-5 transition-all hover:shadow-xl hover:shadow-blue-900/5 hover:border-[#349DC5]/30"
              >
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-[#00204a]/5 dark:bg-white/5 border border-gray-100 dark:border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                  {m.profile?.avatar ? (
                    <img
                      src={m.profile.avatar}
                      className="w-full h-full object-cover transition-all duration-500"
                      alt={m.firstName}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#00204a] text-white font-black text-lg sm:text-xl">
                      {m.firstName?.[0]}{m.surname?.[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#349DC5] shadow-[0_0_8px_rgba(52,157,197,0.4)]" />
                    <span className="text-[8px] sm:text-[9px] font-black text-gray-400 dark:text-white/40 uppercase tracking-[0.15em] leading-none">
                      {m.activeRole || "Member"}
                    </span>
                  </div>
                  <h3 className="font-black text-[#00204a] dark:text-white truncate leading-none group-hover:text-[#349DC5] transition-colors uppercase text-xs sm:text-sm tracking-tight">
                    {m.title} {m.firstName} {m.surname}
                  </h3>
                  <p className="text-[9px] sm:text-[10px] font-bold text-[#349DC5] uppercase mt-2 mb-3 sm:mb-4 tracking-tighter tabular-nums drop-shadow-sm">
                    {m.phone || "NO CONTACT"}
                  </p>
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg text-[7px] sm:text-[8px] font-black uppercase tracking-tighter",
                        m.gender === "male"
                          ? "bg-blue-50 dark:bg-blue-500/10 text-blue-500"
                          : "bg-rose-50 dark:bg-rose-500/10 text-rose-500",
                      )}
                    >
                      {m.gender || "??"}
                    </div>
                    <div className="px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg text-[7px] sm:text-[8px] font-black uppercase bg-gray-50 dark:bg-white/5 text-gray-400 tracking-tighter">
                      {m.profile?.maritalStatus || "Single"}
                    </div>
                  </div>
                </div>
                <div className="p-1.5 sm:p-2 bg-gray-50 dark:bg-white/5 rounded-lg sm:rounded-xl text-gray-200 group-hover:text-[#349DC5] group-hover:bg-[#349DC5]/10 transition-all mt-1">
                  <ChevronRight size={16} className="sm:w-5 sm:h-5" />
                </div>
              </motion.div>
            ))}
        </div>

      </div>
      </div>
      {/* End Left List Pane */}

      {/* Right Desktop Pane (Split View) */}
      <div className={cn(
        "hidden lg:flex flex-col lg:w-[55%] lg:flex-none relative bg-white dark:bg-[#0f1218]",
        !selectedMember && "items-center justify-center bg-gray-50 dark:bg-[#0f1218]"
      )}>
        {selectedMember ? renderMemberDetail() : (
          <div className="text-center text-gray-500 font-bold uppercase tracking-widest text-xs flex flex-col items-center">
            <User size={64} className="mb-6 opacity-20" />
            <h3 className="text-xl font-black text-[#00204a] dark:text-white uppercase mb-2">Member Profiles</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Select a person to view details</p>
          </div>
        )}
      </div>

      {/* Mobile Modal Overlay */}
      <div className="lg:hidden">

      <AnimatePresence>
        {selectedMember && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMember(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />
            <motion.div
              layoutId={selectedMember._id}
              className="relative w-full max-w-4xl bg-white dark:bg-[#0f1218] rounded-2xl md:rounded-[48px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-white/5 mx-2"
            >
               {renderMemberDetail()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
