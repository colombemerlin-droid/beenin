import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react';
import { reducer, initialState } from './reducer';
import type { AppAction, AppState } from './types';

interface StoreContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

const STORAGE_KEY = 'been-in:v1';

type PersistedState = Pick<AppState, 'signedIn' | 'profile' | 'entries' | 'friendPosts' | 'friends'>;

function loadPersisted(): Partial<PersistedState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    // Storage unavailable (private browsing, quota, etc.) — carry on without persistence.
    return {};
  }
}

function savePersisted(state: AppState) {
  const subset: PersistedState = {
    signedIn: state.signedIn,
    profile: state.profile,
    entries: state.entries,
    friendPosts: state.friendPosts,
    friends: state.friends,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(subset));
  } catch {
    // Ignore — nothing useful to do if storage is unavailable or full.
  }
}

function init(base: AppState): AppState {
  return { ...base, ...loadPersisted() };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState, init);

  useEffect(() => {
    if (!state.toast) return;
    const token = state.toastToken;
    const t = setTimeout(() => dispatch({ type: 'CLEAR_TOAST', token }), 2800);
    return () => clearTimeout(t);
  }, [state.toastToken, state.toast]);

  useEffect(() => {
    savePersisted(state);
  }, [state.signedIn, state.profile, state.entries, state.friendPosts, state.friends]);

  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
