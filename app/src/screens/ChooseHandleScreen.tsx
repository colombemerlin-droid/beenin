import { useState } from 'react';
import { useStore } from '../state/store';
import * as api from '../lib/api';

export function ChooseHandleScreen() {
  const { state, dispatch } = useStore();
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!state.authUserId || saving) return;
    const handle = state.handleDraft.trim().toLowerCase();
    setSaving(true);
    try {
      await api.claimHandle(state.authUserId, handle);
      dispatch({ type: 'SET_HANDLE', handle });
    } catch (err) {
      dispatch({ type: 'HANDLE_ERROR', message: err instanceof Error ? err.message : 'something went wrong.' });
    } finally {
      setSaving(false);
    }
  }

  const valid = api.isValidHandle(state.handleDraft.trim().toLowerCase());

  return (
    <div
      className="noscroll"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 40,
        background: 'var(--cream-lighter)',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 28px 0' }}>
        <div className="label" style={{ color: 'var(--coral-dark)' }}>
          One last thing
        </div>
        <div className="serif" style={{ fontSize: 30, lineHeight: 1.15, marginTop: 10 }}>
          Pick a handle
        </div>
        <div style={{ font: '400 14px/1.55 Inter, sans-serif', color: 'var(--ink-body)', marginTop: 12 }}>
          This is how friends find and add you — not your real name, not shown on your posts.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 24, padding: '13px 14px', borderRadius: 8, border: `1.5px solid ${state.handleError ? 'var(--coral-dark)' : 'var(--stone)'}`, background: 'var(--paper)' }}>
          <span style={{ font: '600 16px/1 Inter, sans-serif', color: 'var(--ink-40)' }}>@</span>
          <input
            autoFocus
            value={state.handleDraft}
            onChange={(e) => dispatch({ type: 'PATCH_HANDLE_DRAFT', value: e.target.value.toLowerCase() })}
            onKeyDown={(e) => e.key === 'Enter' && valid && save()}
            placeholder="yourhandle"
            style={{ flex: 1, minWidth: 0, border: 0, outline: 'none', background: 'transparent', font: '400 16px/1.4 Inter, sans-serif', color: 'var(--ink)' }}
          />
        </div>
        {state.handleError && (
          <div style={{ font: '400 13px/1.4 Inter, sans-serif', color: 'var(--coral-dark)', marginTop: 8 }}>{state.handleError}</div>
        )}
        {!state.handleError && (
          <div style={{ font: '400 12px/1.4 Inter, sans-serif', color: 'var(--ink-40)', marginTop: 8 }}>3-20 characters: lowercase letters, numbers, underscore.</div>
        )}
      </div>
      <div style={{ flex: 'none', padding: '28px 24px 40px' }}>
        <button
          onClick={save}
          disabled={!valid || saving}
          style={{
            width: '100%',
            padding: 15,
            borderRadius: 8,
            border: 0,
            cursor: valid && !saving ? 'pointer' : 'default',
            background: valid && !saving ? 'var(--coral)' : 'var(--stone)',
            color: valid && !saving ? '#FFF8F2' : 'var(--ink-40)',
            font: '600 15px/1 Inter, sans-serif',
          }}
        >
          {saving ? 'Saving…' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
