import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  ChevronLeft,
  Search,
  Calendar,
  Landmark,
  TrendingUp,
  TrendingDown,
  PieChart as PieIcon,
  BarChart3,
  X,
  CreditCard,
  Target,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import toast from "react-hot-toast";
import {
  getIncomes,
  getExpenses,
  type IncomeRecord,
  type ExpenseRecord,
} from "../../../api/adminFinance";
import AsyncStorage from "../../../utils/AsyncStorage";

const PRIMARY = "#349DC5";
const COLORS = ["#8B5CF6", "#06B6D4", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#3B82F6"];

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

const parseSafeNumber = (val: string | number | undefined | null) => {
  if (val === undefined || val === null) return 0;
  if (typeof val === "number") return val;
  return parseFloat(String(val).replace(/,/g, "")) || 0;
};

const formatCurrency = (val: number) => {
  if (val >= 1e9) return "₦" + (val / 1e9).toFixed(1) + "B";
  if (val >= 1e6) return "₦" + (val / 1e6).toFixed(1) + "M";
  if (val >= 1e3) return "₦" + (val / 1e3).toFixed(1) + "K";
  return "₦" + val.toLocaleString("en-NG");
};

const formatForeign = (val: number) =>
  val.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const formatAbbreviated = (num: number) => {
  if (num >= 1e9) return (num / 1e9).toFixed(1) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(1) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(1) + "K";
  return num.toString();
};

export default function AdminFinanceSummary() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [query, setQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [incomes, setIncomes] = useState<IncomeRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [expandedSection, setExpandedSection] = useState<"income" | "expense" | null>(null);
  const [showForeignModal, setShowForeignModal] = useState(false);

  const getCurrentMinistry = useCallback(() => {
    const params = new URLSearchParams(location.search);
    const paramMin = params.get("ministry");
    if (paramMin) return paramMin;
    if (!currentUser) return "Main Church";
    if (currentUser.activeRole === "MinistryAdmin") {
      return (
        currentUser.roles?.find((r: any) => r.role === "MinistryAdmin")?.ministryName ||
        "Youth and Singles Church"
      );
    }
    return "Main Church";
  }, [currentUser, location.search]);

  useEffect(() => {
    const init = async () => {
      const userRaw = await AsyncStorage.getItem("user");
      if (userRaw) setCurrentUser(JSON.parse(userRaw));
    };
    init();
  }, []);

  const loadData = useCallback(async (minName: string) => {
    try {
      setLoading(true);
      const [incRes, expRes] = await Promise.all([getIncomes(minName), getExpenses(minName)]);
      setIncomes(incRes || []);
      setExpenses(expRes || []);
    } catch (e: any) {
      console.error("Finance Sync Failure:", e);
      // We only toast if it's not a background refresh or if we want to alert user
      toast.error("Fiscal sync error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const min = getCurrentMinistry();
    // Only load if we have a ministry context or if it's the default
    loadData(min);
  }, [getCurrentMinistry, loadData]);

  const filteredIncomes = useMemo(
    () =>
      incomes.filter((inc) => {
        if (selectedDate && new Date(inc.date).toDateString() !== new Date(selectedDate).toDateString())
          return false;
        return `${inc.category.name} ${inc.amount} ${inc.description || ""}`
          .toLowerCase()
          .includes(query.toLowerCase());
      }),
    [incomes, query, selectedDate],
  );

  const filteredExpenses = useMemo(
    () =>
      expenses.filter((exp) => {
        if (selectedDate && new Date(exp.date).toDateString() !== new Date(selectedDate).toDateString())
          return false;
        return `${exp.category.name} ${exp.amount} ${exp.description || ""}`
          .toLowerCase()
          .includes(query.toLowerCase());
      }),
    [expenses, query, selectedDate],
  );

  const { stats, chartData, pieIncomes, pieExpenses } = useMemo(() => {
    const tIncNGN = filteredIncomes.reduce((s, i) => s + parseSafeNumber(i.totalAmount || i.amount), 0);
    const tExpNGN = filteredExpenses.reduce((s, i) => s + parseSafeNumber(i.amount), 0);
    const net = tIncNGN - tExpNGN;
    const usdInc = filteredIncomes.reduce((s, i) => s + parseSafeNumber(i.donorName), 0);
    const usdExp = filteredExpenses.reduce((s, e) => s + parseSafeNumber(e.totalDollar), 0);
    const gbpInc = filteredIncomes.reduce((s, i) => s + parseSafeNumber(i.department), 0);
    const gbpExp = filteredExpenses.reduce((s, e) => s + parseSafeNumber(e.totalPound), 0);
    const eurInc = filteredIncomes.reduce((s, i) => s + parseSafeNumber(i.eventName), 0);
    const eurExp = filteredExpenses.reduce((s, e) => s + parseSafeNumber(e.totalEuro), 0);

    const usd = { inc: usdInc, exp: usdExp, net: usdInc - usdExp };
    const gbp = { inc: gbpInc, exp: gbpExp, net: gbpInc - gbpExp };
    const eur = { inc: eurInc, exp: eurExp, net: eurInc - eurExp };

    const monthsMap: Record<string, { name: string; income: number; expense: number }> = {};
    const proc = (arr: any[], type: "income" | "expense") =>
      arr.forEach((rec) => {
        const d = new Date(rec.date);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (!monthsMap[k])
          monthsMap[k] = {
            name: d.toLocaleDateString("en-US", { month: "short" }),
            income: 0,
            expense: 0,
          };
        monthsMap[k][type] += parseSafeNumber(rec.totalAmount || rec.amount);
      });
    proc(filteredIncomes, "income");
    proc(filteredExpenses, "expense");
    const sortedChart = Object.keys(monthsMap)
      .sort()
      .map((k) => monthsMap[k])
      .slice(-6);

    const catMap = (arr: any[], isInc: boolean) => {
      const m: Record<string, number> = {};
      arr.forEach((r) => {
        const c = r.category.name;
        m[c] = (m[c] || 0) + parseSafeNumber(isInc ? r.totalAmount || r.amount : r.amount);
      });
      return Object.entries(m).map(([name, value]) => ({ name, value }));
    };

    return {
      stats: { tIncNGN, tExpNGN, net, usd, gbp, eur },
      chartData: sortedChart,
      pieIncomes: catMap(filteredIncomes, true),
      pieExpenses: catMap(filteredExpenses, false),
    };
  }, [filteredIncomes, filteredExpenses]);

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-[#0f1218]">
        <div className="w-12 h-12 border-4 border-[#349DC5] border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f1218] flex flex-col">
      <div className="bg-[#00204a] p-10 pb-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-white">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate(-1)}
              className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-all active:scale-95"
            >
              <ChevronLeft size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-bold uppercase leading-none mb-2">Finance Hub</h1>
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest leading-none">
                Mission Strategic Fiscal Review
              </p>
            </div>
          </div>
          <FileSpreadsheet size={28} className="text-[#349DC5] opacity-30" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full px-6 -mt-10 flex-1 pb-32">
        <div className="grid grid-cols-1 gap-6 mb-8">
          <div className="bg-white dark:bg-[#1a1c1e] p-10 rounded-[40px] shadow-2xl border border-gray-100 dark:border-white/5 flex flex-col items-center text-center relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-2 bg-[#349DC5] shadow-[0_0_20px_rgba(52,157,197,0.3)]" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
              Net Surplus Balance (NGN)
            </p>
            <h2 className="text-5xl font-black text-[#00204a] dark:text-white leading-none mb-4 tabular-nums">
              {formatCurrency(stats.net)}
            </h2>
            <div className={cn(
              "flex items-center gap-1.5 px-4 h-8 rounded-full text-[10px] font-black uppercase tracking-widest",
              stats.net >= 0 ? "bg-emerald-50 text-emerald-500" : "bg-rose-50 text-rose-500"
            )}>
              {stats.net >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              Surplus Growth Target
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white dark:bg-[#1a1c1e] p-8 rounded-[40px] border border-gray-100 dark:border-white/5 shadow-xl group hover:border-emerald-500/30 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-500">
                  <ArrowUpRight size={20} />
                </div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Incomes</span>
              </div>
              <p className="text-2xl font-black text-[#00204a] dark:text-white truncate">
                {formatCurrency(stats.tIncNGN)}
              </p>
            </div>
            <div className="bg-white dark:bg-[#1a1c1e] p-8 rounded-[40px] border border-gray-100 dark:border-white/5 shadow-xl group hover:border-rose-500/30 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center text-rose-500">
                  <ArrowDownRight size={20} />
                </div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Outflow</span>
              </div>
              <p className="text-2xl font-black text-[#00204a] dark:text-white truncate">
                {formatCurrency(stats.tExpNGN)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a1c1e] border border-gray-100 dark:border-white/5 rounded-[40px] p-8 shadow-xl mb-12">
          <div className="flex items-center gap-4 mb-10 overflow-x-auto no-scrollbar pb-2">
            {[
              { sym: "$", ...stats.usd, label: "USD Base", name: "USD" },
              { sym: "£", ...stats.gbp, label: "GBP Base", name: "GBP" },
              { sym: "€", ...stats.eur, label: "EUR Base", name: "EUR" },
            ].map((cur, i) => (
              <div key={cur.label} onClick={() => setShowForeignModal(true)} className={cn(
                "flex-none px-8 py-5 rounded-3xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/2 min-w-[160px] cursor-pointer hover:border-[#349DC5] transition-all",
                i === 0 ? "border-[#349DC5]/30 bg-[#349DC5]/5" : ""
              )}>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">{cur.label}</p>
                <p className="text-xl font-black text-[#00204a] dark:text-white">
                  {cur.sym}{formatForeign(cur.net)}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-12">
            <section className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-3">
                  <BarChart3 size={20} className="text-[#349DC5]" /> Overview
                </h3>
              </div>
              <div className="h-72 w-full p-6 bg-gray-50/30 dark:bg-black/10 rounded-3xl border border-gray-50 dark:border-white/2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fontWeight: "bold", fill: "#9CA3AF" }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fontWeight: "bold", fill: "#9CA3AF" }}
                      tickFormatter={(v) => formatAbbreviated(v)}
                    />
                    <Tooltip
                      cursor={{ fill: "#349DC510" }}
                      contentStyle={{ borderRadius: "20px", border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", fontWeight: "bold" }}
                    />
                    <Bar dataKey="income" fill="#349DC5" radius={[6, 6, 0, 0]} barSize={16} />
                    <Bar dataKey="expense" fill="#A78BFA" radius={[6, 6, 0, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

             <section className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
              <div className="space-y-6">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Income Distribution</h4>
                <div className="h-64 bg-gray-50/30 dark:bg-black/10 rounded-3xl border border-gray-50 dark:border-white/2 p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieIncomes} innerRadius={50} outerRadius={70} paddingAngle={8} dataKey="value">
                        {pieIncomes.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} formatter={(v) => <span className="text-[9px] font-bold text-gray-400 uppercase">{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="space-y-6">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Expense Allocation</h4>
                <div className="h-64 bg-gray-50/30 dark:bg-black/10 rounded-3xl border border-gray-50 dark:border-white/2 p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieExpenses} innerRadius={50} outerRadius={70} paddingAngle={8} dataKey="value">
                        {pieExpenses.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} formatter={(v) => <span className="text-[9px] font-bold text-gray-400 uppercase">{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-20">
          <button
            onClick={() => navigate(`/admin-finance/income?ministry=${getCurrentMinistry()}`)}
            className="flex flex-col items-center justify-center p-8 bg-white dark:bg-[#1a1c1e] rounded-[40px] shadow-xl border border-gray-100 dark:border-white/5 hover:border-[#349DC5] transition-all group"
          >
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl flex items-center justify-center text-emerald-500 mb-3 group-hover:scale-110 transition-transform">
               <ArrowUpRight size={24} />
            </div>
            <span className="text-[10px] font-black text-[#00204a] dark:text-white uppercase tracking-widest">Incomes</span>
          </button>
          <button
            onClick={() => navigate(`/admin-finance/expenses?ministry=${getCurrentMinistry()}`)}
            className="flex flex-col items-center justify-center p-8 bg-white dark:bg-[#1a1c1e] rounded-[40px] shadow-xl border border-gray-100 dark:border-white/5 hover:border-rose-500/30 transition-all group"
          >
            <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/20 rounded-2xl flex items-center justify-center text-rose-500 mb-3 group-hover:scale-110 transition-transform">
               <ArrowDownRight size={24} />
            </div>
            <span className="text-[10px] font-black text-[#00204a] dark:text-white uppercase tracking-widest">Expenses</span>
          </button>
        </div>
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
                <h3 className="text-xs font-bold text-[#00204a] dark:text-white uppercase tracking-widest leading-none">
                  Foreign Currency
                </h3>
                <button
                  onClick={() => setShowForeignModal(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto no-scrollbar">
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
                        <span className="text-[#111] dark:text-white font-bold">{c.sym}{formatForeign(c.inc)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 font-medium">Expense</span>
                        <span className="text-[#111] dark:text-white font-bold">{c.sym}{formatForeign(c.exp)}</span>
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
                  className="w-full py-3 rounded-lg bg-[#349DC5] text-white font-bold uppercase tracking-widest text-[10px] hover:opacity-90 transition-opacity"
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
