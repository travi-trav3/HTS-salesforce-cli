import React from "react";

export interface LogoRowProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Default club-logos image path (used when `logos` is omitted) */
  src?: string;
  /** Supply individual logos to render mono/white on dark */
  logos?: { src: string; alt?: string }[];
  height?: number;
  style?: React.CSSProperties;
}

/** Member-club social-proof logo row, mono on the dark canvas. */
export function LogoRow(props: LogoRowProps): JSX.Element;
