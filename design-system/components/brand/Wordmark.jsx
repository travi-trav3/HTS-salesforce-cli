import React from "react";

/**
 * The clubpilot wordmark lockup (club = green, pilot = white), built for dark
 * backgrounds. Pass `src` if your page can't reach the default asset path.
 */
export function Wordmark({ src = "assets/img/wordmark-clubpilot.png", height = 48, alt = "Club Pilot", style = {}, ...rest }) {
  return (
    <img
      {...rest}
      src={src}
      alt={alt}
      style={{ height, width: "auto", display: "block", ...style }}
    />
  );
}
