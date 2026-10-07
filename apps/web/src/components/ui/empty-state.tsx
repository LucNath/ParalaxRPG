import type { ReactNode } from 'react';

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return <div className="empty-state"><span className="empty-state-icon" aria-hidden="true">{icon}</span><h3>{title}</h3><p>{children}</p></div>;
}
