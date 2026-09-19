import { useStore } from '../state/store';
import { flagOf, natFlagOf } from '../data/countries';
import { fmtDate } from '../data/format';
import { EMOJI_GROUPS, splitEmoji } from '../data/emoji';
import { OverlayHeader } from '../ui/OverlayHeader';
import { Picker, inputStyle } from '../ui/Picker';

export function AddEntryScreen() {
  const { state, dispatch } = useStore();
  const a = state.add;
  if (!a) return null;

  const blocked = !(a.country && a.nationality.length);
  const summary = a.country
    ? `${flagOf(a.country)} ${a.country} · ${a.nationality.join(' · ') || 'passport'} · ${a.date ? fmtDate(a.date) : 'no date'}${a.name ? ` · ${a.name} (private)` : ''}. ${
        a.pub ? (a.place ? (a.placePub ? 'Location shown.' : 'Location kept private.') : 'Going to your feed.') : 'Staying private.'
      }`
    : '';

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 20, background: 'var(--cream-lighter)', display: 'flex', flexDirection: 'column' }}>
      <OverlayHeader title={a.editId ? 'Add details' : 'New stamp'} onBack={() => dispatch({ type: 'CLOSE_ADD' })} />

      <div className="noscroll" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 24px' }}>
        <div className="serif" style={{ fontSize: 26, lineHeight: 1.15 }}>
          Where, and Whose Flag?
        </div>

        <div className="label" style={{ margin: '22px 0 8px' }}>
          Passport · one or more
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {a.nationality.map((n) => (
            <button key={n} onClick={() => dispatch({ type: 'REMOVE_ADD_NAT', label: n })} style={chipStyle}>
              <span style={{ fontSize: 14, lineHeight: 1 }}>{natFlagOf(n)}</span>
              <span>{n}</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          ))}
          <button onClick={() => dispatch({ type: 'OPEN_PICKER', kind: 'nat' })} style={dashedChipStyle}>
            {a.nationality.length ? '+ Another' : '+ Passport'}
          </button>
        </div>

        <div className="label" style={{ margin: '18px 0 8px' }}>
          Stamp · country
        </div>
        <button onClick={() => dispatch({ type: 'OPEN_PICKER', kind: 'country' })} style={fieldBtnStyle}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>{a.country ? flagOf(a.country) : '\u{1F30D}'}</span>
          <span style={{ flex: 1, font: '400 15px/1.4 Inter, sans-serif', color: a.country ? 'var(--ink)' : 'var(--ink-40)' }}>{a.country || 'Pick a country'}</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A39A92" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </svg>
        </button>

        <div className="label" style={{ margin: '22px 0 8px' }}>
          Name · private
        </div>
        <input
          value={a.name}
          onChange={(e) => dispatch({ type: 'PATCH_ADD', patch: { name: e.target.value } })}
          placeholder="only you will see this"
          style={{ ...inputStyle, padding: 14 }}
        />

        <div className="label" style={{ margin: '18px 0 8px' }}>
          Date
        </div>
        <input
          type="date"
          value={a.date}
          onChange={(e) => dispatch({ type: 'PATCH_ADD', patch: { date: e.target.value } })}
          style={{ ...inputStyle, padding: '13px 14px' }}
        />

        <div className="label" style={{ margin: '18px 0 8px' }}>
          Location · optional
        </div>
        <input
          value={a.place}
          onChange={(e) => dispatch({ type: 'PATCH_ADD', patch: { place: e.target.value } })}
          placeholder="a rooftop bar"
          style={{ ...inputStyle, padding: 14 }}
        />
        {a.pub ? (
          <button
            onClick={() => dispatch({ type: 'PATCH_ADD', patch: { placePub: !a.placePub } })}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginTop: 10,
              padding: '13px 14px',
              borderRadius: 14,
              border: `1px solid ${a.placePub ? 'var(--coral)' : 'var(--stone)'}`,
              background: a.placePub ? 'var(--coral-tint)' : 'var(--paper)',
              cursor: 'pointer',
              textAlign: 'left',
              color: 'var(--ink)',
              transition: 'all 180ms',
            }}
          >
            <span style={{ flex: 1, font: '400 14px/1.45 Inter, sans-serif' }}>{a.placePub ? 'Location shown to friends' : 'Location kept private'}</span>
            <Toggle on={a.placePub} />
          </button>
        ) : (
          <div style={{ font: '400 12px/1.5 Inter, sans-serif', color: 'var(--ink-40)', marginTop: 10 }}>Private post — the location stays private with it.</div>
        )}

        <div className="label" style={{ margin: '18px 0 8px' }}>
          Note · optional
        </div>
        <textarea
          value={a.note}
          onChange={(e) => dispatch({ type: 'PATCH_ADD', patch: { note: e.target.value } })}
          rows={3}
          placeholder="spill the tea… or keep it classy."
          style={{ ...inputStyle, padding: 14, resize: 'none' }}
        />

        <div className="label" style={{ margin: '18px 0 10px' }}>
          Emoji · optional
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {EMOJI_GROUPS.map((g) => (
            <div key={g.name}>
              <div style={{ font: '400 12px/1.4 Inter, sans-serif', color: 'var(--ink-40)' }}>{g.name}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6, marginTop: 7 }}>
                {splitEmoji(g.chars).map((ch) => {
                  const active = a.emoji === ch;
                  return (
                    <button
                      key={ch}
                      onClick={() => dispatch({ type: 'PATCH_ADD', patch: { emoji: ch } })}
                      style={{
                        aspectRatio: '1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 19,
                        borderRadius: 8,
                        background: active ? 'var(--coral-tint)' : 'var(--paper)',
                        border: `1px solid ${active ? 'var(--coral)' : 'var(--stone)'}`,
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

        <div className="label" style={{ margin: '20px 0 8px' }}>
          Photo · optional
        </div>
        <button
          onClick={() => dispatch({ type: 'PATCH_ADD', patch: { photo: !a.photo } })}
          style={{
            width: '100%',
            height: 132,
            borderRadius: 14,
            border: '1px solid var(--stone)',
            backgroundColor: 'var(--paper)',
            backgroundImage: a.photo ? 'repeating-linear-gradient(135deg, rgba(226,114,91,.12) 0 7px, transparent 7px 14px)' : 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--ink)',
          }}
        >
          <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11, color: 'var(--ink-body)', background: 'var(--cream-lighter)', borderRadius: 4, padding: '4px 8px' }}>
            {a.photo ? 'photo attached · tap to remove' : 'tap to add a photo'}
          </span>
        </button>
        <div style={{ font: '400 12px/1.5 Inter, sans-serif', color: 'var(--ink-40)', marginTop: 8 }}>
          Keep it well-intentioned — photos containing pornographic or illicit content will get your account taken down.
        </div>

        <button
          onClick={() => dispatch({ type: 'PATCH_ADD', patch: { pub: !a.pub } })}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginTop: 20,
            padding: 16,
            borderRadius: 14,
            border: `1px solid ${a.pub ? 'var(--coral)' : 'var(--stone)'}`,
            background: a.pub ? 'var(--coral-tint)' : 'var(--paper)',
            cursor: 'pointer',
            textAlign: 'left',
            color: 'var(--ink)',
            transition: 'all 180ms',
          }}
        >
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', font: '600 16px/1.3 Inter, sans-serif' }}>Share to your wall</span>
            <span style={{ display: 'block', font: '400 13px/1.45 Inter, sans-serif', color: 'var(--ink-body)', marginTop: 2 }}>
              {a.pub ? 'friends will see it. never the name.' : 'private — map and history only.'}
            </span>
          </span>
          <Toggle on={a.pub} big />
        </button>

        <div style={{ marginTop: 20, background: 'var(--cream)', borderRadius: 14, padding: '14px 16px' }}>
          <div className="label" style={{ marginBottom: 6 }}>
            Summary
          </div>
          <div style={{ font: '400 14px/1.55 Inter, sans-serif' }}>{summary}</div>
        </div>
      </div>

      <div style={{ flex: 'none', padding: '14px 20px 34px', borderTop: '1px solid var(--stone)', display: 'flex', gap: 10 }}>
        <button
          onClick={() => dispatch({ type: 'PUBLISH_ADD' })}
          disabled={blocked}
          style={{
            flex: 1,
            padding: 15,
            borderRadius: 8,
            border: 0,
            background: blocked ? 'var(--ink-40)' : 'var(--coral)',
            color: '#FFF8F2',
            font: '600 15px/1 Inter, sans-serif',
            cursor: 'pointer',
            opacity: blocked ? 0.4 : 1,
            transition: 'background 120ms',
          }}
        >
          Log it
        </button>
      </div>

      <Picker />
    </div>
  );
}

function Toggle({ on, big = false }: { on: boolean; big?: boolean }) {
  const w = big ? 48 : 44;
  const h = big ? 28 : 26;
  const knob = big ? 22 : 20;
  const left = on ? w - knob - 3 : 3;
  return (
    <span style={{ width: w, height: h, flex: 'none', borderRadius: 999, background: on ? 'var(--coral)' : 'var(--stone-dashed)', position: 'relative', display: 'block', transition: 'background 180ms' }}>
      <span
        style={{
          position: 'absolute',
          top: 3,
          left,
          width: knob,
          height: knob,
          borderRadius: '50%',
          background: 'var(--paper)',
          boxShadow: '0 1px 3px rgba(31,26,23,.2)',
          transition: 'left 180ms cubic-bezier(0.4,0,0.2,1)',
        }}
      />
    </span>
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
  cursor: 'pointer',
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

const fieldBtnStyle = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: 14,
  borderRadius: 8,
  border: '1px solid var(--stone)',
  background: 'var(--paper)',
  cursor: 'pointer',
  textAlign: 'left',
  color: 'var(--ink)',
} as const;
