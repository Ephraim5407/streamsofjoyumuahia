/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
self.skipWaiting();
clientsClaim();

type PushDisplayPayload = {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  timestamp?: number;
  vibrate?: number[];
  url?: string;
  sound?: string;
  data?: Record<string, unknown>;
};

function parsePushPayload(event: PushEvent): PushDisplayPayload {
  const fallbackIcon = "/pwa-192x192.png";
  const base: PushDisplayPayload = {
    title: "Streams of Joy",
    body: "",
    icon: fallbackIcon,
    badge: fallbackIcon,
    data: {},
  };
  try {
    if (event.data) {
      const p = event.data.json() as Record<string, unknown>;
      return {
        title: typeof p.title === "string" ? p.title : base.title,
        body: typeof p.body === "string" ? p.body : String(p.body ?? ""),
        icon: typeof p.icon === "string" ? p.icon : fallbackIcon,
        badge: typeof p.badge === "string" ? p.badge : typeof p.icon === "string" ? p.icon : fallbackIcon,
        image: typeof p.image === "string" ? p.image : typeof p.icon === "string" ? p.icon : undefined,
        tag: typeof p.tag === "string" ? p.tag : undefined,
        timestamp: typeof p.timestamp === "number" ? p.timestamp : Date.now(),
        vibrate: Array.isArray(p.vibrate) ? (p.vibrate as number[]) : [100, 50, 100],
        url: typeof p.url === "string" ? p.url : "/home",
        sound: typeof p.sound === "string" ? p.sound : undefined,
        data: p.data && typeof p.data === "object" ? (p.data as Record<string, unknown>) : {},
      };
    }
  } catch {
    try {
      base.body = event.data?.text() ?? "";
    } catch {
      /* ignore */
    }
  }
  base.url = base.url || "/home";
  base.tag =
    base.tag ||
    (typeof base.data?.type === "string"
      ? `soj-${base.data.type}-${Date.now()}`
      : `soj-general-${Date.now()}`);
  base.timestamp = base.timestamp ?? Date.now();
  base.vibrate = base.vibrate?.length ? base.vibrate : [100, 50, 100];
  return base;
}

self.addEventListener("push", (event: PushEvent) => {
  const payload = parsePushPayload(event);
  event.waitUntil(
    (async () => {
      const opts: NotificationOptions & {
        vibrate?: number[];
        timestamp?: number;
        actions?: NotificationAction[];
        renotify?: boolean;
      } = {
        body: payload.body,
        icon: payload.icon,
        badge: payload.badge,
        image: payload.image,
        tag: payload.tag,
        renotify: true,
        timestamp: payload.timestamp,
        vibrate: payload.vibrate,
        silent: false,
        requireInteraction: false,
        data: {
          url: payload.url,
          ...payload.data,
        },
        actions: [{ action: "open", title: "Open" }],
      };

      // Non-standard: some Android Chromium builds honor a sound URL on the notification.
      if (payload.sound) {
        (opts as Record<string, unknown>).sound = payload.sound;
      }

      await self.registration.showNotification(payload.title, opts);

      const clientsArr = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const c of clientsArr) {
        c.postMessage({
          type: "SOJ_PUSH_RECEIVED",
          title: payload.title,
        });
      }
    })(),
  );
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const raw = event.notification.data as Record<string, unknown> | undefined;
  const path =
    typeof raw?.url === "string" && raw.url.startsWith("/")
      ? raw.url
      : "/home";

  event.waitUntil(
    (async () => {
      const url = new URL(path, self.location.origin).href;
      const clientsArr = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const c of clientsArr) {
        if (c.url.startsWith(self.location.origin) && "focus" in c) {
          const client = c as WindowClient;
          await client.focus();
          client.postMessage({ type: "SOJ_NAVIGATE", path });
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
