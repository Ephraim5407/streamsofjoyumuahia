import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Search, SlidersHorizontal, ChevronRight, UserCircle } from "lucide-react";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  regNo: string;
  className: string;
  phone: string;
}

const initialStudents: Student[] = [
  { id: "s1", firstName: "Emeka", lastName: "Okoro", regNo: "REG001", className: "JSS1", phone: "08086484940" },
  { id: "s2", firstName: "Carlos", lastName: "Mendez", regNo: "REG002", className: "JSS1", phone: "09087654321" },
  { id: "s3", firstName: "Fatima", lastName: "Khan", regNo: "REG003", className: "JSS1", phone: "08023456789" },
  { id: "s4", firstName: "Liam", lastName: "Chibuike", regNo: "REG005", className: "JSS1", phone: "08123456789" },
];

export default function StudentsList() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [students] = useState<Student[]>(initialStudents);

  const filtered = students.filter(
    (s) =>
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(query.toLowerCase()) ||
      (s.phone && s.phone.includes(query))
  );

  return (
    <div className="pb-32 max-w-4xl mx-auto px-4 sm:px-6 pt-10">
      <header className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-3.5 rounded-2xl bg-white dark:bg-[#1a1c1e] shadow-sm border border-gray-100 dark:border-white/5 text-gray-400 hover:text-[#349DC5] transition-all active:scale-95"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[#00204a] dark:text-white leading-none">
            Member List
          </h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase mt-2 tracking-widest">
            {students.length} Total Members
          </p>
        </div>
      </header>

      <div className="flex items-center gap-4 mb-8 relative">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search Members..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-14 pl-12 pr-4 bg-white dark:bg-[#1a1c1e] border border-gray-100 dark:border-white/5 rounded-xl shadow-sm text-sm font-medium text-[#00204a] dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-[#349DC5]/30 focus:shadow-md transition-all"
          />
        </div>
        <button className="w-14 h-14 bg-white dark:bg-[#1a1c1e] shadow-sm border border-gray-100 dark:border-white/5 rounded-xl flex items-center justify-center text-gray-400 hover:text-[#349DC5] transition-colors">
          <SlidersHorizontal size={20} />
        </button>
      </div>

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <UserCircle size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-bold text-[#00204a] dark:text-white mb-2">No results found</h3>
            <p className="text-[11px] font-bold text-gray-400 uppercase">Try a different search query</p>
          </div>
        ) : (
          filtered.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ scale: 1.01 }}
              onClick={() => navigate(`/attendance/record?studentId=${item.id}`)}
              className="bg-white dark:bg-[#1a1c1e] p-5 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 flex items-center justify-between group cursor-pointer"
            >
              <div className="flex flex-col">
                <span className="text-lg font-bold text-[#00204a] dark:text-white leading-tight">
                  {item.firstName} {item.lastName}
                </span>
                <span className="text-xs font-semibold text-gray-400 mt-1">
                  {item.phone} • {item.regNo}
                </span>
                <span className="text-[10px] font-bold text-[#349DC5] uppercase tracking-widest mt-3">
                  View Profile
                </span>
              </div>
              <ChevronRight size={20} className="text-gray-300 group-hover:text-[#349DC5] transition-colors" />
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
