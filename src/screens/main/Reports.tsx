import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search, Heart, GraduationCap, Music, Car,
  MessageSquare, Users, UserPlus, Flame, Handshake,
  Calendar, TrendingUp,
  LayoutDashboard, HandHeart, DollarSign,
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
    color: "text-[#494922]",
    bg: "bg-yellow-50 dark:bg-[#494922]/10",
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
    bg: "bg-purple-50 dark:bg-[#4d3a4d]/20",
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
    key: "marriedMembers",
    title: "Members That Got Married",
    description: "Celebrate unit members that got married.",
    icon: Heart,
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    path: "/reports/married",
  },
  {
    key: "church",
    title: "Church Attendance",
    description: "Monitor service attendance.",
    icon: Calendar,
    color: "text-red-500",
    bg: "bg-red-500/10",
    path: "/attendance/main-church",
  },
  {
    key: "equipment",
    title: "Equipment",
    description: "Manage, assign, and track media equipment.",
    icon: LayoutDashboard,
    color: "text-[#FF5722]",
    bg: "bg-[#FF5722]/10",
    path: "/reports/equipment",
  },
  {
    key: "broadcast",
    title: "Broadcast",
    description: "Log live broadcasts and media transmissions.",
    icon: Flame,
    color: "text-[#2196F3]",
    bg: "bg-[#2196F3]/10",
    path: "/reports/broadcast",
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
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Loading Reports...</p>
      </div>
    );
  }

  const safeRole = String(activeRole || "");
  const normalizedRole = safeRole.toLowerCase().replace(/[^a-z]/g, "");
  /* Matches App/src/screens/Tab/ReportScreen.tsx: SuperAdmin → ComingSoon */
  const isSuperAdminTab = normalizedRole.includes("superadmin");

  if (isSuperAdminTab) {
    return (
      <ComingSoon
        title="Reporting Hub"
        tag="Coming Soon"
        subtitle="We are crafting a high-fidelity intelligence hub for your clearance level."
        message="Our team is currently building this module. Check back shortly for updates."
      />
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-[#f7f9fb] dark:bg-[#121212] font-bold">
      {/* Fixed header bar — same hierarchy as App UnitLeader ReportScreen (PRIMARY_BLUE bar + Reports title) */}
      <header className="shrink-0 z-30 bg-[#349DC5] text-white shadow-sm">
        <div className="px-5 pt-4 pb-5 max-w-7xl mx-auto w-full">
          <h1 className="text-2xl sm:text-[25px] font-bold capitalize tracking-tight text-white">
            Reports
          </h1>
          {unitName ? (
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/85 mt-1">
              {unitName}
            </p>
          ) : null}
        </div>
        <div className="px-5 pb-4 max-w-7xl mx-auto w-full">
          <div className="relative max-w-2xl">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50"
              size={18}
            />
            <input
              type="search"
              placeholder="Search reports…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-12 pl-11 pr-4 rounded-xl bg-white/15 border border-white/25 text-white text-sm font-semibold placeholder:text-white/50 outline-none focus:bg-white/20 focus:border-white/40"
            />
          </div>
        </div>
      </header>

      <div className="flex-1 px-3 sm:px-5 py-5 max-w-7xl mx-auto w-full pb-28 md:pb-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {filteredTools.map((tool, index) => (
            <motion.button
              type="button"
              key={tool.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              onClick={() => navigate(tool.path)}
              title={tool.description}
              className="group flex flex-col items-center justify-center min-h-[130px] rounded-[10px] bg-white dark:bg-[#1a1c1e] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-none border border-[#eee] dark:border-white/5 active:scale-[0.98] transition-transform text-center"
            >
              <div
                className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center mb-2",
                  tool.bg,
                  tool.color,
                )}
              >
                <tool.icon size={26} />
              </div>
              <span className="text-sm font-bold text-[#333] dark:text-white leading-snug">
                {tool.title}
              </span>
            </motion.button>
          ))}
        </div>

        {filteredTools.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-[#333] dark:text-white">
            <p className="text-sm font-bold">No reports match your search</p>
          </div>
        )}
      </div>
    </div>
  );
}
