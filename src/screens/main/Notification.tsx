import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Search,
  RefreshCw,
  Trash2,
  MessageSquare,
  Megaphone,
  Calendar,
  Plus,
  ChevronRight,
  X,
  User,
  Bell,
} from "lucide-react";
import toast from "react-hot-toast";
import AsyncStorage from "../../utils/AsyncStorage";
import { listConversations, deleteConversation } from "../../api/messages";
import {
  listNotifications,
  markNotificationRead,
} from "../../api/notifications";
import { eventBus, AppEventBus } from "../../utils/eventBus";

interface Item {
  id: string; // key: user:<id> or unit:<id> or notification:<id>
  latest: { text: string; createdAt: string };
  unread: number;
  peer?: any; // user or unit
  isUnit: boolean;
  _rawNotification?: any;
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

function TabButton({ active, label, onClick, icon: Icon }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 h-12 px-6 rounded-xl font-bold text-[10px] uppercase flex items-center justify-center gap-2.5 transition-all text-center",
        active
          ? "bg-[#00204a] text-white shadow-md shadow-blue-900/10"
          : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200",
      )}
    >
      <Icon size={18} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

export default function Notification() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialTab =
    (queryParams.get("tab") as "messages" | "events") || "messages";

  const [items, setItems] = useState<Item[]>([]);
  const [activeTab, setActiveTab] = useState<"messages" | "events">(initialTab);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    visible: boolean;
    item?: Item;
  }>({ visible: false });

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    else setRefreshing(true);
    try {
      const [convRes, notRes] = await Promise.all([
        listConversations(),
        listNotifications(),
      ]);
      if (convRes.success && notRes.success) {
        const notes: Item[] = (notRes.data?.notifications || []).map((n: any) => ({
          id: `notification:${n._id}`,
          latest: {
            text: n.body || n.title || "",
            createdAt: n.createdAt,
          },
          unread: n.read ? 0 : 1,
          isUnit: false,
          _rawNotification: n,
        }));
        const convs: Item[] = convRes.data?.conversations || [];
        let merged: Item[] = [...notes, ...convs];
        merged = merged.filter(
          (item, index, self) => self.findIndex((i) => i.id === item.id) === index,
        );
        merged.sort(
          (a, b) =>
            new Date(b.latest?.createdAt || 0).getTime() -
            new Date(a.latest?.createdAt || 0).getTime(),
        );
        setItems(merged);
      }
    } catch (e) {
      toast.error("Registry synchronization failed");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const off = eventBus.on("SOJ_MESSAGE", () => loadData(true));
    const off2 = AppEventBus.on("refreshNotifications", () => {
      loadData(true);
    });
    return () => {
      off && off();
      off2 && off2();
    };
  }, [loadData]);

  const handleDelete = async (item: Item) => {
    if (item.id.startsWith("notification:")) return;
    setConfirmDelete({ visible: false });
    const [scope, id] = item.id.split(":") as ["user" | "unit", string];
    const res = await deleteConversation(scope, id);
    if (res.success) {
      toast.success("Archival thread purged");
      loadData(true);
    } else {
      toast.error("Thread erasure failed");
    }
  };

  const handlePress = async (item: Item) => {
    if (item.id.startsWith("notification:")) {
      const raw = item._rawNotification;
      if (raw && !raw.read) {
        try {
          await markNotificationRead(raw._id);
          setItems((prev) =>
            prev.map((i) => (i.id === item.id ? { ...i, unread: 0 } : i)),
          );
        } catch {}
      }
      if (
        raw?.type === "announcement" ||
        raw?.type === "event" ||
        raw?.data?.announcementId
      ) {
        setSelectedNote(raw);
      } else {
        const requestedRole = raw?.data?.requestedRole;
        if (requestedRole === "Member") navigate("/approvals");
        else navigate("/approvals");
      }
    } else {
      navigate(`/notifications/detail?id=${encodeURIComponent(item.id)}`, {
        state: { notification: item },
      });
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const isNote = item.id.startsWith("notification:");
      const matchesTab = activeTab === "messages" ? !isNote : isNote;
      const label = item.isUnit
        ? item.peer?.name
        : item.peer?.firstName
          ? `${item.peer.firstName} ${item.peer.surname}`
          : item._rawNotification?.title || "System Notification";
      const matchesSearch =
        label?.toLowerCase().includes(search.toLowerCase()) ||
        item.latest?.text?.toLowerCase().includes(search.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [items, activeTab, search]);

  const fmtTime = (t: string) => {
    const d = new Date(t);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div className="pb-32 max-w-7xl mx-auto px-4 sm:px-6 pt-10">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate(-1)}
            className="p-3.5 rounded-2xl bg-white dark:bg-[#1a1c1e] shadow-sm border border-gray-100 dark:border-white/5 text-gray-400 hover:text-[#349DC5] transition-all active:scale-95"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-[#00204a] dark:text-white leading-none">
              Notifications
            </h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase mt-2">
              Strategic Notifications Feed
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/notifications/compose")}
            className="h-14 px-10 bg-[#00204a] text-white rounded-xl font-bold text-[11px] uppercase flex items-center gap-3 hover:bg-[#349DC5] transition-all shadow active:scale-95"
          >
            <Plus size={18} /> Compose
          </button>
          <button
            onClick={() => loadData(true)}
            className="w-14 h-14 bg-white dark:bg-[#1a1c1e] rounded-xl shadow-sm border border-gray-100 dark:border-white/5 flex items-center justify-center text-gray-400 hover:text-[#349DC5] transition-all"
          >
            <RefreshCw
              size={22}
              className={refreshing ? "animate-spin text-[#349DC5]" : ""}
            />
          </button>
        </div>
      </header>

      <div className="flex gap-3 bg-white/50 dark:bg-white/5 p-2 rounded-2xl border border-gray-100 dark:border-white/5 mb-10 max-w-md">
        <TabButton
          active={activeTab === "messages"}
          onClick={() => setActiveTab("messages")}
          label="COMMUNICATIONS"
          icon={MessageSquare}
        />
        <TabButton
          active={activeTab === "events"}
          onClick={() => setActiveTab("events")}
          label="STRATEGIC FEEDS"
          icon={Bell}
        />
      </div>

      <div className="relative mb-12 group">
        <Search
          className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#349DC5] transition-colors"
          size={20}
        />
        <input
          type="text"
          placeholder="Filter intelligence records..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-16 pl-14 pr-8 bg-white dark:bg-[#1a1c1e] rounded-xl shadow-sm border-2 border-transparent focus:border-[#349DC5]/20 font-bold text-sm outline-none transition-all placeholder:text-gray-300"
        />
      </div>

      <div className="space-y-4">
        {loading ? (
          Array(5)
            .fill(0)
            .map((_, i) => (
              <div
                key={i}
                className="h-28 bg-white/50 dark:bg-white/5 animate-pulse rounded-xl"
              />
            ))
        ) : filteredItems.length > 0 ? (
          filteredItems.map((item) => {
            const isNote = item.id.startsWith("notification:");
            const raw = item._rawNotification;
            const isAnnouncement = isNote && raw?.type === "announcement";
            const isEvent = isNote && raw?.type === "event";
            return (
              <motion.div
                layout
                key={item.id}
                onClick={() => handlePress(item)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (!isNote) setConfirmDelete({ visible: true, item });
                }}
                className={cn(
                  "group cursor-pointer bg-white dark:bg-[#1a1c1e] p-6 rounded-xl shadow-sm border-l-4 border-gray-100 dark:border-white/5 hover:border-[#349DC5] transition-all flex items-center gap-5",
                  isAnnouncement && "border-l-amber-500",
                  isEvent && "border-l-emerald-500",
                )}
              >
                <div
                  className={cn(
                    "w-14 h-14 rounded-xl flex items-center justify-center shrink-0",
                    isAnnouncement
                      ? "bg-amber-50 text-amber-500"
                      : isEvent
                        ? "bg-emerald-50 text-emerald-500"
                        : "bg-blue-50 text-[#349DC5]",
                  )}
                >
                  {isAnnouncement ? (
                    <Megaphone size={24} />
                  ) : isEvent ? (
                    <Calendar size={24} />
                  ) : item.peer?.profile?.avatar ? (
                    <img
                      src={item.peer.profile.avatar}
                      className="w-full h-full object-cover rounded-xl"
                      alt="Avatar"
                    />
                  ) : (
                    <User size={24} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-base font-bold text-[#00204a] dark:text-white truncate leading-none">
                      {isNote
                        ? raw?.title
                        : item.isUnit
                          ? item.peer?.name
                          : `${item.peer?.firstName || ""} ${item.peer?.surname || ""}`}
                    </h3>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tabular-nums">
                      {fmtTime(item.latest.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-gray-500 line-clamp-1">
                    {item.latest.text}
                  </p>
                </div>
                {item.unread > 0 && (
                  <div className="w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[9px] font-bold shadow-sm">
                    {item.unread}
                  </div>
                )}
                <ChevronRight
                  size={18}
                  className="text-gray-200 group-hover:text-[#349DC5] transition-all"
                />
              </motion.div>
            );
          })
        ) : (
          <div className="py-24 text-center">
            <Bell size={48} className="text-gray-200 mx-auto mb-6" />
            <h3 className="text-xl font-bold text-[#00204a] dark:text-white uppercase mb-2">
              Registry Clear
            </h3>
            <p className="text-gray-400 font-bold text-[10px] uppercase">
              No tactical logs detected in this quadrant.
            </p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedNote && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedNote(null)}
              className="absolute inset-0 bg-[#00204a]/70 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-xl bg-white dark:bg-[#1a1c1e] rounded-[32px] overflow-hidden shadow-2xl"
            >
              <div
                className={cn(
                  "p-8 text-white flex items-center justify-between",
                  selectedNote.type === "event" ? "bg-emerald-500" : "bg-amber-500",
                )}
              >
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                    {selectedNote.type === "event" ? (
                      <Calendar size={28} />
                    ) : (
                      <Megaphone size={28} />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold uppercase">
                      {selectedNote.type === "event"
                        ? "Event Discovery"
                        : "High Alert"}
                    </h2>
                    <p className="text-[10px] font-bold opacity-75 uppercase">
                      {fmtTime(selectedNote.createdAt)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedNote(null)}
                  className="p-2 border-2 border-white/20 rounded-xl hover:bg-white/10"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-8 pb-12">
                <h3 className="text-2xl font-bold text-[#00204a] dark:text-white mb-6 leading-tight">
                  {selectedNote.title}
                </h3>
                <p className="text-sm font-medium text-gray-500 leading-relaxed mb-10">
                  {selectedNote.body}
                </p>
                <button
                  onClick={() => setSelectedNote(null)}
                  className={cn(
                    "w-full h-16 rounded-xl font-bold text-xs uppercase text-white shadow-lg active:scale-95 transition-all",
                    selectedNote.type === "event" ? "bg-emerald-600" : "bg-amber-600",
                  )}
                >
                  Acknowledge Message
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDelete.visible && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmDelete({ visible: false })}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div className="relative bg-white dark:bg-[#1a1c1e] p-10 rounded-[32px] shadow-2xl max-w-sm w-full text-center">
              <div className="w-20 h-20 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-8 text-rose-500">
                <Trash2 size={40} />
              </div>
              <h3 className="text-2xl font-bold text-[#00204a] dark:text-white mb-4">
                Purge Comms?
              </h3>
              <p className="text-gray-400 font-bold text-[10px] uppercase leading-relaxed mb-10">
                This will permanently erase all communication logs within this
                sequence.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setConfirmDelete({ visible: false })}
                  className="flex-1 h-12 bg-gray-50 dark:bg-white/5 text-gray-400 rounded-xl font-bold text-[9px] uppercase"
                >
                  Abort
                </button>
                <button
                  onClick={() => confirmDelete.item && handleDelete(confirmDelete.item)}
                  className="flex-1 h-12 bg-rose-500 text-white rounded-xl font-bold text-[9px] uppercase shadow-md active:scale-95 transition-all"
                >
                  Erase Data
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
