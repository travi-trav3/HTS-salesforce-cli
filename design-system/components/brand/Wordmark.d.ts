import React from "react";

export interface WordmarkProps extends React.HTMLAttributes<HTMLImageElement> {
  /** Path to the wordmark PNG (defaults to the system asset) */
  src?: string;
  height?: number;
  alt?: string;
  style?: React.CSSProperties;
}

/** The clubpilot wordmark image lockup for dark surfaces. */
export function Wordmark(props: WordmarkProps): JSX.Element;
