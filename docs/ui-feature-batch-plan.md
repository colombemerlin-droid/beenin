# Been In: UI/feature batch — backfill, new stamp, feed menu, map, tab bar, notifications, relationship maps

## Context

This is a batch of local frontend changes to `app/` (still ahead of the Supabase backend migration in `docs/backend-migration-plan.md` — everything here is implemented against the existing local reducer/mock state, and will get wired to the real backend in that later phase). It covers seven areas: the backfill (signup) flow, the new-stamp flow, the Feed/History three-dot menu, the Map page, a net-new "relationship/group map" feature that was designed earlier (in `chats/chat1.md` and the exported prototype `project/Been In v2.dc.html`) but never built in the React app, the bottom tab bar, and a net-new Notifications tab.

The relationship/group map feature is the load-bearing piece here — several other items ("Add to a map", the map header rename) depend on it existing. Its confirmed spec, pulled from `chats/chat1.md`:
- **Solo-created**: no invite/accept. The creating user names the map, picks the person's nationality/nationalities (multi allowed, e.g. dual citizenship), and is the only one who ever adds entries to it.
- **Backfill on that map**: same bulk country-checklist pattern as the general backfill, reachable again later via "Backfill countries" in the map's own three-dot menu, alongside "Rename this map" and "Edit their passports."
- **Propagation is automatic, unconditional**: any country logged on a group map also colors the user's own general "Been" map; any nationality tagged on that map's person propagates to the user's own general "Been In" map once any entry exists for them. It never propagates to any *other* group map.
- **Entry point**: a chip above the map on the Map screen (and/or from Profile).
- Feed posts from a group map render as `"[Name] added [Country] on [Map Name]"`.

**Confirmed decision for "Add to a map"**: picking a map from that menu creates a brand-new entry for that country on the chosen map, owned by the current user — it does not move, share, or tag the original post. This is how, e.g., seeing a friend's Portugal post can remind you to log Portugal on your own "Us, Abroad" map.

**Friend requests**: the current `ADD_FRIEND` is instant/mutual with no pending state — but `PersonOverlay.tsx:36`'s existing copy ("Send the request — one accept from either side...") already implies a real request/accept model that was never actually wired up. The Notifications spec's Approve/Decline flow is that model, finally implemented. This replaces instant-accept with a real pending state.

---

## Phase A — Country/emoji picker rework (`src/ui/Picker.tsx`, `src/data/countries.ts`, `src/state/types.ts`, `src/state/reducer.ts`)

1. **"Oops, I don't know" pinned option**: add a pinned row above the alphabetical list for `kind === 'country' | 'signupCountry'`, dispatching the existing single-select commit path with a sentinel value `'Unknown'`. Update `flagOf()` (`data/countries.ts`) to return a neutral placeholder (🏳️) for `'Unknown'`, and exclude `'Unknown'` from `pct()`/`continentBreakdown()`'s denominator so it doesn't skew world-coverage stats.
2. **Emoji picker becomes tap-to-open** (applies to both `AddEntryScreen` and the new expanded backfill row, Phase B): add `PickerKind` values `'emoji' | 'signupEmoji'`. `Picker.tsx` renders the existing `EMOJI_GROUPS` grid (currently inline in `AddEntryScreen.tsx:125-160`) when the kind is emoji-related, single-select, immediate-commit (same as `country`). `AddEntryScreen`'s emoji section becomes a single compact box (selected emoji or a neutral "＋" placeholder) that opens the picker on tap.
3. **Multi-select nationality picker reused for backfill** (Phase B needs this): change `isMulti` (`Picker.tsx:13`) to also include `'signupNat'`, and change `PICK_SIGNUP_NAT`'s immediate-commit reducer case to instead route through the existing `TOGGLE_PICKER_DRAFT` → `SAVE_PICKER` staged pattern, committing into `pairDraft.nationality` (now an array — see Phase B).

## Phase B — Backfill (`SignupScreen.tsx`) rework

1. **`SignupPair.nationality` becomes `string[]`** (`state/types.ts:17-22`). Row display (`SignupScreen.tsx:65-85`) joins multiple nationalities with `·`, matching `AddEntryScreen`'s chip style. `ADD_PAIR`/`COMMIT_SIGNUP` (`reducer.ts:65-105`) updated for the array.
2. **Expand "+" button** between the Date field and "Add to the record": add a local `expanded: boolean` to the draft-row UI state (one draft is edited at a time, so this is a single toggle, not per-list-row). When expanded, reveal the same optional fields as `AddEntryScreen` — place (+ visibility toggle), note, emoji (tap-to-open per Phase A), photo, public/private — reusing `AddEntryScreen`'s field components where practical rather than re-implementing them. `pairDraft` gains these optional fields; `COMMIT_SIGNUP` (`reducer.ts:81-105`) carries them into the created entry and sets `stub: false` for a pair that used the expanded fields (vs. `stub: true` for a bare country+nationality+date row, matching the existing "stub = no details yet" meaning).
3. Country pickers used here (`signupCountry`) get the "Oops, I don't know" option per Phase A.

## Phase C — New Stamp (`AddEntryScreen.tsx`)

Confirmed already correct, no code change: `blocked = !(a.country && a.nationality.length)` (`reducer.ts:13`) already makes only country + nationality required; date already defaults to `today()`. This item is a verification pass, not a build.

Emoji picker becomes tap-to-open per Phase A item 2.

## Phase D — Relationship/group maps (net-new)

New data:
- `state/types.ts`: `GroupMap { id: string; name: string; nationalities: string[]; entries: Entry[] }` (entries reuse the existing `Entry` shape — country/date/place/note/emoji/photo/pub, no `person_name`/`nationality` per-entry since those are map-level). `AppState.maps: GroupMap[]`.
- New actions: `CREATE_MAP` (name + nationalities → new `GroupMap`), `RENAME_MAP`, `SET_MAP_NATS`, `ADD_MAP_PAIR`/`COMMIT_MAP_SIGNUP` (reuses the Phase B backfill checklist UI, scoped to one map), `ADD_ENTRY_TO_MAP` (used by the new "Add to a map" sheet action, Phase E).

New screens/UI:
- `src/screens/overlays/GroupMapOverlay.tsx`: the map's own page — header (name + nationalities), its own Been-style country list (reuses the Phase F continent-grouped list component), three-dot menu with "Rename this map" / "Edit their passports" / "Backfill countries" (reuses Phase B's checklist, scoped to this map).
- `src/screens/overlays/NewMapOverlay.tsx`: name + nationality-picker + initial backfill checklist (same shape as general backfill).
- Entry chip above the Map screen's header listing existing group maps + "New map," per the confirmed entry point.

Propagation: `state/selectors.ts`'s `beenCountries`/`natCountries` (currently lines 5-19) get extended to union in every `GroupMap`'s entries'/nationalities' contribution to the general maps — this is what makes propagation automatic per the confirmed unconditional rule, computed at read time rather than duplicated at write time (avoids a second copy of country data to keep in sync).

Feed rendering: entries created on a group map carry enough info (map id/name) for `FeedScreen.tsx` to render the `"[Name] added [Country] on [Map Name]"` format as a visually distinct card, per the confirmed copy.

## Phase E — Feed & History three-dot menu: "Add to a map"

- `OPEN_MINE_MENU` and `OPEN_FEED_MENU` (`reducer.ts:320-345`) both gain a `{label: 'Add to a map', kind: 'addmap'}` action.
- `PICK_SHEET` (`reducer.ts:347-384`) gains an `'addmap'` branch: opens a small picker overlay listing `state.maps` + "+ Create a new map," matching the confirmed behavior — selecting a map creates a new entry (country from the source post/entry, today's date, no other fields prefilled) via `ADD_ENTRY_TO_MAP` on the chosen `GroupMap`; "create new map" routes into `NewMapOverlay` (Phase D) with the country pre-filled as the first backfill item.

## Phase F — Map page (`MapScreen.tsx`, `selectors.ts`)

1. **Header**: `"Your Passport"` (`MapScreen.tsx:68-73`) → `` `${firstName}'s passport` `` using `state.profile.name.trim().split(' ')[0]` (the existing first-name-extraction pattern already used twice in `reducer.ts`), centered (the header block's layout changes from left-aligned to centered).
2. **Continent-grouped sort**: new selector, e.g. `groupedByContinent(active: string[]): { continent: string; items: AZItem[] }[]`, replacing the flat `azList.sort()` (`MapScreen.tsx:20-22`) — groups by each country's `continent` field (already on `CountryPair`, `data/countries.ts:17`), continents ordered by their display name, countries alphabetical within each continent. Applies to **both** sides.
3. **Been In side (side 1) loses the accordion entirely**: no chevron, no expand/collapse, just flat rows — remove the conditional expanded panel (`MapScreen.tsx:203-212`) for `side === 1`, and the always-empty `natSet` branch (`MapScreen.tsx:25-29`) that only ever produced the placeholder becomes dead code and is deleted.
4. **Been side (side 0) keeps the accordion** exactly as today (nationalities-under-country on tap), just re-sorted into continent groups per item 2.

## Phase G — Bottom tab bar (`TabBar.tsx`, `icons.tsx`, `App.tsx`, `state/types.ts`)

1. Rename the "You" tab label to "Profile" (`TabBar.tsx:49`) — icon (`TabProfileIcon`) and `TabKind` value `'profile'` stay as-is, label text only.
2. New `TabKind` value `'notifications'`; new `TabNotificationsIcon` in `icons.tsx` following the existing `Tab*Icon` pattern (24×24 inline SVG, bell shape). New `TabButton` inserted between the FAB wrapper and the Profile button (`TabBar.tsx:26-49`), giving the confirmed order Map · Feed · + · Notifications · Profile.
3. `App.tsx`'s `AppShell` gains `{state.tab === 'notifications' && <NotificationsScreen />}` alongside the existing three.

## Phase H — Notifications tab (net-new: `src/screens/NotificationsScreen.tsx`)

Data model additions (`state/types.ts`, `reducer.ts`):
- `Friend` gains a `requestState: 'pending_out' | 'pending_in' | 'accepted'` (replacing the current instant-accept boolean-only model).
- New actions: `SEND_FRIEND_REQUEST` (replaces the instant `ADD_FRIEND`/`ADD_FRIEND_BY_NAME` — creates a `pending_out` row instead of an immediate friend), `APPROVE_FRIEND_REQUEST`, `DECLINE_FRIEND_REQUEST` (act on a `pending_in` row).

Screen layout:
1. **Pinned "Friend requests" row**, always rendered (including a neutral "0" state, per the confirmed always-visible behavior) — count of `pending_in` rows + chevron opening a `FriendRequestsOverlay` listing them.
2. **Tapping a pending request** opens a detail view showing only that person's name + avatar (reusing `Avatar`, matching the existing pre-friendship visibility rule already implemented in `PersonOverlay.tsx:27-38`'s "nothing to see until you're friends" branch) with Approve/Decline buttons.
3. **Below the pinned row**, a chronological list merging two derived (not separately stored) sources, computed by a new selector rather than persisted state:
   - Kudos/comments on the user's own entries — flattened out of `state.entries[].kudos`/`.comments` with their timestamps.
   - "Memory" notifications — entries whose `date` shares today's month/day in a prior year, labeled "N year(s) ago today."
   - Both are sorted chronologically; older items are naturally excluded past a reasonable time window (e.g. last 30 days for activity) rather than tracked with persisted read/dismissed state — proportionate to this app's scale, and matches "fade/age out" without new state to keep correct. A subtle opacity-by-recency style gives the visual "fade" cue.
   - Friend-request items are **not** part of this time-windowed list — they live only in the pinned row and stay until acted on, per the confirmed exemption.
   - Tapping a kudos/comment/memory item dispatches the existing `OPEN_DETAIL` (kind `'mine'`, the entry's id).

---

## Suggested build order

A (pickers) → B (backfill) → C (verify new-stamp) → F (map sort/header) → G (tab bar) → D (group maps, the biggest single piece) → E (add-to-map, depends on D) → H (notifications, depends on the friend-request model touched by D's "Add to a map" surfacing and independently on E).

## Verification

- Backfill: add a multi-nationality row, expand it via the new "+", fill in a photo/note, confirm the resulting entry is `stub:false` with full details; confirm a plain row (no expand) stays `stub:true` as today.
- New stamp: publish with only country+nationality set, confirm it succeeds; confirm emoji grid only appears after tapping the emoji box.
- Country picker: pick "Oops, I don't know," confirm it doesn't break the map's percentage/continent stats.
- Map: confirm header shows the entered first name, centered; confirm Been In side has no chevrons/expand at all; confirm Been side's accordion still works; confirm both sides are grouped by continent, alphabetical within each.
- Group maps: create a new map, backfill a country on it, confirm that country now also shows as "been" on the general Been map and its nationality shows on Been In; confirm it does *not* appear on any other group map.
- Add to a map: from a friend's Feed post, add its country to one of your maps, confirm a new entry appears on that map (and propagates per the rule above) without altering the friend's original post.
- Notifications: confirm the Friend requests row shows "0" with no pending requests rather than disappearing; send/approve/decline a request end-to-end; confirm a kudos/comment on your own post and a same-day-last-year entry both appear in the chronological list and route to the right post on tap.
