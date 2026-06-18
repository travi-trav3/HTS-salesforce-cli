/* @ds-bundle: {"format":3,"namespace":"ClubPilotDesignSystem_316eba","components":[{"name":"ChatBubble","sourcePath":"components/brand/ChatBubble.jsx"},{"name":"LogoRow","sourcePath":"components/brand/LogoRow.jsx"},{"name":"TriadMark","sourcePath":"components/brand/TriadMark.jsx"},{"name":"Wordmark","sourcePath":"components/brand/Wordmark.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Eyebrow","sourcePath":"components/core/Eyebrow.jsx"},{"name":"Stat","sourcePath":"components/core/Stat.jsx"}],"sourceHashes":{"components/brand/ChatBubble.jsx":"1725ba9dc3a4","components/brand/LogoRow.jsx":"c3e3ed4cafac","components/brand/TriadMark.jsx":"d8b81cb87fb6","components/brand/Wordmark.jsx":"5b21d791d12e","components/core/Badge.jsx":"417396f6c260","components/core/Button.jsx":"f1ea736909ed","components/core/Eyebrow.jsx":"92c588fa0dd0","components/core/Stat.jsx":"b2a1ca372bbe","ui_kits/sms-platform/CommScreen.jsx":"7932941e1701","ui_kits/sms-platform/DashboardScreen.jsx":"6db361b6c87e","ui_kits/sms-platform/parts.jsx":"cd9453ebe1d0"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.ClubPilotDesignSystem_316eba = window.ClubPilotDesignSystem_316eba || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/brand/ChatBubble.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * The conversation motif — a rounded speech bubble with a tail.
 * role: incoming (slate), outgoing (azure), orange, green, outline.
 * tail: "left" | "right" | "none".
 */
function ChatBubble({
  children,
  role = "incoming",
  tail = "left",
  style = {},
  ...rest
}) {
  const roles = {
    incoming: {
      background: "var(--cp-slate, #435267)",
      color: "#fff",
      border: "none"
    },
    outgoing: {
      background: "var(--cp-azure-top, #009ee8)",
      color: "#fff",
      border: "none"
    },
    orange: {
      background: "var(--cp-orange-flat, #ef6a24)",
      color: "#fff",
      border: "none"
    },
    green: {
      background: "var(--cp-green-confirm, #0acb40)",
      color: "#03210f",
      border: "none"
    },
    outline: {
      background: "transparent",
      color: "var(--cp-orange-flat,#ef6a24)",
      border: "3px solid var(--cp-orange-flat, #ef6a24)"
    }
  };
  const r = roles[role];
  const tailColor = role === "outline" ? "transparent" : r.background;
  const tailBorder = role === "outline" ? r.border : "none";
  return /*#__PURE__*/React.createElement("div", _extends({}, rest, {
    style: {
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
      ...style
    }
  }), children, tail !== "none" && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": true,
    style: {
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
      transform: `translateY(40%) ${tail === "left" ? "skewX(-18deg)" : "skewX(18deg)"}`
    }
  }));
}
Object.assign(__ds_scope, { ChatBubble });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/ChatBubble.jsx", error: String((e && e.message) || e) }); }

// components/brand/LogoRow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Member-club social-proof row. By default renders the system's club-logo
 * image; pass an array of `logos` ({src, alt}) to supply your own, shown
 * mono/white on the dark canvas.
 */
function LogoRow({
  src = "assets/img/club-logos.png",
  logos,
  height = 64,
  style = {},
  ...rest
}) {
  if (logos && logos.length) {
    return /*#__PURE__*/React.createElement("div", _extends({}, rest, {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexWrap: "wrap",
        gap: 48,
        ...style
      }
    }), logos.map((l, i) => /*#__PURE__*/React.createElement("img", {
      key: i,
      src: l.src,
      alt: l.alt || "",
      style: {
        height,
        width: "auto",
        objectFit: "contain",
        filter: "brightness(0) invert(1)",
        opacity: 0.9
      }
    })));
  }
  return /*#__PURE__*/React.createElement("img", _extends({}, rest, {
    src: src,
    alt: "Member clubs",
    style: {
      width: "100%",
      display: "block",
      opacity: 0.92,
      ...style
    }
  }));
}
Object.assign(__ds_scope, { LogoRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/LogoRow.jsx", error: String((e && e.message) || e) }); }

// components/brand/TriadMark.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
function TriadMark({
  size = 260,
  tone = "color",
  color = "#fff",
  style = {},
  ...rest
}) {
  const mono = tone === "mono";
  const green = "#0acb40"; // AI Assist
  const orange = "#ef6a24"; // Text Messaging
  const azure = "#009ee8"; // Member App
  const cText = mono ? color : "#ffffff";
  const sc = c => mono ? color : c;

  // ---- Venn geometry (viewBox 0 0 264 254) ----
  // centroid (132,139); equilateral centers, spacing d = R = 80 (Rc = R/√3).
  const R = 80;
  const circles = [{
    cx: 132,
    cy: 92.8,
    col: green
  },
  // top → AI Assist
  {
    cx: 92,
    cy: 162.1,
    col: orange
  },
  // bottom-left → Text Messaging
  {
    cx: 172,
    cy: 162.1,
    col: azure
  } // bottom-right → Member App
  ];

  // one 24×24 line icon, placed centered at (x,y) with scale s
  const Icon = ({
    x,
    y,
    s,
    col,
    kind
  }) => {
    const stroke = sc(col);
    const t = `translate(${x - 12 * s} ${y - 12 * s}) scale(${s})`;
    return /*#__PURE__*/React.createElement("g", {
      transform: t,
      fill: "none",
      stroke: stroke,
      strokeWidth: "1.85",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7A8.38 8.38 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z"
    }), kind === "ai" && /*#__PURE__*/React.createElement("path", {
      d: "M12.5 7.4l.95 2.2 2.2.95-2.2.95-.95 2.2-.95-2.2-2.2-.95 2.2-.95z",
      fill: stroke,
      stroke: "none"
    }), kind === "sms" && /*#__PURE__*/React.createElement("g", {
      fill: stroke,
      stroke: "none"
    }, /*#__PURE__*/React.createElement("circle", {
      cx: "8.4",
      cy: "11.5",
      r: "1.15"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "12.5",
      cy: "11.5",
      r: "1.15"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "16.6",
      cy: "11.5",
      r: "1.15"
    })));
  };

  // phone icon for the App circle
  const Phone = ({
    x,
    y,
    s,
    col
  }) => {
    const stroke = sc(col);
    const t = `translate(${x - 12 * s} ${y - 12 * s}) scale(${s})`;
    return /*#__PURE__*/React.createElement("g", {
      transform: t,
      fill: "none",
      stroke: stroke,
      strokeWidth: "1.85",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }, /*#__PURE__*/React.createElement("rect", {
      x: "6",
      y: "2.5",
      width: "12",
      height: "19",
      rx: "2.6"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "10.5",
      y1: "18.6",
      x2: "13.5",
      y2: "18.6"
    }));
  };
  return /*#__PURE__*/React.createElement("svg", _extends({}, rest, {
    width: size,
    height: size * 254 / 264,
    viewBox: "0 0 264 254",
    fill: "none",
    style: {
      display: "block",
      ...style
    },
    role: "img",
    "aria-label": "Club Pilot Triad of Power"
  }), circles.map((c, i) => /*#__PURE__*/React.createElement("circle", {
    key: i,
    cx: c.cx,
    cy: c.cy,
    r: R,
    fill: mono ? "none" : c.col,
    fillOpacity: mono ? 0 : 0.2,
    stroke: sc(c.col),
    strokeWidth: "2.6"
  })), /*#__PURE__*/React.createElement(Icon, {
    x: 132,
    y: 56,
    s: 1.8,
    col: green,
    kind: "ai"
  }), /*#__PURE__*/React.createElement(Icon, {
    x: 60,
    y: 180.5,
    s: 1.8,
    col: orange,
    kind: "sms"
  }), /*#__PURE__*/React.createElement(Phone, {
    x: 204,
    y: 180.5,
    s: 1.8,
    col: azure
  }), /*#__PURE__*/React.createElement("text", {
    x: "132",
    y: "139",
    textAnchor: "middle",
    fontFamily: "'Montserrat', sans-serif",
    fontWeight: "700",
    fill: cText,
    style: {
      textTransform: "uppercase"
    }
  }, /*#__PURE__*/React.createElement("tspan", {
    x: "132",
    dy: "-15",
    fontSize: "16",
    letterSpacing: "0.5"
  }, "Triad"), /*#__PURE__*/React.createElement("tspan", {
    x: "132",
    dy: "15",
    fontSize: "11",
    letterSpacing: "2",
    opacity: "0.8"
  }, "of"), /*#__PURE__*/React.createElement("tspan", {
    x: "132",
    dy: "16",
    fontSize: "16",
    letterSpacing: "0.5"
  }, "Power")));
}
Object.assign(__ds_scope, { TriadMark });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/TriadMark.jsx", error: String((e && e.message) || e) }); }

// components/brand/Wordmark.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * The clubpilot wordmark lockup (club = green, pilot = white), built for dark
 * backgrounds. Pass `src` if your page can't reach the default asset path.
 */
function Wordmark({
  src = "assets/img/wordmark-clubpilot.png",
  height = 48,
  alt = "Club Pilot",
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("img", _extends({}, rest, {
    src: src,
    alt: alt,
    style: {
      height,
      width: "auto",
      display: "block",
      ...style
    }
  }));
}
Object.assign(__ds_scope, { Wordmark });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/Wordmark.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Press / feature callout pill — "As seen in Golf Digest", "PGA Show #2 Booth".
 * tone: outline (default), solid green, solid orange.
 */
function Badge({
  children,
  tone = "outline",
  style = {},
  ...rest
}) {
  const tones = {
    outline: {
      background: "transparent",
      color: "#fff",
      boxShadow: "inset 0 0 0 1.5px var(--cp-line-strong, rgba(255,255,255,.24))"
    },
    green: {
      background: "var(--cp-green-confirm, #0acb40)",
      color: "#03210f",
      boxShadow: "none"
    },
    orange: {
      background: "var(--cp-orange-flat, #ef6a24)",
      color: "#fff",
      boxShadow: "none"
    },
    slate: {
      background: "var(--cp-slate, #435267)",
      color: "#fff",
      boxShadow: "none"
    }
  };
  return /*#__PURE__*/React.createElement("span", _extends({}, rest, {
    style: {
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
      ...style
    }
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Club Pilot button — fully pill-shaped action.
 * Primary = vertical orange gradient, Secondary = vertical azure gradient,
 * Brand/Success = green, Outline = bordered (on dark).
 */
function Button({
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
    sm: {
      padding: "12px 24px",
      fontSize: 15
    },
    md: {
      padding: "18px 38px",
      fontSize: 19
    },
    lg: {
      padding: "24px 56px",
      fontSize: 24
    }
  };
  const variants = {
    primary: {
      background: "linear-gradient(180deg, var(--cp-orange-top,#ed5901) 0%, var(--cp-orange-bottom,#b83c00) 100%)",
      color: "#fff",
      boxShadow: "var(--shadow-cta, 0 12px 28px -8px rgba(237,89,1,.45))"
    },
    secondary: {
      background: "linear-gradient(180deg, var(--cp-azure-top,#009ee8) 0%, var(--cp-azure-bottom,#006fa7) 100%)",
      color: "#fff",
      boxShadow: "var(--shadow-azure, 0 12px 28px -8px rgba(0,158,232,.4))"
    },
    brand: {
      background: "linear-gradient(180deg, var(--cp-green-confirm,#0acb40) 0%, var(--cp-green-brand-d,#004b31) 150%)",
      color: "#fff",
      boxShadow: "0 12px 28px -10px rgba(10,203,64,.45)"
    },
    outline: {
      background: "transparent",
      color: "#fff",
      boxShadow: "inset 0 0 0 2px var(--cp-line-strong, rgba(255,255,255,.24))"
    }
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
    ...style
  };
  const Tag = href ? "a" : "button";
  const tagProps = href ? {
    href
  } : {
    type,
    disabled
  };
  return /*#__PURE__*/React.createElement(Tag, _extends({}, tagProps, rest, {
    style: base,
    onMouseDown: e => {
      if (!disabled) e.currentTarget.style.transform = "scale(.97)";
    },
    onMouseUp: e => {
      e.currentTarget.style.transform = "scale(1)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.transform = "scale(1)";
      e.currentTarget.style.filter = "none";
    },
    onMouseEnter: e => {
      if (!disabled) e.currentTarget.style.filter = "brightness(1.06)";
    }
  }), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Eyebrow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Green uppercase section label — the eyebrow above a headline. */
function Eyebrow({
  children,
  color,
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({}, rest, {
    style: {
      fontFamily: "var(--font-body, 'Montserrat', sans-serif)",
      fontWeight: 500,
      fontSize: "var(--fs-eyebrow, 26px)",
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      color: color || "var(--cp-green-confirm, #0acb40)",
      ...style
    }
  }), children);
}
Object.assign(__ds_scope, { Eyebrow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Eyebrow.jsx", error: String((e && e.message) || e) }); }

// components/core/Stat.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Oversized stat / proof numeral. The number is the hero; the unit and
 * label support it. e.g. value="98" unit="%" label="text open rate".
 */
function Stat({
  value,
  unit,
  label,
  accent,
  align = "left",
  style = {},
  ...rest
}) {
  const accentColor = accent || "var(--cp-green-confirm, #0acb40)";
  return /*#__PURE__*/React.createElement("div", _extends({}, rest, {
    style: {
      fontFamily: "var(--font-display, 'Montserrat', sans-serif)",
      textAlign: align,
      color: "#fff",
      ...style
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--fs-stat, 120px)",
      fontWeight: 700,
      lineHeight: 0.9,
      letterSpacing: "-0.03em"
    }
  }, value, unit ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: accentColor
    }
  }, unit) : null), label ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      fontSize: "var(--fs-body, 24px)",
      fontWeight: 500,
      color: "rgba(255,255,255,0.82)",
      maxWidth: 360,
      marginLeft: align === "center" ? "auto" : 0,
      marginRight: align === "center" ? "auto" : 0
    }
  }, label) : null);
}
Object.assign(__ds_scope, { Stat });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Stat.jsx", error: String((e && e.message) || e) }); }

// ui_kits/sms-platform/CommScreen.jsx
try { (() => {
// Club Pilot SMS Platform — Communication Center (conversational SMS)
// Contact list + live chat thread with a working composer.

function CommScreen() {
  const {
    CP_DATA
  } = window;
  const [active, setActive] = React.useState(0);
  const [thread, setThread] = React.useState(CP_DATA.thread);
  const [draft, setDraft] = React.useState("");
  const endRef = React.useRef(null);
  React.useEffect(() => {
    if (endRef.current) endRef.current.scrollTop = endRef.current.scrollHeight;
  }, [thread]);
  function send() {
    if (!draft.trim()) return;
    setThread(t => [...t, {
      from: "out",
      text: draft.trim()
    }]);
    setDraft("");
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 300,
      flex: "none",
      borderRight: "1px solid rgba(255,255,255,0.06)",
      background: "#0b1019",
      overflow: "auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "18px 20px",
      fontSize: 13,
      fontWeight: 600,
      color: "#0acb40",
      textTransform: "uppercase",
      letterSpacing: "0.05em"
    }
  }, "Conversations"), CP_DATA.contacts.map((c, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    onClick: () => setActive(i),
    style: {
      display: "block",
      width: "100%",
      textAlign: "left",
      border: 0,
      cursor: "pointer",
      padding: "14px 20px",
      background: i === active ? "rgba(10,203,64,0.08)" : "transparent",
      borderLeft: i === active ? "3px solid #0acb40" : "3px solid transparent"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#fff",
      fontSize: 15,
      fontWeight: 600
    }
  }, c.name), c.unread > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 20,
      height: 20,
      padding: "0 6px",
      borderRadius: 999,
      background: "#0acb40",
      color: "#03210f",
      fontSize: 12,
      fontWeight: 700,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, c.unread)), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "rgba(255,255,255,0.5)",
      fontSize: 13,
      marginTop: 3,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, c.preview)))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      minWidth: 0,
      background: "#070b13"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "16px 24px",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 999,
      background: "#1c2533",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#0acb40",
      fontWeight: 700
    }
  }, CP_DATA.contacts[active].name[0]), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#fff",
      fontSize: 16,
      fontWeight: 600
    }
  }, CP_DATA.contacts[active].name), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#95a0b3",
      fontSize: 12
    }
  }, "Texting \xB7 opted in"))), /*#__PURE__*/React.createElement("div", {
    ref: endRef,
    style: {
      flex: 1,
      overflow: "auto",
      padding: 24,
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, thread.map((m, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      justifyContent: m.from === "out" ? "flex-end" : "flex-start"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      maxWidth: "70%",
      padding: "12px 18px",
      borderRadius: 22,
      fontSize: 15,
      lineHeight: 1.34,
      fontWeight: 500,
      background: m.from === "out" ? "linear-gradient(180deg,#009ee8 0%,#006fa7 100%)" : "#435267",
      color: "#fff"
    }
  }, m.text)))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 18,
      borderTop: "1px solid rgba(255,255,255,0.06)",
      display: "flex",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: draft,
    onChange: e => setDraft(e.target.value),
    onKeyDown: e => {
      if (e.key === "Enter") send();
    },
    placeholder: "Type a message\u2026",
    style: {
      flex: 1,
      background: "#101828",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 999,
      padding: "14px 22px",
      color: "#fff",
      fontSize: 15,
      fontFamily: "var(--font-body,'Montserrat',sans-serif)",
      outline: "none"
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: send,
    style: {
      border: 0,
      cursor: "pointer",
      padding: "0 28px",
      borderRadius: 999,
      background: "linear-gradient(180deg,#0acb40 0%,#004b31 160%)",
      color: "#fff",
      fontSize: 15,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.05em"
    }
  }, "Send"))));
}
Object.assign(window, {
  CommScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/sms-platform/CommScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/sms-platform/DashboardScreen.jsx
try { (() => {
// Club Pilot SMS Platform — Dashboard screen
// Setup Checklist · Communication preview · April Performance

function CpCircle({
  value,
  done
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      width: 46,
      height: 46,
      borderRadius: 999,
      flex: "none",
      border: `2.5px solid ${done ? "#0acb40" : "rgba(255,255,255,0.18)"}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: done ? "#0acb40" : "rgba(255,255,255,0.85)",
      fontSize: 14,
      fontWeight: 700,
      background: done ? "rgba(10,203,64,0.08)" : "transparent"
    }
  }, value);
}
function CpPanel({
  title,
  headerColor,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      background: "#0e1420",
      borderRadius: 14,
      overflow: "hidden",
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 18px",
      fontSize: 14,
      fontWeight: 600,
      color: headerColor === "green" ? "#03210f" : "#fff",
      background: headerColor === "green" ? "#0acb40" : "#1a2333",
      textTransform: "uppercase",
      letterSpacing: "0.04em"
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 18
    }
  }, children));
}
function DashboardScreen() {
  const {
    CP_DATA
  } = window;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 26,
      flex: 1,
      overflow: "auto"
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: "0 0 22px",
      color: "#fff",
      fontSize: 26,
      fontWeight: 600
    }
  }, "Dashboard"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 18,
      alignItems: "stretch"
    }
  }, /*#__PURE__*/React.createElement(CpPanel, {
    title: "Setup Checklist"
  }, CP_DATA.checklist.map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "10px 0",
      borderBottom: i < CP_DATA.checklist.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none"
    }
  }, /*#__PURE__*/React.createElement(CpCircle, {
    value: c.value,
    done: c.done
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "rgba(255,255,255,0.85)",
      fontSize: 15,
      fontWeight: 500
    }
  }, c.label))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      padding: "10px 22px",
      borderRadius: 999,
      background: "linear-gradient(180deg,#0acb40 0%,#004b31 160%)",
      color: "#fff",
      fontSize: 13,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.05em"
    }
  }, "Setup Complete"))), /*#__PURE__*/React.createElement(CpPanel, {
    title: "Communication Center",
    headerColor: "green"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, CP_DATA.thread.slice(0, 5).map((m, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      justifyContent: m.from === "out" ? "flex-end" : "flex-start"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      maxWidth: "78%",
      padding: "9px 14px",
      borderRadius: 16,
      fontSize: 13.5,
      lineHeight: 1.32,
      fontWeight: 500,
      background: m.from === "out" ? "#009ee8" : "#435267",
      color: "#fff"
    }
  }, m.text))))), /*#__PURE__*/React.createElement(CpPanel, {
    title: "April Performance",
    headerColor: "green"
  }, CP_DATA.performance.map((p, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "10px 0",
      borderBottom: i < CP_DATA.performance.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 46,
      height: 46,
      borderRadius: 999,
      flex: "none",
      border: "2.5px solid #0acb40",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#0acb40",
      fontSize: 13,
      fontWeight: 700
    }
  }, p.value), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "rgba(255,255,255,0.85)",
      fontSize: 15,
      fontWeight: 500
    }
  }, p.label))))));
}
Object.assign(window, {
  DashboardScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/sms-platform/DashboardScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/sms-platform/parts.jsx
try { (() => {
// Club Pilot SMS Platform — shared chrome + sample data
// Exports: CpTopBar, CpSidebar, CP_NAV, CP_DATA

const CP_NAV = [{
  key: "dashboard",
  label: "Dashboard",
  dot: "#0acb40"
}, {
  key: "setup",
  label: "Setup",
  dot: "#04ae4d"
}, {
  key: "communication",
  label: "Communication",
  dot: "#009ee8"
}, {
  key: "performance",
  label: "Performance",
  dot: "#ef6a24"
}, {
  key: "help",
  label: "Help Center",
  dot: "#95a0b3"
}];
const CP_DATA = {
  checklist: [{
    label: "Credits",
    value: "5000",
    done: false
  }, {
    label: "App Branding",
    value: "✓",
    done: true
  }, {
    label: "Event Calendar",
    value: "✓",
    done: true
  }, {
    label: "Groups",
    value: "31",
    done: false
  }, {
    label: "Templates",
    value: "14",
    done: false
  }],
  performance: [{
    label: "Members",
    value: "1.2k"
  }, {
    label: "Text Delivery",
    value: "98%"
  }, {
    label: "App Users",
    value: "740"
  }, {
    label: "Total Opt-in",
    value: "96%"
  }, {
    label: "Total Opt-out",
    value: "4%"
  }],
  contacts: [{
    name: "Tony Catlin",
    preview: "Are you coming to the tournament?",
    time: "5/13/2026",
    unread: 2
  }, {
    name: "Marcus Reed",
    preview: "Tee time confirmed — thanks!",
    time: "5/13/2026",
    unread: 0
  }, {
    name: "Priya Anand",
    preview: "Is the dining room open tonight?",
    time: "5/12/2026",
    unread: 1
  }, {
    name: "Will Foster",
    preview: "Got it, see you on the green.",
    time: "5/12/2026",
    unread: 0
  }, {
    name: "Dana Klein",
    preview: "Can I bring two guests Sunday?",
    time: "5/11/2026",
    unread: 0
  }],
  thread: [{
    from: "in",
    text: "Are you coming to the tournament this weekend? I've already set everything up."
  }, {
    from: "out",
    text: "Yes! Packing up already."
  }, {
    from: "in",
    text: "Is Tom coming with you as well?"
  }, {
    from: "out",
    text: "I have already discussed how to match the teams — both Michael and I will be there."
  }, {
    from: "in",
    text: "Please remember to register with the app so I can make sure all is ready to go when I arrive."
  }, {
    from: "out",
    text: "No problem — I have already sent the request via the app and got the confirmation."
  }, {
    from: "in",
    text: "Perfect. See you on the green, have a nice trip."
  }]
};
function CpTopBar({
  wordmarkSrc
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 28px",
      height: 72,
      background: "#0b1019",
      borderBottom: "1px solid rgba(255,255,255,0.06)"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: wordmarkSrc,
    alt: "clubpilot",
    style: {
      height: 30
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "rgba(255,255,255,0.7)",
      fontSize: 15,
      fontWeight: 500
    }
  }, "Hi, Byron"), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 38,
      height: 38,
      borderRadius: 999,
      background: "#1c2533",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 16
    }
  }, "\uD83C\uDFA7"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#0acb40",
      fontSize: 12
    }
  }, "\u25BC")));
}
function CpSidebar({
  active,
  onNav
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 230,
      background: "#0b1019",
      padding: "22px 16px",
      flex: "none",
      borderRight: "1px solid rgba(255,255,255,0.06)"
    }
  }, CP_NAV.map(n => {
    const on = active === n.key;
    return /*#__PURE__*/React.createElement("button", {
      key: n.key,
      onClick: () => onNav(n.key),
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        padding: "13px 14px",
        marginBottom: 6,
        borderRadius: 10,
        border: 0,
        cursor: "pointer",
        background: on ? "rgba(10,203,64,0.10)" : "transparent",
        color: on ? "#fff" : "rgba(255,255,255,0.66)",
        fontFamily: "var(--font-body,'Montserrat',sans-serif)",
        fontSize: 15,
        fontWeight: 500,
        textAlign: "left"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 22,
        height: 22,
        borderRadius: 999,
        flex: "none",
        border: `2px solid ${n.dot}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 7,
        height: 7,
        borderRadius: 999,
        background: n.dot
      }
    })), n.label);
  }));
}
Object.assign(window, {
  CP_NAV,
  CP_DATA,
  CpTopBar,
  CpSidebar
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/sms-platform/parts.jsx", error: String((e && e.message) || e) }); }

__ds_ns.ChatBubble = __ds_scope.ChatBubble;

__ds_ns.LogoRow = __ds_scope.LogoRow;

__ds_ns.TriadMark = __ds_scope.TriadMark;

__ds_ns.Wordmark = __ds_scope.Wordmark;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Eyebrow = __ds_scope.Eyebrow;

__ds_ns.Stat = __ds_scope.Stat;

})();
