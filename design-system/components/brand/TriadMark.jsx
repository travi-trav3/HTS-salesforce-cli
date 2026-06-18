import React from "react";

/**
 * The Triad mark — a three-circle Venn diagram of the "Triad of Power".
 * Each circle carries the icon for one component — AI Assist (chat + spark),
 * Text Messaging (chat + dots), Member App (phone) — and the shared center,
 * where all three overlap, reads "Triad of Power".
 *
 * Geometry: equilateral centers spaced exactly one radius apart (d = R), so
 * every pair overlaps identically and the three meet in a symmetric center.
 * Render large (≥220px) so the center copy stays legible.
 * tone: "color" (green / orange / azure circles) or "mono" (single-color).
 */
export function TriadMark({ size = 260, tone = "color", color = "#fff", style = {}, ...rest }) {
  const mono = tone === "mono";
  const green = "#0acb40";   // AI Assist
  const orange = "#ef6a24";  // Text Messaging
  const azure = "#009ee8";   // Member App
  const cText = mono ? color : "#ffffff";
  const sc = (c) => (mono ? color : c);

  // ---- Venn geometry (viewBox 0 0 264 254) ----
  // centroid (132,139); equilateral centers, spacing d = R = 80 (Rc = R/√3).
  const R = 80;
  const circles = [
    { cx: 132, cy: 92.8, col: green },   // top → AI Assist
    { cx: 92, cy: 162.1, col: orange },  // bottom-left → Text Messaging
    { cx: 172, cy: 162.1, col: azure },  // bottom-right → Member App
  ];

  // one 24×24 line icon, placed centered at (x,y) with scale s
  const Icon = ({ x, y, s, col, kind }) => {
    const stroke = sc(col);
    const t = `translate(${x - 12 * s} ${y - 12 * s}) scale(${s})`;
    return (
      <g transform={t} fill="none" stroke={stroke} strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7A8.38 8.38 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z" />
        {kind === "ai" && (
          <path d="M12.5 7.4l.95 2.2 2.2.95-2.2.95-.95 2.2-.95-2.2-2.2-.95 2.2-.95z" fill={stroke} stroke="none" />
        )}
        {kind === "sms" && (
          <g fill={stroke} stroke="none">
            <circle cx="8.4" cy="11.5" r="1.15" />
            <circle cx="12.5" cy="11.5" r="1.15" />
            <circle cx="16.6" cy="11.5" r="1.15" />
          </g>
        )}
      </g>
    );
  };

  // phone icon for the App circle
  const Phone = ({ x, y, s, col }) => {
    const stroke = sc(col);
    const t = `translate(${x - 12 * s} ${y - 12 * s}) scale(${s})`;
    return (
      <g transform={t} fill="none" stroke={stroke} strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="2.5" width="12" height="19" rx="2.6" />
        <line x1="10.5" y1="18.6" x2="13.5" y2="18.6" />
      </g>
    );
  };

  return (
    <svg
      {...rest}
      width={size}
      height={(size * 254) / 264}
      viewBox="0 0 264 254"
      fill="none"
      style={{ display: "block", ...style }}
      role="img"
      aria-label="Club Pilot Triad of Power"
    >
      {/* Venn circles — identical radius, even overlap */}
      {circles.map((c, i) => (
        <circle
          key={i}
          cx={c.cx}
          cy={c.cy}
          r={R}
          fill={mono ? "none" : c.col}
          fillOpacity={mono ? 0 : 0.2}
          stroke={sc(c.col)}
          strokeWidth="2.6"
        />
      ))}

      {/* component icons, centered in each circle's outer (sole) lobe */}
      <Icon x={132} y={56} s={1.8} col={green} kind="ai" />
      <Icon x={60} y={180.5} s={1.8} col={orange} kind="sms" />
      <Phone x={204} y={180.5} s={1.8} col={azure} />

      {/* center label — the shared core where all three overlap */}
      <text
        x="132"
        y="139"
        textAnchor="middle"
        fontFamily="'Montserrat', sans-serif"
        fontWeight="700"
        fill={cText}
        style={{ textTransform: "uppercase" }}
      >
        <tspan x="132" dy="-15" fontSize="16" letterSpacing="0.5">Triad</tspan>
        <tspan x="132" dy="15" fontSize="11" letterSpacing="2" opacity="0.8">of</tspan>
        <tspan x="132" dy="16" fontSize="16" letterSpacing="0.5">Power</tspan>
      </text>
    </svg>
  );
}
