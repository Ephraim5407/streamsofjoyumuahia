import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Search, Filter, Plus, Trash2, Edit3, X,
  ChevronDown, Check, Calendar, DownloadCloud, Tag,
  TrendingUp, TrendingDown, FileText
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { BASE_URl } from "../../api/users";
import { resolveActiveUnitId } from "../../utils/context";

const token = () => localStorage.getItem("token");

const currency = (n: number) => `₦${(n || 0).toLocaleString()}`;

const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const formatDateLong = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  const day = d.getDate();
  const suffix = (n: number) => (n%10===1&&n%100!==11?"st":n%10===2&&n%100!==12?"nd":n%10===3&&n%100!==13?"rd":"th");
  return `${day}${suffix(day)} ${monthNames[d.getMonth()]}, ${d.getFullYear()}`;
};

type FinanceType = "income" | "expense" | "deposit";

interface FinanceDoc {
  _id: string;
  type: FinanceType;
  amount: number;
  source?: string;
  description?: string;
  date: string;
  addedBy?: string;
  recordedBy?: string;
  addedByName?: string;
  recordedByName?: string;
}

const getCategoryIcon = (name: string, type: string) => {
  const n = name.toLowerCase();
  if (type === "income") {
    if (/tithe|tithes/.test(n)) return { icon: "💚", color: "#16a34a" };
    if (/offering|seed|pledge/.test(n)) return { icon: "💰", color: "#0ea5b7" };
    if (/partnership|donation|gift/.test(n)) return { icon: "🎁", color: "#f59e0b" };
    if (/sales|book|merch|shop/.test(n)) return { icon: "🛒", color: "#0f172a" };
    if (/welfare|support|aid/.test(n)) return { icon: "❤️", color: "#ef4444" };
    if (/project|building|fund/.test(n)) return { icon: "📋", color: "#3b82f6" };
    return { icon: "🏷️", color: "#64748b" };
  } else {
    if (/rent|lease|facility/.test(n)) return { icon: "🏠", color: "#3b82f6" };
    if (/equipment|repair|maintenance|fix/.test(n)) return { icon: "🔨", color: "#0f172a" };
    if (/transport|travel|fuel/.test(n)) return { icon: "🚗", color: "#16a34a" };
    if (/medical|health/.test(n)) return { icon: "🏥", color: "#ef4444" };
    if (/food|refreshment|catering/.test(n)) return { icon: "☕", color: "#f59e0b" };
    if (/printing|media|publicity/.test(n)) return { icon: "🖨️", color: "#0ea5b7" };
    return { icon: "🏷️", color: "#64748b" };
  }
};

export default function FinanceHistoryScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const type = (params.get("type") || "income") as FinanceType;
  const unitIdParam = params.get("unitId");

  const [unitId, setUnitId] = useState<string | null>(unitIdParam || localStorage.getItem("activeUnitId"));
  const [items, setItems] = useState<FinanceDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<"7"|"30"|"year"|"all">("all");
  const [showRangePicker, setShowRangePicker] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<FinanceDoc | null>(null);
  const [form, setForm] = useState({ amount: "", source: "", description: "", date: "" });
  const [showFormModal, setShowFormModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [role, setRole] = useState("");
  const [hasFinSec, setHasFinSec] = useState(false);
  const [userMap, setUserMap] = useState<Record<string, string>>({});

  // resolve user info and unit
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${BASE_URl}/api/users/me`, { headers: { Authorization: `Bearer ${token()}` } });
        if (!res.data?.ok) return;
        const u = res.data.user;
        setRole(u.activeRole || "");
        const roles = Array.isArray(u.roles) ? u.roles : [];
        let uid = unitIdParam || (await resolveActiveUnitId());
        if (uid) setUnitId(uid);
        const catType = type === "deposit" ? "income" : type;
        const catRes = await axios.get(`${BASE_URl}/api/finance/categories`, {
          params: { unitId: uid, type: catType },
          headers: { Authorization: `Bearer ${token()}` }
        });
        if (catRes.data?.categories) setCategories(catRes.data.categories.map((c: any) => c.name || c).sort());
        const has = roles.some((r: any) => Array.isArray(r.duties) && (r.duties.includes("FinancialSecretary") || r.duties.includes("Financial Secretary")));
        setHasFinSec(has);
      } catch {}
    })();
  }, [type, unitIdParam]);

  const load = useCallback(async () => {
    if (!unitId) { setLoading(false); return; }
    try {
      setLoading(true);
      let from: string | undefined, to: string | undefined;
      const now = new Date();
      if (range === "7") { const d = new Date(); d.setDate(d.getDate()-7); from = d.toISOString(); to = now.toISOString(); }
      else if (range === "30") { const d = new Date(); d.setDate(d.getDate()-30); from = d.toISOString(); to = now.toISOString(); }
      else if (range === "year") { from = new Date(now.getFullYear(),0,1).toISOString(); to = new Date(now.getFullYear(),11,31,23,59,59).toISOString(); }
      const res = await axios.get(`${BASE_URl}/api/finance`, {
        params: { unitId, type, ...(from && { from }), ...(to && { to }) },
        headers: { Authorization: `Bearer ${token()}` }
      });
      if (res.data?.ok) setItems(res.data.finances || []);
    } catch {
      toast.error("Failed to load records");
    } finally { setLoading(false); }
  }, [unitId, type, range]);

  useEffect(() => { load(); }, [load]);

  // resolve user IDs to names
  useEffect(() => {
    (async () => {
      const objectIdRe = /^[a-f\d]{24}$/i;
      const ids = new Set<string>();
      for (const i of items) {
        const id = (i as any).addedBy || (i as any).recordedBy;
        if (typeof id === "string" && objectIdRe.test(id) && !userMap[id] && !i.addedByName) ids.add(id);
      }
      if (!ids.size) return;
      const fetched: Record<string, string> = { ...userMap };
      await Promise.all(Array.from(ids).map(async id => {
        try {
          const r = await axios.get(`${BASE_URl}/api/users/${id}`, { headers: { Authorization: `Bearer ${token()}` }, timeout: 8000 });
          const u = r.data?.user || r.data;
          if (u) fetched[id] = [u.firstName||u.givenName, u.middleName, u.surname||u.lastName].filter(Boolean).join(" ") || u.email || "User";
        } catch {}
      }));
      setUserMap(fetched);
    })();
  }, [items]);

  const canRecord = useMemo(() => {
    // If we're an observer (Admin viewing a unit they don't own) we should be read-only
    const isObserver = (role === "SuperAdmin" || role === "MinistryAdmin") && !!unitIdParam;
    if (isObserver) return false;
    
    return role === "UnitLeader" || role === "SuperAdmin" || role === "MinistryAdmin" || (role === "Member" && hasFinSec);
  }, [role, hasFinSec, unitIdParam]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i =>
      String(i.amount).includes(q) ||
      (i.source||"").toLowerCase().includes(q) ||
      (i.description||"").toLowerCase().includes(q) ||
      new Date(i.date).toLocaleDateString().includes(q)
    );
  }, [items, search]);

  const total = useMemo(() => items.reduce((s, i) => s + (i.amount || 0), 0), [items]);

  const openNew = () => {
    setEditing({ _id: "new", type, amount: 0, date: new Date().toISOString() } as any);
    setForm({ amount: "", source: "", description: "", date: new Date().toISOString().slice(0,10) });
    setShowFormModal(true);
  };
  const openEdit = (doc: FinanceDoc) => {
    setEditing(doc);
    setForm({ amount: String(doc.amount||0), source: doc.source||"", description: doc.description||"", date: (doc.date||"").slice(0,10) });
    setShowFormModal(true);
  };

  const submit = async () => {
    if (!form.source) { toast.error("Please select a category"); return; }
    if (!form.amount || Number(form.amount) <= 0) { toast.error("Please enter a valid amount"); return; }
    if (!form.date) { toast.error("Please select a date"); return; }
    if (!form.description.trim()) { toast.error("Please add a description"); return; }
    setSubmitting(true);
    try {
      if (editing?._id === "new") {
        await axios.post(`${BASE_URl}/api/finance`, { unitId, type, amount: Number(form.amount), source: form.source, description: form.description, date: form.date }, { headers: { Authorization: `Bearer ${token()}` } });
        toast.success(`${type === "income" ? "Income" : "Expense"} recorded`);
      } else if (editing) {
        await axios.put(`${BASE_URl}/api/finance/${editing._id}`, { amount: Number(form.amount), source: form.source, description: form.description, date: form.date }, { headers: { Authorization: `Bearer ${token()}` } });
        toast.success("Record updated");
      }
      setShowFormModal(false);
      setEditing(null);
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || "Failed"); }
    finally { setSubmitting(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this record?")) return;
    try {
      await axios.delete(`${BASE_URl}/api/finance/${id}`, { headers: { Authorization: `Bearer ${token()}` } });
      toast.success("Record deleted");
      load();
    } catch { toast.error("Failed to delete"); }
  };

  const addCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      const catType = type === "deposit" ? "income" : type;
      await axios.post(`${BASE_URl}/api/finance/categories`, { unitId, type: catType, name: newCatName.trim() }, { headers: { Authorization: `Bearer ${token()}` } });
      toast.success("Category added");
      setNewCatName("");
      const catRes = await axios.get(`${BASE_URl}/api/finance/categories`, { params: { unitId, type: catType }, headers: { Authorization: `Bearer ${token()}` } });
      if (catRes.data?.categories) setCategories(catRes.data.categories.map((c: any) => c.name || c).sort());
    } catch (e: any) { toast.error(e.response?.data?.message || "Failed"); }
  };

  const isIncome = type === "income";
  const accentColor = isIncome ? "#10B981" : "#EF4444";
  const bgAccent = isIncome ? "bg-emerald-50 dark:bg-emerald-900/10" : "bg-rose-50 dark:bg-rose-900/10";
  const borderAccent = isIncome ? "border-emerald-100 dark:border-emerald-900/20" : "border-rose-100 dark:border-rose-900/20";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#111] pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-[#1a1a1a] border-b border-gray-100 dark:border-white/5 px-4 pt-10 pb-4 sticky top-0 z-20">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-500 hover:text-[#349DC5] transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-black text-[#00204a] dark:text-white uppercase tracking-tight">
              {isIncome ? "Income" : "Expense"} History
            </h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {filtered.length} records · {currency(total)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canRecord && (
              <button onClick={() => setShowCatModal(true)} className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-500 hover:text-[#349DC5]">
                <Tag size={18} />
              </button>
            )}
            {canRecord && (
              <button onClick={openNew} className="px-4 py-2 bg-[#349DC5] text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Plus size={15} />
                Add New
              </button>
            )}
          </div>
        </div>

        {/* Summary card */}
        <div className={`rounded-2xl p-4 ${bgAccent} border ${borderAccent} flex items-center gap-4 mb-3`}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: accentColor + "20" }}>
            {isIncome ? <TrendingUp size={20} style={{ color: accentColor }} /> : <TrendingDown size={20} style={{ color: accentColor }} />}
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total {isIncome ? "Income" : "Expenses"}</p>
            <p className="text-2xl font-black" style={{ color: accentColor }}>{currency(total)}</p>
          </div>
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-gray-50 dark:bg-white/5 rounded-2xl px-4 py-3 border border-gray-100 dark:border-white/5">
            <Search size={16} className="text-gray-400 shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${type} records...`}
              className="flex-1 bg-transparent text-sm font-medium text-[#00204a] dark:text-white placeholder:text-gray-300 outline-none"
            />
          </div>
          <button onClick={() => setShowRangePicker(true)} className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 text-xs font-black text-gray-500">
            <Filter size={14} />
            {range === "7" ? "7d" : range === "30" ? "30d" : range === "year" ? "Year" : "All"}
            <ChevronDown size={12} />
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center py-16 gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-[#349DC5] border-t-transparent animate-spin" />
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Loading Records...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-4">
            <div className="w-20 h-20 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center">
              <FileText size={32} className="text-gray-300" />
            </div>
            <p className="text-sm font-black text-gray-400 uppercase tracking-widest">No Records Found</p>
            {canRecord && (
              <button onClick={openNew} className="px-6 py-3 bg-[#349DC5] text-white rounded-2xl font-black text-xs uppercase tracking-wider">
                Record New {isIncome ? "Income" : "Expense"}
              </button>
            )}
          </div>
        ) : (
          filtered.map(item => {
            const isExpanded = expandedIds.has(item._id);
            const desc = item.description || "";
            const shouldTruncate = desc.length > 80;
            const displayDesc = isExpanded ? desc : desc.slice(0, 80) + (shouldTruncate ? "..." : "");
            const idCandidate = typeof item.addedBy === "string" ? item.addedBy : typeof item.recordedBy === "string" ? item.recordedBy : "";
            const displayName = item.addedByName || item.recordedByName || (idCandidate && userMap[idCandidate]) || "—";
            const catInfo = getCategoryIcon(item.source || "", type);
            return (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-4 border border-gray-100 dark:border-white/5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-lg shrink-0">
                      {catInfo.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        {item.source && <span className="text-xs font-black text-[#349DC5] uppercase tracking-wider">{item.source}</span>}
                        <span className="text-[10px] text-gray-400 font-bold">{formatDateLong(item.date)}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">{displayDesc || "—"}</p>
                      {shouldTruncate && (
                        <button onClick={() => setExpandedIds(p => { const n = new Set(p); n.has(item._id) ? n.delete(item._id) : n.add(item._id); return n; })} className="text-xs font-black text-[#349DC5] mt-1">
                          {isExpanded ? "View Less" : "View More"}
                        </button>
                      )}
                      <p className="text-[10px] font-bold text-gray-400 mt-2">Added by: <span className="text-[#349DC5]">{displayName}</span></p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <p className="text-lg font-black" style={{ color: isIncome ? "#10B981" : "#EF4444" }}>{currency(item.amount)}</p>
                    {canRecord && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(item)} className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-[#349DC5]">
                          <Edit3 size={13} />
                        </button>
                        <button onClick={() => remove(item._id)} className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-400">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Range picker modal */}
      <AnimatePresence>
        {showRangePicker && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowRangePicker(false)}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} onClick={e => e.stopPropagation()} className="relative bg-white dark:bg-[#1e1e1e] w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl">
              <h3 className="text-sm font-black text-[#00204a] dark:text-white uppercase tracking-widest mb-4">Filter by Date Range</h3>
              {(["7", "30", "year", "all"] as const).map(r => (
                <button key={r} onClick={() => { setRange(r); setShowRangePicker(false); }} className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <span className="font-bold text-sm text-[#00204a] dark:text-white">{r === "7" ? "Last 7 days" : r === "30" ? "Last 30 days" : r === "year" ? "This Year" : "All Time"}</span>
                  {range === r && <Check size={16} className="text-[#349DC5]" />}
                </button>
              ))}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Category modal */}
      <AnimatePresence>
        {showCatModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowCatModal(false)}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} onClick={e => e.stopPropagation()} className="relative bg-white dark:bg-[#1e1e1e] w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[85vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-[#00204a] dark:text-white uppercase tracking-widest">Add A New Category</h3>
                <button onClick={() => setShowCatModal(false)} className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center">
                  <X size={16} className="text-gray-400" />
                </button>
              </div>
              <div className="flex gap-2 mb-4">
                <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Enter category name" className="flex-1 px-4 py-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5 text-sm font-medium text-[#00204a] dark:text-white outline-none" />
                <button onClick={addCategory} className="px-4 py-2 bg-[#349DC5] text-white rounded-xl font-black text-xs">Save and Upload</button>
              </div>
              <div className="overflow-y-auto space-y-1">
                {categories.map(cat => {
                  const { icon } = getCategoryIcon(cat, type);
                  return (
                    <button key={cat} onClick={() => { setForm(f => ({ ...f, source: cat })); setShowCatModal(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 text-left transition-colors">
                      <span className="text-lg">{icon}</span>
                      <span className="text-sm font-bold text-[#00204a] dark:text-white">{cat}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit Form Modal */}
      <AnimatePresence>
        {showFormModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowFormModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} onClick={e => e.stopPropagation()} className="relative bg-white dark:bg-[#1e1e1e] w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-white/5">
                <h2 className="text-base font-black text-[#00204a] dark:text-white uppercase tracking-widest">
                  {editing?._id === "new" ? `Record New ${isIncome ? "Income" : "Expense"}` : `Edit ${isIncome ? "Income" : "Expense"}`}
                </h2>
                <button onClick={() => setShowFormModal(false)} className="w-9 h-9 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center">
                  <X size={18} className="text-gray-400" />
                </button>
              </div>
              <div className="overflow-y-auto px-6 py-5 space-y-4">
                {/* Category */}
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{isIncome ? "Income Type" : "Expense Category"} <span className="text-red-400">*</span></label>
                  <button onClick={() => setShowCatModal(true)} className="w-full flex items-center justify-between px-4 py-3 border border-gray-100 dark:border-white/10 rounded-2xl bg-gray-50 dark:bg-white/5">
                    <span className={`text-sm font-bold ${form.source ? "text-[#00204a] dark:text-white" : "text-gray-300"}`}>{form.source || `Select ${isIncome ? "Income Source" : "Expense Category"}`}</span>
                    <ChevronDown size={16} className="text-gray-400" />
                  </button>
                </div>
                {/* Amount */}
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Amount (₦) <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-[#349DC5] text-lg">₦</span>
                    <input
                      type="text"
                      value={form.amount}
                      onChange={e => {
                        let v = e.target.value.replace(/[^0-9.]/g, "");
                        const parts = v.split("."); if (parts.length > 1) v = parts[0] + "." + parts.slice(1).join("");
                        setForm(f => ({ ...f, amount: v }));
                      }}
                      placeholder="0.00"
                      className="w-full pl-10 pr-4 py-3.5 border border-gray-100 dark:border-white/10 rounded-2xl bg-white dark:bg-[#2a2a2a] text-[#00204a] dark:text-white font-black text-xl outline-none"
                    />
                  </div>
                </div>
                {/* Date */}
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{isIncome ? "Date of Income" : "Date of Expense"} <span className="text-red-400">*</span></label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full px-4 py-3.5 border border-gray-100 dark:border-white/10 rounded-2xl bg-white dark:bg-[#2a2a2a] text-[#00204a] dark:text-white font-bold outline-none" />
                </div>
                {/* Description */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Description / Purpose <span className="text-red-400">*</span></label>
                    <span className={`text-[10px] font-black ${(form.description?.length||0) >= 100 ? "text-red-400" : "text-gray-400"}`}>{form.description?.length||0}/100</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden mb-2">
                    <div className="h-full rounded-full bg-[#349DC5] transition-all" style={{ width: `${Math.min(((form.description?.length||0)/100)*100, 100)}%` }} />
                  </div>
                  <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value.slice(0,100)}))} placeholder={`e.g. ${isIncome ? "Offering from Youth Retreat" : "Transportation for ministry outreach"}`} maxLength={100} rows={3} className="w-full px-4 py-3 border border-gray-100 dark:border-white/10 rounded-2xl bg-white dark:bg-[#2a2a2a] text-[#00204a] dark:text-white font-medium text-sm outline-none resize-none" />
                </div>
              </div>
              <div className="px-6 py-4 bg-white dark:bg-[#1e1e1e] border-t border-gray-50 dark:border-white/5">
                <button onClick={submit} disabled={submitting} className="w-full py-4 bg-[#349DC5] text-white rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Save and Submit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
