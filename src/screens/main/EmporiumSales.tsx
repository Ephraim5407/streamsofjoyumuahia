import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Search, Check, ChevronDown, DollarSign, Plus, X, RefreshCw, Trash2, Edit2 } from "lucide-react";
import toast from "react-hot-toast";
import AsyncStorage from "../../utils/AsyncStorage";

interface SaleDoc {
  id: string;
  name: string;
  variant: string;
  received: number;
  sold: number;
  cost: number;
  price: number;
  profit: number;
  date: string;
}

export default function EmporiumSales() {
  const navigate = useNavigate();
  const [items, setItems] = useState<SaleDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SaleDoc | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [variant, setVariant] = useState("");
  const [received, setReceived] = useState<number | "">("");
  const [sold, setSold] = useState<number | "">("");
  const [cost, setCost] = useState<number | "">("");
  const [price, setPrice] = useState<number | "">("");

  const fetchItems = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    else setRefreshing(true);
    try {
      const stored = await AsyncStorage.getItem("mock_emporium_sales");
      if (stored) {
        setItems(JSON.parse(stored));
      } else {
        const initialMock: SaleDoc[] = [
          { id: "1", name: "Communion", variant: "250ml (Small)", received: 50, sold: 30, cost: 100, price: 150, profit: 1500, date: new Date().toISOString() },
          { id: "2", name: "Cloths", variant: "2000ml (Small)", received: 70, sold: 90, cost: 1000, price: 150, profit: 1500, date: new Date().toISOString() },
        ];
        await AsyncStorage.setItem("mock_emporium_sales", JSON.stringify(initialMock));
        setItems(initialMock);
      }
    } catch {
      toast.error("Failed to load emporium records");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const filtered = useMemo(() => {
    return items.filter(item => 
      (item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.variant.toLowerCase().includes(search.toLowerCase())) &&
      new Date(item.date).getFullYear() === selectedYear
    );
  }, [search, items, selectedYear]);

  const totals = useMemo(() => {
    let sales = 0;
    let netProfit = 0;
    filtered.forEach(item => {
      sales += (item.sold * item.price);
      netProfit += item.profit;
    });
    return { sales, netProfit };
  }, [filtered]);

  const resetForm = () => {
    setEditing(null);
    setName("");
    setVariant("");
    setReceived("");
    setSold("");
    setCost("");
    setPrice("");
  };

  const openEdit = (item: SaleDoc) => {
    setEditing(item);
    setName(item.name);
    setVariant(item.variant);
    setReceived(item.received);
    setSold(item.sold);
    setCost(item.cost);
    setPrice(item.price);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!name.trim() || received === "" || cost === "" || price === "") {
      toast.error("Please fill all required fields");
      return;
    }
    setSubmitting(true);
    try {
      const profitCalc = (Number(sold || 0) * Number(price)) - (Number(sold || 0) * Number(cost));
      const payload: SaleDoc = {
        id: editing ? editing.id : Date.now().toString(),
        name, variant,
        received: Number(received),
        sold: Number(sold || 0),
        cost: Number(cost),
        price: Number(price),
        profit: profitCalc,
        date: editing ? editing.date : new Date().toISOString()
      };
      
      let updated = [];
      if (editing) {
        updated = items.map(i => i.id === editing.id ? payload : i);
        toast.success("Record updated");
      } else {
        updated = [payload, ...items];
        toast.success("Merchandise logged");
      }
      
      await AsyncStorage.setItem("mock_emporium_sales", JSON.stringify(updated));
      setItems(updated);
      setShowForm(false);
      resetForm();
    } catch {
      toast.error("Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Remove this merchandise record?")) return;
    try {
      const updated = items.filter(i => i.id !== id);
      await AsyncStorage.setItem("mock_emporium_sales", JSON.stringify(updated));
      setItems(updated);
      toast.success("Record deleted");
    } catch {
      toast.error("Failed to delete record");
    }
  };

  const years = useMemo(() => {
    const ySet = new Set(items.map(i => new Date(i.date).getFullYear()));
    ySet.add(new Date().getFullYear());
    return Array.from(ySet).sort((a,b) => b - a);
  }, [items]);

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0f1113] pb-32">
      {/* Header */}
      <div className="bg-[#00204a] pt-12 sm:pt-16 pb-32 sm:pb-24 px-6 sm:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-20 opacity-10 pointer-events-none">
          <DollarSign size={300} className="text-[#349DC5] -rotate-12" />
        </div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-4 sm:gap-6">
            <button onClick={() => navigate(-1)} className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-2xl bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-95">
              <ArrowLeft size={28} />
            </button>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight leading-[1.1] sm:leading-none">Emporium Sales</h1>
              <div className="flex items-center gap-3 mt-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#349DC5] animate-pulse" />
                <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Financial Records</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => fetchItems(true)} className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center border border-white/10 hover:bg-white/20 transition-all active:scale-95">
              <RefreshCw size={22} className={refreshing ? "animate-spin text-[#349DC5]" : "text-white/60"} />
            </button>
            <button onClick={() => { resetForm(); setShowForm(true); }} className="h-14 px-8 bg-[#349DC5] text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-3 active:scale-95 transition-all shadow-lg shadow-cyan-500/20">
              <Plus size={18} /> Add Merchandise
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-8">
        <div className="flex bg-gray-50 dark:bg-white/5 p-2 rounded-2xl gap-2 w-max mb-6">
          {years.map(y => (
            <button key={y} onClick={() => setSelectedYear(y)}
              className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedYear === y ? "bg-[#00204a] text-white shadow-md" : "text-gray-400 hover:text-gray-600"}`}>
              {y}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
           <div className="bg-white dark:bg-[#1a1c1e] rounded-[40px] p-8 border border-gray-100 dark:border-white/5 shadow-sm">
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Sales for {selectedYear}</p>
             <h3 className="text-4xl font-black text-[#00204a] dark:text-white flex items-center gap-2">
               <span className="text-xl text-gray-400">₦</span>{totals.sales.toLocaleString()}
             </h3>
           </div>
           <div className="bg-white dark:bg-[#1a1c1e] rounded-[40px] p-8 border border-gray-100 dark:border-white/5 shadow-sm">
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Net Profit for {selectedYear}</p>
             <h3 className="text-4xl font-black text-emerald-500 flex items-center gap-2">
               <span className="text-xl text-emerald-500/50">₦</span>{totals.netProfit.toLocaleString()}
             </h3>
           </div>
        </div>

        <div className="relative group mb-8 max-w-3xl mx-auto">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#349DC5] transition-colors" size={24} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by Merchandise name..."
            className="w-full h-20 pl-16 pr-8 bg-white dark:bg-[#1a1c1e] rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 font-bold text-lg outline-none focus:border-[#349DC5]/20 transition-all placeholder:text-gray-300" />
        </div>

        <div className="bg-white dark:bg-[#1a1c1e] rounded-[40px] border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-gray-100 dark:border-white/5">
            <h3 className="text-lg font-black text-[#00204a] dark:text-white uppercase tracking-widest">Merchandise Breakdown</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-white/[0.02]">
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest min-w-[200px]">Item Name</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Qty Received</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Qty Sold</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Cost Price</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Selling Price</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Profit</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id} className="border-b border-gray-50 dark:border-white/5 hover:bg-gray-50/30 dark:hover:bg-white/[0.01] transition-colors cursor-pointer" onClick={() => openEdit(item)}>
                    <td className="px-8 py-6">
                      <p className="text-sm font-bold text-[#00204a] dark:text-white">{item.name}</p>
                      <p className="text-[11px] font-medium text-gray-400 mt-1">{item.variant || "N/A"}</p>
                    </td>
                    <td className="px-8 py-6 text-sm font-bold text-gray-600 dark:text-gray-300">{item.received}</td>
                    <td className="px-8 py-6 text-sm font-bold text-gray-600 dark:text-gray-300">{item.sold}</td>
                    <td className="px-8 py-6 text-sm font-bold text-gray-600 dark:text-gray-300">₦{item.cost.toLocaleString()}</td>
                    <td className="px-8 py-6 text-sm font-bold text-gray-600 dark:text-gray-300">₦{item.price.toLocaleString()}</td>
                    <td className="px-8 py-6 text-sm font-bold text-emerald-500 bg-emerald-50/30 dark:bg-emerald-500/10">₦{item.profit.toLocaleString()}</td>
                    <td className="px-8 py-6">
                      <button onClick={(e) => remove(item.id, e)} className="p-3 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="p-12 flex items-center justify-center min-h-[30vh]">
                 {loading ? <div className="w-8 h-8 rounded-full border-2 border-[#349DC5] border-t-transparent animate-spin" /> : <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No merchandise found.</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowForm(false)} className="absolute inset-0 bg-[#00204a]/80 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl bg-white dark:bg-[#1a1c1e] rounded-[50px] p-12 shadow-2xl overflow-y-auto max-h-[92vh]">
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-3xl font-black text-[#00204a] dark:text-white uppercase">{editing ? "Update Merchandise" : "Add Merchandise"}</h3>
                <button onClick={() => { setShowForm(false); resetForm(); }} className="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center"><X size={20} className="text-gray-400" /></button>
              </div>
              <div className="space-y-5">
                <FieldWrap label="Item Name" required>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Communion" className="w-full h-16 px-5 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold text-lg focus:ring-2 ring-blue-500/20" />
                </FieldWrap>

                <FieldWrap label="Variant/Size (Optional)">
                  <input value={variant} onChange={e => setVariant(e.target.value)} placeholder="e.g. 250ml (Small)" className="w-full h-16 px-5 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold text-lg focus:ring-2 ring-blue-500/20" />
                </FieldWrap>

                <div className="grid grid-cols-2 gap-4">
                  <FieldWrap label="Qty Received" required>
                    <input type="number" min="0" value={received} onChange={e => setReceived(e.target.value === "" ? "" : Number(e.target.value))} placeholder="0" className="w-full h-16 px-5 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold text-lg focus:ring-2 ring-blue-500/20" />
                  </FieldWrap>
                  <FieldWrap label="Qty Sold">
                    <input type="number" min="0" value={sold} onChange={e => setSold(e.target.value === "" ? "" : Number(e.target.value))} placeholder="0" className="w-full h-16 px-5 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold text-lg focus:ring-2 ring-blue-500/20" />
                  </FieldWrap>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FieldWrap label="Cost Price (₦)" required>
                    <input type="number" min="0" value={cost} onChange={e => setCost(e.target.value === "" ? "" : Number(e.target.value))} placeholder="0" className="w-full h-16 px-5 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold text-lg focus:ring-2 ring-blue-500/20" />
                  </FieldWrap>
                  <FieldWrap label="Selling Price (₦)" required>
                    <input type="number" min="0" value={price} onChange={e => setPrice(e.target.value === "" ? "" : Number(e.target.value))} placeholder="0" className="w-full h-16 px-5 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold text-lg focus:ring-2 ring-blue-500/20" />
                  </FieldWrap>
                </div>
                
                <div className="flex gap-4 pt-4">
                  <button onClick={() => { setShowForm(false); resetForm(); }} className="flex-1 h-16 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:text-gray-600 transition-colors">Discard</button>
                  <button onClick={handleSubmit} disabled={submitting} className="flex-[2] h-16 bg-[#349DC5] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-cyan-500/20 disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95 transition-transform">
                    {submitting ? <RefreshCw className="animate-spin" size={18} /> : editing ? "Save Changes" : "Save Record"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FieldWrap({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">
        {label}{required && <span className="text-rose-400 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}
