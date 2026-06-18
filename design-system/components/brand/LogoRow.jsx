import React from "react";

/**
 * Member-club social-proof row. By default renders the system's club-logo
 * image; pass an array of `logos` ({src, alt}) to supply your own, shown
 * mono/white on the dark canvas.
 */
export function LogoRow({ src = "assets/img/club-logos.png", logos, height = 64, style = {}, ...rest }) {
  if (logos && logos.length) {
    return (
      <div
        {...rest}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: 48,
          ...style,
        }}
      >
        {logos.map((l, i) => (
          <img
            key={i}
            src={l.src}
            alt={l.alt || ""}
            style={{ height, width: "auto", objectFit: "contain", filter: "brightness(0) invert(1)", opacity: 0.9 }}
          />
        ))}
      </div>
    );
  }
  return <img {...rest} src={src} alt="Member clubs" style={{ width: "100%", display: "block", opacity: 0.92, ...style }} />;
}
