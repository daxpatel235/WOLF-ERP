"use client";

// Level 3 — Conversational / RAG chat.
// A floating assistant that answers questions grounded in the organisation's
// own procurement data (vendors, RFQs, quotes, POs, invoices). Mounted once in
// the dashboard layout so it follows the user across every page.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Building2,
  FileText,
  FileSpreadsheet,
  ShoppingCart,
  Receipt,
  RotateCcw,
} from "lucide-react";
import { aiApi } from "@/lib/api";
import { useAiStatus } from "@/components/ui/ai";
import { cn } from "@/lib/format";

// Maps a retrieved source to its icon + the page it deep-links to.
const SOURCE_META = {
  vendor: { label: "Vendor", icon: Building2, href: (id) => `/vendors/${id}` },
  rfq: { label: "RFQ", icon: FileText, href: (id) => `/rfqs/${id}` },
  quotation: { label: "Quote", icon: FileSpreadsheet, href: (id) => `/quotations/${id}` },
  purchaseOrder: { label: "PO", icon: ShoppingCart, href: (id) => `/purchase-orders/${id}` },
  invoice: { label: "Invoice", icon: Receipt, href: (id) => `/invoices/${id}` },
};

const SUGGESTIONS = [
  "Which invoices are overdue?",
  "Who are my top vendors by spend?",
  "Summarise the open RFQs",
  "Any vendors I should be cautious about?",
];

const STORAGE_KEY = "wolf_ai_chat";

// ---- tiny, safe markdown-lite renderer (bold + bullets only) ----
function renderInline(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    /^\*\*[^*]+\*\*$/.test(part) ? (
      <strong key={i} className="font-semibold text-slate-900">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function MessageBody({ text }) {
  const blocks = [];
  let bullets = [];
  const flush = () => {
    if (bullets.length) {
      blocks.push(
        <ul key={`u${blocks.length}`} className="list-disc space-y-1 pl-4 marker:text-violet-400">
          {bullets.map((b, i) => (
            <li key={i}>{renderInline(b)}</li>
          ))}
        </ul>
      );
      bullets = [];
    }
  };
  text.split("\n").forEach((line) => {
    const m = line.match(/^\s*[-•*]\s+(.*)/);
    if (m) bullets.push(m[1]);
    else {
      flush();
      if (line.trim())
        blocks.push(
          <p key={`p${blocks.length}`} className="whitespace-pre-wrap">
            {renderInline(line)}
          </p>
        );
    }
  });
  flush();
  return <div className="space-y-1.5">{blocks}</div>;
}

// ---- source citation chips under an assistant message ----
function SourceChips({ sources, onNavigate }) {
  if (!sources?.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {sources.map((s) => {
        const meta = SOURCE_META[s.source];
        if (!meta) return null;
        const Icon = meta.icon;
        return (
          <button
            key={`${s.source}-${s.id}`}
            type="button"
            onClick={() => onNavigate(meta.href(s.id))}
            title={s.title}
            className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-white px-2 py-0.5 text-[11px] font-medium text-violet-700 transition hover:border-violet-300 hover:bg-violet-50"
          >
            <Icon size={11} />
            {s.id}
          </button>
        );
      })}
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-1">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}

export default function AiChat() {
  const { chat: chatEnabled } = useAiStatus();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // ---- restore / persist conversation across reloads ----
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) setMessages(JSON.parse(saved));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)));
    } catch {}
  }, [messages]);

  // ---- auto-scroll to the latest message ----
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // ---- focus input when the panel opens ----
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  // ---- close on Escape ----
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!chatEnabled) return null;

  const send = async (text) => {
    const message = (text ?? input).trim();
    if (!message || loading) return;

    setError("");
    setInput("");
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setLoading(true);

    try {
      const res = await aiApi.chat(message, history);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res?.data?.answer || "",
          sources: res?.data?.sources || [],
          refused: Boolean(res?.data?.refused),
        },
      ]);
    } catch (e) {
      setError(e?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const navigate = (href) => {
    setOpen(false);
    router.push(href);
  };

  const reset = () => {
    setMessages([]);
    setError("");
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  return (
    <>
      {/* ============ Floating action button ============ */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open AI assistant"
          className="group fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/30 transition-all hover:scale-105 hover:shadow-xl hover:shadow-violet-600/40 active:scale-95"
        >
          <span className="absolute inset-0 rounded-2xl bg-violet-500 opacity-60 blur-md transition group-hover:opacity-80" />
          <Sparkles size={24} className="relative" />
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-white" />
          </span>
        </button>
      )}

      {/* ============ Chat panel ============ */}
      {open && (
        <>
          {/* Mobile backdrop */}
          <div
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm sm:hidden"
          />

          <div
            className={cn(
              "fixed z-50 flex flex-col overflow-hidden bg-white shadow-2xl shadow-slate-900/20",
              // mobile: bottom sheet · desktop: floating card
              "inset-x-0 bottom-0 h-[85vh] rounded-t-2xl",
              "sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[640px] sm:max-h-[calc(100vh-2.5rem)] sm:w-[400px] sm:rounded-2xl sm:border sm:border-slate-200",
              "motion-safe:animate-chat-in"
            )}
          >
            {/* ---- Header ---- */}
            <div className="relative flex items-center justify-between bg-gradient-to-br from-violet-600 to-indigo-600 px-4 py-3 text-white">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
                  <Sparkles size={18} />
                </span>
                <div>
                  <p className="text-sm font-semibold leading-tight">Wolf AI</p>
                  <p className="flex items-center gap-1 text-[11px] text-violet-100">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Knows your procurement data
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={reset}
                    title="New chat"
                    className="rounded-lg p-1.5 text-violet-100 transition hover:bg-white/15 hover:text-white"
                  >
                    <RotateCcw size={16} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-violet-100 transition hover:bg-white/15 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* ---- Messages ---- */}
            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto bg-slate-50/60 px-4 py-4">
              {messages.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 text-violet-600">
                    <Sparkles size={26} />
                  </span>
                  <p className="text-sm font-semibold text-slate-800">Ask me anything</p>
                  <p className="mt-1 max-w-[16rem] text-xs text-slate-500">
                    I answer from your live vendor, RFQ, quotation, PO and invoice records.
                  </p>
                  <div className="mt-5 grid w-full gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => send(s)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-[13px] font-medium text-slate-700 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-800"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) =>
                m.role === "user" ? (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-br from-violet-600 to-indigo-600 px-3.5 py-2.5 text-sm text-white shadow-sm">
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex gap-2.5">
                    <span
                      className={cn(
                        "mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-lg text-white",
                        m.refused
                          ? "bg-gradient-to-br from-amber-400 to-amber-500"
                          : "bg-gradient-to-br from-violet-600 to-indigo-600"
                      )}
                    >
                      <Sparkles size={14} />
                    </span>
                    <div className="min-w-0 max-w-[85%]">
                      <div
                        className={cn(
                          "rounded-2xl rounded-tl-md border px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm",
                          m.refused
                            ? "border-amber-200 bg-amber-50 text-amber-800"
                            : "border-slate-200 bg-white text-slate-700"
                        )}
                      >
                        <MessageBody text={m.content} />
                      </div>
                      <SourceChips sources={m.sources} onNavigate={navigate} />
                    </div>
                  </div>
                )
              )}

              {loading && (
                <div className="flex gap-2.5">
                  <span className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-white">
                    <Sparkles size={14} />
                  </span>
                  <div className="rounded-2xl rounded-tl-md border border-slate-200 bg-white px-2 py-1 shadow-sm">
                    <TypingDots />
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                  {error}
                </div>
              )}
            </div>

            {/* ---- Composer ---- */}
            <div className="border-t border-slate-200 bg-white p-3">
              <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 transition focus-within:border-violet-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-violet-100">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Ask about vendors, invoices, spend…"
                  className="max-h-28 flex-1 resize-none bg-transparent py-1 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => send()}
                  disabled={!input.trim() || loading}
                  aria-label="Send"
                  className="flex h-8 w-8 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
                </button>
              </div>
              <p className="mt-1.5 px-1 text-center text-[10px] text-slate-400">
                AI can make mistakes — verify important figures against the records.
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
