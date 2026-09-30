import { useState } from 'react';
import { useStore } from '../../state/store';
import { plural } from '../../data/format';
import * as api from '../../lib/api';
import { initialsOf } from '../../lib/identity';
import { flagOf, natFlagOf } from '../../data/countries';
import { OverlayHeader } from '../../ui/OverlayHeader';
import { Avatar } from '../../ui/Avatar';
import { EmptyState } from '../../ui/EmptyState';
import { Picker, inputStyle, primaryBtnStyle } from '../../ui/Picker';
import { chipStyle, dashedChipStyle } from '../../ui/formKit';
import { DotsIcon } from '../../ui/icons';
import { nameRows } from '../../state/selectors';

// Profile → Names: everyone you've logged — remembered people, and the person
// behind each relationship map — with their passport(s) and the countries
// you've been to together. Each can be renamed / re-passported.
export function NamesOverlay() {
  const { state, dispatch } = useStore();
  const [view, setView] = useState<'all' | 'beenIn'>('all');
  if (state.overlay !== 'names') return null;

  const all = nameRows(state);
  const beenIn = all.filter((p) => p.countries.length > 0);
  const people = view === 'all' ? all : beenIn;

  return (
    <div className="noscroll" style={{ position: 'absolute', inset: 0, background: 'var(--cream-lighter)', zIndex: 40, overflowY: 'auto' }}>
      <OverlayHeader title="Names" onBack={() => dispatch({ type: 'CLOSE_OVERLAY' })} />
      <div style={{ padding: '14px 20px 120px' }}>
        <div role="tablist" style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 999, background: 'var(--cream)', marginBottom: 14 }}>
          {(
            [
              ['all', 'All names', all.length],
              ['beenIn', 'Been In', beenIn.length],
            ] as const
          ).map(([key, label, n]) => (
            <button
              key={key}
              role="tab"
              aria-selected={view === key}
              onClick={() => setView(key)}
              style={{
                flex: 1,
                padding: '9px 10px',
                borderRadius: 999,
                border: 0,
                cursor: 'pointer',
                background: view === key ? 'var(--paper)' : 'transparent',
                boxShadow: view === key ? '0 1px 2px rgba(31,26,23,.08)' : 'none',
                color: view === key ? 'var(--ink)' : 'var(--ink-40)',
                font: '600 13px/1 Inter, sans-serif',
              }}
            >
              {label} · {n}
            </button>
          ))}
        </div>
        {people.length === 0 ? (
          view === 'all' ? (
            <EmptyState title="Nobody yet" body="People you add to a story, a backfill or a map show up here." />
          ) : (
            <EmptyState title="No Been In yet" body="People you’ve logged a country with — a Been In story, a backfill, or their map — show up here." />
          )
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {people.map((p) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 10px 14px 14px', borderRadius: 14, background: 'var(--cream)' }}>
                <Avatar token={p.initials} size={38} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ font: '600 15px/1.3 Inter, sans-serif' }}>{p.name}</span>
                    {p.hasMap && <span style={{ font: '500 11px/1 Inter, sans-serif', color: 'var(--ink-40)' }}>· own map</span>}
                  </div>
                  <div style={{ font: '400 12px/1.45 Inter, sans-serif', color: 'var(--ink-body)', marginTop: 2 }}>
                    {p.nationalities.length ? p.nationalities.map((n) => `${natFlagOf(n)} ${n}`).join('  ·  ') : 'no passport logged'}
                  </div>
                  {p.countries.length ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {p.countries.map((x) => (
                        <span key={x} style={countryChipStyle}>
                          <span style={{ fontSize: 12, lineHeight: 1 }}>{flagOf(x)}</span>
                          <span>{x}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div style={{ font: '400 12px/1.45 Inter, sans-serif', color: 'var(--ink-40)', marginTop: 2 }}>
                      {p.stories ? `${plural(p.stories, 'story', 'stories')} · no Been In yet` : 'nothing logged yet'}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => dispatch({ type: 'OPEN_COMPANION_MENU', id: p.id })}
                  aria-label={`Options for ${p.name}`}
                  style={{ width: 32, height: 32, flex: 'none', background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--ink-40)', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <DotsIcon />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <EditPerson />
    </div>
  );
}

// The passport bubble, a size down for a list row.
const countryChipStyle = { ...chipStyle, gap: 5, padding: '5px 10px', cursor: 'default', font: '500 12px/1.3 Inter, sans-serif' } as const;

function EditPerson() {
  const { state, dispatch } = useStore();
  const d = state.companionEdit;
  if (!d) return null;
  const name = d.name.trim();

  function save() {
    if (!d || !name) return;
    const fail = () => dispatch({ type: 'SHOW_TOAST', message: "couldn't save that to your account — try again." });
    const saveMap = (id: string) => {
      dispatch({ type: 'UPDATE_MAP', id, name, nationalities: d.nationalities });
      if (state.authUserId) api.updateMap(id, { name, nationalities: d.nationalities }).catch(fail);
    };
    if (d.kind === 'map') return saveMap(d.id);
    // A person's map has its own name; it picks up their new passports on its own.
    const companion = { id: d.id, name, initials: initialsOf(name) || '??', nationalities: d.nationalities };
    dispatch({ type: 'UPDATE_COMPANION', companion });
    if (state.authUserId) api.updateCompanion(companion).catch(fail);
  }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 45, background: 'var(--cream-lighter)', display: 'flex', flexDirection: 'column' }}>
      <OverlayHeader title="Edit person" onBack={() => dispatch({ type: 'CLOSE_COMPANION_EDIT' })} />
      <div className="noscroll" style={{ flex: 1, overflowY: 'auto', padding: '18px 20px 24px' }}>
        <div className="label" style={{ marginBottom: 8 }}>
          Name
        </div>
        <input
          value={d.name}
          onChange={(e) => dispatch({ type: 'PATCH_COMPANION_EDIT', patch: { name: e.target.value } })}
          autoCapitalize="words"
          style={{ ...inputStyle, padding: 14 }}
        />
        <div className="label" style={{ margin: '20px 0 8px' }}>
          Passport · one or more
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {d.nationalities.map((n) => (
            <span key={n} style={chipStyle}>
              <span style={{ fontSize: 14, lineHeight: 1 }}>{natFlagOf(n)}</span>
              <span>{n}</span>
            </span>
          ))}
          <button onClick={() => dispatch({ type: 'OPEN_PICKER', kind: 'editCompanionNat' })} style={dashedChipStyle}>
            {d.nationalities.length ? 'Change' : '+ Passport'}
          </button>
        </div>
        <div style={{ font: '400 12px/1.5 Inter, sans-serif', color: 'var(--ink-40)', marginTop: 14 }}>
          {d.kind === 'map'
            ? 'This renames their map and updates its passports.'
            : 'Your stories with them update too — including the name friends see on shared posts.'}
        </div>
      </div>
      <div className="bottom-safe" style={{ flex: 'none', padding: '14px 20px 34px', borderTop: '1px solid var(--stone)' }}>
        <button
          onClick={save}
          disabled={!name}
          style={{ ...primaryBtnStyle, width: '100%', padding: 15, opacity: name ? 1 : 0.4, background: name ? 'var(--coral)' : 'var(--ink-40)' }}
        >
          Save
        </button>
      </div>
      <Picker />
    </div>
  );
}
