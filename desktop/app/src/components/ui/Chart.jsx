"use client";

// Recharts wrappers with the app's semantic tokens baked in, so every chart in
// Wolf shares one axis/tooltip/grid language and restyles from this file alone.
// Charts mount client-side only (recharts measures the DOM), which also keeps
// them out of the server render and avoids hydration mismatches.

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
  Label,
} from "recharts";
import { useId, useState, useEffect } from "react";
import { Card } from "./kit";

// Categorical palette — ordered so neighbouring series stay distinguishable.
export const CHART_COLORS = [
  "#2563eb",
  "#7c3aed",
  "#059669",
  "#d97706",
  "#dc2626",
  "#0891b2",
];

const AXIS = {
  stroke: "rgb(var(--fg-muted))",
  fontSize: 12,
  axisLine: false,
  tickLine: false,
};

const TOOLTIP = {
  contentStyle: {
    background: "rgb(var(--surface))",
    border: "1px solid rgb(var(--border))",
    borderRadius: 10,
    color: "rgb(var(--fg))",
    fontSize: 12,
    boxShadow: "0 12px 32px -12px rgb(15 23 42 / 0.28)",
    padding: "8px 12px",
  },
  labelStyle: {
    color: "rgb(var(--fg-muted))",
    fontWeight: 600,
    marginBottom: 2,
  },
  itemStyle: { color: "rgb(var(--fg))" },
};

// Defers rendering until after mount. Every chart below needs this.
function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

/** Titled card that sizes a chart for you. Pass a recharts element as child. */
export function ChartCard({ title, subtitle, action, children, height = 280, className = "" }) {
  const mounted = useMounted();
  return (
    <Card className={`p-5 ${className}`}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            {title && <h3 className="font-semibold text-fg">{title}</h3>}
            {subtitle && <p className="text-xs text-fg-muted mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div style={{ width: "100%", height }}>
        {mounted && <ResponsiveContainer>{children}</ResponsiveContainer>}
      </div>
    </Card>
  );
}

export function BarChartX({
  data,
  xKey,
  dataKey,
  tickFormatter,
  tooltipFormatter,
  ...props
}) {
  const mounted = useMounted();
  if (!mounted) return null;

  return (
    <BarChart data={data} margin={{ top: 8, right: 4, left: -6, bottom: 0 }} {...props}>
      <defs>
        <linearGradient id="barBrand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
          <stop offset="100%" stopColor="#2563eb" stopOpacity={0.75} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" vertical={false} />
      <XAxis dataKey={xKey} {...AXIS} interval={0} tick={{ fontSize: 11 }} />
      <YAxis {...AXIS} allowDecimals={false} width={56} tickFormatter={tickFormatter} />
      <Tooltip
        {...TOOLTIP}
        formatter={tooltipFormatter}
        cursor={{ fill: "rgb(var(--fg-muted) / 0.06)" }}
      />
      <Bar dataKey={dataKey} fill="url(#barBrand)" radius={[6, 6, 0, 0]} maxBarSize={52} />
    </BarChart>
  );
}

/** Smooth gradient area chart — the "over time" trend. */
export function AreaChartX({
  data,
  xKey,
  dataKey,
  tickFormatter,
  tooltipFormatter,
  ...props
}) {
  const mounted = useMounted();
  if (!mounted) return null;

  return (
    <AreaChart data={data} margin={{ top: 8, right: 8, left: -6, bottom: 0 }} {...props}>
      <defs>
        <linearGradient id="areaBrand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
          <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" vertical={false} />
      <XAxis dataKey={xKey} {...AXIS} interval="preserveStartEnd" minTickGap={24} />
      <YAxis {...AXIS} allowDecimals={false} width={56} tickFormatter={tickFormatter} />
      <Tooltip
        {...TOOLTIP}
        formatter={tooltipFormatter}
        cursor={{ stroke: "rgb(var(--border))" }}
      />
      <Area
        type="monotone"
        dataKey={dataKey}
        stroke="#2563eb"
        strokeWidth={2.5}
        fill="url(#areaBrand)"
        activeDot={{ r: 5, strokeWidth: 2, stroke: "rgb(var(--surface))" }}
      />
    </AreaChart>
  );
}

/** Donut with a total in the hole. */
export function PieChartX({
  data,
  dataKey = "count",
  nameKey = "label",
  centerLabel = "total",
  centerValue,
  tooltipFormatter,
  legend = false,
  ...props
}) {
  const mounted = useMounted();
  if (!mounted) return null;

  const total = data.reduce((s, d) => s + (Number(d[dataKey]) || 0), 0);
  const middle = centerValue != null ? centerValue : total;

  return (
    <PieChart {...props}>
      <Tooltip {...TOOLTIP} formatter={tooltipFormatter} />
      {legend && (
        <Legend
          verticalAlign="bottom"
          height={28}
          iconType="circle"
          iconSize={8}
          formatter={(value) => (
            <span style={{ color: "rgb(var(--fg-muted))", fontSize: 12 }}>{value}</span>
          )}
        />
      )}
      <Pie
        data={data}
        dataKey={dataKey}
        nameKey={nameKey}
        innerRadius={56}
        outerRadius={86}
        paddingAngle={3}
        cornerRadius={5}
        stroke="rgb(var(--surface))"
        strokeWidth={3}
      >
        {data.map((_, i) => (
          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
        ))}
        <Label
          position="center"
          content={({ viewBox }) => {
            if (!viewBox) return null;
            const { cx, cy } = viewBox;
            return (
              <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
                <tspan
                  x={cx}
                  dy="-0.1em"
                  fontSize={String(middle).length > 8 ? 15 : 22}
                  fontWeight={700}
                  fill="rgb(var(--fg))"
                >
                  {middle}
                </tspan>
                <tspan x={cx} dy="1.6em" fontSize="11" fill="rgb(var(--fg-muted))">
                  {centerLabel}
                </tspan>
              </text>
            );
          }}
        />
      </Pie>
    </PieChart>
  );
}

/** Inline SVG sparkline — crisp at any size, no chart runtime cost. */
export function Sparkline({ data, stroke = "#2563eb", className = "" }) {
  const id = useId();
  const w = 100;
  const h = 32;
  const pad = 3;
  if (!data || data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - pad - ((v - min) / range) * (h - pad * 2),
  ]);
  const line = pts
    .map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
    .join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      width="100%"
      height="100%"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.22} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
