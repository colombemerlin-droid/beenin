import { useStore } from '../state/store';
import { flagOf } from '../data/countries';
import { fmtDate } from '../data/format';
import { ME_KEY } from '../lib/identity';
import { natLabel } from '../state/selectors';
import { DotsIcon, ThumbsUpIcon, CommentIcon } from '../ui/icons';
import { Avatar } from '../ui/Avatar';
import { EmptyState } from '../ui/EmptyState';
import type { Entry, FriendPost, Companion } from '../types';

interface FeedRow {
  id: string;
  mine: boolean;
  who: string;
  initials: string;
  when: string;
  ord: number;
  country: string;
  nationality: string;
  place: string;
  note: string;
  emoji: string;
  photo: boolean;
  dateLabel: string;
  kudos: string[];
  iK: boolean;
  comments: number;
  mapName?: string;
  // True only for a group map's own backfill/quick-add entries (no full detail view exists for those).
  // A personal entry that merely happens to be linked to a map stays fully interactive.
  isMapNative?: boolean;
  companionName?: string;
  metLine?: string;
}

function rowFromEntry(e: Entry, companions: Companion[], mapName?: string, isMapNative?: boolean): FeedRow {
  const companion = e.companionId ? companions.find((c) => c.id === e.companionId) : undefined;
  const metParts = [e.metDateNumber ? `date #${e.metDateNumber}` : '', e.metDateLocation].filter(Boolean);
  return {
    id: e.id,
    mine: true,
    who: 'You',
    initials: ME_KEY,
    when: e.when,
    ord: e.ord,
    country: e.country,
    nationality: natLabel(e),
    place: e.placePub ? e.place : '',
    note: e.note,
    emoji: e.emoji,
    photo: e.photo,
    dateLabel: e.date ? fmtDate(e.date) : '',
    kudos: e.kudos,
    iK: e.iK,
    comments: e.comments.length,
    mapName,
    isMapNative,
    companionName: companion && !e.hideName ? companion.name : undefined,
    metLine: metParts.length ? metParts.join(' · ') : undefined,
  };
}

function rowFromFriendPost(p: FriendPost): FeedRow {
  return {
    id: p.id,
    mine: false,
    who: p.who,
    initials: p.initials,
    when: p.when,
    ord: p.ord,
    country: p.country,
    nationality: p.nationality,
    place: p.place,
    note: p.note,
    emoji: p.emoji,
    photo: p.photo,
    dateLabel: '',
    kudos: p.kudos,
    iK: p.iK,
    comments: p.comments.length,
  };
}

export function FeedScreen() {
  const { state, dispatch } = useStore();
  const own = state.entries
    .filter((e) => e.pub && !e.stub)
    .map((e) => rowFromEntry(e, state.companions, e.mapId ? state.maps.find((m) => m.id === e.mapId)?.name : undefined));
  const mapRows = state.maps.flatMap((m) => m.entries.filter((e) => e.pub && !e.stub).map((e) => rowFromEntry(e, state.companions, m.name, true)));
  const friends = state.friendPosts.map(rowFromFriendPost);
  const rows = [...friends, ...own, ...mapRows].sort((a, b) => a.ord - b.ord);

  return (
    <div className="noscroll" style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '4px 20px 120px' }}>
      <div style={{ padding: '8px 0 16px' }}>
        <div className="serif" style={{ fontSize: 28, lineHeight: 1.15 }}>
          Feed
        </div>
        <div style={{ font: '400 13px/1.45 Inter, sans-serif', color: 'var(--ink-body)', marginTop: 2 }}>visible to your friends. nobody else.</div>
      </div>

      {rows.length === 0 && (
        <EmptyState
          title="Nothing on your feed yet"
          body="Publish an entry from the + button, or add friends to see what they've stamped."
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {rows.map((p) => (
          <div key={p.id} style={{ background: 'var(--cream)', borderRadius: 14, padding: '12px 16px 16px', boxShadow: '0 1px 2px rgba(31,26,23,.04), 0 4px 14px rgba(31,26,23,.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <Avatar
                as="button"
                token={p.initials}
                size={38}
                onClick={() => (p.mine ? dispatch({ type: 'SET_TAB', tab: 'profile' }) : dispatch({ type: 'OPEN_PERSON', name: p.who }))}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: '400 14px/1.4 Inter, sans-serif' }}>
                  <button
                    onClick={() => (p.mine ? dispatch({ type: 'SET_TAB', tab: 'profile' }) : dispatch({ type: 'OPEN_PERSON', name: p.who }))}
                    style={{ background: 'transparent', border: 0, padding: 0, cursor: 'pointer', font: '600 14px/1.4 Inter, sans-serif', color: 'var(--ink)' }}
                  >
                    {p.who}
                  </button>
                  <span style={{ color: 'var(--ink-40)' }}> · {p.when}</span>
                </div>
                <div style={{ font: '400 13px/1.45 Inter, sans-serif', color: 'var(--ink-body)', marginTop: 1 }}>
                  {p.isMapNative && p.mapName ? (
                    <>
                      added {flagOf(p.country)} {p.country} on <b style={{ fontWeight: 600 }}>{p.mapName}</b>
                    </>
                  ) : p.country ? (
                    <>
                      stamped {flagOf(p.country)} {p.country}
                      {p.mapName && (
                        <>
                          {' '}
                          on <b style={{ fontWeight: 600 }}>{p.mapName}</b>
                        </>
                      )}
                    </>
                  ) : (
                    'shared a story'
                  )}
                  {p.companionName && (
                    <>
                      {' '}
                      with <b style={{ fontWeight: 600 }}>{p.companionName}</b>
                    </>
                  )}
                </div>
                {p.metLine && (
                  <div style={{ font: '400 12px/1.4 Inter, sans-serif', color: 'var(--ink-40)', marginTop: 2 }}>We met · {p.metLine}</div>
                )}
              </div>
              {!p.isMapNative && (
                <button
                  onClick={() => (p.mine ? dispatch({ type: 'OPEN_MINE_MENU', id: p.id }) : dispatch({ type: 'OPEN_FEED_MENU', id: p.id }))}
                  style={{ width: 30, height: 30, flex: 'none', background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--ink-40)', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <DotsIcon />
                </button>
              )}
            </div>

            <button
              onClick={() => !p.isMapNative && dispatch({ type: 'OPEN_DETAIL', kind: p.mine ? 'mine' : 'feed', id: p.id })}
              style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 0, padding: 0, marginTop: 12, cursor: p.isMapNative ? 'default' : 'pointer', color: 'var(--ink)' }}
            >
              {p.nationality && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="label">Passport</span>
                  <span style={{ font: '500 14px/1.3 Inter, sans-serif', color: 'var(--ink)' }}>{p.nationality}</span>
                  <span style={{ flex: 1 }} />
                  {p.emoji && <span style={{ fontSize: 18, lineHeight: 1 }}>{p.emoji}</span>}
                </span>
              )}
              {!p.nationality && p.emoji && <span style={{ fontSize: 18, lineHeight: 1 }}>{p.emoji}</span>}
              {p.place && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 9, color: 'var(--ink-body)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 21s7-6.4 7-11a7 7 0 1 0-14 0c0 4.6 7 11 7 11Z" />
                    <circle cx="12" cy="10" r="2.4" />
                  </svg>
                  <span style={{ font: '400 13px/1.45 Inter, sans-serif' }}>{p.place}</span>
                </span>
              )}
              {p.note && <span style={{ display: 'block', fontFamily: 'Fraunces, Georgia, serif', fontWeight: 400, fontSize: 17, lineHeight: 1.4, marginTop: 10 }}>“{p.note}”</span>}
              {p.photo && (
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    marginTop: 12,
                    height: 140,
                    borderRadius: 8,
                    border: '1px solid var(--stone)',
                    backgroundImage: 'repeating-linear-gradient(135deg, rgba(226,114,91,.1) 0 7px, transparent 7px 14px)',
                    padding: 8,
                  }}
                >
                  <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 10, color: 'var(--ink-body)', background: 'var(--cream-lighter)', borderRadius: 4, padding: '3px 6px' }}>photo</span>
                </span>
              )}
              {p.dateLabel && <span style={{ display: 'block', font: '400 12px/1.4 Inter, sans-serif', color: 'var(--ink-40)', marginTop: 10 }}>{p.dateLabel}</span>}
            </button>

            {!p.isMapNative && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--stone)' }}>
              <button
                onClick={() => dispatch({ type: 'TOGGLE_KUDOS', kind: p.mine ? 'mine' : 'feed', id: p.id })}
                style={{
                  width: 34,
                  height: 34,
                  flex: 'none',
                  borderRadius: '50%',
                  border: `1px solid ${p.iK ? 'var(--coral)' : 'var(--stone)'}`,
                  background: p.iK ? 'var(--coral-tint)' : 'transparent',
                  color: p.iK ? 'var(--coral-dark)' : 'var(--ink-40)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 180ms',
                }}
              >
                <ThumbsUpIcon />
              </button>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {p.kudos.slice(0, 3).map((k, i) => (
                  <Avatar key={i} token={k} size={24} style={{ marginRight: -7, border: '1.5px solid var(--cream)' }} />
                ))}
              </div>
              <span style={{ font: '400 13px/1.45 Inter, sans-serif', color: 'var(--ink-body)', marginLeft: 10 }}>{p.kudos.length} stamps of approval</span>
              <span style={{ flex: 1 }} />
              <button
                onClick={() => dispatch({ type: 'OPEN_DETAIL', kind: p.mine ? 'mine' : 'feed', id: p.id })}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 0, padding: 0, cursor: 'pointer', color: 'var(--ink-body)', font: '400 13px/1.45 Inter, sans-serif' }}
              >
                <CommentIcon />
                <span>{p.comments}</span>
              </button>
            </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
