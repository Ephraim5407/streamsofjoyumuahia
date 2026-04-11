import { BASE_URl } from "../api/users";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

/**
 * Registers the browser for Web Push (VAPID) and stores the subscription on the backend.
 * Set VITE_VAPID_PUBLIC_KEY in the web env and VAPID_* + PUSH_NOTIFICATION_ICON_URL on the server.
 */
export async function registerWebPushSubscription(): Promise<void> {
  const vapid = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (!vapid?.trim()) return;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return;
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid.trim()),
      });
    }
    const json = sub.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;

    const cleanBase = BASE_URl.endsWith("/") ? BASE_URl.slice(0, -1) : BASE_URl;
    const res = await fetch(`${cleanBase}/api/push/web-subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        subscription: {
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        },
      }),
    });
    if (!res.ok) {
      console.warn("[WebPush] Backend registration failed", res.status);
    }
  } catch (e) {
    console.warn("[WebPush] subscribe failed", e);
  }
}
