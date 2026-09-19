import { useStore } from '../state/store';

export function Toast() {
  const { state } = useStore();
  if (!state.toast) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 16,
        zIndex: 50,
        background: 'rgba(31,26,23,.94)',
        color: 'var(--cream-lighter)',
        borderRadius: 14,
        padding: '13px 16px',
        font: '400 14px/1.45 Inter, sans-serif',
      }}
    >
      {state.toast}
    </div>
  );
}
