import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children?: React.ReactNode;
  tone?: "outline" | "green" | "orange" | "slate";
  style?: React.CSSProperties;
}

/** Press / feature callout pill (e.g. "As seen in Golf Digest"). */
export function Badge(props: BadgeProps): JSX.Element;
