import React from "react";

/**
 * Press / feature callout pill — "As seen in Golf Digest", "PGA Show #2 Booth".
 * tone: outline (default), solid green, solid orange.
 */
export function Badge({ children, tone = "outline", style = {}, ...rest }) {
  const tones = {
    outline: { background: "transparent", color: "#fff", boxShadow: "inset 0 0 0 1.5px var(--cp-line-strong, rgba(255,255,255,.24))" },
    green:   { background: "var(--cp-green-confirm, #0acb40)", color: "#03210f", boxShadow: "none" },
    orange:  { background: "var(--cp-orange-flat, #ef6a24)", color: "#fff", boxShadow: "none" },
    slate:   { background: "var(--cp-slate, #435267)", color: "#fff", boxShadow: "none" },
  };
  return (
    <span
      {...rest}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontFamily: "var(--font-body, 'Montserrat', sans-serif)",
        fontWeight: 600,
        fontSize: 15,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        padding: "9px 18px",
        borderRadius: 999,
        ...tones[tone],
        ...style,
      }}
    >
      {children}
    </span>
  );
}
