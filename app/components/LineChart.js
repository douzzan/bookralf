"use client";

import { useEffect, useRef, useState } from "react";

// A restrained line chart, no charting library — just SVG, consistent with the
// crest/hero-mark pieces already in this app. Hover (or tap) a point to see the
// exact values.
//
// Two ways to use it:
//   <LineChart data={[{ label, value }, ...]} />                       one gold line (original use)
//   <LineChart labels={[...]} lines={[{ name, color, values: [...] }]} />   several lines
export default function LineChart({ data, labels, lines, height = 220 }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  // Draw at the real container width so the chart isn't shrunk on phones
  const wrapRef = useRef(null);
  const [measured, setMeasured] = useState(800);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const update = () => setMeasured(Math.max(260, Math.round(el.clientWidth)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Normalise the single-series form into the multi-line form
  let xLabels = labels;
  let series = lines;
  if (!series && data) {
    xLabels = data.map((d) => d.label);
    series = [{ name: "Revenue", color: "#cf9b42", values: data.map((d) => d.value) }];
  }

  if (!series || series.length === 0 || !xLabels || xLabels.length === 0) {
    return <p className="text-gray-500 text-sm text-center py-12">No data for this range yet.</p>;
  }

  const width = measured; // viewBox width = the container's width, so nothing is scaled
  const padding = { top: 16, right: 12, bottom: 28, left: 12 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const n = xLabels.length;
  const maxVal = Math.max(1, ...series.flatMap((s) => s.values));
  const stepX = n > 1 ? innerW / (n - 1) : 0;
  const xAt = (i) => padding.left + i * stepX;
  const yAt = (v) => padding.top + innerH - (v / maxVal) * innerH;

  const single = series.length === 1;
  const dotR = n > 45 ? 0 : 3;

  // Only label a sensible number of points so labels don't collide when there are many
  const labelEvery = Math.ceil(n / (width < 520 ? 4 : 8));

  return (
    <div className="relative" ref={wrapRef}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
        <defs>
          <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={series[0].color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={series[0].color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* horizontal gridlines, with the dollar value of each */}
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={padding.top + innerH * (1 - f)}
              y2={padding.top + innerH * (1 - f)}
              stroke="#3a2b1e"
              strokeWidth="1"
            />
            {f > 0 && (
              <text x={padding.left + 2} y={padding.top + innerH * (1 - f) - 3} fontSize="10" fill="#6f5f48">
                ${Math.round(maxVal * f)}
              </text>
            )}
          </g>
        ))}

        {/* guide line for the hovered point */}
        {hoverIdx !== null && (
          <line x1={xAt(hoverIdx)} x2={xAt(hoverIdx)} y1={padding.top} y2={padding.top + innerH} stroke="#5a4630" strokeWidth="1" />
        )}

        {series.map((s) => {
          const pts = s.values.map((v, i) => ({ x: xAt(i), y: yAt(v) }));
          const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
          const areaPath = `${linePath} L ${pts[pts.length - 1].x} ${padding.top + innerH} L ${pts[0].x} ${padding.top + innerH} Z`;
          return (
            <g key={s.name}>
              {single && <path d={areaPath} fill="url(#lineFill)" />}
              <path d={linePath} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              {pts.map((p, i) =>
                dotR || hoverIdx === i ? (
                  <circle key={i} cx={p.x} cy={p.y} r={hoverIdx === i ? 5 : dotR} fill={s.color} className="transition-all" />
                ) : null
              )}
            </g>
          );
        })}

        {xLabels.map((label, i) => (
          <g key={i} onMouseEnter={() => setHoverIdx(i)} onMouseLeave={() => setHoverIdx(null)} onClick={() => setHoverIdx(i)}>
            {/* generous invisible hit-area so hovering is easy on a thin chart */}
            <rect x={xAt(i) - Math.max(stepX, 8) / 2} y={padding.top} width={Math.max(stepX, 8)} height={innerH} fill="transparent" />
            {i % labelEvery === 0 && (
              <text x={xAt(i)} y={height - 8} fontSize="11" textAnchor="middle" fill="#9c8a6e">
                {label}
              </text>
            )}
          </g>
        ))}
      </svg>

      {hoverIdx !== null && (
        <div
          className="absolute top-0 bg-ink-900 border border-gold-500/40 rounded-lg px-3 py-1.5 text-sm pointer-events-none -translate-x-1/2 z-10"
          style={{ left: `${Math.min(86, Math.max(14, (xAt(hoverIdx) / width) * 100))}%` }}
        >
          <div className="text-gray-500 text-xs mb-0.5">{xLabels[hoverIdx]}</div>
          {series.map((s) => (
            <div key={s.name} className="flex items-center gap-2 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
              {!single && <span className="text-gray-400 text-xs">{s.name}</span>}
              <span className="font-semibold" style={{ color: s.color }}>
                ${s.values[hoverIdx].toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
