import type { CSSProperties, ReactNode } from 'react';

// The standard panel shell used across the ready room and cooking session.
export function Card({
  className = '',
  style,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <section
      style={style}
      className={`rounded-3xl border border-line bg-paper/80 shadow-card backdrop-blur ${className}`}
    >
      {children}
    </section>
  );
}
