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
  name: string; // shown to friends on public stories unless the story hides it
  initials: string;
  nationalities: string[]; // captured once, at creation
}

export interface Entry {
  id: string;
  country: string;
  nationality: string[];
  city?: string;
  date: string; // ISO yyyy-mm-dd
  name: string; // legacy free-text name (backfill / pre-Companion entries); never shared with friends
  companionId?: string; // who the story is about, for entries created via the story flow
  hideName?: boolean; // per-story opt-out — the companion's name is shown on the feed by default
  mapId?: string; // set when a story was linked to a relationship/group map
  metDateNumber?: string; // "We met" — which date this is (e.g. "3")
  metDateLocation?: string; // "We met" — freeform where
  note: string;
  emoji: string;
  place: string;
  placePub: boolean;
  photoPath: string; // Storage object path in the `photos` bucket; '' = no photo
  pub: boolean; // shared to wall
  stub: boolean; // backfilled, no details yet
  ord: number; // smaller = more recent, for feed sorting
  when: string; // relative time label
  kudos: string[]; // initials of people who gave kudos
  kudosBy?: string[]; // display names, parallel to `kudos`
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

// A friend's public entry, as the viewer is allowed to see it.
export interface FriendPost {
  id: string;
  ownerId: string;
  who: string;
  initials: string;
  country: string;
  nationality: string;
  place: string; // only when the owner marked it shareable
  companionName?: string; // only when public and not hidden
  metDateNumber?: string;
  metDateLocation?: string;
  date: string;
  note: string;
  emoji: string;
  photoPath: string;
  when: string;
  ord: number;
  kudos: string[];
  kudosBy?: string[];
  iK: boolean;
  comments: Comment[];
}

export type FriendRequestState = 'none' | 'pending_out' | 'pending_in' | 'accepted';

export interface Friend {
  id: string; // profile id
  name: string;
  handle: string;
  initials: string;
  status: string;
  requestState: FriendRequestState;
  requestedAt: number; // ms timestamp of the request, used to order the pinned requests list
}
