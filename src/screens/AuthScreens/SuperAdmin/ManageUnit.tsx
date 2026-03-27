import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ChevronLeft, Search, Briefcase, CheckSquare, User, ShieldCheck } from "lucide-react";
import { BASE_URl } from "../../../api/users";
import AsyncStorage from "../../../utils/AsyncStorage";

const PRIMARY = "#349DC5";

interface DisplayUser {
  id: string;
  name: string;
  role: "Super Admin" | "Ministry Admin" | "Unit Leader";
  avatarUri?: string;
  unit: string;
}

interface BackendRole {
  role: string;
  unit?: any;
  ministryName?: string;
}

interface BackendUser {
  _id: string;
  firstName: string;
  surname: string;
  approved?: boolean;
  roles: BackendRole[];
  profile?: { avatar?: string } | null;
}

function resolveAvatar(raw?: string | null) {
  if (!raw?.trim()) return undefined;
  if (/^https?:\/\//i.test(raw.trim())) return raw.trim();
  return `${BASE_URl.replace(/\/$/, "")}/${raw.trim().replace(/^\/+/, "")}`;
}

function Shimmer() {
  return (
    <div className="space-y-6 animate-pulse">
      {[60, 50, 68, 55, 45, 65].map((w, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border border-gray-100 dark:border-white/5 rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 rounded bg-gray-100 dark:bg-white/5" style={{ width: `${w}%` }} />
            <div className="h-2.5 rounded bg-gray-50 dark:bg-white/5" style={{ width: `${Math.max(28, w - 22)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ManageUnit() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [superAdmins, setSuperAdmins] = useState<DisplayUser[]>([]);
  const [ministryAdmins, setMinistryAdmins] = useState<DisplayUser[]>([]);
  const [unitLeaders, setUnitLeaders] = useState<DisplayUser[]>([]);
  const [pendingUnits, setPendingUnits] = useState(0);
  const [pendingWork, setPendingWork] = useState(0);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [currentMinistry, setCurrentMinistry] = useState<string | null>(null);
  const [activeUserRole, setActiveUserRole] = useState<string | null>(null);

  const mapUsers = useCallback(
    (list: BackendUser[], role: string | null, ministry: string | null, currentUser?: BackendUser | null) => {
      const rLower = (role || "").toLowerCase();
      const saMap = new Map<string, DisplayUser>();
      const maMap = new Map<string, DisplayUser>();
      const ulMap = new Map<string, DisplayUser>();

      list.forEach((u) => {
        if (u.approved === false) return;
        const avatar = resolveAvatar(u.profile?.avatar);
        const name = `${u.firstName || ""} ${u.surname || ""}`.trim() || "Unnamed";
        (u.roles || []).forEach((r) => {
          const rk = (r.role || "").toLowerCase();
          if (rk === "superadmin") {
            if (rLower === "superadmin" && !saMap.has(u._id))
              saMap.set(u._id, { id: u._id, name, role: "Super Admin", avatarUri: avatar, unit: "" });
          } else if (rk === "ministryadmin") {
            if ((rLower === "superadmin" || (rLower === "ministryadmin" && r.ministryName === ministry)) && !saMap.has(u._id))
              saMap.set(u._id, { id: u._id, name, role: "Super Admin", avatarUri: avatar, unit: "" });
            if (!maMap.has(u._id))
              maMap.set(u._id, { id: u._id, name, role: "Ministry Admin", avatarUri: avatar, unit: r.ministryName || "" });
          } else if (rk === "unitleader") {
            if ((rLower === "superadmin" || r.ministryName === ministry) && !ulMap.has(u._id)) {
              const unitName = r.unit?.name || r.unit || "";
              ulMap.set(u._id, { id: u._id, name, role: "Unit Leader", avatarUri: avatar, unit: unitName });
            }
          }
        });
      });

      if (currentUser && rLower === "superadmin" && !saMap.has(currentUser._id)) {
        const avatar = resolveAvatar(currentUser.profile?.avatar);
        const name = `${currentUser.firstName || ""} ${currentUser.surname || ""}`.trim() || "Unnamed";
        saMap.set(currentUser._id, { id: currentUser._id, name, role: "Super Admin", avatarUri: avatar, unit: "" });
      }

      return {
        superAdmins: Array.from(saMap.values()),
        ministryAdmins: Array.from(maMap.values()),
        unitLeaders: Array.from(ulMap.values()),
      };
    },
    [],
  );

  const fetchAll = useCallback(async () => {
    try {
      setError(null);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }
      const [meResp, usersResp] = await Promise.allSettled([
        axios.get(`${BASE_URl}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${BASE_URl}/api/users`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      let currentUser: BackendUser | null = null;
      let role = currentRole,
        ministry = currentMinistry;

      if (meResp.status === "fulfilled") {
        currentUser = meResp.value.data?.user || null;
        if (currentUser) {
          const ar = (currentUser as any).activeRole;
          const aro = (currentUser as any).roles?.find((r: any) => r.role === ar);
          role = ar || null;
          ministry = aro?.ministryName || null;
          setCurrentRole(role);
          setCurrentMinistry(ministry);
          setActiveUserRole(ar);
        }
      }

      let list: BackendUser[] =
        usersResp.status === "fulfilled" ? usersResp.value.data.users || [] : [];
      if (currentUser && !list.some((u) => u._id === (currentUser as any)._id)) list.push(currentUser);

      const { superAdmins, ministryAdmins, unitLeaders } = mapUsers(list, role, ministry, currentUser);
      setSuperAdmins(superAdmins);
      setMinistryAdmins(ministryAdmins);
      setUnitLeaders(unitLeaders);
    } catch (e) {
      setError("Sync failure. Refresh to retry.");
    } finally {
      setLoading(false);
    }
  }, [mapUsers, currentRole, currentMinistry]);

  const fetchCounts = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const h = { Authorization: `Bearer ${token}` };
      const [ul, wp] = await Promise.allSettled([
        axios.get(`${BASE_URl}/api/users/pending/list?type=unit-leaders`, { headers: h }),
        axios.get(`${BASE_URl}/api/workplans?status=pending`, { headers: h }),
      ]);
      if (ul.status === "fulfilled")
        setPendingUnits((ul.value.data.users || []).filter((u: any) => u.roles?.some((r: any) => r.role === "UnitLeader")).length);
      if (wp.status === "fulfilled")
        setPendingWork((wp.value.data.items || wp.value.data.plans || []).length);
    } catch { }
  }, []);

  useEffect(() => {
    fetchAll();
    fetchCounts();
  }, [fetchAll, fetchCounts]);

  const filtered = (arr: DisplayUser[]) =>
    arr.filter((u) => (u.name + u.unit).toLowerCase().includes(query.toLowerCase()));

  const SectionTitle = ({ label }: { label: string }) => (
    <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 mt-10">
      {label}
    </h2>
  );

  const UserRow = ({ user }: { user: DisplayUser }) => (
    <button
      onClick={() => navigate(`/sa/profile-detail/${user.id}`)}
      className="flex items-center gap-4 w-full p-4 rounded-2xl bg-white dark:bg-[#1a1c1e] border border-gray-100 dark:border-white/5 shadow-sm hover:border-[#349DC5] transition-all text-left group"
    >
      <div className="relative">
        {user.avatarUri ? (
          <img
            src={user.avatarUri}
            alt={user.name}
            className="w-12 h-12 rounded-full border-2 object-cover"
            style={{ borderColor: PRIMARY }}
          />
        ) : (
          <div className="w-12 h-12 rounded-full border-2 border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 flex items-center justify-center shrink-0">
            <User size={24} className="text-gray-300" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[#00204a] dark:text-white truncate group-hover:text-[#349DC5] transition-colors">{user.name}</p>
        <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">
          {user.role} {user.unit ? `· ${user.unit}` : ""}
        </p>
      </div>
      <ChevronLeft size={18} className="text-gray-300 rotate-180 group-hover:text-[#349DC5] transition-colors" />
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f1218] flex flex-col">
      <div className="bg-[#00204a] p-10 pb-16">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate(-1)}
              className="p-3 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-all active:scale-95"
            >
              <ChevronLeft size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white uppercase leading-none mb-2">
                Manage Registry
              </h1>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#349DC5] animate-pulse" />
                <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                  Global Administrative Control
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full px-6 -mt-8 flex-1 pb-32">
        <div className="relative group mb-8">
          <Search size={22} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#349DC5] transition-colors" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search administrator identity..."
            className="w-full h-16 pl-16 pr-8 bg-white dark:bg-[#1a1c1e] border border-gray-100 dark:border-white/5 rounded-2xl shadow-sm text-sm font-bold text-[#00204a] dark:text-white placeholder:text-gray-300 outline-none focus:ring-4 ring-[#349DC5]/5"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="relative">
            <button
              onClick={() => navigate("/sa/approve-unit-leaders")}
              className="w-full h-16 flex items-center justify-center gap-3 bg-white dark:bg-[#1a1c1e] text-[#349DC5] border border-gray-100 dark:border-white/5 rounded-2xl font-black text-[10px] uppercase shadow-sm hover:bg-[#349DC5] hover:text-white transition-all active:scale-95 group"
            >
              <CheckSquare size={20} className="group-hover:scale-110 transition-transform" /> Approve Unit Leaders
            </button>
            {pendingUnits > 0 && (
              <span className="absolute -top-3 -right-3 w-7 h-7 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg border-4 border-gray-50 dark:border-[#0f1218]">
                {pendingUnits}
              </span>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => navigate("/sa/work-plans")}
              className="w-full h-16 flex items-center justify-center gap-3 bg-white dark:bg-[#1a1c1e] text-[#349DC5] border border-gray-100 dark:border-white/5 rounded-2xl font-black text-[10px] uppercase shadow-sm hover:bg-[#349DC5] hover:text-white transition-all active:scale-95 group"
            >
              <Briefcase size={20} className="group-hover:scale-110 transition-transform" /> Work Plans
            </button>
            {pendingWork > 0 && (
              <span className="absolute -top-3 -right-3 w-7 h-7 bg-amber-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg border-4 border-gray-50 dark:border-[#0f1218]">
                {pendingWork}
              </span>
            )}
          </div>
        </div>

        {error && <p className="text-[10px] font-black text-rose-500 text-center py-6 uppercase tracking-widest">{error}</p>}

        {loading ? (
          <Shimmer />
        ) : (
          <div className="space-y-4">
            <SectionTitle label={activeUserRole === "MinistryAdmin" ? "Ministry High Command" : "Global Super Admins"} />
            <div className="grid gap-3">
              {filtered(superAdmins).length === 0 ? (
                <p className="text-[10px] font-bold text-gray-300 text-center py-8 uppercase tracking-widest">Silent Registry</p>
              ) : (
                filtered(superAdmins).map((u) => <UserRow key={u.id} user={u} />)
              )}
            </div>

            {filtered(ministryAdmins).length > 0 && (
              <>
                <SectionTitle label="Ministry Oversight" />
                <div className="grid gap-3">
                  {filtered(ministryAdmins).map((u) => <UserRow key={u.id} user={u} />)}
                </div>
              </>
            )}

            <SectionTitle label="Unit Operational Leads" />
            <div className="grid gap-3">
              {filtered(unitLeaders).length === 0 ? (
                <p className="text-[10px] font-bold text-gray-300 text-center py-8 uppercase tracking-widest">No active deployments</p>
              ) : (
                filtered(unitLeaders).map((u) => <UserRow key={u.id} user={u} />)
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
