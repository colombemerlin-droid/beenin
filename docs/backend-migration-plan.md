# Been In: migrate from local mock to a real multi-user Supabase backend

## Context

"Been In" (`app/`) is a Vite + React 19 + TypeScript app currently running entirely client-side: `src/state/reducer.ts` is a pure synchronous reducer, and `src/state/store.tsx` persists a subset of state to `localStorage` (key `been-in:v1`). There is no backend anywhere — "Sign in with Google/Apple" just flips a boolean, and "friends" are name-keyed mock objects living only in one browser's storage. The user wants their real friends to actually use this together (real accounts, real shared posts/friend circles), which this architecture cannot do: every friend would get their own private sandbox with the same seed data.

This plan wires up a real Supabase backend (Postgres + Auth + Storage, all RLS-enforced so private entries truly stay private) and deploys the frontend to Vercel, while preserving the existing reducer/UI as the optimistic, instant-feeling source of truth for UI state.

**Confirmed decisions:**
- Auth v1: Google OAuth + email magic link only. Apple Sign In is deferred (needs a paid Apple Developer account) — remove the Apple button from `SignInScreen.tsx` rather than leave it fake.
- Friends are added by a unique `@handle`, not by name (names collide). Needs a short "choose your handle" onboarding step.
- Real photo upload via Supabase Storage, replacing the current boolean placeholder toggle.
- Friendships are **strictly two-party private** — no "see a friend's friend list" feature in v1. `PersonOverlay`'s friend-count/friend-list button and `FriendsOverlay`'s `friendsOf` (viewing someone else's list) get dropped for v1; a user only ever sees their own friend list.
- User creates the Supabase and Vercel accounts/projects themselves (account creation can't be done on their behalf) and hands back the **Project URL + anon key only** — never a password or service-role key.
- A GitHub remote already exists (`git@github.com:colombemerlin-droid/beenin.git`, branch `main`, pushed) — deploy via Vercel's GitHub integration, not CLI direct-deploy.

**Architectural throughline:** keep `reducer.ts` as the synchronous, optimistic UI state machine (every screen already depends on its exact `Entry`/`FriendPost`/`Friend`/`Comment` shapes from `src/types.ts`). Add two new files — `src/lib/supabase.ts` (client) and `src/lib/api.ts` (every server operation, each returning data pre-shaped to match the existing types) — and have each server-relevant dispatch site also `await` the matching `api.*` call, toasting on failure. No rollback/retry machinery — proportionate to a small trusted friend-group app.

Two changes are structural, not incidental, and touch multiple files:
1. **IDs** move from `'e' + Date.now()` to `crypto.randomUUID()`, generated client-side *before* dispatch so the same id drives both the optimistic reducer update and the DB row.
2. **Friend/post identity** moves from name-keyed to `id`-keyed (profile UUID) throughout — `Friend`, `FriendPost`, `OPEN_PERSON`, `ADD_FRIEND`, `FriendsOverlay`, `PersonOverlay` all currently match on `name`, which isn't unique.

---

## Phase 1 — Database schema (unattended)

One unified **`entries`** table (not separate `Entry`/`FriendPost` tables) — a `FriendPost` is just someone else's `Entry` viewed through RLS; a second table would duplicate every write. `kudos` and `comments` become their own normalized tables instead of embedded arrays, since embedded arrays can't support correct concurrent multi-user state.

- **`profiles`**: `id uuid PK references auth.users`, `handle text unique not null`, `display_name text not null default ''`, `created_at`.
- **`entries`**: `id uuid PK`, `owner_id uuid references profiles not null`, `country`, `nationality text[]`, `city`, `date`, `person_name text` (renamed from `name` — this is the private per-entry name, distinct from the owner's own display name; the rename removes an existing naming ambiguity), `note`, `emoji`, `place`, `place_public bool default true`, `pub bool default false`, `stub bool default false`, `photo_path text` (nullable), `created_at`, `updated_at`. Drop the client-only `ord`/`when` fields — sort by `created_at desc`; add a small `relativeTime()` helper to `src/data/format.ts` to replace the current hardcoded `when` strings.
- **`kudos`**: `entry_id references entries on delete cascade`, `user_id references profiles`, `created_at`, `unique(entry_id, user_id)`. Toggle = insert/delete a row.
- **`comments`**: `id uuid PK`, `entry_id references entries on delete cascade`, `author_id references profiles`, `text`, `created_at`.
- **`friendships`**: canonical single row per pair — `user_id_1`, `user_id_2`, `created_at`, `CHECK (user_id_1 < user_id_2)`, `unique(user_id_1, user_id_2)`. Single-row is correct since friendship here is purely symmetric (no request/approve state); client canonicalizes ordering on insert.
- **`reports`**: `id uuid PK`, `entry_id references entries`, `reporter_id references profiles`, `created_at`. No workflow — read directly from the Supabase table editor, matching today's "we'll take it from here — quietly" toast.

Write one reusable SQL helper `is_friend(a uuid, b uuid) returns boolean` used across the RLS policies below.

## Phase 2 — Row Level Security (unattended, same SQL file)

Enable RLS on every table.

- **`profiles`**: any authenticated user can `SELECT` any row (handle + display_name only — needed for handle search in a friend-group app). `INSERT`/`UPDATE` only where `id = auth.uid()`.
- **`entries`**: `SELECT` where `owner_id = auth.uid()` **or** (`pub = true and stub = false and is_friend(auth.uid(), owner_id)`) — this is the core privacy boundary, enforced server-side instead of just by what the client happens to query. `INSERT`/`UPDATE`/`DELETE` require `owner_id = auth.uid()`.
- **`kudos`/`comments`**: `SELECT`/`INSERT` require the row's `entry_id` to pass the same visibility check as `entries`; `INSERT` also requires `user_id`/`author_id = auth.uid()`; `DELETE` on `kudos` requires `user_id = auth.uid()`.
- **`friendships`**: `SELECT`/`INSERT` require `auth.uid()` to be one of the two parties — strictly two-party, per the confirmed decision. No "friends of my friends" relaxation.
- **`reports`**: `INSERT` requires `reporter_id = auth.uid()`. No `SELECT` policy for regular users.

## Phase 3 — Storage design

- One **private** bucket `photos`. Path: `{owner_id}/{entry_id}/{uuid}.{ext}` — the `entry_id` segment lets a storage RLS policy inherit the entry's own visibility rule. `INSERT`/`DELETE` require the path's `owner_id` segment to equal `auth.uid()`; `SELECT` requires the same visibility check as `entries`.
- Bucket constraints via dashboard: max file size (e.g. 5MB), `image/*` only.
- Client reads via `createSignedUrl` (not `getPublicUrl`) — this still evaluates the caller's RLS, so a friend who can't see a private entry genuinely can't get a working URL for its photo.
- Replaces the boolean toggle at `AddEntryScreen.tsx:166` with a real `<input type="file" accept="image/*">`, and the two `PhotoBlock` placeholders (`FeedScreen.tsx:~146-163`, `PostDetailOverlay.tsx:28,57,100-116`) with a shared `<EntryPhoto photoPath={...}>` that lazily fetches a signed URL.

## Phase 4 — CHECKPOINT: you create the Supabase project

Pause here. You need to:
1. Create a Supabase project (free tier).
2. Run the Phase 1–3 SQL (I'll write the `.sql` file) in the SQL Editor.
3. Create the `photos` bucket + its storage policies (also SQL, no CLI needed).
4. In Auth settings: enable Email (magic link is default) and Google OAuth (needs a Google Cloud OAuth Client ID/secret from Google Cloud Console, redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`). Set Site URL / Additional Redirect URLs to include `http://localhost:5173` (add the Vercel URL later, Phase 9).
5. Hand back the **Project URL** and **anon/public key** (Settings → API) — nothing else.

## Phase 5 — Auth flow and client scaffolding

- `src/lib/supabase.ts`: client singleton from `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. Add `.env.local` (add `.env*` to `.gitignore`, which currently only has `*.local`).
- `src/lib/api.ts`: `signInWithGoogle`, `signInWithEmailOtp`, `signOut`, `getSession`, `fetchMyProfile`, `upsertHandle`, `searchByHandle`, `fetchMyEntries`, `fetchFeed`, `createEntry`, `updateEntry`, `deleteEntry`, `setEntryVisibility`, `createStubEntries`, `addKudos`/`removeKudos`, `addComment`, `addFriend`, `fetchMyFriends`, `uploadPhoto`, `reportEntry`. Every function returns data pre-shaped to `Entry`/`FriendPost`/`Friend`/`Comment`, mapping the current user's own kudos/comments to the existing `ME_KEY` sentinel (`src/lib/identity.ts`) so components need no rendering-logic changes.
- First-time profile creation: a Postgres trigger on `auth.users` insert (security-definer function) auto-creates a bare `profiles` row — avoids a client-insert race against RLS.
- New `src/screens/ChooseHandleScreen.tsx`: shown when `fetchMyProfile()` has no `handle` yet; slots in before the existing `SignupScreen.tsx` country-pairs flow.

## Phase 6 — Reducer and type rework (unattended)

- `src/state/types.ts`: add `HYDRATE` (payload: profile/entries/friendPosts/friends) and `SIGN_OUT` actions; add `authLoading: boolean` to `AppState`; add `id: string` to `Friend` and `FriendPost`.
- `src/state/reducer.ts`: replace the fake `SIGN_IN` case (line 56) with `HYDRATE`/`SIGN_OUT` handling; change `ADD_FRIEND`, `OPEN_PERSON`, and related lookups (lines 276-308) to key by `id` instead of `name`.
- `src/state/store.tsx`: remove `loadPersisted`/`savePersisted`/`STORAGE_KEY`/`init()` (lines 12-45, 57-59) entirely. Replace with a `useEffect` calling `supabase.auth.getSession()` + `onAuthStateChange`, fetching via `api.ts` and dispatching `HYDRATE`/`SIGN_OUT`.

## Phase 7 — Screen-by-screen wiring

- **`SignInScreen.tsx`**: remove the Apple button. Google button → `api.signInWithGoogle()`. Add a small inline email input (doesn't exist today) → `api.signInWithEmailOtp(email)`, toast "check your email".
- **`SignupScreen.tsx`**: `COMMIT_SIGNUP` site generates `crypto.randomUUID()` per pair, calls `api.createStubEntries(pairs)`.
- **`AddEntryScreen.tsx`**: `OPEN_ADD` allocates an id upfront (create or edit) so the photo picker has somewhere to upload to before Publish. Replace the photo toggle (lines 165-184) with a real file input → `api.uploadPhoto(id, file)`. Wrap the Publish dispatch (`PUBLISH_ADD`) with `api.createEntry`/`api.updateEntry`.
- **`src/ui/Sheet.tsx`**: the `PICK_SHEET` dispatch site branches to also call `api.setEntryVisibility` / `api.deleteEntry` / `api.reportEntry` (edit needs no backend call).
- **`FeedScreen.tsx` / `overlays/PostDetailOverlay.tsx`**: `TOGGLE_KUDOS` sites wrap with `api.addKudos`/`removeKudos`; `SUBMIT_COMMENT` wraps with `api.addComment`; swap `PhotoBlock` placeholders for `<EntryPhoto>`.
- **`overlays/FriendsOverlay.tsx`**: replace the free-text name input with an `@handle` search box → `api.searchByHandle` → `api.addFriend(id)`. Since friend visibility is now strictly own-list-only, drop the `friendsOf` (viewing someone else's list) code path.
- **`overlays/PersonOverlay.tsx`**: drop the friend-count/friend-list button (per the strict-privacy decision); `posts` filter becomes `post.ownerId === p.id`.
- **`ProfileScreen.tsx`**: `SET_PROFILE_NAME` wraps with `api.updateDisplayName`/`api.upsertHandle`.

## Phase 8 — Cleanup

- Confirm no remaining reads of the `been-in:v1` localStorage key (`grep -rn "been-in:v1"`).
- `src/lib/identity.ts` stays as-is — `ME_KEY`/`initialsOf` remain a display convention, not something to remove.

## Phase 9 — CHECKPOINT: deployment

- Vercel: import the existing GitHub repo, set **Root Directory to `app/`** (repo root isn't the Vite project root), set env vars `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (Production + Preview). This needs you to create/connect the Vercel account — I'll give exact steps.
- Back in Supabase Auth settings: add the resulting Vercel URL to Additional Redirect URLs.

## Verification

1. **RLS boundary tests** (before any frontend work): create two real test users in Supabase Auth, query as each (via the dashboard or a scratch script): a private entry from A is invisible to B even after friending; a `pub=true,stub=false` entry from A is invisible to B *until* a friendship row exists; stub entries never leak. Attempt a kudos/comment insert against a private entry as a non-owner — confirm RLS rejects it. Confirm a third user can't read A–B's friendship row.
2. **Photo visibility**: upload to a private entry as A, confirm `createSignedUrl` fails for B; confirm it succeeds once the entry is `pub=true` and they're friends.
3. **Local end-to-end**: run against the real project (`.env.local`), sign in via Google, choose a handle, go through signup pairs, add a real entry with a photo, confirm it appears on your own feed/map.
4. **Friend end-to-end**: after deploying, have a friend sign in on their own phone, add each other by handle, confirm public posts/photos/kudos/comments show up both directions, confirm private entries never appear to them.

### Critical files
`app/src/state/reducer.ts`, `app/src/state/store.tsx`, `app/src/state/types.ts`, `app/src/types.ts`, `app/src/lib/identity.ts` (new: `app/src/lib/supabase.ts`, `app/src/lib/api.ts`, `app/src/screens/ChooseHandleScreen.tsx`), plus the screen-by-screen wiring listed in Phase 7.
