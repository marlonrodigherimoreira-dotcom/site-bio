/**
 * charts/index.jsx
 * Pure SVG charts — no external libraries.
 */

import { memo } from "react";
import { T, F } from "../constants";

export const BarChart = memo(({ data, height = 76 }) => {
  const max = Math.max(...data.map(d => Math.max(d.inc || 0, d.exp || 0)), 1);
  return (
    <svg viewBox={`0 0 ${data.length * 40} ${height + 20}`} style={{ width: "100%", overflow: "visible" }}>
      {data.map((d, i) => {
        const x = i * 40 + 4, bw = 14;
        const iH = Math.max((d.inc / max) * (height - 4), d.inc > 0 ? 2 : 0);
        const eH = Math.max((d.exp / max) * (height - 4), d.exp > 0 ? 2 : 0);
        return (
          <g key={i}>
            {d.inc > 0 && <rect x={x}       y={height - iH} width={bw} height={iH} rx={3} fill={T.green} opacity="0.85" />}
            {d.exp > 0 && <rect x={x+bw+2}  y={height - eH} width={bw} height={eH} rx={3} fill={T.red}   opacity="0.7"  />}
            <text x={x + bw} y={height + 14} textAnchor="middle" fontSize={9} fill={T.faint} fontFamily={F.sans}>{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
});

export const LineChart = memo(({ data, height = 52, color = T.green }) => {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1), min = Math.min(...data, 0), range = (max - min) || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${height - ((v - min) / range) * (height - 8)}`);
  return (
    <svg viewBox={`0 0 100 ${height}`} style={{ width: "100%", overflow: "visible" }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.12" />
          <stop offset="100%" stopColor={color} stopOpacity="0"    />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${pts.join(" ")} 100,${height}`} fill="url(#lg)" />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
});

export const DonutChart = memo(({ slices, size = 80 }) => {
  const total = slices.reduce((s, sl) => s + sl.value, 0) || 1;
  let off = 0;
  const r = 38, cx = 50, cy = 50, circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={T.border} strokeWidth="12" />
      {slices.filter(sl => sl.value > 0).map((sl, i) => {
        const p = sl.value / total, dash = circ * p, gap = circ - dash;
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={sl.color} strokeWidth="12"
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-off * circ / total + circ / 4}
            strokeLinecap="butt" />
        );
        off += sl.value;
        return el;
      })}
    </svg>
  );
});
