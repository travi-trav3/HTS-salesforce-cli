import React from "react";

/** Green uppercase section label — the eyebrow above a headline. */
export function Eyebrow({ children, color, style = {}, ...rest }) {
  return (
    <div
      {...rest}
      style={{
        fontFamily: "var(--font-body, 'Montserrat', sans-serif)",
        fontWeight: 500,
        fontSize: "var(--fs-eyebrow, 26px)",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        color: color || "var(--cp-green-confirm, #0acb40)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
