import { useCallback, useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Search,
  CheckSquare,
  Briefcase,
  Users,
  Activity,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { getUnitLeaderSummary } from "../../../api/unitLeader";
import { listUnitMembers } from "../../../api/unitMembers";
import { listUnitLeaders } from "../../../api/unitLeaders";
import AsyncStorage from "../../../utils/AsyncStorage";
import axios from "axios";
import { BASE_URl } from "../../../api/users";

const AVATAR_PLACEHOLDER = "https://www.w3schools.com/w3images/avatar2.png";

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

function UserCard({ user, role }: { user: any; role: string }) {
  const avatar = user.profile?.avatar || AVATAR_PLACEHOLDER;
  const fullName = `${user.title ? user.title + " " : ""}${user.firstName} ${user.surname}`;
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 p-4 bg-white dark:bg-[#1a1c1e] border border-[#EEF2F5] dark:border-white/5 rounded-2xl shadow-sm hover:border-[#349DC5] transition-all cursor-pointer group"
    >
      <div className="w-12 h-12 rounded-full border-2 border-[#349DC5] p-0.5 overflow-hidden shrink-0 transition-transform group-hover:scale-105">
        <img src={avatar} alt="avatar" className="w-full h-full object-cover rounded-full" />
      </div>
      <div className="flex-1">
        <h4 className="text-sm font-bold text-[#00204a] dark:text-white leading-tight">
          {fullName}
        </h4>
        <div className="flex items-center gap-1.5 mt-1">
          {role === "Leader" ? (
            <ShieldCheck size={12} className="text-[#349DC5]" />
          ) : (
            <Users size={12} className="text-emerald-500" />
          )}
          <span
            className={cn(
              "text-[10px] font-bold uppercase",
              role === "Leader" ? "text-[#349DC5]" : "text-emerald-500",
            )}
          >
            {role}
          </span>
        </div>
      </div>
      <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-[#349DC5] transition-colors">
        <ChevronRight size={16} />
      </div>
    </motion.div>
  );
}

function ListShimmer() {
  return (
    <div className="space-y-10 animate-pulse">
      {[1, 2].map((s) => (
        <div key={s} className="space-y-4">
          <div className="h-3 w-32 bg-gray-100 dark:bg-white/5 rounded-full" />
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-4 border border-gray-100 dark:border-white/5 rounded-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/2 bg-gray-100 dark:bg-white/5 rounded-full" />
                <div className="h-2 w-1/4 bg-gray-50 dark:bg-white/5 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function UnitLeaderManageUnit() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [leaders, setLeaders] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [unitContext, setUnitContext] = useState<any>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("Auth token missing");

      let activeUnitId = await AsyncStorage.getItem("activeUnitId");
      if (activeUnitId === "global" || activeUnitId === "undefined" || activeUnitId === "null") activeUnitId = null;

      let unit: any = null;

      if (!activeUnitId) {
        try {
          const summary = await getUnitLeaderSummary(token);
          activeUnitId = summary?.unit?._id || null;
          if (summary?.unit) unit = summary.unit;
        } catch (e: any) {
          setError(e.message || "Failed to load unit summary");
          setLoading(false);
          return;
        }
      }

      if (!activeUnitId) {
        // Fallback checks just in case via users/me
        try {
          const meRes = await axios.get(`${BASE_URl}/api/users/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const u = meRes.data?.user;
          if (u) {
            let rawUnit =
              u?.activeUnitId ||
              u?.activeUnit ||
              (u?.roles || []).find((r: any) => r.role === "UnitLeader" && r.unit)?.unit;
            activeUnitId = typeof rawUnit === "object" && rawUnit !== null ? rawUnit._id : rawUnit;
            if (activeUnitId) unit = { _id: activeUnitId };
          }
        } catch (e) {}
      }

      if (!activeUnitId) {
        setError("No active unit context");
        setLoading(false);
        return;
      }

      // Fetch list data
      const [lRes, mRes] = await Promise.all([
        listUnitLeaders(activeUnitId, token),
        listUnitMembers(activeUnitId, token),
      ]);
      setLeaders(lRes?.leaders || []);
      setMembers(mRes?.members || []);
      if (unit) setUnitContext(unit);
    } catch (e: any) {
      setError(e.message || "Failed to load unit data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredLeaders = useMemo(
    () =>
      leaders.filter((u) =>
        `${u.firstName} ${u.surname}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [leaders, query],
  );

  const filteredMembers = useMemo(
    () =>
      members.filter((u) =>
        `${u.firstName} ${u.surname}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [members, query],
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
                Manage Unit
              </h1>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#349DC5] animate-pulse" />
                <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                  {unitContext?.name || "Unit Dashboard"}
                </span>
              </div>
            </div>
          </div>
          <Activity size={24} className="text-[#349DC5] opacity-30" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full px-6 -mt-8 flex-1 pb-32">
        <section className="space-y-6">
          <div className="flex items-center gap-3 bg-white dark:bg-[#1a1c1e] border border-gray-100 dark:border-white/5 rounded-2xl px-6 h-16 shadow-sm focus-within:border-[#349DC5] transition-all group">
            <Search size={22} className="text-gray-300 group-focus-within:text-[#349DC5]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search members..."
              className="flex-1 bg-transparent text-sm font-bold outline-none text-[#00204a] dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => navigate("/ul/approve-members")}
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-3xl bg-white dark:bg-[#1a1c1e] border border-gray-100 dark:border-white/5 shadow-sm text-[#349DC5] hover:bg-[#349DC5] hover:text-white transition-all active:scale-95 group"
            >
              <CheckSquare size={28} className="group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                Approve Requests
              </span>
            </button>
            <button
              onClick={() => navigate("/ul/work-plans")}
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-3xl bg-white dark:bg-[#1a1c1e] border border-gray-100 dark:border-white/5 shadow-sm text-[#349DC5] hover:bg-[#349DC5] hover:text-white transition-all active:scale-95 group"
            >
              <Briefcase size={28} className="group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                Plans
              </span>
            </button>
          </div>

          {error && (
            <div className="p-5 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center border border-rose-100 dark:border-rose-900/10">
              {error}
            </div>
          )}

          {loading ? (
            <ListShimmer />
          ) : (
            <div className="space-y-12 pt-4">
              <section className="space-y-6">
                <div className="flex items-center gap-4">
                  <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest shrink-0">
                    Unit Leaders ({filteredLeaders.length})
                  </h3>
                  <div className="h-px bg-gray-100 dark:bg-white/5 flex-1" />
                </div>
                <div className="grid gap-4">
                  {filteredLeaders.length === 0 ? (
                    <p className="text-center text-[10px] font-bold text-gray-300 uppercase py-10">
                      No matching leaders
                    </p>
                  ) : (
                    filteredLeaders.map((u) => (
                      <UserCard key={u._id} user={u} role="Leader" />
                    ))
                  )}
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-4">
                  <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest shrink-0">
                    Members ({filteredMembers.length})
                  </h3>
                  <div className="h-px bg-gray-100 dark:bg-white/5 flex-1" />
                </div>
                <div className="grid gap-4">
                  {filteredMembers.length === 0 ? (
                    <p className="text-center text-[10px] font-bold text-gray-300 uppercase py-10">
                      No Members Found
                    </p>
                  ) : (
                    filteredMembers.map((u) => (
                      <UserCard key={u._id} user={u} role="Member" />
                    ))
                  )}
                </div>
              </section>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
