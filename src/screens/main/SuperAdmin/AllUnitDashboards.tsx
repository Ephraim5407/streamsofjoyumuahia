import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  Users,
  RefreshCw,
  X,
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { BASE_URl } from "../../../api/users";
import AsyncStorage from "../../../utils/AsyncStorage";

interface UnitDashboardItem {
  _id: string;
  name: string;
  leaderId?: string | null;
  leaderName: string;
  membersCount: number;
  activeCount: number;
  lastReportAt: string | null;
  ministryName?: string | null;
}

export default function AllUnitDashboards() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const restrictToMinistry = queryParams.get("restrictToMinistry") === "true";
  const presetMinistry = queryParams.get("ministry") || "";

  const [search, setSearch] = useState("");
  const [data, setData] = useState<UnitDashboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ministry, setMinistry] = useState(presetMinistry);
  const [ministryList, setMinistryList] = useState<string[]>([]);
  const [showFilter, setShowFilter] = useState(false);

  const fetchUnits = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          navigate("/login");
          return;
        }
        const params = new URLSearchParams();
        params.append("days", "14");
        if (ministry) params.append("ministry", ministry);
        const res = await axios.get(`${BASE_URl}/api/units/dashboard?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data?.ok) {
          const list = (res.data.units || []).map((u: any) => ({
            _id: String(u._id),
            name: u.name,
            leaderName: u.leaderName || "Unassigned",
            leaderId: u.leaderId || null,
            membersCount: u.membersCount || 0,
            activeCount: u.activeCount || 0,
            lastReportAt: u.lastReportAt || null,
            ministryName: u.ministry?.name || u.ministryName || null,
          }));
          setData(list);
          if (!restrictToMinistry) {
            const mins = Array.from(
              new Set(list.map((u: any) => u.ministryName).filter(Boolean)),
            ) as string[];
            setMinistryList(mins.sort());
          }
        }
      } catch (e) {
        toast.error("Failed to load unit dashboards");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [navigate, ministry, restrictToMinistry],
  );

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const filteredData = useMemo(() => {
    if (!search.trim()) return data;
    const lower = search.toLowerCase();
    return data.filter(
      (u) =>
        (u.name || "").toLowerCase().includes(lower) || (u.leaderName || "").toLowerCase().includes(lower),
    );
  }, [search, data]);

  const formatDate = (dt: string | null) => {
    if (!dt) return "Never";
    return new Date(dt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading && data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <div className="w-10 h-10 border-4 border-[#349DC5] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-[#349DC5] text-sm">Loading dashboards…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white dark:bg-[#0f1218] min-h-screen">
      {/* Header */}
      <div className="pt-[5vh] px-4 pb-2 bg-white dark:bg-[#0f1218] z-10">
        <div className="flex items-center mb-2">
          <button
            onClick={() => navigate(-1)}
            className="p-0.5 mr-2 text-[#222]"
          >
            <ArrowLeft size={22} />
          </button>
          <h1 className="flex-1 text-center font-semibold text-[17px] text-[#212121] dark:text-white mr-7">
            All Unit Dashboards
          </h1>
        </div>

        {/* Search */}
        <div className="flex items-center bg-white dark:bg-[#1a1c1e] border border-[#d4e4ef] rounded-lg px-2.5 h-11 mt-2.5 mb-1.5">
          <Search size={20} className="text-[#888] mr-1.5 shrink-0" />
          <input
            type="text"
            placeholder="Search for a Unit"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-[15px] text-[#181818] dark:text-white bg-transparent outline-none placeholder:text-[#a5a5a5]"
          />
          {search && (
            <button onClick={() => setSearch("")} className="p-1 text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Ministry filter */}
        {!restrictToMinistry && (
          <div className="flex items-center gap-2 pb-2">
            <button
              onClick={() => setShowFilter(!showFilter)}
              className="px-3 py-2 border border-[#d4e4ef] rounded-lg bg-white dark:bg-[#1a1c1e] text-[#14234b] dark:text-white font-bold text-sm"
            >
              {ministry ? `Service: ${ministry}` : 'Filter Service'}
            </button>
            {ministry && (
              <button
                onClick={() => { setMinistry(""); setShowFilter(false); }}
                className="px-3 py-2 rounded-lg bg-[#eef2f7] text-[#14234b] font-bold text-sm"
              >
                Clear
              </button>
            )}
            <button
              onClick={() => fetchUnits(true)}
              className="ml-auto p-2 text-gray-400 hover:text-[#349DC5] transition-colors"
            >
              <RefreshCw size={18} className={refreshing ? "animate-spin text-[#349DC5]" : ""} />
            </button>
          </div>
        )}

        {/* Ministry picker dropdown */}
        {showFilter && !restrictToMinistry && (
          <div className="border border-[#e2e8f0] rounded-lg bg-white dark:bg-[#1a1c1e] mb-2">
            {ministryList.length > 0 ? ministryList.map(m => (
              <button
                key={m}
                onClick={() => { setMinistry(m); setShowFilter(false); }}
                className="w-full text-left px-3 py-3 text-sm text-[#14234b] dark:text-white border-b border-[#eaeaea] last:border-0 hover:bg-gray-50 dark:hover:bg-white/5"
              >
                {m}
              </button>
            )) : (
              <div className="px-3 py-3 text-sm text-[#8a8a8a]">No ministries found</div>
            )}
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-[120px] pt-2">
        {filteredData.length === 0 ? (
          <div className="flex items-center justify-center mt-8">
            <p className="text-[#888] text-sm">No unit found.</p>
          </div>
        ) : (
          filteredData.map((unit) => {
            const disabled = !unit.leaderId;
            return (
              <div
                key={unit._id}
                onClick={() => {
                  if (!disabled) navigate(`/sa/profile?userId=${unit.leaderId}&unitId=${unit._id}`);
                }}
                className={`bg-white dark:bg-[#1a1c1e] rounded-xl py-4 px-4 mb-5 shadow-sm border border-[#349DC5] ${
                  disabled ? "opacity-60 border-[#dbeef6] bg-[#f7fbfd]" : "cursor-pointer active:opacity-80"
                }`}
              >
                <p className="font-bold text-[16px] text-[#14234b] dark:text-white mb-0.5">{unit.name}</p>
                <p className="text-[14px] text-[#333] dark:text-gray-300 leading-[22px]">
                  Unit Leader:{" "}
                  <span
                    className="text-[#349DC5] font-bold underline cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (unit.leaderId) navigate(`/sa/profile?userId=${unit.leaderId}&unitId=${unit._id}`);
                    }}
                  >
                    {unit.leaderName}
                  </span>
                </p>
                <p className="text-[14px] text-[#333] dark:text-gray-300 leading-[22px]">
                  Total Members:{" "}
                  <span
                    className="text-[#349DC5] font-bold underline cursor-pointer"
                    onClick={async (e) => {
                      e.stopPropagation();
                      await AsyncStorage.setItem("activeUnitId", unit._id);
                      navigate(`/member-list?unitId=${unit._id}`);
                    }}
                  >
                    {unit.membersCount}
                  </span>
                </p>
                <p className="text-[14px] text-[#333] dark:text-gray-300 leading-[22px]">
                  Active Members:{" "}
                  <span className="text-[#1dcc79] font-bold">{unit.activeCount}</span>
                </p>
                <p className="text-[14px] text-[#333] dark:text-gray-300 leading-[22px]">
                  Last Report Submitted:{" "}
                  <span className="text-[#349DC5] font-semibold underline">
                    {formatDate(unit.lastReportAt) || "—"}
                  </span>
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
