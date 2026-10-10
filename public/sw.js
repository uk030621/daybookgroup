/* Daybook service worker.
 *
 * Handles push notifications only — it deliberately does no offline caching,
 * so it can never serve a stale copy of the app. */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Daybook";
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192x192.png",
    // Same tag = a repeat for the same reminder replaces the earlier
    // notification rather than stacking up.
    tag: data.tag || undefined,
    data: { url: data.url || "/" },
  };

  // Browsers require a visible notification for every push received.
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(
    (event.notification.data && event.notification.data.url) || "/",
    self.location.origin,
  ).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windows) => {
        for (const client of windows) {
          if (client.url.startsWith(self.location.origin) && "focus" in client) {
            return client.focus().then((focused) => {
              if (focused && "navigate" in focused && focused.url !== target) {
                return focused.navigate(target);
              }
              return focused;
            });
          }
        }
        return self.clients.openWindow(target);
      }),
  );
});

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

// The browser occasionally rotates a subscription. Re-subscribe and tell the
// server, so notifications keep arriving without the person doing anything.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keyRes = await fetch("/api/push/public-key", {
          cache: "no-store",
        });
        const { publicKey } = await keyRes.json();
        if (!publicKey) return;
        const subscription = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(subscription.toJSON()),
        });
      } catch {
        // Nothing more we can do from here; the app re-syncs on next open.
      }
    })(),
  );
});
