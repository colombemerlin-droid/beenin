import { useStore } from './store';
import * as api from '../lib/api';

// Kudos/comment actions on the viewer's own entries: optimistic dispatch,
// then the matching server write. Friend posts are still local mock data,
// so those only dispatch.
export function useEntryActions() {
  const { state, dispatch } = useStore();
  const userId = state.authUserId;
  const fail = () => dispatch({ type: 'SHOW_TOAST', message: "couldn't sync that to your account." });

  function toggleKudos(kind: 'mine' | 'feed', id: string) {
    const entry = kind === 'mine' ? state.entries.find((e) => e.id === id) : undefined;
    dispatch({ type: 'TOGGLE_KUDOS', kind, id });
    if (!entry || !userId) return;
    (entry.iK ? api.removeKudos(id, userId) : api.addKudos(id, userId)).catch(fail);
  }

  function submitComment() {
    const text = state.commentDraft.trim();
    const entryId = state.detailKind === 'mine' ? state.detailId : null;
    dispatch({ type: 'SUBMIT_COMMENT' });
    if (!text || !entryId || !userId) return;
    api.addComment(entryId, userId, text).catch(fail);
  }

  return { toggleKudos, submitComment };
}
