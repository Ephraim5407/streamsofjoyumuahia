import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Search, Plus, Check } from "lucide-react";
import toast from "react-hot-toast";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
}

const initialStudents: Student[] = [
  { id: "s1", firstName: "Emeka", lastName: "Okoro", phone: "08086484940" },
  { id: "s2", firstName: "Richard", lastName: "Noel", phone: "07012345678" },
  { id: "s3", firstName: "Carlos", lastName: "Mendez", phone: "09087654321" },
  { id: "s4", firstName: "Fatima", lastName: "Khan", phone: "08023456789" },
  { id: "s5", firstName: "Liam", lastName: "Chibuike", phone: "08123456789" },
];

export default function TakeAttendance() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [students] = useState<Student[]>(initialStudents);
  const [attendance, setAttendance] = useState<Record<string, "present" | "absent">>({});

  const filtered = students.filter(
    (s) =>
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(query.toLowerCase()) ||
      (s.phone && s.phone.includes(query))
  );

  const togglePresent = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAttendance((prev) => ({
      ...prev,
      [id]: prev[id] === "present" ? "absent" : "present",
    }));
  };

  const handleSubmit = () => {
    toast.success("Attendance recorded successfully");
    navigate(-1);
  };

  return (
    <div className="pb-32 max-w-4xl mx-auto px-4 sm:px-6 pt-10">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-3.5 rounded-2xl bg-white dark:bg-[#1a1c1e] shadow-sm border border-gray-100 dark:border-white/5 text-gray-400 hover:text-[#349DC5] transition-all active:scale-95"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#00204a] dark:text-white leading-none">
              Take Attendance
            </h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase mt-2 tracking-widest">
              Record attendance here
            </p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-5 py-3.5 bg-[#349DC5]/10 text-[#349DC5] font-bold rounded-xl hover:bg-[#349DC5]/20 transition-colors uppercase text-xs">
          <Plus size={16} /> Add Member
        </button>
      </header>

      <div className="relative mb-8">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search Members..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full h-14 pl-12 pr-4 bg-white dark:bg-[#1a1c1e] border border-gray-100 dark:border-white/5 rounded-xl shadow-sm text-sm font-medium text-[#00204a] dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-[#349DC5]/30 focus:shadow-md transition-all"
        />
      </div>

      <div className="space-y-3 mb-10">
        {filtered.map((item, idx) => {
          const isPresent = attendance[item.id] === "present";
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={(e: any) => togglePresent(item.id, e)}
              className={`p-5 rounded-xl shadow-sm border transition-all cursor-pointer flex justify-between items-center ${
                isPresent
                  ? "bg-[#349DC5]/5 border-[#349DC5]/30 dark:bg-[#349DC5]/10 dark:border-[#349DC5]/40"
                  : "bg-white dark:bg-[#1a1c1e] border-gray-100 dark:border-white/5 hover:border-[#349DC5]/20"
              }`}
            >
              <div className="flex flex-col">
                <span className="text-base font-bold text-[#00204a] dark:text-white leading-tight">
                  {item.firstName} {item.lastName}
                </span>
                <span className="text-xs font-semibold text-gray-400 mt-1">{item.phone}</span>
              </div>
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  isPresent
                    ? "bg-[#349DC5] text-white shadow-md shadow-[#349DC5]/20"
                    : "bg-gray-100 dark:bg-white/5 text-transparent outline outline-1 outline-gray-200 dark:outline-white/10"
                }`}
              >
                <Check size={20} className={isPresent ? "opacity-100" : "opacity-0"} />
              </div>
            </motion.div>
          );
        })}
      </div>

      <button
        onClick={handleSubmit}
        className="w-full h-16 bg-[#349DC5] text-white font-bold uppercase tracking-widest text-sm rounded-2xl shadow-xl shadow-[#349DC5]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
      >
        <Check size={20} /> Save Attendance Records
      </button>
    </div>
  );
}
