"use client";

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { Send, Loader2, AlertCircle, Hash, Plus, Lock, MessagesSquare } from "lucide-react";
import { chatApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Card, EmptyState } from "@/components/ui/kit";
import { initialsOf } from "@/lib/utils";

// Polling cadence. We start responsive, then back off while the channel is
// quiet so an idle tab costs almost nothing, and we snap back to MIN the moment
// anything arrives (or the user returns to the tab).
const MIN_DELAY = 2500;
const MAX_DELAY = 15000;
const BACKOFF = 1.5;

const timeOf = (d) =>
  new Date(d).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

export default function TeamChatPage() {
  const { user, can, isOwner, permissionsKnown } = useAuth();
  const allowed = isOwner || can("canChat");

  const [channels, setChannels] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [newChannel, setNewChannel] = useState("");
  const [creating, setCreating] = useState(false);

  // Poll bookkeeping. Refs (not state) so the loop never re-creates itself.
  const cursorRef = useRef(null);
  const timerRef = useRef(null);
  const inFlightRef = useRef(false);
  const delayRef = useRef(MIN_DELAY);
  const mountedRef = useRef(true);

  // Scroll bookkeeping: only auto-scroll when the reader is already at the bottom.
  const scrollRef = useRef(null);
  const pinnedRef = useRef(true);
  const tempId = useRef(0);

  useEffect(() => () => { mountedRef.current = false; clearTimeout(timerRef.current); }, []);

  // ---- Channels ----
  useEffect(() => {
    if (!allowed) { setLoading(false); return; }
    chatApi
      .channels()
      .then((r) => {
        setChannels(r.data || []);
        setActiveId((prev) => prev || r.data?.[0]?.id || null);
      })
      .catch((e) => setError(e.message || "Could not load channels."))
      .finally(() => setLoading(false));
  }, [allowed]);

  // Merge incoming messages, ignoring anything we already have (a poll always
  // re-delivers our own just-sent message, since the cursor lags behind it).
  const merge = useCallback((incoming) => {
    if (!incoming.length) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const added = incoming.filter((m) => !seen.has(m.id));
      return added.length ? [...prev, ...added] : prev;
    });
  }, []);

  const schedule = useCallback((fn) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(fn, delayRef.current);
  }, []);

  // ---- The poll loop ----
  const poll = useCallback(
    async function run() {
      if (!mountedRef.current || !activeId) return;
      // A hidden tab does no network work at all; we resume on visibilitychange.
      if (typeof document !== "undefined" && document.hidden) return schedule(run);
      if (inFlightRef.current) return schedule(run);

      inFlightRef.current = true;
      try {
        const r = await chatApi.messages(activeId, { after: cursorRef.current || undefined });
        if (!mountedRef.current) return;
        if (r.data?.length) {
          cursorRef.current = r.cursor;
          merge(r.data);
          delayRef.current = MIN_DELAY; // activity → stay responsive
        } else {
          delayRef.current = Math.min(delayRef.current * BACKOFF, MAX_DELAY); // quiet → ease off
        }
      } catch {
        // Transient (cold start / offline). Back off and try again.
        delayRef.current = Math.min(delayRef.current * BACKOFF, MAX_DELAY);
      } finally {
        inFlightRef.current = false;
        if (mountedRef.current) schedule(run);
      }
    },
    [activeId, merge, schedule]
  );

  // ---- Load a channel, then start polling it ----
  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;

    clearTimeout(timerRef.current);
    cursorRef.current = null;
    delayRef.current = MIN_DELAY;
    setMessages([]);
    setLoadingMessages(true);
    pinnedRef.current = true;

    chatApi
      .messages(activeId)
      .then((r) => {
        if (cancelled) return;
        cursorRef.current = r.cursor;
        setMessages(r.data || []);
      })
      .catch((e) => !cancelled && setError(e.message || "Could not load messages."))
      .finally(() => {
        if (cancelled) return;
        setLoadingMessages(false);
        schedule(poll);
      });

    return () => { cancelled = true; clearTimeout(timerRef.current); };
  }, [activeId, poll, schedule]);

  // Returning to the tab should feel instant.
  useEffect(() => {
    const onVisible = () => {
      if (document.hidden || !activeId) return;
      delayRef.current = MIN_DELAY;
      clearTimeout(timerRef.current);
      poll();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [activeId, poll]);

  // Keep the view pinned to the newest message, but never yank the scrollbar
  // away from someone reading history.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && pinnedRef.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  // ---- Send (optimistic) ----
  const send = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending || !activeId) return;

    const temp = `temp-${++tempId.current}`;
    const optimistic = {
      id: temp, body, senderId: user?.id, senderName: user?.name, createdAt: new Date().toISOString(), pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setText("");
    pinnedRef.current = true;
    setSending(true);
    setError("");

    try {
      const r = await chatApi.send(activeId, body);
      // Swap the placeholder for the real message so the poll can't duplicate it.
      setMessages((prev) => prev.map((m) => (m.id === temp ? r.data : m)));
      delayRef.current = MIN_DELAY;
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== temp));
      setText(body); // give them their text back
      setError(err.message || "Message not sent.");
    } finally {
      setSending(false);
    }
  };

  const createChannel = async (e) => {
    e.preventDefault();
    const name = newChannel.trim();
    if (!name) return;
    setCreating(true);
    setError("");
    try {
      const r = await chatApi.createChannel({ name });
      setChannels((prev) => [...prev, r.data]);
      setNewChannel("");
      setActiveId(r.data.id);
    } catch (err) {
      setError(err.message || "Could not create that channel.");
    } finally {
      setCreating(false);
    }
  };

  // Wait until the server has told us what this member may do. Locking the page
  // on a not-yet-known answer shows the owner a denial for their own workspace.
  if (!permissionsKnown) {
    return (
      <div className="flex items-center gap-2 py-10 text-fg-muted">
        <Loader2 size={18} className="animate-spin" /> Loading chat…
      </div>
    );
  }

  if (!allowed) {
    return (
      <Card>
        <EmptyState
          icon={Lock}
          title="Chat isn't enabled for you"
          hint="Ask the workspace owner to grant you the Team chat permission."
        />
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-fg-muted">
        <Loader2 size={18} className="animate-spin" /> Loading chat…
      </div>
    );
  }

  const active = channels.find((c) => c.id === activeId);

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 p-3 text-sm bg-red-50 border border-red-100 text-red-700 rounded-lg">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
        {/* Channels */}
        <Card className="p-3 h-fit">
          <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-fg-muted">Channels</p>
          <div className="mt-1 space-y-0.5">
            {channels.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition ${
                  c.id === activeId ? "bg-blue-50 text-brand-700" : "text-fg-muted hover:bg-surface-2"
                }`}
              >
                <Hash size={14} className={c.id === activeId ? "text-blue-500" : "text-fg-muted"} />
                <span className="truncate">{c.name}</span>
              </button>
            ))}
          </div>

          <form onSubmit={createChannel} className="mt-3 flex items-center gap-1.5 border-t border-border pt-3">
            <input
              value={newChannel}
              onChange={(e) => setNewChannel(e.target.value)}
              placeholder="New channel"
              className="w-full min-w-0 rounded-lg border border-border px-2.5 py-1.5 text-sm placeholder:text-fg-muted focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <button
              type="submit"
              disabled={creating || !newChannel.trim()}
              aria-label="Create channel"
              className="shrink-0 rounded-lg p-2 text-fg-muted transition hover:bg-surface-2 hover:text-fg disabled:opacity-50"
            >
              {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            </button>
          </form>
        </Card>

        {/* Thread */}
        <Card className="flex h-[70vh] flex-col overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
            <Hash size={16} className="text-fg-muted" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-fg">{active?.name || "—"}</p>
              {active?.description && (
                <p className="truncate text-xs text-fg-muted">{active.description}</p>
              )}
            </div>
          </div>

          <div ref={scrollRef} onScroll={onScroll} className="flex-1 space-y-1 overflow-y-auto px-5 py-4">
            {loadingMessages ? (
              <div className="flex items-center gap-2 py-6 text-sm text-fg-muted">
                <Loader2 size={15} className="animate-spin" /> Loading messages…
              </div>
            ) : messages.length === 0 ? (
              <EmptyState icon={MessagesSquare} title="No messages yet" hint="Say hello to your team." />
            ) : (
              messages.map((m, i) => {
                const prev = messages[i - 1];
                const grouped = prev && prev.senderId === m.senderId;
                const mine = m.senderId === user?.id;
                return (
                  <div key={m.id} className={`flex gap-3 ${grouped ? "mt-0.5" : "mt-4"}`}>
                    <div className="w-8 shrink-0">
                      {!grouped && (
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-semibold text-white ${
                            mine ? "bg-blue-600" : "bg-gradient-to-br from-slate-600 to-slate-800"
                          }`}
                        >
                          {initialsOf(m.senderName)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      {!grouped && (
                        <p className="flex items-baseline gap-2">
                          <span className="text-sm font-semibold text-fg">
                            {mine ? "You" : m.senderName}
                          </span>
                          <span className="text-[11px] text-fg-muted">{timeOf(m.createdAt)}</span>
                        </p>
                      )}
                      <p
                        className={`whitespace-pre-wrap break-words text-sm ${
                          m.pending ? "text-fg-muted" : "text-fg"
                        }`}
                      >
                        {m.body}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={send} className="flex items-center gap-2 border-t border-border px-4 py-3">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={active ? `Message #${active.name}` : "Select a channel"}
              disabled={!activeId}
              maxLength={2000}
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm placeholder:text-fg-muted focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-surface-2"
            />
            <button
              type="submit"
              disabled={!text.trim() || sending || !activeId}
              aria-label="Send message"
              className="shrink-0 rounded-lg bg-blue-600 p-2.5 text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-50"
            >
              {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
