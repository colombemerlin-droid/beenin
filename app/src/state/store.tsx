import { createContext, useCallback, useContext, useEffect, useReducer, useRef, type ReactNode } from 'react';
import { reducer, initialState } from './reducer';
import { supabase } from '../lib/supabase';
import * as api from '../lib/api';
import { demoAccount, demoData, demoStep } from '../dev/demo';
import type { AppAction, AppState } from './types';

interface StoreContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  // Re-fetch everything from the server (e.g. after accepting a friend, whose
  // posts should now appear). Skipped while a write is in flight.
  refresh: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

// Pre-backend builds kept everything in localStorage under this key. It's only
// read once now, to upload that data on the first sign-in, then deleted.
const LEGACY_STORAGE_KEY = 'been-in:v1';

function readLegacyData(): api.LocalData | null {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<api.LocalData> | null;
    if (!parsed || typeof parsed !== 'object') return null;
    const data = { entries: parsed.entries || [], companions: parsed.companions || [], maps: parsed.maps || [] };
    return data.entries.length || data.companions.length || data.maps.length ? data : null;
  } catch {
    return null;
  }
}

function clearLegacyData() {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Storage unavailable — nothing to clear.
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const hydratedFor = useRef<string | null>(null);
  const nameRef = useRef('');
  useEffect(() => {
    nameRef.current = state.profile.name;
  }, [state.profile.name]);

  useEffect(() => {
    if (!state.toast) return;
    const token = state.toastToken;
    const t = setTimeout(() => dispatch({ type: 'CLEAR_TOAST', token }), 2800);
    return () => clearTimeout(t);
  }, [state.toastToken, state.toast]);

  // Real auth: INITIAL_SESSION covers boot (including the redirect back from
  // Google/email-link), SIGNED_IN a fresh sign-in, SIGNED_OUT the reverse.
  // Supabase re-fires SIGNED_IN/TOKEN_REFRESHED during a session (refresh,
  // tab refocus) — hydrating is guarded to once per user so that never wipes
  // in-progress state like onboarding.
  useEffect(() => {
    let cancelled = false;

    // Dev-only demo account (see src/dev/demo.ts) — no auth, no server.
    const demo = import.meta.env.DEV ? demoStep() : null;
    if (import.meta.env.DEV && demo) {
      dispatch({
        type: 'HYDRATE_SESSION',
        userId: demoAccount.userId,
        displayName: demoAccount.displayName,
        handle: demoAccount.handle,
        handleSet: demo !== 'handle',
        onboarded: demo === 'done',
        ...demoData(),
      });
      return;
    }

    async function hydrateFromSession(userId: string) {
      if (hydratedFor.current === userId) return;
      hydratedFor.current = userId;
      try {
        const profile = await api.fetchMyProfile(userId);
        let data = await api.loadAccount(userId, profile.displayName);

        const legacy = readLegacyData();
        if (legacy) {
          const people = !data.entries.length && !data.companions.length && (legacy.entries.length > 0 || legacy.companions.length > 0);
          const maps = !data.maps.length && legacy.maps.length > 0;
          if (people || maps) {
            try {
              await api.migrateLocalData(userId, legacy, { people, maps, serverMapIds: data.maps.map((m) => m.id) });
              data = await api.loadAccount(userId, profile.displayName);
              dispatch({ type: 'SHOW_TOAST', message: 'moved what you logged on this device onto your account.' });
              clearLegacyData();
            } catch {
              dispatch({ type: 'SHOW_TOAST', message: "couldn't move this device's entries to your account yet — will retry next time." });
            }
          } else {
            // The account already has its own data — this device's copy is stale.
            clearLegacyData();
          }
        }

        if (cancelled) return;
        dispatch({
          type: 'HYDRATE_SESSION',
          userId,
          displayName: profile.displayName,
          handle: profile.handle,
          handleSet: profile.handleSet,
          onboarded: profile.onboarded,
          ...data,
        });
      } catch {
        if (cancelled) return;
        hydratedFor.current = null;
        dispatch({ type: 'SHOW_TOAST', message: "couldn't load your account — try reloading." });
        dispatch({ type: 'AUTH_CHECK_DONE' });
      }
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // Supabase warns against awaiting its own calls inside this callback
      // (it can deadlock the auth lock) — defer the work a tick.
      setTimeout(() => {
        if (cancelled) return;
        if (event === 'SIGNED_OUT') {
          hydratedFor.current = null;
          // Never let this device's pre-backend data reach whoever signs in next.
          clearLegacyData();
          dispatch({ type: 'SIGN_OUT' });
        } else if (event === 'INITIAL_SESSION' && !session) {
          dispatch({ type: 'AUTH_CHECK_DONE' });
        } else if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && session) {
          hydrateFromSession(session.user.id);
        }
      }, 0);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Pull fresh server data — new friend requests, friends' posts, kudos and
  // comments from others. A result is discarded if any write started or is
  // still running meanwhile, so it can never undo an optimistic change.
  const refresh = useCallback(() => {
    const userId = hydratedFor.current;
    const before = api.writeState();
    if (!userId || !before.idle || (import.meta.env.DEV && demoStep())) return;
    api
      .loadAccount(userId, nameRef.current)
      .then((data) => {
        const after = api.writeState();
        if (hydratedFor.current !== userId || after.epoch !== before.epoch || !after.idle) return;
        dispatch({ type: 'SYNC_FROM_SERVER', ...data });
      })
      .catch(() => {});
  }, []);

  // Refresh when switching to a tab that shows other people's activity, and
  // when the app comes back to the foreground (e.g. reopened on a phone).
  useEffect(() => {
    if (state.signedIn && (state.tab === 'feed' || state.tab === 'notifications')) refresh();
  }, [state.tab, state.signedIn, refresh]);

  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);


  return <StoreContext.Provider value={{ state, dispatch, refresh }}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
