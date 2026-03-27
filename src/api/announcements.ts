import AsyncStorage from "../utils/AsyncStorage";
import axios from "axios";
import { BASE_URl } from "./users";

const BASE =
  typeof BASE_URl === "string" && BASE_URl
    ? BASE_URl.replace(/\/$/, "")
    : "https://streamsofjoyumuahia-api-n6na.onrender.com";

export type AnnouncementItem = {
  _id: string;
  title: string;
  body: string;
  targetAudience?: string;
  createdAt?: string;
};

export async function listAnnouncements(): Promise<AnnouncementItem[]> {
  try {
    let token = await AsyncStorage.getItem("token");
    if (token && token.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(token);
        token = parsed?.token || parsed?.accessToken || token;
      } catch {}
    }
    const res = await axios.get(BASE + "/api/announcements", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const arr = res.data?.announcements || res.data?.data || [];
    return (arr as any[]).map((a) => ({
      _id: a._id || a.id,
      title: a.title,
      body: a.body || a.message,
      targetAudience: a.targetAudience,
      createdAt: a.createdAt,
    }));
  } catch (e: any) {
    try {
      const status = e?.response?.status;
      const data = e?.response?.data;
      const reqUrl = BASE + "/api/announcements";
      const tokenDbg = (await AsyncStorage.getItem("token")) || null;
      const masked = tokenDbg
        ? tokenDbg.length > 8
          ? tokenDbg.slice(0, 6) + "..."
          : tokenDbg
        : null;
      console.warn("[api/announcements] listAnnouncements error", {
        message: e?.message,
        status,
        data,
        url: reqUrl,
        tokenPreview: masked,
      });
    } catch (logErr) {
      console.warn(
        "[api/announcements] listAnnouncements error",
        e?.message || e,
      );
    }
    return [];
  }
}

export async function createAnnouncement(payload: any) {
  let token = await AsyncStorage.getItem("token");
  if (token && token.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(token);
      token = parsed?.token || parsed?.accessToken || token;
    } catch {}
  }
  const res = await axios.post(BASE + "/api/announcements", payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function updateAnnouncement(id: string, payload: any) {
  let token = await AsyncStorage.getItem("token");
  if (token && token.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(token);
      token = parsed?.token || parsed?.accessToken || token;
    } catch {}
  }
  const res = await axios.put(BASE + `/api/announcements/${id}`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function deleteAnnouncement(id: string) {
  try {
    let token = await AsyncStorage.getItem("token");
    if (token && token.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(token);
        token = parsed?.token || parsed?.accessToken || token;
      } catch {}
    }
    const res = await axios.delete(BASE + `/api/announcements/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  } catch (e: any) {
    try {
      const status = e?.response?.status;
      const data = e?.response?.data;
      const reqUrl = BASE + `/api/announcements/${id}`;
      const tokenDbg = (await AsyncStorage.getItem("token")) || null;
      const masked = tokenDbg
        ? tokenDbg.length > 8
          ? tokenDbg.slice(0, 6) + "..."
          : tokenDbg
        : null;
      console.warn("[api/announcements] deleteAnnouncement error", {
        message: e?.message,
        status,
        data,
        url: reqUrl,
        tokenPreview: masked,
      });
    } catch (logErr) {
      console.warn(
        "[api/announcements] deleteAnnouncement error",
        e?.message || e,
      );
    }
    throw e;
  }
}
