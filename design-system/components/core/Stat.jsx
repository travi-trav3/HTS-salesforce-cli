import React from "react";

/**
 * Oversized stat / proof numeral. The number is the hero; the unit and
 * label support it. e.g. value="98" unit="%" label="text open rate".
 */
export function Stat({ value, unit, label, accent, align = "left", style = {}, ...rest }) {
  const accentColor = accent || "var(--cp-green-confirm, #0acb40)";
  return (
    <div
      {...rest}
      style={{
        fontFamily: "var(--font-display, 'Montserrat', sans-serif)",
        textAlign: align,
        color: "#fff",
        ...style,
      }}
    >
      <div style={{ fontSize: "var(--fs-stat, 120px)", fontWeight: 700, lineHeight: 0.9, letterSpacing: "-0.03em" }}>
        {value}
        {unit ? <span style={{ color: accentColor }}>{unit}</span> : null}
      </div>
      {label ? (
        <div style={{
          marginTop: 14,
          fontSize: "var(--fs-body, 24px)",
          fontWeight: 500,
          color: "rgba(255,255,255,0.82)",
          maxWidth: 360,
          marginLeft: align === "center" ? "auto" : 0,
          marginRight: align === "center" ? "auto" : 0,
        }}>
          {label}
        </div>
      ) : null}
    </div>
  );
}
