import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  ChevronLeft,
  Calendar,
  X,
  Megaphone,
  MapPin,
  FileText,
  Tag,
  Bell,
  CheckCircle2,
  Loader2,
  Zap,
  Target,
} from "lucide-react";
import { createEvent } from "../../../api/events";
import AsyncStorage from "../../../utils/AsyncStorage";

const PRIMARY = "#349DC5";

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

export default function AddEventScreen() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [venue, setVenue] = useState("");
  const [description, setDescription] = useState("");
  const [sendReminder, setSendReminder] = useState(true);
  const [eventTypeArray, setEventTypeArray] = useState<string[]>([]);
  const [eventTypeInput, setEventTypeInput] = useState("");
  const [saving, setSaving] = useState(false);

  const addTag = () => {
    const val = eventTypeInput.trim();
    if (!val || eventTypeArray.length >= 3) return;
    setEventTypeArray((prev) =>
      prev.includes(val) ? prev : [...prev, val].slice(0, 3)
    );
    setEventTypeInput("");
  };

  const removeTag = (t: string) =>
    setEventTypeArray((arr) => arr.filter((x) => x !== t));

  const onSave = async () => {
    if (!title.trim()) {
      toast.error("Event title required.");
      return;
    }
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const rawUser = await AsyncStorage.getItem("user");
      let visibility: "ministry" | "church" = "church";
      if (rawUser) {
        try {
          const u = JSON.parse(rawUser);
          if (u?.activeRole === "MinistryAdmin") visibility = "ministry";
        } catch {}
      }

      const finalISO = dateTime ? new Date(dateTime).toISOString() : "";
      await createEvent({
        title,
        venue,
        description,
        date: finalISO,
        eventType: eventTypeArray.join(","),
        tags: eventTypeArray,
        reminder: sendReminder,
        status: "Upcoming",
        visibility,
      });

      toast.success("Event deployment successful!");
      navigate(-1);
    } catch (err) {
      toast.error("Event creation failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f1218] flex flex-col">
      <div className="bg-[#00204a] p-10 pb-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-white">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate(-1)}
              className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-all active:scale-95"
            >
              <ChevronLeft size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-bold uppercase leading-none mb-2">
                Initiate Event
              </h1>
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest leading-none">
                Mission Operational Registry
              </p>
            </div>
          </div>
          <Calendar size={28} className="text-[#349DC5] opacity-30" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full px-6 -mt-10 flex-1 pb-32">
        <div className="bg-white dark:bg-[#1a1c1e] p-10 rounded-[40px] shadow-xl border border-gray-100 dark:border-white/5 space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
              Event Title
            </label>
            <div className="relative group">
              <Zap
                size={20}
                className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#349DC5] transition-colors"
              />
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="E.g., Global Prophetic Encounter"
                className="w-full h-16 pl-16 pr-6 bg-gray-50 dark:bg-white/5 border-none rounded-2xl outline-none focus:ring-4 ring-[#349DC5]/5 text-sm font-bold text-[#00204a] dark:text-white transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                Strategic Schedule
              </label>
              <div className="relative group">
                <Calendar
                  size={20}
                  className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#349DC5] transition-colors"
                />
                <input
                  type="datetime-local"
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  className="w-full h-16 pl-16 pr-6 bg-gray-50 dark:bg-white/5 border-none rounded-2xl outline-none focus:ring-4 ring-[#349DC5]/5 text-sm font-bold text-[#00204a] dark:text-white transition-all"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                Target Venue
              </label>
              <div className="relative group">
                <MapPin
                  size={20}
                  className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#349DC5] transition-colors"
                />
                <input
                  type="text"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="Operational Base"
                  className="w-full h-16 pl-16 pr-6 bg-gray-50 dark:bg-white/5 border-none rounded-2xl outline-none focus:ring-4 ring-[#349DC5]/5 text-sm font-bold text-[#00204a] dark:text-white transition-all"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
              Event Specifications
            </label>
            <div className="relative">
              <FileText
                size={20}
                className="absolute left-6 top-6 text-gray-300"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detail the event objectives and flow..."
                rows={5}
                className="w-full bg-gray-50 dark:bg-white/5 border-none rounded-3xl pl-16 pr-6 py-6 outline-none focus:ring-4 ring-[#349DC5]/5 text-sm font-medium leading-relaxed text-[#00204a] dark:text-gray-200 transition-all resize-none"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
              Mission Tags (Max 3)
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              <AnimatePresence>
                {eventTypeArray.map((t) => (
                  <motion.span
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    key={t}
                    className="inline-flex items-center gap-2 bg-[#349DC5]/10 text-[#349DC5] text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-widest"
                  >
                    {t}
                    <button
                      onClick={() => removeTag(t)}
                      className="hover:text-rose-500"
                    >
                      <X size={12} />
                    </button>
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
            <div className="relative group">
              <Tag
                size={20}
                className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#349DC5] transition-colors"
              />
              <input
                type="text"
                value={eventTypeInput}
                onChange={(e) => setEventTypeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                disabled={eventTypeArray.length >= 3}
                placeholder={
                  eventTypeArray.length >= 3
                    ? "Tags Maxed"
                    : "Press Enter to register tag..."
                }
                className="w-full h-16 pl-16 pr-6 bg-gray-50 dark:bg-white/5 border-none rounded-2xl outline-none focus:ring-4 ring-[#349DC5]/5 text-sm font-bold text-[#00204a] dark:text-white transition-all disabled:opacity-50"
              />
            </div>
          </div>

          <div className="p-6 bg-gray-50 dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/2 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/20 rounded-2xl flex items-center justify-center text-amber-500">
                <Bell size={24} />
              </div>
              <div>
                <h4 className="text-xs font-black text-[#00204a] dark:text-white uppercase">
                  Broadcast Alert
                </h4>
                <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">
                  Alert personnels before launch
                </p>
              </div>
            </div>
            <button
              onClick={() => setSendReminder(!sendReminder)}
              className={cn(
                "w-12 h-6 rounded-full transition-all relative p-1",
                sendReminder ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-800"
              )}
            >
              <div
                className={cn(
                  "w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                  sendReminder ? "ml-6" : "ml-0"
                )}
              />
            </button>
          </div>

          <div className="pt-4">
            <button
              onClick={onSave}
              disabled={saving}
              className="w-full h-16 bg-[#00204a] text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-[#349DC5] transition-all flex items-center justify-center gap-4 active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <CheckCircle2 size={18} /> Establish Event
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <footer className="mt-12 py-10 border-t border-gray-100 dark:border-white/5 flex flex-col items-center gap-4 opacity-30">
        <Target size={20} className="text-[#349DC5]" />
        <p className="text-[9px] font-bold uppercase tracking-widest text-[#00204a] dark:text-white">
          STREAMS OF JOY GLOBAL • MISSION OPS COMMAND
        </p>
      </footer>
    </div>
  );
}
