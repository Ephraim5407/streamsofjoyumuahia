import AsyncStorage from "../utils/AsyncStorage";
import { BASE_URl } from "./users";

export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
};

async function getAuthHeaders() {
  const tok = await AsyncStorage.getItem("token");
  if (!tok) throw new Error("Missing auth token");
  return { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" };
}

export async function listNotifications(): Promise<ApiResponse> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE_URl}/api/notifications`, { headers });
    const json = await res.json();
    if (!res.ok)
      return { success: false, error: json?.message || `HTTP ${res.status}` };
    return { success: true, data: json };
  } catch (e: any) {
    return {
      success: false,
      error: e?.message || "Failed to load notifications",
    };
  }
}

export async function markNotificationRead(id: string): Promise<ApiResponse> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE_URl}/api/notifications/${id}/read`, {
      method: "POST",
      headers,
    });
    const json = await res.json();
    if (!res.ok)
      return { success: false, error: json?.message || `HTTP ${res.status}` };
    return { success: true, data: json };
  } catch (e: any) {
    return {
      success: false,
      error: e?.message || "Failed to mark notification as read",
    };
  }
}
