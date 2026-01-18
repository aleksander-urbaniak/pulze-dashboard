"use client";

import { useId, useMemo, useState } from "react";

import type { TrendDatum } from "../lib/analytics";

type Point = { x: number; y: number };

const CHART_WIDTH = 640;
const CHART_HEIGHT = 240;
const PADDING_X = 32;
const PADDING_Y = 28;

function buildSmoothPath(points: Point[]) {
  if (points.length === 0) {
    return "";
  }
  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }

  const d: string[] = [`M ${points[0].x} ${points[0].y}`];
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d.push(`C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`);
  }
  return d.join(" ");
}

export default function AlertChart({ data }: { data: TrendDatum[] }) {
  const gradientId = useId().replace(/:/g, "");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const { points, linePath, areaPath, baseline } = useMemo(() => {
    const safeMax = Math.max(1, ...data.map((item) => item.value));
    const innerWidth = CHART_WIDTH - PADDING_X * 2;
    const innerHeight = CHART_HEIGHT - PADDING_Y * 2;
    const baselineY = CHART_HEIGHT - PADDING_Y;

    const pts = data.map((item, index) => {
      const ratio = data.length <= 1 ? 0.5 : index / (data.length - 1);
      const x = PADDING_X + ratio * innerWidth;
      const y = PADDING_Y + (1 - item.value / safeMax) * innerHeight;
      return { x, y };
    });

    const path = buildSmoothPath(pts);
    const area =
      pts.length > 0
        ? `${path} L ${pts[pts.length - 1].x} ${baselineY} L ${pts[0].x} ${baselineY} Z`
        : "";

    return { points: pts, linePath: path, areaPath: area, baseline: baselineY };
  }, [data]);

  const hoverPoint = hoverIndex === null ? null : points[hoverIndex];
  const hoverDatum = hoverIndex === null ? null : data[hoverIndex];

  return (
    <div className="relative mt-6">
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="h-56 w-full"
        role="img"
        aria-label="Alert volume over time"
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id={`${gradientId}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity="0.35" />
            <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`M ${PADDING_X} ${baseline} H ${CHART_WIDTH - PADDING_X}`} stroke="rgb(var(--border))" />
        {areaPath ? (
          <path d={areaPath} fill={`url(#${gradientId}-fill)`} stroke="none" />
        ) : null}
        {linePath ? (
          <path
            d={linePath}
            fill="none"
            stroke="rgb(var(--accent))"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        ) : null}
        {points.map((point, index) => (
          <circle
            key={`${point.x}-${point.y}`}
            cx={point.x}
            cy={point.y}
            r={hoverIndex === index ? 5 : 3.5}
            fill="rgb(var(--surface))"
            stroke="rgb(var(--accent))"
            strokeWidth="2"
            onMouseEnter={() => setHoverIndex(index)}
            onFocus={() => setHoverIndex(index)}
            onBlur={() => setHoverIndex(null)}
            tabIndex={0}
          />
        ))}
      </svg>

      {hoverPoint && hoverDatum ? (
        <div
          className="pointer-events-none absolute rounded-2xl border border-border bg-surface/90 px-3 py-2 text-xs shadow-card"
          style={{
            left: `${(hoverPoint.x / CHART_WIDTH) * 100}%`,
            top: `${(hoverPoint.y / CHART_HEIGHT) * 100}%`,
            transform: "translate(-50%, -120%)"
          }}
        >
          <div className="font-semibold">{hoverDatum.value} alerts</div>
          <div className="text-muted">{hoverDatum.tooltip}</div>
        </div>
      ) : null}
    </div>
  );
}
