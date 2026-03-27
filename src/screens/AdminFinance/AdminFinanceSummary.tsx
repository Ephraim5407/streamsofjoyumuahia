import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { ArrowLeft, Search, X } from "lucide-react";
import {
  getIncomes,
  getExpenses,
  type IncomeRecord,
  type ExpenseRecord,
} from "../../api/adminFinance";
import AsyncStorage from "../../utils/AsyncStorage";

const incomeColors = [
  "#8B5CF6",
  "#06B6D4",
  "#10b981",
  "#F59E0B",
  "#EF4444",
  "#8B5A2B",
  "#06D6A0",
  "#F72585",
  "#7209B7",
  "#560BAD",
  "#480CA8",
  "#3A0CA3",
  "#3F37C9",
  "#4361EE",
  "#4895EF",
];
const expenseColors = [
  "#8B5CF6",
  "#EF4444",
  "#F59E0B",
  "#06B6D4",
  "#10b981",
  "#F72585",
  "#7209B7",
  "#560BAD",
  "#480CA8",
  "#3A0CA3",
  "#3F37C9",
  "#4361EE",
  "#4895EF",
  "#4CC9F0",
];

export default function AdminFinanceSummary() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [incomes, setIncomes] = useState<IncomeRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [filteredIncomes, setFilteredIncomes] = useState<IncomeRecord[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<ExpenseRecord[]>([]);
  const [incomeExpanded, setIncomeExpanded] = useState(false);
  const [expenseExpanded, setExpenseExpanded] = useState(false);
  const [filteredMonthlyData, setFilteredMonthlyData] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];
    const s = searchQuery.toLowerCase();
    const common = ["Tithe", "General Offering", "First Fruit", "Seeds", "Projects", "Church Operations", "Member Support", "Utilities", "Maintenance", "Welfare"];
    const fromIncomes = Array.from(new Set(incomes.map(f => (f.category?.name || f.donorName) as string).filter(Boolean)));
    const fromExpenses = Array.from(new Set(expenses.map(f => (f.category?.name || f.description) as string).filter(Boolean)));
    const all: string[] = Array.from(new Set([...common, ...fromIncomes, ...fromExpenses]));
    return all.filter(item => item && item.toLowerCase().includes(s)).slice(0, 5);
  }, [searchQuery, incomes, expenses]);

  const getCurrentMinistry = (userObj?: any) => {
    const paramMinistry = location.state?.ministry;
    if (paramMinistry) return paramMinistry;
    const u = userObj || currentUser;
    if (!u) return "Main Church";
    if (u.activeRole === "MinistryAdmin") {
      const ministryRole = u.roles?.find(
        (r: any) => r.role === "MinistryAdmin",
      );
      return ministryRole?.ministryName || "Youth and Singles Church";
    }
    return "Main Church";
  };

  const loadData = async () => {
    try {
      const userRaw = await AsyncStorage.getItem("user");
      const parsedUser = userRaw ? JSON.parse(userRaw) : null;
      if (parsedUser) setCurrentUser(parsedUser);
      const ministry = getCurrentMinistry(parsedUser);
      const [incomesData, expensesData] = await Promise.all([
        getIncomes(ministry),
        getExpenses(ministry),
      ]);
      setIncomes(incomesData);
      setFilteredIncomes(incomesData);
      setExpenses(expensesData);
      setFilteredExpenses(expensesData);
    } catch (error) {
      console.log("Error loading data:", error);
    }
  };

  useEffect(() => {
    loadData();
  }, [location.state?.ministry]);

  useEffect(() => {
    if (selectedDate) {
      const selD = new Date(selectedDate).toDateString();
      setFilteredIncomes(
        incomes.filter((inc) => new Date(inc.date).toDateString() === selD),
      );
      setFilteredExpenses(
        expenses.filter((exp) => new Date(exp.date).toDateString() === selD),
      );
    } else {
      setFilteredIncomes(incomes);
      setFilteredExpenses(expenses);
    }
  }, [selectedDate, incomes, expenses]);

  const groupByMonth = (records: any[]) => {
    const grouped: { [key: string]: any[] } = {};
    records.forEach((record) => {
      const date = new Date(record.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!grouped[monthKey]) grouped[monthKey] = [];
      grouped[monthKey].push(record);
    });
    return grouped;
  };

  const formatMonthName = (monthKey: string) => {
    const [year, month] = monthKey.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return (
      date.toLocaleDateString("en-NG", { year: "numeric", month: "long" }) +
      ", " +
      year
    );
  };

  const monthlyData = useMemo(() => {
    const incomeGrouped = groupByMonth(filteredIncomes);
    const expenseGrouped = groupByMonth(filteredExpenses);
    const allMonths = new Set([
      ...Object.keys(incomeGrouped),
      ...Object.keys(expenseGrouped),
    ]);
    const sortedMonths = Array.from(allMonths).sort();
    return sortedMonths.map((monthKey) => {
      const monthIncomes = incomeGrouped[monthKey] || [];
      const monthExpenses = expenseGrouped[monthKey] || [];
      const incomeByCategory: { [key: string]: number } = {};
      monthIncomes.forEach((income) => {
        const categoryName = income.category.name;
        const amount = parseFloat(income.totalAmount || income.amount || "0");
        incomeByCategory[categoryName] = (incomeByCategory[categoryName] || 0) + amount;
      });
      const expenseByCategory: { [key: string]: number } = {};
      monthExpenses.forEach((expense) => {
        const categoryName = expense.category.name;
        const amount = parseFloat(expense.amount || "0");
        expenseByCategory[categoryName] =
          (expenseByCategory[categoryName] || 0) + amount;
      });
      return {
        month: formatMonthName(monthKey),
        income: Object.entries(incomeByCategory).map(([category, amount]) => ({
          category,
          amount,
        })),
        expenses: Object.entries(expenseByCategory).map(([category, amount]) => ({
          category,
          amount,
        })),
      };
    });
  }, [filteredIncomes, filteredExpenses]);

  const parseSafeNumber = (val: string | number | undefined | null) => {
    if (val === undefined || val === null) return 0;
    if (typeof val === "number") return val;
    const clean = String(val).replace(/,/g, "");
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  };

  const {
    totalIncome,
    totalExpenses,
    netSurplus,
    totalUSD,
    totalGBP,
    totalEUR,
  } = useMemo(() => {
    const tInc = filteredIncomes.reduce(
      (sum, inc) => sum + parseSafeNumber(inc.totalAmount || inc.amount),
      0,
    );
    const tExp = filteredExpenses.reduce(
      (sum, exp) => sum + parseSafeNumber(exp.amount),
      0,
    );
    const net = tInc - tExp;
    const usd =
      filteredIncomes.reduce(
        (sum, inc) => sum + parseSafeNumber(inc.donorName),
        0,
      ) -
      filteredExpenses.reduce(
        (sum, exp) => sum + parseSafeNumber(exp.totalDollar),
        0,
      );
    const gbp =
      filteredIncomes.reduce(
        (sum, inc) => sum + parseSafeNumber(inc.department),
        0,
      ) -
      filteredExpenses.reduce(
        (sum, exp) => sum + parseSafeNumber(exp.totalPound),
        0,
      );
    const eur =
      filteredIncomes.reduce(
        (sum, inc) => sum + parseSafeNumber(inc.eventName),
        0,
      ) -
      filteredExpenses.reduce(
        (sum, exp) => sum + parseSafeNumber(exp.totalEuro),
        0,
      );
    return {
      totalIncome: tInc,
      totalExpenses: tExp,
      netSurplus: net,
      totalUSD: usd,
      totalGBP: gbp,
      totalEUR: eur,
    };
  }, [filteredIncomes, filteredExpenses]);

  const formatCurrency = (value: number) => {
    return "₦" + value.toLocaleString("en-NG");
  };

  const formatForeign = (val: number) =>
    val.toFixed(1).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  useEffect(() => {
    setIsSearching(true);
    const timeout = setTimeout(() => {
      if (!searchQuery) {
        setFilteredMonthlyData(monthlyData);
      } else {
        const filtered = monthlyData.filter((month) => {
          const monthMatch = month.month
            .toLowerCase()
            .includes(searchQuery.toLowerCase());
          const incomeMatch = month.income.some(
            (item) =>
              item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
              formatCurrency(item.amount).includes(searchQuery),
          );
          const expenseMatch = month.expenses.some(
            (item) =>
              item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
              formatCurrency(item.amount).includes(searchQuery),
          );
          return monthMatch || incomeMatch || expenseMatch;
        });
        setFilteredMonthlyData(filtered);
      }
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, monthlyData]);

  const incomeByMonth = monthlyData.map((m) =>
    m.income.reduce((sum, i) => sum + i.amount, 0),
  );
  const expenseByMonth = monthlyData.map((m) =>
    m.expenses.reduce((sum, e) => sum + e.amount, 0),
  );
  const totalIncomeSum = incomeByMonth.reduce((sum, v) => sum + v, 0);
  const totalExpenseSum = expenseByMonth.reduce((sum, v) => sum + v, 0);
  const monthLabels = monthlyData.map((m) => m.month.substring(0, 3));

  const barChartIncomeData = monthlyData.map((m, idx) => ({
    name: monthLabels[idx],
    value: totalIncomeSum > 0 ? (incomeByMonth[idx] / totalIncomeSum) * 100 : 0,
    rawAmount: incomeByMonth[idx],
    fullMonth: m.month,
    fill: incomeColors[idx % incomeColors.length],
  }));

  const barChartExpenseData = monthlyData.map((m, idx) => ({
    name: monthLabels[idx],
    value: totalExpenseSum > 0 ? (expenseByMonth[idx] / totalExpenseSum) * 100 : 0,
    rawAmount: expenseByMonth[idx],
    fullMonth: m.month,
    fill: expenseColors[idx % expenseColors.length],
  }));

  const aggregatedIncomeByCategory: { [key: string]: number } = {};
  monthlyData.forEach((m) =>
    m.income.forEach(
      (i) =>
        (aggregatedIncomeByCategory[i.category] =
          (aggregatedIncomeByCategory[i.category] || 0) + i.amount),
    ),
  );

  const aggregatedExpenseByCategory: { [key: string]: number } = {};
  monthlyData.forEach((m) =>
    m.expenses.forEach(
      (i) =>
        (aggregatedExpenseByCategory[i.category] =
          (aggregatedExpenseByCategory[i.category] || 0) + i.amount),
    ),
  );

  const pieIncomeData = Object.entries(aggregatedIncomeByCategory).map(
    ([cat, val], idx) => ({
      name: cat,
      value: val,
      fill: incomeColors[idx % incomeColors.length],
      percentage:
        totalIncomeSum > 0 ? ((val / totalIncomeSum) * 100).toFixed(1) : "0.0",
    }),
  );

  const pieExpenseData = Object.entries(aggregatedExpenseByCategory).map(
    ([cat, val], idx) => ({
      name: cat,
      value: val,
      fill: expenseColors[idx % expenseColors.length],
      percentage:
        totalExpenseSum > 0 ? ((val / totalExpenseSum) * 100).toFixed(1) : "0.0",
    }),
  );

  return (
    <div className="flex-1 w-full overflow-y-auto bg-[#F9FAFB] dark:bg-[#121212] flex flex-col pt-0 pb-32">
      <div className="max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between h-12 px-4 mt-1 mb-2">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1">
            <ArrowLeft size={28} className="text-[#111] dark:text-gray-200" />
          </button>
          <span className="text-base font-bold text-[#111] dark:text-gray-200 flex-1 text-center">
            Financial Summary - {new Date().getFullYear()}
          </span>
          <div className="w-8" />
        </div>

        <div className="px-4 flex flex-col gap-4">
          <div className="relative">
            <div className="flex flex-row items-center bg-white dark:bg-[#1e1e1e] rounded-xl px-3.5 py-2.5 border border-[#E6EEF5] dark:border-[#333]">
              <Search size={20} className="text-gray-400 mr-2" />
              <input
                type="text"
                className="flex-1 bg-transparent text-sm text-[#111] dark:text-white outline-none"
                placeholder="Search By date, desc, Income or Expense..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              />
              {isSearching && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#349DC5] border-t-transparent ml-2" />
              )}
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="ml-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-full"
                >
                  <X size={14} className="text-gray-500" />
                </button>
              )}
            </div>

            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1e1e1e] rounded-xl border border-[#E6EEF5] dark:border-[#333] shadow-xl z-50 overflow-hidden"
                >
                  {suggestions.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSearchQuery(item);
                        setShowSuggestions(false);
                      }}
                      className="w-full px-4 py-3 text-left text-sm font-semibold text-[#111] dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b last:border-0 border-[#E6EEF5] dark:border-[#333]"
                    >
                      {item}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-2">
            <button
              onClick={() =>
                navigate("/admin-finance/income", {
                  state: { ministry: getCurrentMinistry() },
                })
              }
              className="flex-1 w-full bg-[#349DC5] rounded-xl py-5 flex items-center justify-center shadow-lg hover:bg-opacity-90 transition-opacity active:scale-[0.98]"
            >
              <span className="text-white font-black text-base uppercase tracking-tight">Income History</span>
            </button>
            <button
              onClick={() =>
                navigate("/admin-finance/expenses", {
                  state: { ministry: getCurrentMinistry() },
                })
              }
              className="flex-1 w-full bg-white dark:bg-[#1e1e1e] rounded-xl py-5 flex items-center justify-center border-2 border-[#349DC5] shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors active:scale-[0.98]"
            >
              <span className="text-[#349DC5] font-black text-base uppercase tracking-tight">
                Expense History
              </span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center mt-2 mb-4 gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-[#E6EEF5] dark:bg-gray-800 text-[#349DC5] font-semibold text-xs px-4 py-2 rounded-full cursor-pointer outline-none border-none"
            />
            {selectedDate && (
              <button
                onClick={() => setSelectedDate("")}
                className="bg-[#E6EEF5] dark:bg-gray-800 text-[#349DC5] font-semibold text-xs px-4 py-2 rounded-full"
              >
                Show All Times
              </button>
            )}
          </div>

          {!searchQuery && (
            <>
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 bg-white dark:bg-[#1e1e1e] rounded-xl p-4 shadow-sm border border-[#f3f4f6] dark:border-[#333]">
                  <span className="text-[11px] font-bold tracking-wider text-[#6B7280] dark:text-gray-400 block mb-2">
                    TOTAL INCOME
                  </span>
                  <span className="text-lg font-bold text-[#10B981]">
                    {formatCurrency(totalIncome)}
                  </span>
                </div>
                <div className="flex-1 bg-white dark:bg-[#1e1e1e] rounded-xl p-4 shadow-sm border border-[#f3f4f6] dark:border-[#333]">
                  <span className="text-[11px] font-bold tracking-wider text-[#6B7280] dark:text-gray-400 block mb-2">
                    TOTAL EXPENSES
                  </span>
                  <span className="text-lg font-bold text-[#8B5CF6]">
                    {formatCurrency(totalExpenses)}
                  </span>
                </div>
              </div>
              <div className="bg-gradient-to-r from-[#1E3A8A] to-[#3B82F6] rounded-xl p-5 shadow-lg relative overflow-hidden">
                <span className="text-[11px] font-bold tracking-wider text-[#E0E7FF] block mb-2 z-10 relative">
                  NET NGN BALANCE
                </span>
                <span className="text-[28px] font-bold text-white z-10 relative break-words">
                  {formatCurrency(netSurplus)}
                </span>
                <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white opacity-10" />
              </div>
              <div className="bg-white dark:bg-[#1e1e1e] rounded-xl p-5 shadow-sm border border-[#f3f4f6] dark:border-[#333]">
                <span className="text-[11px] font-bold tracking-wider text-[#6B7280] dark:text-gray-400 block mb-4 border-b border-[#f3f4f6] dark:border-[#333] pb-2">
                  FOREIGN CURRENCY BALANCES
                </span>
                <div className="flex flex-row justify-between items-center">
                  <div className="flex flex-col items-center flex-1">
                    <span className="text-sm font-bold text-[#111] dark:text-white mb-0.5">
                      $ {formatForeign(totalUSD)}
                    </span>
                    <span className="text-xs text-gray-500">Dollar</span>
                  </div>
                  <div className="w-[1px] h-8 bg-[#E5E7EB] dark:bg-[#444]" />
                  <div className="flex flex-col items-center flex-1">
                    <span className="text-sm font-bold text-[#111] dark:text-white mb-0.5">
                      £ {formatForeign(totalGBP)}
                    </span>
                    <span className="text-xs text-gray-500">Pound</span>
                  </div>
                  <div className="w-[1px] h-8 bg-[#E5E7EB] dark:bg-[#444]" />
                  <div className="flex flex-col items-center flex-1">
                    <span className="text-sm font-bold text-[#111] dark:text-white mb-0.5">
                      € {formatForeign(totalEUR)}
                    </span>
                    <span className="text-xs text-gray-500">Euro</span>
                  </div>
                </div>
              </div>
            </>
          )}

          <span className="text-[15px] font-bold text-[#111] dark:text-gray-200 mt-2">
            Income Breakdown
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMonthlyData
              .slice(0, incomeExpanded ? undefined : 2)
              .map((month, i) => (
                <div
                  key={`inc-${i}`}
                  className="bg-white dark:bg-[#1e1e1e] rounded-xl p-4 shadow-sm border border-[#f3f4f6] dark:border-[#333]"
                >
                  <div className="flex justify-between items-center border-b border-[#f3f4f6] dark:border-[#333] pb-3 mb-2">
                    <span className="text-sm font-bold text-[#374151] dark:text-gray-300">
                      {month.month}
                    </span>
                    <span className="text-sm font-bold text-[#111] dark:text-white">
                      {formatCurrency(
                        month.income.reduce(
                          (s: number, inc: any) => s + inc.amount,
                          0,
                        ),
                      )}
                    </span>
                  </div>
                  {month.income.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center py-1.5">
                      <span className="text-[13px] text-[#4B5563] dark:text-gray-400 capitalize truncate flex-1">
                        {item.category}
                      </span>
                      <span className="text-[13px] font-semibold text-[#111] dark:text-gray-200 ml-3">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
          </div>

          {filteredMonthlyData.length > 2 && (
            <button
              onClick={() => setIncomeExpanded(!incomeExpanded)}
              className="items-center py-2 self-center"
            >
              <span className="text-[#349DC5] font-black text-xs">
                {incomeExpanded ? "View Less" : "View More"}
              </span>
            </button>
          )}

          <span className="text-[15px] font-bold text-[#111] dark:text-gray-200 mt-2">
            Expense Breakdown
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMonthlyData
              .slice(0, expenseExpanded ? undefined : 2)
              .map((month, i) => (
                <div
                  key={`exp-${i}`}
                  className="bg-white dark:bg-[#1e1e1e] rounded-xl p-4 shadow-sm border border-[#f3f4f6] dark:border-[#333]"
                >
                  <div className="flex justify-between items-center border-b border-[#f3f4f6] dark:border-[#333] pb-3 mb-2">
                    <span className="text-sm font-bold text-[#374151] dark:text-gray-300">
                      {month.month}
                    </span>
                    <span className="text-sm font-bold text-[#111] dark:text-white">
                      {formatCurrency(
                        month.expenses.reduce(
                          (s: number, exp: any) => s + exp.amount,
                          0,
                        ),
                      )}
                    </span>
                  </div>
                  {month.expenses.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center py-1.5">
                      <span className="text-[13px] text-[#4B5563] dark:text-gray-400 capitalize truncate flex-1">
                        {item.category}
                      </span>
                      <span className="text-[13px] font-semibold text-[#111] dark:text-gray-200 ml-3">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
          </div>

          {filteredMonthlyData.length > 2 && (
            <button
              onClick={() => setExpenseExpanded(!expenseExpanded)}
              className="items-center py-2 self-center"
            >
              <span className="text-[#349DC5] font-black text-xs">
                {expenseExpanded ? "View Less" : "View More"}
              </span>
            </button>
          )}

          {!searchQuery && Object.keys(aggregatedIncomeByCategory).length > 0 && (
            <div className="flex flex-col gap-4 mt-2">
              <span className="text-[15px] font-bold text-[#111] dark:text-gray-200">
                Analytics
              </span>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
                <div className="bg-white dark:bg-[#1e1e1e] rounded-xl p-4 pt-5 shadow-sm border border-gray-100 dark:border-[#333]">
                  <span className="text-sm font-bold text-[#111] dark:text-white mb-6 text-center block">
                    Monthly Income Share
                  </span>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={barChartIncomeData}
                        margin={{ top: 20, right: 0, left: -20, bottom: 0 }}
                      >
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10, fill: "#6B7280" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tickFormatter={(val) => `${val}%`}
                          tick={{ fontSize: 10, fill: "#6B7280" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(0,0,0,0.05)" }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white/95 dark:bg-black/95 p-3 rounded-lg shadow border border-gray-200 dark:border-gray-800 text-xs text-black dark:text-white">
                                  <p className="font-bold mb-1">
                                    {data.fullMonth} Income
                                  </p>
                                  <p>Total Amount: {formatCurrency(data.rawAmount)}</p>
                                  <p>Percentage: {data.value.toFixed(1)}%</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={24} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white dark:bg-[#1e1e1e] rounded-xl p-4 pt-5 shadow-sm border border-gray-100 dark:border-[#333]">
                  <span className="text-sm font-bold text-[#111] dark:text-white mb-6 text-center block">
                    Monthly Expense Share
                  </span>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={barChartExpenseData}
                        margin={{ top: 20, right: 0, left: -20, bottom: 0 }}
                      >
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10, fill: "#6B7280" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tickFormatter={(val) => `${val}%`}
                          tick={{ fontSize: 10, fill: "#6B7280" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(0,0,0,0.05)" }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white/95 dark:bg-black/95 p-3 rounded-lg shadow border border-gray-200 dark:border-gray-800 text-xs text-black dark:text-white">
                                  <p className="font-bold mb-1">
                                    {data.fullMonth} Expenses
                                  </p>
                                  <p>Total Amount: {formatCurrency(data.rawAmount)}</p>
                                  <p>Percentage: {data.value.toFixed(1)}%</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={24} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white dark:bg-[#1e1e1e] rounded-xl p-4 pt-5 shadow-sm border border-gray-100 dark:border-[#333] flex flex-col md:flex-row items-center">
                  <div className="flex-1 w-full md:w-1/2 flex flex-col items-center">
                    <span className="text-sm font-bold text-[#111] dark:text-white mb-2 text-center block">
                      Income Distribution
                    </span>
                    <div className="h-56 w-full max-w-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieIncomeData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={85}
                            paddingAngle={2}
                            dataKey="value"
                            stroke="none"
                          >
                            {pieIncomeData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-white/95 dark:bg-black/95 p-3 rounded-lg shadow border border-gray-200 dark:border-gray-800 text-xs text-black dark:text-white z-50">
                                    <p className="font-bold mb-1">{data.name}</p>
                                    <p>Amount: {formatCurrency(data.value)}</p>
                                    <p>Percentage: {data.percentage}%</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="flex-1 w-full md:w-1/2 flex flex-col justify-center px-4 md:px-8 mt-4 md:mt-0 max-h-56 overflow-y-auto">
                    {pieIncomeData.map((item, idx) => (
                      <div
                        key={`leg-${idx}`}
                        className="flex flex-row items-center mb-2 last:mb-0"
                      >
                        <div
                          className="w-3 h-3 rounded-full mr-2 min-w-[12px]"
                          style={{ backgroundColor: item.fill }}
                        />
                        <span className="text-[11px] text-gray-600 dark:text-gray-300 flex-1 truncate">
                          {item.name}
                        </span>
                        <span className="text-[11px] font-bold text-gray-800 dark:text-gray-100 ml-2">
                          {item.percentage}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-[#1e1e1e] rounded-xl p-4 pt-5 shadow-sm border border-gray-100 dark:border-[#333] flex flex-col md:flex-row items-center">
                  <div className="flex-1 w-full md:w-1/2 flex flex-col items-center">
                    <span className="text-sm font-bold text-[#111] dark:text-white mb-2 text-center block">
                      Expense Distribution
                    </span>
                    <div className="h-56 w-full max-w-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieExpenseData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={85}
                            paddingAngle={2}
                            dataKey="value"
                            stroke="none"
                          >
                            {pieExpenseData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-white/95 dark:bg-black/95 p-3 rounded-lg shadow border border-gray-200 dark:border-gray-800 text-xs text-black dark:text-white z-50">
                                    <p className="font-bold mb-1">{data.name}</p>
                                    <p>Amount: {formatCurrency(data.value)}</p>
                                    <p>Percentage: {data.percentage}%</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="flex-1 w-full md:w-1/2 flex flex-col justify-center px-4 md:px-8 mt-4 md:mt-0 max-h-56 overflow-y-auto">
                    {pieExpenseData.map((item, idx) => (
                      <div
                        key={`leg-${idx}`}
                        className="flex flex-row items-center mb-2 last:mb-0"
                      >
                        <div
                          className="w-3 h-3 rounded-full mr-2 min-w-[12px]"
                          style={{ backgroundColor: item.fill }}
                        />
                        <span className="text-[11px] text-gray-600 dark:text-gray-300 flex-1 truncate">
                          {item.name}
                        </span>
                        <span className="text-[11px] font-bold text-gray-800 dark:text-gray-100 ml-2">
                          {item.percentage}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
