import type { Entry, FriendPost, Friend, Comment, Companion } from '../types';

export interface NewCompanionDraft {
  name: string;
  nationalities: string[];
}

export interface StoryDraft {
  // Always set: the existing entry's id when editing, or a fresh UUID for a new
  // story (assigned when the draft opens, so publish — and a photo upload before
  // publish — reuse it for the server row).
  editId: string;
  isEdit: boolean;
  companionId: string;
  mapId: string;
  date: string;
  met: boolean;
  metDateNumber: string;
  metDateLocation: string;
  beenIn: boolean;
  country: string;
  note: string;
  emoji: string;
  photoPath: string;
  pub: boolean;
  hideName: boolean;
  newCompanion: NewCompanionDraft | null;
}

export interface SignupPair {
  // Assigned when the row is drafted, so a photo can upload before commit and
  // the committed entry reuses the same id.
  id: string;
  country: string;
  nationality: string[];
  date: string;
  name: string;
  // Set only when the row was expanded via the "+" — matches the story flow's optional fields.
  // Backlog entries never share to the wall, so there's no `pub`/`placePub` here — always private.
  expanded: boolean;
  place: string;
  note: string;
  emoji: string;
  photoPath: string;
}

export interface SignupState {
  pairs: SignupPair[];
}

export interface GroupMap {
  id: string;
  name: string;
  nationalities: string[];
  entries: Entry[];
}

export interface NewMapDraft {
  id: string; // assigned up front so the commit and the server row share it
  name: string;
  nationalities: string[];
}

export type PickerKind = 'country' | 'signupCountry' | 'signupNat' | 'emoji' | 'signupEmoji' | 'mapNat' | 'companionNat' | null;

export type OverlayKind = 'history' | 'friends' | 'person' | 'newMap' | 'mapPicker' | 'friendRequests' | null;

export type TabKind = 'map' | 'feed' | 'notifications' | 'profile';

export type DetailKind = 'mine' | 'feed' | null;

export interface SheetAction {
  label: string;
  color?: string;
  kind: 'edit' | 'vis' | 'del' | 'report' | 'addmap' | 'mapRename' | 'mapNats' | 'mapBackfill';
}

export interface SheetState {
  title: string;
  actions: SheetAction[];
}

export interface Profile {
  name: string;
  handle: string;
}

export type OnboardingStep = 'handle' | 'signup' | 'done';

// Everything the account holds on the server, as the viewer sees it.
export interface ServerData {
  entries: Entry[];
  companions: Companion[];
  maps: GroupMap[];
  friends: Friend[];
  friendPosts: FriendPost[];
}

export interface AppState {
  // True only while the initial Supabase session check is in flight (app boot).
  authLoading: boolean;
  authUserId: string | null;
  signedIn: boolean;
  // Where a signed-in user is in first-run onboarding: pick a handle, then
  // run the country-backfill (signup) flow, then done. Irrelevant once 'done'.
  onboardingStep: OnboardingStep;
  handleDraft: string;
  handleError: string;
  tab: TabKind;
  side: 0 | 1;
  dragX: number;

  profile: Profile;
  entries: Entry[];
  friendPosts: FriendPost[];
  friends: Friend[];
  maps: GroupMap[];
  companions: Companion[];

  signup: SignupState | null;
  pairDraft: SignupPair;
  // When set, COMMIT_SIGNUP appends to this existing map's entries instead of the general record.
  mapBackfillFor: string | null;

  newMapDraft: NewMapDraft | null;
  // The map currently open/being edited (drives GroupMapOverlay + its three-dot menu actions).
  openMapId: string | null;
  mapRenaming: boolean;
  mapRenameDraft: string;

  // Set right before opening the "Add to a map" picker, so a chosen/new map knows what to log.
  addMapCountry: string;

  story: StoryDraft | null;

  picker: PickerKind;
  pickerQuery: string;
  pickerDraft: string[];

  overlay: OverlayKind;
  detailOn: boolean;
  detailKind: DetailKind;
  detailId: string | null;
  commentDraft: string;

  friendQuery: string;
  personBack: OverlayKind;
  person: Friend | null;

  sheet: SheetState | null;
  sheetTarget: string;

  toast: string;
  toastToken: number;

  azOpen: string;
}

export type AppAction =
  | { type: 'AUTH_CHECK_DONE' }
  | ({
      type: 'HYDRATE_SESSION';
      userId: string;
      displayName: string;
      handle: string;
      handleSet: boolean;
      onboarded: boolean;
    } & ServerData)
  // A background refresh (tab switch, app refocus) — replaces server-backed data only.
  | ({ type: 'SYNC_FROM_SERVER' } & ServerData)
  | { type: 'SIGN_OUT' }
  | { type: 'PATCH_HANDLE_DRAFT'; value: string }
  | { type: 'SET_HANDLE'; handle: string }
  | { type: 'HANDLE_ERROR'; message: string }
  | { type: 'ONBOARDING_DONE' }
  | { type: 'START_SIGNUP' }
  | { type: 'PATCH_PAIR_DRAFT'; patch: Partial<SignupPair> }
  | { type: 'TOGGLE_PAIR_EXPANDED' }
  | { type: 'ADD_PAIR' }
  | { type: 'REMOVE_PAIR'; index: number }
  | { type: 'COMMIT_SIGNUP' }
  | { type: 'SKIP_SIGNUP' }
  | { type: 'SET_TAB'; tab: TabKind }
  | { type: 'SET_SIDE'; side: 0 | 1 }
  | { type: 'SET_DRAG'; dragX: number }
  | { type: 'OPEN_STORY'; editId?: string }
  | { type: 'PATCH_STORY'; patch: Partial<StoryDraft> }
  | { type: 'CLOSE_STORY' }
  | { type: 'PUBLISH_STORY' }
  | { type: 'OPEN_NEW_COMPANION' }
  | { type: 'PATCH_NEW_COMPANION'; patch: Partial<NewCompanionDraft> }
  | { type: 'SAVE_NEW_COMPANION'; id: string }
  | { type: 'CANCEL_NEW_COMPANION' }
  | { type: 'OPEN_PICKER'; kind: PickerKind }
  | { type: 'SET_PICKER_QUERY'; query: string }
  | { type: 'PICK_COUNTRY'; label: string }
  | { type: 'TOGGLE_PICKER_DRAFT'; label: string }
  | { type: 'SAVE_PICKER' }
  | { type: 'PICK_SIGNUP_COUNTRY'; label: string }
  | { type: 'PICK_EMOJI'; ch: string }
  | { type: 'PICK_SIGNUP_EMOJI'; ch: string }
  | { type: 'CLOSE_PICKER' }
  | { type: 'TOGGLE_KUDOS'; kind: 'mine' | 'feed'; id: string }
  | { type: 'SET_COMMENT_DRAFT'; text: string }
  | { type: 'SUBMIT_COMMENT' }
  | { type: 'OPEN_DETAIL'; kind: DetailKind; id: string }
  | { type: 'CLOSE_DETAIL' }
  | { type: 'OPEN_FRIENDS' }
  | { type: 'SET_FRIEND_QUERY'; query: string }
  // `person` is a friend from state, or a profile found by handle search.
  | { type: 'OPEN_PERSON'; person: Friend }
  | { type: 'BACK_FROM_PERSON' }
  | { type: 'SEND_FRIEND_REQUEST' }
  | { type: 'APPROVE_FRIEND_REQUEST'; id: string }
  | { type: 'DECLINE_FRIEND_REQUEST'; id: string }
  | { type: 'SET_PROFILE_NAME'; name: string }
  | { type: 'OPEN_HISTORY' }
  | { type: 'OPEN_FRIEND_REQUESTS' }
  | { type: 'CLOSE_OVERLAY' }
  | { type: 'OPEN_MINE_MENU'; id: string }
  | { type: 'OPEN_FEED_MENU'; id: string }
  | { type: 'OPEN_MAP_MENU'; mapId: string }
  | { type: 'PICK_SHEET'; kind: SheetAction['kind'] }
  | { type: 'CLOSE_SHEET' }
  | { type: 'TOGGLE_AZ'; country: string }
  | { type: 'SHOW_TOAST'; message: string }
  | { type: 'CLEAR_TOAST'; token: number }
  | { type: 'OPEN_NEW_MAP' }
  | { type: 'PATCH_NEW_MAP'; patch: Partial<NewMapDraft> }
  | { type: 'START_MAP_BACKFILL' }
  | { type: 'CANCEL_NEW_MAP' }
  | { type: 'OPEN_MAP'; mapId: string }
  | { type: 'CLOSE_MAP' }
  | { type: 'PATCH_MAP_RENAME'; name: string }
  | { type: 'SAVE_MAP_RENAME' }
  | { type: 'ADD_ENTRY_TO_MAP'; mapId: string; id: string };

export type { Entry, FriendPost, Friend, Comment, Companion };
