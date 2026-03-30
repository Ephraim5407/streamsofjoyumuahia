import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search, Heart, GraduationCap, Music, Car,
  MessageSquare, Users, UserPlus, Flame, Handshake,
  Calendar, Award, TrendingUp, ChevronRight, ShieldCheck,
  LayoutDashboard, HandHeart, RefreshCw, DollarSign,
} from "lucide-react";
import axios from "axios";
import { BASE_URl } from "../../api/users";
import AsyncStorage from "../../utils/AsyncStorage";
import ComingSoon from "../ComingSoon/ComingSoon";

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

type ReportItem = {
  key: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  bg: string;
  path: string;
};

type UnitType = "chabod" | "follow up" | "other" | "emporium" | "recovery" | "academy" | "care" | "watchtower" | "jubilee" | "media unit";

const deriveUnitType = (input?: string | null): UnitType => {
  if (!input) return "other";
  const n = input.trim().toLowerCase();
  if (n.includes("chabod")) return "chabod";
  if (n.includes("follow")) return "follow up";
  if (n.includes("emporium")) return "emporium";
  if (n.includes("recover") || n.includes("rehab")) return "recovery";
  if (n.includes("academy") || n.includes("school")) return "academy";
  if (n.includes("care")) return "care";
  if (n.includes("watchtower") || n.includes("security")) return "watchtower";
  return "other";
};

// All possible report cards — exact names from App/src/screens/main/UnitLeader/ReportScreen.tsx
const ALL_TOOLS: ReportItem[] = [
  {
    key: "achievements",
    title: "Unit Achievements",
    description: "Document unit victories and celestial achievements.",
    icon: Handshake,
    color: "text-[#349DC5]",
    bg: "bg-[#349DC5]/10",
    path: "/achievements",
  },
  {
    key: "souls",
    title: "Souls You Won",
    description: "Track kingdom expansion and evangelism data.",
    icon: Flame,
    color: "text-[#FF5722]",
    bg: "bg-[#FF5722]/10",
    path: "/soul-harvested",
  },
  {
    key: "members",
    title: "Unit Members Assisted",
    description: "Document and track member support initiatives.",
    icon: Users,
    color: "text-[#9C27B0]",
    bg: "bg-[#9C27B0]/10",
    path: "/members-assisted",
  },
  {
    key: "invited",
    title: "People You Invited to Church",
    description: "Review guests and new-member pipeline.",
    icon: UserPlus,
    color: "text-[#4CAF50]",
    bg: "bg-[#4CAF50]/10",
    path: "/people-invited",
  },
  {
    key: "married",
    title: "Unit Members That Got Married",
    description: "Celebrate and archive unit marriages.",
    icon: Heart,
    color: "text-[#2196F3]",
    bg: "bg-[#2196F3]/10",
    path: "/reports/married",
  },
  {
    key: "attendance",
    title: "Church Attendance",
    description: "Monitor service attendance and engagement.",
    icon: Calendar,
    color: "text-[#4CAF50]",
    bg: "bg-[#4CAF50]/10",
    path: "/attendance/main-church",
  },
  {
    key: "attendanceY&S",
    title: "Y&S Attendance",
    description: "Youth & Singles attendance tracking.",
    icon: Calendar,
    color: "text-yellow-600",
    bg: "bg-yellow-50 dark:bg-yellow-900/10",
    path: "/attendance/ys",
  },
  {
    key: "external",
    title: "External Invitations & Partnerships",
    description: "Log external collaborations and outreach partnerships.",
    icon: Handshake,
    color: "text-[#FF9800]",
    bg: "bg-[#FF9800]/10",
    path: "/reports/external",
  },
  {
    key: "songs",
    title: "Songs Released",
    description: "Catalog unit-produced music and anthems.",
    icon: Music,
    color: "text-[#980545]",
    bg: "bg-[#980545]/10",
    path: "/reports/songs",
  },
  {
    key: "car",
    title: "Car Packed",
    description: "Equipment monitoring and vehicle transport data.",
    icon: Car,
    color: "text-[#08B9FF]",
    bg: "bg-[#08B9FF]/10",
    path: "/reports/logistics",
  },
  {
    key: "women",
    title: "Testimonies from Women",
    description: "Curate testimonies and miracle reports.",
    icon: MessageSquare,
    color: "text-[#08B9FF]",
    bg: "bg-[#08B9FF]/10",
    path: "/reports/testimonies",
  },
  {
    key: "viewAttendance",
    title: "View Church Attendance",
    description: "Review all past church attendance logs.",
    icon: Calendar,
    color: "text-gray-600",
    bg: "bg-gray-100 dark:bg-gray-800",
    path: "/attendance-home",
  },
  {
    key: "graduates",
    title: "Graduated Student",
    description: "Track graduation from various SOJ Academies.",
    icon: GraduationCap,
    color: "text-[#8C48F9]",
    bg: "bg-[#8C48F9]/10",
    path: "/reports/graduates",
  },
  {
    key: "recovery",
    title: "Recovered Addicts",
    description: "Track rehabilitation and recovery milestones.",
    icon: HandHeart,
    color: "text-yellow-700",
    bg: "bg-yellow-50 dark:bg-yellow-900/10",
    path: "/recovered-addicts",
  },
  {
    key: "emporium",
    title: "Emporium Sales",
    description: "Track and manage emporium store sales.",
    icon: DollarSign,
    color: "text-[#209948]",
    bg: "bg-[#209948]/10",
    path: "/sales",
  },
  {
    key: "firstTimers",
    title: "First Timers",
    description: "Log and track first-time visitors.",
    icon: Users,
    color: "text-[#4d3a4d]",
    bg: "bg-purple-50 dark:bg-purple-900/10",
    path: "/reports/first-timers",
  },
  {
    key: "assigned",
    title: "First Timers assigned by you",
    description: "Track first-timers you have been assigned to follow up.",
    icon: UserPlus,
    color: "text-sky-500",
    bg: "bg-sky-50 dark:bg-sky-900/10",
    path: "/reports/assigned",
  },
  {
    key: "membersList",
    title: "Unit Members",
    description: "Manage active duty personnel and data.",
    icon: Users,
    color: "text-[#349DC5]",
    bg: "bg-[#349DC5]/10",
    path: "/member-list",
  },
  {
    key: "finance",
    title: "Finance",
    description: "Oversee unit treasury and operational spend.",
    icon: TrendingUp,
    color: "text-[#349DC5]",
    bg: "bg-[#349DC5]/10",
    path: "/finance/history",
  },
  {
    key: "equipment",
    title: "Media Equipment",
    description: "Manage, assign, and track media equipment.",
    icon: LayoutDashboard,
    color: "text-[#FF5722]",
    bg: "bg-[#FF5722]/10",
    path: "/reports/equipment",
  },
  {
    key: "broadcast",
    title: "Broadcasts",
    description: "Log live broadcasts and media transmissions.",
    icon: Flame,
    color: "text-[#2196F3]",
    bg: "bg-[#2196F3]/10",
    path: "/reports/broadcast",
  },
];

export default function ReportsHub() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [unitName, setUnitName] = useState<string | null>(null);
  const [unitType, setUnitType] = useState<UnitType>("other");
  const [enabledCards, setEnabledCards] = useState<string[] | null>(null);
  const [musicAllowed, setMusicAllowed] = useState(false);
  const [attendanceAllowed, setAttendanceAllowed] = useState(false);
  const [activeRole, setActiveRole] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        const rawUser = await AsyncStorage.getItem("user");
        if (!token || !rawUser) { setLoading(false); return; }
        const u = JSON.parse(rawUser);
        const role = u.activeRole || u.role || "";
        setActiveRole(role);

        const unitId = u?.activeUnitId
          || u?.activeUnit?._id
          || (u?.roles || []).find((r: any) => r.role === "UnitLeader" && r.unit)?.unit
          || (u?.roles || []).find((r: any) => r.role === "Member" && r.unit)?.unit
          || u?.unitId
          || u?.unit;

        if (unitId) {
          const res = await axios.get(`${BASE_URl}/api/units/public`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.data?.ok && Array.isArray(res.data.units)) {
            const myUnit = res.data.units.find((x: any) => String(x._id) === String(unitId));
            if (myUnit) {
              setUnitName(myUnit.name || u.activeUnitName || null);
              if (myUnit.musicUnit) setMusicAllowed(true);
              if (myUnit.attendanceTaking) setAttendanceAllowed(true);
              if (Array.isArray(myUnit.enabledReportCards)) setEnabledCards(myUnit.enabledReportCards);
              setUnitType(deriveUnitType(myUnit.ministryName || myUnit.name));
            }
          }
        } else {
          setUnitName(u.activeUnitName || "Unit Hub");
        }
      } catch (e) {
        // silent
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredTools = useMemo(() => {
    let base = [...ALL_TOOLS];
    const unitNameLower = unitName?.toLowerCase() || "";

    // Gate songs by music unit flag
    if (!(musicAllowed || unitNameLower.includes("chabod") || unitNameLower.includes("jubilee fountains music") || unitNameLower.includes("music"))) {
      base = base.filter((i) => i.key !== "songs");
    }

    // Gate optional cards by enabledReportCards
    const gatedKeys = new Set(["songs", "recovery", "emporium", "firstTimers", "assigned", "marriedMembers"]);
    if (enabledCards && enabledCards.length > 0) {
      const allowed = new Set(enabledCards);
      base = base.filter((i) => !gatedKeys.has(i.key) || allowed.has(i.key));
    }

    // Always show viewAttendance if attendanceTaking is true
    if (!attendanceAllowed) {
      base = base.filter((i) => i.key !== "viewAttendance");
    }

    // Derive extra keys based on exact unit name — matches App/src/screens/main/UnitLeader/ReportScreen.tsx
    let extraKeys: string[] = [];
    if (unitNameLower === "chabod") extraKeys = ["songs", "external", "married", "membersList", "finance"];
    else if (unitNameLower === "bankers unit") extraKeys = ["married", "membersList", "finance"];
    else if (unitNameLower === "grit & grace") extraKeys = ["married", "membersList", "finance"];
    else if (unitNameLower === "joshua generation") extraKeys = ["married", "membersList", "finance"];
    else if (unitNameLower === "pastoral care unit") extraKeys = ["married", "membersList", "finance"];
    else if (unitNameLower.includes("jubilee") && !unitNameLower.includes("y&s") && unitNameLower !== "jubilee fountains music") extraKeys = ["attendance", "married", "membersList", "finance"];
    else if (unitNameLower === "jubilee pilot y&s" || unitNameLower.includes("jubilee pilot y&s")) extraKeys = ["attendanceY&S", "married", "membersList", "finance"];
    else if (unitNameLower === "admin executive unit" || unitNameLower.includes("admin executive")) extraKeys = ["membersList", "finance"];
    else if (unitNameLower === "mighty arrows") extraKeys = ["married", "membersList", "finance"];
    else if (unitNameLower === "meeters and greeters") extraKeys = ["married", "membersList", "finance"];
    else if (unitNameLower === "kingdom care unit") extraKeys = ["married", "membersList", "finance"];
    else if (unitNameLower === "jubilee airforce") extraKeys = ["married", "membersList", "finance"];
    else if (unitNameLower === "program logistic unit") extraKeys = ["married", "membersList", "finance"];
    else if (unitNameLower === "project philip") extraKeys = ["married", "membersList", "finance"];
    else if (unitNameLower === "protocol") extraKeys = ["married", "membersList", "finance"];
    else if (unitNameLower === "teens church") extraKeys = ["married", "membersList", "finance"];
    else if (unitNameLower === "temple keepers") extraKeys = ["married", "membersList", "finance"];
    else if (unitNameLower === "training and development") extraKeys = ["married", "membersList", "finance"];
    else if (unitNameLower === "transport unit") extraKeys = ["married", "membersList", "finance"];
    else if (unitNameLower === "jubilee fountains music") extraKeys = ["songs", "external", "married", "membersList", "finance"];
    else if (unitNameLower === "media sound") extraKeys = ["married", "membersList", "finance"];
    else if (unitNameLower === "media projection") extraKeys = ["married", "membersList", "finance"];
    else if (unitNameLower === "media photography and video") extraKeys = ["married", "membersList", "finance"];
    else if (unitNameLower === "social media & content unit") extraKeys = ["married", "membersList", "finance"];
    else if (unitNameLower === "event compere & stage managers") extraKeys = ["married", "membersList", "finance"];
    else if (unitNameLower === "greeters") extraKeys = ["married", "membersList", "finance"];
    else if (unitNameLower === "program logistics & transport unit") extraKeys = ["married", "membersList", "finance"];
    else if (unitNameLower === "evangelism & outreach unit") extraKeys = ["married", "membersList", "finance"];
    else if (unitNameLower === "singles temple keepers") extraKeys = ["married", "membersList", "finance"];
    else if (unitNameLower === "triumphant drama family") extraKeys = ["married", "membersList", "finance"];
    else if (unitNameLower === "capacity & business development unit") extraKeys = ["married", "membersList", "finance"];
    else if (unitNameLower === "follow up unit") extraKeys = ["firstTimers", "assigned", "married", "membersList", "finance"];
    else if (unitNameLower === "creatives unit") extraKeys = ["married", "membersList", "finance"];
    else if (unitNameLower === "artisans unit") extraKeys = ["married", "membersList", "finance"];
    else if (unitNameLower === "welfare and csr unit") extraKeys = ["married", "membersList", "finance"];
    else if (unitNameLower === "soj y&s tech community") extraKeys = ["married", "membersList", "finance"];
    else if (unitNameLower === "watch tower") extraKeys = ["car", "membersList", "finance"];
    else if (unitNameLower === "academic") extraKeys = ["attendance", "graduates", "membersList", "finance"];
    else if (unitNameLower === "recovery") extraKeys = ["recovery", "membersList", "finance"];
    else if (unitNameLower === "media unit") extraKeys = ["equipment", "broadcast", "membersList", "finance"];
    else if (unitNameLower === "pastoral care") extraKeys = ["firstTimers", "assigned", "membersList", "finance"];
    else if (unitNameLower === "emporium") extraKeys = ["emporium", "married", "membersList", "finance"];
    else extraKeys = ["married", "membersList", "finance"];

    // Common keys shown for all units — matches app exactly
    const commonKeys = ["achievements", "souls", "members", "invited"];
    if (attendanceAllowed) commonKeys.push("viewAttendance");

    const allowedKeys = new Set([...commonKeys, ...extraKeys]);

    return base
      .filter((item) => allowedKeys.has(item.key))
      .filter(
        (t) =>
          t.title.toLowerCase().includes(search.toLowerCase()) ||
          t.description.toLowerCase().includes(search.toLowerCase()),
      );
  }, [search, unitName, musicAllowed, attendanceAllowed, enabledCards, unitType]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="w-12 h-12 rounded-full border-4 border-[#349DC5] border-t-transparent animate-spin" />
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Loading Mission Control...</p>
      </div>
    );
  }

  const safeRole = String(activeRole || "");
  const normalizedRole = safeRole.toLowerCase().replace(/[^a-z]/g, "");
  const isAltAdmin = normalizedRole.includes("superadmin") || normalizedRole.includes("ministryadmin");

  if (isAltAdmin) {
    return (
      <ComingSoon
        title="Reporting Hub"
        tag="Coming Soon"
        subtitle="We are crafting a high-fidelity intelligence hub for your clearance level."
        message="Our team is building an advanced data analytics engine for leadership. Check back shortly for the upgraded mission control experience."
      />
    );
  }

  return (
    <div className="pb-24 max-w-7xl mx-auto px-4 sm:px-6 pt-10 font-bold">
      <header className="mb-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-[#00204a] text-white rounded-xl flex items-center justify-center shadow">
              <LayoutDashboard size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-[#00204a] dark:text-white leading-none uppercase tracking-tight">
                Reports
              </h1>
              <p className="text-[10px] font-black text-[#349DC5] uppercase mt-2 tracking-widest">
                {unitName || "Unit Hub"}
              </p>
            </div>
          </div>
        </div>
        <div className="relative group max-w-2xl">
          <Search
            className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#349DC5] transition-colors"
            size={20}
          />
          <input
            type="text"
            placeholder="Search report modules..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-16 pl-14 pr-6 bg-white dark:bg-[#1a1c1e] rounded-xl shadow-sm border border-gray-100 dark:border-white/5 font-bold text-sm outline-none focus:border-[#349DC5]/20 transition-all placeholder:text-gray-300 text-[#00204a] dark:text-white uppercase"
          />
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredTools.map((tool, index) => (
          <motion.div
            key={tool.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            onClick={() => navigate(tool.path)}
            className="group bg-white dark:bg-[#1a1c1e] p-8 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 cursor-pointer hover:border-[#349DC5]/30 transition-all active:scale-95 flex flex-col items-center text-center"
          >
            <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mb-6 transition-transform group-hover:scale-110 shadow-inner", tool.bg, tool.color)}>
              <tool.icon size={28} />
            </div>
            <h3 className="text-base font-bold text-[#00204a] dark:text-white mb-2 group-hover:text-[#349DC5] transition-colors leading-snug">
              {tool.title}
            </h3>
            <p className="text-gray-400 font-medium text-xs leading-relaxed mb-6 flex-1">
              {tool.description}
            </p>
            <div className="mt-auto flex items-center gap-2 text-[10px] font-bold text-[#349DC5] uppercase bg-blue-50 dark:bg-blue-900/10 px-5 py-2.5 rounded-xl group-hover:bg-[#349DC5] group-hover:text-white transition-all">
              Open <ChevronRight size={14} />
            </div>
          </motion.div>
        ))}
      </div>

      {filteredTools.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-6">
          <div className="w-20 h-20 rounded-[40px] bg-gray-50 dark:bg-white/5 flex items-center justify-center text-5xl">📋</div>
          <p className="text-sm font-black text-[#00204a] dark:text-white uppercase tracking-widest">No modules match your search</p>
        </div>
      )}

      <footer className="mt-20 py-10 border-t border-gray-100 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 opacity-60">
        <div className="flex items-center gap-3">
          <ShieldCheck size={18} className="text-emerald-500" />
          <span className="text-[9px] font-bold uppercase text-[#00204a] dark:text-white">Secure Deployment Link</span>
        </div>
        <p className="text-[9px] font-bold uppercase text-gray-400 text-center">
          © 2025 STREAMS OF JOY • UNIT DASHBOARD
        </p>
      </footer>
    </div>
  );
}
