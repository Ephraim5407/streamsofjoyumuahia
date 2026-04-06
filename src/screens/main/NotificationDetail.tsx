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
  Mic,
  StopCircle,
} from "lucide-react";
import bgChat from "../../assets/bg_chat.jpg";
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
    Array<{ type: "image" | "file" | "audio"; uri: string; name: string; blob?: Blob }>
  >([]);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [visualData, setVisualData] = useState<number[]>([]);
  const [conversationInfo, setConversationInfo] = useState<Item | null>(initialData);

  const [scope, peerId] = useMemo(() => {
    const parts = convId.split(":") as ["user" | "unit", string];
    return parts;
  }, [convId]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : MediaRecorder.isTypeSupported('audio/webm') 
          ? 'audio/webm' 
          : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
            ? 'audio/ogg;codecs=opus'
            : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      (mediaRecorder as any).dataset = { initialized: 'true', shouldSend: 'false' };
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const metadata = (mediaRecorder as any).dataset;
        if (metadata.handled) return;
        metadata.handled = 'true';

        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        if (audioBlob.size < 1000 && metadata.shouldSend === 'true') {
           // Too short, skip
           return;
        }

        const audioUrl = URL.createObjectURL(audioBlob);
        const ext = mediaRecorder.mimeType.includes('webm') ? 'webm' : mediaRecorder.mimeType.includes('ogg') ? 'ogg' : 'm4a';
        const fileName = `voice_note_${Date.now()}.${ext}`;
        
        const voiceNote = { 
          type: "audio" as const, 
          uri: audioUrl, 
          name: fileName, 
          blob: audioBlob,
          mimeType: mediaRecorder.mimeType 
        };
        
        if (metadata.shouldSend === 'true') {
           await sendInstantVoiceNote(voiceNote);
        } else if (metadata.shouldSend === 'false') {
           setReplyAttachments((prev) => [...prev, voiceNote as any]);
        }
        
        stream.getTracks().forEach((track) => track.stop());
        if (audioCtx.state !== 'closed') audioCtx.close();
        analyserRef.current = null;
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      };

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const updateVisualizer = () => {
        analyser.getByteFrequencyData(dataArray);
        const levels = Array.from(dataArray).map(v => v / 255);
        setVisualData(levels);
        animationFrameRef.current = requestAnimationFrame(updateVisualizer);
      };
      updateVisualizer();

      mediaRecorder.start(100);
      setIsRecording(true);
      setIsLocked(false);
      setRecordDuration(0);
      recordTimerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      toast.error("Microphone access denied or not supported");
    }
  };

  const stopRecording = (shouldSend = false) => {
    if (mediaRecorderRef.current && isRecording) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      (mediaRecorderRef.current as any).dataset.shouldSend = String(shouldSend);
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsLocked(false);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    }
  };

  const sendInstantVoiceNote = async (voiceNote: any) => {
    setSending(true);
    const tempId = "temp-" + Date.now();
    try {
      const payload: any = {
        subject: "",
        text: "",
        attachments: [],
      };
      if (scope === "user") payload.toUserId = peerId;
      else payload.toUnitId = peerId;

      const optimisticMsg: any = {
        _id: tempId,
        from: { _id: meId },
        to: scope === "user" ? { _id: peerId } : undefined,
        toUnit: scope === "unit" ? { _id: peerId } : undefined,
        text: "",
        attachments: [{ url: voiceNote.uri, name: voiceNote.name, type: "file" }],
        reactions: [],
        createdAt: new Date().toISOString(),
        pending: true,
      };
      setMessages((prev) => [...prev, optimisticMsg]);

      const up = await uploadMessageFile(voiceNote);
      if (!up.success || !up.data?.ok || !up.data.url) {
        throw new Error(up.error || "Upload failed");
      }

      payload.attachments = [{
        url: up.data.url,
        name: voiceNote.name,
        type: "audio",
        public_id: up.data.public_id,
        resource_type: up.data.resource_type,
      }];

      const sentRes = await sendMessage(payload);
      if (!sentRes.success || !sentRes.data?.message) {
        throw new Error(sentRes.error || "Broadcast failed");
      }

      const serverMsg = sentRes.data.message;
      setMessages((prev) => prev.map(m => String(m._id) === String(tempId) ? serverMsg : m));
      eventBus.emit("SOJ_MESSAGE", { message: serverMsg });
    } catch (e: any) {
      setMessages((prev) => prev.filter(m => String(m._id) !== String(tempId)));
      toast.error(e.message || "Voice Note Failed");
    } finally {
      setSending(false);
    }
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };
  const loadMessages = useCallback(
    async (isInitial = false) => {
      if (!scope || !peerId) return;
      if (isInitial) setLoading(true);
      try {
        const res = await fetchConversation(scope, peerId);
        const msgs = res?.data?.messages || [];
        setMessages(Array.isArray(msgs) ? msgs : []);
        
        if (res?.data?.conversation) {
          setConversationInfo(res.data.conversation);
        } else if (res?.data?.peer) {
          // Fallback if conversation object is null (new chat)
          setConversationInfo({
            id: convId,
            peer: res.data.peer,
            isUnit: scope === "unit",
            latest: { text: "", createdAt: new Date().toISOString() },
            unread: 0
          });
        }
        try {
          await markRead(scope, peerId);
          eventBus.emit("SOJ_CONVERSATIONS_REFRESH");
        } catch {}
      } catch (e) {
        toast.error("Failed to load conversation");
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
        eventBus.emit("SOJ_MESSAGE", { message: serverMsg });
      }
      setReplyText("");
      setReplyAttachments([]);
      setReplyTo(null);
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
    <div className="h-full flex flex-col bg-gray-50 dark:bg-[#121212] overflow-hidden relative">
      <header className="z-20 bg-white/95 dark:bg-[#1e1e1e]/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 shadow-sm px-4 sm:px-8 h-20 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate(-1)}
            className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl text-gray-400 hover:text-primary transition-all active:scale-95"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-[#349DC5] to-[#00204a] flex items-center justify-center text-white shadow-lg overflow-hidden border-2 border-white dark:border-gray-800">
                {conversationInfo?.peer?.profile?.avatar ||
                conversationInfo?.peer?.avatar ? (
                  <img
                    src={
                      conversationInfo.peer.profile?.avatar ||
                      conversationInfo.peer.avatar
                    }
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-xl font-bold uppercase">
                    {(conversationInfo?.peer?.firstName || conversationInfo?.peer?.name || "U")[0]}
                  </div>
                )}
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-800" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-bold text-[#00204a] dark:text-white leading-tight truncate">
                {conversationInfo?.isUnit
                  ? conversationInfo?.peer?.name
                  : `${conversationInfo?.peer?.firstName || ""} ${conversationInfo?.peer?.surname || ""}`.trim() ||
                    "Chat"}
              </h2>
              <p className="text-[10px] font-bold text-emerald-500 uppercase mt-1 flex items-center gap-1.5">
                Online
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadMessages(true)}
            className="p-2 sm:p-4 rounded-2xl text-gray-400 hover:text-primary transition-all"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : "sm:size-6"} />
          </button>
          <button className="p-2 sm:p-4 rounded-2xl text-gray-400 hover:text-rose-500 transition-all">
            <Trash2 size={20} className="sm:size-6" />
          </button>
        </div>
      </header>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 sm:px-6 pt-4 pb-32 sm:pb-40 hide-scrollbar scroll-smooth relative"
      >
        <div 
          className="fixed inset-0 opacity-[0.08] dark:opacity-[0.05] pointer-events-none z-[1]"
          style={{
            backgroundImage: `url(${bgChat})`,
            backgroundSize: "280px", 
            backgroundRepeat: "repeat",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-white/5 dark:bg-black/5 pointer-events-none" />
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
              isGroup={scope === "unit"}
              onlineIds={onlineIds}
              onReply={setReplyTo}
              onImagePreview={setPreviewUrl}
              onLongPress={(msg) => setMessageAction({ visible: true, msg })}
            />
          ))}
        </div>
      </div>
      <div className="z-30 bg-white/90 dark:bg-[#1e1e1e]/90 backdrop-blur-3xl border-t border-gray-100 dark:border-gray-800 p-4 sm:p-6 lg:p-8 shrink-0">
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
                  ) : a.type === "audio" ? (
                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/40 rounded-xl flex items-center justify-center text-primary">
                       <Mic size={20} />
                    </div>
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
            {isRecording ? (
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex-1 h-16 bg-[#F0F2F5] dark:bg-[#202C33] rounded-[32px] flex items-center px-4 gap-4"
              >
                <button 
                  onClick={() => stopRecording(false)}
                  className="p-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-full transition-all"
                >
                  <Trash2 size={24} />
                </button>
                
                <div className="flex items-center gap-2 flex-1 px-2 border-l border-gray-300 dark:border-gray-700 min-w-0">
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <span className="font-bold text-[#00204a] dark:text-gray-200 text-[13px] tabular-nums">
                      {formatDuration(recordDuration)}
                    </span>
                  </div>
                  
                  {/* Waveform Visualizer */}
                  <div className="flex-1 flex items-center gap-[2px] h-6 px-1 overflow-hidden opacity-50">
                    {visualData.slice(0, 30).map((lvl, i) => (
                      <motion.div
                        key={i}
                        animate={{ height: `${Math.max(15, lvl * 100)}%` }}
                        transition={{ type: "spring", damping: 20, stiffness: 400 }}
                        className="w-[2px] bg-[#349DC5] rounded-full"
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!isLocked ? (
                    <div className="flex items-center gap-1 sm:gap-2 px-1 sm:px-3 text-gray-400">
                       <span className="text-[9px] font-bold uppercase tracking-wider animate-pulse hidden sm:inline">Slide to lock</span>
                       <button 
                        onClick={() => setIsLocked(true)}
                        className="p-2 bg-gray-200 dark:bg-gray-700 rounded-full hover:text-primary transition-all active:scale-125"
                       >
                         <ChevronRight size={16} className="-rotate-90" />
                       </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => stopRecording(true)}
                      className="w-11 h-11 bg-[#349DC5] text-white rounded-full flex items-center justify-center shadow-lg active:scale-95"
                    >
                      <Send size={20} className="ml-0.5" />
                    </button>
                  )}
                </div>
              </motion.div>
            ) : (
              <>
                <div className="flex shrink-0 gap-1.5 sm:gap-2">
                  <label className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 dark:bg-gray-800 rounded-[20px] sm:rounded-[24px] flex items-center justify-center text-gray-400 hover:text-primary cursor-pointer transition-all active:scale-90">
                    <Camera size={20} className="sm:size-[24px]" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, "image")}
                    />
                  </label>
                  <label className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 dark:bg-gray-800 rounded-[20px] sm:rounded-[24px] flex items-center justify-center text-gray-400 hover:text-primary cursor-pointer transition-all active:scale-90">
                    <Paperclip size={20} className="sm:size-[24px]" />
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, "file")}
                    />
                  </label>
                </div>

                <div className="relative flex-1">
                  <textarea
                    placeholder="Type..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    className="w-full h-12 sm:h-16 bg-white dark:bg-[#252525] rounded-[20px] sm:rounded-[24px] border-2 border-gray-100 dark:border-gray-800 focus:border-[#349DC5]/20 outline-none px-4 sm:px-8 py-3 sm:py-5 pr-12 sm:pr-20 font-bold text-sm transition-all resize-none shadow-inner hide-scrollbar overflow-hidden"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  />
                  <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 p-3 text-gray-300 pointer-events-none">
                    <Mic size={18} className="sm:size-[22px] opacity-20" />
                  </div>
                </div>

                {(!replyText.trim() && replyAttachments.length === 0) ? (
                  <button
                    onMouseDown={startRecording}
                    onMouseUp={() => !isLocked && stopRecording(true)}
                    className="w-16 sm:w-20 h-14 sm:h-16 bg-[#00204a] text-white rounded-[20px] sm:rounded-[24px] flex items-center justify-center shadow-lg hover:bg-[#349DC5] transition-all active:scale-95"
                  >
                    <Mic size={22} className="sm:size-[28px]" />
                  </button>
                ) : (
                  <button
                    onClick={handleSend}
                    disabled={sending}
                    className="w-16 sm:w-20 h-14 sm:h-16 bg-[#00204a] text-white rounded-[20px] sm:rounded-[24px] flex items-center justify-center shadow-md shadow-blue-900/40 hover:bg-[#349DC5] transition-all active:scale-95 disabled:opacity-50"
                  >
                    {sending ? (
                      <RefreshCw size={20} className="sm:size-[24px] animate-spin" />
                    ) : (
                      <Send size={20} className="sm:size-[24px]" />
                    )}
                  </button>
                )}
              </>
            )}
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
                Message Options
              </h3>
              <div className="space-y-3">
                <ActionItem
                  icon={Trash2}
                  label="Delete"
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
                  label="Reply"
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
