import {
  User,
  File,
  MessageSquare,
  ExternalLink,
  Clock,
  MoreVertical,
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
  onlineIds: string[];
  onLongPress: (message: Message) => void;
  onReply: (message: Message) => void;
  onImagePreview: (url: string) => void;
}
export default function ThreadedMessageItem({
  message,
  isMine,
  onlineIds,
  onLongPress,
  onReply,
  onImagePreview,
}: ThreadedMessageItemProps) {
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
  const isOnline = onlineIds.includes(message.from._id);
  return (
    <div
      className={`flex flex-col mb-8 ${isMine ? "items-end" : "items-start"}`}
    >
      <div
        className={`flex items-end gap-3 max-w-[85%] sm:max-w-[70%] group ${isMine ? "flex-row-reverse" : "flex-row"}`}
      >
        {/* Avatar */}
        {!isMine && (
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg overflow-hidden border-2 border-white dark:border-gray-800">
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
          {!isMine && (
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
            className={`relative p-5 rounded-[28px] shadow-sm transition-all hover:shadow-md ${isMine ? "bg-[#00204a] text-white rounded-br-lg" : "bg-white dark:bg-[#1e1e1e] text-[#00204a] dark:text-gray-200 border border-gray-100 dark:border-gray-800 rounded-bl-lg"}`}
          >
            {/* Reply Reference */}
            {message.replyTo && (
              <div
                className={`mb-4 p-3 rounded-xl text-xs border-l-4 overflow-hidden bg-opacity-10 ${isMine ? "bg-white/20 border-white/30 text-white/70" : "bg-gray-100 dark:bg-gray-800 border-blue-500 text-gray-500"}`}
              >
                <p className="font-bold mb-1 opacity-60">
                  @{message.replyTo.from.firstName}
                </p>
                <p className="truncate">{message.replyTo.text}</p>
              </div>
            )}
            {message.subject && (
              <p
                className={`text-sm font-bold uppercase mb-2 ${isMine ? "text-blue-200" : "text-primary"}`}
              >
                {message.subject}
              </p>
            )}
            {message.text && (
              <p className="text-[15px] font-medium leading-relaxed whitespace-pre-wrap">
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
                  return (
                    <a
                      key={i}
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      className={`flex items-center gap-3 p-3 rounded-xl text-sm transition-colors ${isMine ? "bg-white/10 hover:bg-white/20 text-white" : "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 text-primary"}`}
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
          </div>
          {/* Metadata (Time & Pending) */}
          <div
            className={`flex items-center gap-3 mt-2 ${isMine ? "flex-row-reverse mr-1" : "ml-1"}`}
          >
            <span className="text-[9px] font-bold text-gray-400 uppercase flex items-center gap-1.5">
              <Clock size={10} /> {formattedTime}
            </span>
            {message.pending && (
              <div className="flex items-center gap-1.5 grayscale opacity-50">
                <div className="w-2.5 h-2.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-[9px] font-bold text-primary uppercase">
                  Syncing
                </span>
              </div>
            )}
            {/* Reply Button (visible on hover) */}
            <button
              onClick={() => onReply(message)}
              className={`flex items-center gap-1.5 text-[9px] font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity ${isMine ? "text-primary" : "text-blue-500"}`}
            >
              Reply <MessageSquare size={10} />
            </button>
          </div>
        </div>
        {/* Action Trigger for mine */}
        {isMine && (
          <button
            onClick={() => onLongPress(message)}
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-gray-300 hover:text-primary transition-colors self-center"
          >
            <MoreVertical size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
