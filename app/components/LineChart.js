"use client";

import { useState } from "react";

// A restrained line chart: thin gold stroke, filled area beneath it at
// low opacity, dots on each point, hover to see the exact value. No
// charting library — just SVG, consistent with the crest/hero-mark
// pieces already in this app.
export default function LineChart({ data, height = 220 }) {
  const [hoverIdx, setHoverIdx] = useState(null);

  if (!data || data.length === 0) {
    return <p className="text-gray-500 text-sm text-center py-12">No data for this range yet.</p>;
  }

  const width = 800; // viewBox width — scales responsively via the svg's own width:100%
  const padding = { top: 16, right: 12, bottom: 28, left: 12 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const maxVal = Math.max(1, ...data.map((d) => d.value));
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;

  const points = data.map((d, i) => ({
    x: padding.left + i * stepX,
    y: padding.top + innerH - (d.value / maxVal) * innerH,
    ...d,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + innerH} L ${points[0].x} ${padding.top + innerH} Z`;

  // Only label a sensible number of points so labels don't collide when there are many
  const labelEvery = Math.ceil(data.length / 8);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
        <defs>
          <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#cf9b42" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#cf9b42" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* horizontal gridlines */}
        {[0, 0.5, 1].map((f) => (
          <line
            key={f}
            x1={padding.left}
            x2={width - padding.right}
            y1={padding.top + innerH * (1 - f)}
            y2={padding.top + innerH * (1 - f)}
            stroke="#3a2b1e"
            strokeWidth="1"
          />
        ))}

        <path d={areaPath} fill="url(#lineFill)" />
        <path d={linePath} fill="none" stroke="#cf9b42" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {points.map((p, i) => (
          <g key={i} onMouseEnter={() => setHoverIdx(i)} onMouseLeave={() => setHoverIdx(null)}>
            <circle cx={p.x} cy={p.y} r={hoverIdx === i ? 5 : 3} fill="#cf9b42" className="transition-all" />
            {/* generous invisible hit-area so hovering is easy on a thin chart */}
            <rect x={p.x - stepX / 2} y={padding.top} width={Math.max(stepX, 8)} height={innerH} fill="transparent" />
            {i % labelEvery === 0 && (
              <text x={p.x} y={height - 8} fontSize="11" textAnchor="middle" fill="#9c8a6e">
                {p.label}
              </text>
            )}
          </g>
        ))}
      </svg>

      {hoverIdx !== null && (
        <div
          className="absolute bg-ink-900 border border-gold-500/40 rounded-lg px-3 py-1.5 text-sm pointer-events-none -translate-x-1/2 -translate-y-full"
          style={{
            left: `${(points[hoverIdx].x / width) * 100}%`,
            top: `${(points[hoverIdx].y / height) * 100}%`,
          }}
        >
          <div className="text-gold-400 font-semibold">${points[hoverIdx].value.toFixed(2)}</div>
          <div className="text-gray-500 text-xs">{points[hoverIdx].label}</div>
        </div>
      )}
    </div>
  );
}
