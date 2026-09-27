import { useStore } from './store';
import * as api from '../lib/api';

// Friend requests: optimistic dispatch, then the server write. On failure the
// server's view is re-fetched so the screen doesn't keep showing a request
// that never happened.
export function useFriendActions() {
  const { state, dispatch, refresh } = useStore();
  const me = state.authUserId;

  function failed(err: unknown) {
    dispatch({ type: 'SHOW_TOAST', message: err instanceof Error && err.message ? err.message : "couldn't reach the server — try again." });
    refresh();
  }

  function sendRequest() {
    const other = state.person?.id;
    if (!me || !other) return;
    dispatch({ type: 'SEND_FRIEND_REQUEST' });
    api.sendFriendRequest(me, other).catch(failed);
  }

  function approve(id: string) {
    if (!me) return;
    dispatch({ type: 'APPROVE_FRIEND_REQUEST', id });
    // Their posts become visible the moment the row is accepted — pull them in.
    api.approveFriendRequest(me, id).then(refresh, failed);
  }

  function decline(id: string) {
    if (!me) return;
    dispatch({ type: 'DECLINE_FRIEND_REQUEST', id });
    api.removeFriendship(me, id).catch(failed);
  }

  return { sendRequest, approve, decline };
}
