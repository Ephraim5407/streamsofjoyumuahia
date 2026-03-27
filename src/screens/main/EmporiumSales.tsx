import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Search, Check, ChevronDown, DollarSign } from "lucide-react";

export default function EmporiumSales() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const mockData = [
    { id: 1, name: "Communion", variant: "250ml (Small)", received: 50, sold: 30, cost: 100, price: 150, profit: 1500 },
    { id: 2, name: "Cloths", variant: "2000ml (Small)", received: 70, sold: 90, cost: 1000, price: 150, profit: 1500 },
  ];

  const filtered = useMemo(() => {
    return mockData.filter(item => 
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.variant.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

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
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-8">
        <div className="grid md:grid-cols-2 gap-6 mb-8">
           <div className="bg-white dark:bg-[#1a1c1e] rounded-[40px] p-8 border border-gray-100 dark:border-white/5 shadow-sm">
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Sales for {selectedYear}</p>
             <h3 className="text-4xl font-black text-[#00204a] dark:text-white">₦1,000,000</h3>
           </div>
           <div className="bg-white dark:bg-[#1a1c1e] rounded-[40px] p-8 border border-gray-100 dark:border-white/5 shadow-sm">
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Net Profit for {selectedYear}</p>
             <h3 className="text-4xl font-black text-emerald-500">₦500,000</h3>
           </div>
        </div>

        <div className="relative group mb-8 max-w-2xl mx-auto">
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
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id} className="border-b border-gray-50 dark:border-white/5 hover:bg-gray-50/30 dark:hover:bg-white/[0.01] transition-colors">
                    <td className="px-8 py-6">
                      <p className="text-sm font-bold text-[#00204a] dark:text-white">{item.name}</p>
                      <p className="text-[11px] font-medium text-gray-400 mt-1">{item.variant}</p>
                    </td>
                    <td className="px-8 py-6 text-sm font-bold text-gray-600 dark:text-gray-300">{item.received}</td>
                    <td className="px-8 py-6 text-sm font-bold text-gray-600 dark:text-gray-300">{item.sold}</td>
                    <td className="px-8 py-6 text-sm font-bold text-gray-600 dark:text-gray-300">₦{item.cost}</td>
                    <td className="px-8 py-6 text-sm font-bold text-gray-600 dark:text-gray-300">₦{item.price}</td>
                    <td className="px-8 py-6 text-sm font-bold text-emerald-500 bg-emerald-50/30 dark:bg-emerald-500/10">₦{item.profit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="p-12 text-center">
                <p className="text-sm font-bold text-gray-400">No merchandise found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
