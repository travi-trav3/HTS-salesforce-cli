import React from "react";

/**
 * The conversation motif — a rounded speech bubble with a tail.
 * role: incoming (slate), outgoing (azure), orange, green, outline.
 * tail: "left" | "right" | "none".
 */
export function ChatBubble({
  children,
  role = "incoming",
  tail = "left",
  style = {},
  ...rest
}) {
  const roles = {
    incoming: { background: "var(--cp-slate, #435267)", color: "#fff", border: "none" },
    outgoing: { background: "var(--cp-azure-top, #009ee8)", color: "#fff", border: "none" },
    orange:   { background: "var(--cp-orange-flat, #ef6a24)", color: "#fff", border: "none" },
    green:    { background: "var(--cp-green-confirm, #0acb40)", color: "#03210f", border: "none" },
    outline:  { background: "transparent", color: "var(--cp-orange-flat,#ef6a24)", border: "3px solid var(--cp-orange-flat, #ef6a24)" },
  };
  const r = roles[role];
  const tailColor = role === "outline" ? "transparent" : r.background;
  const tailBorder = role === "outline" ? r.border : "none";

  return (
    <div
      {...rest}
      style={{
        position: "relative",
        display: "inline-block",
        maxWidth: 340,
        padding: "16px 22px",
        borderRadius: "var(--r-bubble, 28px)",
        fontFamily: "var(--font-body, 'Montserrat', sans-serif)",
        fontWeight: 500,
        fontSize: 18,
        lineHeight: 1.3,
        background: r.background,
        color: r.color,
        border: r.border,
        boxShadow: "var(--shadow-bubble, 0 8px 24px rgba(3,7,18,.4))",
        ...style,
      }}
    >
      {children}
      {tail !== "none" && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            bottom: -2,
            [tail === "left" ? "left" : "right"]: 18,
            width: 22,
            height: 22,
            background: tailColor,
            border: tailBorder,
            borderTop: "none",
            borderRight: tail === "left" ? tailBorder : "none",
            borderLeft: tail === "right" ? tailBorder : "none",
            borderBottomLeftRadius: tail === "left" ? 4 : 22,
            borderBottomRightRadius: tail === "right" ? 4 : 22,
            transform: `translateY(40%) ${tail === "left" ? "skewX(-18deg)" : "skewX(18deg)"}`,
          }}
        />
      )}
    </div>
  );
}
