import type { ReactNode } from 'react';
import { BackIcon } from './icons';

export function OverlayHeader({ title, onBack, right }: { title: ReactNode; onBack: () => void; right?: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 20px',
        borderBottom: '1px solid var(--stone)',
        position: 'sticky',
        top: 0,
        background: 'var(--cream-lighter)',
        zIndex: 2,
        flex: 'none',
      }}
    >
      <button onClick={onBack} style={{ background: 'transparent', border: 0, cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--ink)' }}>
        <BackIcon />
      </button>
      <span style={{ flex: 1, font: '600 17px/1.3 Inter, sans-serif' }}>{title}</span>
      {right}
    </div>
  );
}
