import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import Lottie from "lottie-react";
import {
  ArrowLeft,
  Search,
  X,
  MoreHorizontal,
  Plus,
  Trash2,
  Eye,
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react";
import {
  getExpenses,
  createExpense,
  deleteExpense,
  type ExpenseRecord,
} from "../../api/adminFinance";
import AsyncStorage from "../../utils/AsyncStorage";
// @ts-ignore
import emptyStateAnim from "../../assets/lottie/Empty State.json";

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface User {
  _id: string;
  firstName: string;
  surname: string;
  middleName?: string;
  profile?: { avatar?: string };
  roles?: any[];
  activeRole?: string;
}

const availableIcons = ["💰", "🙏", "🎵", "🎁", "🏪", "💼", "📈", "💎"];
const DEFAULT_CATEGORIES: Category[] = [
  { id: "1", name: "Maintenance", icon: "💎" },
  { id: "2", name: "Logistics", icon: "💼" },
  { id: "3", name: "Welfare", icon: "🎁" },
  { id: "4", name: "Admin", icon: "🏪" },
];

const formatNumber = (value: string) => {
  let numericValue = value.replace(/[^0-9.]/g, "");
  const dotCount = (numericValue.match(/\./g) || []).length;
  if (dotCount > 1) {
    const parts = numericValue.split(".");
    numericValue = parts[0] + "." + parts.slice(1).join("");
  }
  if (!numericValue) return "";
  const parts = numericValue.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
};

const parseNumber = (value: string) => value.replace(/,/g, "");

export default function ExpensesAdmin() {
  const location = useLocation();
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("Year To Date");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Add expense modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const [cash, setCash] = useState("");
  const [bank, setBank] = useState("");
  const [cheque, setCheque] = useState("");
  const [foreign1, setForeign1] = useState("");
  const [foreign2, setForeign2] = useState("");
  const [foreign3, setForeign3] = useState("");
  const [amount, setAmount] = useState("");
  const [totalDollar, setTotalDollar] = useState("0");
  const [totalPound, setTotalPound] = useState("0");
  const [totalEuro, setTotalEuro] = useState("0");
  const [description, setDescription] = useState("");

  // Category creation
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState(availableIcons[0]);

  // View / Delete / Menu modal
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [selectedRecordForMenu, setSelectedRecordForMenu] =
    useState<ExpenseRecord | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ExpenseRecord | null>(
    null,
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<ExpenseRecord | null>(
    null,
  );

  const getCurrentMinistry = useCallback((userObj?: User | null) => {
    const paramMinistry = location.state?.ministry;
    if (paramMinistry) return paramMinistry;
    const u = userObj || currentUser;
    if (!u) return "Main Church";
    const isSuperAdmin =
      u.roles?.some((r: any) => r.role === "SuperAdmin") ||
      u.activeRole === "SuperAdmin";
    if (isSuperAdmin) return "Main Church";
    const ministryRole = u.roles?.find(
      (r: any) => r.role === "MinistryAdmin",
    );
    return ministryRole?.ministryName || "Youth and Singles Church";
  }, [currentUser, location.state?.ministry]);

  const canEditFinance = () => {
    if (!currentUser) return false;
    const ministry = getCurrentMinistry();
    const isFinancialSecretary = currentUser.roles?.some(
      (r: any) => r.role === "FinancialSecretary",
    );
    if (ministry === "Main Church") return !!isFinancialSecretary;
    const isMinistryAdmin = currentUser.roles?.some(
      (r: any) => r.role === "MinistryAdmin" && r.ministryName === ministry,
    );
    return !!(isFinancialSecretary || isMinistryAdmin);
  };

  const loadAll = useCallback(async () => {
    try {
      setIsLoading(true);
      let u = currentUser;
      if (!u) {
        const userRaw = await AsyncStorage.getItem("user");
        if (userRaw) {
          u = JSON.parse(userRaw);
          setCurrentUser(u);
        }
      }
      const ministry = getCurrentMinistry(u);
      const data = await getExpenses(ministry);
      setExpenses(data);
      // Load categories from storage
      const storageKey = `@expense_categories_${ministry}`;
      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) {
        setCategories(JSON.parse(stored));
      } else {
        setCategories(DEFAULT_CATEGORIES);
      }
    } catch (e) {
      console.log("load error", e);
    } finally {
      setIsLoading(false);
    }
  }, [getCurrentMinistry]);

  useEffect(() => {
    loadAll();
  }, [loadAll, location.state?.ministry]);

  // Auto-calc totals
  useEffect(() => {
    const nTotal =
      (parseFloat(parseNumber(cash)) || 0) +
      (parseFloat(parseNumber(bank)) || 0) +
      (parseFloat(parseNumber(cheque)) || 0);
    setAmount(nTotal > 0 ? formatNumber(nTotal.toString()) : "");
    setTotalDollar(formatNumber(parseNumber(foreign1)));
    setTotalPound(formatNumber(parseNumber(foreign2)));
    setTotalEuro(formatNumber(parseNumber(foreign3)));
  }, [cash, bank, cheque, foreign1, foreign2, foreign3]);

  const formatCurrency = (value: number) => value.toLocaleString("en-NG");

  const formatAbbreviated = (num: number) => {
    if (num >= 1_000_000_000_000)
      return (num / 1_000_000_000_000).toFixed(1).replace(/\.0$/, "") + "t";
    if (num >= 1_000_000_000)
      return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "b";
    if (num >= 1_000_000)
      return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "m";
    if (num >= 1_000)
      return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
    return num.toString();
  };

  const formatDate = (ds: string) =>
    new Date(ds).toLocaleDateString("en-NG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const getUserFullName = (user?: any) => {
    if (!user || typeof user === "string") return "Admin";
    return `${user.firstName || ""} ${user.middleName ? user.middleName + " " : ""}${user.surname || ""}`.trim();
  };

  const getUserInitial = (user?: any) => {
    if (!user || typeof user === "string") return "A";
    return (user.firstName || "A").charAt(0).toUpperCase();
  };

  const getFiltered = () => {
    let filtered = [...expenses];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    switch (filterPeriod) {
      case "Yesterday": {
        const y = new Date(today);
        y.setDate(y.getDate() - 1);
        filtered = filtered.filter((e) => {
          const d = new Date(e.date);
          return d >= y && d < today;
        });
        break;
      }
      case "Last 7 Days": {
        const w = new Date(today);
        w.setDate(w.getDate() - 7);
        filtered = filtered.filter((e) => new Date(e.date) >= w);
        break;
      }
      case "Last Month": {
        const m = new Date(today);
        m.setMonth(m.getMonth() - 1);
        filtered = filtered.filter((e) => new Date(e.date) >= m);
        break;
      }
      case "Last Year": {
        const yr = new Date(today);
        yr.setFullYear(yr.getFullYear() - 1);
        filtered = filtered.filter((e) => new Date(e.date) >= yr);
        break;
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (e) =>
          (e.category?.name || "").toLowerCase().includes(q) ||
          formatCurrency(parseFloat(e.amount || "0"))
            .toLowerCase()
            .includes(q) ||
          formatDate(e.date).toLowerCase().includes(q) ||
          getUserFullName(e.addedBy).toLowerCase().includes(q),
      );
    }
    return filtered;
  };

  const handleAddExpense = async () => {
    if (!canEditFinance()) {
      toast.error("You do not have permission to add expenses.");
      return;
    }
    if (!selectedCategory || !amount.trim() || !description.trim()) {
      toast.error(
        "Please fill all fields (Category, Amount, and Description) before saving.",
      );
      return;
    }
    try {
      const newExpense: Omit<ExpenseRecord, "_id"> = {
        id: Date.now().toString(),
        category: selectedCategory,
        date: selectedDate,
        ministry: getCurrentMinistry(),
        amount: parseNumber(amount),
        cash: parseNumber(cash),
        bank: parseNumber(bank),
        cheque: parseNumber(cheque),
        foreign1: parseNumber(foreign1),
        foreign2: parseNumber(foreign2),
        foreign3: parseNumber(foreign3),
        totalDollar: parseNumber(totalDollar),
        totalPound: parseNumber(totalPound),
        totalEuro: parseNumber(totalEuro),
        description,
      };
      const created = await createExpense(newExpense);
      setExpenses((prev) => [...prev, created]);
      resetAddForm();
      setShowAddModal(false);
      toast.success("Expense added successfully!");
    } catch (error) {
      toast.error("Failed to save expense. Please try again.");
      console.error(error);
    }
  };

  const resetAddForm = () => {
    setSelectedCategory(null);
    setAmount("");
    setCash("");
    setBank("");
    setCheque("");
    setForeign1("");
    setForeign2("");
    setForeign3("");
    setTotalDollar("0");
    setTotalPound("0");
    setTotalEuro("0");
    setDescription("");
    setSelectedDate(new Date().toISOString().split("T")[0]);
  };

  const handleCreateCategory = async () => {
    if (!canEditFinance()) return;
    if (!newCategoryName.trim()) return;
    if (
      categories.some(
        (c) => c.name.toLowerCase() === newCategoryName.trim().toLowerCase(),
      )
    ) {
      toast.error("A category with this name already exists.");
      return;
    }
    const newCat: Category = {
      id: Date.now().toString(),
      name: newCategoryName.trim(),
      icon: selectedIcon,
    };
    const updated = [...categories, newCat];
    setCategories(updated);
    try {
      await AsyncStorage.setItem(
        `@expense_categories_${getCurrentMinistry()}`,
        JSON.stringify(updated),
      );
    } catch { }
    setNewCategoryName("");
    setSelectedIcon(availableIcons[0]);
    setShowCreateCategoryModal(false);
    toast.success("Category created!");
  };

  const handleDeleteExpense = async (record: ExpenseRecord) => {
    if (!canEditFinance()) {
      toast.error("No permission to delete.");
      return;
    }
    try {
      await deleteExpense(record._id || record.id);
      setExpenses((prev) =>
        prev.filter((e) => (e._id || e.id) !== (record._id || record.id)),
      );
      setShowDeleteConfirm(false);
      setRecordToDelete(null);
      setShowMenuModal(false);
      toast.success("Expense deleted successfully.");
    } catch {
      toast.error("Failed to delete expense.");
    }
  };

  const filtered = getFiltered();
  return (
    <div className="w-full pb-24" onClick={() => setShowFilterDropdown(false)}>
      {/* Header */}
      <div className="flex items-center justify-between h-20 px-4 sm:px-8 mb-4 sticky top-0 bg-white dark:bg-[#1a1c1e] z-10 shadow-sm border-b border-gray-100 dark:border-white/5">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
          <ArrowLeft size={24} className="text-[#00204a] dark:text-white" />
        </button>
        <h1 className="text-lg font-black text-[#00204a] dark:text-white flex-1 text-center uppercase tracking-tight">Expense History</h1>
        <div className="w-10" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col gap-6 pt-4">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <div key="loading" className="flex flex-col items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-[#349DC5] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold text-gray-400 uppercase mt-4 animate-pulse">Syncing Database...</p>
            </div>
          ) : (
            <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-6">
              {/* Add Button */}
              {canEditFinance() && (
                <button onClick={() => setShowAddModal(true)} className="w-full bg-[#349DC5] rounded-xl py-3 flex items-center justify-center gap-2 shadow-md hover:bg-opacity-90 transition-opacity">
                  <Plus size={18} color="white" />
                  <span className="text-white font-bold text-sm">Add New Expense</span>
                </button>
              )}

              {/* Search */}
              <div className="flex items-center bg-white dark:bg-[#1e1e1e] rounded-[10px] px-3.5 py-2.5 border border-[#E6EEF5] dark:border-[#333]">
                <Search size={18} className="text-gray-400 mr-2" />
                <input
                  type="text"
                  className="flex-1 bg-transparent text-sm text-[#111] dark:text-white outline-none"
                  placeholder="Search by date, category, amount, or user..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')}>
                    <X size={14} className="text-gray-400" />
                  </button>
                )}
              </div>

              {/* Filter Dropdown */}
              <div className="relative" onClick={e => e.stopPropagation()}>
                <button onClick={() => setShowFilterDropdown(!showFilterDropdown)} className="w-full flex items-center justify-between bg-white dark:bg-[#1e1e1e] rounded-xl px-4 py-3 border border-[#E6EEF5] dark:border-[#333] shadow-sm">
                  <span className="text-sm font-semibold text-[#111] dark:text-white">{filterPeriod}</span>
                  {showFilterDropdown ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                </button>
                {showFilterDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1e1e1e] rounded-xl border border-[#E6EEF5] dark:border-[#333] shadow z-20 overflow-hidden">
                    {['Year To Date', 'Yesterday', 'Last 7 Days', 'Last Month', 'Last Year'].map(period => (
                      <button
                        key={period}
                        onClick={() => { setFilterPeriod(period); setShowFilterDropdown(false); }}
                        className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${filterPeriod === period ? 'font-bold text-[#349DC5]' : 'text-[#111] dark:text-white'}`}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Records List */}
              {filtered.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-20 bg-white/50 dark:bg-black/20 rounded-3xl mt-4"
                >
                  <div className="w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-900/10 flex items-center justify-center mb-4">
                    <FileText size={40} className="text-[#349DC5]" />
                  </div>
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No expense records yet</p>
                  <p className="text-[10px] text-gray-400 mt-2">Initialize your registration today</p>
                </motion.div>
              ) : (
                filtered.map((record, index) => (
                  <motion.div
                    key={record._id?.toString() || record.id?.toString() || `exp-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white dark:bg-[#1e1e1e] rounded-[14px] p-4 shadow-sm border border-[#f3f4f6] dark:border-[#333] relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#349DC5] rounded-l-[14px]" />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-11 h-11 rounded-full bg-blue-50 dark:bg-blue-900/10 flex items-center justify-center text-xl shrink-0">
                          {record.category?.icon || "💸"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#111] dark:text-white truncate">{record.category?.name || "Unknown"}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{formatDate(record.date)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-sm font-bold text-[#349DC5]">₦{formatAbbreviated(parseFloat(record.amount || '0'))}</span>
                        <button onClick={() => { setSelectedRecordForMenu(record); setShowMenuModal(true); }} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 transition-colors">
                          <MoreHorizontal size={16} className="text-gray-500" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-[#333]">
                      <div className="w-6 h-6 rounded-full bg-[#349DC5] flex items-center justify-center shrink-0">
                        <span className="text-white text-[10px] font-bold">{getUserInitial(record.addedBy)}</span>
                      </div>
                      <span className="text-xs text-gray-500">Added by <span className="font-semibold text-[#111] dark:text-gray-300">{getUserFullName(record.addedBy)}</span></span>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {/* Add Expense Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowAddModal(false)}>
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              className="bg-white dark:bg-[#1e1e1e] w-full sm:max-w-lg rounded-t-[32px] sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-white/5">
                <h2 className="text-base font-black text-[#00204a] dark:text-white uppercase tracking-widest">Add Expense</h2>
                <button onClick={() => setShowAddModal(false)} className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 hover:text-[#349DC5] transition-colors"><X size={20} /></button>
              </div>
              <div className="overflow-y-auto flex-1 px-6 py-6 space-y-6">
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 opacity-60">Date of Expense</label>
                  <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full border border-gray-100 dark:border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-[#00204a] dark:text-white bg-gray-50 dark:bg-white/5 outline-none focus:ring-2 focus:ring-[#349DC5]/20 transition-all" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 opacity-60">Expense Category</label>
                  <button onClick={() => setShowCategoryModal(true)} className="w-full flex items-center justify-between border border-gray-100 dark:border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-[#00204a] dark:text-white bg-gray-50 dark:bg-white/5 outline-none">
                    <span className={selectedCategory ? '' : 'text-gray-400 opacity-50'}>
                      {selectedCategory ? `${selectedCategory.icon} ${selectedCategory.name}` : 'Select category'}
                    </span>
                    <ChevronDown size={18} className="text-gray-300" />
                  </button>
                </div>

                <div className="bg-gray-50 dark:bg-white/5 rounded-3xl p-6 border border-gray-100 dark:border-white/5">
                  <p className="text-[9px] font-black text-[#349DC5] uppercase tracking-widest mb-4">Breakdown</p>
                  <div className="space-y-4">
                    {[{ label: 'Cash (NGN)', val: cash, set: setCash }, { label: 'Bank (NGN)', val: bank, set: setBank }, { label: 'Cheque (NGN)', val: cheque, set: setCheque }].map(({ label, val, set }) => (
                      <div key={label}>
                        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 opacity-60">{label}</label>
                        <div className="relative">
                          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₦</span>
                          <input type="text" placeholder="0.00" value={val} onChange={e => set(formatNumber(e.target.value))} className="w-full border border-transparent rounded-2xl pl-10 pr-5 py-4 text-sm font-bold text-[#00204a] dark:text-white bg-white dark:bg-white/5 outline-none focus:ring-2 focus:ring-[#349DC5]/20 transition-all" />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-100 dark:border-white/5">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4 opacity-60">Foreign Currency (Optional)</p>
                    <div className="grid grid-cols-3 gap-3">
                      {[{ sym: '$', val: foreign1, set: setForeign1 }, { sym: '£', val: foreign2, set: setForeign2 }, { sym: '€', val: foreign3, set: setForeign3 }].map(({ sym, val, set }) => (
                        <div key={sym} className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">{sym}</span>
                          <input type="text" placeholder="0" value={val} onChange={e => set(formatNumber(e.target.value))} className="w-full border border-transparent rounded-xl pl-8 pr-3 py-3 text-xs font-bold text-[#00204a] dark:text-white bg-white dark:bg-white/5 outline-none focus:ring-2 focus:ring-[#349DC5]/20" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-[#349DC5]/5 rounded-2xl p-5 border border-[#349DC5]/10">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 opacity-60">Total (Auto-calculated)</p>
                  <div className="flex items-end justify-between">
                    <h3 className="text-2xl font-black text-[#00204a] dark:text-white leading-none">₦{amount || '0'}</h3>
                    <div className="flex gap-3 text-[10px] font-bold text-[#349DC5]">
                      <span>${totalDollar || '0'}</span><span>£{totalPound || '0'}</span><span>€{totalEuro || '0'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 opacity-60">Description / Purpose</label>
                  <textarea rows={3} placeholder="Describe the purpose of this expense..." value={description} onChange={e => setDescription(e.target.value)} className="w-full border border-gray-100 dark:border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-[#00204a] dark:text-white bg-gray-50 dark:bg-white/5 outline-none focus:ring-2 focus:ring-[#349DC5]/20 transition-all resize-none" />
                </div>

                <div className="flex gap-4 pb-4">
                  <button onClick={() => setShowAddModal(false)} className="flex-1 py-4 rounded-2xl border border-gray-200 dark:border-white/10 text-xs font-black text-gray-400 uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">Cancel</button>
                  <button onClick={handleAddExpense} className="flex-2 py-4 rounded-2xl bg-[#349DC5] text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-[#349DC5]/20 active:scale-95 transition-all">Save Expense</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Category Selection Modal */}
        {showCategoryModal && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-end justify-center" onClick={() => setShowCategoryModal(false)}>
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white dark:bg-[#1e1e1e] w-full sm:max-w-lg rounded-t-[32px] max-h-[80vh] flex flex-col shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                <h2 className="text-base font-black text-[#00204a] dark:text-white uppercase tracking-widest">Select Category</h2>
                <button onClick={() => setShowCategoryModal(false)} className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400"><X size={20} /></button>
              </div>
              <div className="overflow-y-auto flex-1 p-4 grid grid-cols-2 gap-3">
                {categories.map(item => (
                  <button key={item.id} onClick={() => { setSelectedCategory(item); setShowCategoryModal(false); }} className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-gray-50 dark:bg-white/5 hover:bg-[#349DC5]/10 border border-transparent hover:border-[#349DC5]/20 transition-all group">
                    <span className="text-3xl group-hover:scale-110 transition-transform">{item.icon}</span>
                    <span className="text-[10px] font-black text-[#00204a] dark:text-white uppercase tracking-widest">{item.name}</span>
                  </button>
                ))}
                {canEditFinance() && (
                  <button onClick={() => { setShowCategoryModal(false); setShowCreateCategoryModal(true); }} className="flex flex-col items-center justify-center gap-3 p-6 rounded-3xl border-2 border-dashed border-gray-100 dark:border-white/5 text-gray-400 hover:border-[#349DC5] hover:text-[#349DC5] transition-all">
                    <Plus size={24} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-center">New Sector</span>
                  </button>
                )}
              </div>
              <div className="p-6">
                <button onClick={() => setShowCategoryModal(false)} className="w-full py-4 rounded-2xl bg-gray-50 dark:bg-white/5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Cancel Selection</button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Create Category Modal */}
        {showCreateCategoryModal && (
          <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4" onClick={() => setShowCreateCategoryModal(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#1e1e1e] w-full max-w-sm rounded-[32px] p-8 shadow-2xl border border-white/10"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-xl font-black text-[#00204a] dark:text-white uppercase tracking-widest mb-6">Agent Configuration</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 opacity-60">Sector Codename</label>
                  <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="e.g. MAINTENANCE" className="w-full border border-gray-100 dark:border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-[#00204a] dark:text-white bg-gray-50 dark:bg-white/5 outline-none focus:ring-2 focus:ring-[#349DC5]/20" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3 opacity-60">Signal Icon</label>
                  <div className="flex flex-wrap gap-3">
                    {availableIcons.map(icon => (
                      <button key={icon} onClick={() => setSelectedIcon(icon)} className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl transition-all ${selectedIcon === icon ? 'bg-[#349DC5] text-white shadow-lg shadow-[#349DC5]/30' : 'bg-gray-50 dark:bg-white/5 text-gray-400 hover:bg-gray-100'}`}>{icon}</button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => setShowCreateCategoryModal(false)} className="flex-1 py-4 rounded-xl text-[10px] font-black text-gray-400 uppercase tracking-widest">Back</button>
                  <button onClick={handleCreateCategory} className="flex-2 py-4 rounded-xl bg-[#349DC5] text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#349DC5]/20">Establish Sector</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Action Menu Modal */}
        {showMenuModal && selectedRecordForMenu && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowMenuModal(false)}>
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              className="bg-white dark:bg-[#1e1e1e] w-full sm:max-w-sm rounded-t-[32px] sm:rounded-3xl p-6 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-100 dark:border-white/5">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-2xl shadow-inner">
                  {selectedRecordForMenu.category.icon}
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 opacity-60">Expense Record</p>
                  <p className="text-lg font-black text-[#00204a] dark:text-white uppercase leading-none">{selectedRecordForMenu.category.name}</p>
                  <p className="text-sm font-bold text-rose-500 mt-2">₦{formatCurrency(parseFloat(selectedRecordForMenu.amount || '0'))}</p>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => { setSelectedRecord(selectedRecordForMenu); setShowViewModal(true); setShowMenuModal(false); }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-white/5 hover:bg-[#349DC5]/10 group transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/10 flex items-center justify-center text-[#349DC5] shadow-sm group-hover:scale-110 transition-transform"><Eye size={20} /></div>
                  <span className="text-xs font-black text-[#00204a] dark:text-white uppercase tracking-widest">View Details</span>
                </button>

                {canEditFinance() && (
                  <button
                    onClick={() => { setRecordToDelete(selectedRecordForMenu); setShowDeleteConfirm(true); }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-900/10 hover:bg-rose-50 text-rose-500 group transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/10 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform"><Trash2 size={20} /></div>
                    <span className="text-xs font-black uppercase tracking-widest">Delete</span>
                  </button>
                )}
              </div>

              <button onClick={() => setShowMenuModal(false)} className="w-full mt-6 py-4 rounded-2xl text-[10px] font-black text-gray-400 uppercase tracking-widest">Close</button>
            </motion.div>
          </div>
        )}

        {/* View Detail Modal */}
        {showViewModal && selectedRecord && (
          <div className="fixed inset-0 bg-black/60 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowViewModal(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#1e1e1e] w-full sm:max-w-lg rounded-t-[32px] sm:rounded-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-white/10"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 sticky top-0 z-10 backdrop-blur-md">
                <h2 className="text-base font-black text-[#00204a] dark:text-white uppercase tracking-widest leading-none">Expense Record</h2>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="w-10 h-10 rounded-full bg-white dark:bg-white/10 flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
                ><X size={20} className="text-[#349DC5]" /></button>
              </div>
              <div className="px-6 py-6 overflow-y-auto space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    ['Category', `${selectedRecord.category?.icon || "💸"} ${selectedRecord.category?.name || "Expense"}`],
                    ['Date', formatDate(selectedRecord.date)],
                    ['Total Amount (NGN)', `₦${formatCurrency(parseFloat(selectedRecord.amount || '0'))}`],
                    ['Added By', getUserFullName(selectedRecord.addedBy)],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-gray-50/50 dark:bg-white/5 p-5 rounded-2xl border border-gray-100/50 dark:border-white/5 transition-all hover:border-[#349DC5]/30">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 opacity-60 font-inter">{label}</p>
                      <p className="text-sm font-bold text-[#00204a] dark:text-white truncate tracking-tight">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-rose-50/30 dark:bg-rose-900/10 p-5 rounded-2xl border border-rose-100 dark:border-rose-900/20 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#349DC5]/5 rounded-full -mr-12 -mt-12" />
                  <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                    <span className="w-4 h-px bg-rose-500/30" />
                    Description
                  </p>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300 leading-relaxed">
                    {selectedRecord.description || "No description provided for this record."}
                  </p>
                </div>
              </div>
              <div className="p-6 pt-2 bg-white dark:bg-[#1e1e1e]">
                <button onClick={() => setShowViewModal(false)} className="w-full py-4 rounded-2xl bg-[#00204a] dark:bg-white/10 text-white font-bold text-xs uppercase tracking-widest active:scale-95 transition-all">Close</button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && recordToDelete && (
          <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#1e1e1e] rounded-[32px] p-8 w-full max-w-sm shadow-2xl border border-red-50 dark:border-red-900/20"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-6 shadow-sm border-4 border-white dark:border-red-900/10">
                <Trash2 size={24} className="text-[#EF4444]" />
              </div>
              <h3 className="text-xl font-bold text-[#00204a] dark:text-white text-center mb-3 tracking-tight">Delete Record?</h3>
              <p className="text-sm text-gray-400 text-center mb-8 leading-relaxed">This will permanently remove this expense record. This action cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowDeleteConfirm(false); setRecordToDelete(null); }}
                  className="flex-1 py-4 rounded-2xl border border-gray-200 dark:border-white/10 text-xs font-black text-gray-400 uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >Cancel</button>
                <button onClick={() => handleDeleteExpense(recordToDelete!)} className="flex-1 py-4 rounded-2xl bg-[#EF4444] text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95 transition-all">Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
