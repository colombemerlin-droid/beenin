import { useState, type ReactNode } from 'react';
import { useStore } from '../state/store';
import { storyFields } from '../state/reducer';
import * as api from '../lib/api';
import { initialsOf } from '../lib/identity';
import { flagOf, natFlagOf } from '../data/countries';
import { OverlayHeader } from '../ui/OverlayHeader';
import { Picker, inputStyle } from '../ui/Picker';
import { Toggle, chipStyle, dashedChipStyle, fieldBtnStyle } from '../ui/formKit';
import { Avatar } from '../ui/Avatar';
import { PhotoField } from '../ui/Photo';
import { CheckIcon } from '../ui/icons';

export function AddStoryScreen() {
  const { state, dispatch } = useStore();
  const s = state.story;
  const [query, setQuery] = useState('');
  if (!s) return null;

  const companion = state.companions.find((c) => c.id === s.companionId);
  const q = query.trim().toLowerCase();
  const matches = q ? state.companions.filter((c) => c.name.toLowerCase().includes(q)) : state.companions;
  const canPublish = !!s.companionId;
  const userId = state.authUserId;

  function saveCompanion() {
    if (!s || !s.newCompanion) return;
    const name = s.newCompanion.name.trim();
    if (!name) return;
    const id = crypto.randomUUID();
    dispatch({ type: 'SAVE_NEW_COMPANION', id });
    if (userId) {
      api
        .createCompanion(userId, { id, name, initials: initialsOf(name) || '??', nationalities: s.newCompanion.nationalities })
        .catch(() => dispatch({ type: 'SHOW_TOAST', message: "couldn't save that person to your account — they're on this device only." }));
    }
  }

  async function publish() {
    if (!s || !canPublish) return;
    const fields = storyFields(state, s);
    dispatch({ type: 'PUBLISH_STORY' });
    if (!userId) return;
    try {
      if (s.isEdit) await api.updateEntry(s.editId, fields);
      else await api.createEntry(userId, s.editId, fields);
    } catch {
      dispatch({ type: 'SHOW_TOAST', message: "couldn't save that to your account — it's on this device only." });
    }
  }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 20, background: 'var(--cream-lighter)', display: 'flex', flexDirection: 'column' }}>
      <OverlayHeader title={s.isEdit ? 'Edit a story' : 'Add a story'} onBack={() => dispatch({ type: 'CLOSE_STORY' })} />

      <div className="noscroll" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 24px' }}>
        <div className="serif" style={{ fontSize: 26, lineHeight: 1.15 }}>
          Who is it?
        </div>

        {companion ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, padding: 14, borderRadius: 14, background: 'var(--cream)' }}>
            <Avatar token={companion.initials} size={38} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: '600 15px/1.3 Inter, sans-serif' }}>{companion.name}</div>
              {companion.nationalities.length > 0 && (
                <div style={{ font: '400 12px/1.4 Inter, sans-serif', color: 'var(--ink-40)', marginTop: 2 }}>
                  {companion.nationalities.map((n) => `${natFlagOf(n)} ${n}`).join('  ·  ')}
                </div>
              )}
            </div>
            <button onClick={() => dispatch({ type: 'PATCH_STORY', patch: { companionId: '' } })} style={changeBtnStyle}>
              Change
            </button>
          </div>
        ) : s.newCompanion ? (
          <div style={{ marginTop: 12, padding: 14, borderRadius: 14, background: 'var(--cream)' }}>
            <div className="label" style={{ marginBottom: 6 }}>
              Name
            </div>
            <input
              autoFocus
              value={s.newCompanion.name}
              onChange={(e) => dispatch({ type: 'PATCH_NEW_COMPANION', patch: { name: e.target.value } })}
              style={{ ...inputStyle, padding: 14 }}
            />
            <div className="label" style={{ margin: '14px 0 8px' }}>
              Passport · one or more
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {s.newCompanion.nationalities.map((n) => (
                <span key={n} style={chipStyle}>
                  <span style={{ fontSize: 14, lineHeight: 1 }}>{natFlagOf(n)}</span>
                  <span>{n}</span>
                </span>
              ))}
              <button onClick={() => dispatch({ type: 'OPEN_PICKER', kind: 'companionNat' })} style={dashedChipStyle}>
                {s.newCompanion.nationalities.length ? '+ Another' : '+ Passport'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button onClick={() => dispatch({ type: 'CANCEL_NEW_COMPANION' })} style={cancelBtnStyle}>
                Cancel
              </button>
              <button
                onClick={saveCompanion}
                disabled={!s.newCompanion.name.trim()}
                style={{ ...saveBtnStyle, opacity: s.newCompanion.name.trim() ? 1 : 0.4 }}
              >
                Save person
              </button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="search who you've logged"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button onClick={() => dispatch({ type: 'OPEN_NEW_COMPANION' })} style={newPersonBtnStyle}>
                +
              </button>
            </div>
            {matches.length > 0 ? (
              <div style={{ marginTop: 8, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--stone)' }}>
                {matches.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => dispatch({ type: 'PATCH_STORY', patch: { companionId: c.id } })}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: 12,
                      background: 'var(--paper)',
                      border: 0,
                      borderBottom: '1px solid var(--stone)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      color: 'var(--ink)',
                    }}
                  >
                    <Avatar token={c.initials} size={32} />
                    <span style={{ font: '500 14px/1.3 Inter, sans-serif' }}>{c.name}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ font: '400 13px/1.5 Inter, sans-serif', color: 'var(--ink-40)', marginTop: 10 }}>
                {state.companions.length === 0 ? 'Nobody logged yet — tap + to add someone.' : `No one matches "${query}".`}
              </div>
            )}
          </div>
        )}

        {state.maps.length > 0 && (
          <>
            <div className="label" style={{ margin: '22px 0 8px' }}>
              Link to a map · optional
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button onClick={() => dispatch({ type: 'PATCH_STORY', patch: { mapId: '' } })} style={s.mapId ? mapChipStyleInactive : mapChipStyleActive}>
                No map
              </button>
              {state.maps.map((m) => (
                <button
                  key={m.id}
                  onClick={() => dispatch({ type: 'PATCH_STORY', patch: { mapId: m.id } })}
                  style={s.mapId === m.id ? mapChipStyleActive : mapChipStyleInactive}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </>
        )}

        <CheckRow label="We met" sub="which date this is, and where" checked={s.met} onToggle={() => dispatch({ type: 'PATCH_STORY', patch: { met: !s.met } })}>
          <div className="label" style={{ marginBottom: 6 }}>
            Date number
          </div>
          <input
            value={s.metDateNumber}
            onChange={(e) => dispatch({ type: 'PATCH_STORY', patch: { metDateNumber: e.target.value } })}
            placeholder="e.g. 3"
            inputMode="numeric"
            style={{ ...inputStyle, padding: 14 }}
          />
          <div className="label" style={{ margin: '12px 0 6px' }}>
            Date location
          </div>
          <input
            value={s.metDateLocation}
            onChange={(e) => dispatch({ type: 'PATCH_STORY', patch: { metDateLocation: e.target.value } })}
            placeholder="a rooftop bar"
            style={{ ...inputStyle, padding: 14 }}
          />
        </CheckRow>

        <CheckRow label="Been In" sub="log where you slept together" checked={s.beenIn} onToggle={() => dispatch({ type: 'PATCH_STORY', patch: { beenIn: !s.beenIn } })}>
          <button onClick={() => dispatch({ type: 'OPEN_PICKER', kind: 'country' })} style={fieldBtnStyle}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>{s.country ? flagOf(s.country) : '\u{1F30D}'}</span>
            <span style={{ flex: 1, font: '400 15px/1.4 Inter, sans-serif', color: s.country ? 'var(--ink)' : 'var(--ink-40)' }}>{s.country || 'Pick a country'}</span>
          </button>
        </CheckRow>

        <div className="label" style={{ margin: '22px 0 8px' }}>
          Date
        </div>
        <input
          type="date"
          value={s.date}
          onChange={(e) => dispatch({ type: 'PATCH_STORY', patch: { date: e.target.value } })}
          style={{ ...inputStyle, padding: '13px 14px' }}
        />

        <div className="label" style={{ margin: '18px 0 8px' }}>
          Note · optional
        </div>
        <textarea
          value={s.note}
          onChange={(e) => dispatch({ type: 'PATCH_STORY', patch: { note: e.target.value } })}
          rows={3}
          placeholder="spill the tea… or keep it classy."
          style={{ ...inputStyle, padding: 14, resize: 'none' }}
        />

        <div className="label" style={{ margin: '18px 0 8px' }}>
          Emoji · optional
        </div>
        <button onClick={() => dispatch({ type: 'OPEN_PICKER', kind: 'emoji' })} style={fieldBtnStyle}>
          <span style={{ fontSize: 20, lineHeight: 1 }}>{s.emoji || '➕'}</span>
          <span style={{ flex: 1, font: '400 15px/1.4 Inter, sans-serif', color: s.emoji ? 'var(--ink)' : 'var(--ink-40)' }}>{s.emoji ? 'tap to change' : 'tap to pick one'}</span>
        </button>

        <div className="label" style={{ margin: '20px 0 8px' }}>
          Photo · optional
        </div>
        <PhotoField entryId={s.editId} path={s.photoPath} onChange={(photoPath) => dispatch({ type: 'PATCH_STORY', patch: { photoPath } })} />
        <div style={{ font: '400 12px/1.5 Inter, sans-serif', color: 'var(--ink-40)', marginTop: 8 }}>
          Keep it well-intentioned — photos containing pornographic or illicit content will get your account taken down.
        </div>

        <CheckRow label="Hide name" sub="keep who it's about out of your friends' view" checked={s.hideName} onToggle={() => dispatch({ type: 'PATCH_STORY', patch: { hideName: !s.hideName } })}>
          {null}
        </CheckRow>

        <button
          onClick={() => dispatch({ type: 'PATCH_STORY', patch: { pub: !s.pub } })}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginTop: 20,
            padding: 16,
            borderRadius: 14,
            border: `1px solid ${s.pub ? 'var(--coral)' : 'var(--stone)'}`,
            background: s.pub ? 'var(--coral-tint)' : 'var(--paper)',
            cursor: 'pointer',
            textAlign: 'left',
            color: 'var(--ink)',
            transition: 'all 180ms',
          }}
        >
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', font: '600 16px/1.3 Inter, sans-serif' }}>Share to your wall</span>
            <span style={{ display: 'block', font: '400 13px/1.45 Inter, sans-serif', color: 'var(--ink-body)', marginTop: 2 }}>
              {s.pub ? (s.hideName ? "friends will see it. not who it's about." : "friends will see it — including who it's about.") : 'private — map and history only.'}
            </span>
          </span>
          <Toggle on={s.pub} big />
        </button>
      </div>

      <div style={{ flex: 'none', padding: '14px 20px 34px', borderTop: '1px solid var(--stone)', display: 'flex', gap: 10 }}>
        <button
          onClick={publish}
          disabled={!canPublish}
          style={{
            flex: 1,
            padding: 15,
            borderRadius: 8,
            border: 0,
            background: canPublish ? 'var(--coral)' : 'var(--ink-40)',
            color: '#FFF8F2',
            font: '600 15px/1 Inter, sans-serif',
            cursor: 'pointer',
            opacity: canPublish ? 1 : 0.4,
            transition: 'background 120ms',
          }}
        >
          Publish
        </button>
      </div>

      <Picker />
    </div>
  );
}

function CheckRow({ label, sub, checked, onToggle, children }: { label: string; sub: string; checked: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <div style={{ marginTop: 16 }}>
      <button
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          padding: 0,
          border: 0,
          background: 'transparent',
          cursor: 'pointer',
          textAlign: 'left',
          color: 'var(--ink)',
        }}
      >
        <span
          style={{
            width: 18,
            height: 18,
            flex: 'none',
            borderRadius: 5,
            border: `1.5px solid ${checked ? 'var(--coral)' : 'var(--stone-dashed)'}`,
            background: checked ? 'var(--coral)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFF8F2',
          }}
        >
          {checked && <CheckIcon size={12} />}
        </span>
        <span style={{ font: '600 14px/1.3 Inter, sans-serif' }}>{label}</span>
        <span style={{ font: '400 12px/1.4 Inter, sans-serif', color: 'var(--ink-40)' }}>· {sub}</span>
      </button>
      {checked && <div style={{ marginTop: 10, paddingLeft: 27 }}>{children}</div>}
    </div>
  );
}

const changeBtnStyle = {
  flex: 'none',
  padding: '8px 12px',
  borderRadius: 999,
  border: '1px solid var(--stone)',
  background: 'var(--paper)',
  color: 'var(--ink-body)',
  cursor: 'pointer',
  font: '500 12px/1 Inter, sans-serif',
} as const;

const cancelBtnStyle = {
  flex: 1,
  padding: 12,
  borderRadius: 8,
  border: '1px solid var(--stone)',
  background: 'transparent',
  color: 'var(--ink-body)',
  cursor: 'pointer',
  font: '600 14px/1 Inter, sans-serif',
} as const;

const saveBtnStyle = {
  flex: 1,
  padding: 12,
  borderRadius: 8,
  border: 0,
  background: 'var(--coral)',
  color: '#FFF8F2',
  cursor: 'pointer',
  font: '600 14px/1 Inter, sans-serif',
} as const;

const newPersonBtnStyle = {
  width: 48,
  flex: 'none',
  borderRadius: 8,
  border: '1px dashed var(--stone-dashed)',
  background: 'transparent',
  color: 'var(--coral-dark)',
  cursor: 'pointer',
  font: '700 20px/1 Inter, sans-serif',
} as const;

const mapChipBase = {
  padding: '9px 15px',
  borderRadius: 999,
  cursor: 'pointer',
  font: '500 13px/1.3 Inter, sans-serif',
} as const;

const mapChipStyleActive = { ...mapChipBase, border: '1px solid var(--coral)', background: 'var(--coral-tint)', color: 'var(--coral-dark)' } as const;
const mapChipStyleInactive = { ...mapChipBase, border: '1px solid var(--stone)', background: 'var(--paper)', color: 'var(--ink-body)' } as const;
