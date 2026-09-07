'use client';
import { Children, useState, type ComponentProps } from 'react';

/** Native disclosure semantics, without creating hidden SVG/row trees. */
export function LazyDetails({
  children,
  open,
  ...props
}: ComponentProps<'details'>) {
  const [expanded, setExpanded] = useState(Boolean(open));
  const [summary, ...content] = Children.toArray(children);
  return (
    <details
      {...props}
      open={open}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
    >
      {summary}
      {(open || expanded) && content}
    </details>
  );
}
