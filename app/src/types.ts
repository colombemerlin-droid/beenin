export interface Comment {
  who: string;
  initials: string;
  text: string;
  when: string;
}

// The subject of a story — distinct from `Friend`/`Person` overlay state, which is about
// the user's social connections on the app, not who a story is about.
export interface Companion {
  id: string;
  name: string; // private, never shown publicly
  initials: string;
  nationalities: string[]; // captured once, at creation
}

export interface Entry {
  id: string;
  country: string;
  nationality: string[];
  city?: string;
  date: string; // ISO yyyy-mm-dd
  name: string; // private, never shown publicly — legacy free-text name (pre-Companion entries)
  companionId?: string; // who the story is about, for entries created via the story flow
  hideName?: boolean; // per-story opt-out — the companion's name is shown on the feed by default
  mapId?: string; // set when a story was linked to a relationship/group map
  metDateNumber?: string; // "We met" — which date this is (e.g. "3")
  metDateLocation?: string; // "We met" — freeform where
  note: string;
  emoji: string;
  place: string;
  placePub: boolean;
  photo: boolean;
  pub: boolean; // shared to wall
  stub: boolean; // backfilled, no details yet
  ord: number; // smaller = more recent, for feed sorting
  when: string; // relative time label
  kudos: string[]; // initials of people who gave kudos
  iK: boolean; // did the viewer give kudos
  comments: Comment[];
}

export interface MemoryNotification {
  kind: 'memory';
  id: string;
  entryId: string;
  years: number;
  country: string;
  emoji: string;
  ord: number;
}

export interface ActivityNotification {
  kind: 'kudos' | 'comment';
  id: string;
  entryId: string;
  who: string;
  initials: string;
  country: string;
  text?: string;
  ord: number;
}

export type NotificationItem = MemoryNotification | ActivityNotification;

export interface FriendPost {
  id: string;
  who: string;
  initials: string;
  country: string;
  nationality: string;
  place: string;
  note: string;
  emoji: string;
  photo: boolean;
  when: string;
  ord: number;
  kudos: string[];
  iK: boolean;
  comments: Comment[];
}

export type FriendRequestState = 'none' | 'pending_out' | 'pending_in' | 'accepted';

export interface Friend {
  name: string;
  initials: string;
  friends: number;
  status: string;
  requestState: FriendRequestState;
  requestedAt: number; // Date.now() at send time, used to order the pinned requests list
}
