import { useStore } from '../../state/store';
import { useFriendActions } from '../../state/useFriendActions';
import { flagOf } from '../../data/countries';
import { OverlayHeader } from '../../ui/OverlayHeader';
import { Avatar } from '../../ui/Avatar';

export function PersonOverlay() {
  const { state, dispatch } = useStore();
  const { sendRequest, approve, decline } = useFriendActions();
  if (state.overlay !== 'person' || !state.person) return null;
  const p = state.person;

  const posts = state.friendPosts.filter((post) => post.ownerId === p.id);
  const isFriend = p.requestState === 'accepted';

  return (
    <div className="noscroll" style={{ position: 'absolute', inset: 0, background: 'var(--cream-lighter)', zIndex: 40, overflowY: 'auto' }}>
      <OverlayHeader title="Profile" onBack={() => dispatch({ type: 'BACK_FROM_PERSON' })} />
      <div style={{ padding: '20px 20px 120px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Avatar token={p.initials} size={64} style={{ font: '600 24px/1 Inter, sans-serif' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="serif" style={{ fontSize: 25, lineHeight: 1.1 }}>
              {p.name}
            </div>
            <div style={{ font: '400 13px/1.45 Inter, sans-serif', color: 'var(--ink-body)', marginTop: 3 }}>
              {[p.handle && `@${p.handle}`, isFriend ? 'friends' : p.status].filter(Boolean).join(' · ')}
            </div>
          </div>
        </div>

        {!isFriend ? (
          <>
            {p.requestState === 'pending_in' ? (
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button
                  onClick={() => approve(p.id)}
                  style={{ flex: 1, padding: 14, borderRadius: 8, border: 0, background: 'var(--coral)', color: '#FFF8F2', font: '600 15px/1 Inter, sans-serif', cursor: 'pointer' }}
                >
                  Approve
                </button>
                <button
                  onClick={() => decline(p.id)}
                  style={{ flex: 1, padding: 14, borderRadius: 8, border: '1px solid var(--stone)', background: 'transparent', color: 'var(--ink-body)', font: '600 15px/1 Inter, sans-serif', cursor: 'pointer' }}
                >
                  Decline
                </button>
              </div>
            ) : (
              <button
                onClick={sendRequest}
                disabled={p.requestState === 'pending_out'}
                style={{
                  width: '100%',
                  marginTop: 20,
                  padding: 14,
                  borderRadius: 8,
                  border: 0,
                  background: p.requestState === 'pending_out' ? 'var(--ink-40)' : 'var(--coral)',
                  color: '#FFF8F2',
                  font: '600 15px/1 Inter, sans-serif',
                  cursor: p.requestState === 'pending_out' ? 'default' : 'pointer',
                  opacity: p.requestState === 'pending_out' ? 0.6 : 1,
                }}
              >
                {p.requestState === 'pending_out' ? 'Request sent' : 'Add friend'}
              </button>
            )}
            <div style={{ marginTop: 16, borderRadius: 14, border: '1px dashed var(--stone-dashed)', padding: 16, font: '400 13px/1.6 Inter, sans-serif', color: 'var(--ink-body)' }}>
              Nothing to see until you're friends. Send the request — one accept from either side and you're both through customs.
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '22px 0 12px' }}>
              <span className="label">Wall</span>
              <span style={{ flex: 1, height: 1, background: 'var(--stone)' }} />
              <span style={{ font: '400 12px/1.4 Inter, sans-serif', color: 'var(--ink-40)' }}>map stays private</span>
            </div>
            {posts.length === 0 && (
              <div style={{ font: '400 13px/1.5 Inter, sans-serif', color: 'var(--ink-40)', padding: '8px 0' }}>Nothing public on their wall yet.</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {posts.map((q) => (
                <button
                  key={q.id}
                  onClick={() => dispatch({ type: 'OPEN_DETAIL', kind: 'feed', id: q.id })}
                  style={{ textAlign: 'left', background: 'var(--cream)', border: 0, borderRadius: 14, padding: '13px 16px', cursor: 'pointer', color: 'var(--ink)', boxShadow: '0 1px 2px rgba(31,26,23,.04), 0 4px 14px rgba(31,26,23,.06)' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {q.country && <span style={{ fontSize: 17, lineHeight: 1 }}>{flagOf(q.country)}</span>}
                    <span style={{ flex: 1, font: '400 13px/1.45 Inter, sans-serif', color: 'var(--ink-body)' }}>
                      {q.country ? `stamped ${q.country}` : 'shared a story'}
                      {q.companionName ? ` with ${q.companionName}` : ''}
                    </span>
                    {q.emoji && <span style={{ fontSize: 17, lineHeight: 1 }}>{q.emoji}</span>}
                  </span>
                  {q.note && <span style={{ display: 'block', fontFamily: 'Fraunces, Georgia, serif', fontWeight: 400, fontSize: 17, lineHeight: 1.4, marginTop: 8 }}>“{q.note}”</span>}
                  <span style={{ display: 'block', font: '400 12px/1.4 Inter, sans-serif', color: 'var(--ink-40)', marginTop: 8 }}>{q.when}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
