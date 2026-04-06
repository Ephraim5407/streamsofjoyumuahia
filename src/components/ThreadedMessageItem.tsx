import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  User,
  File,
  MessageSquare,
  ExternalLink,
  Clock,
  MoreVertical,
  Play,
  Pause,
  Volume2,
} from "lucide-react";

interface Message {
  _id: string;
  from: {
    _id: string;
    firstName?: string;
    middleName?: string;
    surname?: string;
    profile?: { avatar?: string };
  };
  to?: { _id: string };
  toUnit?: { _id: string };
  replyTo?: {
    _id: string;
    text: string;
    from: { firstName?: string; surname?: string };
    createdAt: string;
  };
  subject?: string;
  text?: string;
  attachments?: Array<{ url: string; name: string; type: string }>;
  reactions?: Array<{ emoji: string; users: string[] }>;
  createdAt: string;
  pending?: boolean;
}

interface ThreadedMessageItemProps {
  message: Message;
  isMine: boolean;
  isGroup?: boolean;
  onlineIds: string[];
  onLongPress: (message: Message) => void;
  onReply: (message: Message) => void;
  onImagePreview: (url: string) => void;
}

export default function ThreadedMessageItem({
  message,
  isMine,
  isGroup,
  onlineIds,
  onLongPress,
  onReply,
  onImagePreview,
}: ThreadedMessageItemProps) {
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isOnline = onlineIds.includes(message.from._id);

  const formattedTime = (() => {
    if (!message.createdAt) return "";
    const msgDate = new Date(message.createdAt);
    const now = new Date();
    const isToday = now.toDateString() === msgDate.toDateString();
    return isToday
      ? msgDate.toLocaleTimeString("en-NG", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : msgDate.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
  })();

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const toggleAudio = (url: string) => {
    if (!audioRef.current) {
      const audio = new Audio();
      audioRef.current = audio;

      audio.onplay = () => setPlaying(true);
      audio.onpause = () => setPlaying(false);
      audio.onended = () => {
        setPlaying(false);
        setProgress(0);
      };
      audio.onloadedmetadata = () => {
        if (audio.duration && isFinite(audio.duration)) {
          setDuration(audio.duration);
        }
      };
      audio.ontimeupdate = () => {
        setProgress(audio.currentTime);
      };
      audio.onerror = () => {
        setPlaying(false);
        toast.error("Audio format failure or restricted access");
      };
    }

    const audio = audioRef.current;

    if (audio.src !== url) {
      audio.src = url;
      audio.load();
      setProgress(0);
      setDuration(0);
    }

    if (playing) {
      audio.pause();
    } else {
      audio.play().catch((err) => {
        console.error("Playback error:", err);
        setPlaying(false);
        // Fallback: If it was a browser click-to-play issue, try again contextually
        if (err.name === 'NotAllowedError') {
          toast.error("Click again to authorize playback");
        }
      });
    }
  };

  return (
    <div
      className={`flex flex-col mb-8 ${isMine ? "items-end" : "items-start"}`}
    >
      <div
        className={`flex items-end gap-3 max-w-[85%] sm:max-w-[70%] group ${isMine ? "flex-row-reverse" : "flex-row"}`}
      >
        {/* Avatar */}
        {!isMine && isGroup && (
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#349DC5] to-[#00204a] flex items-center justify-center text-white shadow-lg overflow-hidden border-2 border-white dark:border-gray-800">
              {message.from.profile?.avatar ? (
                <img
                  src={message.from.profile.avatar}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={20} />
              )}
            </div>
            <div
              className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 ${isOnline ? "bg-emerald-500" : "bg-gray-300"}`}
            />
          </div>
        )}
        <div
          className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
        >
          {/* Sender Name (if not mine) */}
          {!isMine && isGroup && (
            <span className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1">
              {message.from.firstName} {message.from.surname}
            </span>
          )}
          {/* Message Bubble */}
          <div
            onContextMenu={(e) => {
              e.preventDefault();
              onLongPress(message);
            }}
            className={`relative p-4 rounded-[20px] shadow-sm transition-all hover:shadow-md ${isMine ? "bg-[#349DC5] !text-white rounded-br-lg" : "bg-white dark:bg-[#1e1e1e] text-[#00204a] dark:text-gray-200 border border-gray-100 dark:border-gray-800 rounded-bl-lg"}`}
          >
            {/* Reply Reference */}
            {message.replyTo && (
              <div
                className={`mb-4 p-3 rounded-xl text-xs border-l-4 overflow-hidden bg-opacity-10 ${isMine ? "bg-white/20 border-white/30 !text-white/80" : "bg-gray-100 dark:bg-gray-800 border-blue-500 text-gray-500"}`}
              >
                <p className={`font-bold mb-1 opacity-80 ${isMine ? '!text-white' : ''}`}>
                  @{message.replyTo.from?.firstName || 'Unknown'}
                </p>
                <p className="truncate">{message.replyTo.text}</p>
              </div>
            )}
            {message.subject && (
              <p
                className={`text-sm font-bold uppercase mb-2 ${isMine ? "text-blue-200" : "text-[#349DC5]"}`}
              >
                {message.subject}
              </p>
            )}
            {message.text && (
              <p className={`text-[15px] font-medium leading-relaxed whitespace-pre-wrap ${isMine ? "!text-white" : "text-[#111] dark:text-gray-100"}`}>
                {message.text}
              </p>
            )}
            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-4 space-y-3">
                {message.attachments.map((file, i) => {
                  const isImg =
                    file.type?.startsWith("image") ||
                    /\.(jpg|jpeg|png|gif|webp)$/i.test(file.url);
                  const isAudio =
                    file.type?.startsWith("audio") ||
                    /\.(m4a|mp3|wav|ogg|aac|webm)$/i.test(file.url) ||
                    file.name?.toLowerCase().includes("voice_note");

                  if (isImg) {
                    return (
                      <div
                        key={i}
                        onClick={() => onImagePreview(file.url)}
                        className="relative aspect-video rounded-2xl overflow-hidden bg-black/5 cursor-pointer hover:opacity-90 transition-opacity border border-black/5"
                      >
                        <img
                          src={file.url}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    );
                  }

                  if (isAudio) {
                    return (
                      <div
                        key={i}
                        className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-3xl w-full sm:min-w-[280px] max-w-full ${isMine ? "bg-white/10" : "bg-gray-50/50 dark:bg-gray-800/50"}`}
                      >
                        <button
                          onClick={() => toggleAudio(file.url)}
                          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all shrink-0 shadow-sm ${isMine ? "bg-white text-[#349DC5] hover:scale-110" : "bg-[#349DC5] text-white hover:scale-110"}`}
                        >
                          {playing ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                        </button>
                        <div className="flex-1 space-y-2 min-w-0">
                          <div className="relative h-1.5 sm:h-2 bg-black/5 dark:bg-white/5 rounded-full w-full overflow-hidden">
                             <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
                               transition={{ type: "spring", bounce: 0, duration: 0.2 }}
                               className={`absolute inset-y-0 left-0 ${isMine ? 'bg-white' : 'bg-[#349DC5]'}`}
                             />
                          </div>
                          <div className={`flex justify-between items-center opacity-60 text-[9px] font-black uppercase tracking-tighter ${isMine ? 'text-white' : 'text-[#349DC5]'}`}>
                            <div className="flex items-center gap-2">
                               <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                               <span>Voice Memo Synchronized</span>
                            </div>
                            <Volume2 size={14} />
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <a
                      key={i}
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      className={`flex items-center gap-3 p-3 rounded-xl text-sm transition-colors ${isMine ? "bg-white/10 hover:bg-white/20 text-white" : "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 text-blue-500"}`}
                    >
                      <File size={18} />
                      <span className="truncate flex-1 font-bold">
                        {file.name || "Attachment"}
                      </span>
                      <ExternalLink size={14} className="opacity-40" />
                    </a>
                  );
                })}
              </div>
            )}
            {/* Reactions */}
            {message.reactions && message.reactions.length > 0 && (
              <div
                className={`absolute -bottom-3 flex flex-wrap gap-1 ${isMine ? "right-4" : "left-4"}`}
              >
                {message.reactions.map((r, i) => (
                  <div
                    key={i}
                    className="px-2 py-0.5 bg-white dark:bg-gray-800 rounded-full shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-1.5 animate-in zoom-in-50 duration-300"
                  >
                    <span className="text-sm">{r.emoji}</span>
                    <span className="text-[10px] font-bold text-gray-500">
                      {r.users.length}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {/* Timestamp inside bubble */}
            <div className={`flex items-center gap-2 mt-2 ${isMine ? "justify-end" : "justify-start"}`}>
              <span className={`text-[10px] font-semibold tabular-nums ${isMine ? "!text-white/70" : "text-gray-400"}`}>
                {formattedTime}
              </span>
              {message.pending && (
                <div className={`w-2.5 h-2.5 border-2 border-current border-t-transparent rounded-full animate-spin ${isMine ? 'text-white/50' : 'opacity-50'}`} />
              )}
            </div>
          </div>
          {/* Reply button on hover */}
          <div className={`flex items-center mt-1 ${isMine ? "justify-end mr-1" : "ml-1"}`}>
            <button
              onClick={() => onReply(message)}
              className={`flex items-center gap-1 text-[9px] font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity ${isMine ? "text-[#349DC5]" : "text-blue-500"}`}
            >
              Reply <MessageSquare size={10} />
            </button>
          </div>
        </div>
        {/* Action Trigger for mine */}
        {isMine && (
          <button
            onClick={() => onLongPress(message)}
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-gray-300 hover:text-[#349DC5] transition-colors self-center"
          >
            <MoreVertical size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
