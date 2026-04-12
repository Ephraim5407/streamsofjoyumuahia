import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Bell,
  Users,
  Flame,
  ChevronRight,
  Calendar,
  Share2,
  Plus,
  RefreshCw,
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { BASE_URl } from "../../api/users";
import { listEvents } from "../../api/events";
import { getUnitSummaryById } from "../../api/unitSummary";
import AsyncStorage from "../../utils/AsyncStorage";
import { useSoulsStore } from "../../context/SoulsStore";

type UnitCardKey =
  | "achievements"
  | "souls"
  | "members"
  | "invited"
  | "married"
  | "external"
  | "songs"
  | "car"
  | "women"
  | "attendance"
  | "graduates"
  | "recovery"
  | "emporium"
  | "firstTimers"
  | "assigned"
  | "marriedMembers"
  | "church"
  | "addAttendance";

type IconLibrary =
  | "FontAwesome"
  | "FontAwesome5"
  | "FontAwesome6"
  | "Ionicons"
  | "MaterialIcons"
  | "MaterialCommunityIcons"
  | "Fontisto"
  | "Foundation";

type UnitCardIconSpec = {
  library: IconLibrary;
  name: string;
  color: string;
  size?: number;
};

type UnitCardConfig = {
  title: string;
  iconSpec: UnitCardIconSpec;
  route?: string;
  params?: Record<string, unknown>;
};

const UNIT_CARD_CONFIG: Record<UnitCardKey, UnitCardConfig> = {
  achievements: {
    title: "Unit Achievements",
    iconSpec: { library: "FontAwesome", name: "handshake-o", color: "#349DC5", size: 30 },
    route: "achievements",
  },
  souls: {
    title: "Souls You Won",
    iconSpec: { library: "FontAwesome5", name: "fire-alt", color: "#FF5722", size: 30 },
    route: "soul-harvested",
    params: { scope: "mine" },
  },
  members: {
    title: "Unit Members Assisted",
    iconSpec: { library: "MaterialIcons", name: "people", color: "#9C27B0", size: 30 },
    route: "members-assisted",
  },
  invited: {
    title: "People You Invited to Church",
    iconSpec: { library: "Ionicons", name: "person-add", color: "#4CAF50", size: 30 },
    route: "people-invited",
  },
  married: {
    title: "Unit Members That Got Married",
    iconSpec: { library: "Ionicons", name: "people", color: "#2196F3", size: 30 },
    route: "reports/married",
  },
  external: {
    title: "External Invitations & Partnerships",
    iconSpec: { library: "MaterialIcons", name: "handshake", color: "#FF9800", size: 30 },
    route: "reports/external",
  },
  songs: {
    title: "Songs Released",
    iconSpec: { library: "Fontisto", name: "applemusic", color: "#980545", size: 30 },
    route: "reports/songs",
  },
  car: {
    title: "Car Parked",
    iconSpec: { library: "Ionicons", name: "car", color: "#08b9ff", size: 30 },
  },
  women: {
    title: "Testimonies from Women",
    iconSpec: { library: "Foundation", name: "torsos-all-female", color: "#08b9ff", size: 30 },
    route: "reports/testimonies",
  },
  attendance: {
    title: "Church Attendance",
    iconSpec: { library: "Foundation", name: "list-thumbnails", color: "#000000", size: 30 },
    route: "attendance-home",
  },
  graduates: {
    title: "Graduated Students",
    iconSpec: { library: "FontAwesome5", name: "user-graduate", color: "#8c48f9", size: 30 },
    route: "reports/graduates",
  },
  recovery: {
    title: "Recovered Addicts",
    iconSpec: { library: "MaterialCommunityIcons", name: "file-restore", color: "#494922", size: 30 },
    route: "recovered-addicts",
  },
  emporium: {
    title: "Emporium Sales",
    iconSpec: { library: "Fontisto", name: "money-symbol", color: "#209948", size: 30 },
    route: "sales",
  },
  firstTimers: {
    title: "First Timers",
    iconSpec: { library: "FontAwesome6", name: "people-roof", color: "#4d3a4d", size: 30 },
    route: "reports/first-timers",
  },
  assigned: {
    title: "First Timers Assigned by You",
    iconSpec: { library: "FontAwesome6", name: "people-robbery", color: "skyblue", size: 30 },
    route: "reports/assigned",
  },
  marriedMembers: {
    title: "Members That Got Married",
    iconSpec: { library: "FontAwesome5", name: "hand-holding-heart", color: "gold", size: 30 },
    route: "reports/married",
  },
  church: {
    title: "Church Attendance",
    iconSpec: { library: "FontAwesome5", name: "church", color: "red", size: 30 },
    route: "attendance-home",
  },
  addAttendance: {
    title: "Church Attendance",
    iconSpec: { library: "FontAwesome5", name: "calendar-alt", color: "#4CAF50", size: 30 },
    route: "attendance/record",
  },
};

const CORE_BASE: readonly UnitCardKey[] = ["souls", "invited"] as const;
const CORE_WITH_MARRIED: readonly UnitCardKey[] = [...CORE_BASE, "married"] as const;
const FALLBACK_CARD_SET: readonly UnitCardKey[] = CORE_WITH_MARRIED;

const MAIN_CHURCH_UNIT_CARD_MAP: Record<string, readonly UnitCardKey[]> = {
  "CHABOD": [...CORE_BASE],
  "BANKERS UNIT": CORE_BASE,
  "COUPLES FELLOWSHIP": CORE_BASE,
  "COUNSELLING UNIT": CORE_BASE,
  "GRIT & GRACE": CORE_BASE,
  "HOME ARCHITECT": CORE_BASE,
  "JOSHUA GENERATION": CORE_BASE,
  "PASTORAL CARE UNIT": CORE_BASE,
  "MIGHTY ARROWS": CORE_BASE,
  "MEETERS AND GREETERS": CORE_BASE,
  "KINGDOM CARE UNIT": CORE_BASE,
  "JUBILEE AIRFORCE": CORE_BASE,
  "JUBILEE PILOT": [...CORE_BASE, "addAttendance"],
  "PILLARS OF GRACE": CORE_BASE,
  "PROGRAM LOGISTIC UNIT": CORE_BASE,
  "PROJECT PHILIP": CORE_BASE,
  "PROTOCOL": CORE_BASE,
  "REAL MEN": CORE_BASE,
  "TEEN'S CHURCH": CORE_BASE,
  "TEENS CHURCH": CORE_BASE,
  "TEMPLE KEEPERS": CORE_BASE,
  "TRAINING AND DEVELOPMENT": CORE_BASE,
  "TRANSPORT UNIT": CORE_BASE,
};

const MAIN_CHURCH_UNIT_DISPLAY: Record<string, string> = {
  "CHABOD": "Chabod",
  "BANKERS UNIT": "Bankers Unit",
  "COUPLES FELLOWSHIP": "Couples Fellowship",
  "COUNSELLING UNIT": "Counselling Unit",
  "GRIT & GRACE": "Grit & Grace",
  "HOME ARCHITECT": "Home Architect",
  "JOSHUA GENERATION": "Joshua Generation",
  "PASTORAL CARE UNIT": "Pastoral Care Unit",
  "MIGHTY ARROWS": "Mighty Arrows",
  "MEETERS AND GREETERS": "Meeters and Greeters",
  "KINGDOM CARE UNIT": "Kingdom Care Unit",
  "JUBILEE AIRFORCE": "Jubilee Airforce",
  "JUBILEE PILOT": "Jubilee Pilot",
  "PILLARS OF GRACE": "Pillars of Grace",
  "PROGRAM LOGISTIC UNIT": "Program Logistic Unit",
  "PROJECT PHILIP": "Project Philip",
  "PROTOCOL": "Protocol",
  "REAL MEN": "Real Men",
  "TEEN'S CHURCH": "Teen's Church",
  "TEENS CHURCH": "Teens Church",
  "TEMPLE KEEPERS": "Temple Keepers",
  "TRAINING AND DEVELOPMENT": "Training and Development",
  "TRANSPORT UNIT": "Transport Unit",
};

const YOUTH_UNIT_CARD_MAP: Record<string, readonly UnitCardKey[]> = {
  "JUBILEE FOUNTAINS MUSIC": CORE_BASE,
  "MEDIA SOUND": CORE_BASE,
  "MEDIA PROJECTION": CORE_BASE,
  "MEDIA PHOTOGRAPHY AND VIDEO": CORE_BASE,
  "SOCIAL MEDIA & CONTENT UNIT": CORE_BASE,
  "SOCIAL MEDIA AND CONTENT UNIT": CORE_BASE,
  "EVENT COMPERE & STAGE MANAGERS": CORE_BASE,
  "EVENT COMPERE AND STAGE MANAGERS": CORE_BASE,
  "JUBILEE PILOT Y&S": [...CORE_BASE, "addAttendance"],
  "JUBILEE PILOT": [...CORE_BASE, "addAttendance"],
  "GREETERS": CORE_BASE,
  "PROGRAM LOGISTICS & TRANSPORT UNIT": CORE_BASE,
  "PROGRAM LOGISTICS AND TRANSPORT UNIT": CORE_BASE,
  "EVANGELISM & OUTREACH UNIT": CORE_BASE,
  "EVANGELISM AND OUTREACH UNIT": CORE_BASE,
  "SINGLES TEMPLE KEEPERS": CORE_BASE,
  "TRIUMPHANT DRAMA FAMILY": CORE_BASE,
  "CAPACITY & BUSINESS DEVELOPMENT UNIT": CORE_BASE,
  "CAPACITY AND BUSINESS DEVELOPMENT UNIT": CORE_BASE,
  "FOLLOW UP UNIT": [...CORE_BASE, "firstTimers", "assigned"],
  "CREATIVES UNIT": CORE_BASE,
  "ARTISANS UNIT": CORE_BASE,
  "WELFARE AND CSR UNIT": CORE_BASE,
  "SOJ Y&S TECH COMMUNITY": CORE_BASE,
  "SOJ Y AND S TECH COMMUNITY": CORE_BASE,
};

const YOUTH_UNIT_DISPLAY: Record<string, string> = {
  "JUBILEE FOUNTAINS MUSIC": "Jubilee Fountains Music",
  "MEDIA SOUND": "Media Sound",
  "MEDIA PROJECTION": "Media Projection",
  "MEDIA PHOTOGRAPHY AND VIDEO": "Media Photography and Video",
  "SOCIAL MEDIA & CONTENT UNIT": "Social Media & Content Unit",
  "SOCIAL MEDIA AND CONTENT UNIT": "Social Media & Content Unit",
  "EVENT COMPERE & STAGE MANAGERS": "Event Compere & Stage Managers",
  "EVENT COMPERE AND STAGE MANAGERS": "Event Compere & Stage Managers",
  "JUBILEE PILOT": "Jubilee Pilot",
  "JUBILEE PILOT Y&S": "Jubilee Pilot Y&S",
  "GREETERS": "Greeters",
  "PROGRAM LOGISTICS & TRANSPORT UNIT": "Program Logistics & Transport Unit",
  "PROGRAM LOGISTICS AND TRANSPORT UNIT": "Program Logistics & Transport Unit",
  "EVANGELISM & OUTREACH UNIT": "Evangelism & Outreach Unit",
  "EVANGELISM AND OUTREACH UNIT": "Evangelism & Outreach Unit",
  "SINGLES TEMPLE KEEPERS": "Singles Temple Keepers",
  "TRIUMPHANT DRAMA FAMILY": "Triumphant Drama Family",
  "CAPACITY & BUSINESS DEVELOPMENT UNIT": "Capacity & Business Development Unit",
  "CAPACITY AND BUSINESS DEVELOPMENT UNIT": "Capacity & Business Development Unit",
  "FOLLOW UP UNIT": "Follow Up Unit",
  "CREATIVES UNIT": "Creatives Unit",
  "ARTISANS UNIT": "Artisans Unit",
  "WELFARE AND CSR UNIT": "Welfare and CSR Unit",
  "SOJ Y&S TECH COMMUNITY": "SOJ Y&S Tech Community",
  "SOJ Y AND S TECH COMMUNITY": "SOJ Y&S Tech Community",
};

const normalizeUnitName = (value?: string | null) => {
  if (!value) return "";
  return value
    .normalize("NFKD")
    .replace(/['']/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
};

const renderUnitCardIcon = (spec: UnitCardIconSpec) => {
  const size = spec.size ?? 28;
  const color = spec.color ?? "#2563eb";
  // Since WebPWA uses Lucide icons, map to Lucide equivalents
  // For simplicity, use a generic icon or map some
  return <div style={{ color, fontSize: size }}>⚡</div>; // Placeholder, need to map properly
};

const DashboardMember = () => {
  const navigate = useNavigate();
  const { personalCount, unitCount, refreshAll } = useSoulsStore();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [unitSummary, setUnitSummary] = useState<any>(null);
  const [unreadTotal, setUnreadTotal] = useState(0);

  const fetchProfile = async () => {
    try {
      setError(null);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setError("Missing token");
        setLoading(false);
        return;
      }
      const res = await axios.get(`${BASE_URl}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data?.ok) {
        const serverUser = res.data.user || {};
        const activeUnitIdLocal = await AsyncStorage.getItem("activeUnitId");
        if (activeUnitIdLocal) {
          serverUser.activeUnitId = activeUnitIdLocal === "global" ? null : activeUnitIdLocal;
        }
        setProfile(serverUser);
      } else {
        setError("Failed to load profile");
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const currentUnitId = profile?.activeUnitId || await AsyncStorage.getItem("activeUnitId");
      if (!token || !currentUnitId) {
        setUnitSummary(null);
        return;
      }
      const res = await getUnitSummaryById(token, currentUnitId);
      if (res?.ok) setUnitSummary(res);
    } catch {}
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (profile) {
      fetchSummary();
      refreshAll();
    }
  }, [profile]);

  const activeRoleEntry = useMemo(() => {
    if (!profile) return null;
    const roles = Array.isArray(profile.roles) ? profile.roles : [];
    const targetRole = profile?.activeRole || "";

    const currentUnitId = profile?.activeUnitId || profile?.activeUnit?.id || profile?.activeUnit;
    let match = null;

    if (currentUnitId) {
      match = roles.find((r: any) =>
        r.role === targetRole &&
        String(r.unit?.id || r.unit || r.unitId) === String(currentUnitId)
      );
    }

    if (!match) {
      match = roles.find((r: any) => r.role === targetRole);
    }

    return match || roles[0] || null;
  }, [profile]);

  const rawUnitName = useMemo(() => {
    if (!activeRoleEntry) return "";
    const candidate = activeRoleEntry.unitName || activeRoleEntry.unitLabel || activeRoleEntry.ministryName || activeRoleEntry.name;
    return typeof candidate === "string" ? candidate.trim() : "";
  }, [activeRoleEntry]);

  const normalizedUnitName = useMemo(() => normalizeUnitName(rawUnitName), [rawUnitName]);

  const normalizedMinistryName = useMemo(
    () => normalizeUnitName((activeRoleEntry?.ministryName as string | undefined) || ""),
    [activeRoleEntry]
  );

  const isYouthMinistry = useMemo(() => {
    if (!normalizedMinistryName) return false;
    return normalizedMinistryName.includes("YOUTH") || normalizedMinistryName.includes("SINGLES");
  }, [normalizedMinistryName]);

  const unitCardEntries = useMemo(() => {
    const unitLookupKey = normalizedUnitName || "CHABOD";
    const primaryMap = isYouthMinistry ? YOUTH_UNIT_CARD_MAP : MAIN_CHURCH_UNIT_CARD_MAP;
    const secondaryMap = isYouthMinistry ? MAIN_CHURCH_UNIT_CARD_MAP : YOUTH_UNIT_CARD_MAP;
    const mapping = primaryMap[unitLookupKey] || secondaryMap[unitLookupKey] || FALLBACK_CARD_SET;
    return Array.from(new Set(mapping), (key) => ({ key, config: UNIT_CARD_CONFIG[key] }));
  }, [normalizedUnitName, isYouthMinistry]);

  const unitCardDisplayName = useMemo(() => {
    const unitLookupKey = normalizedUnitName || "CHABOD";
    if (unitLookupKey) {
      const primaryDisplay = isYouthMinistry ? YOUTH_UNIT_DISPLAY : MAIN_CHURCH_UNIT_DISPLAY;
      const secondaryDisplay = isYouthMinistry ? MAIN_CHURCH_UNIT_DISPLAY : YOUTH_UNIT_DISPLAY;
      return (
        primaryDisplay[unitLookupKey] ||
        secondaryDisplay[unitLookupKey] ||
        rawUnitName ||
        ""
      );
    }
    return rawUnitName || "";
  }, [normalizedUnitName, rawUnitName, isYouthMinistry]);

  const cleanDbUnitName = unitSummary?.unit?.name ? unitSummary.unit.name.replace(/Unit/g, "").trim() : "";
  const headerUnitLabel = cleanDbUnitName ? `${cleanDbUnitName} Unit` : (unitCardDisplayName || "Chabod Unit");

  const handleUnitCardPress = (config: UnitCardConfig) => {
    if (!config.route) return;
    navigate(config.route, { state: config.params });
  };

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const events = await listEvents();
        const mapped = (events || []).map((e: any) => ({
          _id: e._id || e.id,
          id: e._id || e.id,
          title: e.title,
          date: e.date ? new Date(e.date).toLocaleString() : "",
          isoDate: e.date || undefined,
          venue: e.venue,
          description: e.description,
          tags: e.tags || [],
          status: e.status,
        }));
        setAllEvents(mapped);
      } catch (err: any) {
        console.error("Failed to load events:", err);
        setAllEvents([]);
      }
    };
    fetchEvents();
  }, []);

  const upcomingEvents = useMemo(() => {
    const raw = Array.isArray(allEvents) ? allEvents : [];
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const processed = raw
      .map((ev: any) => {
        if (!ev.isoDate) return null;
        const d = new Date(ev.isoDate);
        if (isNaN(d.getTime())) return null;
        return { ...ev, date: ev.isoDate, displayDate: ev.date || new Date(ev.isoDate).toLocaleString(), __date: d };
      })
      .filter((ev: any) => ev && ev.__date && ev.__date.getTime() >= startOfToday)
      .sort((a: any, b: any) => a.__date.getTime() - b.__date.getTime())
      .slice(0, 8)
      .map(({ __date, ...rest }: any) => rest);
    return processed;
  }, [allEvents]);

  useEffect(() => {
    if (!upcomingEvents.length) {
      setSelectedEvent(null);
      setEventModalVisible(false);
      return;
    }
    if (selectedEvent && upcomingEvents.some((ev: any) => (ev?._id || ev?.id) === (selectedEvent?._id || selectedEvent?.id))) {
      return;
    }
    setSelectedEvent(upcomingEvents[0]);
  }, [upcomingEvents, selectedEvent]);

  const openEventDetail = (event: any) => {
    setSelectedEvent(event);
    setEventModalVisible(true);
  };

  const closeEventDetail = () => {
    setEventModalVisible(false);
  };

  const formatEventDateTime = (value?: string) => {
    if (!value) return "Date not provided";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Date not provided";
    return parsed.toLocaleString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatEventDateParts = (value?: string) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return {
      dayName: parsed.toLocaleDateString(undefined, { weekday: "short" }),
      day: parsed.getDate().toString().padStart(2, "0"),
      month: parsed.toLocaleDateString(undefined, { month: "short" }),
    };
  };

  const getStatusAccent = (status?: string) => {
    if (!status) return { backgroundColor: "rgba(52, 157, 197, 0.16)", borderColor: "rgba(52, 157, 197, 0.35)", textColor: "#1f5d7a" };
    const key = status.toLowerCase();
    if (key === "upcoming") return { backgroundColor: "rgba(34,197,94,0.16)", borderColor: "rgba(34,197,94,0.4)", textColor: "#166534" };
    if (key === "past") return { backgroundColor: "rgba(107,114,128,0.12)", borderColor: "rgba(107,114,128,0.3)", textColor: "#374151" };
    return { backgroundColor: "rgba(52, 157, 197, 0.16)", borderColor: "rgba(52, 157, 197, 0.35)", textColor: "#1f5d7a" };
  };

  return (
    <div className="min-h-screen bg-background dark:bg-dark-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-blue-600 p-6 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate("/profile")}
              className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center"
            >
              {profile?.profile?.avatar ? (
                <img src={profile.profile.avatar} className="w-10 h-10 rounded-full" alt="Profile" />
              ) : (
                <User size={20} className="text-white" />
              )}
            </button>
            <button
              onClick={() => navigate("/notifications")}
              className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center relative"
            >
              <Bell size={20} className="text-white" />
              {unreadTotal > 0 && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadTotal > 9 ? "9+" : unreadTotal}
                </div>
              )}
            </button>
          </div>
          <div className="text-white">
            <h1 className="text-2xl font-bold mb-1">
              Welcome {profile?.title ? profile.title : ""} {profile?.firstName || ""}
            </h1>
            <p className="text-white/90 mb-4">{headerUnitLabel} | {profile?.activeRole || "Member"}</p>
            {Array.isArray(profile?.roles) && profile.roles.length > 1 && (
              <button className="bg-white/20 border border-white/30 px-4 py-2 rounded-full text-sm">
                Switch Role
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6 space-y-6 pb-24">
        {loading ? (
          <div className="flex justify-center py-20">
            <RefreshCw className="animate-spin" size={48} />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-500">Error: {error}</p>
          </div>
        ) : (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-surface dark:bg-dark-surface p-6 rounded-2xl shadow-sm border border-border dark:border-dark-border">
                <div className="flex items-center justify-center mb-4">
                  <Users size={24} className="text-gray-500 mr-2" />
                  <span className="text-sm font-medium text-gray-500">Total Unit Members</span>
                </div>
                <p className="text-4xl font-bold text-center text-text-primary dark:text-dark-text-primary mb-4">
                  {unitSummary?.counts?.membersCount ?? profile?.metrics?.unitMembers ?? "—"}
                </p>
                <button
                  onClick={() => navigate("/member-list")}
                  className="w-full bg-primary text-white py-2 rounded-xl font-medium"
                >
                  View Member List
                </button>
              </div>
              <div className="bg-surface dark:bg-dark-surface p-6 rounded-2xl shadow-sm border border-border dark:border-dark-border">
                <div className="flex items-center justify-center mb-4">
                  <Flame size={24} className="text-orange-500 mr-2" />
                  <span className="text-sm font-medium text-gray-500">Soul Won (Unit)</span>
                </div>
                <p className="text-4xl font-bold text-center text-text-primary dark:text-dark-text-primary">
                  {unitCount ?? 0}
                </p>
              </div>
            </div>

            {/* Unit Cards */}
            {unitCardEntries.length > 0 && (
              <div className="bg-surface dark:bg-dark-surface p-6 rounded-2xl shadow-sm border border-border dark:border-dark-border">
                <h2 className="text-lg font-bold mb-4 text-text-primary dark:text-dark-text-primary">Unit Activities</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {unitCardEntries.map(({ key, config }) => (
                    <button
                      key={key}
                      onClick={() => handleUnitCardPress(config)}
                      className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl flex flex-col items-center justify-center hover:bg-primary/10 transition-colors"
                    >
                      <div className="w-12 h-12 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center mb-2">
                        {renderUnitCardIcon(config.iconSpec)}
                      </div>
                      <span className="text-sm font-medium text-center text-text-primary dark:text-dark-text-primary">
                        {config.title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Events */}
            <div className="space-y-4">
              <div className="flex items-center">
                <Calendar size={20} className="text-gray-500 mr-2" />
                <h2 className="text-xl font-bold text-text-primary dark:text-dark-text-primary">Upcoming Events</h2>
              </div>
              <div className="flex space-x-4 overflow-x-auto pb-4">
                {upcomingEvents.length === 0 ? (
                  <div className="flex-shrink-0 w-40 h-24 bg-surface dark:bg-dark-surface rounded-xl flex items-center justify-center border border-border dark:border-dark-border">
                    <span className="text-gray-500">No Upcoming Events</span>
                  </div>
                ) : (
                  upcomingEvents.map((ev: any) => {
                    const hasDate = ev?.date && !Number.isNaN(new Date(ev.date).getTime());
                    const d = hasDate ? new Date(ev.date) : null;
                    const isActive = selectedEvent ? (ev?._id || ev?.id) === (selectedEvent?._id || selectedEvent?.id) : false;
                    return (
                      <button
                        key={ev._id || ev.id || ev.title}
                        onClick={() => openEventDetail(ev)}
                        className={`flex-shrink-0 w-40 h-24 bg-surface dark:bg-dark-surface p-4 rounded-xl border ${
                          isActive ? "border-primary" : "border-border dark:border-dark-border"
                        } flex flex-col justify-center`}
                      >
                        <p className={`text-sm font-semibold truncate ${isActive ? "text-primary" : "text-text-primary"}`}>
                          {ev.title ?? "Untitled Event"}
                        </p>
                        <p className={`text-xs ${isActive ? "text-primary" : "text-gray-500"}`}>
                          {d ? d.toLocaleDateString() : "Date TBA"}
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Event Modal */}
      <AnimatePresence>
        {eventModalVisible && selectedEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50"
            onClick={closeEventDetail}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-surface dark:bg-dark-surface rounded-2xl max-w-md w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-primary to-blue-600 p-6 text-white">
                <div className="flex items-center mb-4">
                  <div className="w-16 h-20 bg-white/20 rounded-lg flex flex-col items-center justify-center mr-4">
                    {(() => {
                      const parts = formatEventDateParts(selectedEvent.date);
                      return (
                        <>
                          <span className="text-xs font-semibold">{parts?.dayName ?? "--"}</span>
                          <span className="text-2xl font-bold">{parts?.day ?? "--"}</span>
                          <span className="text-xs">{parts?.month ?? ""}</span>
                        </>
                      );
                    })()}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold mb-2">{selectedEvent.title ?? "Untitled Event"}</h3>
                    <div
                      className="inline-block px-3 py-1 rounded-full text-xs font-medium"
                      style={getStatusAccent(selectedEvent.status)}
                    >
                      {selectedEvent.status ?? "Scheduled"}
                    </div>
                  </div>
                </div>
                <p className="text-sm opacity-90">{formatEventDateTime(selectedEvent.date)}</p>
                {selectedEvent.venue && (
                  <div className="flex items-center mt-2">
                    <span className="text-sm opacity-90">📍 {selectedEvent.venue}</span>
                  </div>
                )}
              </div>
              <div className="p-6">
                {selectedEvent.description && (
                  <div className="mb-4">
                    <h4 className="font-semibold mb-2">Overview</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{selectedEvent.description}</p>
                  </div>
                )}
                {Array.isArray(selectedEvent.tags) && selectedEvent.tags.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-semibold mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedEvent.tags.map((tag: string) => (
                        <span key={tag} className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={async () => {
                      try {
                        await navigator.share?.({
                          title: selectedEvent.title,
                          text: `${selectedEvent.title}\n${formatEventDateTime(selectedEvent.date)}\n${selectedEvent.venue || ""}\n\n${selectedEvent.description || ""}`,
                        });
                      } catch {}
                    }}
                    className="flex-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 py-3 rounded-xl font-medium flex items-center justify-center gap-2"
                  >
                    <Share2 size={16} />
                    Share
                  </button>
                  <button
                    onClick={() => {
                      toast.success("Added to calendar!");
                    }}
                    className="flex-1 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 py-3 rounded-xl font-medium flex items-center justify-center gap-2"
                  >
                    <Plus size={16} />
                    Add to Calendar
                  </button>
                </div>
                <button
                  onClick={closeEventDetail}
                  className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-medium mt-3"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardMember;