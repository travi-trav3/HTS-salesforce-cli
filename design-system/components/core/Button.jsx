import React from "react";

/**
 * Club Pilot button — fully pill-shaped action.
 * Primary = vertical orange gradient, Secondary = vertical azure gradient,
 * Brand/Success = green, Outline = bordered (on dark).
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  href,
  type = "button",
  disabled = false,
  style = {},
  ...rest
}) {
  const sizes = {
    sm: { padding: "12px 24px", fontSize: 15 },
    md: { padding: "18px 38px", fontSize: 19 },
    lg: { padding: "24px 56px", fontSize: 24 },
  };

  const variants = {
    primary: {
      background: "linear-gradient(180deg, var(--cp-orange-top,#ed5901) 0%, var(--cp-orange-bottom,#b83c00) 100%)",
      color: "#fff",
      boxShadow: "var(--shadow-cta, 0 12px 28px -8px rgba(237,89,1,.45))",
    },
    secondary: {
      background: "linear-gradient(180deg, var(--cp-azure-top,#009ee8) 0%, var(--cp-azure-bottom,#006fa7) 100%)",
      color: "#fff",
      boxShadow: "var(--shadow-azure, 0 12px 28px -8px rgba(0,158,232,.4))",
    },
    brand: {
      background: "linear-gradient(180deg, var(--cp-green-confirm,#0acb40) 0%, var(--cp-green-brand-d,#004b31) 150%)",
      color: "#fff",
      boxShadow: "0 12px 28px -10px rgba(10,203,64,.45)",
    },
    outline: {
      background: "transparent",
      color: "#fff",
      boxShadow: "inset 0 0 0 2px var(--cp-line-strong, rgba(255,255,255,.24))",
    },
  };

  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    fontFamily: "var(--font-body, 'Montserrat', sans-serif)",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    border: 0,
    borderRadius: 999,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
    textDecoration: "none",
    lineHeight: 1,
    transition: "transform .16s ease, filter .16s ease",
    ...sizes[size],
    ...variants[variant],
    ...style,
  };

  const Tag = href ? "a" : "button";
  const tagProps = href ? { href } : { type, disabled };

  return (
    <Tag
      {...tagProps}
      {...rest}
      style={base}
      onMouseDown={(e) => { if (!disabled) e.currentTarget.style.transform = "scale(.97)"; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.filter = "none"; }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.filter = "brightness(1.06)"; }}
    >
      {children}
    </Tag>
  );
}
