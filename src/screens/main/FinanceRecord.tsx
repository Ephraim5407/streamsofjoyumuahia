import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Check,
  X,
  ChevronDown,
  Plus,
  Calendar,
  ShieldCheck,
  CreditCard,
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { BASE_URl } from "../../api/users";
import AsyncStorage from "../../utils/AsyncStorage";
import { resolveActiveUnitId } from "../../utils/context";
export default function FinanceRecordScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const type = (queryParams.get("type") || "income") as
    | "income"
    | "expense"
    | "deposit";
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [showCatModal, setShowCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [form, setForm] = useState({
    source: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
  });
  const fetchCategories = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const unitId = await resolveActiveUnitId();
      const res = await axios.get(`${BASE_URl}/api/finance/categories`, {
        params: { unitId, type: type === "deposit" ? "income" : type },
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.categories) setCategories(res.data.categories);
    } catch (e) {
      console.error("Failed to load fiscal taxonomies");
    }
  }, [type]);
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);
  const handleAmountChange = (val: string) => {
    const cleaned = val.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    let processed = parts[0];
    if (parts.length > 1) processed += "." + parts.slice(1).join("");
    setForm((f) => ({ ...f, amount: processed }));
  };
  const formatDisplayAmount = (val: string) => {
    if (!val) return "";
    const [int, dec] = val.split(".");
    const formattedInt = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return dec !== undefined ? `${formattedInt}.${dec}` : formattedInt;
  };
  const addCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      const token = await AsyncStorage.getItem("token");
      const unitId = await resolveActiveUnitId();
      await axios.post(
        `${BASE_URl}/api/finance/categories`,
        {
          unitId,
          type: type === "deposit" ? "income" : type,
          name: newCatName.trim(),
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      toast.success("Category added");
      setNewCatName("");
      fetchCategories();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to add category");
    }
  };
  const submit = async () => {
    if (!form.source || !form.amount || !form.date || !form.description) {
      toast.error("All required fields must be filled");
      return;
    }
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const unitId = await resolveActiveUnitId();
      await axios.post(
        `${BASE_URl}/api/finance`,
        { ...form, unitId, type, amount: parseFloat(form.amount) },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      toast.success("Record saved successfully");
      navigate(-1);
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to save record");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="pb-24 max-w-2xl mx-auto px-4 sm:px-6 pt-6">
      <header className="flex items-center gap-5 mb-12">
        <button
          onClick={() => navigate(-1)}
          className="p-3 rounded-2xl bg-white dark:bg-[#1e1e1e] shadow-sm border border-gray-100 dark:border-[#333] text-gray-400 hover:text-primary transition-all active:scale-90"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="relative">
          <h1 className="text-3xl font-bold text-[#00204a] dark:text-white uppercase leading-none">
            Log
            {type === "income"
              ? "Inflow"
              : type === "expense"
                ? "Outflow"
                : "Deposit"}
          </h1>
          <p className="text-[10px] font-bold text-[#349DC5] uppercase tracking-[0.3em] mt-2 ml-1 flex items-center gap-2">
            <ShieldCheck size={12} fill="currentColor" /> Secure Finance Entry
          </p>
        </div>
      </header>
      <div className="space-y-10">
        {/* Category Selection */}
        <section>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4 ml-2">
            Category
          </label>
          <div
            onClick={() => setShowCatModal(true)}
            className="h-20 px-8 bg-white dark:bg-[#1e1e1e] rounded-[28px] shadow-sm border border-gray-100 dark:border-[#333] flex items-center justify-between cursor-pointer group hover:border-primary/20 transition-all"
          >
            <div className="flex items-center gap-5">
              <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 group-hover:text-primary transition-colors">
                <CreditCard size={20} />
              </div>
              <span
                className={cn(
                  "font-bold text-lg",
                  form.source
                    ? "text-[#00204a] dark:text-white"
                    : "text-gray-300",
                )}
              >
                {form.source || "Select Category"}
              </span>
            </div>
            <ChevronDown size={20} className="text-gray-300" />
          </div>
        </section>
        {/* Amount Input */}
        <section>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4 ml-2">
            Amount (₦)
          </label>
          <div className="relative">
            <div className="absolute left-8 top-1/2 -translate-y-1/2 text-3xl font-bold text-[#349DC5]">
              ₦
            </div>
            <input
              type="text"
              value={formatDisplayAmount(form.amount)}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="0.00"
              className="w-full h-24 pl-16 pr-8 bg-[#00204a] text-white rounded-[32px] text-4xl font-bold outline-none placeholder:text-blue-900/30 shadow-md shadow-blue-900/20"
            />
          </div>
        </section>
        {/* Date Picker */}
        <section>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4 ml-2">
            Date
          </label>
          <div className="relative group">
            <Calendar
              className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-primary transition-colors"
              size={20}
            />
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full h-20 pl-16 pr-8 bg-white dark:bg-[#1e1e1e] rounded-[28px] shadow-sm border border-gray-100 dark:border-[#333] text-lg font-bold outline-none uppercase focus:border-primary/20 transition-all"
            />
          </div>
        </section>
        {/* Description */}
        <section>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4 ml-2">
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                description: e.target.value.slice(0, 100),
              }))
            }
            placeholder="Brief narrative of the transaction..."
            className="w-full h-40 p-8 bg-white dark:bg-[#1e1e1e] rounded-[32px] shadow-sm border border-gray-100 dark:border-[#333] text-lg font-medium outline-none resize-none focus:border-primary/20 transition-all"
          />
          <div className="flex justify-end mt-3 px-4">
            <span
              className={cn(
                "text-[10px] font-bold uppercase",
                form.description.length >= 100
                  ? "text-rose-500"
                  : "text-gray-300",
              )}
            >
              {form.description.length}/100
            </span>
          </div>
        </section>
        {/* Action Button */}
        <button
          onClick={submit}
          disabled={loading}
          className="w-full h-20 bg-[#349DC5] text-white rounded-[32px] font-bold text-sm uppercase tracking-[0.3em] flex items-center justify-center gap-4 hover:bg-[#349DC5]/90 active:scale-[0.98] transition-all shadow shadow-blue-400/20 disabled:opacity-50"
        >
          {loading ? (
            <RefreshCw className="animate-spin" />
          ) : (
            <Check size={20} />
          )}
          Save Record
        </button>
      </div>
      {/* Category Backdrop Modal */}
      <AnimatePresence>
        {showCatModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCatModal(false)}
              className="absolute inset-0 bg-[#00204a]/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="relative w-full max-w-lg bg-white dark:bg-[#1e1e1e] rounded-[40px] overflow-hidden shadow-md"
            >
              <div className="p-10">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-bold text-[#00204a] dark:text-white uppercase">
                    Finance Categories
                  </h3>
                  <button
                    onClick={() => setShowCatModal(false)}
                    className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl text-gray-400 hover:text-rose-500 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="relative mb-8">
                  <input
                    type="text"
                    placeholder="Add new category..."
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full h-16 pl-6 pr-16 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none outline-none font-bold text-sm"
                  />
                  <button
                    onClick={addCategory}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 bg-[#00204a] text-white rounded-xl flex items-center justify-center hover:bg-primary transition-all active:scale-90"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                <div className="max-h-[400px] overflow-y-auto pr-4 space-y-4 custom-scrollbar">
                  {categories.map((cat) => (
                    <div
                      key={cat._id}
                      onClick={() => {
                        setForm((f) => ({ ...f, source: cat.name }));
                        setShowCatModal(false);
                      }}
                      className={cn(
                        "px-8 py-5 rounded-2xl font-bold transition-all cursor-pointer flex items-center justify-between",
                        form.source === cat.name
                          ? "bg-primary text-white shadow-lg shadow-blue-500/20 scale-[1.02]"
                          : "bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-[#00204a] dark:hover:text-white",
                      )}
                    >
                      <span className="text-lg">{cat.name}</span>
                      {form.source === cat.name && <Check size={18} />}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join("");
}
function RefreshCw(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}
