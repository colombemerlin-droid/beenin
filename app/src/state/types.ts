import type { Entry, FriendPost, Friend, Comment } from '../types';

export interface AddDraft {
  editId: string;
  nationality: string[];
  country: string;
  date: string;
  name: string;
  note: string;
  emoji: string;
  place: string;
  placePub: boolean;
  photo: boolean;
  pub: boolean;
}

export interface SignupPair {
  country: string;
  nationality: string;
  date: string;
  name: string;
}

export interface SignupState {
  pairs: SignupPair[];
}

export type PickerKind = 'country' | 'nat' | 'signupCountry' | 'signupNat' | null;

export type OverlayKind = 'history' | 'friends' | 'person' | null;

export type TabKind = 'map' | 'feed' | 'profile';

export type DetailKind = 'mine' | 'feed' | null;

export interface SheetAction {
  label: string;
  color?: string;
  kind: 'edit' | 'vis' | 'del' | 'report';
}

export interface SheetState {
  title: string;
  actions: SheetAction[];
}

export interface Profile {
  name: string;
}

export interface AppState {
  signedIn: boolean;
  tab: TabKind;
  side: 0 | 1;
  dragX: number;

  profile: Profile;
  entries: Entry[];
  friendPosts: FriendPost[];
  friends: Friend[];

  signup: SignupState | null;
  pairDraft: SignupPair;

  add: AddDraft | null;

  picker: PickerKind;
  pickerQuery: string;
  pickerDraft: string[];

  overlay: OverlayKind;
  detailOn: boolean;
  detailKind: DetailKind;
  detailId: string | null;
  commentDraft: string;

  friendQuery: string;
  friendsOf: string;
  personBack: OverlayKind;
  person: Friend | null;

  sheet: SheetState | null;
  sheetTarget: string;

  toast: string;
  toastToken: number;

  azOpen: string;
}

export type AppAction =
  | { type: 'SIGN_IN' }
  | { type: 'START_SIGNUP' }
  | { type: 'PATCH_PAIR_DRAFT'; patch: Partial<SignupPair> }
  | { type: 'ADD_PAIR' }
  | { type: 'REMOVE_PAIR'; index: number }
  | { type: 'COMMIT_SIGNUP' }
  | { type: 'SKIP_SIGNUP' }
  | { type: 'SET_TAB'; tab: TabKind }
  | { type: 'SET_SIDE'; side: 0 | 1 }
  | { type: 'SET_DRAG'; dragX: number }
  | { type: 'OPEN_ADD'; editId?: string }
  | { type: 'PATCH_ADD'; patch: Partial<AddDraft> }
  | { type: 'CLOSE_ADD' }
  | { type: 'PUBLISH_ADD' }
  | { type: 'OPEN_PICKER'; kind: PickerKind }
  | { type: 'SET_PICKER_QUERY'; query: string }
  | { type: 'PICK_COUNTRY'; label: string }
  | { type: 'TOGGLE_PICKER_DRAFT'; label: string }
  | { type: 'SAVE_PICKER' }
  | { type: 'REMOVE_ADD_NAT'; label: string }
  | { type: 'PICK_SIGNUP_COUNTRY'; label: string }
  | { type: 'PICK_SIGNUP_NAT'; label: string }
  | { type: 'CLOSE_PICKER' }
  | { type: 'TOGGLE_KUDOS'; kind: 'mine' | 'feed'; id: string }
  | { type: 'SET_COMMENT_DRAFT'; text: string }
  | { type: 'SUBMIT_COMMENT' }
  | { type: 'OPEN_DETAIL'; kind: DetailKind; id: string }
  | { type: 'CLOSE_DETAIL' }
  | { type: 'OPEN_FRIENDS'; friendsOf?: string }
  | { type: 'SET_FRIEND_QUERY'; query: string }
  | { type: 'OPEN_PERSON'; name: string }
  | { type: 'BACK_FROM_PERSON' }
  | { type: 'ADD_FRIEND' }
  | { type: 'ADD_FRIEND_BY_NAME'; name: string }
  | { type: 'SET_PROFILE_NAME'; name: string }
  | { type: 'OPEN_HISTORY' }
  | { type: 'CLOSE_OVERLAY' }
  | { type: 'OPEN_MINE_MENU'; id: string }
  | { type: 'OPEN_FEED_MENU'; id: string }
  | { type: 'PICK_SHEET'; kind: SheetAction['kind'] }
  | { type: 'CLOSE_SHEET' }
  | { type: 'TOGGLE_AZ'; country: string }
  | { type: 'SHOW_TOAST'; message: string }
  | { type: 'CLEAR_TOAST'; token: number };

export type { Entry, FriendPost, Friend, Comment };
