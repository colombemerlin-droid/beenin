import { useStore } from '../state/store';
import { signupStubs } from '../state/reducer';
import { initialsOf } from '../lib/identity';
import * as api from '../lib/api';
import { flagOf, natFlagOf } from '../data/countries';
import { fmtDate } from '../data/format';
import { Picker, UNKNOWN, inputStyle, primaryBtnStyle } from '../ui/Picker';
import { fieldBtnStyle, chipStyle, dashedChipStyle } from '../ui/formKit';
import { PhotoField } from '../ui/Photo';
import { PersonField } from '../ui/PersonField';
import type { SignupPair } from '../state/types';
import type { Companion } from '../types';

export function SignupScreen() {
  const { state, dispatch } = useStore();
  const g = state.signup;
  if (!g) return null;
  const d = state.pairDraft;
  const mapScoped = !!state.mapBackfillFor;
  const canAdd = mapScoped ? d.countries.length > 0 : !!(d.countries.length && d.nationality.length);
  const count = g.pairs.length;
  const mapName = state.maps.find((m) => m.id === state.mapBackfillFor)?.name;
  const last = g.pairs[g.pairs.length - 1];
  const draftStarted = !!(d.name.trim() || d.countries.length || d.nationality.length || d.date);

  const fail = () => dispatch({ type: 'SHOW_TOAST', message: "couldn't save that to your account — try again in a moment." });

  // Each named row becomes (or reuses) a remembered person: picked from the
  // dropdown, an exact name match, or a brand-new person with that row's passports.
  function resolvePeople(pairs: SignupPair[]) {
    const byName = new Map(state.companions.map((c) => [c.name.trim().toLowerCase(), c]));
    const newCompanions: Companion[] = [];
    const links: Record<string, string> = {};
    for (const p of pairs) {
      const name = p.name.trim();
      if (p.companionId) {
        links[p.id] = p.companionId;
        continue;
      }
      if (!name) continue;
      let c = byName.get(name.toLowerCase());
      if (!c) {
        c = { id: crypto.randomUUID(), name, initials: initialsOf(name) || '??', nationalities: p.nationality.filter((n) => n !== UNKNOWN) };
        byName.set(name.toLowerCase(), c);
        newCompanions.push(c);
      }
      links[p.id] = c.id;
    }
    return { newCompanions, links };
  }

  function commit() {
    if (!g) return;
    const { newCompanions, links } = mapScoped ? { newCompanions: [], links: {} } : resolvePeople(g.pairs);
    const stubs = signupStubs(state, links);
    const mapId = state.mapBackfillFor || undefined;
    dispatch({ type: 'COMMIT_SIGNUP', newCompanions, links });
    const me = state.authUserId;
    if (!me) return;
    newCompanions.forEach((c) => api.createCompanion(me, c).catch(fail));
    if (!stubs.length) return;
    // On a map with a person these are ordinary entries with them; older maps pin them.
    api.createEntries(me, stubs.map((e) => ({ id: e.id, fields: mapId ? { ...e, mapId, mapNative: !e.companionId } : e }))).catch(fail);
  }

  function skip() {
    dispatch({ type: 'SKIP_SIGNUP' });
  }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 26, background: 'var(--cream-lighter)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 'none', padding: '18px 20px 10px' }}>
        <div className="label">{mapScoped ? `Backfill · ${mapName || 'map'}` : 'Backfill'}</div>
        <div className="serif" style={{ fontSize: 26, lineHeight: 1.15, marginTop: 6 }}>
          Anything to Declare?
        </div>
        <div style={{ font: '400 13px/1.5 Inter, sans-serif', color: 'var(--ink-body)', marginTop: 6 }}>
          {mapScoped
            ? 'Countries you’ve already been to together.'
            : 'Who you’ve been with, their passport, and where. Nothing here is shared.'}
        </div>
      </div>

      <div className="noscroll" style={{ flex: 1, overflowY: 'auto', padding: '6px 20px 16px' }}>
        {/* After the first entry: carry on with the same person, or start someone new. */}
        {count > 0 && !draftStarted && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            {!mapScoped && last?.name.trim() && (
              <button onClick={() => dispatch({ type: 'REPEAT_PAIR_PERSON' })} style={nextChipStyle}>
                + Another country with {last.name.trim().split(' ')[0]}
              </button>
            )}
            {!mapScoped && (
              <button onClick={() => document.getElementById('backfill-who')?.focus()} style={nextChipStyle}>
                + Someone new
              </button>
            )}
          </div>
        )}
        <div style={{ background: 'var(--cream)', borderRadius: 14, padding: '14px 16px 16px' }}>
          {!mapScoped && (
            <>
              <div className="label" style={fieldLabelStyle}>
                Who · optional
              </div>
              <PersonField
                id="backfill-who"
                value={d.name}
                people={state.companions}
                onChange={(name) => dispatch({ type: 'PATCH_PAIR_DRAFT', patch: { name, companionId: '' } })}
                onPick={(c) =>
                  dispatch({
                    type: 'PATCH_PAIR_DRAFT',
                    // A remembered person brings their passports along.
                    patch: { name: c.name, companionId: c.id, nationality: c.nationalities.length ? c.nationalities.slice() : d.nationality },
                  })
                }
                placeholder="their name"
              />
              <div className="label" style={{ ...fieldLabelStyle, marginTop: 12 }}>
                Passport
              </div>
              <button onClick={() => dispatch({ type: 'OPEN_PICKER', kind: 'signupNat' })} style={pickerFieldStyle}>
                <span style={{ fontSize: 17, lineHeight: 1 }}>{d.nationality.length ? natFlagOf(d.nationality[0]) : '\u{1F6C2}'}</span>
                <span style={{ flex: 1, minWidth: 0, font: '400 14px/1.4 Inter, sans-serif', color: d.nationality.length ? 'var(--ink)' : 'var(--ink-40)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.nationality.length ? d.nationality.join(' · ') : 'one or more'}
                </span>
              </button>
            </>
          )}
          <div className="label" style={{ ...fieldLabelStyle, marginTop: mapScoped ? 0 : 12 }}>
            {d.countries.length > 1 ? 'Countries' : 'Country'}
          </div>
          {d.countries.length === 0 ? (
            <button onClick={() => dispatch({ type: 'OPEN_PICKER', kind: 'signupCountry' })} style={pickerFieldStyle}>
              <span style={{ fontSize: 17, lineHeight: 1 }}>{'\u{1F30D}'}</span>
              <span style={{ flex: 1, minWidth: 0, font: '400 14px/1.4 Inter, sans-serif', color: 'var(--ink-40)' }}>where — one or more</span>
            </button>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {d.countries.map((c) => (
                <button key={c} onClick={() => dispatch({ type: 'OPEN_PICKER', kind: 'signupCountry' })} style={chipStyle}>
                  <span style={{ fontSize: 14, lineHeight: 1 }}>{flagOf(c)}</span>
                  <span>{c}</span>
                </button>
              ))}
              <button onClick={() => dispatch({ type: 'OPEN_PICKER', kind: 'signupCountry' })} style={dashedChipStyle}>
                + Another country
              </button>
            </div>
          )}
          <div className="label" style={{ ...fieldLabelStyle, marginTop: 12 }}>
            First interaction · optional
          </div>
          <input
            type="date"
            value={d.date}
            onChange={(e) => dispatch({ type: 'PATCH_PAIR_DRAFT', patch: { date: e.target.value } })}
            style={{ ...inputStyle, padding: '11px 12px' }}
          />

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
              {d.countries.length > 1 && (
                <div style={{ font: '400 12px/1.5 Inter, sans-serif', color: 'var(--ink-40)' }}>
                  These details go with {flagOf(d.countries[0])} {d.countries[0]}; the other countries are logged without them.
                </div>
              )}
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
            <span style={{ fontSize: 18, lineHeight: 1, flex: 'none' }}>{flagOf(p.countries[0])}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', font: '400 15px/1.4 Inter, sans-serif' }}>
                {[p.name.trim(), p.countries.join(', ')].filter(Boolean).join(' · ')}
              </span>
              <span style={{ display: 'block', font: '400 12px/1.4 Inter, sans-serif', color: 'var(--ink-40)', marginTop: 2 }}>
                {[p.nationality.join(' · '), p.date ? `first ${fmtDate(p.date)}` : '', p.expanded ? 'details added' : ''].filter(Boolean).join(' · ') || 'no details'}
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
          Cancel
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
  width: '100%',
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

const fieldLabelStyle = { marginBottom: 6 } as const;

const nextChipStyle = {
  padding: '9px 13px',
  borderRadius: 999,
  border: '1px dashed var(--coral)',
  background: 'var(--coral-tint)',
  cursor: 'pointer',
  color: 'var(--coral-dark)',
  font: '600 13px/1.2 Inter, sans-serif',
} as const;
