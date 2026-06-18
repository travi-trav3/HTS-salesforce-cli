import React from "react";

export interface EyebrowProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  /** Override the default confirmation-green */
  color?: string;
  style?: React.CSSProperties;
}

/** Green uppercase eyebrow label that sits above a headline. */
export function Eyebrow(props: EyebrowProps): JSX.Element;
