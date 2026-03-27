import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  ShieldCheck,
  Flame,
  Users,
  UserPlus,
  Heart,
  Music,
  Car,
  GraduationCap,
  RefreshCw,
  LayoutGrid,
  Sparkles,
  ChevronRight,
  ArrowLeft,
  Briefcase,
  Award,
  Church,
  History,
  ExternalLink,
  Handshake,
  Calendar,
  MessageSquare,
} from "lucide-react";

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

import axios from "axios";
import toast from "react-hot-toast";
import { BASE_URl } from "../../../api/users";
import AsyncStorage from "../../../utils/AsyncStorage";
interface ReportModule {
  key: string;
  title: string;
  subtitle: string;
  icon: any;
  color: string;
  route: string;
  category: "Spiritual" | "Operative" | "Civic";
  params?: any;
}
export default function MemberReports() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [unit, setUnit] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const fetchUnitContext = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    else setRefreshing(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const rawUser = await AsyncStorage.getItem("user");
      const u = rawUser ? JSON.parse(rawUser) : null;
      const unitId =
        u?.activeUnitId ||
        (u?.roles || []).find((r: any) => r.role === "Member" && r.unit)?._id;
      if (unitId) {
        const res = await axios.get(`${BASE_URl}/api/units/${unitId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data?.ok) setUnit(res.data.unit);
      }
    } catch (e) {
      toast.error("Failed to sync report metadata");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useEffect(() => {
    fetchUnitContext();
  }, [fetchUnitContext]);
const UNIT_CARD_CONFIG: Record<string, any> = {
  achievements: {
    title: "Unit Achievements",
    subtitle: "Celestial victories archive",
    icon: Award,
    color: "text-[#349DC5]",
    bg: "bg-[#349DC5]/10",
    route: "/member/achievements",
  },
  souls: {
    title: "Souls You Won",
    subtitle: "Personal conversion ledger",
    icon: Flame,
    color: "text-[#FF5722]",
    bg: "bg-[#FF5722]/10",
    route: "/soul-harvested",
    params: { scope: "mine" },
  },
  members: {
    title: "Unit Members Assisted",
    subtitle: "Community support logs",
    icon: Users,
    color: "text-[#9C27B0]",
    bg: "bg-[#9C27B0]/10",
    route: "/members/assisted",
  },
  invited: {
    title: "People You Invited to Church",
    subtitle: "Outreach registry",
    icon: UserPlus,
    color: "text-[#4CAF50]",
    bg: "bg-[#4CAF50]/10",
    route: "/people-invited",
  },
  married: {
    title: "Unit Members That Got Married",
    subtitle: "Covenant union records",
    icon: Heart,
    color: "text-[#2196F3]",
    bg: "bg-[#2196F3]/10",
    route: "/reports/married",
  },
  external: {
    title: "External Invitations & Partnerships",
    subtitle: "Kingdom alliances",
    icon: Handshake,
    color: "text-[#FF9800]",
    bg: "bg-[#FF9800]/10",
    route: "/reports",
  },
  songs: {
    title: "Songs Released",
    subtitle: "Divine harmonies",
    icon: Music,
    color: "text-[#980545]",
    bg: "bg-[#980545]/10",
    route: "/reports/songs",
  },
  car: {
    title: "Car Parked",
    subtitle: "Logistics monitoring",
    icon: Car,
    color: "text-[#08B9FF]",
    bg: "bg-[#08B9FF]/10",
    route: "/reports",
  },
  women: {
    title: "Testimonies from Women",
    subtitle: "Miracle reports",
    icon: MessageSquare,
    color: "text-[#08B9FF]",
    bg: "bg-[#08B9FF]/10",
    route: "/reports/testimonies",
  },
  attendance: {
    title: "Church Attendance",
    subtitle: "Service flow metrics",
    icon: LayoutGrid,
    color: "text-[#000000]",
    bg: "bg-black/10",
    route: "/attendance-home",
  },
  graduates: {
    title: "Graduated Students",
    subtitle: "Academic honor roll",
    icon: GraduationCap,
    color: "text-[#8C48F9]",
    bg: "bg-[#8C48F9]/10",
    route: "/reports/graduates",
  },
  recovery: {
    title: "Recovered Addicts",
    subtitle: "Restoration records",
    icon: ShieldCheck,
    color: "text-[#494922]",
    bg: "bg-[#494922]/10",
    route: "/recovered-addicts",
  },
  emporium: {
    title: "Emporium Sales",
    subtitle: "Marketplace data",
    icon: Briefcase,
    color: "text-[#209948]",
    bg: "bg-[#209948]/10",
    route: "/sales",
  },
  addAttendance: {
    title: "Church Attendance",
    subtitle: "Service records",
    icon: Calendar,
    color: "text-[#4CAF50]",
    bg: "bg-[#4CAF50]/10",
    route: "/attendance/record",
  },
};

const CORE_BASE = ["souls", "invited"];
const CORE_WITH_MARRIED = [...CORE_BASE, "married"];

const UNIT_CARD_MAP: Record<string, string[]> = {
  CHABOD: CORE_BASE,
  "BANKERS UNIT": CORE_BASE,
  "COUPLES FELLOWSHIP": CORE_BASE,
  "COUNSELLING UNIT": CORE_BASE,
  "GRIT & GRACE": CORE_BASE,
  "JOSHUA GENERATION": CORE_BASE,
  "PASTORAL CARE UNIT": CORE_BASE,
  "MIGHTY ARROWS": CORE_BASE,
  "MEETERS AND GREETERS": CORE_BASE,
  "KINGDOM CARE UNIT": CORE_BASE,
  "JUBILEE AIRFORCE": CORE_BASE,
  "JUBILEE PILOT": [...CORE_BASE, "addAttendance"],
  "PROGRAM LOGISTIC UNIT": CORE_BASE,
  "PROJECT PHILIP": CORE_BASE,
  PROTOCOL: CORE_BASE,
  "TEENS CHURCH": CORE_BASE,
  "TEMPLE KEEPERS": CORE_BASE,
};
  const filteredModules = useMemo(() => {
    const unitName = unit?.name?.toUpperCase() || "";
    const keys = UNIT_CARD_MAP[unitName] || CORE_WITH_MARRIED;

    return keys
      .map((k) => ({ ...UNIT_CARD_CONFIG[k], key: k }))
      .filter(
        (m) =>
          m.title?.toLowerCase().includes(search.toLowerCase()) ||
          m.subtitle?.toLowerCase().includes(search.toLowerCase()),
      );
  }, [unit, search]);
  return (
    <div className="pb-24 max-w-7xl mx-auto px-4 sm:px-6 pt-10">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate(-1)}
            className="p-4 rounded-3xl bg-white dark:bg-[#1a1c1e] shadow-sm border border-gray-100 dark:border-white/5 text-gray-400 hover:text-[#349DC5] transition-all active:scale-90"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-4xl font-bold text-[#00204a] dark:text-white uppercase leading-none">
              Reports
            </h1>
            <p className="text-[10px] font-bold text-[#349DC5] uppercase tracking-[0.3em] mt-3 flex items-center gap-2">
              <ShieldCheck size={12} fill="currentColor" /> Authorized
              Events
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchUnitContext(true)}
          className="w-16 h-16 bg-white dark:bg-[#1a1c1e] rounded-[24px] shadow-sm border border-gray-100 dark:border-white/5 flex items-center justify-center text-gray-400 hover:text-[#349DC5] transition-all active:scale-95"
        >
          <RefreshCw
            size={24}
            className={refreshing ? "animate-spin text-[#349DC5]" : ""}
          />
        </button>
      </header>
      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-6">
          <div className="w-16 h-16 border-4 border-[#349DC5] border-t-transparent rounded-full animate-spin" />
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.4em] animate-pulse">
            Establishing Context...
          </p>
        </div>
      ) : (
        <>
          <section className="mb-16 relative group max-w-3xl">
            <Search
              className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#349DC5] transition-colors"
              size={24}
            />
            <input
              type="text"
              placeholder="Search reporting modules..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-20 pl-22 pr-8 bg-white dark:bg-[#1a1c1e] rounded-[32px] shadow-inner border border-gray-100 dark:border-white/5 font-bold text-lg outline-none focus:border-[#349DC5] transition-all placeholder:text-gray-300"
            />
          </section>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                {filteredModules.map((m) => (
                  <motion.button
                    key={m.key}
                    whileHover={{
                      y: -8,
                      boxShadow: "0 25px 50px -12px rgba(52,157,197,0.1)",
                    }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate(m.route, { state: m.params })}
                    className="group relative bg-white dark:bg-[#1a1c1e] p-10 rounded-[48px] shadow-sm border border-gray-100 dark:border-white/5 text-left transition-all overflow-hidden"
                  >
                    <div
                      className={cn(
                        "absolute top-0 right-0 w-40 h-40 opacity-[0.03] rounded-bl-[120px] transition-all group-hover:scale-125",
                        m.bg?.replace("/10", ""),
                      )}
                    />
                    <div
                      className={cn(
                        "w-16 h-16 rounded-3xl p-4 shadow mb-8 group-hover:scale-110 group-hover:-rotate-3 transition-transform",
                        m.bg,
                        m.color,
                      )}
                    >
                      <m.icon size={32} />
                    </div>
                    <h4 className="text-2xl font-bold text-[#00204a] dark:text-white mb-2 leading-tight uppercase">
                      {m.title}
                    </h4>
                    <p className="text-[11px] font-bold text-gray-400 uppercase leading-relaxed">
                      {m.subtitle}
                    </p>
                    <div className="mt-10 flex items-center justify-between border-t border-gray-50 dark:border-white/5 pt-8">
                      <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#349DC5] flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                        ACCESS DATA <ChevronRight size={14} />
                      </span>
                      <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-300 group-hover:bg-[#349DC5]/10 group-hover:text-[#349DC5] transition-all">
                        <ExternalLink size={18} />
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
            <div className="lg:col-span-4 space-y-10">
              <div className="bg-gradient-to-br from-[#00204a] to-[#042e61] p-12 rounded-[56px] text-white shadow-3xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-125 transition-transform duration-1000">
                  <Sparkles size={160} />
                </div>
                <h3 className="text-xl font-bold uppercase mb-10 flex items-center gap-4">
                  <ShieldCheck size={28} className="text-cyan-400" />
                  Operational Insights
                </h3>
                <p className="text-sm font-bold opacity-60 leading-relaxed mb-12 relative z-10">
                  Your personal reporting dashboard provides restricted access
                  to the unit's operational metrics. Validate all entries
                  against the central registry.
                </p>
                <div className="space-y-8 relative z-10">
                  <SidebarItem
                    label="Clearance"
                    value="MEMBER"
                    icon={Briefcase}
                    color="text-cyan-400"
                  />
                  <SidebarItem
                    label="Status"
                    value="LIVE SYNC"
                    icon={RefreshCw}
                    color="text-emerald-400"
                  />
                  <SidebarItem
                    label="Assigned Unit"
                    value={unit?.name || "FETCHING..."}
                    icon={Church}
                    color="text-[#349DC5]"
                  />
                </div>
              </div>
              <div className="bg-white dark:bg-[#1a1c1e] p-12 rounded-[56px] shadow-sm border border-gray-100 dark:border-white/5">
                <h3 className="text-lg font-bold text-[#00204a] dark:text-white uppercase mb-10">
                  Administrative Suite
                </h3>
                <div className="space-y-5">
                  <button
                    onClick={() => navigate("/church-switch")}
                    className="w-full h-18 bg-gray-50 dark:bg-white/5 rounded-[24px] flex items-center justify-between px-10 text-[11px] font-bold uppercase text-[#00204a] dark:text-white hover:bg-white hover:shadow-md transition-all group"
                  >
                    Switch Unit
                    <ArrowLeft
                      size={18}
                      className="rotate-180 text-[#349DC5] group-hover:translate-x-1 transition-transform"
                    />
                  </button>
                  <button
                    onClick={() => navigate("/attendance-home")}
                    className="w-full h-18 bg-[#349DC5] text-white rounded-[24px] flex items-center justify-between px-10 text-[11px] font-bold uppercase hover:shadow-md hover:shadow-blue-500/40 transition-all active:scale-95"
                  >
                    Log Attendance <LayoutGrid size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
function SidebarItem({ label, value, icon: Icon, color }: any) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-5">
        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/20">
          <Icon size={20} />
        </div>
        <span className="text-[10px] font-bold text-white/40 uppercase">
          {label}
        </span>
      </div>
      <span className={`text-[12px] font-bold ${color}`}>{value}</span>
    </div>
  );
}
