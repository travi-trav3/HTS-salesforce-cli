import React from "react";

export interface StatProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The headline numeral, e.g. "98" or "3" */
  value: React.ReactNode;
  /** Unit shown in accent color, e.g. "%" or "min" */
  unit?: string;
  /** Supporting label below the numeral */
  label?: React.ReactNode;
  /** Accent color for the unit (defaults to confirmation green) */
  accent?: string;
  align?: "left" | "center";
  style?: React.CSSProperties;
}

/**
 * Oversized stat / proof-point numeral treatment.
 * @startingPoint section="Core" subtitle="Big proof numeral (98%)" viewport="700x240"
 */
export function Stat(props: StatProps): JSX.Element;
