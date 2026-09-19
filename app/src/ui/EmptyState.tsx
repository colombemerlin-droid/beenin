import type { ReactNode } from 'react';

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div
      style={{
        marginTop: 16,
        background: 'var(--cream)',
        borderRadius: 14,
        padding: '28px 20px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <div className="serif" style={{ fontSize: 19, lineHeight: 1.3 }}>
        {title}
      </div>
      <div style={{ font: '400 13px/1.55 Inter, sans-serif', color: 'var(--ink-body)', maxWidth: 260 }}>{body}</div>
      {action}
    </div>
  );
}
