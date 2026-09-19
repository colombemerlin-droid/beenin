import type { ReactNode } from 'react';

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="phone-frame-outer">
      <div className="phone-frame-header">
        <div className="label">Been In</div>
        <div className="serif" style={{ fontSize: 26, lineHeight: 1.15, maxWidth: 340 }}>
          Ditch the red flags. Collect the world's.
        </div>
      </div>

      <div className="phone-frame-box">{children}</div>
    </div>
  );
}

export function StatusBar() {
  return (
    <div
      style={{
        height: 47,
        flex: 'none',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        padding: '0 28px 6px',
        font: '600 13px/1 Inter, sans-serif',
        color: 'var(--ink)',
        position: 'relative',
        zIndex: 3,
      }}
    >
      <span>9:41</span>
      <span
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          top: 11,
          width: 88,
          height: 26,
          borderRadius: 999,
          background: 'var(--ink)',
        }}
      />
      <span style={{ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--ink)' }}>
        <svg width="16" height="10" viewBox="0 0 16 10">
          <path d="M1 9 L1 7 M5 9 L5 5 M9 9 L9 3 M13 9 L13 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <svg width="22" height="10" viewBox="0 0 22 10">
          <rect x="0.5" y="1.5" width="18" height="7" rx="2" fill="none" stroke="currentColor" strokeOpacity=".5" />
          <rect x="2" y="3" width="14" height="4" rx="1" fill="currentColor" />
          <rect x="20" y="4" width="1.5" height="2" fill="currentColor" opacity=".5" />
        </svg>
      </span>
    </div>
  );
}
