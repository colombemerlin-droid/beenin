import type { Entry, FriendPost, Friend, Comment, Companion } from '../types';

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
  // What's typed in "Who is it?". If it matches no one already logged, it
  // becomes a new person on publish, with these passports.
  personQuery: string;
  newPersonNats: string[];
}

export interface SignupPair {
  // Assigned when the row is drafted, so a photo can upload before commit and
  // the committed entry reuses the same id.
  id: string;
  country: string;
  nationality: string[];
  date: string;
  // Who it was with: typed name, plus the remembered person's id when one was
  // picked from the dropdown. A new name becomes a remembered person on commit.
  name: string;
  companionId: string;
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

export type PickerKind =
  | 'country'
  | 'signupCountry'
  | 'signupNat'
  | 'emoji'
  | 'signupEmoji'
  | 'mapNat'
  | 'companionNat'
  | 'editCompanionNat'
  | 'mapCountries' // several countries at once, straight onto the open group map
  | null;

export type OverlayKind = 'history' | 'names' | 'friends' | 'person' | 'newMap' | 'mapPicker' | 'friendRequests' | null;

export type TabKind = 'map' | 'feed' | 'notifications' | 'profile';

export type DetailKind = 'mine' | 'feed' | null;

export interface SheetAction {
  label: string;
  color?: string;
  kind:
    | 'edit'
    | 'vis'
    | 'del'
    | 'report'
    | 'addmap'
    | 'mapRename'
    | 'mapNats'
    | 'mapBackfill'
    | 'unfriend'
    | 'editCompanion'
    | 'deleteCompanion' // asks to confirm…
    | 'confirmDeleteCompanion'; // …then deletes the person and everything logged only through them
}

export interface SheetState {
  title: string;
  actions: SheetAction[];
}

// Profile → Names edits a remembered person, or a relationship map's person
// (its name + passports). A person whose name matches a map edits both.
export interface CompanionEdit {
  kind: 'companion' | 'map';
  id: string;
  name: string;
  nationalities: string[];
}

export interface Profile {
  name: string;
  handle: string;
}

export type OnboardingStep = 'handle' | 'done';

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
  // First-run onboarding: pick a handle, then straight into the app. (Backfill
  // is only offered from Profile.)
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

  // A remembered person being edited from Profile → Names.
  companionEdit: CompanionEdit | null;

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
  | { type: 'START_SIGNUP' }
  | { type: 'PATCH_PAIR_DRAFT'; patch: Partial<SignupPair> }
  | { type: 'TOGGLE_PAIR_EXPANDED' }
  | { type: 'ADD_PAIR' }
  | { type: 'REMOVE_PAIR'; index: number }
  // `newCompanions`: people first named in this backfill; `links`: pair id → the
  // remembered person it was with. Both resolved by the caller so the same ids
  // go to the server.
  | { type: 'COMMIT_SIGNUP'; newCompanions: Companion[]; links: Record<string, string> }
  | { type: 'SKIP_SIGNUP' }
  | { type: 'SET_TAB'; tab: TabKind }
  | { type: 'SET_SIDE'; side: 0 | 1 }
  | { type: 'SET_DRAG'; dragX: number }
  | { type: 'OPEN_STORY'; editId?: string }
  | { type: 'PATCH_STORY'; patch: Partial<StoryDraft> }
  | { type: 'CLOSE_STORY' }
  | { type: 'PUBLISH_STORY' }
  // A person created from a typed name on publish; also selects them for the story.
  | { type: 'ADD_COMPANION'; companion: Companion }
  // Friends-list ⋯ menu (remove a friend / cancel a request).
  | { type: 'OPEN_FRIEND_MENU'; id: string }
  | { type: 'OPEN_NAMES' }
  | { type: 'OPEN_COMPANION_MENU'; id: string }
  | { type: 'PATCH_COMPANION_EDIT'; patch: Partial<CompanionEdit> }
  | { type: 'CLOSE_COMPANION_EDIT' }
  | { type: 'UPDATE_COMPANION'; companion: Companion }
  | { type: 'UPDATE_MAP'; id: string; name: string; nationalities: string[] }
  // Backfill: start the next entry with the same person (and passports) as the last one.
  | { type: 'REPEAT_PAIR_PERSON' }
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
  // New map → Create: the map is created and opened straight away.
  | { type: 'CREATE_MAP'; entries: Entry[] }
  | { type: 'ADD_MAP_COUNTRIES'; mapId: string; entries: Entry[] }
  | { type: 'CANCEL_NEW_MAP' }
  | { type: 'OPEN_MAP'; mapId: string }
  | { type: 'CLOSE_MAP' }
  | { type: 'PATCH_MAP_RENAME'; name: string }
  | { type: 'SAVE_MAP_RENAME' }
  | { type: 'ADD_ENTRY_TO_MAP'; mapId: string; id: string };

export type { Entry, FriendPost, Friend, Comment, Companion };
