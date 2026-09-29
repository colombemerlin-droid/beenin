import { useStore } from '../../state/store';
import * as api from '../../lib/api';
import { initialsOf } from '../../lib/identity';
import { flagOf, natFlagOf } from '../../data/countries';
import { OverlayHeader } from '../../ui/OverlayHeader';
import { Avatar } from '../../ui/Avatar';
import { EmptyState } from '../../ui/EmptyState';
import { Picker, inputStyle, primaryBtnStyle } from '../../ui/Picker';
import { chipStyle, dashedChipStyle } from '../../ui/formKit';
import { DotsIcon } from '../../ui/icons';

// Profile → Names: everyone you've logged, with their passport(s) and the
// countries you've been to together. Each can be renamed / re-passported.
export function NamesOverlay() {
  const { state, dispatch } = useStore();
  if (state.overlay !== 'names') return null;

  const people = state.companions.slice().sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="noscroll" style={{ position: 'absolute', inset: 0, background: 'var(--cream-lighter)', zIndex: 40, overflowY: 'auto' }}>
      <OverlayHeader title="Names" onBack={() => dispatch({ type: 'CLOSE_OVERLAY' })} />
      <div style={{ padding: '14px 20px 120px' }}>
        {people.length === 0 ? (
          <EmptyState title="Nobody yet" body="People you add to a story or a backfill show up here." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {people.map((c) => {
              const countries = [...new Set(state.entries.filter((e) => e.companionId === c.id && e.country).map((e) => e.country))].sort();
              return (
                <div
                  key={c.id}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 10px 12px 14px', borderRadius: 14, background: 'var(--cream)' }}
                >
                  <Avatar token={c.initials} size={38} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: '600 15px/1.3 Inter, sans-serif' }}>{c.name}</div>
                    <div style={{ font: '400 12px/1.45 Inter, sans-serif', color: 'var(--ink-body)', marginTop: 2 }}>
                      {c.nationalities.length ? c.nationalities.map((n) => `${natFlagOf(n)} ${n}`).join('  ·  ') : 'no passport logged'}
                    </div>
                    <div style={{ font: '400 12px/1.45 Inter, sans-serif', color: 'var(--ink-40)', marginTop: 2 }}>
                      {countries.length ? `been in ${countries.map((x) => `${flagOf(x)} ${x}`).join(', ')}` : 'no countries together yet'}
                    </div>
                  </div>
                  <button
                    onClick={() => dispatch({ type: 'OPEN_COMPANION_MENU', id: c.id })}
                    aria-label={`Options for ${c.name}`}
                    style={{ width: 32, height: 32, flex: 'none', background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--ink-40)', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <DotsIcon />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <EditPerson />
    </div>
  );
}

function EditPerson() {
  const { state, dispatch } = useStore();
  const d = state.companionEdit;
  if (!d) return null;
  const name = d.name.trim();

  function save() {
    if (!d || !name) return;
    const companion = { id: d.id, name, initials: initialsOf(name) || '??', nationalities: d.nationalities };
    dispatch({ type: 'UPDATE_COMPANION', companion });
    if (state.authUserId) {
      api.updateCompanion(companion).catch(() => dispatch({ type: 'SHOW_TOAST', message: "couldn't save that to your account — try again." }));
    }
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
          Your stories with them update too — including the name friends see on shared posts.
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
