import { useEffect, useState } from 'react';
import { useStore } from '../../state/store';
import * as api from '../../lib/api';
import { OverlayHeader } from '../../ui/OverlayHeader';
import { Avatar } from '../../ui/Avatar';
import { EmptyState } from '../../ui/EmptyState';
import { ChevronRightIcon, DotsIcon } from '../../ui/icons';
import { ShareHandle } from '../../ui/ShareHandle';
import type { Friend } from '../../types';

export function FriendsOverlay() {
  const { state, dispatch } = useStore();
  const [search, setSearch] = useState('');
  // Results are tagged with the query they answer, so stale ones never show.
  const [found, setFound] = useState<{ q: string; list: Friend[] } | null>(null);
  const open = state.overlay === 'friends';
  const me = state.authUserId;
  const query = search.trim().toLowerCase().replace(/^@/, '');
  const searchable = query.length >= 2;

  // Debounced handle search.
  useEffect(() => {
    if (!open || !me || !searchable) return;
    let live = true;
    const t = setTimeout(() => {
      api
        .searchProfiles(me, query)
        .then((list) => live && setFound({ q: query, list }))
        .catch(() => live && setFound({ q: query, list: [] }));
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [query, searchable, open, me]);

  if (!open) return null;

  const results = found && found.q === query ? found.list : [];
  const searching = searchable && (!found || found.q !== query);

  const q = state.friendQuery.toLowerCase();
  const mine = state.friends.filter((f) => f.requestState === 'accepted');
  const list = mine.filter((f) => f.name.toLowerCase().includes(q) || f.handle.includes(q));
  const requested = state.friends.filter((f) => f.requestState === 'pending_out');
  // A search hit that's already on your list shows its current state.
  const hits = results.map((r) => state.friends.find((f) => f.id === r.id) || r);

  return (
    <div className="noscroll" style={{ position: 'absolute', inset: 0, background: 'var(--cream-lighter)', zIndex: 40, overflowY: 'auto' }}>
      <OverlayHeader title="Your friends" onBack={() => dispatch({ type: 'CLOSE_OVERLAY' })} />
      <div style={{ padding: '14px 20px 120px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 18 }}>
          <span style={{ font: '400 13px/1.45 Inter, sans-serif', color: 'var(--ink-body)' }}>Your handle — send it so friends can add you</span>
          <ShareHandle />
        </div>
        <div className="label" style={{ marginBottom: 8 }}>
          Add a friend
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="search by @handle"
          autoCapitalize="none"
          autoCorrect="off"
          style={inputStyle}
        />
        {searchable && (
          <div style={{ marginTop: 6, marginBottom: 14 }}>
            {searching && hits.length === 0 ? (
              <div style={hintStyle}>searching…</div>
            ) : hits.length === 0 ? (
              <div style={hintStyle}>No one with that handle.</div>
            ) : (
              hits.map((f) => <PersonRow key={f.id} f={f} sub={`@${f.handle}${f.requestState === 'none' ? '' : ` · ${f.status}`}`} />)
            )}
          </div>
        )}

        {requested.length > 0 && (
          <>
            <div className="label" style={{ margin: '18px 0 4px' }}>
              Requested
            </div>
            {requested.map((f) => (
              <PersonRow key={f.id} f={f} sub="waiting for them to accept" menu />
            ))}
          </>
        )}

        <div className="label" style={{ margin: '18px 0 8px' }}>
          Friends · {mine.length}
        </div>
        {mine.length > 3 && (
          <input
            value={state.friendQuery}
            onChange={(e) => dispatch({ type: 'SET_FRIEND_QUERY', query: e.target.value })}
            placeholder="filter your friends"
            style={{ ...inputStyle, marginBottom: 8 }}
          />
        )}
        {mine.length === 0 ? (
          <EmptyState title="No friends yet" body="Find someone by their @handle above — they'll get a request to accept." />
        ) : list.length === 0 ? (
          <div style={{ ...hintStyle, textAlign: 'center' }}>No one matches “{state.friendQuery}”.</div>
        ) : (
          list.map((f) => <PersonRow key={f.id} f={f} sub={f.status} menu />)
        )}
      </div>
    </div>
  );
}

// `menu` adds a ⋯ button (remove a friend / cancel a request) beside the row.
function PersonRow({ f, sub, menu = false }: { f: Friend; sub: string; menu?: boolean }) {
  const { dispatch } = useStore();
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <button
        onClick={() => dispatch({ type: 'OPEN_PERSON', person: f })}
        style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 8px', background: 'transparent', border: 0, borderRadius: 14, cursor: 'pointer', textAlign: 'left', color: 'var(--ink)' }}
      >
        <Avatar token={f.initials} size={40} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', font: '600 15px/1.3 Inter, sans-serif' }}>{f.name}</span>
          <span style={{ display: 'block', font: '400 12px/1.4 Inter, sans-serif', color: 'var(--ink-40)', marginTop: 2 }}>{sub}</span>
        </span>
        {!menu && <ChevronRightIcon size={18} color="#A39A92" />}
      </button>
      {menu && (
        <button
          onClick={() => dispatch({ type: 'OPEN_FRIEND_MENU', id: f.id })}
          aria-label={`Options for ${f.name}`}
          style={{ width: 40, height: 40, flex: 'none', background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--ink-40)', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <DotsIcon />
        </button>
      )}
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 8,
  border: '1px solid var(--stone)',
  background: 'var(--paper)',
  font: '400 15px/1.4 Inter, sans-serif',
  color: 'var(--ink)',
} as const;

const hintStyle = { font: '400 13px/1.5 Inter, sans-serif', color: 'var(--ink-40)', padding: '10px 8px' } as const;
