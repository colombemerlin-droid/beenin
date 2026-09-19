import { useStore } from '../state/store';
import { flagOf, natFlagOf } from '../data/countries';
import { fmtDate } from '../data/format';
import { Picker, inputStyle, primaryBtnStyle } from '../ui/Picker';

export function SignupScreen() {
  const { state, dispatch } = useStore();
  const g = state.signup;
  if (!g) return null;
  const d = state.pairDraft;
  const canAdd = !!(d.country && d.nationality);
  const count = g.pairs.length;

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 26, background: 'var(--cream-lighter)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 'none', padding: '18px 20px 10px' }}>
        <div className="label">Sign up · backfill</div>
        <div className="serif" style={{ fontSize: 26, lineHeight: 1.15, marginTop: 6 }}>
          Anything to Declare?
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
            <button onClick={() => dispatch({ type: 'OPEN_PICKER', kind: 'signupNat' })} style={pickerFieldStyle}>
              <span style={{ fontSize: 17, lineHeight: 1 }}>{d.nationality ? natFlagOf(d.nationality) : '\u{1F6C2}'}</span>
              <span style={{ flex: 1, minWidth: 0, font: '400 14px/1.4 Inter, sans-serif', color: d.nationality ? 'var(--ink)' : 'var(--ink-40)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {d.nationality || 'Passport'}
              </span>
            </button>
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
                {p.country} · {p.nationality}
              </span>
              <span style={{ display: 'block', font: '400 12px/1.4 Inter, sans-serif', color: 'var(--ink-40)', marginTop: 2 }}>
                {[p.date ? fmtDate(p.date) : '', p.name].filter(Boolean).join(' · ') || 'no details'}
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

      <div style={{ flex: 'none', padding: '12px 20px 34px', borderTop: '1px solid var(--stone)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => dispatch({ type: 'SKIP_SIGNUP' })} style={{ padding: '14px 16px', borderRadius: 8, border: 0, background: 'transparent', color: 'var(--ink-body)', font: '500 14px/1 Inter, sans-serif', cursor: 'pointer' }}>
          Skip
        </button>
        <span style={{ flex: 1, font: '400 12px/1.4 Inter, sans-serif', color: 'var(--ink-40)', textAlign: 'right' }}>
          {count ? `${count} on the record` : 'nothing added yet'}
        </span>
        <button onClick={() => dispatch({ type: 'COMMIT_SIGNUP' })} style={primaryBtnStyle}>
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
