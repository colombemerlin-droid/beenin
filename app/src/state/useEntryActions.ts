import { useStore } from './store';
import * as api from '../lib/api';

// Kudos/comment actions on any post the viewer can see — their own entries
// and friends' posts alike: optimistic dispatch, then the server write. The
// server's visibility rules show them to everyone who can see the post (the
// poster and the poster's friends).
export function useEntryActions() {
  const { state, dispatch, refresh } = useStore();
  const userId = state.authUserId;

  // A failed write means the screen is showing something that isn't saved —
  // say so, and pull the server's version back in.
  const fail = () => {
    dispatch({ type: 'SHOW_TOAST', message: "couldn't save that — try again." });
    refresh();
  };

  function toggleKudos(kind: 'mine' | 'feed', id: string) {
    const post = kind === 'mine' ? state.entries.find((e) => e.id === id) : state.friendPosts.find((p) => p.id === id);
    dispatch({ type: 'TOGGLE_KUDOS', kind, id });
    if (!post || !userId) return;
    (post.iK ? api.removeKudos(id, userId) : api.addKudos(id, userId)).catch(fail);
  }

  function submitComment() {
    const text = state.commentDraft.trim();
    const entryId = state.detailId;
    dispatch({ type: 'SUBMIT_COMMENT' });
    if (!text || !entryId || !userId) return;
    api.addComment(entryId, userId, text).catch(fail);
  }

  return { toggleKudos, submitComment };
}
