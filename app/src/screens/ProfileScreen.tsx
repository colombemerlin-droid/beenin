import { useState } from 'react';
import { useStore } from '../state/store';
import { pct } from '../data/countries';
import { beenCountries, natCountries } from '../state/selectors';
import { initialsOf } from '../lib/identity';
import { ChevronRightIcon, TabProfileIcon } from '../ui/icons';

export function ProfileScreen() {
  const { state, dispatch } = useStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(state.profile.name);
  const been = beenCountries(state);
  const nats = natCountries(state);
  const friendCount = state.friends.filter((f) => f.requestState === 'accepted').length;
  const initials = initialsOf(state.profile.name);
  const hasLogged = been.length > 0 || nats.length > 0;

  function startEdit() {
    setDraft(state.profile.name);
    setEditing(true);
  }
  function save() {
    dispatch({ type: 'SET_PROFILE_NAME', name: draft.trim() });
    setEditing(false);
  }

  return (
    <div className="noscroll" style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '4px 20px 120px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0 18px' }}>
        <div
          style={{
            width: 66,
            height: 66,
            flex: 'none',
            borderRadius: '50%',
            background: initials ? 'var(--coral)' : 'var(--cream)',
            border: initials ? 'none' : '1.5px dashed var(--stone-dashed)',
            color: initials ? '#FFF8F2' : 'var(--ink-40)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            font: '600 26px/1 Inter, sans-serif',
          }}
        >
          {initials || <TabProfileIcon />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && save()}
                placeholder="Your name"
                style={{ flex: 1, minWidth: 0, padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--coral)', background: 'var(--paper)', font: '400 16px/1.4 Inter, sans-serif', color: 'var(--ink)' }}
              />
              <button onClick={save} style={{ padding: '10px 16px', borderRadius: 8, border: 0, background: 'var(--coral)', color: '#FFF8F2', font: '600 14px/1 Inter, sans-serif', cursor: 'pointer' }}>
                Save
              </button>
            </div>
          ) : (
            <button onClick={startEdit} style={{ background: 'transparent', border: 0, padding: 0, cursor: 'pointer', textAlign: 'left' }}>
              <div className="serif" style={{ fontSize: 26, lineHeight: 1.1, color: state.profile.name ? 'var(--ink)' : 'var(--ink-40)' }}>
                {state.profile.name || 'Add your name'}
              </div>
            </button>
          )}
        </div>
      </div>

      <button
        onClick={() => dispatch({ type: 'OPEN_FRIENDS' })}
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 7,
          padding: '14px 0',
          borderTop: '1px solid var(--stone)',
          borderBottom: '1px solid var(--stone)',
          background: 'transparent',
          border: 0,
          cursor: 'pointer',
          color: 'var(--ink)',
        }}
      >
        <span className="serif" style={{ fontSize: 24, lineHeight: 1 }}>
          {friendCount}
        </span>
        <span style={{ font: '400 13px/1.45 Inter, sans-serif', color: 'var(--ink-body)' }}>{friendCount === 0 ? 'friends — add one' : 'friends'}</span>
      </button>

      <div className="label" style={{ margin: '22px 0 10px' }}>
        Your collection
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <StatCard value={been.length} label="countries" />
        <StatCard value={nats.length} label="passports" />
        <StatCard value={pct(been.length)} label="of world" accent />
      </div>
      {!hasLogged && (
        <div style={{ font: '400 12px/1.5 Inter, sans-serif', color: 'var(--ink-40)', marginTop: 8 }}>
          Nothing logged yet — head to Map and tap the + button, or backfill below.
        </div>
      )}

      <button onClick={() => dispatch({ type: 'OPEN_HISTORY' })} style={navRowStyle}>
        <span style={{ flex: 1, font: '600 17px/1.3 Inter, sans-serif' }}>History</span>
        <ChevronRightIcon size={19} color="#A39A92" />
      </button>

      <button onClick={() => dispatch({ type: 'START_SIGNUP' })} style={{ ...navRowStyle, marginTop: 10 }}>
        <span style={{ flex: 1, font: '600 17px/1.3 Inter, sans-serif' }}>Backfill your collection</span>
        <ChevronRightIcon size={19} color="#A39A92" />
      </button>
    </div>
  );
}

function StatCard({ value, label, accent = false }: { value: string | number; label: string; accent?: boolean }) {
  return (
    <div style={{ flex: 1, background: 'var(--cream)', borderRadius: 14, padding: '13px 14px', boxShadow: '0 1px 2px rgba(31,26,23,.04), 0 4px 14px rgba(31,26,23,.06)' }}>
      <div className="serif" style={{ fontSize: 30, lineHeight: 1, color: accent ? 'var(--coral)' : 'var(--ink)' }}>
        {value}
      </div>
      <div style={{ font: '400 12px/1.4 Inter, sans-serif', color: 'var(--ink-40)', marginTop: 4 }}>{label}</div>
    </div>
  );
}

const navRowStyle = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  marginTop: 16,
  background: 'var(--cream)',
  border: 0,
  borderRadius: 14,
  padding: 16,
  cursor: 'pointer',
  textAlign: 'left',
  color: 'var(--ink)',
  boxShadow: '0 1px 2px rgba(31,26,23,.04), 0 4px 14px rgba(31,26,23,.06)',
} as const;
