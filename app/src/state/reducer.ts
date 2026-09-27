import { today } from '../data/format';
import { ME_KEY, initialsOf } from '../lib/identity';
import type { AppAction, AppState, SignupPair, GroupMap, StoryDraft } from './types';
import type { Entry, Friend, Companion } from '../types';

function emptyPairDraft(): SignupPair {
  return { country: '', nationality: [], date: '', name: '', expanded: false, place: '', note: '', emoji: '', photo: false };
}

export const initialState: AppState = {
  signedIn: false,
  tab: 'map',
  side: 0,
  dragX: 0,

  profile: { name: '' },
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

  picker: null,
  pickerQuery: '',
  pickerDraft: [],

  overlay: null,
  detailOn: false,
  detailKind: null,
  detailId: null,
  commentDraft: '',

  friendQuery: '',
  friendsOf: '',
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
    editId: editId || '',
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
    photo: e ? !!e.photo : false,
    pub: e ? !!e.pub : true,
    hideName: e ? !!e.hideName : false,
    newCompanion: null,
  };
}

export function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SIGN_IN':
      return { ...state, signedIn: true, signup: { pairs: [] } };

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
      const mapScoped = !!(state.newMapDraft || state.mapBackfillFor);
      const stubs: Entry[] = state.signup.pairs.map((p, i) => ({
        id: 'sp' + i + Date.now(),
        country: p.country,
        nationality: mapScoped ? [] : natsOf(p.nationality),
        city: '',
        place: p.expanded ? p.place.trim() : '',
        placePub: false,
        date: p.date || '',
        name: p.expanded ? '' : p.name || '',
        note: p.expanded ? p.note : '',
        emoji: p.expanded ? p.emoji : '',
        photo: p.expanded ? p.photo : false,
        pub: false,
        stub: !p.expanded,
        ord: 20000 + i,
        when: 'backfilled',
        kudos: [],
        iK: false,
        comments: [],
      }));

      if (state.newMapDraft) {
        const map: GroupMap = {
          id: 'gm' + Date.now(),
          name: state.newMapDraft.name.trim() || 'Untitled map',
          nationalities: state.newMapDraft.nationalities,
          entries: stubs,
        };
        const next = { ...state, maps: [...state.maps, map], signup: null, newMapDraft: null, mapBackfillFor: null, openMapId: map.id, overlay: null };
        return withToast(next, `${map.name} is live. ${stubs.length} on the record.`);
      }

      if (state.mapBackfillFor) {
        const mapId = state.mapBackfillFor;
        const maps = state.maps.map((m) => (m.id === mapId ? { ...m, entries: [...m.entries, ...stubs] } : m));
        const next = { ...state, maps, signup: null, mapBackfillFor: null, overlay: null };
        return stubs.length ? withToast(next, `${stubs.length} added.`) : next;
      }

      const withStubs = { ...state, entries: [...state.entries, ...stubs], signup: null, tab: 'map' as const, side: 0 as const };
      return stubs.length ? withToast(withStubs, `${stubs.length} on the record without the paperwork. details whenever you like.`) : withStubs;
    }

    case 'SKIP_SIGNUP': {
      if (state.newMapDraft) {
        const map: GroupMap = { id: 'gm' + Date.now(), name: state.newMapDraft.name.trim() || 'Untitled map', nationalities: state.newMapDraft.nationalities, entries: [] };
        return { ...state, maps: [...state.maps, map], signup: null, newMapDraft: null, openMapId: map.id, overlay: null };
      }
      return { ...state, signup: null, mapBackfillFor: null };
    }

    case 'SET_TAB':
      return { ...state, tab: action.tab, overlay: null };

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

    case 'OPEN_NEW_COMPANION': {
      if (!state.story) return state;
      return { ...state, story: { ...state.story, newCompanion: { name: '', nationalities: [] } } };
    }

    case 'PATCH_NEW_COMPANION': {
      if (!state.story?.newCompanion) return state;
      return { ...state, story: { ...state.story, newCompanion: { ...state.story.newCompanion, ...action.patch } } };
    }

    case 'CANCEL_NEW_COMPANION': {
      if (!state.story) return state;
      return { ...state, story: { ...state.story, newCompanion: null } };
    }

    case 'SAVE_NEW_COMPANION': {
      if (!state.story?.newCompanion) return state;
      const name = state.story.newCompanion.name.trim();
      if (!name) return state;
      const companion: Companion = { id: 'c' + Date.now(), name, initials: initialsOf(name) || '??', nationalities: state.story.newCompanion.nationalities };
      return { ...state, companions: [...state.companions, companion], story: { ...state.story, companionId: companion.id, newCompanion: null } };
    }

    case 'PUBLISH_STORY': {
      const s = state.story;
      if (!s || !s.companionId) return state;
      const companion = state.companions.find((c) => c.id === s.companionId);
      const base: Partial<Entry> = {
        companionId: s.companionId,
        name: companion?.name || '',
        mapId: s.mapId || undefined,
        date: s.date || today(),
        country: s.beenIn ? s.country : '',
        nationality: s.beenIn && companion ? companion.nationalities : [],
        metDateNumber: s.met ? s.metDateNumber : undefined,
        metDateLocation: s.met ? s.metDateLocation : undefined,
        note: s.note || '',
        emoji: s.emoji || '',
        photo: s.photo,
        pub: s.pub,
        hideName: s.hideName,
        place: '',
        placePub: false,
        stub: false,
      };
      if (s.editId) {
        const next = { ...state, entries: patchEntry(state.entries, s.editId, base), story: null };
        return withToast(next, 'story updated.');
      }
      const entry: Entry = {
        id: 'e' + Date.now(),
        city: '',
        ord: -1,
        when: 'just now',
        kudos: [],
        iK: false,
        comments: [],
        country: '', nationality: [], date: today(), name: '', note: '', emoji: '', place: '', placePub: false, photo: false, pub: true, stub: false,
        ...base,
      };
      const next = { ...state, entries: [entry, ...state.entries], story: null, tab: 'feed' as const, overlay: null };
      return withToast(next, s.pub ? 'story shared to your feed.' : 'story saved — just for you.');
    }

    case 'OPEN_PICKER': {
      let seed: string[] = [];
      if (action.kind === 'signupNat') seed = state.pairDraft.nationality.slice();
      if (action.kind === 'mapNat') {
        const openMap = state.openMapId ? state.maps.find((m) => m.id === state.openMapId) : undefined;
        seed = openMap ? openMap.nationalities.slice() : state.newMapDraft?.nationalities.slice() || [];
      }
      if (action.kind === 'companionNat') seed = state.story?.newCompanion?.nationalities.slice() || [];
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
        if (state.openMapId) {
          const maps = state.maps.map((m) => (m.id === state.openMapId ? { ...m, nationalities: state.pickerDraft.slice() } : m));
          return { ...state, maps, picker: null, pickerQuery: '', pickerDraft: [] };
        }
        if (state.newMapDraft) {
          return { ...state, newMapDraft: { ...state.newMapDraft, nationalities: state.pickerDraft.slice() }, picker: null, pickerQuery: '', pickerDraft: [] };
        }
      }
      if (state.picker === 'companionNat' && state.story?.newCompanion) {
        return {
          ...state,
          story: { ...state.story, newCompanion: { ...state.story.newCompanion, nationalities: state.pickerDraft.slice() } },
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
      return { ...state, overlay: 'friends', friendsOf: action.friendsOf || '', friendQuery: '' };

    case 'SET_FRIEND_QUERY':
      return { ...state, friendQuery: action.query };

    case 'OPEN_PERSON': {
      const f = state.friends.find((x) => x.name === action.name) || {
        name: action.name,
        initials: initialsOf(action.name) || '??',
        friends: 0,
        status: 'not connected yet',
        requestState: 'none' as const,
        requestedAt: 0,
      };
      return { ...state, person: f, personBack: state.overlay, overlay: 'person' };
    }

    case 'BACK_FROM_PERSON':
      return { ...state, overlay: state.personBack === 'friends' ? 'friends' : null };

    case 'SEND_FRIEND_REQUEST': {
      if (!state.person) return state;
      const p = state.person;
      const exists = state.friends.some((f) => f.name === p.name);
      const friends = exists
        ? state.friends.map((f) => (f.name === p.name ? { ...f, requestState: 'pending_out' as const, status: 'request sent' } : f))
        : [...state.friends, { ...p, requestState: 'pending_out' as const, status: 'request sent', requestedAt: Date.now() }];
      const next = { ...state, friends, person: { ...p, requestState: 'pending_out' as const, status: 'request sent' } };
      return withToast(next, `request sent to ${p.name.split(' ')[0]}.`);
    }

    case 'SEND_FRIEND_REQUEST_BY_NAME': {
      const name = action.name.trim();
      if (!name) return state;
      const already = state.friends.some((f) => f.name.toLowerCase() === name.toLowerCase());
      if (already) return withToast(state, `${name} is already on your list.`);
      const friend: Friend = { name, initials: initialsOf(name) || '??', friends: 0, status: 'request sent', requestState: 'pending_out', requestedAt: Date.now() };
      return withToast({ ...state, friends: [...state.friends, friend] }, `request sent to ${name.split(' ')[0]}.`);
    }

    case 'APPROVE_FRIEND_REQUEST': {
      const friends = state.friends.map((f) => (f.name === action.name ? { ...f, requestState: 'accepted' as const, status: 'friends since today' } : f));
      const next = {
        ...state,
        friends,
        person: state.person && state.person.name === action.name ? { ...state.person, requestState: 'accepted' as const, status: 'friends since today' } : state.person,
      };
      return withToast(next, `you and ${action.name.split(' ')[0]} are friends now.`);
    }

    case 'DECLINE_FRIEND_REQUEST': {
      const friends = state.friends.filter((f) => f.name !== action.name);
      return withToast({ ...state, friends }, 'request declined.');
    }

    case 'SET_PROFILE_NAME': {
      return { ...state, profile: { ...state.profile, name: action.name } };
    }

    case 'OPEN_HISTORY':
      return { ...state, overlay: 'history' };

    case 'OPEN_FRIEND_REQUESTS':
      return { ...state, overlay: 'friendRequests' };

    case 'CLOSE_OVERLAY':
      return { ...state, overlay: null, sheet: null, friendsOf: '', addMapCountry: '' };

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
        newMapDraft: { name: '', nationalities: [] },
        pairDraft: { ...emptyPairDraft(), country: state.addMapCountry || '' },
      };

    case 'PATCH_NEW_MAP': {
      if (!state.newMapDraft) return state;
      return { ...state, newMapDraft: { ...state.newMapDraft, ...action.patch } };
    }

    case 'START_MAP_BACKFILL':
      return { ...state, overlay: null, signup: { pairs: [] } };

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
      const entry: Entry = {
        id: 'e' + Date.now(),
        country,
        nationality: [],
        city: '',
        date: today(),
        name: '',
        note: '',
        emoji: '',
        place: '',
        placePub: false,
        photo: false,
        pub: false,
        stub: true,
        ord: -1,
        when: 'just now',
        kudos: [],
        iK: false,
        comments: [],
      };
      const maps = state.maps.map((m) => (m.id === action.mapId ? { ...m, entries: [entry, ...m.entries] } : m));
      const map = maps.find((m) => m.id === action.mapId);
      const next = { ...state, maps, overlay: null, addMapCountry: '' };
      return withToast(next, map ? `added ${country} to ${map.name}.` : 'added.');
    }

    default:
      return state;
  }
}

function withToast(state: AppState, message: string): AppState {
  return { ...state, toast: message, toastToken: state.toastToken + 1 };
}
