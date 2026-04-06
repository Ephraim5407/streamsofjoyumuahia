import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  RefreshCw,
  Plus,
  User,
  Send,
  Camera,
  File,
  Paperclip,
  Megaphone,
  X,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import AsyncStorage from "../../utils/AsyncStorage";
import { sendMessage, uploadMessageFile } from "../../api/messages";
import { searchUsers, listUnits } from "../../api/search";
interface Option {
  label: string;
  id: string;
  scope: "user" | "unit";
}
export default function ComposeEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = location.state?.prefill;
  const [fromEmail, setFromEmail] = useState("");
  const [to, setTo] = useState("");
  const [toSelection, setToSelection] = useState<Option | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<
    Array<{ type: "image" | "file"; uri: string; name: string; blob?: Blob }>
  >([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem("user").then((raw: string | null) => {
      if (raw) {
        const u = JSON.parse(raw);
        setFromEmail(u?.email || "authenticated.user@soj.org");
      }
    });
    if (prefill) {
      setTo(prefill.label);
      setToSelection({
        scope: prefill.scope,
        id: prefill.id,
        label: prefill.label,
      });
    }
  }, [prefill]);
  const handleSearch = useCallback(async (val: string) => {
    setTo(val);
    setToSelection(null);
    const q = val.trim();
    if (!q || q.length < 2) {
      setOptions([]);
      return;
    }
    setSearching(true);
    try {
      const [users, units] = await Promise.all([searchUsers(q), listUnits({})]);
      const unitOpts: Option[] = (units || [])
        .filter((u: any) =>
          (u?.name || "").toLowerCase().includes(q.toLowerCase()),
        )
        .slice(0, 10)
        .map((u: any) => ({
          label: `${u.name} (Unit)`,
          id: String(u._id),
          scope: "unit",
        }));
      const userOpts: Option[] = (users || []).slice(0, 10).map((u: any) => ({
        label:
          `${u.firstName || ""} ${u.surname || ""}`.trim() ||
          u.email ||
          u.phone,
        id: String(u._id),
        scope: "user",
      }));
      setOptions([...unitOpts, ...userOpts]);
    } catch (e) {
    } finally {
      setSearching(false);
    }
  }, []);
  const handleSend = async () => {
    if (!toSelection) {
      toast.error("Designate a valid recipient");
      return;
    }
    if (!body.trim() && attachments.length === 0) {
      toast.error("Transmission requires content or artifacts");
      return;
    }
    setSending(true);
    try {
      const uploaded: any[] = [];
      for (const a of attachments) {
        try {
          const up = await uploadMessageFile(a as any);
          if (up.success && up.data?.ok && up.data.url) {
            uploaded.push({ url: up.data.url, name: a.name, type: a.type });
          }
        } catch (e) {
          toast.error(`Failed to upload ${a.name}`);
        }
      }
      const payload: any = {
        subject: subject.trim(),
        text: body.trim(),
        attachments: uploaded,
      };
      if (toSelection.scope === "user") payload.toUserId = toSelection.id;
      else payload.toUnitId = toSelection.id;
      const res = await sendMessage(payload);
      if (res.success && res.data?.ok) {
        toast.success("Message sent successfully");
        navigate(-1);
      } else {
        toast.error(res.error || "Dispatch failure");
      }
    } catch (e) {
      toast.error("Communication relay offline");
    } finally {
      setSending(false);
    }
  };
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "image" | "file",
  ) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      const uri = URL.createObjectURL(file);
      setAttachments((prev) => [
        ...prev,
        { type, uri, name: file.name, blob: file },
      ]);
    }
  };
  return (
    <div className="pb-24 max-w-3xl mx-auto px-4 sm:px-6 pt-6 text-[#00204a] dark:text-white">
      <header className="flex items-center justify-between gap-6 mb-8 mt-2">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-95"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">Compose</h1>
        </div>
        <button
          onClick={handleSend}
          disabled={sending}
          className="flex items-center justify-center p-2 text-primary disabled:opacity-50 hover:opacity-80 transition-all active:scale-90"
        >
          {sending ? (
            <RefreshCw className="animate-spin" size={24} />
          ) : (
            <Send size={26} />
          )}
        </button>
      </header>

      <div className="bg-white dark:bg-[#1e1e1e] rounded-3xl shadow-sm border border-gray-100 dark:border-[#333] overflow-hidden">
        <div className="divide-y divide-gray-50 dark:divide-gray-800">
          {/* From */}
          <div className="flex items-center gap-4 px-6 py-4">
            <label className="w-16 text-sm font-medium text-gray-400">From</label>
            <p className="flex-1 text-sm text-gray-500 font-medium truncate">
              {fromEmail}
            </p>
          </div>

          {/* To */}
          <div className="flex items-center gap-4 px-6 py-4 relative">
            <label className="w-16 text-sm font-medium text-gray-400">To</label>
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Type name, email, phone, or unit"
                value={to}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full bg-transparent outline-none text-sm font-medium"
              />
              {searching && (
                <RefreshCw
                  size={14}
                  className="absolute right-0 top-1/2 -translate-y-1/2 animate-spin text-primary"
                />
              )}
              <AnimatePresence>
                {options.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute inset-x-0 top-full mt-2 z-50 bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-xl border border-gray-100 dark:border-[#333] overflow-hidden max-h-60 overflow-y-auto custom-scrollbar"
                  >
                    {options.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setTo(opt.label);
                          setToSelection(opt);
                          setOptions([]);
                        }}
                        className="w-full px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-all border-b border-gray-50 dark:border-gray-800 last:border-none flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${opt.scope === "unit" ? "bg-amber-50 text-amber-500" : "bg-blue-50 text-primary"}`}>
                            {opt.scope === "unit" ? <Megaphone size={16} /> : <User size={16} />}
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{opt.label}</p>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                              {opt.scope === "unit" ? "Unit" : "User"}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Subject */}
          <div className="flex items-center gap-4 px-6 py-4">
            <label className="w-16 text-sm font-medium text-gray-400">Subject</label>
            <input
              type="text"
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm font-medium"
            />
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="px-6 py-4 flex flex-wrap gap-3 bg-gray-50/30 dark:bg-gray-800/10">
              {attachments.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-2 pr-3 bg-white dark:bg-[#252525] rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all"
                >
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center shrink-0">
                    {a.type === "image" ? (
                      <img src={a.uri} className="w-full h-full object-cover" />
                    ) : (
                      <File size={14} className="text-gray-400" />
                    )}
                  </div>
                  <span className="text-[11px] font-medium max-w-[80px] truncate">
                    {a.name}
                  </span>
                  <button
                    onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                    className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-full"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Body */}
          <div className="px-6 py-6">
            <textarea
              placeholder="Compose email"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full min-h-[300px] bg-transparent outline-none text-base leading-relaxed resize-none"
            />
          </div>
        </div>
      </div>

      {/* Attachment Actions */}
      <div className="fixed bottom-8 right-8 flex items-center gap-3">
        <label className="p-4 bg-white dark:bg-[#1e1e1e] rounded-full shadow-lg border border-gray-100 dark:border-[#333] cursor-pointer hover:bg-gray-50 active:scale-95 transition-all text-gray-500">
          <Camera size={22} />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileChange(e, "image")}
          />
        </label>
        <label className="p-4 bg-white dark:bg-[#1e1e1e] rounded-full shadow-lg border border-gray-100 dark:border-[#333] cursor-pointer hover:bg-gray-50 active:scale-95 transition-all text-gray-500">
          <Paperclip size={22} />
          <input
            type="file"
            className="hidden"
            onChange={(e) => handleFileChange(e, "file")}
          />
        </label>
      </div>
    </div>
  );
}
