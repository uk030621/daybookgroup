"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import {
  getCurrentSubscription,
  isInstalledApp,
  isIos,
  pushIsSupported,
  registerServiceWorker,
  urlBase64ToUint8Array,
} from "../lib/pushClient";

// Status of notifications on THIS device:
//   loading | unsupported | needs-install | blocked | off | on
export default function PushToggle() {
  const [status, setStatus] = useState("loading");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const wrapperRef = useRef(null);

  // Work out the starting state, and re-sync an existing subscription to the
  // server (so a device that was signed out and back in keeps working).
  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!pushIsSupported()) {
        // iPhones and iPads only allow notifications once the app has been
        // added to the Home Screen.
        if (!cancelled) setStatus(isIos() && !isInstalledApp() ? "needs-install" : "unsupported");
        return;
      }
      try {
        await registerServiceWorker();
        if (Notification.permission === "denied") {
          if (!cancelled) setStatus("blocked");
          return;
        }
        const subscription = await getCurrentSubscription();
        if (subscription && Notification.permission === "granted") {
          await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(subscription.toJSON()),
          }).catch(() => {});
          if (!cancelled) setStatus("on");
        } else if (!cancelled) {
          setStatus("off");
        }
      } catch {
        if (!cancelled) setStatus("unsupported");
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  // Close the panel on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const enable = useCallback(async () => {
    setBusy(true);
    setMessage("");
    try {
      // Must be the first thing awaited, straight from the tap, or some
      // browsers refuse to show the permission prompt.
      const permission = await Notification.requestPermission();
      if (permission === "denied") {
        setStatus("blocked");
        return;
      }
      if (permission !== "granted") {
        setMessage("Permission wasn't given, so notifications are still off.");
        return;
      }

      const keyRes = await fetch("/api/push/public-key", { cache: "no-store" });
      if (!keyRes.ok) {
        setMessage("Notifications aren't set up on the server yet.");
        return;
      }
      const { publicKey } = await keyRes.json();
      const applicationServerKey = urlBase64ToUint8Array(publicKey);

      await registerServiceWorker();
      const registration = await navigator.serviceWorker.ready;

      let subscription;
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      } catch (err) {
        // An older subscription made with a different server key blocks a
        // new one. Clear it and try once more.
        if (err?.name === "InvalidStateError") {
          const stale = await registration.pushManager.getSubscription();
          await stale?.unsubscribe();
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey,
          });
        } else {
          throw err;
        }
      }

      const saveRes = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!saveRes.ok) {
        await subscription.unsubscribe();
        setMessage("Couldn't save this device. Please try again.");
        return;
      }

      setStatus("on");
      setMessage("Notifications are on for this device.");
    } catch (err) {
      setMessage(err?.message || "Something went wrong turning notifications on.");
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);
    setMessage("");
    try {
      const subscription = await getCurrentSubscription();
      if (subscription) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        }).catch(() => {});
        await subscription.unsubscribe();
      }
      setStatus("off");
      setMessage("Notifications are off for this device.");
    } catch (err) {
      setMessage(err?.message || "Couldn't turn notifications off.");
    } finally {
      setBusy(false);
    }
  }, []);

  const sendTest = useCallback(async () => {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      setMessage(
        res.ok
          ? "Test sent — it should appear in a few seconds."
          : data.error || "The test couldn't be sent.",
      );
    } catch {
      setMessage("The test couldn't be sent.");
    } finally {
      setBusy(false);
    }
  }, []);

  if (status === "loading") return null;

  const Icon = status === "on" ? BellRing : status === "off" ? Bell : BellOff;
  const iconColour =
    status === "on"
      ? "text-sage-dark dark:text-sage"
      : "text-ink-faint dark:text-paper/60";

  return (
    <div ref={wrapperRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setMessage("");
        }}
        title="Notifications"
        aria-label="Notifications"
        aria-expanded={open}
        className={`p-2 rounded-md hover:text-ink dark:hover:text-paper hover:bg-ink/5 dark:hover:bg-paper/10 transition ${iconColour}`}
      >
        <Icon className="w-4 h-4" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notification settings"
          className="absolute right-4 sm:right-6 top-full mt-2 w-[calc(100%-2rem)] sm:w-80 z-40 bg-paper dark:bg-dusk-card border border-rule dark:border-dusk-rule rounded-card shadow-cardHover p-4 space-y-3"
        >
          <h2 className="font-display italic text-lg text-ink dark:text-paper">
            Notifications
          </h2>

          {status === "unsupported" && (
            <p className="text-sm text-ink-faint dark:text-paper/60">
              This browser can't show push notifications. Email reminders
              still work as normal.
            </p>
          )}

          {status === "needs-install" && (
            <p className="text-sm text-ink-faint dark:text-paper/60">
              On iPhone and iPad, notifications only work once Daybook is on
              your Home Screen (as a Progressive Web App, or PWA). Tap the
              Share button in Safari, choose{" "}
              <strong>Add to Home Screen</strong>, then open Daybook from
              there and come back to this bell.
            </p>
          )}

          {status === "blocked" && (
            <p className="text-sm text-ink-faint dark:text-paper/60">
              Notifications are blocked for this site. Allow them in your
              browser or phone settings, then reload the page.
            </p>
          )}

          {status === "off" && (
            <>
              <p className="text-sm text-ink-faint dark:text-paper/60">
                Get a notification on this device when a reminder is due.
              </p>
              <button
                type="button"
                onClick={enable}
                disabled={busy}
                className="w-full py-2.5 rounded-md bg-ink dark:bg-paper text-paper dark:text-ink text-sm font-medium hover:opacity-90 disabled:opacity-60 transition"
              >
                {busy ? "Turning on…" : "Turn on notifications"}
              </button>
            </>
          )}

          {status === "on" && (
            <>
              <p className="text-sm text-ink-faint dark:text-paper/60">
                Notifications are on for this device.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={sendTest}
                  disabled={busy}
                  className="flex-1 py-2.5 rounded-md border border-rule dark:border-dusk-rule text-sm font-medium text-ink dark:text-paper hover:bg-ink/5 dark:hover:bg-paper/10 disabled:opacity-60 transition"
                >
                  Send a test
                </button>
                <button
                  type="button"
                  onClick={disable}
                  disabled={busy}
                  className="flex-1 py-2.5 rounded-md border border-rule dark:border-dusk-rule text-sm font-medium text-coral-dark dark:text-coral hover:bg-coral/10 disabled:opacity-60 transition"
                >
                  Turn off
                </button>
              </div>
            </>
          )}

          {message && (
            <p
              role="status"
              className="text-sm text-ink dark:text-paper bg-ink/5 dark:bg-paper/10 rounded-md px-3 py-2"
            >
              {message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
