import { useStore } from '../../state/store';
import { mapCountryEntry } from '../../state/reducer';
import { sameName } from '../../state/selectors';
import * as api from '../../lib/api';
import { initialsOf } from '../../lib/identity';
import { natFlagOf } from '../../data/countries';
import { OverlayHeader } from '../../ui/OverlayHeader';
import { PersonField } from '../../ui/PersonField';
import { Picker, UNKNOWN, inputStyle, primaryBtnStyle } from '../../ui/Picker';
import type { Companion } from '../../types';

// New map: its name, and the one person it's with — picked from the remembered
// people (so the same person isn't entered twice) or a new name with passports.
export function NewMapOverlay() {
  const { state, dispatch } = useStore();
  if (state.overlay !== 'newMap' || !state.newMapDraft) return null;
  const d = state.newMapDraft;

  const typed = d.personName.trim();
  const picked = state.companions.find((c) => c.id === d.companionId);
  // Typing someone's exact name counts as picking them.
  const existing = picked || (typed ? state.companions.find((c) => sameName(c.name, typed)) : undefined);
  const isNew = !existing && !!typed;
  const canCreate = !!d.name.trim() && (!!existing || (isNew && d.nationalities.length > 0));

  function create() {
    if (!d || !canCreate) return;
    const person: Companion = existing || {
      id: crypto.randomUUID(),
      name: typed,
      initials: initialsOf(typed) || '??',
      nationalities: d.nationalities.filter((n) => n !== UNKNOWN),
    };
    // Arriving from "Add to a map" on a post: that country goes straight onto the new map.
    const entries = state.addMapCountry ? [mapCountryEntry(person, d.id, crypto.randomUUID(), state.addMapCountry)] : [];
    dispatch({ type: 'CREATE_MAP', person, newPerson: !existing, entries });
    const me = state.authUserId;
    if (!me) return;
    const fail = () => dispatch({ type: 'SHOW_TOAST', message: "couldn't save that map to your account — try again." });
    if (!existing) api.createCompanion(me, person).catch(fail);
    api.createMap(me, { id: d.id, name: d.name.trim(), nationalities: person.nationalities, companionId: person.id }).catch(fail);
    if (entries.length) api.createEntries(me, entries.map((e) => ({ id: e.id, fields: { ...e, mapNative: false } }))).catch(fail);
  }

  return (
    <div className="noscroll" style={{ position: 'absolute', inset: 0, background: 'var(--cream-lighter)', zIndex: 40, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      <OverlayHeader title="New map" onBack={() => dispatch({ type: 'CANCEL_NEW_MAP' })} />
      <div style={{ flex: 1, padding: '18px 20px 24px' }}>
        <div className="serif" style={{ fontSize: 24, lineHeight: 1.2 }}>
          Create a brand new private map, for you and your partner.
        </div>

        <div className="label" style={{ margin: '22px 0 8px' }}>
          Map name
        </div>
        <input
          value={d.name}
          onChange={(e) => dispatch({ type: 'PATCH_NEW_MAP', patch: { name: e.target.value } })}
          style={{ ...inputStyle, padding: 14 }}
        />

        <div className="label" style={{ margin: '20px 0 8px' }}>
          Who it’s with
        </div>
        <PersonField
          value={d.personName}
          people={state.companions}
          onChange={(personName) => dispatch({ type: 'PATCH_NEW_MAP', patch: { personName, companionId: '' } })}
          onPick={(c) => dispatch({ type: 'PATCH_NEW_MAP', patch: { personName: c.name, companionId: c.id } })}
          placeholder={state.companions.length ? 'type a name' : 'their name'}
        />

        {existing && (
          <div style={{ font: '400 13px/1.5 Inter, sans-serif', color: 'var(--ink-body)', marginTop: 10 }}>
            {existing.nationalities.length ? existing.nationalities.map((n) => `${natFlagOf(n)} ${n}`).join('  ·  ') : 'no passport logged for them yet'}
          </div>
        )}

        {isNew && (
          <div style={{ marginTop: 10, padding: 14, borderRadius: 14, background: 'var(--cream)' }}>
            <div style={{ font: '400 13px/1.45 Inter, sans-serif', color: 'var(--ink-body)' }}>
              New person: <b style={{ fontWeight: 600, color: 'var(--ink)' }}>{typed}</b>
            </div>
            <div className="label" style={{ margin: '12px 0 8px' }}>
              Their passport · one or more
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {d.nationalities.map((n) => (
                <span key={n} style={chipStyle}>
                  <span style={{ fontSize: 14, lineHeight: 1 }}>{natFlagOf(n)}</span>
                  <span>{n}</span>
                </span>
              ))}
              <button onClick={() => dispatch({ type: 'OPEN_PICKER', kind: 'mapNat' })} style={dashedChipStyle}>
                {d.nationalities.length ? '+ Another' : '+ Passport'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bottom-safe" style={{ flex: 'none', padding: '14px 20px 34px', borderTop: '1px solid var(--stone)' }}>
        <button
          onClick={create}
          disabled={!canCreate}
          style={{ ...primaryBtnStyle, width: '100%', padding: 15, opacity: canCreate ? 1 : 0.4, background: canCreate ? 'var(--coral)' : 'var(--ink-40)' }}
        >
          Create map
        </button>
      </div>

      <Picker />
    </div>
  );
}

const chipStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  padding: '9px 13px',
  borderRadius: 999,
  border: '1px solid var(--coral-tint-2)',
  background: 'var(--coral-tint)',
  color: 'var(--coral-dark)',
  font: '500 13px/1.3 Inter, sans-serif',
} as const;

const dashedChipStyle = {
  padding: '9px 13px',
  borderRadius: 999,
  border: '1px dashed var(--stone-dashed)',
  background: 'transparent',
  cursor: 'pointer',
  color: 'var(--ink-body)',
  font: '500 13px/1.3 Inter, sans-serif',
} as const;
