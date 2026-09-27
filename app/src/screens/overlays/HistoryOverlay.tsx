import { useStore } from '../../state/store';
import { flagOf, natFlagOf } from '../../data/countries';
import { fmtDate, kudosLabel } from '../../data/format';
import { natLabel } from '../../state/selectors';
import { OverlayHeader } from '../../ui/OverlayHeader';
import { EmptyState } from '../../ui/EmptyState';
import { DotsIcon, LockIcon } from '../../ui/icons';

export function HistoryOverlay() {
  const { state, dispatch } = useStore();
  if (state.overlay !== 'history') return null;

  return (
    <div className="noscroll" style={{ position: 'absolute', inset: 0, background: 'var(--cream-lighter)', zIndex: 40, overflowY: 'auto' }}>
      <OverlayHeader title="History" onBack={() => dispatch({ type: 'CLOSE_OVERLAY' })} />
      <div style={{ padding: '16px 20px 120px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {state.entries.length === 0 && (
          <EmptyState
            title="No entries yet"
            body="Everything you log — public or private — will show up here, oldest paperwork and all."
            action={
              <button
                onClick={() => dispatch({ type: 'OPEN_STORY' })}
                style={{ marginTop: 6, padding: '10px 18px', borderRadius: 8, border: 0, background: 'var(--coral)', color: '#FFF8F2', font: '600 14px/1 Inter, sans-serif', cursor: 'pointer' }}
              >
                Add your first story
              </button>
            }
          />
        )}
        {state.entries.map((e) => {
          const companion = e.companionId ? state.companions.find((c) => c.id === e.companionId) : undefined;
          const personName = companion?.name || e.name;
          // A story with no country or passport has no flag to show.
          const flag = e.country ? flagOf(e.country) : e.nationality[0] ? natFlagOf(e.nationality[0]) : '📝';
          const title = e.country || natLabel(e) || personName || 'Story';
          const sub = e.stub ? 'backfilled · no details yet' : `${e.city ? e.city + ' · ' : ''}${e.pub ? 'on your feed' : 'private'}`;
          const meta = [e.date && fmtDate(e.date), personName, e.kudos.length > 0 && kudosLabel(e.kudos.length)].filter(Boolean).join('  ·  ');
          return (
            <div key={e.id} style={{ position: 'relative', background: 'var(--cream)', borderRadius: 14, padding: '12px 16px 14px', boxShadow: '0 1px 2px rgba(31,26,23,.04), 0 4px 14px rgba(31,26,23,.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20, lineHeight: 1, flex: 'none' }}>{flag}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="serif" style={{ fontSize: 20, lineHeight: 1.2 }}>
                    {title}
                  </div>
                  <div style={{ font: '400 12px/1.4 Inter, sans-serif', color: 'var(--ink-40)', marginTop: 2 }}>{sub}</div>
                </div>
                {!e.pub && (
                  <span style={{ flex: 'none', width: 26, height: 26, borderRadius: '50%', background: 'var(--coral-tint)', color: 'var(--coral-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <LockIcon />
                  </span>
                )}
                <button
                  onClick={() => dispatch({ type: 'OPEN_MINE_MENU', id: e.id })}
                  style={{ width: 28, height: 28, flex: 'none', background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--ink-40)', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <DotsIcon />
                </button>
              </div>
              {e.stub ? (
                <button
                  onClick={() => dispatch({ type: 'OPEN_STORY', editId: e.id })}
                  style={{ width: '100%', marginTop: 10, padding: 10, borderRadius: 8, border: '1px dashed var(--stone-dashed)', background: 'transparent', cursor: 'pointer', color: 'var(--ink-body)', font: '500 13px/1 Inter, sans-serif' }}
                >
                  Add details — optional
                </button>
              ) : (
                <button
                  onClick={() => dispatch({ type: 'OPEN_DETAIL', kind: 'mine', id: e.id })}
                  style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 0, padding: 0, marginTop: 10, cursor: 'pointer', color: 'var(--ink)' }}
                >
                  {(natLabel(e) || e.emoji) && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {natLabel(e) && <span className="label">Passport</span>}
                      <span style={{ font: '500 14px/1.3 Inter, sans-serif' }}>{natLabel(e)}</span>
                      <span style={{ flex: 1 }} />
                      {e.emoji && <span style={{ fontSize: 17, lineHeight: 1 }}>{e.emoji}</span>}
                    </span>
                  )}
                  {e.note && <span style={{ display: 'block', fontFamily: 'Fraunces, Georgia, serif', fontWeight: 400, fontSize: 16, lineHeight: 1.4, marginTop: 8 }}>“{e.note}”</span>}
                  <span style={{ display: 'block', font: '400 12px/1.4 Inter, sans-serif', color: 'var(--ink-40)', marginTop: 8 }}>{meta}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
