import AsyncStorage from "../utils/AsyncStorage";
import axios from "axios";
import { BASE_URl } from "./users";

const BASE =
  typeof BASE_URl === "string" && BASE_URl
    ? BASE_URl.replace(/\/$/, "")
    : "https://streamsofjoyumuahia-api-n6na.onrender.com";

export type EventItem = {
  _id: string;
  title: string;
  date?: string;
  venue?: string;
  description?: string;
  tags?: string[];
  unit?: string;
  status?: "Upcoming" | "Past";
};

function coerceDate(val: any): string | undefined {
  if (!val) return undefined;
  if (typeof val === "string") {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString();
  } else if (val instanceof Date) {
    if (!isNaN(val.getTime())) return val.toISOString();
  }
  return undefined;
}

export async function listEvents(): Promise<EventItem[]> {
  try {
    let token = await AsyncStorage.getItem("token");
    if (token && token.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(token);
        token = parsed?.token || parsed?.accessToken || token;
      } catch {}
    }
    const res = await axios.get(BASE + "/api/events", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const arr = res.data?.events || res.data?.data || res.data?.items || [];
    return (arr as any[]).map((raw) => {
      const date = coerceDate(
        raw.date || raw.eventDate || raw.startDate || raw.dateTime,
      );
      return {
        _id: raw._id || raw.id,
        title: raw.title,
        date,
        venue: raw.venue,
        description: raw.description,
        tags: Array.isArray(raw.tags) ? raw.tags : [],
        status: raw.status,
      } as EventItem;
    });
  } catch (e: any) {
    try {
      const status = e?.response?.status;
      const data = e?.response?.data;
      const reqUrl = BASE + "/api/events";
      const tokenDbg = (await AsyncStorage.getItem("token")) || null;
      const masked = tokenDbg
        ? tokenDbg.length > 8
          ? tokenDbg.slice(0, 6) + "..."
          : tokenDbg
        : null;
      console.warn("[api/events] listEvents error", {
        message: e?.message,
        status,
        data,
        url: reqUrl,
        tokenPreview: masked,
      });
    } catch (logErr) {
      console.warn("[api/events] listEvents error", e?.message || e);
    }
    return [];
  }
}

export async function createEvent(payload: any & { unitId?: string }) {
  let token = await AsyncStorage.getItem("token");
  if (token && token.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(token);
      token = parsed?.token || parsed?.accessToken || token;
    } catch {}
  }
  const res = await axios.post(BASE + "/api/events", payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function deleteEvent(id: string) {
  try {
    let token = await AsyncStorage.getItem("token");
    if (token && token.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(token);
        token = parsed?.token || parsed?.accessToken || token;
      } catch {}
    }
    const res = await axios.delete(BASE + "/api/events/" + id, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  } catch (e: any) {
    try {
      const status = e?.response?.status;
      const data = e?.response?.data;
      const reqUrl = BASE + "/api/events/" + id;
      const tokenDbg = (await AsyncStorage.getItem("token")) || null;
      const masked = tokenDbg
        ? tokenDbg.length > 8
          ? tokenDbg.slice(0, 6) + "..."
          : tokenDbg
        : null;
      console.warn("[api/events] deleteEvent error", {
        message: e?.message,
        status,
        data,
        url: reqUrl,
        tokenPreview: masked,
      });
    } catch (logErr) {
      console.warn("[api/events] deleteEvent error", e?.message || e);
    }
    throw e;
  }
}
