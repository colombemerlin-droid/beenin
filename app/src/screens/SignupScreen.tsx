import { useStore } from '../state/store';
import { signupStubs } from '../state/reducer';
import * as api from '../lib/api';
import { flagOf } from '../data/countries';
import { fmtDate } from '../data/format';
import { Picker, inputStyle, primaryBtnStyle } from '../ui/Picker';
import { fieldBtnStyle } from '../ui/formKit';
import { PhotoField } from '../ui/Photo';

export function SignupScreen() {
  const { state, dispatch } = useStore();
  const g = state.signup;
  if (!g) return null;
  const d = state.pairDraft;
  const mapScoped = !!(state.newMapDraft || state.mapBackfillFor);
  const canAdd = mapScoped ? !!d.country : !!(d.country && d.nationality.length);
  const count = g.pairs.length;
  const mapName = state.newMapDraft?.name || state.maps.find((m) => m.id === state.mapBackfillFor)?.name;

  const fail = () => dispatch({ type: 'SHOW_TOAST', message: "couldn't save that to your account — try again in a moment." });

  // A brand-new map (from New map → Continue) is created on the server on
  // Done or Skip, before any of its countries.
  function createNewMap() {
    const m = state.newMapDraft;
    if (!m || !state.authUserId) return;
    api.createMap(state.authUserId, { id: m.id, name: m.name.trim() || 'Untitled map', nationalities: m.nationalities }).catch(fail);
  }

  function commit() {
    const stubs = signupStubs(state);
    const mapId = state.newMapDraft?.id || state.mapBackfillFor || undefined;
    createNewMap();
    dispatch({ type: 'COMMIT_SIGNUP' });
    if (!state.authUserId || !stubs.length) return;
    api
      .createEntries(
        state.authUserId,
        stubs.map((e) => ({ id: e.id, fields: mapId ? { ...e, mapId, mapNative: true } : e }))
      )
      .catch(fail);
  }

  function skip() {
    createNewMap();
    dispatch({ type: 'SKIP_SIGNUP' });
  }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 26, background: 'var(--cream-lighter)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 'none', padding: '18px 20px 10px' }}>
        <div className="label">{mapScoped ? `Backfill · ${mapName || 'map'}` : state.onboardingStep === 'signup' ? 'Sign up · backfill' : 'Backfill'}</div>
        <div className="serif" style={{ fontSize: 26, lineHeight: 1.15, marginTop: 6 }}>
          Anything to Declare?
        </div>
        <div style={{ font: '400 13px/1.5 Inter, sans-serif', color: 'var(--ink-body)', marginTop: 6 }}>
          {mapScoped
            ? 'Countries you’ve already been to together.'
            : 'Log where you’ve already been, and whose passport. Nothing here is shared — skip it and come back anytime from Profile.'}
        </div>
      </div>

      <div className="noscroll" style={{ flex: 1, overflowY: 'auto', padding: '6px 20px 16px' }}>
        <div style={{ background: 'var(--cream)', borderRadius: 14, padding: '14px 16px 16px' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => dispatch({ type: 'OPEN_PICKER', kind: 'signupCountry' })} style={pickerFieldStyle}>
              <span style={{ fontSize: 17, lineHeight: 1 }}>{d.country ? flagOf(d.country) : '\u{1F30D}'}</span>
              <span style={{ flex: 1, minWidth: 0, font: '400 14px/1.4 Inter, sans-serif', color: d.country ? 'var(--ink)' : 'var(--ink-40)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {d.country || 'Country'}
              </span>
            </button>
            {!mapScoped && (
              <button onClick={() => dispatch({ type: 'OPEN_PICKER', kind: 'signupNat' })} style={pickerFieldStyle}>
                <span style={{ fontSize: 17, lineHeight: 1 }}>{d.nationality.length ? '\u{1F6C2}' : '\u{1F6C2}'}</span>
                <span style={{ flex: 1, minWidth: 0, font: '400 14px/1.4 Inter, sans-serif', color: d.nationality.length ? 'var(--ink)' : 'var(--ink-40)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.nationality.length ? d.nationality.join(' · ') : 'Passport'}
                </span>
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input
              type="date"
              value={d.date}
              onChange={(e) => dispatch({ type: 'PATCH_PAIR_DRAFT', patch: { date: e.target.value } })}
              style={{ ...inputStyle, flex: 1, minWidth: 0, padding: '11px 12px' }}
            />
            <input
              value={d.name}
              onChange={(e) => dispatch({ type: 'PATCH_PAIR_DRAFT', patch: { name: e.target.value } })}
              placeholder="name · optional"
              style={{ ...inputStyle, flex: 1, minWidth: 0, padding: '11px 12px' }}
            />
          </div>

          <button
            onClick={() => dispatch({ type: 'TOGGLE_PAIR_EXPANDED' })}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 10,
              padding: '6px 2px',
              background: 'transparent',
              border: 0,
              cursor: 'pointer',
              color: 'var(--coral-dark)',
              font: '600 13px/1 Inter, sans-serif',
            }}
          >
            <span
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                border: '1px solid var(--coral)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: d.expanded ? 'rotate(45deg)' : 'none',
                transition: 'transform 180ms',
              }}
            >
              +
            </span>
            {d.expanded ? 'Hide details' : 'Add more detail'}
          </button>

          {d.expanded && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div className="label" style={{ marginBottom: 6 }}>
                  Location · optional
                </div>
                <input
                  value={d.place}
                  onChange={(e) => dispatch({ type: 'PATCH_PAIR_DRAFT', patch: { place: e.target.value } })}
                  placeholder="a rooftop bar"
                  style={{ ...inputStyle, padding: 12 }}
                />
              </div>
              <div>
                <div className="label" style={{ marginBottom: 6 }}>
                  Note · optional
                </div>
                <textarea
                  value={d.note}
                  onChange={(e) => dispatch({ type: 'PATCH_PAIR_DRAFT', patch: { note: e.target.value } })}
                  rows={2}
                  placeholder="spill the tea… or keep it classy."
                  style={{ ...inputStyle, padding: 12, resize: 'none' }}
                />
              </div>
              <div>
                <div className="label" style={{ marginBottom: 6 }}>
                  Emoji · optional
                </div>
                <button onClick={() => dispatch({ type: 'OPEN_PICKER', kind: 'signupEmoji' })} style={fieldBtnStyle}>
                  <span style={{ fontSize: 18, lineHeight: 1 }}>{d.emoji || '➕'}</span>
                  <span style={{ flex: 1, font: '400 14px/1.4 Inter, sans-serif', color: d.emoji ? 'var(--ink)' : 'var(--ink-40)' }}>
                    {d.emoji ? 'tap to change' : 'tap to pick one'}
                  </span>
                </button>
              </div>
              <PhotoField entryId={d.id} path={d.photoPath} onChange={(photoPath) => dispatch({ type: 'PATCH_PAIR_DRAFT', patch: { photoPath } })} />
              <div style={{ font: '400 12px/1.5 Inter, sans-serif', color: 'var(--ink-40)' }}>
                Backfilled entries stay private — map and history only.
              </div>
            </div>
          )}

          <button
            onClick={() => dispatch({ type: 'ADD_PAIR' })}
            disabled={!canAdd}
            style={{ ...primaryBtnStyle, width: '100%', marginTop: 10, padding: 12, opacity: canAdd ? 1 : 0.4, background: canAdd ? 'var(--coral)' : 'var(--ink-40)' }}
          >
            Add to the record
          </button>
        </div>

        <div className="label" style={{ margin: '20px 0 4px' }}>
          {count ? 'On the record' : 'Nothing yet'}
        </div>
        {g.pairs.map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderBottom: '1px solid var(--stone)' }}>
            <span style={{ fontSize: 18, lineHeight: 1, flex: 'none' }}>{flagOf(p.country)}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', font: '400 15px/1.4 Inter, sans-serif' }}>
                {p.country}
                {p.nationality.length ? ` · ${p.nationality.join(' · ')}` : ''}
              </span>
              <span style={{ display: 'block', font: '400 12px/1.4 Inter, sans-serif', color: 'var(--ink-40)', marginTop: 2 }}>
                {[p.date ? fmtDate(p.date) : '', p.name, p.expanded ? 'details added' : ''].filter(Boolean).join(' · ') || 'no details'}
              </span>
            </span>
            <button
              onClick={() => dispatch({ type: 'REMOVE_PAIR', index: i })}
              style={{ flex: 'none', width: 28, height: 28, borderRadius: '50%', border: 0, background: 'transparent', color: 'var(--ink-40)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <div className="bottom-safe" style={{ flex: 'none', padding: '12px 20px 34px', borderTop: '1px solid var(--stone)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={skip} style={{ padding: '14px 16px', borderRadius: 8, border: 0, background: 'transparent', color: 'var(--ink-body)', font: '500 14px/1 Inter, sans-serif', cursor: 'pointer' }}>
          Skip
        </button>
        <span style={{ flex: 1, font: '400 12px/1.4 Inter, sans-serif', color: 'var(--ink-40)', textAlign: 'right' }}>
          {count ? `${count} on the record` : 'nothing added yet'}
        </span>
        <button onClick={commit} style={primaryBtnStyle}>
          Done
        </button>
      </div>

      <Picker />
    </div>
  );
}

const pickerFieldStyle = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: 12,
  borderRadius: 8,
  border: '1px solid var(--stone)',
  background: 'var(--paper)',
  cursor: 'pointer',
  textAlign: 'left',
  color: 'var(--ink)',
} as const;
