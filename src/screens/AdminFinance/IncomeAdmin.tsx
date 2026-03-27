import { useState, useEffect, useCallback, useMemo } from "react";
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
  getIncomes,
  createIncome,
  updateIncome,
  deleteIncome,
  type IncomeRecord,
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

interface Deposit {
  accountDetails: string;
  bankName: string;
  referenceNumber: string;
  depositorName: string;
  depositDate: string;
  notes: string;
}

const availableIcons = ["💰", "🙏", "🎵", "🎁", "🏪", "💼", "📈", "💎"];
const DEFAULT_CATEGORIES: Category[] = [
  { id: "1", name: "Sunday Tithes & Offering", icon: "🙏" },
  { id: "2", name: "Wordshop Offering", icon: "🏪" },
  { id: "3", name: "NSPPD Offering", icon: "💰" },
  { id: "4", name: "Special Donations", icon: "🎁" },
];

const formatNumber = (value: string) => {
  let v = value.replace(/[^0-9.]/g, "");
  const dots = (v.match(/\./g) || []).length;
  if (dots > 1) {
    const p = v.split(".");
    v = p[0] + "." + p.slice(1).join("");
  }
  if (!v) return "";
  const parts = v.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
};

const parseNumber = (value: string) => value.replace(/,/g, "");

const NairaInput = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <div>
    <label className="block text-xs font-bold text-gray-500 mb-1">
      {label}
    </label>
    <div className="flex items-center border border-[#E6EEF5] dark:border-[#333] rounded-xl overflow-hidden bg-white dark:bg-[#2a2a2a]">
      <span className="px-3 text-sm font-bold text-gray-500">₦</span>
      <input
        type="text"
        inputMode="numeric"
        placeholder="0.00"
        value={value}
        onChange={(e) => onChange(formatNumber(e.target.value))}
        className="flex-1 py-3 pr-3 text-sm text-[#111] dark:text-white bg-transparent outline-none"
      />
    </div>
  </div>
);

const FxInput = ({
  sym,
  value,
  onChange,
}: {
  sym: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <div className="flex items-center border border-[#E6EEF5] dark:border-[#333] rounded-xl overflow-hidden bg-white dark:bg-[#2a2a2a]">
    <span className="px-3 text-sm font-bold text-gray-500">{sym}</span>
    <input
      type="text"
      inputMode="numeric"
      placeholder="0.00"
      value={value}
      onChange={(e) => onChange(formatNumber(e.target.value))}
      className="flex-1 py-3 pr-3 text-sm text-[#111] dark:text-white bg-transparent outline-none"
    />
  </div>
);

export default function IncomeAdmin() {
  const location = useLocation();
  const navigate = useNavigate();
  const [incomes, setIncomes] = useState<IncomeRecord[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("Year To Date");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Add income modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  // Regular income fields
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];
    const s = searchQuery.toLowerCase();
    const common = ["Tithe", "General Offering", "First Fruit", "Seeds", "Projects", "Church Operations", "Unit Seed", "Welfare"];
    const fromData = Array.from(new Set(incomes.map(f => (f.category?.name || f.donorName) as string).filter(Boolean)));
    const all: string[] = Array.from(new Set([...common, ...fromData]));
    return all.filter(item => item && item.toLowerCase().includes(s)).slice(0, 5);
  }, [searchQuery, incomes]);
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [currency, setCurrency] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [donorName, setDonorName] = useState("");
  const [department, setDepartment] = useState("");
  const [eventName, setEventName] = useState("");

  // Sunday Tithes & Offering fields
  const [titheCash, setTitheCash] = useState("");
  const [titheBank, setTitheBank] = useState("");
  const [titheCheque, setTitheCheque] = useState("");
  const [titheForeign1, setTitheForeign1] = useState("");
  const [titheForeign2, setTitheForeign2] = useState("");
  const [titheForeign3, setTitheForeign3] = useState("");
  const [offeringCash, setOfferingCash] = useState("");
  const [offeringBank, setOfferingBank] = useState("");
  const [offeringCheque, setOfferingCheque] = useState("");
  const [offeringForeign1, setOfferingForeign1] = useState("");
  const [offeringForeign2, setOfferingForeign2] = useState("");
  const [offeringForeign3, setOfferingForeign3] = useState("");

  // Category creation
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState(availableIcons[0]);

  // View/Delete/Menu
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [selectedRecordForMenu, setSelectedRecordForMenu] =
    useState<IncomeRecord | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<IncomeRecord | null>(
    null,
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<IncomeRecord | null>(
    null,
  );

  // Deposit modal
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [selectedRecordForDeposit, setSelectedRecordForDeposit] =
    useState<IncomeRecord | null>(null);
  const [depositAccountNumber, setDepositAccountNumber] = useState("");
  const [depositAccountName, setDepositAccountName] = useState("");
  const [depositBankName, setDepositBankName] = useState("");
  const [depositReferenceNumber, setDepositReferenceNumber] = useState("");
  const [depositDepositorName, setDepositDepositorName] = useState("");
  const [depositDate, setDepositDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [depositNotes, setDepositNotes] = useState("");
  const [banks, setBanks] = useState<{ name: string; code: string }[]>([]);
  const [filteredBanks, setFilteredBanks] = useState<
    { name: string; code: string }[]
  >([]);
  const [showBankDropdown, setShowBankDropdown] = useState(false);

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

  const fetchBanks = useCallback(async () => {
    const fallback = [
      { name: "Access Bank", code: "044" },
      { name: "Fidelity Bank Nigeria", code: "070" },
      { name: "First Bank of Nigeria", code: "011" },
      { name: "Guaranty Trust Bank", code: "058" },
      { name: "United Bank for Africa", code: "033" },
      { name: "Zenith Bank", code: "057" },
      { name: "Stanbic IBTC Bank", code: "221" },
      { name: "Wema Bank", code: "035" },
      { name: "Sterling Bank", code: "232" },
      { name: "Union Bank of Nigeria", code: "032" },
    ];
    try {
      const resp = await fetch("https://api.paystack.co/bank?country=nigeria");
      const data = await resp.json();
      if (data.status) {
        setBanks(data.data);
        setFilteredBanks(data.data);
      } else {
        setBanks(fallback);
        setFilteredBanks(fallback);
      }
    } catch {
      setBanks(fallback);
      setFilteredBanks(fallback);
    }
  }, []);

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
      const data = await getIncomes(getCurrentMinistry(u));
      setIncomes(data || []);
    } catch (e) {
      console.log("load error", e);
    } finally {
      setIsLoading(false);
    }
  }, [getCurrentMinistry, currentUser]);

  useEffect(() => {
    fetchBanks();
  }, [fetchBanks]);

  useEffect(() => {
    loadAll();
  }, [loadAll, location.state?.ministry]);

  const handleBankSearch = (query: string) => {
    setDepositBankName(query);
    setFilteredBanks(
      banks.filter((b) => b.name.toLowerCase().includes(query.toLowerCase())),
    );
    setShowBankDropdown(true);
  };

  const isTithe = selectedCategory?.name === "Sunday Tithes & Offering";

  // Auto-calculate totals
  useEffect(() => {
    if (isTithe) {
      const nTotal = [
        titheCash,
        titheBank,
        titheCheque,
        offeringCash,
        offeringBank,
        offeringCheque,
      ].reduce((s, v) => s + (parseFloat(parseNumber(v)) || 0), 0);
      setTotalAmount(nTotal > 0 ? formatNumber(nTotal.toString()) : "");
      const dTotal =
        (parseFloat(parseNumber(titheForeign1)) || 0) +
        (parseFloat(parseNumber(offeringForeign1)) || 0);
      setDonorName(dTotal > 0 ? formatNumber(dTotal.toString()) : "");
      const pTotal =
        (parseFloat(parseNumber(titheForeign2)) || 0) +
        (parseFloat(parseNumber(offeringForeign2)) || 0);
      setDepartment(pTotal > 0 ? formatNumber(pTotal.toString()) : "");
      const eTotal =
        (parseFloat(parseNumber(titheForeign3)) || 0) +
        (parseFloat(parseNumber(offeringForeign3)) || 0);
      setEventName(eTotal > 0 ? formatNumber(eTotal.toString()) : "");
    } else {
      const nTotal =
        (parseFloat(parseNumber(amount)) || 0) +
        (parseFloat(parseNumber(source)) || 0) +
        (parseFloat(parseNumber(paymentMethod)) || 0);
      setTotalAmount(nTotal > 0 ? formatNumber(nTotal.toString()) : "");
      setDonorName(formatNumber(parseNumber(description)));
      setDepartment(formatNumber(parseNumber(notes)));
      setEventName(formatNumber(parseNumber(referenceNumber)));
    }
  }, [
    isTithe,
    titheCash,
    titheBank,
    titheCheque,
    titheForeign1,
    titheForeign2,
    titheForeign3,
    offeringCash,
    offeringBank,
    offeringCheque,
    offeringForeign1,
    offeringForeign2,
    offeringForeign3,
    amount,
    source,
    paymentMethod,
    description,
    notes,
    referenceNumber,
  ]);

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
    let filtered = [...incomes];
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
          formatCurrency(parseFloat(e.totalAmount || e.amount || "0"))
            .toLowerCase()
            .includes(q) ||
          formatDate(e.date).toLowerCase().includes(q) ||
          getUserFullName(e.addedBy).toLowerCase().includes(q),
      );
    }
    return filtered;
  };

  const resetAddForm = () => {
    setSelectedCategory(null);
    setSelectedDate(new Date().toISOString().split("T")[0]);
    setAmount("");
    setSource("");
    setPaymentMethod("");
    setDescription("");
    setNotes("");
    setReferenceNumber("");
    setCurrency("");
    setTotalAmount("");
    setDonorName("");
    setDepartment("");
    setEventName("");
    setTitheCash("");
    setTitheBank("");
    setTitheCheque("");
    setTitheForeign1("");
    setTitheForeign2("");
    setTitheForeign3("");
    setOfferingCash("");
    setOfferingBank("");
    setOfferingCheque("");
    setOfferingForeign1("");
    setOfferingForeign2("");
    setOfferingForeign3("");
  };

  const handleAddIncome = async () => {
    if (!canEditFinance()) {
      toast.error("You do not have permission to add income.");
      return;
    }
    if (!selectedCategory || !currency.trim()) {
      toast.error("Please select a category and add notes.");
      return;
    }
    try {
      const payload: any = {
        category: selectedCategory,
        date: selectedDate,
        ministry: getCurrentMinistry(),
        totalAmount: parseNumber(totalAmount),
        currency, // used as notes
      };
      if (isTithe) {
        payload.titheCash = parseNumber(titheCash);
        payload.titheBank = parseNumber(titheBank);
        payload.titheCheque = parseNumber(titheCheque);
        payload.titheForeign1 = parseNumber(titheForeign1);
        payload.titheForeign2 = parseNumber(titheForeign2);
        payload.titheForeign3 = parseNumber(titheForeign3);
        payload.offeringCash = parseNumber(offeringCash);
        payload.offeringBank = parseNumber(offeringBank);
        payload.offeringCheque = parseNumber(offeringCheque);
        payload.offeringForeign1 = parseNumber(offeringForeign1);
        payload.offeringForeign2 = parseNumber(offeringForeign2);
        payload.offeringForeign3 = parseNumber(offeringForeign3);
        payload.donorName = parseNumber(donorName);
        payload.department = parseNumber(department);
        payload.eventName = parseNumber(eventName);
      } else {
        payload.amount = parseNumber(amount);
        payload.source = parseNumber(source);
        payload.paymentMethod = parseNumber(paymentMethod);
        payload.description = parseNumber(description);
        payload.notes = parseNumber(notes);
        payload.referenceNumber = parseNumber(referenceNumber);
        payload.donorName = parseNumber(donorName);
        payload.department = parseNumber(department);
        payload.eventName = parseNumber(eventName);
      }
      const created = await createIncome(payload);
      setIncomes((prev) => [...prev, created]);
      resetAddForm();
      setShowAddModal(false);
      toast.success("Income record added!");
    } catch (e) {
      toast.error("Failed to add income record.");
      console.error(e);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    const newCat = {
      id: Date.now().toString(),
      name: newCategoryName.trim(),
      icon: selectedIcon,
    };
    setCategories((prev) => [...prev, newCat]);
    setNewCategoryName("");
    setShowCreateCategoryModal(false);
    toast.success("Category created!");
  };

  const handleDeleteIncome = async (record: IncomeRecord) => {
    if (!canEditFinance()) return;
    try {
      await deleteIncome(record._id || record.id || "");
      setIncomes((prev) =>
        prev.filter((e) => (e._id || e.id) !== (record._id || record.id)),
      );
      setShowDeleteConfirm(false);
      setRecordToDelete(null);
      setShowMenuModal(false);
      toast.success("Income record deleted.");
    } catch (e) {
      toast.error("Failed to delete record.");
    }
  };

  const handleAddDeposit = async () => {
    if (!selectedRecordForDeposit) return;
    if (!depositBankName || !depositAccountNumber) {
      toast.error("Bank name and Account number are required.");
      return;
    }
    const newDeposit: Deposit = {
      accountDetails: depositAccountNumber,
      bankName: depositBankName,
      referenceNumber: depositReferenceNumber,
      depositorName: depositDepositorName,
      depositDate,
      notes: depositNotes,
    };
    try {
      const currentDeposits = selectedRecordForDeposit.deposits || [];
      const updatedRecord = await updateIncome(
        selectedRecordForDeposit._id || selectedRecordForDeposit.id || "",
        {
          deposits: [...currentDeposits, newDeposit],
        },
      );
      setIncomes((prev) =>
        prev.map((e) =>
          (e._id || e.id) === (updatedRecord._id || updatedRecord.id)
            ? updatedRecord
            : e,
        ),
      );
      setDepositAccountNumber("");
      setDepositAccountName("");
      setDepositBankName("");
      setDepositReferenceNumber("");
      setDepositDepositorName("");
      setDepositNotes("");
      setDepositDate(new Date().toISOString().split("T")[0]);
      setShowDepositModal(false);
      setSelectedRecordForDeposit(null);
      toast.success("Deposit added successfully!");
    } catch {
      toast.error("Failed to add deposit.");
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
        <h1 className="text-lg font-black text-[#00204a] dark:text-white flex-1 text-center uppercase tracking-tight">Income History</h1>
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
              {canEditFinance() && (
                <button onClick={() => setShowAddModal(true)} className="w-full bg-[#349DC5] rounded-xl py-3 flex items-center justify-center gap-2 shadow-md hover:bg-opacity-90 transition-opacity">
                  <Plus size={18} color="white" />
                  <span className="text-white font-bold text-sm">Add New Income</span>
                </button>
              )}

              {/* Search */}
              <div className="relative">
                <div className="flex items-center bg-white dark:bg-[#1e1e1e] rounded-[10px] px-3.5 py-2.5 border border-[#E6EEF5] dark:border-[#333]">
                  <Search size={18} className="text-gray-400 mr-2" />
                  <input
                    type="text"
                    className="flex-1 bg-transparent text-sm text-[#111] dark:text-white outline-none"
                    placeholder="Search by date, category, amount, or user..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')}>
                      <X size={14} className="text-gray-400" />
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

              {/* Filter */}
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

              {/* Records */}
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white/50 dark:bg-black/20 rounded-3xl mt-4">
                  <div className="w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center mb-4">
                    <FileText size={40} className="text-[#349DC5]" />
                  </div>
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No income records yet</p>
                  <p className="text-[10px] text-gray-400 mt-2">Initialize your registration today</p>
                </div>
              ) : (
                filtered.map((record, index) => (
                  <div key={record._id?.toString() || record.id?.toString() || `inc-${index}`} className="bg-white dark:bg-[#1e1e1e] rounded-[14px] p-4 shadow-sm border border-[#f3f4f6] dark:border-[#333] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#349DC5] rounded-l-[14px]" />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-11 h-11 rounded-full bg-blue-50 dark:bg-blue-900/10 flex items-center justify-center text-xl shrink-0">
                          {record.category?.icon || "💰"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#111] dark:text-white truncate">{record.category?.name || "Unknown"}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{formatDate(record.date)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-sm font-bold text-[#349DC5]">₦{formatAbbreviated(parseFloat(record.totalAmount || record.amount || '0'))}</span>
                        <button onClick={() => { setSelectedRecordForMenu(record); setShowMenuModal(true); }} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          <MoreHorizontal size={16} className="text-gray-500" />
                        </button>
                      </div>
                    </div>

                    {/* Deposit status badge */}
                    {record.deposits && record.deposits.length > 0 && (
                      <div className="mt-2 inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
                        <FileText size={10} className="text-blue-500" />
                        <span className="text-[10px] font-bold text-blue-500">{record.deposits.length} deposit{record.deposits.length > 1 ? 's' : ''}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-[#333]">
                      <div className="w-6 h-6 rounded-full bg-[#10B981] flex items-center justify-center shrink-0">
                        <span className="text-white text-[10px] font-bold">{getUserInitial(record.addedBy)}</span>
                      </div>
                      <span className="text-xs text-gray-500">Added by <span className="font-semibold text-[#111] dark:text-gray-300">{getUserFullName(record.addedBy)}</span></span>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ===== ADD INCOME MODAL ===== */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <div className="bg-white dark:bg-[#1e1e1e] w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 dark:border-[#333] sticky top-0 bg-white dark:bg-[#1e1e1e] z-10">
              <h2 className="text-base font-bold text-[#111] dark:text-white">Add Income Record</h2>
              <button onClick={() => { setShowAddModal(false); resetAddForm(); }} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center"><X size={16} /></button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">Date of Income</label>
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full border border-[#E6EEF5] dark:border-[#333] rounded-xl px-4 py-3 text-sm text-[#111] dark:text-white bg-white dark:bg-[#2a2a2a] outline-none" />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">Income Category</label>
                <button onClick={() => setShowCategoryModal(true)} className="w-full border border-[#E6EEF5] dark:border-[#333] rounded-xl px-4 py-3 text-sm text-left bg-white dark:bg-[#2a2a2a]">
                  <span className={selectedCategory ? 'text-[#111] dark:text-white' : 'text-gray-400'}>
                    {selectedCategory ? `${selectedCategory.icon} ${selectedCategory.name}` : 'Select category'}
                  </span>
                </button>
              </div>

              {/* Conditional fields */}
              {isTithe ? (
                <>
                  {/* Tithe fieldset */}
                  <div className="border border-[#E6EEF5] dark:border-[#333] rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold text-[#10B981] uppercase">Tithe</p>
                    <NairaInput label="Cash" value={titheCash} onChange={setTitheCash} />
                    <NairaInput label="Bank Transfer" value={titheBank} onChange={setTitheBank} />
                    <NairaInput label="Cheque" value={titheCheque} onChange={setTitheCheque} />
                    <p className="text-xs font-bold text-gray-400 pt-1">Foreign Currency</p>
                    <FxInput sym="$" value={titheForeign1} onChange={setTitheForeign1} />
                    <FxInput sym="£" value={titheForeign2} onChange={setTitheForeign2} />
                    <FxInput sym="€" value={titheForeign3} onChange={setTitheForeign3} />
                  </div>
                  {/* Offering fieldset */}
                  <div className="border border-[#E6EEF5] dark:border-[#333] rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold text-[#10B981] uppercase">Offering</p>
                    <NairaInput label="Cash" value={offeringCash} onChange={setOfferingCash} />
                    <NairaInput label="Bank Transfer" value={offeringBank} onChange={setOfferingBank} />
                    <NairaInput label="Cheque" value={offeringCheque} onChange={setOfferingCheque} />
                    <p className="text-xs font-bold text-gray-400 pt-1">Foreign Currency</p>
                    <FxInput sym="$" value={offeringForeign1} onChange={setOfferingForeign1} />
                    <FxInput sym="£" value={offeringForeign2} onChange={setOfferingForeign2} />
                    <FxInput sym="€" value={offeringForeign3} onChange={setOfferingForeign3} />
                  </div>
                </>
              ) : (
                <div className="border border-[#E6EEF5] dark:border-[#333] rounded-xl p-4 space-y-3">
                  <p className="text-xs font-bold text-[#10B981] uppercase">Breakdown</p>
                  <NairaInput label="Cash (Naira)" value={amount} onChange={setAmount} />
                  <NairaInput label="Bank Transfer (Naira)" value={source} onChange={setSource} />
                  <NairaInput label="Cheque (Naira)" value={paymentMethod} onChange={setPaymentMethod} />
                  <p className="text-xs font-bold text-gray-400 pt-1">Foreign Currency</p>
                  <FxInput sym="$" value={description} onChange={setDescription} />
                  <FxInput sym="£" value={notes} onChange={setNotes} />
                  <FxInput sym="€" value={referenceNumber} onChange={setReferenceNumber} />
                </div>
              )}

              {/* Auto totals */}
              <div className="bg-gray-50 dark:bg-[#2a2a2a] rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-gray-500">Total (Auto-calculated)</p>
                <div className="flex items-center gap-2"><span className="text-sm text-gray-500">₦</span><span className="text-base font-bold text-[#111] dark:text-white">{totalAmount || '0'}</span></div>
                <div className="flex gap-4 text-xs text-gray-500 pt-1">
                  <span>$ {donorName || '0'}</span><span>£ {department || '0'}</span><span>€ {eventName || '0'}</span>
                </div>
              </div>

              {/* Notes/Description (currency field in original) */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">Notes / Description <span className="text-red-500">*</span></label>
                <textarea rows={3} placeholder="Add notes or description for this income record" value={currency} onChange={e => setCurrency(e.target.value)} className="w-full border border-[#E6EEF5] dark:border-[#333] rounded-xl px-4 py-3 text-sm text-[#111] dark:text-white bg-white dark:bg-[#2a2a2a] outline-none resize-none" />
              </div>

              <div className="flex gap-3 pb-4">
                <button onClick={() => { setShowAddModal(false); resetAddForm(); }} className="flex-1 py-3 rounded-xl border border-[#E6EEF5] dark:border-[#333] text-sm font-bold text-gray-500">Cancel</button>
                <button onClick={handleAddIncome} className="flex-1 py-3 rounded-xl bg-[#10B981] text-white text-sm font-bold shadow-md">Save and Submit</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Selection Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-white dark:bg-[#1e1e1e] w-full sm:max-w-lg rounded-t-3xl max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 dark:border-[#333]">
              <h2 className="text-base font-bold text-[#111] dark:text-white">Select Category</h2>
              <button onClick={() => setShowCategoryModal(false)}><X size={20} /></button>
            </div>
            <div className="overflow-y-auto flex-1">
              {categories.map(item => (
                <button key={item.id} onClick={() => { setSelectedCategory(item); setShowCategoryModal(false); }} className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-[#333] last:border-0">
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-sm font-semibold text-[#111] dark:text-white">{item.name}</span>
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-[#333] flex gap-3">
              {canEditFinance() && (
                <button onClick={() => { setShowCategoryModal(false); setShowCreateCategoryModal(true); }} className="flex-1 py-3 rounded-xl bg-[#10B981] text-white text-sm font-bold">+ Create Category</button>
              )}
              <button onClick={() => setShowCategoryModal(false)} className="flex-1 py-3 rounded-xl border border-gray-100 dark:border-[#333] text-sm font-bold text-gray-500">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Category Modal */}
      {showCreateCategoryModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-white dark:bg-[#1e1e1e] w-full sm:max-w-lg rounded-t-3xl p-5 space-y-4">
            <div className="flex items-center justify-between"><h2 className="text-base font-bold text-[#111] dark:text-white">Create Category</h2><button onClick={() => setShowCreateCategoryModal(false)}><X size={20} /></button></div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Category Name</label>
              <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="e.g. Monthly Dues" className="w-full border border-[#E6EEF5] dark:border-[#333] rounded-xl px-4 py-3 text-sm text-[#111] dark:text-white bg-white dark:bg-[#2a2a2a] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2">Select Icon</label>
              <div className="flex flex-wrap gap-3">
                {availableIcons.map(icon => (
                  <button key={icon} onClick={() => setSelectedIcon(icon)} className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all ${selectedIcon === icon ? 'bg-[#10B981] ring-2 ring-[#10B981] ring-offset-2' : 'bg-gray-100 dark:bg-gray-800'}`}>{icon}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pb-4">
              <button onClick={() => setShowCreateCategoryModal(false)} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-[#333] text-sm font-bold text-gray-500">Cancel</button>
              <button onClick={handleCreateCategory} className="flex-1 py-3 rounded-xl bg-[#10B981] text-white text-sm font-bold">Create</button>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {/* Action Menu Modal */}
        {showMenuModal && selectedRecordForMenu && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowMenuModal(false)}>
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-[#1e1e1e] w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-white/10"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-3xl mb-3 shadow-sm border border-blue-100/50 dark:border-blue-900/30">
                  {selectedRecordForMenu.category?.icon || "💰"}
                </div>
                <h3 className="text-lg font-bold text-[#00204a] dark:text-white mb-1">
                  {selectedRecordForMenu.category?.name || "Income Record"}
                </h3>
                <p className="text-sm font-bold text-[#349DC5] tracking-tight">
                  ₦{formatAbbreviated(parseFloat(selectedRecordForMenu.totalAmount || selectedRecordForMenu.amount || '0'))}
                </p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => { setSelectedRecord(selectedRecordForMenu); setShowViewModal(true); setShowMenuModal(false); }}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-2xl transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white dark:bg-white/10 rounded-lg text-[#349DC5] group-hover:scale-110 transition-transform"><Eye size={18} /></div>
                    <span className="text-sm font-bold text-[#00204a] dark:text-white">View Details</span>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-white dark:bg-white/10 flex items-center justify-center text-gray-300">›</div>
                </button>

                {canEditFinance() && (
                  <button
                    onClick={() => { setSelectedRecordForDeposit(selectedRecordForMenu); setShowDepositModal(true); setShowMenuModal(false); }}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 rounded-2xl transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white dark:bg-white/10 rounded-lg text-emerald-500 group-hover:scale-110 transition-transform"><FileText size={18} /></div>
                      <span className="text-sm font-bold text-[#00204a] dark:text-white">Add Deposit Proof</span>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-white dark:bg-white/10 flex items-center justify-center text-gray-300">›</div>
                  </button>
                )}

                {canEditFinance() && (
                  <button
                    onClick={() => { setRecordToDelete(selectedRecordForMenu); setShowDeleteConfirm(true); }}
                    className="w-full flex items-center justify-between p-4 bg-white dark:bg-[#1e1e1e] border border-red-100 dark:border-red-900/20 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-2xl transition-all group mt-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-[#EF4444] group-hover:scale-110 transition-transform"><Trash2 size={18} /></div>
                      <span className="text-sm font-bold text-[#EF4444]">Delete Record</span>
                    </div>
                  </button>
                )}
              </div>

              <button onClick={() => setShowMenuModal(false)} className="w-full mt-6 py-4 rounded-2xl text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
                Dismiss
              </button>
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
              className="bg-white dark:bg-[#1e1e1e] w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-white/10"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 sticky top-0 z-10 backdrop-blur-md">
                <h2 className="text-base font-black text-[#00204a] dark:text-white uppercase tracking-widest leading-none">Income Record</h2>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="w-10 h-10 rounded-full bg-white dark:bg-white/10 flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
                ><X size={20} className="text-[#349DC5]" /></button>
              </div>
              <div className="px-6 py-6 overflow-y-auto space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    ['Category', `${selectedRecord.category?.icon || "💰"} ${selectedRecord.category?.name || "Income"}`],
                    ['Date', formatDate(selectedRecord.date)],
                    ['Total Amount', `₦${formatCurrency(parseFloat(selectedRecord.totalAmount || selectedRecord.amount || '0'))}`],
                    ['USD Total', `$${formatCurrency(parseFloat(selectedRecord.titheForeign1 || selectedRecord.offeringForeign1 || '0'))}`],
                    ['GBP Total', `£${formatCurrency(parseFloat(selectedRecord.titheForeign2 || selectedRecord.offeringForeign2 || '0'))}`],
                    ['EUR Total', `€${formatCurrency(parseFloat(selectedRecord.titheForeign3 || selectedRecord.offeringForeign3 || '0'))}`],
                    ['Added By', getUserFullName(selectedRecord.addedBy)],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-gray-50/50 dark:bg-white/5 p-5 rounded-2xl border border-gray-100/50 dark:border-white/5 transition-all hover:border-[#349DC5]/30">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 opacity-60 font-inter">{label}</p>
                      <p className="text-sm font-bold text-[#00204a] dark:text-white truncate tracking-tight">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-blue-50/30 dark:bg-blue-900/10 p-5 rounded-2xl border border-blue-100 dark:border-blue-900/20 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#349DC5]/5 rounded-full -mr-12 -mt-12" />
                  <p className="text-[10px] font-black text-[#349DC5] uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                    <span className="w-4 h-px bg-[#349DC5]/30" />
                    Description
                  </p>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300 leading-relaxed">
                    {selectedRecord.currency || "No description provided for this record."}
                  </p>
                </div>

                {/* Deposit list */}
                {selectedRecord.deposits && selectedRecord.deposits.length > 0 && (
                  <div className="pt-4">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Deposit Proofs ({selectedRecord.deposits!.length})
                    </h4>
                    <div className="space-y-3">
                      {selectedRecord.deposits.map((dep, i) => (
                        <div key={i} className="bg-emerald-50/50 dark:bg-emerald-950/10 rounded-2xl p-4 border border-emerald-100 dark:border-emerald-900/20 group hover:border-[#349DC5]/50 transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase">{dep.bankName}</p>
                            <span className="text-[8px] font-black bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-md uppercase tracking-tighter">Verified</span>
                          </div>
                          <p className="text-sm font-bold text-[#00204a] dark:text-white mb-1.5">{dep.depositorName}</p>
                          <div className="h-px bg-emerald-100 dark:bg-emerald-900/20 my-2" />
                          <div className="flex justify-between items-center text-[10px] font-bold text-gray-400">
                            <span className="uppercase tracking-widest shrink-0">Reference:</span>
                            <span className="text-[#00204a] dark:text-gray-200 truncate ml-2">#{dep.referenceNumber}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="p-6 pt-2 bg-white dark:bg-[#1e1e1e]">
                <button onClick={() => setShowViewModal(false)} className="w-full py-4 rounded-2xl bg-[#00204a] dark:bg-white/10 text-white font-bold text-xs uppercase tracking-widest active:scale-95 transition-all">Close</button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Add Deposit Modal */}
        {showDepositModal && selectedRecordForDeposit && (
          <div className="fixed inset-0 bg-black/60 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowDepositModal(false)}>
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              className="bg-white dark:bg-[#1e1e1e] w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl border border-white/10 overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 sticky top-0 z-10">
                <h2 className="text-base font-black text-[#00204a] dark:text-white uppercase tracking-widest">Evidence Registry</h2>
                <button onClick={() => setShowDepositModal(false)} className="w-10 h-10 rounded-full bg-white dark:bg-white/10 flex items-center justify-center shadow-sm"><X size={20} className="text-[#349DC5]" /></button>
              </div>
              <div className="overflow-y-auto flex-1 px-6 py-6 space-y-5">
                <div className="relative">
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 opacity-60">Bank Institution</label>
                  <input type="text" value={depositBankName} onChange={e => handleBankSearch(e.target.value)} placeholder="Search for bank..." className="w-full border border-gray-100 dark:border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-[#00204a] dark:text-white bg-gray-50 dark:bg-white/5 outline-none focus:ring-2 focus:ring-[#349DC5]/20 transition-all" />
                  {showBankDropdown && filteredBanks.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1e1e1e] border border-gray-100 dark:border-white/5 rounded-2xl shadow-2xl z-[80] max-h-48 overflow-y-auto backdrop-blur-xl">
                      {filteredBanks.slice(0, 10).map(b => (
                        <button key={b.code} onClick={() => { setDepositBankName(b.name); setShowBankDropdown(false); }} className="w-full px-5 py-3.5 text-left text-sm font-bold hover:bg-blue-50 dark:hover:bg-blue-900/10 text-[#00204a] dark:text-white border-b border-gray-50 dark:border-white/5 last:border-0 transition-colors">
                          {b.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {[
                  { label: 'Intelligence Reference', val: depositReferenceNumber, set: setDepositReferenceNumber, placeholder: 'e.g. TRN123...', type: 'text' },
                  { label: 'Strategic Depositor', val: depositDepositorName, set: setDepositDepositorName, placeholder: 'Legal entity name', type: 'text' },
                ].map(({ label, val, set, placeholder, type }) => (
                  <div key={label}>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 opacity-60">{label}</label>
                    <input type={type} value={val} onChange={e => set(e.target.value)} placeholder={placeholder} className="w-full border border-gray-100 dark:border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-[#00204a] dark:text-white bg-gray-50 dark:bg-white/5 outline-none focus:ring-2 focus:ring-[#349DC5]/20 transition-all" />
                  </div>
                ))}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 opacity-60">Filing Date</label>
                    <input type="date" value={depositDate} onChange={e => setDepositDate(e.target.value)} className="w-full border border-gray-100 dark:border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-[#00204a] dark:text-white bg-gray-50 dark:bg-white/5 outline-none focus:ring-2 focus:ring-[#349DC5]/20 transition-all" />
                  </div>
                  <div className="flex items-end">
                    <button onClick={handleAddDeposit} className="w-full py-4 rounded-2xl bg-[#349DC5] text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Submit Evidence</button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Delete Confirmation */}
        {showDeleteConfirm && recordToDelete && (
          <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#1e1e1e] rounded-3xl p-8 w-full max-w-sm shadow-2xl border border-red-50 dark:border-red-900/20"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-6 shadow-sm border-4 border-white dark:border-red-900/10">
                <Trash2 size={24} className="text-[#EF4444]" />
              </div>
              <h3 className="text-xl font-bold text-[#00204a] dark:text-white text-center mb-3 tracking-tight">Delete Record?</h3>
              <p className="text-sm text-gray-400 text-center mb-8 leading-relaxed">This will permanently remove this income record. This action cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowDeleteConfirm(false); setRecordToDelete(null); }}
                  className="flex-1 py-4 rounded-2xl border border-gray-200 dark:border-white/10 text-xs font-black text-gray-400 uppercase tracking-widest hover:bg-gray-50 transition-colors"
                >Cancel</button>
                <button onClick={() => handleDeleteIncome(recordToDelete!)} className="flex-1 py-4 rounded-2xl bg-[#EF4444] text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95 transition-all">Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
