import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  RefreshCw,
  Trash2,
  X,
  User,
  Mail,
  Clock,
  Send,
  Camera,
  File,
  Paperclip,
  ChevronRight,
  Smile,
  MessageSquare,
} from "lucide-react";
import toast from "react-hot-toast";
import AsyncStorage from "../../utils/AsyncStorage";
import {
  fetchConversation,
  markRead,
  sendMessage,
  uploadMessageFile,
  deleteMessage,
  addReaction,
} from "../../api/messages";
import { eventBus } from "../../utils/eventBus";
import ThreadedMessageItem from "../../components/ThreadedMessageItem";
interface Item {
  id: string;
  latest: { text: string; createdAt: string };
  unread: number;
  peer?: any;
  isUnit: boolean;
  _rawNotification?: any;
}
export default function NotificationDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryParams = new URLSearchParams(location.search);
  const convId = queryParams.get("id") || "";
  const initialData = location.state?.notification as Item;
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [meId, setMeId] = useState("");
  const [onlineIds] = useState<string[]>([]);
  const [replyText, setReplyText] = useState("");
  const [replyAttachments, setReplyAttachments] = useState<
    Array<{ type: "image" | "file"; uri: string; name: string; blob?: Blob }>
  >([]);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [scope, peerId] = useMemo(() => {
    const parts = convId.split(":") as ["user" | "unit", string];
    return parts;
  }, [convId]);
  const loadMessages = useCallback(
    async (isInitial = false) => {
      if (!scope || !peerId) return;
      if (isInitial) setLoading(true);
      try {
        const res = await fetchConversation(scope, peerId);
        const msgs = res?.data?.messages || [];
        setMessages(Array.isArray(msgs) ? msgs : []);
        try {
          await markRead(scope, peerId);
          eventBus.emit("SOJ_CONVERSATIONS_REFRESH");
        } catch {}
      } catch (e) {
        toast.error("Failed to load strategic comms");
      } finally {
        if (isInitial) setLoading(false);
      }
    },
    [scope, peerId],
  );
  useEffect(() => {
    loadMessages(true);
    AsyncStorage.getItem("user").then((raw: string | null) => {
      if (raw) {
        const u = JSON.parse(raw);
        if (u?._id) setMeId(String(u._id));
      }
    });
    const off = eventBus.on("SOJ_MESSAGE", (data: any) => {
      const newMessage = data?.message;
      if (newMessage) {
        const msgScope = newMessage.toUnit ? "unit" : "user";
        const fromMe = String(newMessage.from?._id || newMessage.from) === meId;
        let targetPeerId = "";
        if (msgScope === "unit") {
          targetPeerId = String(newMessage.toUnit?._id || newMessage.toUnit);
        } else {
          targetPeerId = fromMe
            ? String(newMessage.to?._id || newMessage.to)
            : String(newMessage.from?._id || newMessage.from);
        }
        if (scope === msgScope && peerId === targetPeerId) {
          setMessages((prev) => {
            if (prev.some((m) => m._id === newMessage._id)) return prev;
            return [...prev, newMessage];
          });
        }
      } else {
        loadMessages();
      }
    });
    return () => {
      if (off) off();
    };
  }, [loadMessages, scope, peerId, meId]);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);
  const handleSend = async () => {
    if (!replyText.trim() && replyAttachments.length === 0) return;
    setSending(true);
    const tempId = "temp-" + Date.now();
    try {
      const payload: any = {
        subject: "",
        text: replyText.trim(),
        attachments: [],
      };
      if (replyTo?._id) payload.replyTo = replyTo._id;
      if (scope === "user") payload.toUserId = peerId;
      else payload.toUnitId = peerId;
      const optimisticMsg: any = {
        _id: tempId,
        from: { _id: meId },
        to: scope === "user" ? { _id: peerId } : undefined,
        toUnit: scope === "unit" ? { _id: peerId } : undefined,
        text: replyText.trim(),
        attachments: replyAttachments.map((a) => ({
          url: a.uri,
          name: a.name,
          type: a.type,
        })),
        replyTo: replyTo,
        reactions: [],
        createdAt: new Date().toISOString(),
        pending: true,
      };
      setMessages((prev) => [...prev, optimisticMsg]);
      const uploaded = await Promise.all(
        replyAttachments.map(async (a) => {
          try {
            const up = await uploadMessageFile(a as any);
            if (up.success && up.data?.ok && up.data.url)
              return {
                url: up.data.url,
                name: a.name,
                type: a.type,
                public_id: up.data.public_id,
                resource_type: up.data.resource_type,
              };
          } catch {}
          return null;
        }),
      );
      const cleanUploaded = uploaded.filter(Boolean);
      if (cleanUploaded.length > 0) payload.attachments = cleanUploaded;
      const sentRes = await sendMessage(payload);
      const serverMsg = sentRes?.data?.message;
      if (serverMsg) {
        setMessages((prev) => {
          const exists = prev.some(
            (m) => String(m._id) === String(serverMsg._id),
          );
          if (exists)
            return prev.filter((m) => String(m._id) !== String(tempId));
          return prev.map((m) =>
            String(m._id) === String(tempId) ? serverMsg : m,
          );
        });
      }
      setReplyText("");
      setReplyAttachments([]);
      setReplyTo(null);
      eventBus.emit("SOJ_MESSAGE");
    } catch (e) {
      setMessages((prev) =>
        prev.filter((m) => String(m._id) !== String(tempId)),
      );
      toast.error("Transmission relay failure");
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
      setReplyAttachments((prev) => [
        ...prev,
        { type, uri, name: file.name, blob: file },
      ]);
    }
  };
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [messageAction, setMessageAction] = useState<{
    visible: boolean;
    msg?: any;
  }>({ visible: false });
  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-[#121212] overflow-hidden">
      <header className="fixed top-0 inset-x-0 z-20 bg-white dark:bg-[#1e1e1e] border-b border-gray-100 dark:border-gray-800 shadow-sm px-6 h-24 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate(-1)}
            className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl text-gray-400 hover:text-primary transition-all active:scale-95"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg overflow-hidden border-2 border-white dark:border-gray-800">
                {initialData?.peer?.profile?.avatar ||
                initialData?.peer?.avatar ? (
                  <img
                    src={
                      initialData.peer.profile?.avatar ||
                      initialData.peer.avatar
                    }
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={24} />
                )}
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#00204a] dark:text-white uppercase leading-none truncate max-w-[200px] sm:max-w-md">
                {initialData?.isUnit
                  ? initialData?.peer?.name
                  : `${initialData?.peer?.firstName || ""} ${initialData?.peer?.surname || ""}`.trim() ||
                    "Message"}
              </h2>
              <p className="text-[9px] font-bold text-emerald-500 uppercase mt-1.5 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-current" />
                {initialData?.isUnit
                  ? "Chat"
                  : "Direct Encryption Active"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadMessages(true)}
            className="p-4 rounded-2xl text-gray-400 hover:text-primary transition-all"
          >
            <RefreshCw size={24} className={loading ? "animate-spin" : ""} />
          </button>
          <button className="p-4 rounded-2xl text-gray-400 hover:text-rose-500 transition-all">
            <Trash2 size={24} />
          </button>
        </div>
      </header>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 pt-32 pb-40 custom-scrollbar scroll-smooth"
        style={{
          backgroundImage:
            "radial-gradient(rgba(0,32,74,0.02) 1.5px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      >
        <div className="max-w-4xl mx-auto space-y-2">
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-blue-50 dark:bg-gray-800 rounded-[40px] flex items-center justify-center mx-auto mb-6 text-primary/30">
              <Mail size={40} />
            </div>
            <p className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.4em]">
              Archival Thread Synchronized
            </p>
          </div>
          {loading && (
            <div className="flex flex-col gap-8">
              {Array(3)
                .fill(0)
                .map((_, i) => (
                  <div
                    key={i}
                    className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
                  >
                    <div className="w-64 h-24 bg-white/50 dark:bg-gray-800 animate-pulse rounded-[32px]" />
                  </div>
                ))}
            </div>
          )}
          {messages.map((m) => (
            <ThreadedMessageItem
              key={m._id}
              message={m}
              isMine={String(m.from?._id || m.from) === meId}
              onlineIds={onlineIds}
              onReply={setReplyTo}
              onImagePreview={setPreviewUrl}
              onLongPress={(msg) => setMessageAction({ visible: true, msg })}
            />
          ))}
        </div>
      </div>
      <div className="fixed bottom-0 inset-x-0 z-30 bg-white/80 dark:bg-[#1e1e1e]/80 backdrop-blur-3xl border-t border-gray-100 dark:border-gray-800 p-6 sm:p-10">
        <div className="max-w-4xl mx-auto">
          <AnimatePresence>
            {replyTo && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                className="mb-4 p-5 bg-blue-50 dark:bg-blue-900/20 rounded-[28px] border border-blue-100 dark:border-blue-900/30 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-1.5 h-10 bg-primary rounded-full" />
                  <div>
                    <p className="text-[10px] font-bold text-primary uppercase leading-none">
                      Replying to {replyTo.from.firstName}
                    </p>
                    <p className="text-sm font-bold text-gray-500 mt-1.5 line-clamp-1">
                      "{replyTo.text}"
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setReplyTo(null)}
                  className="p-2 bg-white dark:bg-gray-800 rounded-xl text-gray-400 hover:text-rose-500"
                >
                  <X size={18} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          {replyAttachments.length > 0 && (
            <div className="flex flex-wrap gap-4 mb-4">
              {replyAttachments.map((a, i) => (
                <div
                  key={i}
                  className="relative group ring-4 ring-white dark:ring-gray-800 rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-800 p-2 pr-10 flex items-center gap-3"
                >
                  {a.type === "image" ? (
                    <img
                      src={a.uri}
                      className="w-12 h-12 object-cover rounded-xl"
                    />
                  ) : (
                    <File size={24} className="text-primary" />
                  )}
                  <span className="text-[10px] font-bold uppercase text-gray-500 truncate max-w-[120px]">
                    {a.name}
                  </span>
                  <button
                    onClick={() =>
                      setReplyAttachments((prev) =>
                        prev.filter((_, idx) => idx !== i),
                      )
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-rose-500 hover:bg-rose-50 rounded-xl"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="relative flex items-center gap-4">
            <div className="flex shrink-0 gap-2">
              <label className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-[24px] flex items-center justify-center text-gray-400 hover:text-primary cursor-pointer transition-all active:scale-90">
                <Camera size={24} />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileChange(e, "image")}
                />
              </label>
              <label className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-[24px] flex items-center justify-center text-gray-400 hover:text-primary cursor-pointer transition-all active:scale-90">
                <Paperclip size={24} />
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => handleFileChange(e, "file")}
                />
              </label>
            </div>
            <div className="relative flex-1">
              <textarea
                placeholder="Relay strategic intelligence..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="w-full h-16 bg-white dark:bg-[#252525] rounded-[24px] border-2 border-gray-100 dark:border-gray-800 focus:border-primary/20 outline-none px-8 py-5 pr-20 font-bold text-sm transition-all resize-none shadow-inner"
              />
              <button className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-gray-300 hover:text-amber-500 transition-colors">
                <Smile size={24} />
              </button>
            </div>
            <button
              onClick={handleSend}
              disabled={
                sending || (!replyText.trim() && replyAttachments.length === 0)
              }
              className="w-20 h-16 bg-[#00204a] text-white rounded-[24px] flex items-center justify-center shadow-md shadow-blue-900/40 hover:bg-primary transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
            >
              {sending ? (
                <RefreshCw size={24} className="animate-spin" />
              ) : (
                <Send size={24} />
              )}
            </button>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {previewUrl && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl">
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute top-10 right-10 p-4 text-white/50 hover:text-white transition-all"
            >
              <X size={40} />
            </button>
            <img
              src={previewUrl}
              className="max-w-full max-h-full object-contain rounded-3xl shadow-md"
            />
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {messageAction.visible && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMessageAction({ visible: false })}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 40, stiffness: 300 }}
              className="relative w-full max-w-sm bg-white dark:bg-[#1e1e1e] rounded-t-[50px] sm:rounded-[50px] overflow-hidden p-10 pb-12 sm:pb-10 shadow-3xl"
            >
              <div className="w-16 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full mx-auto mb-8 sm:hidden" />
              <h3 className="text-xl font-bold text-[#00204a] dark:text-white uppercase mb-8 border-b border-gray-100 dark:border-gray-800 pb-4">
                Operational Pulse
              </h3>
              <div className="space-y-3">
                <ActionItem
                  icon={Trash2}
                  label="Purge Unit Sequence"
                  color="text-rose-500"
                  onClick={async () => {
                    if (messageAction.msg?._id) {
                      await deleteMessage(messageAction.msg._id);
                      loadMessages();
                    }
                    setMessageAction({ visible: false });
                  }}
                />
                <ActionItem
                  icon={MessageSquare}
                  label="Strategic Reply"
                  onClick={() => {
                    setReplyTo(messageAction.msg);
                    setMessageAction({ visible: false });
                  }}
                />
                <div className="pt-6">
                  <p className="text-[9px] font-bold text-gray-400 uppercase ml-1 mb-4">
                    Quick Reactions
                  </p>
                  <div className="flex flex-wrap gap-4">
                    {["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={async () => {
                          if (messageAction.msg?._id) {
                            await addReaction(messageAction.msg._id, emoji);
                            loadMessages();
                          }
                          setMessageAction({ visible: false });
                        }}
                        className="text-3xl hover:scale-125 transition-transform active:scale-90"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
function ActionItem({
  icon: Icon,
  label,
  color = "text-gray-500",
  onClick,
}: any) {
  return (
    <button
      onClick={onClick}
      className="w-full p-6 bg-gray-50 dark:bg-gray-800/50 rounded-3xl flex items-center justify-between group hover:bg-gray-900 transition-all"
    >
      <div className="flex items-center gap-5">
        <div
          className={`w-12 h-12 rounded-2xl bg-white dark:bg-gray-800 flex items-center justify-center ${color} shadow-sm group-hover:scale-110 transition-transform`}
        >
          <Icon size={24} />
        </div>
        <span className={`text-[11px] font-bold uppercase ${color}`}>
          {label}
        </span>
      </div>
      <ChevronRight size={20} className="text-gray-200" />
    </button>
  );
}
