import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Search, Plus, ChevronDown, X,
  Users, User, CheckCircle, Check, Shield, Settings,
  Loader2
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { BASE_URl } from "../../api/users";

const token = () => localStorage.getItem("token");

interface Unit {
  _id: string;
  name: string;
  ministryName?: string;
  attendanceTaking?: boolean;
  musicUnit?: boolean;
}

interface Member {
  _id: string;
  firstName?: string;
  surname?: string;
  title?: string;
  email?: string;
  phone?: string;
  profile?: { avatar?: string };
  roles?: { unit?: string; duties?: string[] }[];
}

const getMemberName = (m: Member) =>
  [m.title, m.firstName, m.surname].filter(Boolean).join(" ").trim() || "Unnamed Member";

const ASSIGNABLE_CARDS = [
  { key: "songs", label: "Songs Released" },
  { key: "recovery", label: "Recovered Addicts" },
  { key: "emporium", label: "Emporium Sales" },
  { key: "firstTimers", label: "First Timers" },
  { key: "assigned", label: "First Timers assigned by you" },
  { key: "marriedMembers", label: "Members That Got Married" },
];

export default function AssignUnitControl() {
  const navigate = useNavigate();
  const [role, setRole] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ministries, setMinistries] = useState<string[]>([]);
  const [selectedMinistry, setSelectedMinistry] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  // toggles
  const [attendanceTaking, setAttendanceTaking] = useState(false);
  const [musicUnit, setMusicUnit] = useState(false);
  const [makeFinSec, setMakeFinSec] = useState(false);
  const [dutyApproveMembers, setDutyApproveMembers] = useState(false);
  const [dutyCreateWorkPlan, setDutyCreateWorkPlan] = useState(false);
  // cards
  const [selectedCardKeys, setSelectedCardKeys] = useState<string[]>([]);
  const [selectedUnitsForCards, setSelectedUnitsForCards] = useState<string[]>([]);
  // modals
  const [showMinistryPicker, setShowMinistryPicker] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  // current assignments
  const finSecAssignee = useMemo(() => {
    if (!selectedUnit) return null;
    return members.find(m => (m.roles || []).some(r => String(r.unit || "") === String(selectedUnit) && (r.duties || []).includes("FinancialSecretary"))) || null;
  }, [members, selectedUnit]);
  const approveAssignee = useMemo(() => {
    if (!selectedUnit) return null;
    return members.find(m => (m.roles || []).some(r => String(r.unit || "") === String(selectedUnit) && (r.duties || []).includes("ApproveMembers"))) || null;
  }, [members, selectedUnit]);
  const workPlanAssignee = useMemo(() => {
    if (!selectedUnit) return null;
    return members.find(m => (m.roles || []).some(r => String(r.unit || "") === String(selectedUnit) && (r.duties || []).includes("CreateWorkPlan"))) || null;
  }, [members, selectedUnit]);

  useEffect(() => {
    (async () => {
      try {
        const userRes = await axios.get(`${BASE_URl}/api/users/me`, { headers: { Authorization: `Bearer ${token()}` } });
        if (!userRes.data?.ok) return;
        const u = userRes.data.user;
        setRole(u.activeRole); setProfile(u);
        // Load church/ministries
        if (u.church) {
          try {
            const cRes = await axios.get(`${BASE_URl}/api/churches/${u.church}`, { headers: { Authorization: `Bearer ${token()}` } });
            if (cRes.data?.ok && cRes.data.church?.ministries) {
              const mins = cRes.data.church.ministries.map((m: any) => m.name).filter(Boolean);
              setMinistries(mins);
              if (u.activeRole === "MinistryAdmin") {
                const mr = (u.roles || []).find((r: any) => r.role === "MinistryAdmin");
                setSelectedMinistry(mr?.ministryName || mins[0] || null);
              } else { setSelectedMinistry(mins[0] || null); }
            }
          } catch {}
        }
        // Load units
        const qs = u.church ? `?churchId=${encodeURIComponent(u.church)}` : "";
        const uRes = await axios.get(`${BASE_URl}/api/units${qs}`, { headers: { Authorization: `Bearer ${token()}` } });
        if (uRes.data?.ok) setUnits(uRes.data.units || []);
        // If UnitLeader, auto-select unit
        if (u.activeRole === "UnitLeader") {
          const ulRole = (u.roles || []).find((r: any) => r.role === "UnitLeader" && r.unit);
          if (ulRole?.unit) {
            const uid = String(ulRole.unit);
            setSelectedUnit(uid);
            const mRes = await axios.get(`${BASE_URl}/api/units/${uid}/members/list`, { headers: { Authorization: `Bearer ${token()}` } });
            if (mRes.data?.ok) setMembers(mRes.data.members || []);
          }
        }
      } finally { setLoading(false); }
    })();
  }, []);

  // Refetch units when ministry changes
  useEffect(() => {
    if (!profile || !(role === "SuperAdmin" || role === "MinistryAdmin")) return;
    (async () => {
      try {
        const qs: string[] = [];
        if (profile.church) qs.push(`churchId=${encodeURIComponent(profile.church)}`);
        if (selectedMinistry) qs.push(`ministry=${encodeURIComponent(selectedMinistry)}`);
        const uRes = await axios.get(`${BASE_URl}/api/units?${qs.join("&")}`, { headers: { Authorization: `Bearer ${token()}` } });
        if (uRes.data?.ok) { setUnits(uRes.data.units || []); setSelectedUnit(null); }
      } catch {}
    })();
  }, [selectedMinistry, role, profile]);

  // Sync unit toggles and load members
  useEffect(() => {
    if (!selectedUnit) return;
    const u = units.find(x => String(x._id) === String(selectedUnit));
    if (u) { setAttendanceTaking(!!u.attendanceTaking); setMusicUnit(!!u.musicUnit); }
    (async () => {
      try {
        const mRes = await axios.get(`${BASE_URl}/api/units/${selectedUnit}/members/list`, { headers: { Authorization: `Bearer ${token()}` } });
        if (mRes.data?.ok) setMembers(mRes.data.members || []);
      } catch {}
    })();
  }, [selectedUnit, units]);

  // Preload duties for selected member
  useEffect(() => {
    if (!selectedUnit || !selectedMember) return;
    (async () => {
      try {
        const res = await axios.get(`${BASE_URl}/api/users/${selectedMember}`, { headers: { Authorization: `Bearer ${token()}` } });
        if (res.data?.ok && res.data.user) {
          const roleForUnit = (res.data.user.roles || []).find((r: any) => String(r.unit?._id || r.unit || "") === String(selectedUnit));
          const duties: string[] = Array.isArray(roleForUnit?.duties) ? roleForUnit.duties : [];
          setDutyApproveMembers(duties.includes("ApproveMembers"));
          setDutyCreateWorkPlan(duties.includes("CreateWorkPlan"));
        }
      } catch {}
    })();
  }, [selectedUnit, selectedMember]);

  const filteredUnits = useMemo(() => {
    if (!(role === "SuperAdmin" || role === "MinistryAdmin") || !selectedMinistry) return units;
    return units.filter(u => (u.ministryName || "") === selectedMinistry);
  }, [units, selectedMinistry, role]);

  const handleSave = async () => {
    if (!selectedUnit) { toast.error("Please select a unit"); return; }
    if (role === "UnitLeader" && !selectedMember) { toast.error("Please select a member"); return; }
    setSaving(true);
    try {
      const tasks: Promise<any>[] = [];
      if (role === "UnitLeader") {
        tasks.push(axios.post(`${BASE_URl}/api/units/${selectedUnit}/assign-duty`,
          { userId: selectedMember, approveMembers: !!dutyApproveMembers, createWorkPlan: !!dutyCreateWorkPlan },
          { headers: { Authorization: `Bearer ${token()}` } }
        ));
        if (makeFinSec) tasks.push(axios.post(`${BASE_URl}/api/units/${selectedUnit}/assign-finsec`, { userId: selectedMember }, { headers: { Authorization: `Bearer ${token()}` } }));
      } else {
        if (attendanceTaking) tasks.push(axios.post(`${BASE_URl}/api/units/assign-attendance`, { unitId: selectedUnit }, { headers: { Authorization: `Bearer ${token()}` } }));
        tasks.push(axios.post(`${BASE_URl}/api/units/${selectedUnit}/assign-music`, { enabled: musicUnit }, { headers: { Authorization: `Bearer ${token()}` } }));
      }
      await Promise.all(tasks);
      toast.success("Changes saved successfully");
    } catch (e: any) { toast.error(e.response?.data?.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  const handleSaveCards = async () => {
    if (selectedCardKeys.length === 0) { toast.error("Please select at least one card"); return; }
    setSaving(true);
    try {
      const body: any = { cardKeys: selectedCardKeys };
      if (selectedUnitsForCards.length) body.unitIds = selectedUnitsForCards;
      if (profile?.church) body.churchId = profile.church;
      if (selectedMinistry) body.ministry = selectedMinistry;
      await axios.post(`${BASE_URl}/api/units/assign-cards`, body, { headers: { Authorization: `Bearer ${token()}` } });
      toast.success("Cards assigned successfully");
    } catch (e: any) { toast.error(e.response?.data?.message || "Failed"); }
    finally { setSaving(false); }
  };

  const canMutate = role === "SuperAdmin" || role === "MinistryAdmin" || role === "UnitLeader";

  const ToggleRow = ({ label, value, onChange }: { label: string; value: boolean; onChange: () => void }) => (
    <button onClick={onChange} className="w-full flex items-center justify-between py-3.5 border-b border-gray-50 dark:border-white/5">
      <span className="text-sm font-bold text-[#00204a] dark:text-white">{label}</span>
      <div className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${value ? "bg-[#349DC5]" : "bg-gray-200 dark:bg-white/10"}`}>
        <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${value ? "translate-x-5" : "translate-x-0"}`} />
      </div>
    </button>
  );

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-[#111] gap-4">
      <div className="w-12 h-12 rounded-full border-4 border-[#349DC5] border-t-transparent animate-spin" />
      <p className="text-sm font-bold text-[#349DC5] uppercase tracking-widest">Preparing Controls...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#111] pb-24">
      {/* Header */}
      <div className="bg-[#349DC5] px-4 pt-12 pb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-black text-white uppercase tracking-tight">Assign Unit Control</h1>
            <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Configure roles & permissions</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-6 space-y-5">
        {/* Ministry/Unit selectors for SA/MA */}
        {(role === "SuperAdmin" || role === "MinistryAdmin") && (
          <>
            <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-4 border border-gray-100 dark:border-white/5 shadow-sm">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Service Type (Ministry)</p>
              <button onClick={() => setShowMinistryPicker(true)} disabled={role !== "SuperAdmin"} className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10 disabled:opacity-60">
                <span className="text-sm font-bold text-[#00204a] dark:text-white">{selectedMinistry || "Select Ministry"}</span>
                <ChevronDown size={16} className="text-gray-400" />
              </button>
            </div>
            <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-4 border border-gray-100 dark:border-white/5 shadow-sm">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Select Unit</p>
              <button onClick={() => setShowUnitPicker(true)} className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10">
                <span className={`text-sm font-bold ${selectedUnit ? "text-[#00204a] dark:text-white" : "text-gray-300"}`}>
                  {selectedUnit ? (units.find(u => u._id === selectedUnit)?.name || "Unit Selected") : "Choose Unit"}
                </span>
                <ChevronDown size={16} className="text-gray-400" />
              </button>
            </div>
          </>
        )}

        {/* Member selector for UL */}
        {role === "UnitLeader" && (
          <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-4 border border-gray-100 dark:border-white/5 shadow-sm">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Select Member</p>
            <button onClick={() => setShowMemberPicker(true)} className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10">
              <span className={`text-sm font-bold ${selectedMember ? "text-[#00204a] dark:text-white" : "text-gray-300"}`}>
                {selectedMember ? getMemberName(members.find(m => m._id === selectedMember) || {} as Member) : "Choose Member"}
              </span>
              <ChevronDown size={16} className="text-gray-400" />
            </button>
          </div>
        )}

        {/* Admin toggles */}
        {(role === "SuperAdmin" || role === "MinistryAdmin") && selectedUnit && (
          <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-4 border border-gray-100 dark:border-white/5 shadow-sm">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Unit Settings</p>
            <ToggleRow label="Attendance Taking Unit" value={attendanceTaking} onChange={() => setAttendanceTaking(v => !v)} />
            <ToggleRow label="Music Unit (Songs Released)" value={musicUnit} onChange={() => setMusicUnit(v => !v)} />
          </div>
        )}

        {/* UL duties */}
        {role === "UnitLeader" && (
          <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-4 border border-gray-100 dark:border-white/5 shadow-sm">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Member Duties</p>
            <ToggleRow label="Make Financial Secretary" value={makeFinSec} onChange={() => setMakeFinSec(v => !v)} />
            <ToggleRow label="Approve Members" value={dutyApproveMembers} onChange={() => setDutyApproveMembers(v => !v)} />
            <ToggleRow label="Create Work Plan" value={dutyCreateWorkPlan} onChange={() => setDutyCreateWorkPlan(v => !v)} />
          </div>
        )}

        {/* Cards assignment (SA only) */}
        {role === "SuperAdmin" && (
          <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-4 border border-gray-100 dark:border-white/5 shadow-sm">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Assign Cards to Units</p>
            <div className="space-y-2 mb-4">
              {ASSIGNABLE_CARDS.map(card => (
                <button key={card.key} onClick={() => setSelectedCardKeys(prev => prev.includes(card.key) ? prev.filter(k => k !== card.key) : [...prev, card.key])} className="w-full flex items-center justify-between py-2.5">
                  <span className="text-sm font-bold text-[#00204a] dark:text-white">{card.label}</span>
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${selectedCardKeys.includes(card.key) ? "bg-[#349DC5] border-[#349DC5]" : "border-gray-300"}`}>
                    {selectedCardKeys.includes(card.key) && <Check size={12} className="text-white" />}
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Select Units (multi)</p>
            <div className="border border-gray-100 dark:border-white/10 rounded-xl p-2 space-y-1 max-h-48 overflow-y-auto mb-3">
              {filteredUnits.map(u => (
                <button key={u._id} onClick={() => setSelectedUnitsForCards(prev => prev.includes(u._id) ? prev.filter(x => x !== u._id) : [...prev, u._id])} className="w-full flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5">
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${selectedUnitsForCards.includes(u._id) ? "bg-[#349DC5] border-[#349DC5]" : "border-gray-300"}`}>
                    {selectedUnitsForCards.includes(u._id) && <Check size={12} className="text-white" />}
                  </div>
                  <span className="text-sm font-bold text-[#00204a] dark:text-white">{u.name}</span>
                </button>
              ))}
            </div>
            <button onClick={handleSaveCards} disabled={saving || selectedCardKeys.length === 0} className="w-full py-3 bg-[#349DC5] text-white rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-50">
              Save Cards
            </button>
          </div>
        )}

        {/* Current assignments */}
        {selectedUnit && (
          <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl overflow-hidden border border-gray-100 dark:border-white/5 shadow-sm">
            <div className="px-4 py-3 border-b border-gray-50 dark:border-white/5">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Current Assignments</p>
            </div>
            {[
              { label: "Financial Secretary", assignee: finSecAssignee },
              { label: "Approve Members", assignee: approveAssignee },
              { label: "Create Work Plan", assignee: workPlanAssignee },
            ].map(({ label, assignee }) => (
              <div key={label} className="flex items-center justify-between px-4 py-3.5 border-b border-gray-50 dark:border-white/5 last:border-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center">
                    <Shield size={14} className="text-[#349DC5]" />
                  </div>
                  <p className="text-sm font-bold text-[#00204a] dark:text-white">{label}</p>
                </div>
                {assignee ? (
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-full bg-[#349DC5] flex items-center justify-center">
                      <User size={11} className="text-white" />
                    </div>
                    <span className="text-xs font-bold text-[#349DC5]">{getMemberName(assignee)}</span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-300 font-bold italic">None</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Save button */}
        {canMutate && (
          <button
            onClick={handleSave}
            disabled={saving || !selectedUnit || (role === "UnitLeader" && !selectedMember)}
            className="w-full py-4 bg-[#349DC5] text-white rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            {saving ? "Saving..." : "Save"}
          </button>
        )}
      </div>

      {/* Pickers */}
      {[
        { open: showMinistryPicker, onClose: () => setShowMinistryPicker(false), title: "Select Ministry", items: ministries.map(m => ({ label: m, value: m })), selected: selectedMinistry, onSelect: (v: string) => setSelectedMinistry(v) },
        { open: showUnitPicker, onClose: () => setShowUnitPicker(false), title: "Select Unit", items: filteredUnits.map(u => ({ label: u.name, value: u._id })), selected: selectedUnit, onSelect: (v: string) => setSelectedUnit(v) },
      ].map((picker, i) => (
        <AnimatePresence key={i}>
          {picker.open && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={picker.onClose}>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
              <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} onClick={e => e.stopPropagation()} className="relative bg-white dark:bg-[#1e1e1e] w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[70vh] flex flex-col">
                <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-50 dark:border-white/5">
                  <p className="text-sm font-black text-[#00204a] dark:text-white uppercase tracking-widest">{picker.title}</p>
                  <button onClick={picker.onClose}><X size={18} className="text-gray-400" /></button>
                </div>
                <div className="overflow-y-auto p-3">
                  {picker.items.map(item => (
                    <button key={item.value} onClick={() => { picker.onSelect(item.value); picker.onClose(); }} className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5">
                      <span className="text-sm font-bold text-[#00204a] dark:text-white">{item.label}</span>
                      {picker.selected === item.value && <Check size={15} className="text-[#349DC5]" />}
                    </button>
                  ))}
                  {picker.items.length === 0 && <p className="text-center text-sm text-gray-300 py-6">No items available</p>}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      ))}

      {/* Member picker */}
      <AnimatePresence>
        {showMemberPicker && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowMemberPicker(false)}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} onClick={e => e.stopPropagation()} className="relative bg-white dark:bg-[#1e1e1e] w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[70vh] flex flex-col">
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-50 dark:border-white/5">
                <p className="text-sm font-black text-[#00204a] dark:text-white uppercase tracking-widest">Select Member</p>
                <button onClick={() => setShowMemberPicker(false)}><X size={18} className="text-gray-400" /></button>
              </div>
              <div className="overflow-y-auto p-3">
                {members.map(m => (
                  <button key={m._id} onClick={() => { setSelectedMember(m._id); setShowMemberPicker(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5">
                    <div className="w-8 h-8 rounded-full bg-[#349DC5]/10 flex items-center justify-center shrink-0">
                      <User size={14} className="text-[#349DC5]" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-bold text-[#00204a] dark:text-white">{getMemberName(m)}</p>
                      {m.phone && <p className="text-xs text-gray-400">{m.phone}</p>}
                    </div>
                    {selectedMember === m._id && <Check size={15} className="text-[#349DC5]" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
