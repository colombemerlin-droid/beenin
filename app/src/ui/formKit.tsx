export function Toggle({ on, big = false }: { on: boolean; big?: boolean }) {
  const w = big ? 48 : 44;
  const h = big ? 28 : 26;
  const knob = big ? 22 : 20;
  const left = on ? w - knob - 3 : 3;
  return (
    <span style={{ width: w, height: h, flex: 'none', borderRadius: 999, background: on ? 'var(--coral)' : 'var(--stone-dashed)', position: 'relative', display: 'block', transition: 'background 180ms' }}>
      <span
        style={{
          position: 'absolute',
          top: 3,
          left,
          width: knob,
          height: knob,
          borderRadius: '50%',
          background: 'var(--paper)',
          boxShadow: '0 1px 3px rgba(31,26,23,.2)',
          transition: 'left 180ms cubic-bezier(0.4,0,0.2,1)',
        }}
      />
    </span>
  );
}

export const chipStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  padding: '9px 13px',
  borderRadius: 999,
  border: '1px solid var(--coral-tint-2)',
  background: 'var(--coral-tint)',
  color: 'var(--coral-dark)',
  cursor: 'pointer',
  font: '500 13px/1.3 Inter, sans-serif',
} as const;

export const dashedChipStyle = {
  padding: '9px 13px',
  borderRadius: 999,
  border: '1px dashed var(--stone-dashed)',
  background: 'transparent',
  cursor: 'pointer',
  color: 'var(--ink-body)',
  font: '500 13px/1.3 Inter, sans-serif',
} as const;

export const fieldBtnStyle = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: 14,
  borderRadius: 8,
  border: '1px solid var(--stone)',
  background: 'var(--paper)',
  cursor: 'pointer',
  textAlign: 'left',
  color: 'var(--ink)',
} as const;
