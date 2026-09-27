import { useState } from 'react';
import { useStore } from '../../state/store';
import { OverlayHeader } from '../../ui/OverlayHeader';
import { Avatar } from '../../ui/Avatar';
import { EmptyState } from '../../ui/EmptyState';
import { ChevronRightIcon } from '../../ui/icons';

export function FriendsOverlay() {
  const { state, dispatch } = useStore();
  const [addDraft, setAddDraft] = useState('');
  if (state.overlay !== 'friends') return null;

  const isMine = !state.friendsOf;
  const q = state.friendQuery.toLowerCase();
  const source = isMine ? state.friends.filter((f) => f.requestState === 'accepted') : state.friends.filter((f) => f.name !== state.friendsOf);
  const list = source.filter((f) => f.name.toLowerCase().includes(q));
  const title = isMine ? 'Your friends' : `${state.friendsOf.split(' ')[0]}’s friends`;

  function addFriend() {
    const name = addDraft.trim();
    if (!name) return;
    dispatch({ type: 'SEND_FRIEND_REQUEST_BY_NAME', name });
    setAddDraft('');
  }

  return (
    <div className="noscroll" style={{ position: 'absolute', inset: 0, background: 'var(--cream-lighter)', zIndex: 40, overflowY: 'auto' }}>
      <OverlayHeader title={title} onBack={() => dispatch({ type: 'CLOSE_OVERLAY' })} />
      <div style={{ padding: '14px 20px 120px' }}>
        {isMine && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              value={addDraft}
              onChange={(e) => setAddDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addFriend()}
              placeholder="Add a friend by name"
              style={{ flex: 1, minWidth: 0, padding: '12px 14px', borderRadius: 8, border: '1px solid var(--stone)', background: 'var(--paper)', font: '400 15px/1.4 Inter, sans-serif', color: 'var(--ink)' }}
            />
            <button
              onClick={addFriend}
              disabled={!addDraft.trim()}
              style={{ padding: '12px 18px', borderRadius: 8, border: 0, background: addDraft.trim() ? 'var(--coral)' : 'var(--ink-40)', color: '#FFF8F2', font: '600 14px/1 Inter, sans-serif', cursor: 'pointer', opacity: addDraft.trim() ? 1 : 0.4 }}
            >
              Add
            </button>
          </div>
        )}

        {source.length > 0 && (
          <input
            value={state.friendQuery}
            onChange={(e) => dispatch({ type: 'SET_FRIEND_QUERY', query: e.target.value })}
            placeholder="Search friends"
            style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--stone)', background: 'var(--paper)', font: '400 15px/1.4 Inter, sans-serif', color: 'var(--ink)', marginBottom: 8 }}
          />
        )}

        {source.length === 0 ? (
          <EmptyState
            title={isMine ? 'No friends yet' : `No friends to show`}
            body={isMine ? 'Add someone by name above, or accept a request from a friend’s profile.' : `${state.friendsOf.split(' ')[0]} hasn’t added anyone yet.`}
          />
        ) : list.length === 0 ? (
          <div style={{ font: '400 13px/1.5 Inter, sans-serif', color: 'var(--ink-40)', padding: '16px 8px', textAlign: 'center' }}>No one matches “{state.friendQuery}”.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {list.map((f) => (
              <button
                key={f.name}
                onClick={() => dispatch({ type: 'OPEN_PERSON', name: f.name })}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 8px', background: 'transparent', border: 0, borderRadius: 14, cursor: 'pointer', textAlign: 'left', color: 'var(--ink)' }}
              >
                <Avatar token={f.initials} size={40} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', font: '600 15px/1.3 Inter, sans-serif' }}>{f.name}</span>
                  <span style={{ display: 'block', font: '400 12px/1.4 Inter, sans-serif', color: 'var(--ink-40)', marginTop: 2 }}>{f.status}</span>
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
