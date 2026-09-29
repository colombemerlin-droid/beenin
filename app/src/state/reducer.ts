import { today, plural } from '../data/format';
import { ME_KEY } from '../lib/identity';
import type { AppAction, AppState, SignupPair, GroupMap, StoryDraft, ServerData } from './types';
import type { Entry } from '../types';
import type { EntryFields } from '../lib/api';
import { personFootprint } from './selectors';

function emptyPairDraft(): SignupPair {
  return { id: crypto.randomUUID(), country: '', nationality: [], date: '', name: '', companionId: '', expanded: false, place: '', note: '', emoji: '', photoPath: '' };
}

// Server data replaces local state wholesale; an open person/detail keeps
// pointing at the refreshed copy.
function withServerData(state: AppState, d: ServerData): AppState {
  const person = state.person ? d.friends.find((f) => f.id === state.person!.id) || { ...state.person, requestState: 'none' as const, status: 'not connected yet' } : null;
  return { ...state, entries: d.entries, companions: d.companions, maps: d.maps, friends: d.friends, friendPosts: d.friendPosts, person };
}

export const initialState: AppState = {
  authLoading: true,
  authUserId: null,
  signedIn: false,
  onboardingStep: 'done',
  handleDraft: '',
  handleError: '',
  tab: 'map',
  side: 0,
  dragX: 0,

  profile: { name: '', handle: '' },
  entries: [],
  friendPosts: [],
  friends: [],
  maps: [],
  companions: [],

  signup: null,
  pairDraft: emptyPairDraft(),
  mapBackfillFor: null,

  newMapDraft: null,
  openMapId: null,
  mapRenaming: false,
  mapRenameDraft: '',

  addMapCountry: '',

  story: null,
  companionEdit: null,

  picker: null,
  pickerQuery: '',
  pickerDraft: [],

  overlay: null,
  detailOn: false,
  detailKind: null,
  detailId: null,
  commentDraft: '',

  friendQuery: '',
  personBack: null,
  person: null,

  sheet: null,
  sheetTarget: '',

  toast: '',
  toastToken: 0,

  azOpen: '',
};

function natsOf(nat: string[] | undefined): string[] {
  return nat ? nat.filter(Boolean) : [];
}

function patchEntry(entries: Entry[], id: string, patch: Partial<Entry>): Entry[] {
  return entries.map((e) => (e.id === id ? { ...e, ...patch } : e));
}

// Builds a story draft either fresh (no editId) or pre-filled from an existing entry,
// shared by the "+" button and the three-dot "Edit story" action.
function buildStoryDraft(state: AppState, editId: string): StoryDraft {
  const e = editId ? state.entries.find((x) => x.id === editId) : undefined;
  return {
    editId: e ? e.id : crypto.randomUUID(),
    isEdit: !!e,
    companionId: e?.companionId || '',
    mapId: e?.mapId || '',
    date: e && e.date ? e.date : today(),
    met: !!(e?.metDateNumber || e?.metDateLocation),
    metDateNumber: e?.metDateNumber || '',
    metDateLocation: e?.metDateLocation || '',
    beenIn: !!e?.country,
    country: e?.country || '',
    note: e?.note || '',
    emoji: e?.emoji || '',
    photoPath: e?.photoPath || '',
    pub: e ? !!e.pub : true,
    hideName: e ? !!e.hideName : false,
    personQuery: '',
    newPersonNats: [],
  };
}

// What a published story writes to its entry. Exported so the publish handler
// can send the exact same fields to the server that the reducer applies locally.
export function storyFields(state: AppState, s: StoryDraft): EntryFields {
  const companion = state.companions.find((c) => c.id === s.companionId);
  return {
    companionId: s.companionId,
    mapId: s.mapId || undefined,
    // The companion carries the name; the free-text column is only for legacy entries.
    name: '',
    date: s.date || today(),
    country: s.beenIn ? s.country : '',
    nationality: s.beenIn && companion ? companion.nationalities : [],
    metDateNumber: s.met ? s.metDateNumber : undefined,
    metDateLocation: s.met ? s.metDateLocation : undefined,
    note: s.note || '',
    emoji: s.emoji || '',
    photoPath: s.photoPath,
    pub: s.pub,
    hideName: s.hideName,
    city: '',
    place: '',
    placePub: false,
    stub: false,
  };
}

// The entries a backfill commit creates, one per pair (reusing each pair's id),
// linked to the remembered person each pair was with (`links`: pair id →
// companion id). Exported so the commit handler sends the same rows to the server.
export function signupStubs(state: AppState, links: Record<string, string> = {}): Entry[] {
  if (!state.signup) return [];
  const mapScoped = !!state.mapBackfillFor;
  return state.signup.pairs.map((p, i) => {
    const companionId = mapScoped ? undefined : links[p.id] || p.companionId || undefined;
    return {
    id: p.id,
    companionId,
    country: p.country,
    nationality: mapScoped ? [] : natsOf(p.nationality),
    city: '',
    place: p.expanded ? p.place.trim() : '',
    placePub: false,
    date: p.date || '',
    name: companionId || mapScoped ? '' : p.name.trim(),
    note: p.expanded ? p.note : '',
    emoji: p.expanded ? p.emoji : '',
    photoPath: p.expanded ? p.photoPath : '',
    pub: false,
    stub: !p.expanded,
    ord: 20000 + i,
    when: 'backfilled',
    kudos: [],
    iK: false,
    comments: [],
    };
  });
}

export function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'AUTH_CHECK_DONE':
      // No active session.
      return { ...state, authLoading: false, signedIn: false };

    case 'HYDRATE_SESSION': {
      const step = action.handleSet ? 'done' : 'handle';
      return {
        ...withServerData(state, action),
        authLoading: false,
        signedIn: true,
        authUserId: action.userId,
        profile: { ...state.profile, name: action.displayName, handle: action.handle },
        onboardingStep: step,
        handleDraft: '',
        handleError: '',
      };
    }

    case 'SYNC_FROM_SERVER':
      return withServerData(state, action);

    case 'SIGN_OUT':
      return { ...initialState, authLoading: false };

    case 'PATCH_HANDLE_DRAFT':
      return { ...state, handleDraft: action.value, handleError: '' };

    case 'SET_HANDLE':
      return { ...state, profile: { ...state.profile, handle: action.handle }, onboardingStep: 'done', handleDraft: '', handleError: '' };

    case 'HANDLE_ERROR':
      return { ...state, handleError: action.message };

    case 'START_SIGNUP':
      return { ...state, signup: { pairs: [] }, pairDraft: emptyPairDraft(), mapBackfillFor: null };

    case 'PATCH_PAIR_DRAFT':
      return { ...state, pairDraft: { ...state.pairDraft, ...action.patch } };

    case 'TOGGLE_PAIR_EXPANDED':
      return { ...state, pairDraft: { ...state.pairDraft, expanded: !state.pairDraft.expanded } };

    case 'ADD_PAIR': {
      const d = state.pairDraft;
      const mapScoped = !!(state.newMapDraft || state.mapBackfillFor);
      if (!d.country || (!mapScoped && !d.nationality.length)) return state;
      if (!state.signup) return state;
      return {
        ...state,
        signup: { pairs: [...state.signup.pairs, { ...d }] },
        pairDraft: emptyPairDraft(),
      };
    }

    case 'REMOVE_PAIR': {
      if (!state.signup) return state;
      return { ...state, signup: { pairs: state.signup.pairs.filter((_, i) => i !== action.index) } };
    }

    case 'COMMIT_SIGNUP': {
      if (!state.signup) return state;
      const stubs = signupStubs(state, action.links);
      const base = { ...state, companions: [...state.companions, ...action.newCompanions] };

      if (base.mapBackfillFor) {
        const mapId = base.mapBackfillFor;
        const maps = base.maps.map((m) => (m.id === mapId ? { ...m, entries: [...m.entries, ...stubs] } : m));
        const next = { ...base, maps, signup: null, mapBackfillFor: null, overlay: null };
        return stubs.length ? withToast(next, `${stubs.length} added.`) : next;
      }

      const withStubs = { ...base, entries: [...base.entries, ...stubs], signup: null, tab: 'map' as const, side: 0 as const };
      return stubs.length ? withToast(withStubs, `${stubs.length} on the record without the paperwork. details whenever you like.`) : withStubs;
    }

    case 'SKIP_SIGNUP':
      return { ...state, signup: null, mapBackfillFor: null };

    case 'SET_TAB':
      // A tab switch leaves everything that was open on the old tab behind.
      return { ...state, tab: action.tab, overlay: null, detailOn: false, openMapId: null, mapRenaming: false, sheet: null, companionEdit: null };

    case 'SET_SIDE':
      return { ...state, side: action.side };

    case 'SET_DRAG':
      return { ...state, dragX: action.dragX };

    case 'OPEN_STORY':
      return { ...state, overlay: null, story: buildStoryDraft(state, action.editId || '') };

    case 'PATCH_STORY': {
      if (!state.story) return state;
      return { ...state, story: { ...state.story, ...action.patch } };
    }

    case 'CLOSE_STORY':
      return { ...state, story: null };

    case 'ADD_COMPANION': {
      if (!state.story) return state;
      return {
        ...state,
        companions: [...state.companions, action.companion],
        story: { ...state.story, companionId: action.companion.id, personQuery: '', newPersonNats: [] },
      };
    }

    case 'PUBLISH_STORY': {
      const s = state.story;
      if (!s || !s.companionId) return state;
      const base: Partial<Entry> = storyFields(state, s);
      if (s.isEdit) {
        const next = { ...state, entries: patchEntry(state.entries, s.editId, base), story: null };
        return withToast(next, 'story updated.');
      }
      const entry: Entry = {
        id: s.editId,
        city: '',
        ord: -Date.now(),
        when: 'just now',
        kudos: [],
        iK: false,
        comments: [],
        country: '', nationality: [], date: today(), name: '', note: '', emoji: '', place: '', placePub: false, photoPath: '', pub: true, stub: false,
        ...base,
      };
      const next = { ...state, entries: [entry, ...state.entries], story: null, tab: 'feed' as const, overlay: null };
      return withToast(next, s.pub ? 'story shared to your feed.' : 'story saved — just for you.');
    }

    case 'OPEN_PICKER': {
      let seed: string[] = [];
      if (action.kind === 'signupNat') seed = state.pairDraft.nationality.slice();
      if (action.kind === 'mapNat') {
        // The New map screen edits the draft even if another map is still open underneath.
        const openMap = state.overlay !== 'newMap' && state.openMapId ? state.maps.find((m) => m.id === state.openMapId) : undefined;
        seed = openMap ? openMap.nationalities.slice() : state.newMapDraft?.nationalities.slice() || [];
      }
      if (action.kind === 'companionNat') seed = state.story?.newPersonNats.slice() || [];
      if (action.kind === 'editCompanionNat') seed = state.companionEdit?.nationalities.slice() || [];
      return { ...state, picker: action.kind, pickerQuery: '', pickerDraft: seed };
    }

    case 'SET_PICKER_QUERY':
      return { ...state, pickerQuery: action.query };

    case 'CLOSE_PICKER':
      return { ...state, picker: null, pickerQuery: '', pickerDraft: [] };

    case 'PICK_COUNTRY': {
      if (!state.story) return state;
      return { ...state, story: { ...state.story, country: action.label }, picker: null, pickerQuery: '' };
    }

    case 'TOGGLE_PICKER_DRAFT': {
      const has = state.pickerDraft.includes(action.label);
      const pickerDraft = has ? state.pickerDraft.filter((n) => n !== action.label) : [...state.pickerDraft, action.label];
      return { ...state, pickerDraft };
    }

    case 'SAVE_PICKER': {
      if (state.picker === 'signupNat') {
        return { ...state, pairDraft: { ...state.pairDraft, nationality: state.pickerDraft.slice() }, picker: null, pickerQuery: '', pickerDraft: [] };
      }
      if (state.picker === 'mapNat') {
        if (state.openMapId && state.overlay !== 'newMap') {
          const maps = state.maps.map((m) => (m.id === state.openMapId ? { ...m, nationalities: state.pickerDraft.slice() } : m));
          return { ...state, maps, picker: null, pickerQuery: '', pickerDraft: [] };
        }
        if (state.newMapDraft) {
          return { ...state, newMapDraft: { ...state.newMapDraft, nationalities: state.pickerDraft.slice() }, picker: null, pickerQuery: '', pickerDraft: [] };
        }
      }
      if (state.picker === 'editCompanionNat' && state.companionEdit) {
        return { ...state, companionEdit: { ...state.companionEdit, nationalities: state.pickerDraft.slice() }, picker: null, pickerQuery: '', pickerDraft: [] };
      }
      if (state.picker === 'companionNat' && state.story) {
        return {
          ...state,
          story: { ...state.story, newPersonNats: state.pickerDraft.slice() },
          picker: null,
          pickerQuery: '',
          pickerDraft: [],
        };
      }
      return { ...state, picker: null, pickerQuery: '', pickerDraft: [] };
    }

    case 'PICK_SIGNUP_COUNTRY':
      return { ...state, pairDraft: { ...state.pairDraft, country: action.label }, picker: null, pickerQuery: '' };

    case 'PICK_EMOJI': {
      if (!state.story) return state;
      return { ...state, story: { ...state.story, emoji: action.ch }, picker: null };
    }

    case 'PICK_SIGNUP_EMOJI':
      return { ...state, pairDraft: { ...state.pairDraft, emoji: action.ch }, picker: null };

    case 'TOGGLE_KUDOS': {
      if (action.kind === 'mine') {
        return {
          ...state,
          entries: state.entries.map((e) =>
            e.id !== action.id ? e : { ...e, iK: !e.iK, kudos: e.iK ? e.kudos.filter((k) => k !== ME_KEY) : [...e.kudos, ME_KEY] }
          ),
        };
      }
      return {
        ...state,
        friendPosts: state.friendPosts.map((p) =>
          p.id !== action.id ? p : { ...p, iK: !p.iK, kudos: p.iK ? p.kudos.filter((k) => k !== ME_KEY) : [...p.kudos, ME_KEY] }
        ),
      };
    }

    case 'SET_COMMENT_DRAFT':
      return { ...state, commentDraft: action.text };

    case 'SUBMIT_COMMENT': {
      const text = state.commentDraft.trim();
      if (!text || !state.detailId) return state;
      const comment = { who: state.profile.name.trim() || 'You', initials: ME_KEY, text, when: 'now' };
      if (state.detailKind === 'feed') {
        return {
          ...state,
          friendPosts: state.friendPosts.map((p) => (p.id !== state.detailId ? p : { ...p, comments: [...p.comments, comment] })),
          commentDraft: '',
        };
      }
      return {
        ...state,
        entries: state.entries.map((e) => (e.id !== state.detailId ? e : { ...e, comments: [...e.comments, comment] })),
        commentDraft: '',
      };
    }

    case 'OPEN_DETAIL':
      return { ...state, detailOn: true, detailKind: action.kind, detailId: action.id, commentDraft: '' };

    case 'CLOSE_DETAIL':
      return { ...state, detailOn: false };

    case 'OPEN_FRIENDS':
      return { ...state, overlay: 'friends', friendQuery: '' };

    case 'SET_FRIEND_QUERY':
      return { ...state, friendQuery: action.query };

    case 'OPEN_PERSON': {
      // Prefer the friends-list copy (it has the current request state).
      const f = state.friends.find((x) => x.id === action.person.id) || action.person;
      return { ...state, person: f, personBack: state.overlay, overlay: 'person' };
    }

    case 'BACK_FROM_PERSON':
      return { ...state, overlay: state.personBack === 'friends' || state.personBack === 'friendRequests' ? state.personBack : null };

    case 'SEND_FRIEND_REQUEST': {
      if (!state.person) return state;
      const p = { ...state.person, requestState: 'pending_out' as const, status: 'request sent', requestedAt: Date.now() };
      const exists = state.friends.some((f) => f.id === p.id);
      const friends = exists ? state.friends.map((f) => (f.id === p.id ? p : f)) : [...state.friends, p];
      return withToast({ ...state, friends, person: p }, `request sent to ${p.name.split(' ')[0]}.`);
    }

    case 'APPROVE_FRIEND_REQUEST': {
      const f = state.friends.find((x) => x.id === action.id);
      const accept = <T extends { id: string }>(x: T) => (x.id === action.id ? { ...x, requestState: 'accepted' as const, status: 'friends since today' } : x);
      const next = { ...state, friends: state.friends.map(accept), person: state.person ? accept(state.person) : null };
      return withToast(next, f ? `you and ${f.name.split(' ')[0]} are friends now.` : 'friends now.');
    }

    case 'DECLINE_FRIEND_REQUEST': {
      const friends = state.friends.filter((f) => f.id !== action.id);
      const person = state.person && state.person.id === action.id ? { ...state.person, requestState: 'none' as const, status: 'not connected yet' } : state.person;
      return withToast({ ...state, friends, person }, 'request declined.');
    }

    case 'SET_PROFILE_NAME': {
      return { ...state, profile: { ...state.profile, name: action.name } };
    }

    case 'OPEN_HISTORY':
      return { ...state, overlay: 'history' };

    case 'OPEN_NAMES':
      return { ...state, overlay: 'names' };

    case 'OPEN_COMPANION_MENU': {
      const name = state.companions.find((x) => x.id === action.id)?.name || state.maps.find((x) => x.id === action.id)?.name;
      if (!name) return state;
      return {
        ...state,
        sheet: {
          title: name,
          actions: [
            { label: 'Edit', kind: 'editCompanion' },
            { label: 'Delete', color: '#B23B2A', kind: 'deleteCompanion' },
          ],
        },
        sheetTarget: action.id,
      };
    }

    case 'PATCH_COMPANION_EDIT':
      return state.companionEdit ? { ...state, companionEdit: { ...state.companionEdit, ...action.patch } } : state;

    case 'CLOSE_COMPANION_EDIT':
      return { ...state, companionEdit: null };

    case 'UPDATE_MAP': {
      const maps = state.maps.map((m) => (m.id === action.id ? { ...m, name: action.name, nationalities: action.nationalities } : m));
      return withToast({ ...state, maps, companionEdit: null }, 'saved.');
    }

    case 'REPEAT_PAIR_PERSON': {
      const last = state.signup?.pairs[state.signup.pairs.length - 1];
      if (!last) return state;
      return { ...state, pairDraft: { ...emptyPairDraft(), name: last.name, companionId: last.companionId, nationality: last.nationality.slice() } };
    }

    case 'UPDATE_COMPANION': {
      const c = action.companion;
      // A story's passport stamps follow the person's passports (mirrors the
      // server trigger); entries that logged no passport stay that way.
      const entries = state.entries.map((e) => (e.companionId === c.id && e.nationality.length ? { ...e, nationality: c.nationalities } : e));
      const companions = state.companions.map((x) => (x.id === c.id ? c : x));
      return withToast({ ...state, companions, entries, companionEdit: null }, 'saved.');
    }

    case 'OPEN_FRIEND_REQUESTS':
      return { ...state, overlay: 'friendRequests' };

    case 'CLOSE_OVERLAY':
      return { ...state, overlay: null, sheet: null, addMapCountry: '', companionEdit: null };

    case 'OPEN_MINE_MENU': {
      const e = state.entries.find((x) => x.id === action.id);
      if (!e) return state;
      const companion = e.companionId ? state.companions.find((c) => c.id === e.companionId) : undefined;
      const titleSubject = e.country || e.nationality.join(' · ') || companion?.name || e.name || 'Story';
      return {
        ...state,
        sheet: {
          title: `${titleSubject} · ${e.when}`,
          actions: [
            { label: e.stub ? 'Add details' : 'Edit story', kind: 'edit' },
            { label: e.pub ? 'Make it private' : 'Share to your wall', kind: 'vis' },
            { label: 'Add to a map', kind: 'addmap' },
            { label: 'Erase from the record?', color: '#B23B2A', kind: 'del' },
          ],
        },
        sheetTarget: e.id,
      };
    }

    case 'OPEN_FEED_MENU': {
      const p = state.friendPosts.find((x) => x.id === action.id);
      if (!p) return state;
      return {
        ...state,
        sheet: {
          title: `${p.who}’s post`,
          actions: [
            { label: 'Add to a map', kind: 'addmap' },
            { label: 'Report this post', color: '#B23B2A', kind: 'report' },
          ],
        },
        sheetTarget: p.id,
      };
    }

    case 'OPEN_FRIEND_MENU': {
      const f = state.friends.find((x) => x.id === action.id);
      if (!f) return state;
      const pending = f.requestState === 'pending_out';
      return {
        ...state,
        sheet: {
          title: pending ? `Request to ${f.name}` : `${f.name} · @${f.handle}`,
          actions: [{ label: pending ? 'Cancel request' : 'Remove friend', color: '#B23B2A', kind: 'unfriend' }],
        },
        sheetTarget: f.id,
      };
    }

    case 'OPEN_MAP_MENU': {
      const m = state.maps.find((x) => x.id === action.mapId);
      if (!m) return state;
      return {
        ...state,
        sheet: {
          title: m.name,
          actions: [
            { label: 'Rename this map', kind: 'mapRename' },
            { label: 'Edit their passports', kind: 'mapNats' },
            { label: 'Backfill countries', kind: 'mapBackfill' },
          ],
        },
        sheetTarget: m.id,
      };
    }

    case 'PICK_SHEET': {
      const id = state.sheetTarget;
      const cleared = { ...state, sheet: null };
      if (action.kind === 'report') return withToast(cleared, 'reported. we’ll take it from here — quietly.');
      if (action.kind === 'editCompanion') {
        const c = cleared.companions.find((x) => x.id === id);
        if (c) return { ...cleared, companionEdit: { kind: 'companion', id: c.id, name: c.name, nationalities: c.nationalities.slice() } };
        const m = cleared.maps.find((x) => x.id === id);
        if (m) return { ...cleared, companionEdit: { kind: 'map', id: m.id, name: m.name, nationalities: m.nationalities.slice() } };
        return cleared;
      }
      if (action.kind === 'deleteCompanion') {
        const f = personFootprint(cleared, id);
        if (!f) return cleared;
        const n = f.entryIds.length;
        // "Marco and 1 story" / "Marco, 2 stories and their map"
        const items = [f.name, n ? plural(n, 'story', 'stories') : '', f.mapId ? 'their map' : ''].filter(Boolean);
        const what = items.length < 3 ? items.join(' and ') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
        return {
          ...cleared,
          sheet: {
            title: `Delete ${what}? Countries only logged through them come off your map. This can’t be undone.`,
            actions: [{ label: `Delete ${f.name}`, color: '#B23B2A', kind: 'confirmDeleteCompanion' }],
          },
          sheetTarget: id,
        };
      }
      if (action.kind === 'confirmDeleteCompanion') {
        const f = personFootprint(cleared, id);
        if (!f) return cleared;
        const gone = new Set(f.entryIds);
        const entries = cleared.entries
          .filter((e) => !gone.has(e.id))
          // Other people's stories that linked to the deleted map just lose the link.
          .map((e) => (f.mapId && e.mapId === f.mapId ? { ...e, mapId: undefined } : e));
        const next = {
          ...cleared,
          entries,
          companions: cleared.companions.filter((c) => c.id !== f.companionId),
          maps: cleared.maps.filter((m) => m.id !== f.mapId),
          openMapId: cleared.openMapId === f.mapId ? null : cleared.openMapId,
          detailOn: cleared.detailOn && !gone.has(cleared.detailId || ''),
        };
        return withToast(next, `deleted ${f.name}.`);
      }
      if (action.kind === 'unfriend') {
        // Friendship is one shared link: removing it unlinks both sides at once.
        // Their posts leave your feed (and yours leave theirs); reconnecting
        // takes a fresh request and accept.
        const f = cleared.friends.find((x) => x.id === id);
        const person = cleared.person && cleared.person.id === id ? { ...cleared.person, requestState: 'none' as const, status: 'not connected yet' } : cleared.person;
        const next = { ...cleared, friends: cleared.friends.filter((x) => x.id !== id), friendPosts: cleared.friendPosts.filter((p) => p.ownerId !== id), person };
        if (f?.requestState === 'pending_out') return withToast(next, 'request cancelled.');
        return withToast(next, f ? `removed ${f.name.split(' ')[0]}. you can always send a new request.` : 'removed.');
      }
      if (action.kind === 'edit') {
        return { ...cleared, overlay: null, story: buildStoryDraft(cleared, id) };
      }
      if (action.kind === 'vis') {
        let nowPub = false;
        const entries = cleared.entries.map((e) => {
          if (e.id !== id) return e;
          nowPub = !e.pub;
          return { ...e, pub: !e.pub };
        });
        return withToast({ ...cleared, entries }, nowPub ? 'now on your feed and your friends’.' : 'back to private. just for you.');
      }
      if (action.kind === 'del') {
        return withToast({ ...cleared, entries: cleared.entries.filter((e) => e.id !== id) }, 'erased. the map forgets too.');
      }
      if (action.kind === 'addmap') {
        const mine = cleared.entries.find((e) => e.id === id);
        const feed = cleared.friendPosts.find((p) => p.id === id);
        const country = mine?.country || feed?.country || '';
        if (!country) return cleared;
        return { ...cleared, overlay: 'mapPicker', addMapCountry: country };
      }
      if (action.kind === 'mapRename') {
        const m = cleared.maps.find((x) => x.id === id);
        if (!m) return cleared;
        return { ...cleared, mapRenaming: true, mapRenameDraft: m.name };
      }
      if (action.kind === 'mapNats') {
        const m = cleared.maps.find((x) => x.id === id);
        return { ...cleared, openMapId: id, picker: 'mapNat', pickerQuery: '', pickerDraft: m ? m.nationalities.slice() : [] };
      }
      if (action.kind === 'mapBackfill') {
        return { ...cleared, mapBackfillFor: id, signup: { pairs: [] }, pairDraft: emptyPairDraft() };
      }
      return cleared;
    }

    case 'CLOSE_SHEET':
      return { ...state, sheet: null };

    case 'TOGGLE_AZ':
      return { ...state, azOpen: state.azOpen === action.country ? '' : action.country };

    case 'SHOW_TOAST':
      return withToast(state, action.message);

    case 'CLEAR_TOAST':
      return state.toastToken === action.token ? { ...state, toast: '' } : state;

    case 'OPEN_NEW_MAP':
      return {
        ...state,
        overlay: 'newMap',
        newMapDraft: { id: crypto.randomUUID(), name: '', nationalities: [] },
      };

    case 'PATCH_NEW_MAP': {
      if (!state.newMapDraft) return state;
      return { ...state, newMapDraft: { ...state.newMapDraft, ...action.patch } };
    }

    case 'CREATE_MAP': {
      const d = state.newMapDraft;
      if (!d) return state;
      const map: GroupMap = { id: d.id, name: d.name.trim() || 'Untitled map', nationalities: d.nationalities, entries: action.entries };
      const next = { ...state, maps: [...state.maps, map], newMapDraft: null, addMapCountry: '', overlay: null, openMapId: map.id, tab: 'map' as const, detailOn: false };
      return withToast(next, `${map.name} is live.`);
    }

    case 'ADD_MAP_COUNTRIES': {
      if (!action.entries.length) return state;
      const maps = state.maps.map((m) => (m.id === action.mapId ? { ...m, entries: [...action.entries, ...m.entries] } : m));
      const n = action.entries.length;
      return withToast({ ...state, maps }, n === 1 ? `added ${action.entries[0].country}.` : `added ${n} countries.`);
    }

    case 'CANCEL_NEW_MAP':
      return { ...state, overlay: null, newMapDraft: null, addMapCountry: '' };

    case 'OPEN_MAP':
      return { ...state, openMapId: action.mapId, overlay: null };

    case 'CLOSE_MAP':
      return { ...state, openMapId: null, mapRenaming: false };

    case 'PATCH_MAP_RENAME':
      return { ...state, mapRenameDraft: action.name };

    case 'SAVE_MAP_RENAME': {
      if (!state.openMapId) return { ...state, mapRenaming: false };
      const name = state.mapRenameDraft.trim();
      if (!name) return { ...state, mapRenaming: false };
      const maps = state.maps.map((m) => (m.id === state.openMapId ? { ...m, name } : m));
      return { ...state, maps, mapRenaming: false };
    }

    case 'ADD_ENTRY_TO_MAP': {
      const country = state.addMapCountry;
      if (!country) return state;
      const entry = mapQuickEntry(action.id, country);
      const maps = state.maps.map((m) => (m.id === action.mapId ? { ...m, entries: [entry, ...m.entries] } : m));
      const map = maps.find((m) => m.id === action.mapId);
      const next = { ...state, maps, overlay: null, addMapCountry: '' };
      return withToast(next, map ? `added ${country} to ${map.name}.` : 'added.');
    }

    default:
      return state;
  }
}

// A bare "we've been here" country on a group map ("Add to a map", or the map's
// own "Add countries", which passes no date).
// Exported so the caller sends the same row to the server.
export function mapQuickEntry(id: string, country: string, date = today()): Entry {
  return {
    id,
    country,
    nationality: [],
    city: '',
    date,
    name: '',
    note: '',
    emoji: '',
    place: '',
    placePub: false,
    photoPath: '',
    pub: false,
    stub: true,
    ord: -Date.now(),
    when: 'just now',
    kudos: [],
    iK: false,
    comments: [],
  };
}

function withToast(state: AppState, message: string): AppState {
  return { ...state, toast: message, toastToken: state.toastToken + 1 };
}
