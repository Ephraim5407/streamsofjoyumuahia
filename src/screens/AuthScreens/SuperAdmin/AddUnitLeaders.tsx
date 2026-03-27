import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronDown } from "lucide-react";
const TITLES = ["Mr", "Mrs", "Miss", "Dr", "Pst", "Sir", "Prof"];
interface FormState {
  phone: string;
  title: string;
  firstName: string;
  middleName: string;
  surname: string;
}
export default function AddUnitLeadersScreen() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>({
    phone: "",
    title: "",
    firstName: "",
    middleName: "",
    surname: "",
  });
  const [showTitleDrop, setShowTitleDrop] = useState(false);
  const handleChange = <K extends keyof FormState>(
    name: K,
    value: FormState[K],
  ) => setForm((f) => ({ ...f, [name]: value }));
  return (
    <div className="min-h-screen bg-white dark:bg-[#0f1218] flex flex-col">
      {/* Back button */}
      <div className="px-5 pt-12 pb-2">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft size={28} color="#005c80" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pt-8 pb-28 space-y-4">
        <h2 className="text-lg font-semibold text-center text-[#1E1E1E] dark:text-white mb-1">
          Set Up Other Super Admins
        </h2>
        <p className="text-sm text-center text-[#555] dark:text-gray-400 mb-8">
          Enter the details of additional Super Admins.
        </p>
        {/* Phone */}
        <div>
          <label className="block text-sm text-[#555] dark:text-gray-400 mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            maxLength={11}
            value={form.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            placeholder="Enter an 11 digit valid number"
            className="w-full border border-[#ccc] dark:border-[#444] rounded-lg px-3.5 py-3.5 text-sm text-[#111] dark:text-white bg-[#F9F9F9] dark:bg-[#1e1e1e] outline-none focus:border-[#349DC5] transition-all placeholder:text-[#9ca3af]"
          />
        </div>
        {/* Title */}
        <div className="relative">
          <label className="block text-sm text-[#555] dark:text-gray-400 mb-2">
            Title
          </label>
          <button
            onClick={() => setShowTitleDrop((o) => !o)}
            className="w-full border border-[#ccc] dark:border-[#444] rounded-lg px-3.5 h-12 flex items-center justify-between bg-[#ebebeb] dark:bg-[#1e1e1e] text-sm"
          >
            <span
              className={
                form.title ? "text-[#111] dark:text-white" : "text-[#9ca3af]"
              }
            >
              {form.title || "Title"}
            </span>
            <ChevronDown size={18} className="text-gray-500" />
          </button>
          {showTitleDrop && (
            <div className="absolute z-30 left-0 right-0 mt-1 bg-white dark:bg-[#1e1e1e] border border-[#ccc] dark:border-[#444] rounded-xl shadow">
              {TITLES.map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    handleChange("title", t);
                    setShowTitleDrop(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#e8f5fb] dark:hover:bg-gray-800 transition-colors text-[#111] dark:text-gray-200"
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* First Name */}
        <div>
          <label className="block text-sm text-[#555] dark:text-gray-400 mb-2">
            First Name
          </label>
          <input
            type="text"
            value={form.firstName}
            onChange={(e) => handleChange("firstName", e.target.value)}
            placeholder="First Name"
            className="w-full border border-[#ccc] dark:border-[#444] rounded-lg px-3.5 py-3.5 text-sm text-[#111] dark:text-white bg-[#F9F9F9] dark:bg-[#1e1e1e] outline-none focus:border-[#349DC5] transition-all placeholder:text-[#9ca3af]"
          />
        </div>
        {/* Middle Name */}
        <div>
          <label className="block text-sm text-[#555] dark:text-gray-400 mb-2">
            Middle Name
          </label>
          <input
            type="text"
            value={form.middleName}
            onChange={(e) => handleChange("middleName", e.target.value)}
            placeholder="Middle Name"
            className="w-full border border-[#ccc] dark:border-[#444] rounded-lg px-3.5 py-3.5 text-sm text-[#111] dark:text-white bg-[#F9F9F9] dark:bg-[#1e1e1e] outline-none focus:border-[#349DC5] transition-all placeholder:text-[#9ca3af]"
          />
        </div>
        {/* Surname */}
        <div>
          <label className="block text-sm text-[#555] dark:text-gray-400 mb-2">
            Surname
          </label>
          <input
            type="text"
            value={form.surname}
            onChange={(e) => handleChange("surname", e.target.value)}
            placeholder="Surname"
            className="w-full border border-[#ccc] dark:border-[#444] rounded-lg px-3.5 py-3.5 text-sm text-[#111] dark:text-white bg-[#F9F9F9] dark:bg-[#1e1e1e] outline-none focus:border-[#349DC5] transition-all placeholder:text-[#9ca3af]"
          />
        </div>
      </div>
      {/* Save button */}
      <div className="fixed bottom-0 inset-x-0 p-4 bg-white dark:bg-[#0f1218] border-t border-gray-100 dark:border-[#222]">
        <motion.button
          onClick={() => navigate("/sa/admin-members")}
          whileTap={{ scale: 0.97 }}
          className="w-full h-12 rounded-xl font-semibold text-white text-base"
          style={{ backgroundColor: "#2AA7FF" }}
        >
          Save
        </motion.button>
      </div>
    </div>
  );
}
