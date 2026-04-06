import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Search,
  RefreshCw,
  Plus,
  TrendingUp,
  TrendingDown,
  Wallet,
  ChevronRight,
  Calendar,
  History,
  PieChart as PieIcon,
  BarChart3,
  ShieldCheck,
  X,
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { BASE_URl } from "../../api/users";
import { getFinanceSummary, type FinanceSummary } from "../../api/finance";
import AsyncStorage from "../../utils/AsyncStorage";

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

const COLORS = ["#349DC5", "#8B5CF6", "#F59E0B", "#10B981", "#EF4444", "#06B6D4", "#F472B6"];

function StatCard({ label, value, color, icon, delay }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white dark:bg-[#1a1c1e] p-6 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm flex flex-col flex-1"
    >
      <div className={cn("p-2.5 rounded-lg self-start mb-4 bg-gray-50 dark:bg-white/5", color)}>
        {icon}
      </div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <h3 className="text-xl font-bold text-[#00204a] dark:text-white truncate">{value}</h3>
    </motion.div>
  );
}

function ForeignItem({ symbol, value, name, color }: any) {
  const formatted =
    value >= 1000 ? (value / 1000).toFixed(1) + "k" : (value || 0).toFixed(1);
  return (
    <div className="flex flex-col items-center flex-1">
      <span className={cn("text-xl font-bold mb-1", color)}>{symbol}</span>
      <span className="text-sm font-bold text-[#00204a] dark:text-white">{formatted}</span>
      <span className="text-[8px] font-bold text-gray-400 uppercase mt-1">{name}</span>
    </div>
  );
}

export default function FinanceSummaryScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const routeUnitId = queryParams.get("unitId");
  const readOnly = queryParams.get("readOnly") === "true";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [search, setSearch] = useState("");
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [finances, setFinances] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    income: false,
    expense: false,
  });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [showForeignModal, setShowForeignModal] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("user").then((u) => {
      if (u) {
        const user = JSON.parse(u);
        setUserRole(user?.activeRole || "");
      }
    });
  }, []);

  const isEffectiveReadOnly = useMemo(() => {
    // If it's explicitly readOnly or if an Admin is viewing a specific unit's dashboard which is not their own context
    if (readOnly) return true;
    const isAdmin = userRole === "SuperAdmin" || userRole === "MinistryAdmin";
    return isAdmin && !!routeUnitId;
  }, [readOnly, userRole, routeUnitId]);

  const suggestions = useMemo(() => {
    if (!search || search.length < 2) return [];
    const s = search.toLowerCase();
    const common = ["Tithe", "General Offering", "First Fruit", "Seeds", "Projects", "Church Operations", "Member Support", "Utilities", "Maintenance", "Welfare"];
    const fromData = Array.from(new Set(finances.map(f => f.description).filter(Boolean)));
    const all = Array.from(new Set([...common, ...fromData]));
    return all.filter(item => item.toLowerCase().includes(s)).slice(0, 5);
  }, [search, finances]);

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setLoading(true);
      else setRefreshing(true);
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) return;
        const rawUser = await AsyncStorage.getItem("user");
        const user = rawUser ? JSON.parse(rawUser) : null;
        const currentRole = user?.activeRole || "";

        const unitId = routeUnitId || (await AsyncStorage.getItem("activeUnitId"));

        const [sumRes, listRes] = await Promise.all([
          getFinanceSummary({ unitId: unitId || undefined }, token),
          axios.get(`${BASE_URl}/api/finance`, {
            params: { unitId, year: selectedYear },
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (sumRes.ok) setSummary(sumRes.summary);
        if (listRes.data?.finances) {
          setFinances(listRes.data.finances);
        }
      } catch (e) {
        toast.error("Sync Failed");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [routeUnitId, selectedYear],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = useMemo(() => {
    // Current year-specific stats for sections
    const yearIncome = finances
      .filter((f) => f.type?.toLowerCase() === "income" || f.type?.toLowerCase() === "deposit")
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const yearExpense = finances
      .filter((f) => f.type?.toLowerCase() === "expense")
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);

    // Global totals from summary API (source of truth for accuracy)
    const income = summary?.totals.income ?? yearIncome;
    const expense = summary?.totals.expense ?? yearExpense;
    const net = summary?.totals.net ?? income - expense;

    // Foreign currency calculation
    const usdInc = finances.reduce(
      (sum, f) => sum + (f.type?.toLowerCase() === "income" ? Number(f.donorName) || 0 : 0),
      0,
    );
    const usdExp = finances.reduce(
      (sum, f) => sum + (f.type?.toLowerCase() === "expense" ? Number(f.totalDollar) || 0 : 0),
      0,
    );
    const gbpInc = finances.reduce(
      (sum, f) => sum + (f.type?.toLowerCase() === "income" ? Number(f.department) || 0 : 0),
      0,
    );
    const gbpExp = finances.reduce(
      (sum, f) => sum + (f.type?.toLowerCase() === "expense" ? Number(f.totalPound) || 0 : 0),
      0,
    );
    const eurInc = finances.reduce(
      (sum, f) => sum + (f.type?.toLowerCase() === "income" ? Number(f.eventName) || 0 : 0),
      0,
    );
    const eurExp = finances.reduce(
      (sum, f) => sum + (f.type?.toLowerCase() === "expense" ? Number(f.totalEuro) || 0 : 0),
      0,
    );

    const usd = { inc: usdInc, exp: usdExp, net: usdInc - usdExp };
    const gbp = { inc: gbpInc, exp: gbpExp, net: gbpInc - gbpExp };
    const eur = { inc: eurInc, exp: eurExp, net: eurInc - eurExp };

    return { income, expense, net, usd, gbp, eur };
  }, [finances, summary]);

  const monthlyGrouped = useMemo(() => {
    const months: Record<string, any> = {};
    finances.forEach((f) => {
      const d = new Date(f.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!months[key]) {
        months[key] = {
          month: d.toLocaleString("default", { month: "long" }),
          income: [],
          expense: [],
          totalIncome: 0,
          totalExpense: 0,
        };
      }
      const type = f.type?.toLowerCase();
      if (type === "income" || type === "deposit") {
        months[key].income.push(f);
        months[key].totalIncome += f.amount || 0;
      } else if (type === "expense") {
        months[key].expense.push(f);
        months[key].totalExpense += f.amount || 0;
      }
    });
    return Object.entries(months).sort((a, b) => b[0].localeCompare(a[0]));
  }, [finances]);

  const chartData = useMemo(() => {
    return monthlyGrouped
      .slice(0, 6)
      .reverse()
      .map(([key, data]) => ({
        name: data.month.substring(0, 3),
        income: data.totalIncome,
        expense: data.totalExpense,
      }));
  }, [monthlyGrouped]);

  const pieData = useMemo(() => {
    const inc = summary?.totals.income || 0;
    const exp = summary?.totals.expense || 0;
    const total = inc + exp;
    if (total === 0) return [];
    return [
      { name: "Income", value: inc, fill: "#10B981" },
      { name: "Expense", value: exp, fill: "#EF4444" },
    ];
  }, [summary]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const formatForeign = (val: number) => {
    return (val || 0).toLocaleString("en-US", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  };

  const filteredMonthly = useMemo(() => {
    return monthlyGrouped.filter(([key, data]) => {
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        data.month.toLowerCase().includes(s) ||
        data.income.some((i: any) => i.description?.toLowerCase().includes(s)) ||
        data.expense.some((e: any) => e.description?.toLowerCase().includes(s))
      );
    });
  }, [monthlyGrouped, search]);

  if (loading) return null;

  return (
    <div className="flex-1 bg-gray-50 dark:bg-[#0f1218] min-h-screen pb-32">
      {/* Finance Header */}
      <div className="bg-[#00204a] px-6 py-12">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate(-1)}
              className="p-3.5 rounded-2xl bg-white/10 text-white flex items-center justify-center border border-white/10 active:scale-95 transition-all"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h2 className="text-3xl font-bold text-white mb-2 leading-none uppercase">
                {summary?.unit?.name ? `${summary.unit.name} Financial Summary – ${selectedYear}` : `Financial Summary – ${selectedYear}`}
              </h2>
            </div>
          </div>
          <button
            onClick={() => fetchData(true)}
            className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center border border-white/10 hover:bg-white/20 transition-all active:scale-95"
          >
            <RefreshCw
              size={22}
              className={refreshing ? "animate-spin text-[#349DC5]" : "text-white/60"}
            />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-8">
        {/* Rapid Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-[#1a1c1e] p-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm flex flex-col items-center justify-center"
          >
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
              Total Income
            </p>
            <h2 className="text-xl font-black text-[#10B981] tabular-nums">
              {formatCurrency(stats.income)}
            </h2>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-[#1a1c1e] p-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm flex flex-col items-center justify-center"
          >
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
              Total Expenses
            </p>
            <h2 className="text-xl font-black text-rose-500 tabular-nums">
              {formatCurrency(stats.expense)}
            </h2>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-[#00204a] p-6 rounded-2xl shadow-xl flex flex-col items-center justify-center border border-white/10"
          >
            <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1">
              Net Surplus/Deficit
            </p>
            <h2 className={cn("text-xl font-black tabular-nums", stats.net >= 0 ? "text-white" : "text-rose-400")}>
              {formatCurrency(stats.net)}
            </h2>
          </motion.div>
        </div>

        {/* Foreign Currency Card */}
        {(stats.usd.inc > 0 || stats.usd.exp > 0 || stats.gbp.inc > 0 || stats.gbp.exp > 0 || stats.eur.inc > 0 || stats.eur.exp > 0) && (
          <button
            onClick={() => setShowForeignModal(true)}
            className="w-full mb-8 bg-white dark:bg-[#1a1c1e] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:border-[#349DC5] transition-all group text-left"
          >
            <div className="flex-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Foreign Currency Balances</p>
              <div className="flex gap-6">
                {[
                  { sym: "$", name: "USD", val: stats.usd.net },
                  { sym: "£", name: "GBP", val: stats.gbp.net },
                  { sym: "€", name: "EUR", val: stats.eur.net },
                ].map((c) => (
                  <div key={c.name} className="flex flex-col items-center min-w-[60px]">
                    <span className="text-[11px] font-black text-gray-400 uppercase mb-1">{c.name}</span>
                    <span className={cn("text-base font-black tabular-nums", c.val >= 0 ? "text-[#10B981]" : "text-rose-500")}>
                      {c.val < 0 ? "-" : ""}{c.sym}{Math.abs(c.val) >= 1000 ? (Math.abs(c.val) / 1000).toFixed(1) + "k" : Math.abs(c.val).toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <span className="text-[10px] font-black text-[#349DC5] uppercase tracking-widest group-hover:underline">View Details →</span>
          </button>
        )}

        {/* Registry Quick Controls */}
        <div className="flex flex-col sm:flex-row gap-6 mb-12">
          {!isEffectiveReadOnly && (
            <button
              onClick={() => navigate(`/finance/record?type=income`)}
              className="flex-1 h-16 bg-[#349DC5] text-white rounded-2xl font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-[#349DC5]/20"
            >
              <Plus size={20} /> Add Entry
            </button>
          )}
          <button
            onClick={() => navigate(`/finance/history/income${routeUnitId ? `?unitId=${routeUnitId}` : ""}`)}
            className="flex-1 h-16 bg-[#349DC5] text-white rounded-2xl font-bold text-sm uppercase tracking-widest flex items-center justify-center shadow-lg active:scale-95 transition-all hover:bg-[#00204a]"
          >
            Income History
          </button>
          <button
            onClick={() => navigate(`/finance/history/expense${routeUnitId ? `?unitId=${routeUnitId}` : ""}`)}
            className="flex-1 h-16 bg-white dark:bg-white/5 text-[#00204a] dark:text-white rounded-2xl font-bold text-sm uppercase tracking-widest flex items-center justify-center border-2 border-rose-500/20 dark:border-rose-500/10 shadow-md active:scale-95 transition-all"
          >
            Expense History
          </button>
        </div>

        {/* Search & Year Picker */}
        <div className="flex flex-col md:flex-row gap-4 mb-12">
          <div className="flex-1 relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search records by description..."
              className="w-full h-14 pl-14 pr-6 bg-white dark:bg-[#1a1c1e] text-[#00204a] dark:text-white rounded-xl border border-gray-100 dark:border-white/5 font-bold text-sm outline-none focus:border-[#349DC5] transition-all shadow-sm"
              value={search}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              onChange={(e) => setSearch(e.target.value)}
            />
            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1a1c1e] rounded-xl border border-gray-100 dark:border-white/5 shadow-2xl z-[100] overflow-hidden"
                >
                  {suggestions.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setSearch(item); setShowSuggestions(false); }}
                      className="w-full px-5 py-3 text-left text-xs font-bold text-[#00204a] dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-all border-b last:border-0 border-gray-50 dark:border-white/5"
                    >
                      {item}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="w-full md:w-48 flex items-center bg-white dark:bg-[#1a1c1e] px-4 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm h-14">
            <Calendar className="text-[#349DC5] shrink-0" size={16} />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="flex-1 bg-transparent border-none outline-none font-bold text-xs text-[#00204a] dark:text-white ml-3 cursor-pointer"
            >
              {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                <option key={y} value={y}>Year {y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Ledger Breakdown Sections */}
        <div className="space-y-12 mb-16">
          {/* Income Section */}
          <SectionBreakdown
            title="Income Breakdown (Month-by-Month)"
            items={filteredMonthly}
            type="income"
            themeColor="#10B981"
            isExpanded={expanded.income}
            toggleExpand={() => setExpanded(prev => ({ ...prev, income: !prev.income }))}
          />

          {/* Expense Section */}
          <SectionBreakdown
            title="Expenses Breakdown (Month-by-Month)"
            items={filteredMonthly}
            type="expense"
            themeColor="#EF4444"
            isExpanded={expanded.expense}
            toggleExpand={() => setExpanded(prev => ({ ...prev, expense: !prev.expense }))}
          />
        </div>

        {/* Strategic Analysis */}
        {!search && finances.length > 0 && (
          <section className="space-y-12 pb-20">
            <div>
              <div className="flex items-center gap-4 mb-6">
                <BarChart3 className="text-[#349DC5]" size={20} />
                <h3 className="text-base font-black text-[#00204a] dark:text-white uppercase">
                  Finance Trend (Last 6 Months)
                </h3>
              </div>
              <div className="bg-white dark:bg-[#1a1c1e] p-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6EAF0" opacity={0.5} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: "#94A3B8" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: "#94A3B8" }} />
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 30px rgba(0,0,0,0.1)", fontSize: "10px", fontWeight: "bold" }} />
                    <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} barSize={15} />
                    <Bar dataKey="expense" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={15} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-white dark:bg-[#1a1c1e] p-8 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
              <div className="flex flex-col items-center">
                <div className="w-48 h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="space-y-6">
                <h3 className="text-base font-black text-[#00204a] dark:text-white uppercase">
                  Financial Health Overview
                </h3>
                <div className="space-y-4">
                  {pieData.map((item) => {
                    const total = pieData.reduce((acc, curr) => acc + curr.value, 0);
                    const pct = ((item.value / total) * 100).toFixed(1);
                    return (
                      <div key={item.name} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                          <span className="text-xs font-bold text-gray-500 uppercase">{item.name} Allocation</span>
                        </div>
                        <span className="text-sm font-black text-[#00204a] dark:text-white">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      <AnimatePresence>
        {showForeignModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="bg-white dark:bg-[#1a1c1e] w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-xs font-bold text-[#00204a] dark:text-white uppercase tracking-widest">
                  Foreign Currency
                </h3>
                <button
                  onClick={() => setShowForeignModal(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                {[
                  { name: "USD", sym: "$", ...stats.usd },
                  { name: "GBP", sym: "£", ...stats.gbp },
                  { name: "EUR", sym: "€", ...stats.eur },
                ].map((c, i) => (
                  <div key={c.name} className={cn("space-y-3 pb-6", i !== 2 ? "border-b border-gray-100 dark:border-gray-800" : "")}>
                    <h4 className="text-[11px] font-black text-[#349DC5] uppercase tracking-widest">
                      {c.name} TOTAL
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 font-medium">Income</span>
                        <span className="text-[#00204a] dark:text-white font-bold">{c.sym}{formatForeign(c.inc)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 font-medium">Expense</span>
                        <span className="text-[#00204a] dark:text-white font-bold">{c.sym}{formatForeign(c.exp)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-gray-50 dark:border-gray-800/50">
                        <span className="text-gray-800 dark:text-gray-200 font-bold">Net Balance</span>
                        <span className={cn("font-bold", c.net >= 0 ? "text-emerald-500" : "text-rose-500")}>
                          {c.net < 0 ? "—" : ""}{c.sym}{formatForeign(Math.abs(c.net))}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-6 py-4 bg-gray-50 dark:bg-white/5 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => setShowForeignModal(false)}
                  className="w-full py-3 rounded-lg bg-[#349DC5] text-white font-bold uppercase tracking-widest text-[10px] hover:bg-[#2a8db5] transition-colors"
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
}

function SectionBreakdown({ title, items, type, themeColor, isExpanded, toggleExpand }: any) {
  const filtered = items.slice(0, isExpanded ? undefined : 3);

  return (
    <div>
      <h3 className="text-sm font-bold text-[#00204a] dark:text-white uppercase mb-6 flex items-center gap-2">
        <div className="w-1 h-5 rounded-full" style={{ backgroundColor: themeColor }} />
        {title}
      </h3>
      <div className="space-y-6">
        {filtered.length > 0 ? (
          filtered.map(([key, data]: any) => {
            const list = type === "income" ? data.income : data.expense;
            const total = type === "income" ? data.totalIncome : data.totalExpense;

            return (
              <div key={key} className="bg-white dark:bg-[#1a1c1e] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-gray-50/50 dark:bg-white/5 border-b border-gray-50 dark:border-white/5 flex items-center justify-between">
                  <h4 className="font-bold text-xs text-[#00204a] dark:text-white uppercase tracking-tighter">{data.month}</h4>
                  <span className="text-sm font-black tabular-nums" style={{ color: themeColor }}>
                    {formatCurrencyForComponent(total)}
                  </span>
                </div>
                <div className="p-6 space-y-5">
                  {list.length > 0 ? (
                    list.map((doc: any) => (
                      <div key={doc._id} className="flex items-center justify-between group">
                        <div className="flex-1 min-w-0 pr-6">
                          <p className="text-[13px] font-bold text-[#00204a] dark:text-gray-300 truncate transition-colors">
                            {doc.description || doc.source || "Untitled Entry"}
                          </p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">
                            {doc.source} • {new Date(doc.date).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-[#00204a] dark:text-white tabular-nums">
                          {formatCurrencyForComponent(doc.amount)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-[10px] text-gray-400 font-bold uppercase py-2">No data recorded</p>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-12 bg-gray-50/50 dark:bg-white/2 rounded-2xl border border-dashed border-gray-200 dark:border-white/10 text-center text-gray-400 text-[10px] font-bold uppercase tracking-widest">
            No entries discovered for this cycle
          </div>
        )}

        {items.length > 3 && (
          <button onClick={toggleExpand} className="w-full py-4 text-[10px] font-black uppercase text-[#349DC5] hover:tracking-widest transition-all">
            {isExpanded ? "Minimize Reports" : "View Comprehensive Breakdown"}
          </button>
        )}
      </div>
    </div>
  );
}

function formatCurrencyForComponent(val: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(val || 0);
}

const currentYear = new Date().getFullYear();
