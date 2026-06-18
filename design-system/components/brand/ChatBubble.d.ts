import React from "react";

export interface ChatBubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  /** incoming = slate, outgoing = azure, plus orange / green / outline */
  role?: "incoming" | "outgoing" | "orange" | "green" | "outline";
  tail?: "left" | "right" | "none";
  style?: React.CSSProperties;
}

/**
 * The Club Pilot conversation motif — a rounded speech bubble with a tail.
 * @startingPoint section="Brand" subtitle="Speech-bubble conversation motif" viewport="700x200"
 */
export function ChatBubble(props: ChatBubbleProps): JSX.Element;
