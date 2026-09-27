import { useStore } from '../state/store';
import { flagOf } from '../data/countries';
import { notificationFeed } from '../state/selectors';
import { ChevronRightIcon, ThumbsUpIcon, CommentIcon } from '../ui/icons';
import { EmptyState } from '../ui/EmptyState';

function where(country: string): string {
  return country ? `${flagOf(country)} ${country}` : 'your story';
}

export function NotificationsScreen() {
  const { state, dispatch } = useStore();
  const pending = state.friends.filter((f) => f.requestState === 'pending_in');
  const items = notificationFeed(state);

  return (
    <div className="noscroll" style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '4px 20px 120px' }}>
      <div style={{ padding: '8px 0 16px' }}>
        <div className="serif" style={{ fontSize: 28, lineHeight: 1.15 }}>
          Notifications
        </div>
      </div>

      <button
        onClick={() => dispatch({ type: 'OPEN_FRIEND_REQUESTS' })}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 16px',
          borderRadius: 14,
          border: 0,
          background: 'var(--cream)',
          cursor: 'pointer',
          textAlign: 'left',
          color: 'var(--ink)',
          boxShadow: '0 1px 2px rgba(31,26,23,.04), 0 4px 14px rgba(31,26,23,.06)',
        }}
      >
        <span
          style={{
            width: 30,
            height: 30,
            flex: 'none',
            borderRadius: '50%',
            background: pending.length ? 'var(--coral)' : 'var(--stone)',
            color: pending.length ? '#FFF8F2' : 'var(--ink-40)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            font: '700 13px/1 Inter, sans-serif',
          }}
        >
          {pending.length}
        </span>
        <span style={{ flex: 1, font: '600 15px/1.3 Inter, sans-serif' }}>Friend requests</span>
        <ChevronRightIcon size={18} color="#A39A92" />
      </button>

      <div className="label" style={{ margin: '22px 0 10px' }}>
        Activity
      </div>

      {items.length === 0 ? (
        <EmptyState title="Nothing yet" body="Kudos, comments, and travel anniversaries will show up here." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((n, i) => {
            const fade = 1 - Math.min(0.55, (i / items.length) * 0.55);
            return (
              <button
                key={n.id}
                onClick={() => dispatch({ type: 'OPEN_DETAIL', kind: 'mine', id: n.entryId })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 14,
                  border: 0,
                  background: 'var(--cream)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: 'var(--ink)',
                  opacity: fade,
                }}
              >
                <span
                  style={{
                    width: 30,
                    height: 30,
                    flex: 'none',
                    borderRadius: '50%',
                    background: 'var(--coral-tint)',
                    color: 'var(--coral-dark)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {n.kind === 'kudos' && <ThumbsUpIcon size={14} />}
                  {n.kind === 'comment' && <CommentIcon />}
                  {n.kind === 'memory' && <span style={{ fontSize: 14, lineHeight: 1 }}>{n.emoji || flagOf(n.country)}</span>}
                </span>
                <span style={{ flex: 1, minWidth: 0, font: '400 14px/1.45 Inter, sans-serif' }}>
                  {n.kind === 'kudos' && (
                    <>
                      <b style={{ fontWeight: 600 }}>{n.who}</b> gave you a stamp of approval on {where(n.country)}
                    </>
                  )}
                  {n.kind === 'comment' && (
                    <>
                      <b style={{ fontWeight: 600 }}>{n.who}</b> commented “{n.text}” on {where(n.country)}
                    </>
                  )}
                  {n.kind === 'memory' && (
                    <>
                      {n.years} year{n.years > 1 ? 's' : ''} ago today: {n.country ? where(n.country) : 'a story'}
                    </>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
