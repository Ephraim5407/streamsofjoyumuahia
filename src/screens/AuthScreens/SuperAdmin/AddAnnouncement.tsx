import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  ChevronLeft,
  ChevronDown,
  Users,
  Megaphone,
  X,
  Target,
  Send,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { createAnnouncement } from "../../../api/announcements";
import AsyncStorage from "../../../utils/AsyncStorage";

const PRIMARY = "#349DC5";

const TARGET_AUDIENCES = [
  { label: "All Members", value: "all" },
  { label: "Super Admins", value: "superadmins" },
  { label: "Active Users (7 days)", value: "active" },
  { label: "Members Only", value: "members" },
  { label: "Unit Leaders", value: "leaders" },
  { label: "Ministry Admins", value: "ministry" },
];

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

export default function AddAnnouncementScreen() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetAudience, setTargetAudience] = useState("all");
  const [showDropdown, setShowDropdown] = useState(false);
  const [sending, setSending] = useState(false);

  const onSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Please fill in title and message.");
      return;
    }
    setSending(true);
    try {
      const token = await AsyncStorage.getItem("token");
      await createAnnouncement({ title, message, targetAudience });
      toast.success("Announcement broadcasted!");
      navigate(-1);
    } catch (err) {
      toast.error("Deployment failed.");
    } finally {
      setSending(false);
    }
  };

  const selectedAudience = TARGET_AUDIENCES.find((a) => a.value === targetAudience);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f1218] flex flex-col">
      <div className="bg-[#00204a] p-10 pb-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6 text-white">
            <button
              onClick={() => navigate(-1)}
              className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-all active:scale-95"
            >
              <ChevronLeft size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-bold uppercase leading-none mb-2">New Broadcast</h1>
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest leading-none">
                Global Announcement Protocol
              </p>
            </div>
          </div>
          <Megaphone size={28} className="text-[#349DC5] opacity-30" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full px-6 -mt-10 flex-1 pb-32">
        <div className="bg-white dark:bg-[#1a1c1e] p-10 rounded-[40px] shadow-xl border border-gray-100 dark:border-white/5 space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
              Broadcast Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="E.g., Global Prayer Convergence Update"
              className="w-full h-16 px-6 bg-gray-50 dark:bg-white/5 border-none rounded-2xl outline-none focus:ring-4 ring-[#349DC5]/5 text-sm font-bold text-[#00204a] dark:text-white transition-all"
            />
          </div>

          <div className="space-y-3 relative">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
              Target Demographic
            </label>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-full h-16 px-6 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center justify-between group transition-all"
            >
              <div className="flex items-center gap-3">
                <Target size={20} className="text-[#349DC5]" />
                <span className="text-sm font-bold text-[#00204a] dark:text-white">
                  {selectedAudience?.label}
                </span>
              </div>
              <ChevronDown
                size={20}
                className={cn("text-gray-300 transition-transform", showDropdown ? "rotate-180" : "")}
              />
            </button>

            <AnimatePresence>
              {showDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute z-30 left-0 right-0 top-full mt-3 bg-white dark:bg-[#1e1e1e] border border-gray-100 dark:border-white/5 rounded-3xl shadow-2xl overflow-hidden p-3"
                >
                  <div className="grid gap-2">
                    {TARGET_AUDIENCES.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setTargetAudience(opt.value);
                          setShowDropdown(false);
                        }}
                        className={cn(
                          "w-full text-left px-5 py-4 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-between",
                          targetAudience === opt.value
                            ? "bg-[#349DC5] text-white"
                            : "bg-gray-50 dark:bg-white/2 text-gray-400 hover:text-[#349DC5]",
                        )}
                      >
                        {opt.label}
                        {targetAudience === opt.value && <CheckCircle2 size={16} />}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
              Message Content
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Detail the announcement specifications here..."
              rows={8}
              className="w-full bg-gray-50 dark:bg-white/5 border-none rounded-3xl p-6 outline-none focus:ring-4 ring-[#349DC5]/5 text-sm font-medium leading-relaxed text-[#00204a] dark:text-gray-200 transition-all resize-none"
            />
          </div>

          <div className="pt-6">
            <button
              onClick={onSend}
              disabled={sending}
              className="w-full h-16 bg-[#00204a] text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-[#349DC5] transition-all flex items-center justify-center gap-4 active:scale-[0.98] disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <Send size={18} /> Deploy Broadcast
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <footer className="mt-12 py-10 border-t border-gray-100 dark:border-white/5 flex flex-col items-center gap-4 opacity-30">
        <Users size={20} className="text-[#349DC5]" />
        <p className="text-[9px] font-bold uppercase tracking-widest text-[#00204a] dark:text-white">
          STREAMS OF JOY GLOBAL • MISSION COMMS HUB
        </p>
      </footer>
    </div>
  );
}
