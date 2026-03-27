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
    <div className="pb-24 max-w-7xl mx-auto px-4 sm:px-6 pt-6 text-[#00204a] dark:text-white">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-5">
          <button
            onClick={() => navigate(-1)}
            className="p-3 rounded-2xl bg-white dark:bg-[#1e1e1e] shadow-sm border border-gray-100 dark:border-[#333] text-gray-400 hover:text-primary transition-all active:scale-90"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="relative">
            <h1 className="text-3xl font-bold uppercase leading-none">
              Compose Comms
            </h1>
            <p className="text-[10px] font-bold text-[#349DC5] uppercase tracking-[0.3em] mt-2 ml-1 flex items-center gap-2">
              <Send size={12} fill="currentColor" /> Strategic Dispatch
            </p>
          </div>
        </div>
        <button
          onClick={handleSend}
          disabled={sending}
          className="h-14 px-8 bg-[#00204a] text-white rounded-[24px] font-bold text-[11px] uppercase flex items-center gap-3 hover:bg-primary transition-all shadow shadow-blue-900/10 active:scale-95 disabled:opacity-50"
        >
          {sending ? (
            <RefreshCw className="animate-spin" />
          ) : (
            <Send size={18} />
          )}
          DISPATCH INTEL
        </button>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white dark:bg-[#1e1e1e] p-10 rounded-[50px] shadow-sm border border-gray-100 dark:border-[#333] space-y-10">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 relative">
              <label className="w-24 text-[10px] font-bold text-gray-400 uppercase">
                Target
              </label>
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Designate recipient (User or Unit)..."
                  value={to}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800/50 h-16 px-6 rounded-2xl outline-none font-bold text-sm border-2 border-transparent focus:border-primary/20 transition-all"
                />
                {searching && (
                  <RefreshCw
                    size={16}
                    className="absolute right-6 top-1/2 -translate-y-1/2 animate-spin text-primary"
                  />
                )}
                <AnimatePresence>
                  {options.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute inset-x-0 top-full mt-4 z-50 bg-white dark:bg-[#1e1e1e] rounded-[32px] shadow-md border border-gray-100 dark:border-[#333] overflow-hidden max-h-80 overflow-y-auto custom-scrollbar"
                    >
                      {options.map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => {
                            setTo(opt.label);
                            setToSelection(opt);
                            setOptions([]);
                          }}
                          className="w-full p-6 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-all border-b border-gray-50 dark:border-gray-800 last:border-none flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center ${opt.scope === "unit" ? "bg-amber-50 text-amber-500" : "bg-blue-50 text-primary"}`}
                            >
                              {opt.scope === "unit" ? (
                                <Megaphone size={18} />
                              ) : (
                                <User size={18} />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-bold uppercase">
                                {opt.label}
                              </p>
                              <p className="text-[10px] font-bold opacity-30 uppercase">
                                {opt.scope === "unit"
                                  ? "Operational Unit"
                                  : "Personnel"}
                              </p>
                            </div>
                          </div>
                          <Plus
                            size={16}
                            className="text-gray-200 group-hover:text-primary transition-colors"
                          />
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <label className="w-24 text-[10px] font-bold text-gray-400 uppercase">
                Origin
              </label>
              <p className="flex-1 h-16 flex items-center px-6 bg-gray-50/50 dark:bg-gray-800/20 rounded-2xl font-bold text-sm text-gray-400">
                {fromEmail}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <label className="w-24 text-[10px] font-bold text-gray-400 uppercase">
                Subject
              </label>
              <input
                type="text"
                placeholder="Transmission Subject..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="flex-1 bg-gray-50 dark:bg-gray-800/50 h-16 px-6 rounded-2xl outline-none font-bold text-sm border-2 border-transparent focus:border-primary/20 transition-all uppercase"
              />
            </div>
            <div className="pt-4">
              <textarea
                placeholder="Compose strategic intelligence..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full min-h-[400px] bg-gray-50 dark:bg-gray-800/50 p-10 rounded-[40px] outline-none font-medium text-lg border-2 border-transparent focus:border-primary/20 transition-all resize-none leading-relaxed"
              />
            </div>
          </div>
        </div>
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white dark:bg-[#1e1e1e] p-10 rounded-[50px] shadow-sm border border-gray-100 dark:border-[#333]">
            <h3 className="text-sm font-bold uppercase mb-8 flex items-center gap-3">
              <Paperclip size={18} className="text-primary" /> ARTIFACTS
            </h3>
            <div className="space-y-4 mb-8">
              {attachments.length > 0 ? (
                attachments.map((a, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800"
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/50 flex items-center justify-center shrink-0">
                      {a.type === "image" ? (
                        <img
                          src={a.uri}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <File size={20} className="text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold uppercase truncate">
                        {a.name}
                      </p>
                      <p className="text-[8px] font-bold text-gray-400 uppercase">
                        {a.type}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setAttachments((prev) =>
                          prev.filter((_, idx) => idx !== i),
                        )
                      }
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-[10px] font-bold text-gray-300 uppercase text-center py-6 border-2 border-dashed border-gray-50 dark:border-gray-800 rounded-[30px]">
                  No Artifacts Attached
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="h-20 bg-gray-50 dark:bg-gray-800/50 rounded-[24px] flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-primary/5 transition-all text-gray-400 hover:text-primary">
                <Camera size={20} />
                <span className="text-[9px] font-bold uppercase">IMAGE</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileChange(e, "image")}
                />
              </label>
              <label className="h-20 bg-gray-50 dark:bg-gray-800/50 rounded-[24px] flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-primary/5 transition-all text-gray-400 hover:text-primary">
                <File size={20} />
                <span className="text-[9px] font-bold uppercase">FILE</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => handleFileChange(e, "file")}
                />
              </label>
            </div>
          </div>
          <div className="bg-gradient-to-br from-[#00204a] to-[#001530] p-10 rounded-[50px] text-white shadow-md shadow-blue-900/40 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <Sparkles size={140} />
            </div>
            <h3 className="text-xl font-bold uppercase mb-8 flex items-center gap-3 underline decoration-4 underline-offset-8 decoration-blue-500/30">
              Comms Protocol
            </h3>
            <ol className="space-y-6 relative z-10">
              <ProtocolItem
                num="01"
                text="Ensure recipient selection is verified."
              />
              <ProtocolItem
                num="02"
                text="Maintain strategic tone in intelligence relay."
              />
              <ProtocolItem
                num="03"
                text="Attach artifacts for evidentiary support."
              />
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
function ProtocolItem({ num, text }: any) {
  return (
    <div className="flex gap-4">
      <span className="text-[10px] font-bold text-primary opacity-50">
        {num}
      </span>
      <p className="text-[11px] font-bold opacity-70 leading-relaxed uppercase">
        {text}
      </p>
    </div>
  );
}
