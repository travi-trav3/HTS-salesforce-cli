import React from "react";

export interface TriadMarkProps extends React.SVGAttributes<SVGSVGElement> {
  size?: number;
  /** color = green/orange/green filled glyphs; mono = single-color outline */
  tone?: "color" | "mono";
  /** color used when tone="mono" */
  color?: string;
  style?: React.CSSProperties;
}

/**
 * The Triad signature mark — three connected speech bubbles (AI Assist, SMS, App).
 * @startingPoint section="Brand" subtitle="Triad of Power signature mark" viewport="700x220"
 */
export function TriadMark(props: TriadMarkProps): JSX.Element;
