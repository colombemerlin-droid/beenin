import { today } from '../data/format';
import { ME_KEY, initialsOf } from '../lib/identity';
import type { AppAction, AppState } from './types';
import type { Entry, Friend } from '../types';

export const initialState: AppState = {
  signedIn: false,
  tab: 'map',
  side: 0,
  dragX: 0,

  profile: { name: '' },
  entries: [],
  friendPosts: [],
  friends: [],

  signup: null,
  pairDraft: { country: '', nationality: '', date: '', name: '' },

  add: null,

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

export function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SIGN_IN':
      return { ...state, signedIn: true, signup: { pairs: [] } };

    case 'START_SIGNUP':
      return { ...state, signup: { pairs: [] }, pairDraft: { country: '', nationality: '', date: '', name: '' } };

    case 'PATCH_PAIR_DRAFT':
      return { ...state, pairDraft: { ...state.pairDraft, ...action.patch } };

    case 'ADD_PAIR': {
      const d = state.pairDraft;
      if (!d.country || !d.nationality) return state;
      if (!state.signup) return state;
      return {
        ...state,
        signup: { pairs: [...state.signup.pairs, { ...d }] },
        pairDraft: { country: '', nationality: '', date: '', name: '' },
      };
    }

    case 'REMOVE_PAIR': {
      if (!state.signup) return state;
      return { ...state, signup: { pairs: state.signup.pairs.filter((_, i) => i !== action.index) } };
    }

    case 'COMMIT_SIGNUP': {
      if (!state.signup) return state;
      const stubs: Entry[] = state.signup.pairs.map((p, i) => ({
        id: 'sp' + i + Date.now(),
        country: p.country,
        nationality: [p.nationality],
        city: '',
        place: '',
        placePub: false,
        date: p.date || '',
        name: p.name || '',
        note: '',
        emoji: '',
        photo: false,
        pub: false,
        stub: true,
        ord: 20000 + i,
        when: 'backfilled',
        kudos: [],
        iK: false,
        comments: [],
      }));
      const withStubs = { ...state, entries: [...state.entries, ...stubs], signup: null, tab: 'map' as const, side: 0 as const };
      return stubs.length ? withToast(withStubs, `${stubs.length} on the record without the paperwork. details whenever you like.`) : withStubs;
    }

    case 'SKIP_SIGNUP':
      return { ...state, signup: null };

    case 'SET_TAB':
      return { ...state, tab: action.tab, overlay: null };

    case 'SET_SIDE':
      return { ...state, side: action.side };

    case 'SET_DRAG':
      return { ...state, dragX: action.dragX };

    case 'OPEN_ADD': {
      const e = action.editId ? state.entries.find((x) => x.id === action.editId) : undefined;
      return {
        ...state,
        overlay: null,
        add: {
          editId: action.editId || '',
          nationality: e ? natsOf(e.nationality) : [],
          country: e ? e.country : '',
          date: e && e.date ? e.date : today(),
          name: e ? e.name || '' : '',
          note: e ? e.note || '' : '',
          emoji: e ? e.emoji || '' : '',
          place: e ? e.place || '' : '',
          placePub: e ? !!e.placePub : true,
          photo: e ? !!e.photo : false,
          pub: e ? !!e.pub : true,
        },
      };
    }

    case 'PATCH_ADD': {
      if (!state.add) return state;
      return { ...state, add: { ...state.add, ...action.patch } };
    }

    case 'CLOSE_ADD':
      return { ...state, add: null };

    case 'PUBLISH_ADD': {
      const a = state.add;
      if (!a) return state;
      const base: Partial<Entry> = {
        country: a.country,
        nationality: a.nationality,
        date: a.date,
        name: a.name,
        note: a.note || '',
        emoji: a.emoji || '',
        place: a.place.trim(),
        placePub: a.pub ? a.placePub : false,
        photo: a.photo,
        pub: a.pub,
        stub: false,
      };
      if (a.editId) {
        const next = { ...state, entries: patchEntry(state.entries, a.editId, base), add: null };
        return withToast(next, 'details filed. only you can read the name.');
      }
      const entry: Entry = {
        id: 'e' + Date.now(),
        city: '',
        ord: -1,
        when: 'just now',
        kudos: [],
        iK: false,
        comments: [],
        country: '', nationality: [], date: '', name: '', note: '', emoji: '', place: '', placePub: true, photo: false, pub: true, stub: false,
        ...base,
      };
      const next = { ...state, entries: [entry, ...state.entries], add: null, tab: 'feed' as const, overlay: null };
      return withToast(
        next,
        a.pub ? `stamped ${a.country} — it’s on your feed now.` : `stamped ${a.country} — nobody else knows.`
      );
    }

    case 'OPEN_PICKER': {
      const seed = action.kind === 'nat' && state.add ? state.add.nationality.slice() : [];
      return { ...state, picker: action.kind, pickerQuery: '', pickerDraft: seed };
    }

    case 'SET_PICKER_QUERY':
      return { ...state, pickerQuery: action.query };

    case 'CLOSE_PICKER':
      return { ...state, picker: null, pickerQuery: '', pickerDraft: [] };

    case 'PICK_COUNTRY': {
      if (!state.add) return state;
      return { ...state, add: { ...state.add, country: action.label }, picker: null, pickerQuery: '' };
    }

    case 'TOGGLE_PICKER_DRAFT': {
      const has = state.pickerDraft.includes(action.label);
      const pickerDraft = has ? state.pickerDraft.filter((n) => n !== action.label) : [...state.pickerDraft, action.label];
      return { ...state, pickerDraft };
    }

    case 'SAVE_PICKER': {
      if (state.picker === 'nat' && state.add) {
        return { ...state, add: { ...state.add, nationality: state.pickerDraft.slice() }, picker: null, pickerQuery: '', pickerDraft: [] };
      }
      return { ...state, picker: null, pickerQuery: '', pickerDraft: [] };
    }

    case 'REMOVE_ADD_NAT': {
      if (!state.add) return state;
      return { ...state, add: { ...state.add, nationality: state.add.nationality.filter((n) => n !== action.label) } };
    }

    case 'PICK_SIGNUP_COUNTRY':
      return { ...state, pairDraft: { ...state.pairDraft, country: action.label }, picker: null, pickerQuery: '' };

    case 'PICK_SIGNUP_NAT':
      return { ...state, pairDraft: { ...state.pairDraft, nationality: action.label }, picker: null, pickerQuery: '' };

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
        friend: false,
        status: 'not a friend yet',
      };
      return { ...state, person: f, personBack: state.overlay, overlay: 'person' };
    }

    case 'BACK_FROM_PERSON':
      return { ...state, overlay: state.personBack === 'friends' ? 'friends' : null };

    case 'ADD_FRIEND': {
      if (!state.person) return state;
      const p = state.person;
      const exists = state.friends.some((f) => f.name === p.name);
      const friends = exists
        ? state.friends.map((f) => (f.name === p.name ? { ...f, friend: true, status: 'friends since today' } : f))
        : [...state.friends, { ...p, friend: true, status: 'friends since today' }];
      const next = { ...state, friends, person: { ...p, friend: true, status: 'friends since today' } };
      return withToast(next, `you and ${p.name.split(' ')[0]} are friends. both ways, instantly.`);
    }

    case 'ADD_FRIEND_BY_NAME': {
      const name = action.name.trim();
      if (!name) return state;
      const already = state.friends.some((f) => f.name.toLowerCase() === name.toLowerCase());
      if (already) return withToast(state, `${name} is already on your list.`);
      const friend: Friend = { name, initials: initialsOf(name) || '??', friends: 0, friend: true, status: 'friends since today' };
      return withToast({ ...state, friends: [...state.friends, friend] }, `you and ${name.split(' ')[0]} are friends now.`);
    }

    case 'SET_PROFILE_NAME': {
      return { ...state, profile: { ...state.profile, name: action.name } };
    }

    case 'OPEN_HISTORY':
      return { ...state, overlay: 'history' };

    case 'CLOSE_OVERLAY':
      return { ...state, overlay: null, sheet: null, friendsOf: '' };

    case 'OPEN_MINE_MENU': {
      const e = state.entries.find((x) => x.id === action.id);
      if (!e) return state;
      return {
        ...state,
        sheet: {
          title: `${e.country || e.nationality.join(' · ')} · ${e.when}`,
          actions: [
            { label: e.stub ? 'Add details' : 'Edit stamp', kind: 'edit' },
            { label: e.pub ? 'Make it private' : 'Share to your wall', kind: 'vis' },
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
        sheet: { title: `${p.who}’s post`, actions: [{ label: 'Report this post', color: '#B23B2A', kind: 'report' }] },
        sheetTarget: p.id,
      };
    }

    case 'PICK_SHEET': {
      const id = state.sheetTarget;
      const cleared = { ...state, sheet: null };
      if (action.kind === 'report') return withToast(cleared, 'reported. we’ll take it from here — quietly.');
      if (action.kind === 'edit') {
        const e = cleared.entries.find((x) => x.id === id);
        return {
          ...cleared,
          overlay: null,
          add: {
            editId: id,
            nationality: e ? natsOf(e.nationality) : [],
            country: e ? e.country : '',
            date: e && e.date ? e.date : today(),
            name: e ? e.name || '' : '',
            note: e ? e.note || '' : '',
            emoji: e ? e.emoji || '' : '',
            place: e ? e.place || '' : '',
            placePub: e ? !!e.placePub : true,
            photo: e ? !!e.photo : false,
            pub: e ? !!e.pub : true,
          },
        };
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

    default:
      return state;
  }
}

function withToast(state: AppState, message: string): AppState {
  return { ...state, toast: message, toastToken: state.toastToken + 1 };
}
