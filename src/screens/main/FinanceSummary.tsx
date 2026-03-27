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
      .filter((f) => f.type === "income")
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const yearExpense = finances
      .filter((f) => f.type === "expense")
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);

    // Global totals from summary API (source of truth for accuracy)
    const income = summary?.totals.income ?? yearIncome;
    const expense = summary?.totals.expense ?? yearExpense;
    const net = summary?.totals.net ?? income - expense;

    // Foreign currency calculation (parity with Admin logic)
    const usd = finances.reduce(
      (sum, f) =>
        sum +
        (f.type === "income" ? Number(f.donorName) || 0 : -(Number(f.totalDollar) || 0)),
      0,
    );
    const gbp = finances.reduce(
      (sum, f) =>
        sum +
        (f.type === "income" ? Number(f.department) || 0 : -(Number(f.totalPound) || 0)),
      0,
    );
    const eur = finances.reduce(
      (sum, f) =>
        sum +
        (f.type === "income" ? Number(f.eventName) || 0 : -(Number(f.totalEuro) || 0)),
      0,
    );

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
      if (f.type === "income") {
        months[key].income.push(f);
        months[key].totalIncome += f.amount || 0;
      } else {
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
      { name: "Income", value: inc, fill: "#7C3AED" },
      { name: "Expense", value: exp, fill: "#10B981" },
    ];
  }, [summary]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(val);
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-[#1a1c1e] p-8 rounded-xl border-2 border-[#349DC5]/30 shadow-sm flex flex-col items-center justify-center mb-6"
        >
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
            Net Surplus / Deficit
          </p>
          <h2
            className={cn(
              "text-4xl font-bold tabular-nums",
              stats.net >= 0 ? "text-[#00204a] dark:text-white" : "text-rose-500",
            )}
          >
            {formatCurrency(stats.net)}
          </h2>
        </motion.div>

        {/* Foreign Assets */}
        <div className="bg-white dark:bg-[#1a1c1e] p-7 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm mb-6">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-6 text-center">
            Foreign Currencies
          </p>
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-center flex-1">
              <span className="text-sm font-black text-[#00204a] dark:text-white">
                $ {stats.usd.toLocaleString()}
              </span>
              <span className="text-[9px] font-bold text-gray-400 uppercase mt-1">
                USD
              </span>
            </div>
            <div className="w-px h-10 bg-gray-100 dark:bg-white/5 mx-4" />
            <div className="flex flex-col items-center flex-1">
              <span className="text-sm font-black text-[#00204a] dark:text-white">
                £ {stats.gbp.toLocaleString()}
              </span>
              <span className="text-[9px] font-bold text-gray-400 uppercase mt-1">
                GBP
              </span>
            </div>
            <div className="w-px h-10 bg-gray-100 dark:bg-white/5 mx-4" />
            <div className="flex flex-col items-center flex-1">
              <span className="text-sm font-black text-[#00204a] dark:text-white">
                € {stats.eur.toLocaleString()}
              </span>
              <span className="text-[9px] font-bold text-gray-400 uppercase mt-1">
                EUR
              </span>
            </div>
          </div>
        </div>

        {/* Registry Quick Controls */}
        <div className="flex flex-col sm:flex-row gap-8 mb-16">
          <button
            onClick={() => navigate(`/admin-finance/income`)}
            className="flex-1 h-20 bg-[#00204a] text-white rounded-2xl font-black text-base uppercase tracking-widest flex items-center justify-center shadow-xl active:scale-95 transition-all hover:bg-[#1a3a6a] hover:shadow-[#00204a]/20"
          >
            Income History
          </button>
          <button
            onClick={() => navigate(`/admin-finance/expenses`)}
            className="flex-1 h-20 bg-white dark:bg-[#1a1c1e] text-[#00204a] dark:text-white rounded-2xl font-black text-base uppercase tracking-widest flex items-center justify-center border-2 border-[#00204a] dark:border-white/20 shadow-lg active:scale-95 transition-all hover:bg-gray-50 dark:hover:bg-white/5"
          >
            Expense History
          </button>
        </div>

        {/* Search & Actions */}
        <div className="flex flex-col sm:flex-row gap-6 mb-12">
          <div className="flex-1 relative group">
            <Search
              className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#349DC5] transition-colors"
              size={22}
            />
            <input
              type="text"
              placeholder="Search command modules..."
              className="w-full h-20 pl-16 pr-8 bg-white dark:bg-[#1a1c1e] text-[#00204a] dark:text-gray-100 rounded-2xl border-2 border-gray-100 dark:border-white/5 font-black text-base outline-none focus:border-[#349DC5] transition-all shadow-md placeholder:text-gray-300 placeholder:font-bold"
              value={search}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              onChange={(e) => setSearch(e.target.value)}
            />
            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  className="absolute top-full left-0 right-0 mt-4 bg-white dark:bg-[#1a1c1e] rounded-2xl border-2 border-[#349DC5]/20 shadow-2xl z-[100] overflow-hidden backdrop-blur-xl"
                >
                  <div className="p-3 bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3">
                      Suggestions
                    </p>
                  </div>
                  {suggestions.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSearch(item);
                        setShowSuggestions(false);
                      }}
                      className="w-full px-6 py-4 text-left text-sm font-black text-[#00204a] dark:text-gray-200 hover:bg-[#349DC5]/10 hover:text-[#349DC5] transition-all border-b last:border-0 border-gray-50 dark:border-white/5 flex items-center justify-between group"
                    >
                      <span>{item}</span>
                      <ChevronRight size={18} className="translate-x-0 group-hover:translate-x-2 transition-transform" />
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {!readOnly && (
            <button
              onClick={() => navigate(`/finance/record?type=income`)}
              className="h-20 px-10 bg-[#00204a] text-white rounded-2xl font-black text-sm uppercase flex items-center gap-4 active:scale-95 transition-all shadow-xl hover:bg-[#1a3a6a]"
            >
              <Plus size={24} /> Add Entry
            </button>
          )}
        </div>

        {/* Year Picker */}
        <div className="flex items-center bg-white dark:bg-[#1a1c1e] px-4 rounded-xl border border-gray-100 dark:border-white/5 mb-8 shadow-sm h-14">
          <Calendar className="text-[#349DC5] shrink-0" size={18} />
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="flex-1 bg-transparent border-none outline-none font-bold text-xs text-[#00204a] dark:text-white h-full ml-3 cursor-pointer"
          >
            {Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - i).map((y) => (
              <option key={y} value={y} className="text-[#00204a]">
                Year {y}
              </option>
            ))}
          </select>
        </div>

        {/* Ledger Breakdown Sections */}
        <div className="space-y-12 mb-16">
          {/* Income Section */}
          <div>
            <h3 className="text-base font-bold text-[#00204a] dark:text-white uppercase mb-6 flex items-center gap-2">
              <div className="w-1 h-5 bg-[#7C3AED] rounded-full" />
              Income Breakdown (Month-by-Month)
            </h3>
            <div className="space-y-6">
              {filteredMonthly.length > 0 ? (
                filteredMonthly
                  .slice(0, expanded.income ? undefined : 2)
                  .map(([key, data]) => (
                    <div
                      key={key}
                      className="bg-white dark:bg-[#1a1c1e] rounded-xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden"
                    >
                      <div className="px-6 py-4 bg-gray-50/50 dark:bg-white/2 border-b border-gray-50 dark:border-white/5 flex items-center justify-between">
                        <h4 className="font-bold text-sm text-[#00204a] dark:text-white uppercase">
                          {data.month}
                        </h4>
                        <span className="text-xs font-bold tabular-nums text-emerald-500">
                          {formatCurrency(data.totalIncome)}
                        </span>
                      </div>
                      <div className="p-6 space-y-5">
                        {data.income.map((doc: any) => (
                          <div key={doc._id} className="flex items-center justify-between group">
                            <div className="flex-1 min-w-0 pr-6">
                              <p className="text-[13px] font-bold text-[#00204a] dark:text-gray-300 truncate group-hover:text-[#7C3AED] transition-colors">
                                {doc.description || "Uncategorized Item"}
                              </p>
                              <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">
                                {doc.source} • {new Date(doc.date).toLocaleDateString()}
                              </p>
                            </div>
                            <span className="text-sm font-bold text-[#00204a] dark:text-white tabular-nums">
                              {formatCurrency(doc.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
              ) : (
                <div className="py-10 text-center text-gray-400 text-[10px] font-bold uppercase">
                  No income discovered
                </div>
              )}
              {filteredMonthly.length > 2 && (
                <button
                  onClick={() => setExpanded((e) => ({ ...e, income: !e.income }))}
                  className="w-full py-4 text-xs font-black uppercase text-[#349DC5] hover:underline"
                >
                  {expanded.income ? "View Less" : "View More"}
                </button>
              )}
            </div>
          </div>

          {/* Expense Section */}
          <div>
            <h3 className="text-base font-bold text-[#00204a] dark:text-white uppercase mb-6 flex items-center gap-2">
              <div className="w-1 h-5 bg-[#EF4444] rounded-full" />
              Expenses Breakdown (Month-by-Month)
            </h3>
            <div className="space-y-6">
              {filteredMonthly.length > 0 ? (
                filteredMonthly
                  .slice(0, expanded.expense ? undefined : 2)
                  .map(([key, data]) => (
                    <div
                      key={key}
                      className="bg-white dark:bg-[#1a1c1e] rounded-xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden"
                    >
                      <div className="px-6 py-4 bg-gray-50/50 dark:bg-white/2 border-b border-gray-50 dark:border-white/5 flex items-center justify-between">
                        <h4 className="font-bold text-sm text-[#00204a] dark:text-white uppercase">
                          {data.month}
                        </h4>
                        <span className="text-xs font-bold tabular-nums text-rose-500">
                          {formatCurrency(data.totalExpense)}
                        </span>
                      </div>
                      <div className="p-6 space-y-5">
                        {data.expense.map((doc: any) => (
                          <div key={doc._id} className="flex items-center justify-between group">
                            <div className="flex-1 min-w-0 pr-6">
                              <p className="text-[13px] font-bold text-[#00204a] dark:text-gray-300 truncate group-hover:text-rose-500 transition-colors">
                                {doc.description || "Uncategorized Item"}
                              </p>
                              <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">
                                {doc.source} • {new Date(doc.date).toLocaleDateString()}
                              </p>
                            </div>
                            <span className="text-sm font-bold text-[#00204a] dark:text-white tabular-nums">
                              {formatCurrency(doc.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
              ) : (
                <div className="py-10 text-center text-gray-400 text-[10px] font-bold uppercase">
                  No expenses discovered
                </div>
              )}
              {filteredMonthly.length > 2 && (
                <button
                  onClick={() => setExpanded((e) => ({ ...e, expense: !e.expense }))}
                  className="w-full py-4 text-xs font-black uppercase text-[#349DC5] hover:underline"
                >
                  {expanded.expense ? "View Less" : "View More"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Strategic Analysis */}
        {!search && finances.length > 0 && (
          <section className="space-y-12 pb-20">
            <div>
              <div className="flex items-center gap-4 mb-8">
                <BarChart3 className="text-[#349DC5]" size={20} />
                <h3 className="text-lg font-bold text-[#00204a] dark:text-white uppercase leading-none">
                  Income Trend
                </h3>
              </div>
              <div className="bg-white dark:bg-[#1a1c1e] p-8 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm h-[380px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6EAF0" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fontWeight: 900, fill: "#94A3B8" }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fontWeight: 900, fill: "#94A3B8" }}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(52, 157, 197, 0.05)" }}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "none",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
                      }}
                      labelStyle={{
                        fontWeight: 900,
                        fontSize: "10px",
                        textTransform: "uppercase",
                        color: "#00204a",
                      }}
                    />
                    <Bar dataKey="income" radius={[4, 4, 0, 0]} barSize={20}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-4 mb-8">
                <PieIcon className="text-[#349DC5]" size={20} />
                <h3 className="text-lg font-bold text-[#00204a] dark:text-white uppercase leading-none">
                  Financial Health Comparison
                </h3>
              </div>
              <div className="bg-white dark:bg-[#1a1c1e] p-10 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm flex flex-col md:flex-row items-center gap-12">
                <div className="w-48 h-48 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 w-full space-y-4">
                  {pieData.map((item, idx) => {
                    const total = pieData.reduce((acc, curr) => acc + curr.value, 0);
                    const pct = ((item.value / total) * 100).toFixed(1);
                    return (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                          />
                          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                            {item.name}
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-[#00204a] dark:text-white">
                          {pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

        <footer className="mt-12 py-10 border-t border-gray-100 dark:border-white/5 flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
          </div>
          {/* <p className="text-[9px] font-bold uppercase text-gray-300">
            © 2025 STREAMS OF JOY GLOBAL • OFFICIAL FINANCIAL RECORDS
          </p> */}
        </footer>
      </div>
    </div>
  );
}
