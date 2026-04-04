import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Church, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import { BASE_URl } from "../../api/users";
import AsyncStorage from "../../utils/AsyncStorage";

interface ChurchData {
  _id: string;
  name: string;
  ministries: any[];
}

export default function JoinChurchScreen() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [churches, setChurches] = useState<ChurchData[]>([]);
  const [ministries, setMinistries] = useState<any[]>([]);
  const [selectedMinistryId, setSelectedMinistryId] = useState<string>("");
  const [units, setUnits] = useState<any[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");
  const [requestedRole, setRequestedRole] = useState<"Member" | "UnitLeader">("Member");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const base = BASE_URl.replace(/\/$/, "");
        let list: any[] = [];
        try {
          const res = await axios.get(`${base}/api/churches/public`, { timeout: 12000 });
          list = Array.isArray(res.data?.churches) ? res.data.churches : [];
        } catch (err: any) {
          try {
            const res = await fetch(`${base}/api/churches/public`);
            const data = await res.json();
            list = Array.isArray(data.churches) ? data.churches : [];
          } catch (e2) {
            console.warn("JoinChurch fallback fetch failed", e2);
          }
        }
        setChurches(list);
        
        const mins: any[] = [];
        for (const c of list) {
          const arr = Array.isArray(c.ministries) ? c.ministries : [];
          for (const m of arr) {
            mins.push({ id: String(m._id), name: m.name, churchId: String(c._id), churchName: c.name });
          }
        }
        setMinistries(mins);
        if (!selectedMinistryId && mins.length) {
          const firstId = String(mins[0].id);
          setSelectedMinistryId(firstId);
          fetchUnitsForMinistry(firstId, mins);
        }
      } catch (e) {
        console.warn("JoinChurch load error", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function fetchUnitsForMinistry(ministryId: string | null, localMinistries: any[] = ministries) {
    try {
      setUnits([]);
      setSelectedUnitId("");
      if (!ministryId) return;
      setUnitsLoading(true);
      const ministry = localMinistries.find((m) => String(m.id) === String(ministryId));
      if (!ministry) return;
      const token = await AsyncStorage.getItem("token");
      const base = BASE_URl.replace(/\/$/, "");
      const params = new URLSearchParams();
      params.append("churchId", ministry.churchId);
      params.append("ministry", ministry.name);
      const headers: any = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await axios.get(`${base}/api/units?${params.toString()}`, { headers, timeout: 10000 }).catch(() => null);
      const list = res && res.data && Array.isArray(res.data.units) ? res.data.units : [];
      setUnits(list);
      if (list.length) setSelectedUnitId(String(list[0]._id));
    } catch (e) {
      console.warn("Failed to load units for ministry", e);
    } finally {
      setUnitsLoading(false);
    }
  }

  const handleMinistryChange = (id: string) => {
    setSelectedMinistryId(id);
    fetchUnitsForMinistry(id);
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        toast.error("Login required");
        return;
      }
      const ministry = ministries.find((m) => String(m.id) === String(selectedMinistryId));
      if (!ministry) {
        toast.error("Select ministry");
        return;
      }
      const payload: any = { targetChurch: ministry.churchId, targetMinistry: ministry.id, requestedRole };
      if (requestedRole === "Member") {
        if (!selectedUnitId) {
          toast.error("Please select a unit within the ministry to join");
          return;
        }
        payload.targetUnit = selectedUnitId;
      } else {
        if (selectedUnitId) payload.targetUnit = selectedUnitId;
      }
      // Note: Assuming createJoinRequest exists in WebPWA/api, using raw axios here
      const base = BASE_URl.replace(/\/$/, "");
      await axios.post(`${base}/api/join-requests`, payload, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Your request was sent to approver(s)");
      navigate("/home");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Unable to send request");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white dark:bg-[#1a1c1e]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#349DC5]"></div>
      </div>
    );
  }

  const selectedMinistryName = ministries.find((m) => String(m.id) === String(selectedMinistryId))?.name || "Ministry";

  return (
    <div className="pb-32 max-w-lg mx-auto px-4 sm:px-6 pt-10">
      <header className="flex items-center gap-4 mb-10">
        <button
          onClick={() => navigate(-1)}
          className="p-3.5 rounded-2xl bg-white dark:bg-[#1a1c1e] shadow-sm border border-gray-100 dark:border-white/5 text-gray-400 hover:text-[#349DC5] transition-all active:scale-95"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[#00204a] dark:text-white leading-none">
            Join {selectedMinistryName}
          </h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase mt-2 tracking-widest">
            Submit Affiliation Request
          </p>
        </div>
      </header>

      <div className="bg-white dark:bg-[#1a1c1e] shadow-sm rounded-3xl p-6 md:p-8 border border-gray-100 dark:border-white/5 space-y-8">
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <ShieldCheck size={16} /> Engagement Role
          </label>
          <div className="relative">
            <select
              value={requestedRole}
              onChange={(e) => setRequestedRole(e.target.value as any)}
              className="w-full h-14 px-4 bg-gray-50 dark:bg-white/5 border border-transparent focus:border-[#349DC5]/30 rounded-xl outline-none font-medium text-[#00204a] dark:text-white appearance-none transition-all"
            >
              <option value="Member">General Member</option>
              <option value="UnitLeader">Unit Leader</option>
            </select>
          </div>
        </div>

        <div>
           <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Church size={16} /> Selected Ministry
          </label>
          <div className="relative">
            <select
              value={selectedMinistryId}
              onChange={(e) => handleMinistryChange(e.target.value)}
              className="w-full h-14 px-4 bg-gray-50 dark:bg-white/5 border border-transparent focus:border-[#349DC5]/30 rounded-xl outline-none font-medium text-[#00204a] dark:text-white appearance-none transition-all"
            >
              {ministries.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.churchName} - {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedMinistryId && (
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">
              Operational Unit
            </label>
            <div className="relative">
              {unitsLoading ? (
                <div className="h-14 flex items-center px-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                  <span className="text-sm font-medium text-gray-400">Loading units...</span>
                </div>
              ) : (
                <select
                  value={selectedUnitId}
                  onChange={(e) => setSelectedUnitId(e.target.value)}
                  className="w-full h-14 px-4 bg-gray-50 dark:bg-white/5 border border-transparent focus:border-[#349DC5]/30 rounded-xl outline-none font-medium text-[#00204a] dark:text-white appearance-none transition-all"
                >
                  <option value="" disabled>Select a unit</option>
                  {units.length > 0 ? (
                    units.map((u) => (
                      <option key={String(u._id)} value={String(u._id)}>
                        {u.name}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>No units available</option>
                  )}
                </select>
              )}
            </div>
            {requestedRole === "Member" && (
               <p className="text-[10px] text-gray-400 mt-2">Unit selection is required for member applications.</p>
            )}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full h-14 bg-[#349DC5] text-white font-bold rounded-xl shadow-xl shadow-[#349DC5]/20 flex items-center justify-center gap-2 active:scale-95 transition-all text-sm uppercase tracking-wider disabled:opacity-70 disabled:cursor-not-allowed mt-4"
        >
          {submitting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            "Submit Application"
          )}
        </button>
      </div>
    </div>
  );
}
