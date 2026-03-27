/**
 * EventsAnnouncementsScreen — full web migration
 * Tabs: Events / Announcements
 * Events: list with tags, venue, date, long-press delete → confirm modal
 * Announcements: list with edit (modal) + delete (confirm modal)
 * Refresh, search, optimistic cache updates
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  ChevronLeft,
  Calendar,
  Megaphone,
  Search,
  X,
  MapPin,
  Clock,
  Edit2,
  Trash2,
  Plus,
  ChevronDown,
} from "lucide-react";
import { listEvents, deleteEvent as apiDeleteEvent } from "../../../api/events";
import {
  listAnnouncements,
  updateAnnouncement as apiUpdateAnnouncement,
  deleteAnnouncement as apiDeleteAnnouncement,
} from "../../../api/announcements";
import AsyncStorage from "../../../utils/AsyncStorage";

const PRIMARY = "#349DC5";
const TAG_COLORS = ["#a05eac", "#349DC5", "#3f2691"];
const TARGET_AUDIENCES = [
  { label: "All Members", value: "all" },
  { label: "Super Admins", value: "superadmins" },
  { label: "Active Users (7 days)", value: "active" },
  { label: "Members Only", value: "members" },
  { label: "Unit Leaders", value: "leaders" },
  { label: "Ministry Admins", value: "ministry" },
];

interface EventItem {
  id: string;
  title: string;
  date: string;
  venue?: string;
  description?: string;
  tags?: string[];
  status?: string;
}

interface AnnouncementItem {
  id: string;
  title: string;
  message: string;
  targetAudience?: string;
  date: string;
}

export default function EventsAnnouncementsScreen() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"Events" | "Announcements">(
    "Events",
  );
  const [query, setQuery] = useState("");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Edit modal
  const [editItem, setEditItem] = useState<AnnouncementItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [editAudience, setEditAudience] = useState("");
  const [showAudienceDrop, setShowAudienceDrop] = useState(false);

  // Delete modals
  const [deleteAnnId, setDeleteAnnId] = useState<string | null>(null);
  const [deleteEvId, setDeleteEvId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const mapEvents = (arr: any[]): EventItem[] =>
    arr.map((e) => ({
      id: e._id,
      title: e.title,
      date: e.date ? new Date(e.date).toLocaleString() : "",
      venue: e.venue,
      description: e.description,
      tags: e.tags || [],
      status: e.status || "Upcoming",
    }));

  const mapAnn = (arr: any[]): AnnouncementItem[] =>
    arr.map((a) => ({
      id: a._id,
      title: a.title,
      message: a.body,
      targetAudience: a.targetAudience,
      date: a.createdAt ? new Date(a.createdAt).toLocaleString() : "",
    }));

  const loadAndCache = async () => {
    const [ev, an] = await Promise.allSettled([
      listEvents(),
      listAnnouncements(),
    ]);
    const me = ev.status === "fulfilled" ? mapEvents(ev.value || []) : [];
    const ma = an.status === "fulfilled" ? mapAnn(an.value || []) : [];
    if (me.length || ma.length) {
      setEvents(me);
      setAnnouncements(ma);
      await AsyncStorage.setItem(
        "unitOverview",
        JSON.stringify({ events: me, announcements: ma }),
      );
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem("unitOverview");
        if (stored) {
          const p = JSON.parse(stored);
          setEvents(p.events || []);
          setAnnouncements(p.announcements || []);
        }
        await loadAndCache();
      } catch {}
    })();
  }, []);

  const saveAnn = async (updated: AnnouncementItem[]) => {
    const stored = await AsyncStorage.getItem("unitOverview");
    const p = stored ? JSON.parse(stored) : { events: [], announcements: [] };
    p.announcements = updated;
    await AsyncStorage.setItem("unitOverview", JSON.stringify(p));
    setAnnouncements(updated);
  };

  const openEdit = (item: AnnouncementItem) => {
    setEditItem(item);
    setEditTitle(item.title);
    setEditMessage(item.message);
    setEditAudience(item.targetAudience || "");
  };

  const saveEdit = async () => {
    if (!editItem) return;
    const updated = announcements.map((a) =>
      a.id === editItem.id
        ? {
            ...a,
            title: editTitle,
            message: editMessage,
            targetAudience: editAudience,
          }
        : a,
    );
    await saveAnn(updated);
    apiUpdateAnnouncement(editItem.id, {
      title: editTitle,
      message: editMessage,
      targetAudience: editAudience,
    }).catch(() => {});
    setEditItem(null);
    toast.success("Announcement updated");
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      if (deleteAnnId) {
        const isObjId = /^[0-9a-fA-F]{24}$/.test(deleteAnnId);
        const updated = announcements.filter((a) => a.id !== deleteAnnId);
        await saveAnn(updated);
        if (isObjId) await apiDeleteAnnouncement(deleteAnnId).catch(() => {});
        toast.success("Announcement deleted");
        setDeleteAnnId(null);
      } else if (deleteEvId) {
        const isObjId = /^[0-9a-fA-F]{24}$/.test(deleteEvId);
        const updatedEv = events.filter((e) => e.id !== deleteEvId);
        setEvents(updatedEv);
        const stored = await AsyncStorage.getItem("unitOverview");
        if (stored) {
          const p = JSON.parse(stored);
          p.events = updatedEv;
          await AsyncStorage.setItem("unitOverview", JSON.stringify(p));
        }
        if (isObjId) await apiDeleteEvent(deleteEvId).catch(() => {});
        toast.success("Event deleted");
        setDeleteEvId(null);
      }
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const filteredEvents = events.filter((e) =>
    `${e.title} ${e.venue ?? ""} ${e.description ?? ""}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  const filteredAnn = announcements.filter((a) =>
    `${a.title} ${a.message} ${a.targetAudience ?? ""}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f1218] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-3 border-b border-[#EEF2F5] dark:border-[#222]">
        <button onClick={() => navigate(-1)} className="p-1">
          <ChevronLeft size={24} color={PRIMARY} />
        </button>
        <h1 className="text-base font-semibold text-[#111] dark:text-white flex-1">
          Events &amp; Announcements
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 pt-3 pb-2">
        {(["Events", "Announcements"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === tab ? "text-white shadow-md" : "text-[#349DC5] bg-white dark:bg-[#1e1e1e] border border-[#E2F4FA]"}`}
            style={activeTab === tab ? { backgroundColor: PRIMARY } : {}}
          >
            {tab === "Events" ? <Calendar size={16} /> : <Megaphone size={16} />}
            {tab} (
            {tab === "Events" ? filteredEvents.length : filteredAnn.length})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="px-4 pb-2">
        <div className="flex items-center gap-2 bg-[#f8fafc] dark:bg-[#1e1e1e] border border-[#e2e8f0] dark:border-[#333] rounded-xl px-3 h-10">
          <Search size={18} className="text-[#9ca3af] shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              activeTab === "Events" ? "Find events…" : "Find announcements…"
            }
            className="flex-1 bg-transparent text-sm text-[#111] dark:text-white placeholder:text-[#9ca3af] outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")}>
              <X size={16} className="text-[#9ca3af]" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 pb-28">
        {refreshing && (
          <div className="flex justify-center py-3">
            <div
              className="w-5 h-5 border-2 rounded-full border-t-transparent animate-spin"
              style={{ borderColor: PRIMARY }}
            />
          </div>
        )}

        {/* EVENTS */}
        {activeTab === "Events" &&
          filteredEvents.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-[#1a1a2e] border border-[#E2E8F0] dark:border-[#333] rounded-2xl p-4 shadow-sm"
            >
              <div className="flex items-start gap-3 mb-2">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${PRIMARY}20` }}
                >
                  <Calendar size={20} color={PRIMARY} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#111] dark:text-white">
                    {item.title}
                  </p>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${PRIMARY}20`, color: PRIMARY }}
                  >
                    {item.status}
                  </span>
                </div>
              </div>
              <div className="space-y-1 mb-2">
                <p className="text-xs text-[#6b7280] flex items-center gap-1.5">
                  <Clock size={12} />
                  {item.date}
                </p>
                {item.venue && (
                  <p className="text-xs text-[#6b7280] flex items-center gap-1.5">
                    <MapPin size={12} />
                    {item.venue}
                  </p>
                )}
              </div>
              {item.description && (
                <p className="text-xs text-[#555] dark:text-gray-400 mb-2 line-clamp-2">
                  {item.description}
                </p>
              )}
              {(item.tags ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(item.tags ?? []).map((t, i) => (
                    <span
                      key={t}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                      style={{
                        backgroundColor: TAG_COLORS[i % TAG_COLORS.length],
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-end mt-1">
                <button
                  onClick={() => setDeleteEvId(item.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={14} className="text-red-400" />
                </button>
              </div>
            </div>
          ))}

        {/* ANNOUNCEMENTS */}
        {activeTab === "Announcements" &&
          filteredAnn.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-[#1a1a2e] border border-[#E2E8F0] dark:border-[#333] rounded-2xl p-4 shadow-sm"
            >
              <div className="flex items-start gap-3 mb-2">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${PRIMARY}20` }}
                >
                  <Megaphone size={20} color={PRIMARY} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#111] dark:text-white">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-[#6b7280] flex items-center gap-1">
                    <Clock size={11} />
                    {item.date}
                  </p>
                </div>
              </div>
              <p className="text-xs text-[#555] dark:text-gray-400 mb-2 line-clamp-3">
                {item.message}
              </p>
              {item.targetAudience && (
                <p className="text-[11px] text-[#6b7280] mb-3">
                  👥 {item.targetAudience}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(item)}
                  className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-semibold text-white shadow-sm"
                  style={{ backgroundColor: PRIMARY }}
                >
                  <Edit2 size={13} /> Edit
                </button>
                <button
                  onClick={() => setDeleteAnnId(item.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-semibold text-white bg-[#FF3B30] shadow-sm"
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>
          ))}

        {activeTab === "Events" &&
          filteredEvents.length === 0 &&
          !refreshing && (
            <p className="text-sm text-center text-[#9ca3af] pt-10">
              No events yet.
            </p>
          )}
        {activeTab === "Announcements" &&
          filteredAnn.length === 0 &&
          !refreshing && (
            <p className="text-sm text-center text-[#9ca3af] pt-10">
              No announcements yet.
            </p>
          )}
      </div>

      {/* Add button */}
      <div className="fixed bottom-0 inset-x-0 p-4 bg-white dark:bg-[#0f1218] border-t border-[#EEF2F5] dark:border-[#222]">
        <button
          onClick={() =>
            navigate(
              activeTab === "Events"
                ? "/sa/add-event"
                : "/sa/add-announcement",
            )
          }
          className="w-full h-12 rounded-xl font-semibold text-white flex items-center justify-center gap-2 shadow-md"
          style={{ backgroundColor: PRIMARY }}
        >
          <Plus size={20} /> Add New{" "}
          {activeTab === "Events" ? "Event" : "Announcement"}
        </button>
      </div>

      {/* Edit modal */}
      <AnimatePresence>
        {editItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.88 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.88 }}
              className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-5 w-full max-w-sm shadow-md"
            >
              <h3 className="text-base font-bold text-[#111] dark:text-white mb-4">
                Edit Announcement
              </h3>
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Title"
                className="w-full h-10 border border-[#ddd] dark:border-[#444] rounded-lg px-3 text-sm text-[#111] dark:text-white bg-white dark:bg-[#2a2a2a] outline-none focus:border-[#349DC5] mb-3 placeholder:text-[#9ca3af]"
              />
              <textarea
                value={editMessage}
                onChange={(e) => setEditMessage(e.target.value)}
                placeholder="Message"
                rows={4}
                className="w-full border border-[#ddd] dark:border-[#444] rounded-lg px-3 py-2 text-sm text-[#111] dark:text-white bg-white dark:bg-[#2a2a2a] outline-none focus:border-[#349DC5] mb-3 resize-none placeholder:text-[#9ca3af]"
              />
              {/* Audience */}
              <div className="relative mb-4">
                <button
                  onClick={() => setShowAudienceDrop((o) => !o)}
                  className="w-full h-10 border border-[#ddd] dark:border-[#444] rounded-lg px-3 flex items-center justify-between bg-white dark:bg-[#2a2a2a] text-sm"
                >
                  <span
                    className={
                      editAudience ? "text-[#111] dark:text-white" : "text-[#9ca3af]"
                    }
                  >
                    {TARGET_AUDIENCES.find((a) => a.value === editAudience)
                      ?.label || "Select Target Audience"}
                  </span>
                  <ChevronDown size={16} className="text-gray-400" />
                </button>
                {showAudienceDrop && (
                  <div className="absolute z-10 left-0 right-0 mt-1 bg-white dark:bg-[#2a2a2a] border border-[#ddd] dark:border-[#444] rounded-xl shadow max-h-40 overflow-y-auto">
                    {TARGET_AUDIENCES.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setEditAudience(opt.value);
                          setShowAudienceDrop(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#e8f5fb] dark:hover:bg-gray-800 text-[#111] dark:text-gray-200"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditItem(null)}
                  className="flex-1 h-10 rounded-xl text-sm text-[#555] dark:text-gray-400 bg-[#f1f5f9] dark:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  className="flex-1 h-10 rounded-xl text-sm font-semibold text-white"
                  style={{ backgroundColor: PRIMARY }}
                >
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {(deleteAnnId || deleteEvId) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.88 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.88 }}
              className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-5 w-full max-w-sm shadow-md"
            >
              <div className="flex items-center gap-2 mb-3">
                <Trash2 size={20} color="#FF3B30" />
                <h3 className="text-base font-bold text-[#111] dark:text-white">
                  Confirm Deletion
                </h3>
              </div>
              <p className="text-sm text-[#333] dark:text-gray-300 mb-2 leading-5">
                {deleteAnnId
                  ? "This announcement will be permanently removed."
                  : "This event will be permanently removed from calendars."}
              </p>
              <p className="text-xs text-[#666] dark:text-gray-400 mb-5">
                {deleteAnnId
                  ? `Announcement:"${announcements.find((a) => a.id === deleteAnnId)?.title || "Untitled"}"`
                  : `Event:"${events.find((e) => e.id === deleteEvId)?.title || "Untitled"}"`}
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setDeleteAnnId(null);
                    setDeleteEvId(null);
                  }}
                  disabled={deleting}
                  className="px-5 py-2 text-sm text-[#555] dark:text-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-[#FF3B30] disabled:opacity-60 flex items-center gap-1.5"
                >
                  {deleting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : null}
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
