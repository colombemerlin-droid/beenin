import { useStore } from '../../state/store';
import { mapQuickEntry } from '../../state/reducer';
import * as api from '../../lib/api';
import { natFlagOf } from '../../data/countries';
import { OverlayHeader } from '../../ui/OverlayHeader';
import { Picker, inputStyle, primaryBtnStyle } from '../../ui/Picker';

export function NewMapOverlay() {
  const { state, dispatch } = useStore();
  if (state.overlay !== 'newMap' || !state.newMapDraft) return null;
  const d = state.newMapDraft;
  const canContinue = !!(d.name.trim() && d.nationalities.length);

  function create() {
    if (!d || !canContinue) return;
    // Arriving from "Add to a map" on a post: that country goes straight onto the new map.
    const entries = state.addMapCountry ? [mapQuickEntry(crypto.randomUUID(), state.addMapCountry)] : [];
    dispatch({ type: 'CREATE_MAP', entries });
    const me = state.authUserId;
    if (!me) return;
    const fail = () => dispatch({ type: 'SHOW_TOAST', message: "couldn't save that map to your account — try again." });
    api.createMap(me, { id: d.id, name: d.name.trim(), nationalities: d.nationalities }).catch(fail);
    if (entries.length) api.createEntries(me, entries.map((e) => ({ id: e.id, fields: { ...e, mapId: d.id, mapNative: true } }))).catch(fail);
  }

  return (
    <div className="noscroll" style={{ position: 'absolute', inset: 0, background: 'var(--cream-lighter)', zIndex: 40, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      <OverlayHeader title="New map" onBack={() => dispatch({ type: 'CANCEL_NEW_MAP' })} />
      <div style={{ flex: 1, padding: '18px 20px 24px' }}>
        <div className="serif" style={{ fontSize: 24, lineHeight: 1.2 }}>
          Create a brand new map, for you and your partner.
        </div>

        <div className="label" style={{ margin: '22px 0 8px' }}>
          Name
        </div>
        <input
          value={d.name}
          onChange={(e) => dispatch({ type: 'PATCH_NEW_MAP', patch: { name: e.target.value } })}
          style={{ ...inputStyle, padding: 14 }}
        />

        <div className="label" style={{ margin: '20px 0 8px' }}>
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

      <div className="bottom-safe" style={{ flex: 'none', padding: '14px 20px 34px', borderTop: '1px solid var(--stone)' }}>
        <button
          onClick={create}
          disabled={!canContinue}
          style={{ ...primaryBtnStyle, width: '100%', padding: 15, opacity: canContinue ? 1 : 0.4, background: canContinue ? 'var(--coral)' : 'var(--ink-40)' }}
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
