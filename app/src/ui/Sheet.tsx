import { useStore } from '../state/store';
import * as api from '../lib/api';
import type { SheetAction } from '../state/types';

export function Sheet() {
  const { state, dispatch } = useStore();
  if (!state.sheet) return null;
  const close = () => dispatch({ type: 'CLOSE_SHEET' });

  function pick(kind: SheetAction['kind']) {
    // Read the target before dispatching — the reducer clears/changes it.
    const target = state.sheetTarget;
    const entry = state.entries.find((e) => e.id === target);
    dispatch({ type: 'PICK_SHEET', kind });
    const me = state.authUserId;
    if (!me) return;
    const fail = () => dispatch({ type: 'SHOW_TOAST', message: "couldn't sync that change to your account." });
    if (kind === 'report' && state.friendPosts.some((p) => p.id === target)) api.reportEntry(target, me).catch(fail);
    if (!entry) return;
    if (kind === 'vis') api.updateEntry(entry.id, { pub: !entry.pub }).catch(fail);
    if (kind === 'del') api.deleteEntry(entry.id, entry.photoPath).catch(fail);
  }
  return (
    <div
      onClick={close}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 60,
        background: 'rgba(31,26,23,.32)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: 10,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--paper)',
          borderRadius: 22,
          padding: '6px 8px 8px',
          boxShadow: '0 2px 6px rgba(31,26,23,.08), 0 18px 40px rgba(31,26,23,.1)',
        }}
      >
        <div style={{ padding: '12px 12px 8px', font: '400 12px/1.4 Inter, sans-serif', color: 'var(--ink-40)', textAlign: 'center' }}>
          {state.sheet.title}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {state.sheet.actions.map((a) => (
            <button
              key={a.kind}
              onClick={() => pick(a.kind)}
              style={{
                textAlign: 'left',
                padding: '14px 14px',
                borderRadius: 14,
                background: 'transparent',
                border: 0,
                cursor: 'pointer',
                font: '500 15px/1.3 Inter, sans-serif',
                color: a.color || 'var(--ink)',
              }}
            >
              {a.label}
            </button>
          ))}
          <button
            onClick={close}
            style={{
              textAlign: 'left',
              padding: 14,
              borderRadius: 14,
              background: 'transparent',
              border: 0,
              cursor: 'pointer',
              font: '500 15px/1.3 Inter, sans-serif',
              color: 'var(--ink-40)',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
