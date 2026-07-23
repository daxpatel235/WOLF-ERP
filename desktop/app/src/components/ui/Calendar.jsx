"use client";

// Month grid that plots records onto their date field. Wolf uses it for PO
// delivery dates and invoice due dates, which live in the data already but had
// nothing rendering them on a timeline.

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/format";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Local-time YYYY-MM-DD. toISOString() would shift dates across the timezone
// boundary and land events on the wrong day.
const dayKey = (d) => {
  const dt = new Date(d);
  if (isNaN(dt)) return null;
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(
    dt.getDate()
  ).padStart(2, "0")}`;
};

/**
 * @param events   any records
 * @param dateKey  field holding the date
 * @param render   (row) => node, for the chip inside a day cell
 * @param tone     (row) => tailwind classes for the chip
 */
export function Calendar({ events = [], dateKey: dateField, render, tone, onEventClick }) {
  const [cursor, setCursor] = useState(() => new Date());

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const startPad = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = dayKey(new Date());

  const byDay = useMemo(() => {
    const map = {};
    events.forEach((e) => {
      const k = dayKey(e[dateField]);
      if (!k) return;
      (map[k] ||= []).push(e);
    });
    return map;
  }, [events, dateField]);

  const cells = [
    ...Array.from({ length: startPad }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const shift = (delta) => setCursor(new Date(year, month + delta, 1));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-fg">
          {cursor.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => shift(-1)}
            aria-label="Previous month"
            className="p-2 rounded-lg text-fg-muted hover:bg-surface-2 hover:text-fg transition"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setCursor(new Date())}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-fg-muted hover:bg-surface-2 hover:text-fg transition"
          >
            Today
          </button>
          <button
            onClick={() => shift(1)}
            aria-label="Next month"
            className="p-2 rounded-lg text-fg-muted hover:bg-surface-2 hover:text-fg transition"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px mb-1">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted text-center py-1"
          >
            {d.slice(0, 1)}
            <span className="hidden sm:inline">{d.slice(1)}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden border border-border">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`pad-${i}`} className="bg-surface min-h-[5.5rem]" />;
          }
          const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayEvents = byDay[key] || [];
          const isToday = key === todayKey;

          return (
            <div key={key} className="bg-surface min-h-[5.5rem] p-1.5 flex flex-col gap-1">
              <span
                className={cn(
                  "text-xs tabular-nums w-5 h-5 grid place-items-center rounded-full shrink-0",
                  isToday ? "bg-brand text-white font-bold" : "text-fg-muted"
                )}
              >
                {day}
              </span>
              <div className="space-y-1 overflow-hidden">
                {dayEvents.slice(0, 2).map((e, j) => (
                  <button
                    key={e.id ?? j}
                    onClick={() => onEventClick?.(e)}
                    className={cn(
                      "block w-full text-left text-[10px] leading-tight px-1.5 py-1 rounded truncate transition",
                      tone ? tone(e) : "bg-brand/10 text-brand hover:bg-brand/20"
                    )}
                  >
                    {render ? render(e) : String(e.id)}
                  </button>
                ))}
                {dayEvents.length > 2 && (
                  <p className="text-[10px] text-fg-muted px-1.5">
                    +{dayEvents.length - 2} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Calendar;
