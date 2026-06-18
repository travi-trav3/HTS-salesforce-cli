import React from "react";

export interface ButtonProps extends React.HTMLAttributes<HTMLElement> {
  /** Button label / content */
  children?: React.ReactNode;
  /** primary = orange CTA, secondary = azure, brand = green, outline = bordered */
  variant?: "primary" | "secondary" | "brand" | "outline";
  size?: "sm" | "md" | "lg";
  /** Render as an anchor when set */
  href?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  style?: React.CSSProperties;
}

/**
 * Club Pilot pill button — primary action is the orange gradient CTA.
 * @startingPoint section="Core" subtitle="Pill CTA — orange / azure / green / outline" viewport="700x150"
 */
export function Button(props: ButtonProps): JSX.Element;
