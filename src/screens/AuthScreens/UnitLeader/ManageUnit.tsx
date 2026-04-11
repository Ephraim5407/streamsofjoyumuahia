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
import { getUnitContext } from "../../../utils/context";
import { listUnitMembers } from "../../../api/unitMembers";
import { listUnitLeaders } from "../../../api/unitLeaders";
import AsyncStorage from "../../../utils/AsyncStorage";
import apiClient from "../../../api/client";

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
      <div className="w-12 h-12 rounded-full border-2 border-primary p-0.5 overflow-hidden shrink-0 transition-transform group-hover:scale-105 bg-background">
        <img src={avatar} alt="avatar" className="w-full h-full object-cover rounded-full" />
      </div>
      <div className="flex-1">
        <h4 className="text-sm font-bold text-text-primary dark:text-dark-text-primary leading-tight">
          {fullName}
        </h4>
        <div className="flex items-center gap-1.5 mt-1">
          {role === "Leader" ? (
            <ShieldCheck size={12} className="text-primary" />
          ) : (
            <Users size={12} className="text-success" />
          )}
          <span
            className={cn(
              "text-[10px] font-bold uppercase",
              role === "Leader" ? "text-primary" : "text-success",
            )}
          >
            {role}
          </span>
        </div>
      </div>
      <div className="w-8 h-8 rounded-full bg-background dark:bg-dark-background flex items-center justify-center text-text-muted group-hover:text-primary transition-colors border border-border dark:border-dark-border">
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

      const activeUnitId = await getUnitContext();
      if (!activeUnitId) {
        throw new Error("No active unit context found for this leadership account. Please contact your administrator.");
      }

      // Load unit details if we only have the ID
      const unitRes = await apiClient.get(`/api/units/${activeUnitId}`);
      if (!unitRes.data?.ok) throw new Error("Unit data not found");
      const unit = unitRes.data.unit || unitRes.data.item;

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
    <div className="min-h-screen bg-background dark:bg-dark-background flex flex-col transition-colors">
      <div className="bg-surface dark:bg-dark-surface px-6 pt-10 pb-16 border-b border-border dark:border-dark-border">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate(-1)}
              className="p-3 bg-background dark:bg-dark-background rounded-xl text-text-primary dark:text-dark-text-primary hover:bg-border dark:hover:bg-dark-border transition-all active:scale-95 border border-border dark:border-dark-border"
            >
              <ChevronLeft size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary uppercase leading-none mb-2 tracking-tight">
                Manage Unit
              </h1>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                  {unitContext?.name || "Unit Operational Lead"}
                </span>
              </div>
            </div>
          </div>
          <Activity size={24} className="text-primary opacity-30" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full px-6 -mt-8 flex-1 pb-32">
        <section className="space-y-6">
          <div className="flex items-center gap-3 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-2xl px-6 h-[48px] shadow-sm focus-within:ring-4 ring-primary/5 transition-all group">
            <Search size={22} className="text-text-muted group-focus-within:text-primary" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search members by identity..."
              className="flex-1 bg-transparent text-sm font-bold outline-none text-text-primary dark:text-dark-text-primary placeholder:text-text-muted"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => navigate("/ul/approve-members")}
              className="group flex flex-col items-center justify-center gap-2 p-6 rounded-3xl bg-surface dark:bg-dark-surface border border-border dark:border-dark-border shadow-sm text-primary hover:bg-primary hover:text-white transition-all active:scale-95"
            >
              <CheckSquare size={32} className="group-hover:rotate-6 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                Approvals
              </span>
            </button>
            <button
              onClick={() => navigate("/ul/work-plans")}
              className="group flex flex-col items-center justify-center gap-2 p-6 rounded-3xl bg-surface dark:bg-dark-surface border border-border dark:border-dark-border shadow-sm text-primary hover:bg-primary hover:text-white transition-all active:scale-95"
            >
              <Briefcase size={32} className="group-hover:-rotate-6 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                Work Plans
              </span>
            </button>
          </div>

          {error && (
            <div className="p-5 bg-error/5 border border-error/20 text-error rounded-2xl text-[10px] font-black uppercase tracking-widest text-center">
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
