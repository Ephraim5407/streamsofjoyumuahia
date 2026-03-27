import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { ChevronLeft, ChevronDown, UserCog } from "lucide-react";
import axios from "axios";
import { BASE_URl } from "../../../api/users";
// @ts-ignore
import AsyncStorage from "@react-native-async-storage/async-storage";
const PRIMARY = "#349DC5";
const TITLES = [
  "Mr",
  "Mrs",
  "Miss",
  "Ms",
  "Dr",
  "Pastor",
  "Bro",
  "Sis",
  "Prof",
  "Engr",
  "Deacon",
  "Deaconess",
];
export default function AddNewSuperAdminScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [surname, setSurname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showTitleDrop, setShowTitleDrop] = useState(false);
  const disabled = !email || !firstName || !surname;
  const onSave = async () => {
    if (disabled) return;
    setLoading(true);
    setError("");
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("No token");
      const resp = await axios.post(
        `${BASE_URl}/api/users/create-super-admin`,
        { email, title, firstName, middleName, surname },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!resp.data.ok) {
        setError(resp.data.message || "Failed");
      } else {
        toast.success("Super admin created successfully!");
        navigate(-1);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e.message || "Failed");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-white dark:bg-[#0f1218] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4 border-b border-[#EEF2F5] dark:border-[#222]">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronLeft size={24} color="#0B2540" />
        </button>
        <h1 className="text-base font-semibold text-[#0B2540] dark:text-white flex-1">
          Set Up Other Super Admins
        </h1>
        <UserCog size={20} color={PRIMARY} />
      </div>
      {/* Form */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 pb-28">
        <p className="text-sm text-[#475569] dark:text-gray-400 mb-2">
          Enter the details of additional Super Admins.
        </p>
        {/* Email */}
        <div>
          <label className="block text-xs font-medium text-[#1E293B] dark:text-gray-300 mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter a valid email address"
            autoCapitalize="off"
            className="w-full h-[50px] border border-[#CBD5E1] dark:border-[#444] rounded-xl px-3.5 text-sm text-[#0F172A] dark:text-white bg-[#F8FAFC] dark:bg-[#1e1e1e] outline-none focus:border-[#349DC5] focus:ring-2 focus:ring-[#349DC5]/20 transition-all placeholder:text-[#94A3B8]"
          />
        </div>
        {/* Title dropdown */}
        <div className="relative">
          <label className="block text-xs font-medium text-[#1E293B] dark:text-gray-300 mb-1.5">
            Title
          </label>
          <button
            onClick={() => setShowTitleDrop((o) => !o)}
            className="w-full h-[50px] border border-[#CBD5E1] dark:border-[#444] rounded-xl px-3.5 flex items-center justify-between bg-[#F8FAFC] dark:bg-[#1e1e1e] text-sm"
          >
            <span
              className={
                title ? "text-[#0F172A] dark:text-white" : "text-[#94A3B8]"
              }
            >
              {title || "Title"}
            </span>
            <ChevronDown size={18} className="text-[#64748B]" />
          </button>
          {showTitleDrop && (
            <div className="absolute z-30 left-0 right-0 mt-1 bg-white dark:bg-[#1e1e1e] border border-[#CBD5E1] dark:border-[#444] rounded-xl shadow max-h-48 overflow-y-auto">
              {TITLES.map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTitle(t);
                    setShowTitleDrop(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#e8f5fb] dark:hover:bg-gray-800 transition-colors ${title === t ? "font-semibold text-[#349DC5]" : "text-[#0F172A] dark:text-gray-200"}`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* First Name */}
        <div>
          <label className="block text-xs font-medium text-[#1E293B] dark:text-gray-300 mb-1.5">
            First Name
          </label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First Name"
            className="w-full h-[50px] border border-[#CBD5E1] dark:border-[#444] rounded-xl px-3.5 text-sm text-[#0F172A] dark:text-white bg-[#F8FAFC] dark:bg-[#1e1e1e] outline-none focus:border-[#349DC5] transition-all placeholder:text-[#94A3B8]"
          />
        </div>
        {/* Middle Name */}
        <div>
          <label className="block text-xs font-medium text-[#1E293B] dark:text-gray-300 mb-1.5">
            Middle Name
          </label>
          <input
            type="text"
            value={middleName}
            onChange={(e) => setMiddleName(e.target.value)}
            placeholder="Middle Name"
            className="w-full h-[50px] border border-[#CBD5E1] dark:border-[#444] rounded-xl px-3.5 text-sm text-[#0F172A] dark:text-white bg-[#F8FAFC] dark:bg-[#1e1e1e] outline-none focus:border-[#349DC5] transition-all placeholder:text-[#94A3B8]"
          />
        </div>
        {/* Surname */}
        <div>
          <label className="block text-xs font-medium text-[#1E293B] dark:text-gray-300 mb-1.5">
            Surname
          </label>
          <input
            type="text"
            value={surname}
            onChange={(e) => setSurname(e.target.value)}
            placeholder="Surname"
            className="w-full h-[50px] border border-[#CBD5E1] dark:border-[#444] rounded-xl px-3.5 text-sm text-[#0F172A] dark:text-white bg-[#F8FAFC] dark:bg-[#1e1e1e] outline-none focus:border-[#349DC5] transition-all placeholder:text-[#94A3B8]"
          />
        </div>
        {error && <p className="text-sm text-[#DC2626]">{error}</p>}
      </div>
      {/* Save button */}
      <div className="fixed bottom-0 inset-x-0 p-4 bg-white dark:bg-[#0f1218] border-t border-[#EEF2F5] dark:border-[#222]">
        <motion.button
          onClick={onSave}
          disabled={disabled || loading}
          whileTap={{ scale: 0.97 }}
          className="w-full h-[54px] rounded-[18px] font-semibold text-base text-white shadow-md disabled:opacity-60"
          style={{ backgroundColor: PRIMARY }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving…
            </span>
          ) : (
            "Save"
          )}
        </motion.button>
      </div>
    </div>
  );
}
