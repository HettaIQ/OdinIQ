
"use client";

import { useEffect, useRef } from "react";

const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 30 * 1000;
const TAB_HANDOVER_DELAY_MS = 500;

export default function OdinActivityTracker() {
  const lastInteractionRef = useRef(Date.now());

  useEffect(() => {
    let lastHeartbeat = 0;
    let requestInFlight = false;
    let lastReportedActive: boolean | null = null;
    let handoverTimeout: ReturnType<typeof setTimeout> | null = null;

    const channel =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel("odiniq-activity")
        : null;

    function isActive() {
  const visible = document.visibilityState === "visible";
  const focused = document.hasFocus();

  const secondsSinceInteraction = Math.floor(
    (Date.now() - lastInteractionRef.current) / 1000
  );

  console.log("[ODIN TRACKER]", {
    visible,
    focused,
    secondsSinceInteraction,
  });

  return (
    visible &&
    focused &&
    secondsSinceInteraction < 300
  );
}

    function recordInteraction() {
      lastInteractionRef.current = Date.now();
    }

    async function sendHeartbeat(force = false) {
      if (requestInFlight) return;

      const active = isActive();
      const now = Date.now();

      if (
        !force &&
        active === lastReportedActive &&
        now - lastHeartbeat < HEARTBEAT_INTERVAL_MS
      ) {
        return;
      }

      requestInFlight = true;

      try {
        const response = await fetch("/api/odin-activity", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ active }),
        });

        if (response.ok) {
          lastHeartbeat = Date.now();
          lastReportedActive = active;
        }
      } catch (error) {
        console.error(
          "OdinIQ activity heartbeat failed:",
          error
        );
      } finally {
        requestInFlight = false;
      }
    }

    function cancelHandover() {
      if (handoverTimeout !== null) {
        clearTimeout(handoverTimeout);
        handoverTimeout = null;
      }
    }

    function announceActiveTab() {
      cancelHandover();
      channel?.postMessage({ type: "TAB_ACTIVE" });
      void sendHeartbeat(true);
    }

    function scheduleInactiveHeartbeat() {
      cancelHandover();

      handoverTimeout = setTimeout(() => {
        handoverTimeout = null;

        if (!isActive()) {
          void sendHeartbeat(true);
        }
      }, TAB_HANDOVER_DELAY_MS);
    }

    function handleInteraction() {
      const wasIdle = !isActive();

      recordInteraction();

      if (wasIdle) {
        announceActiveTab();
      }
    }

    const events = [
      "pointerdown",
      "keydown",
      "scroll",
      "touchstart",
    ] as const;

    events.forEach((eventName) => {
      window.addEventListener(
        eventName,
        handleInteraction,
        { passive: true }
      );
    });

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        recordInteraction();

        if (document.hasFocus()) {
          announceActiveTab();
        }
      } else {
        scheduleInactiveHeartbeat();
      }
    }

    function handleFocus() {
      recordInteraction();
      announceActiveTab();
    }

    function handleBlur() {
      scheduleInactiveHeartbeat();
    }

    if (channel) {
      channel.onmessage = (event) => {
        if (event.data?.type === "TAB_ACTIVE") {
          cancelHandover();
        }
      };
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    const interval = window.setInterval(() => {
      if (isActive()) {
        void sendHeartbeat();
      } else if (
        document.visibilityState === "visible" &&
        document.hasFocus()
      ) {
        void sendHeartbeat();
      }
    }, HEARTBEAT_INTERVAL_MS);

    if (isActive()) {
      announceActiveTab();
    }

    return () => {
      clearInterval(interval);
      cancelHandover();
      channel?.close();

      events.forEach((eventName) => {
        window.removeEventListener(
          eventName,
          handleInteraction
        );
      });

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  return null;
}
