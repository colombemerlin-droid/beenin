export interface Comment {
  who: string;
  initials: string;
  text: string;
  when: string;
}

export interface Entry {
  id: string;
  country: string;
  nationality: string[];
  city?: string;
  date: string; // ISO yyyy-mm-dd
  name: string; // private, never shown publicly
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

export interface Friend {
  name: string;
  initials: string;
  friends: number;
  friend: boolean;
  status: string;
}
