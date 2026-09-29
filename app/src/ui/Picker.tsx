import type { CSSProperties } from 'react';
import { useStore } from '../state/store';
import * as api from '../lib/api';
import { mapQuickEntry } from '../state/reducer';
import { PAIRS, flagOf } from '../data/countries';
import { EMOJI_GROUPS, splitEmoji } from '../data/emoji';
import { OverlayHeader } from './OverlayHeader';
import { CheckIcon } from './icons';

export const UNKNOWN = 'Unknown';

export function Picker() {
  const { state, dispatch } = useStore();
  const pk = state.picker;
  if (!pk) return null;

  const isEmojiMode = pk === 'emoji' || pk === 'signupEmoji';
  if (isEmojiMode) return <EmojiPicker kind={pk} />;

  const isNatMode = pk === 'signupNat' || pk === 'mapNat' || pk === 'companionNat' || pk === 'editCompanionNat';
  const isMulti = isNatMode || pk === 'mapCountries' || pk === 'signupCountry';
  const openMap = pk === 'mapCountries' && state.openMapId ? state.maps.find((m) => m.id === state.openMapId) : undefined;
  // Countries already on the map being added to: shown ticked, not re-addable.
  const locked = new Set(
    openMap ? [...openMap.entries, ...state.entries.filter((e) => e.mapId === openMap.id)].map((e) => e.country).filter(Boolean) : []
  );

  function save() {
    if (pk === 'mapCountries') {
      if (openMap && state.pickerDraft.length) {
        const entries = state.pickerDraft.map((c) => mapQuickEntry(crypto.randomUUID(), c, ''));
        dispatch({ type: 'ADD_MAP_COUNTRIES', mapId: openMap.id, entries });
        if (state.authUserId) {
          api
            .createEntries(state.authUserId, entries.map((e) => ({ id: e.id, fields: { ...e, mapId: openMap.id, mapNative: true } })))
            .catch(() => dispatch({ type: 'SHOW_TOAST', message: "couldn't save those to your account — try again." }));
        }
      }
      dispatch({ type: 'SAVE_PICKER' });
      return;
    }
    // Editing an existing map's passports (the reducer applies the same rule).
    const mapId = pk === 'mapNat' && state.overlay !== 'newMap' ? state.openMapId : null;
    const nationalities = state.pickerDraft.slice();
    dispatch({ type: 'SAVE_PICKER' });
    if (mapId) api.updateMap(mapId, { nationalities }).catch(() => dispatch({ type: 'SHOW_TOAST', message: "couldn't save that to your account." }));
  }
  const title = isNatMode ? 'Passport' : pk === 'mapCountries' ? `Add to ${openMap?.name || 'map'}` : pk === 'signupCountry' ? 'Countries' : 'Country';
  const q = state.pickerQuery.toLowerCase();

  const chosen = pk === 'country' ? state.story?.country || '' : '';
  const unknownActive = isNatMode ? state.pickerDraft.includes(UNKNOWN) : chosen === UNKNOWN;

  const options = PAIRS.filter((p) => (isNatMode ? p.nationality : p.country).toLowerCase().includes(q)).map((p) => {
    const label = isNatMode ? p.nationality : p.country;
    const staged = isMulti && state.pickerDraft.includes(label);
    return { label, flag: flagOf(p.country), active: staged || label === chosen || locked.has(label), locked: locked.has(label) };
  });

  function pick(label: string) {
    if (locked.has(label)) return;
    if (isMulti) return dispatch({ type: 'TOGGLE_PICKER_DRAFT', label });
    if (pk === 'country') return dispatch({ type: 'PICK_COUNTRY', label });
  }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 30, background: 'var(--cream-lighter)', display: 'flex', flexDirection: 'column' }}>
      <OverlayHeader title={title} onBack={() => dispatch({ type: 'CLOSE_PICKER' })} />
      <div style={{ flex: 'none', padding: '12px 20px' }}>
        <input
          value={state.pickerQuery}
          onChange={(e) => dispatch({ type: 'SET_PICKER_QUERY', query: e.target.value })}
          placeholder="type to narrow it down"
          style={inputStyle}
        />
      </div>
      <div className="noscroll" style={{ flex: 1, overflowY: 'auto', padding: '0 12px 24px' }}>
        {isNatMode && !q && (
          <button
            onClick={() => pick(UNKNOWN)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '13px 10px',
              marginBottom: 4,
              borderRadius: 14,
              background: 'transparent',
              border: '1px dashed var(--stone-dashed)',
              cursor: 'pointer',
              textAlign: 'left',
              color: 'var(--ink-body)',
            }}
          >
            <span style={{ fontSize: 19, lineHeight: 1 }}>{flagOf(UNKNOWN)}</span>
            <span style={{ flex: 1, font: '400 15px/1.4 Inter, sans-serif' }}>Oops, I don't remember</span>
            <span style={{ color: unknownActive ? 'var(--coral)' : 'transparent', display: 'flex' }}>
              <CheckIcon size={18} />
            </span>
          </button>
        )}
        {options.map((o) => (
          <button
            key={o.label}
            onClick={() => pick(o.label)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '13px 10px',
              borderRadius: 14,
              background: 'transparent',
              border: 0,
              cursor: 'pointer',
              textAlign: 'left',
              color: 'var(--ink)',
            }}
          >
            <span style={{ fontSize: 19, lineHeight: 1 }}>{o.flag}</span>
            <span style={{ flex: 1, font: '400 15px/1.4 Inter, sans-serif' }}>{o.label}</span>
            {o.locked && <span style={{ font: '400 12px/1 Inter, sans-serif', color: 'var(--ink-40)' }}>on this map</span>}
            <span style={{ color: o.active ? 'var(--coral)' : 'transparent', display: 'flex' }}>
              <CheckIcon size={18} />
            </span>
          </button>
        ))}
      </div>
      {isMulti && (
        <div className="bottom-safe" style={{ flex: 'none', padding: '12px 20px 34px', borderTop: '1px solid var(--stone)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ flex: 1, font: '400 13px/1.45 Inter, sans-serif', color: 'var(--ink-40)' }}>
            {state.pickerDraft.length ? state.pickerDraft.join(' · ') : 'nothing selected'}
          </span>
          <button onClick={save} style={primaryBtnStyle}>
            {pk === 'mapCountries' ? (state.pickerDraft.length ? `Add ${state.pickerDraft.length}` : 'Done') : 'Save'}
          </button>
        </div>
      )}
    </div>
  );
}

function EmojiPicker({ kind }: { kind: 'emoji' | 'signupEmoji' }) {
  const { state, dispatch } = useStore();
  const active = kind === 'emoji' ? state.story?.emoji : state.pairDraft.emoji;

  function pick(ch: string) {
    if (kind === 'emoji') return dispatch({ type: 'PICK_EMOJI', ch });
    return dispatch({ type: 'PICK_SIGNUP_EMOJI', ch });
  }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 30, background: 'var(--cream-lighter)', display: 'flex', flexDirection: 'column' }}>
      <OverlayHeader title="Emoji" onBack={() => dispatch({ type: 'CLOSE_PICKER' })} />
      <div className="noscroll" style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {EMOJI_GROUPS.map((g) => (
            <div key={g.name}>
              <div style={{ font: '400 12px/1.4 Inter, sans-serif', color: 'var(--ink-40)' }}>{g.name}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6, marginTop: 7 }}>
                {splitEmoji(g.chars).map((ch) => {
                  const isActive = active === ch;
                  return (
                    <button
                      key={ch}
                      onClick={() => pick(ch)}
                      style={{
                        aspectRatio: '1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 19,
                        borderRadius: 8,
                        background: isActive ? 'var(--coral-tint)' : 'var(--paper)',
                        border: `1px solid ${isActive ? 'var(--coral)' : 'var(--stone)'}`,
                        cursor: 'pointer',
                        padding: 0,
                        transition: 'all 180ms',
                      }}
                    >
                      {ch}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export const inputStyle: CSSProperties = {
  width: '100%',
  padding: '13px 14px',
  borderRadius: 8,
  border: '1px solid var(--stone)',
  background: 'var(--paper)',
  font: '400 15px/1.4 Inter, sans-serif',
  color: 'var(--ink)',
};

export const primaryBtnStyle: CSSProperties = {
  padding: '14px 22px',
  borderRadius: 8,
  border: 0,
  background: 'var(--coral)',
  color: '#FFF8F2',
  font: '600 15px/1 Inter, sans-serif',
  cursor: 'pointer',
};
