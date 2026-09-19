import type { CSSProperties } from 'react';
import { useStore } from '../state/store';
import { PAIRS, flagOf } from '../data/countries';
import { OverlayHeader } from './OverlayHeader';
import { CheckIcon } from './icons';

export function Picker() {
  const { state, dispatch } = useStore();
  const pk = state.picker;
  if (!pk) return null;

  const isNatMode = pk === 'nat' || pk === 'signupNat';
  const isMulti = pk === 'nat';
  const title = isNatMode ? 'Passport' : 'Country';
  const q = state.pickerQuery.toLowerCase();

  const chosen =
    pk === 'country' ? state.add?.country || '' : pk === 'signupNat' ? state.pairDraft.nationality : pk === 'signupCountry' ? state.pairDraft.country : '';

  const options = PAIRS.filter((p) => (isNatMode ? p.nationality : p.country).toLowerCase().includes(q)).map((p) => {
    const label = isNatMode ? p.nationality : p.country;
    const staged = isMulti && state.pickerDraft.includes(label);
    return { label, flag: flagOf(p.country), active: staged || label === chosen };
  });

  function pick(label: string) {
    if (isMulti) return dispatch({ type: 'TOGGLE_PICKER_DRAFT', label });
    if (pk === 'country') return dispatch({ type: 'PICK_COUNTRY', label });
    if (pk === 'signupNat') return dispatch({ type: 'PICK_SIGNUP_NAT', label });
    if (pk === 'signupCountry') return dispatch({ type: 'PICK_SIGNUP_COUNTRY', label });
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
            <span style={{ color: o.active ? 'var(--coral)' : 'transparent', display: 'flex' }}>
              <CheckIcon size={18} />
            </span>
          </button>
        ))}
      </div>
      {isMulti && (
        <div style={{ flex: 'none', padding: '12px 20px 34px', borderTop: '1px solid var(--stone)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ flex: 1, font: '400 13px/1.45 Inter, sans-serif', color: 'var(--ink-40)' }}>
            {state.pickerDraft.length ? state.pickerDraft.join(' · ') : 'nothing selected'}
          </span>
          <button onClick={() => dispatch({ type: 'SAVE_PICKER' })} style={primaryBtnStyle}>
            Save
          </button>
        </div>
      )}
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
