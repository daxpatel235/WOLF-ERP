"use client";

// Two things only the desktop app can be in the middle of: running on the
// offline snapshot, and having a downloaded update waiting to be applied.
// Both are states the user needs to know about without being interrupted, so
// they share one slim bar pinned to the bottom of the window.
//
// Renders nothing at all on the web.

import { useEffect, useState } from "react";
import { CloudOff, RefreshCw, ArrowUpCircle, Loader2 } from "lucide-react";
import {
  isDesktop,
  subscribeConnectivity,
  recheckConnectivity,
  invoke,
} from "@/lib/desktop";
import { timeAgo } from "@/lib/utils";

export default function DesktopStatus() {
  const [{ online, lastSyncedAt }, setState] = useState({
    online: true,
    lastSyncedAt: 0,
  });
  const [checking, setChecking] = useState(false);
  const [updateVersion, setUpdateVersion] = useState(null);
  const [restarting, setRestarting] = useState(false);

  useEffect(() => {
    if (!isDesktop()) return undefined;
    return subscribeConnectivity(setState);
  }, []);

  useEffect(() => {
    if (!isDesktop()) return undefined;
    let unlisten;
    let cancelled = false;

    import("@tauri-apps/api/event")
      .then(({ listen }) => listen("wolf://update-ready", (e) => setUpdateVersion(e.payload)))
      .then((off) => {
        // The listener may resolve after unmount; drop it immediately if so.
        if (cancelled) off();
        else unlisten = off;
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (unlisten) unlisten();
    };
  }, []);

  if (!isDesktop()) return null;

  async function retry() {
    setChecking(true);
    try {
      await recheckConnectivity();
    } finally {
      setChecking(false);
    }
  }

  async function restart() {
    setRestarting(true);
    try {
      // Calling the process plugin's command directly rather than adding
      // @tauri-apps/plugin-process as a dependency of the web client for one
      // desktop-only button.
      await invoke("plugin:process|restart");
    } catch {
      setRestarting(false);
    }
  }

  if (!online) {
    return (
      <Bar tone="warn">
        <CloudOff className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          <strong className="font-semibold">Offline.</strong>{" "}
          {lastSyncedAt
            ? `Showing your data as it was ${timeAgo(lastSyncedAt)}.`
            : "Showing the last data saved on this device."}{" "}
          Changes can&apos;t be saved until you reconnect.
        </span>
        <button
          type="button"
          onClick={retry}
          disabled={checking}
          className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 font-medium underline-offset-2 hover:underline disabled:opacity-60"
        >
          {checking ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {checking ? "Checking…" : "Try again"}
        </button>
      </Bar>
    );
  }

  if (updateVersion) {
    return (
      <Bar tone="info">
        <ArrowUpCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          <strong className="font-semibold">Version {updateVersion} is ready.</strong>{" "}
          Restart to finish updating — it will also apply on its own next time you
          open Wolf ERP.
        </span>
        <button
          type="button"
          onClick={restart}
          disabled={restarting}
          className="ml-auto shrink-0 rounded-md px-2.5 py-1 font-medium underline-offset-2 hover:underline disabled:opacity-60"
        >
          {restarting ? "Restarting…" : "Restart now"}
        </button>
      </Bar>
    );
  }

  return null;
}

function Bar({ tone, children }) {
  const tones = {
    warn: "bg-amber-100 text-amber-900 border-amber-200",
    info: "bg-blue-100 text-blue-900 border-blue-200",
  };
  return (
    <div
      role="status"
      className={`fixed inset-x-0 bottom-0 z-50 flex items-center gap-2 border-t px-4 py-2 text-sm ${tones[tone]}`}
    >
      {children}
    </div>
  );
}
