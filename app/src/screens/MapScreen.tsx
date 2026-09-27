import { useRef } from 'react';
import { useStore } from '../state/store';
import { WorldMap } from '../components/WorldMap';
import { flagOf, natFlagOf, pct } from '../data/countries';
import { UNKNOWN } from '../ui/Picker';
import { beenCountries, natCountries, continentBreakdown, touchedContinents, continentGroups, entryNats } from '../state/selectors';
import { ChevronRightIcon } from '../ui/icons';
import { EmptyState } from '../ui/EmptyState';

export function MapScreen() {
  const { state, dispatch } = useStore();
  const dragging = useRef(false);
  const startX = useRef(0);

  const been = beenCountries(state);
  const natCs = natCountries(state);
  const active = state.side === 0 ? been : natCs;
  // pct() is a share of the real 195-country world — an "I don't know" stamp
  // still counts toward your own tally but shouldn't inflate that percentage.
  const realActive = active.filter((c) => c !== UNKNOWN);
  const continents = continentBreakdown(realActive);
  const touched = touchedContinents(realActive);

  const groups = continentGroups(active).map((g) => ({
    continent: g.continent,
    items: g.countries.map((c) => buildRow(c, state)),
  }));
  if (active.includes(UNKNOWN)) {
    groups.push({ continent: 'Unsure', items: [buildRow(UNKNOWN, state)] });
  }

  function buildRow(c: string, s: typeof state) {
    const natSet = new Set<string>();
    if (s.side === 0) {
      s.entries.forEach((e) => {
        if (e.country === c) entryNats(e).forEach((n) => natSet.add(n));
      });
      s.maps.forEach((m) => m.entries.forEach((e) => {
        if (e.country === c) m.nationalities.forEach((n) => natSet.add(n));
      }));
    }
    const natsHere = [...natSet];
    return {
      country: c,
      flag: flagOf(c),
      open: s.azOpen === c,
      nats: natsHere,
      sub: s.side === 0 ? (natsHere.length === 1 ? '1 passport' : `${natsHere.length} passports`) : '',
    };
  }

  const firstName = state.profile.name.trim().split(' ')[0];
  const headerTitle = firstName ? `${firstName}’s passport` : 'Your passport';

  function onDown(e: React.PointerEvent) {
    startX.current = e.clientX;
    dragging.current = true;
  }
  function onMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    const dx = Math.max(-160, Math.min(160, e.clientX - startX.current));
    dispatch({ type: 'SET_DRAG', dragX: dx });
  }
  function onUp() {
    if (!dragging.current) return;
    dragging.current = false;
    const dx = state.dragX;
    let side = state.side;
    if (dx < -55 && side === 0) side = 1;
    if (dx > 55 && side === 1) side = 0;
    dispatch({ type: 'SET_SIDE', side });
    dispatch({ type: 'SET_DRAG', dragX: 0 });
  }

  return (
    <div className="noscroll" style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '4px 20px 120px' }}>
      <div style={{ padding: '8px 0 14px', textAlign: 'center' }}>
        <div className="serif" style={{ fontSize: 28, lineHeight: 1.15 }}>
          {headerTitle}
        </div>
        <div style={{ font: '400 13px/1.45 Inter, sans-serif', color: 'var(--ink-body)', marginTop: 2 }}>private to you. always.</div>
      </div>

      <div className="noscroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '2px 0 16px' }}>
        {state.maps.map((m) => (
          <button key={m.id} onClick={() => dispatch({ type: 'OPEN_MAP', mapId: m.id })} style={mapChipStyle}>
            {m.name}
          </button>
        ))}
        <button onClick={() => dispatch({ type: 'OPEN_NEW_MAP' })} style={{ ...mapChipStyle, border: '1px dashed var(--stone-dashed)', background: 'transparent', color: 'var(--ink-body)' }}>
          + New map
        </button>
      </div>

      <div
        style={{
          position: 'relative',
          borderRadius: 22,
          background: 'var(--paper)',
          border: '1px solid var(--stone)',
          overflow: 'hidden',
          // Sized by width: the world map is ~2:1, so a fixed height left big
          // empty bands above and below it on phone-width screens.
          aspectRatio: '1.55 / 1',
          touchAction: 'pan-y',
          boxShadow: '0 1px 2px rgba(31,26,23,.04), 0 4px 14px rgba(31,26,23,.06)',
        }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <div
          style={{
            display: 'flex',
            width: '200%',
            height: '100%',
            transition: 'transform 280ms cubic-bezier(0.22,1,0.36,1)',
            transform: `translateX(calc(${state.side * -50}% + ${state.dragX}px))`,
          }}
        >
          <div style={{ width: '50%', height: '100%', display: 'flex', flexDirection: 'column', padding: '16px 14px 14px' }}>
            <div className="label" style={{ flex: 'none' }}>
              Been · stamps
            </div>
            <div style={{ flex: 1, minHeight: 0, marginTop: 8 }}>
              <WorldMap logged={been} />
            </div>
          </div>
          <div style={{ width: '50%', height: '100%', display: 'flex', flexDirection: 'column', padding: '16px 14px 14px' }}>
            <div className="label" style={{ flex: 'none' }}>
              Been In · passports
            </div>
            <div style={{ flex: 1, minHeight: 0, marginTop: 8 }}>
              <WorldMap logged={natCs} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '14px 0 16px' }}>
        <button
          onClick={() => dispatch({ type: 'SET_SIDE', side: 0 })}
          style={{ width: 26, height: 6, borderRadius: 999, border: 0, padding: 0, cursor: 'pointer', background: state.side === 0 ? 'var(--ink)' : 'var(--stone)', transition: 'background 180ms' }}
        />
        <button
          onClick={() => dispatch({ type: 'SET_SIDE', side: 1 })}
          style={{ width: 26, height: 6, borderRadius: 999, border: 0, padding: 0, cursor: 'pointer', background: state.side === 1 ? 'var(--ink)' : 'var(--stone)', transition: 'background 180ms' }}
        />
        <span style={{ font: '400 12px/1.4 Inter, sans-serif', color: 'var(--ink-40)', marginLeft: 4 }}>swipe to flip</span>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <div style={cardStyle}>
          <div className="serif" style={{ fontSize: 46, lineHeight: 1 }}>
            {active.length}
          </div>
          <div className="label" style={{ marginTop: 6 }}>
            {state.side === 0 ? 'Countries stamped' : 'Passports collected'}
          </div>
        </div>
        <div style={cardStyle}>
          <div className="serif" style={{ fontSize: 46, lineHeight: 1, color: 'var(--coral)' }}>
            {pct(realActive.length)}
          </div>
          <div className="label" style={{ marginTop: 6 }}>
            Of the world
          </div>
        </div>
      </div>

      {active.length === 0 ? (
        <EmptyState
          title={state.side === 0 ? 'Nothing stamped yet' : 'No passports collected yet'}
          body={
            state.side === 0
              ? 'Log a country you’ve actually been to and it’ll light up here, plus your continent breakdown and A–Z list.'
              : 'Log an entry with someone’s passport and their home country lights up here.'
          }
          action={
            <button onClick={() => dispatch({ type: 'OPEN_STORY' })} style={ctaButtonStyle}>
              Add your first story
            </button>
          }
        />
      ) : (
        <>
          <div style={{ marginTop: 24, background: 'var(--cream)', borderRadius: 14, padding: '14px 16px 8px', boxShadow: cardShadow }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
              <span className="label">By continent</span>
              <span style={{ flex: 1 }} />
              <span style={{ font: '400 12px/1.4 Inter, sans-serif', color: 'var(--ink-40)' }}>{touched} of 6 continents touched</span>
            </div>
            {continents.map((c) => (
              <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0' }}>
                <span style={{ width: 100, flex: 'none', font: '400 14px/1.4 Inter, sans-serif' }}>{c.name}</span>
                <span style={{ flex: 1, height: 6, borderRadius: 999, background: 'var(--stone)', overflow: 'hidden', display: 'block' }}>
                  <span style={{ display: 'block', height: '100%', borderRadius: 999, background: 'var(--coral)', transition: 'width 480ms cubic-bezier(0.22,1,0.36,1)', width: c.bar }} />
                </span>
                <span style={{ width: 44, flex: 'none', textAlign: 'right', font: '500 13px/1.3 Inter, sans-serif', color: c.color }}>{c.pct}</span>
                <span style={{ width: 42, flex: 'none', textAlign: 'right', font: '400 12px/1.4 Inter, sans-serif', color: 'var(--ink-40)' }}>{c.frac}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, background: 'var(--cream)', borderRadius: 14, padding: '14px 16px 6px', boxShadow: cardShadow }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
              <span className="label">{state.side === 0 ? 'Countries' : 'Passports'}</span>
              <span style={{ flex: 1 }} />
              <span style={{ font: '400 12px/1.4 Inter, sans-serif', color: 'var(--ink-40)' }}>by continent, A–Z</span>
            </div>
            {groups.map((g) => (
              <div key={g.continent}>
                <div style={{ font: '600 11px/1.4 Inter, sans-serif', letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--ink-40)', padding: '10px 0 2px' }}>{g.continent}</div>
                {g.items.map((c) =>
                  state.side === 0 ? (
                    <div key={c.country} style={{ borderTop: '1px solid var(--stone)' }}>
                      <button
                        onClick={() => dispatch({ type: 'TOGGLE_AZ', country: c.country })}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', background: 'transparent', border: 0, cursor: 'pointer', textAlign: 'left', color: 'var(--ink)' }}
                      >
                        <span style={{ fontSize: 17, lineHeight: 1, flex: 'none' }}>{c.flag}</span>
                        <span style={{ flex: 1, font: '400 14px/1.4 Inter, sans-serif' }}>{c.country}</span>
                        <span style={{ font: '400 12px/1.4 Inter, sans-serif', color: 'var(--ink-40)' }}>{c.sub}</span>
                        <span style={{ color: 'var(--ink-40)', display: 'flex', transform: c.open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 180ms' }}>
                          <ChevronRightIcon size={15} />
                        </span>
                      </button>
                      {c.open && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, padding: '0 0 12px 27px' }}>
                          {(c.nats.length ? c.nats.slice().sort() : ['no passport on file']).map((n) => (
                            <span key={n} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 999, background: 'var(--coral-tint)', color: 'var(--coral-dark)', font: '500 13px/1.3 Inter, sans-serif' }}>
                              <span style={{ fontSize: 13, lineHeight: 1 }}>{c.nats.length ? natFlagOf(n) : '\u{1F6C2}'}</span>
                              <span>{n}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div key={c.country} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid var(--stone)' }}>
                      <span style={{ fontSize: 17, lineHeight: 1, flex: 'none' }}>{c.flag}</span>
                      <span style={{ flex: 1, font: '400 14px/1.4 Inter, sans-serif' }}>{c.country}</span>
                    </div>
                  )
                )}
              </div>
            ))}
          </div>
        </>
      )}
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

const cardShadow = '0 1px 2px rgba(31,26,23,.04), 0 4px 14px rgba(31,26,23,.06)';

const ctaButtonStyle = {
  padding: '11px 18px',
  borderRadius: 8,
  border: 0,
  background: 'var(--coral)',
  color: '#FFF8F2',
  font: '600 14px/1 Inter, sans-serif',
  cursor: 'pointer',
} as const;

const mapChipStyle = {
  flex: 'none',
  padding: '9px 15px',
  borderRadius: 999,
  border: '1px solid var(--stone)',
  background: 'var(--cream)',
  color: 'var(--ink)',
  cursor: 'pointer',
  font: '500 13px/1.3 Inter, sans-serif',
  whiteSpace: 'nowrap',
} as const;
