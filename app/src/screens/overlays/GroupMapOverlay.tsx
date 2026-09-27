import { useStore } from '../../state/store';
import * as api from '../../lib/api';
import { flagOf, natFlagOf, pct } from '../../data/countries';
import { continentGroups } from '../../state/selectors';
import { OverlayHeader } from '../../ui/OverlayHeader';
import { EmptyState } from '../../ui/EmptyState';
import { DotsIcon } from '../../ui/icons';
import { Picker, inputStyle, primaryBtnStyle } from '../../ui/Picker';

export function GroupMapOverlay() {
  const { state, dispatch } = useStore();
  const map = state.openMapId ? state.maps.find((m) => m.id === state.openMapId) : undefined;
  // Hide while a backfill (new-map or re-backfill) session is in progress so SignupScreen isn't covered.
  if (!map || state.signup) return null;

  const linkedEntries = state.entries.filter((e) => e.mapId === map.id);

  function saveRename() {
    const name = state.mapRenameDraft.trim();
    dispatch({ type: 'SAVE_MAP_RENAME' });
    if (map && name && name !== map.name) {
      api.updateMap(map.id, { name }).catch(() => dispatch({ type: 'SHOW_TOAST', message: "couldn't rename it on your account." }));
    }
  }
  const countries = [...new Set([...map.entries, ...linkedEntries].map((e) => e.country).filter(Boolean))];
  const groups = continentGroups(countries);

  return (
    <div className="noscroll" style={{ position: 'absolute', inset: 0, background: 'var(--cream-lighter)', zIndex: 40, overflowY: 'auto' }}>
      <OverlayHeader
        title={map.name}
        onBack={() => dispatch({ type: 'CLOSE_MAP' })}
        right={
          <button
            onClick={() => dispatch({ type: 'OPEN_MAP_MENU', mapId: map.id })}
            style={{ width: 30, height: 30, background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--ink-40)', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <DotsIcon />
          </button>
        }
      />
      <div style={{ padding: '18px 20px 120px' }}>
        {state.mapRenaming ? (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input
              autoFocus
              value={state.mapRenameDraft}
              onChange={(e) => dispatch({ type: 'PATCH_MAP_RENAME', name: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && saveRename()}
              style={{ ...inputStyle, flex: 1 }}
            />
            <button onClick={saveRename} style={primaryBtnStyle}>
              Save
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
            {map.nationalities.map((n) => (
              <span
                key={n}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px', borderRadius: 999, background: 'var(--coral-tint)', color: 'var(--coral-dark)', font: '500 13px/1.3 Inter, sans-serif' }}
              >
                <span style={{ fontSize: 13, lineHeight: 1 }}>{natFlagOf(n)}</span>
                <span>{n}</span>
              </span>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={cardStyle}>
            <div className="serif" style={{ fontSize: 40, lineHeight: 1 }}>
              {countries.length}
            </div>
            <div className="label" style={{ marginTop: 6 }}>
              Countries
            </div>
          </div>
          <div style={cardStyle}>
            <div className="serif" style={{ fontSize: 40, lineHeight: 1, color: 'var(--coral)' }}>
              {pct(countries.length)}
            </div>
            <div className="label" style={{ marginTop: 6 }}>
              Of the world
            </div>
          </div>
        </div>

        {countries.length === 0 ? (
          <EmptyState
            title="Nothing on this map yet"
            body="Backfill it from the three-dot menu, or add to it next time you see somewhere you've both been."
          />
        ) : (
          <div style={{ marginTop: 16, background: 'var(--cream)', borderRadius: 14, padding: '14px 16px 6px', boxShadow: '0 1px 2px rgba(31,26,23,.04), 0 4px 14px rgba(31,26,23,.06)' }}>
            {groups.map((g) => (
              <div key={g.continent}>
                <div style={{ font: '600 11px/1.4 Inter, sans-serif', letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--ink-40)', padding: '10px 0 2px' }}>{g.continent}</div>
                {g.countries.map((c) => (
                  <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid var(--stone)' }}>
                    <span style={{ fontSize: 17, lineHeight: 1, flex: 'none' }}>{flagOf(c)}</span>
                    <span style={{ flex: 1, font: '400 14px/1.4 Inter, sans-serif' }}>{c}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
      <Picker />
    </div>
  );
}

const cardStyle = {
  flex: 1,
  background: 'var(--cream)',
  borderRadius: 14,
  padding: '14px 16px 16px',
  boxShadow: '0 1px 2px rgba(31,26,23,.04), 0 4px 14px rgba(31,26,23,.06)',
} as const;
