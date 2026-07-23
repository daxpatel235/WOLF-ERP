"use client";

// Desktop-only panel: where this installation gets its UI and its data, what it
// has saved for offline use, and which version it is running.
//
// The installer ships one binary for everyone, so the server address has to be
// changeable at runtime — self-hosted teams point it at their own API, and
// developers point it at localhost, without either needing a custom build.
// Renders nothing in a browser tab.

import { useState, useEffect, useCallback } from "react";
import {
  Monitor,
  Globe,
  Server,
  Check,
  Loader2,
  RotateCcw,
  HardDrive,
  Trash2,
  ArrowUpCircle,
  Wifi,
} from "lucide-react";
import { Card, Button, Field, Input } from "@/components/ui/kit";
import { useToast } from "@/components/ui/Toast";
import { invoke, cacheInfo, cacheClear, isDesktop as detectDesktop } from "@/lib/desktop";
import { clearFetchCache } from "@/hooks/useFetch";
import { timeAgo } from "@/lib/utils";

const DEFAULT_API_URL = "https://wolf-erp-api.onrender.com/api";

function formatBytes(n) {
  if (!n) return "0 KB";
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DesktopSettings() {
  const [ready, setReady] = useState(false);
  const [apiUrl, setApiUrl] = useState("");
  const [version, setVersion] = useState("");
  const [webUrl, setWebUrl] = useState("");
  const [liveUi, setLiveUi] = useState(true);
  const [bundled, setBundled] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const toast = useToast();

  const refreshSnapshot = useCallback(async () => {
    setSnapshot(await cacheInfo());
  }, []);

  useEffect(() => {
    if (!detectDesktop()) return;
    setReady(true);
    setVersion(window.__WOLF_VERSION__ || "");
    setWebUrl(window.__WOLF_WEB_URL__ || "");
    // Prefer what the shell actually booted with over any stored value.
    setApiUrl(window.__WOLF_API_URL__ || DEFAULT_API_URL);
    setLiveUi(window.__WOLF_LIVE_UI__ !== false);
    // If this page is being served from tauri.localhost, the app fell back to
    // the copy inside the installer rather than the live site.
    setBundled(location.hostname === "tauri.localhost" || location.protocol === "tauri:");
    void refreshSnapshot();
  }, [refreshSnapshot]);

  if (!ready) return null;

  const saveServer = async () => {
    setSaving(true);
    try {
      await invoke("set_api_url", { url: apiUrl });
      toast.success("Server saved. Restart Wolf ERP to reconnect.");
    } catch (e) {
      toast.error(e.message || "Could not save the server address.");
    } finally {
      setSaving(false);
    }
  };

  const toggleLiveUi = async () => {
    const next = !liveUi;
    setLiveUi(next);
    try {
      await invoke("set_live_ui", { enabled: next });
      toast.success(
        next
          ? "Wolf ERP will load the latest version from the web on next launch."
          : "Wolf ERP will use the version installed on this PC on next launch."
      );
    } catch (e) {
      setLiveUi(!next);
      toast.error(e.message || "Could not change where the app loads from.");
    }
  };

  const clearSnapshot = async () => {
    const removed = await cacheClear();
    // The offline snapshot on disk is only half of what's saved — the instant
    // cache the UI actually paints from lives in this window. Clearing one and
    // not the other would leave the same figures on screen right after the user
    // was told they'd been cleared.
    clearFetchCache();
    await refreshSnapshot();
    toast.success(
      removed ? `Cleared ${removed} saved page(s).` : "There was nothing saved."
    );
  };

  const checkUpdates = async () => {
    setChecking(true);
    try {
      const found = await invoke("check_updates_now");
      toast.success(
        found
          ? `Version ${found} downloaded — restart to finish updating.`
          : "You're on the latest version."
      );
    } catch (e) {
      toast.error(e.message || "Could not check for updates.");
    } finally {
      setChecking(false);
    }
  };

  const openWeb = async () => {
    try {
      await invoke("open_external", { url: webUrl });
    } catch {
      window.open(webUrl, "_blank");
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-1">
        <Monitor size={16} className="text-fg-muted" />
        <h2 className="font-bold text-fg">Desktop app</h2>
        {version && (
          <span className="text-xs font-semibold text-fg-muted bg-surface-2 rounded-full px-2 py-0.5">
            v{version}
          </span>
        )}
      </div>
      <p className="text-sm text-fg-muted mb-5">
        This app and the Wolf ERP website share one backend, so your workspace and
        data are the same in both.
      </p>

      {/* Where the interface comes from */}
      <div className="rounded-lg border border-border p-4 mb-4">
        <div className="flex items-start gap-3">
          <Wifi size={16} className="text-fg-muted mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-fg">Always use the latest version</p>
            <p className="text-sm text-fg-muted mt-0.5">
              Loads the interface from the Wolf ERP website each time it opens, so
              improvements arrive without reinstalling. Turn this off to stay on
              the version installed on this PC.
            </p>
            <p className="text-xs text-fg-muted mt-2">
              Currently running:{" "}
              <span className="font-semibold text-fg">
                {bundled ? "the version installed on this PC" : "the latest from the web"}
              </span>
              {bundled && liveUi && " — the website couldn't be reached at startup"}
            </p>
          </div>
          <Button variant={liveUi ? "primary" : "ghost"} onClick={toggleLiveUi}>
            {liveUi ? "On" : "Off"}
          </Button>
        </div>
      </div>

      {/* Offline snapshot */}
      <div className="rounded-lg border border-border p-4 mb-4">
        <div className="flex items-start gap-3">
          <HardDrive size={16} className="text-fg-muted mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-fg">Offline copy of your data</p>
            <p className="text-sm text-fg-muted mt-0.5">
              Everything you view is saved to this PC so Wolf ERP still opens and
              shows your latest figures with no internet. It&apos;s read-only —
              changes need a connection.
            </p>
            {snapshot ? (
              <>
                <p className="text-xs text-fg-muted mt-2">
                  {snapshot.entries} page(s), {formatBytes(snapshot.bytes)}
                  {snapshot.newest ? ` · last updated ${timeAgo(snapshot.newest)}` : ""}
                </p>
                <p className="text-xs text-fg-muted mt-1 font-mono break-all">
                  {snapshot.dir}
                </p>
              </>
            ) : (
              <p className="text-xs text-fg-muted mt-2">Nothing saved yet.</p>
            )}
          </div>
          <Button variant="ghost" onClick={clearSnapshot}>
            <Trash2 size={16} /> Clear
          </Button>
        </div>
      </div>

      <Field
        label="Backend server"
        hint="The API base URL, e.g. https://wolf-erp-api.onrender.com/api"
      >
        <Input
          icon={Server}
          value={apiUrl}
          onChange={(e) => setApiUrl(e.target.value)}
          placeholder={DEFAULT_API_URL}
          spellCheck={false}
        />
      </Field>

      <div className="flex flex-wrap items-center gap-2 mt-4">
        <Button onClick={saveServer} disabled={saving}>
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Saving…
            </>
          ) : (
            <>
              <Check size={16} /> Save server
            </>
          )}
        </Button>
        <Button variant="ghost" onClick={() => setApiUrl(DEFAULT_API_URL)}>
          <RotateCcw size={16} /> Use default
        </Button>
        <Button variant="ghost" onClick={checkUpdates} disabled={checking}>
          {checking ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Checking…
            </>
          ) : (
            <>
              <ArrowUpCircle size={16} /> Check for updates
            </>
          )}
        </Button>
        {webUrl && (
          <Button variant="ghost" onClick={openWeb}>
            <Globe size={16} /> Open web version
          </Button>
        )}
      </div>
    </Card>
  );
}
