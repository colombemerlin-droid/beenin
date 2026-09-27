import { useStore } from '../../state/store';
import { OverlayHeader } from '../../ui/OverlayHeader';
import { Avatar } from '../../ui/Avatar';
import { EmptyState } from '../../ui/EmptyState';
import { ChevronRightIcon } from '../../ui/icons';

export function FriendRequestsOverlay() {
  const { state, dispatch } = useStore();
  if (state.overlay !== 'friendRequests') return null;
  const pending = state.friends.filter((f) => f.requestState === 'pending_in');

  return (
    <div className="noscroll" style={{ position: 'absolute', inset: 0, background: 'var(--cream-lighter)', zIndex: 40, overflowY: 'auto' }}>
      <OverlayHeader title="Friend requests" onBack={() => dispatch({ type: 'CLOSE_OVERLAY' })} />
      <div style={{ padding: '14px 20px 120px' }}>
        {pending.length === 0 ? (
          <EmptyState title="No requests" body="You're all caught up." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {pending.map((f) => (
              <button
                key={f.name}
                onClick={() => dispatch({ type: 'OPEN_PERSON', name: f.name })}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 8px', background: 'transparent', border: 0, borderRadius: 14, cursor: 'pointer', textAlign: 'left', color: 'var(--ink)' }}
              >
                <Avatar token={f.initials} size={40} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', font: '600 15px/1.3 Inter, sans-serif' }}>{f.name}</span>
                  <span style={{ display: 'block', font: '400 12px/1.4 Inter, sans-serif', color: 'var(--ink-40)', marginTop: 2 }}>wants to be friends</span>
                </span>
                <ChevronRightIcon size={18} color="#A39A92" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
