import { useStore } from '../../state/store';
import { mapQuickEntry } from '../../state/reducer';
import * as api from '../../lib/api';
import { flagOf } from '../../data/countries';
import { OverlayHeader } from '../../ui/OverlayHeader';
import { EmptyState } from '../../ui/EmptyState';
import { ChevronRightIcon } from '../../ui/icons';

export function MapPickerOverlay() {
  const { state, dispatch } = useStore();
  if (state.overlay !== 'mapPicker') return null;

  function addTo(mapId: string) {
    const id = crypto.randomUUID();
    const entry = mapQuickEntry(id, state.addMapCountry);
    dispatch({ type: 'ADD_ENTRY_TO_MAP', mapId, id });
    if (state.authUserId && entry.country) {
      api
        .createEntry(state.authUserId, id, { ...entry, mapId, mapNative: true })
        .catch(() => dispatch({ type: 'SHOW_TOAST', message: "couldn't save that to your account." }));
    }
  }

  return (
    <div className="noscroll" style={{ position: 'absolute', inset: 0, background: 'var(--cream-lighter)', zIndex: 45, overflowY: 'auto' }}>
      <OverlayHeader title="Add to a map" onBack={() => dispatch({ type: 'CLOSE_OVERLAY' })} />
      <div style={{ padding: '18px 20px 120px' }}>
        <div style={{ font: '400 13px/1.5 Inter, sans-serif', color: 'var(--ink-body)', marginBottom: 16 }}>
          Log {flagOf(state.addMapCountry)} {state.addMapCountry} on one of your maps.
        </div>

        {state.maps.length === 0 && <EmptyState title="No maps yet" body="Create your first one below." />}

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {state.maps.map((m) => (
            <button
              key={m.id}
              onClick={() => addTo(m.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 10px', background: 'transparent', border: 0, borderBottom: '1px solid var(--stone)', cursor: 'pointer', textAlign: 'left', color: 'var(--ink)' }}
            >
              <span style={{ flex: 1, font: '600 15px/1.3 Inter, sans-serif' }}>{m.name}</span>
              <ChevronRightIcon size={18} color="#A39A92" />
            </button>
          ))}
        </div>

        <button
          onClick={() => dispatch({ type: 'OPEN_NEW_MAP' })}
          style={{
            width: '100%',
            marginTop: 16,
            padding: 14,
            borderRadius: 8,
            border: '1px dashed var(--stone-dashed)',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--coral-dark)',
            font: '600 14px/1 Inter, sans-serif',
          }}
        >
          + Create a new map
        </button>
      </div>
    </div>
  );
}
