// Every real server operation lives here. Each function returns data already
// shaped for the reducer/UI — components never touch the Supabase client
// directly.
import { supabase } from './supabase';
import { ME_KEY, initialsOf } from './identity';
import { relativeTime } from '../data/format';
import type { Entry, Companion, Friend, FriendPost, Comment } from '../types';
import type { GroupMap, ServerData } from '../state/types';

// ============================================================
// Write tracking
// Background refreshes skip (or discard) their result while a write is in
// flight, so a refresh can never roll back an optimistic change.
// ============================================================

let writeEpoch = 0;
let inflight = 0;

function track<T>(p: Promise<T>): Promise<T> {
  writeEpoch++;
  inflight++;
  p.finally(() => inflight--).catch(() => {});
  return p;
}

export function writeState(): { epoch: number; idle: boolean } {
  return { epoch: writeEpoch, idle: inflight === 0 };
}

// Rows created moments ago (a companion, map or entry) that a follow-up write
// references — e.g. publish right after "Save person", or a kudos right after
// publishing. The follow-up waits for the row to exist instead of failing its
// foreign key.
const pending = new Map<string, Promise<unknown>>();

function remember<T>(ids: string[], p: Promise<T>): Promise<T> {
  ids.forEach((id) => pending.set(id, p));
  p.finally(() => ids.forEach((id) => pending.get(id) === p && pending.delete(id))).catch(() => {});
  return p;
}

async function ready(...ids: (string | undefined)[]): Promise<void> {
  await Promise.all(ids.map((id) => (id ? pending.get(id)?.catch(() => {}) : undefined)));
}

function check(error: unknown): void {
  if (error) throw error;
}

// ============================================================
// Auth & profile
// ============================================================

export interface ProfileRow {
  handle: string;
  displayName: string;
  handleSet: boolean;
  onboarded: boolean;
}

export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  check(error);
}

export async function signInWithEmailOtp(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  check(error);
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  check(error);
}

export async function fetchMyProfile(userId: string): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from('profiles')
    .select('handle, display_name, handle_set, onboarded')
    .eq('id', userId)
    .single();
  check(error);
  return { handle: data!.handle, displayName: data!.display_name, handleSet: data!.handle_set, onboarded: data!.onboarded };
}

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;

export function isValidHandle(handle: string): boolean {
  return HANDLE_RE.test(handle);
}

// Throws a plain, user-facing message on failure (invalid format or already taken).
export async function claimHandle(userId: string, handle: string): Promise<void> {
  const clean = handle.trim().toLowerCase();
  if (!isValidHandle(clean)) {
    throw new Error('handles are 3-20 characters: lowercase letters, numbers, underscore.');
  }
  // Picking a handle is the whole of onboarding now (backfill lives in Profile).
  const { error } = await supabase.from('profiles').update({ handle: clean, handle_set: true, onboarded: true }).eq('id', userId);
  if (error) {
    if (error.code === '23505') throw new Error(`@${clean} is already taken — try another.`);
    throw error;
  }
}


export function updateDisplayName(userId: string, name: string): Promise<void> {
  return track(
    (async () => {
      const { error } = await supabase.from('profiles').update({ display_name: name }).eq('id', userId);
      check(error);
    })()
  );
}

// ============================================================
// People (other profiles)
// ============================================================

interface PersonInfo {
  name: string;
  handle: string;
  initials: string;
}

async function fetchProfiles(ids: string[]): Promise<Map<string, PersonInfo>> {
  const out = new Map<string, PersonInfo>();
  if (!ids.length) return out;
  const { data, error } = await supabase.from('profiles').select('id, handle, display_name').in('id', ids);
  check(error);
  for (const p of (data || []) as { id: string; handle: string; display_name: string }[]) {
    const name = p.display_name.trim() || `@${p.handle}`;
    out.set(p.id, { name, handle: p.handle, initials: initialsOf(p.display_name) || p.handle.slice(0, 2).toUpperCase() });
  }
  return out;
}

const UNKNOWN_PERSON: PersonInfo = { name: 'Someone', handle: '', initials: '?' };

// Handle search for adding friends. Only people who've actually picked a
// handle show up, never the viewer themselves.
export async function searchProfiles(me: string, query: string): Promise<Friend[]> {
  const q = query.trim().toLowerCase().replace(/^@/, '').replace(/[^a-z0-9_]/g, '');
  if (q.length < 2) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, handle, display_name')
    .eq('handle_set', true)
    .neq('id', me)
    .ilike('handle', `%${q.replace(/_/g, '\\_')}%`)
    .limit(12);
  check(error);
  return ((data || []) as { id: string; handle: string; display_name: string }[]).map((p) => ({
    id: p.id,
    name: p.display_name.trim() || `@${p.handle}`,
    handle: p.handle,
    initials: initialsOf(p.display_name) || p.handle.slice(0, 2).toUpperCase(),
    status: 'not connected yet',
    requestState: 'none',
    requestedAt: 0,
  }));
}

// ============================================================
// Friendships — one canonical row per pair (user_id_1 < user_id_2)
// ============================================================

function pair(a: string, b: string) {
  return a < b ? { user_id_1: a, user_id_2: b } : { user_id_1: b, user_id_2: a };
}

export function sendFriendRequest(me: string, other: string): Promise<void> {
  return track(
    (async () => {
      const { error } = await supabase.from('friendships').insert({ ...pair(me, other), requested_by: me });
      if (error?.code === '23505') throw new Error('you two are already connected — or a request is waiting.');
      check(error);
    })()
  );
}

export function approveFriendRequest(me: string, other: string): Promise<void> {
  return track(
    (async () => {
      const { error } = await supabase.from('friendships').update({ status: 'accepted' }).match(pair(me, other));
      check(error);
    })()
  );
}

// Declines a request, cancels one, or unfriends — the row simply goes away.
export function removeFriendship(me: string, other: string): Promise<void> {
  return track(
    (async () => {
      const { error } = await supabase.from('friendships').delete().match(pair(me, other));
      check(error);
    })()
  );
}

// ============================================================
// Companions & group maps (owner-only)
// ============================================================

export function createCompanion(userId: string, c: Companion): Promise<void> {
  const p = (async () => {
    const { error } = await supabase
      .from('companions')
      .insert({ id: c.id, owner_id: userId, name: c.name, initials: c.initials, nationalities: c.nationalities });
    check(error);
  })();
  return track(remember([c.id], p));
}

// Renaming or changing passports. The server re-derives the stories that
// depend on it (their passport stamps, and the name friends see).
export function updateCompanion(c: Companion): Promise<void> {
  return track(
    (async () => {
      await ready(c.id);
      const { error } = await supabase.from('companions').update({ name: c.name, initials: c.initials, nationalities: c.nationalities }).eq('id', c.id);
      check(error);
    })()
  );
}

// Deletes a person from Names and everything logged only through them. Stories
// go first: their foreign keys would otherwise just be set to null, leaving
// orphans. Kudos and comments on those stories cascade with them.
export function deletePerson(p: { companionId?: string; mapId?: string; photoPaths: string[] }): Promise<void> {
  return track(
    (async () => {
      await ready(p.companionId, p.mapId);
      if (p.companionId) {
        const r1 = await supabase.from('entries').delete().eq('companion_id', p.companionId);
        check(r1.error);
        const r2 = await supabase.from('companions').delete().eq('id', p.companionId);
        check(r2.error);
      }
      if (p.mapId) {
        const r3 = await supabase.from('entries').delete().eq('map_id', p.mapId).eq('map_native', true);
        check(r3.error);
        const r4 = await supabase.from('group_maps').delete().eq('id', p.mapId);
        check(r4.error);
      }
      if (p.photoPaths.length) await supabase.storage.from('photos').remove(p.photoPaths);
    })()
  );
}

export function createMap(userId: string, m: { id: string; name: string; nationalities: string[]; companionId?: string }): Promise<void> {
  const p = (async () => {
    await ready(m.companionId);
    const row: Record<string, unknown> = { id: m.id, owner_id: userId, name: m.name, nationalities: m.nationalities };
    if (m.companionId) row.companion_id = m.companionId;
    let { error } = await supabase.from('group_maps').insert(row);
    // Before migration 0005 there's no companion_id column — save the map anyway.
    if (error?.code === '42703' || error?.code === 'PGRST204') {
      delete row.companion_id;
      ({ error } = await supabase.from('group_maps').insert(row));
    }
    check(error);
  })();
  return track(remember([m.id], p));
}

// Removes only the map. Countries pinned to an older map (no person) become
// ordinary entries first — with its person or passports — so nothing leaves
// the general maps; other entries' map link is cleared by the foreign key.
export function deleteMap(mapId: string, keep: { companionId?: string; nationalities: string[] }): Promise<void> {
  return track(
    (async () => {
      await ready(mapId);
      const patch: Record<string, unknown> = { map_native: false, map_id: null, nationality: keep.nationalities };
      if (keep.companionId) patch.companion_id = keep.companionId;
      const r1 = await supabase.from('entries').update(patch).eq('map_id', mapId).eq('map_native', true);
      check(r1.error);
      const r2 = await supabase.from('group_maps').delete().eq('id', mapId);
      check(r2.error);
    })()
  );
}

// Maps gained a person (companion_id) in migration 0005; until it's run, load
// maps without it rather than failing the whole account.
async function fetchMaps(me: string): Promise<{ id: string; name: string; nationalities: string[] | null; companion_id?: string | null }[]> {
  const withPerson = await supabase.from('group_maps').select('id, name, nationalities, companion_id').eq('owner_id', me).order('created_at');
  if (!withPerson.error) return withPerson.data || [];
  if (withPerson.error.code !== '42703') throw withPerson.error;
  const plain = await supabase.from('group_maps').select('id, name, nationalities').eq('owner_id', me).order('created_at');
  check(plain.error);
  return plain.data || [];
}

export function updateMap(id: string, patch: { name?: string; nationalities?: string[] }): Promise<void> {
  return track(
    (async () => {
      await ready(id);
      const { error } = await supabase.from('group_maps').update(patch).eq('id', id);
      check(error);
    })()
  );
}

// ============================================================
// Entries
// ============================================================

// The DB-backed subset of an Entry. ord/when are derived from created_at,
// kudos/comments live in their own tables.
export type EntryFields = Pick<
  Entry,
  | 'country'
  | 'nationality'
  | 'city'
  | 'date'
  | 'name'
  | 'companionId'
  | 'mapId'
  | 'hideName'
  | 'metDateNumber'
  | 'metDateLocation'
  | 'note'
  | 'emoji'
  | 'place'
  | 'placePub'
  | 'photoPath'
  | 'pub'
  | 'stub'
> & {
  // Logged directly on a group map, rather than a personal story linked to one.
  mapNative?: boolean;
};

function toRow(f: Partial<EntryFields>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (f.country !== undefined) row.country = f.country;
  if (f.nationality !== undefined) row.nationality = f.nationality;
  if (f.city !== undefined) row.city = f.city || null;
  if (f.date !== undefined) row.date = f.date || null; // '' isn't a valid Postgres date
  // A companion carries the name itself; the free-text column is only for legacy entries.
  if (f.name !== undefined) row.person_name = f.companionId ? '' : f.name;
  if ('companionId' in f) row.companion_id = f.companionId || null;
  if ('mapId' in f) row.map_id = f.mapId || null;
  if (f.mapNative !== undefined) row.map_native = f.mapNative;
  if (f.hideName !== undefined) row.hide_name = f.hideName;
  if ('metDateNumber' in f) row.met_date_number = f.metDateNumber || null;
  if ('metDateLocation' in f) row.met_date_location = f.metDateLocation || null;
  if (f.note !== undefined) row.note = f.note;
  if (f.emoji !== undefined) row.emoji = f.emoji;
  if (f.place !== undefined) row.place = f.place;
  if (f.placePub !== undefined) row.place_public = f.placePub;
  if (f.photoPath !== undefined) row.photo_path = f.photoPath || null;
  if (f.pub !== undefined) row.pub = f.pub;
  if (f.stub !== undefined) row.stub = f.stub;
  return row;
}

export function createEntries(userId: string, entries: { id: string; fields: EntryFields }[]): Promise<void> {
  if (!entries.length) return Promise.resolve();
  const p = (async () => {
    await ready(...entries.flatMap((e) => [e.fields.companionId, e.fields.mapId]));
    const { error } = await supabase.from('entries').insert(entries.map((e) => ({ id: e.id, owner_id: userId, ...toRow(e.fields) })));
    check(error);
  })();
  return track(
    remember(
      entries.map((e) => e.id),
      p
    )
  );
}

export function createEntry(userId: string, id: string, f: EntryFields): Promise<void> {
  return createEntries(userId, [{ id, fields: f }]);
}

export function updateEntry(id: string, f: Partial<EntryFields>): Promise<void> {
  return track(
    (async () => {
      await ready(id, f.companionId, f.mapId);
      const { error } = await supabase
        .from('entries')
        .update({ ...toRow(f), updated_at: new Date().toISOString() })
        .eq('id', id);
      check(error);
    })()
  );
}

export function deleteEntry(id: string, photoPath?: string): Promise<void> {
  return track(
    (async () => {
      await ready(id);
      const { error } = await supabase.from('entries').delete().eq('id', id);
      check(error);
      if (photoPath) await supabase.storage.from('photos').remove([photoPath]);
    })()
  );
}

// ============================================================
// Kudos & comments
// ============================================================

export function addKudos(entryId: string, userId: string): Promise<void> {
  return track(
    (async () => {
      await ready(entryId);
      // Already there (e.g. a double tap) is fine, not an error.
      const { error } = await supabase
        .from('kudos')
        .upsert({ entry_id: entryId, user_id: userId }, { onConflict: 'entry_id,user_id', ignoreDuplicates: true });
      check(error);
    })()
  );
}

export function removeKudos(entryId: string, userId: string): Promise<void> {
  return track(
    (async () => {
      await ready(entryId);
      const { error } = await supabase.from('kudos').delete().eq('entry_id', entryId).eq('user_id', userId);
      check(error);
    })()
  );
}

export function addComment(entryId: string, authorId: string, text: string): Promise<void> {
  return track(
    (async () => {
      await ready(entryId);
      const { error } = await supabase.from('comments').insert({ entry_id: entryId, author_id: authorId, text });
      check(error);
    })()
  );
}

// No workflow — reports are reviewed straight from the Supabase table editor.
export function reportEntry(entryId: string, me: string): Promise<void> {
  return track(
    (async () => {
      const { error } = await supabase.from('reports').insert({ entry_id: entryId, reporter_id: me });
      check(error);
    })()
  );
}

// ============================================================
// Photos (private `photos` bucket, path {owner}/{entry}/{file})
// ============================================================

const MAX_EDGE = 1600;

// Phone photos are often over the bucket's 5MB cap — re-encode to a
// reasonably sized JPEG first. Falls back to the original if the browser
// can't decode it (the bucket still accepts png/jpeg/webp/heic).
async function downscale(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (blob) return blob;
  } catch {
    // fall through to the original file
  }
  return file;
}

export async function uploadPhoto(userId: string, entryId: string, file: File): Promise<string> {
  const blob = await downscale(file);
  const ext = blob.type === 'image/jpeg' ? 'jpg' : (file.name.split('.').pop() || 'img').toLowerCase();
  const path = `${userId}/${entryId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('photos').upload(path, blob, { contentType: blob.type || file.type });
  check(error);
  return path;
}

const urlCache = new Map<string, { url: string; expires: number }>();
const URL_TTL = 60 * 60; // seconds

// Signed URLs still go through the bucket's RLS, so a friend who can't see an
// entry can't get a working link to its photo either.
export async function photoUrl(path: string): Promise<string> {
  const hit = urlCache.get(path);
  if (hit && hit.expires > Date.now()) return hit.url;
  const { data, error } = await supabase.storage.from('photos').createSignedUrl(path, URL_TTL);
  check(error);
  urlCache.set(path, { url: data!.signedUrl, expires: Date.now() + (URL_TTL - 60) * 1000 });
  return data!.signedUrl;
}

// ============================================================
// Loading everything the viewer can see
// ============================================================

// Friends can read every column below; the raw private person_name/place are
// owner-only and come from my_entry_private() instead.
const ENTRY_COLS =
  'id, owner_id, companion_id, map_id, map_native, country, nationality, city, date, hide_name, met_date_number, met_date_location, note, emoji, place_public, pub, stub, photo_path, shared_name, shared_place, created_at, kudos(user_id), comments(author_id, text, created_at)';

interface EntryRow {
  id: string;
  owner_id: string;
  companion_id: string | null;
  map_id: string | null;
  map_native: boolean;
  country: string;
  nationality: string[] | null;
  city: string | null;
  date: string | null;
  hide_name: boolean;
  met_date_number: string | null;
  met_date_location: string | null;
  note: string;
  emoji: string;
  place_public: boolean;
  pub: boolean;
  stub: boolean;
  photo_path: string | null;
  shared_name: string | null;
  shared_place: string | null;
  created_at: string;
  kudos: { user_id: string }[] | null;
  comments: { author_id: string; text: string; created_at: string }[] | null;
}

type People = Map<string, PersonInfo>;

function reactions(r: EntryRow, me: string, people: People) {
  const kudos = r.kudos || [];
  const comments: Comment[] = (r.comments || [])
    .slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((c) => {
      const p = people.get(c.author_id) || UNKNOWN_PERSON;
      return { who: p.name, initials: c.author_id === me ? ME_KEY : p.initials, text: c.text, when: relativeTime(c.created_at) };
    });
  return {
    kudos: kudos.map((k) => (k.user_id === me ? ME_KEY : (people.get(k.user_id) || UNKNOWN_PERSON).initials)),
    kudosBy: kudos.map((k) => (people.get(k.user_id) || UNKNOWN_PERSON).name),
    iK: kudos.some((k) => k.user_id === me),
    comments,
  };
}

function rowToEntry(r: EntryRow, me: string, people: People, priv: { person_name: string; place: string } | undefined): Entry {
  return {
    id: r.id,
    companionId: r.companion_id || undefined,
    mapId: r.map_id || undefined,
    country: r.country || '',
    nationality: r.nationality || [],
    city: r.city || '',
    date: r.date || '',
    name: priv?.person_name || '',
    hideName: r.hide_name,
    metDateNumber: r.met_date_number || undefined,
    metDateLocation: r.met_date_location || undefined,
    note: r.note || '',
    emoji: r.emoji || '',
    place: priv?.place || '',
    placePub: r.place_public,
    photoPath: r.photo_path || '',
    pub: r.pub,
    stub: r.stub,
    // Smaller = more recent, matching the feed/notifications sort.
    ord: -new Date(r.created_at).getTime(),
    when: r.stub ? 'backfilled' : relativeTime(r.created_at),
    ...reactions(r, me, people),
  };
}

function rowToFriendPost(r: EntryRow, me: string, people: People): FriendPost {
  const owner = people.get(r.owner_id) || UNKNOWN_PERSON;
  return {
    id: r.id,
    ownerId: r.owner_id,
    who: owner.name,
    initials: owner.initials,
    country: r.country || '',
    nationality: (r.nationality || []).filter(Boolean).join(' · '),
    place: r.shared_place || '',
    companionName: r.shared_name || undefined,
    metDateNumber: r.met_date_number || undefined,
    metDateLocation: r.met_date_location || undefined,
    date: r.date || '',
    note: r.note || '',
    emoji: r.emoji || '',
    photoPath: r.photo_path || '',
    when: relativeTime(r.created_at),
    ord: -new Date(r.created_at).getTime(),
    ...reactions(r, me, people),
  };
}

interface FriendshipRow {
  user_id_1: string;
  user_id_2: string;
  requested_by: string;
  status: 'pending' | 'accepted';
  created_at: string;
}

export async function loadAccount(me: string, myName: string): Promise<ServerData> {
  const [own, priv, comps, mapRows, fships] = await Promise.all([
    supabase.from('entries').select(ENTRY_COLS).eq('owner_id', me).order('created_at', { ascending: false }),
    supabase.rpc('my_entry_private'),
    supabase.from('companions').select('id, name, initials, nationalities').eq('owner_id', me).order('created_at'),
    fetchMaps(me),
    supabase.from('friendships').select('user_id_1, user_id_2, requested_by, status, created_at'),
  ]);
  [own, priv, comps, fships].forEach((r) => check(r.error));

  const ownRows = (own.data || []) as unknown as EntryRow[];
  const friendships = (fships.data || []) as FriendshipRow[];
  const other = (f: FriendshipRow) => (f.user_id_1 === me ? f.user_id_2 : f.user_id_1);
  const friendIds = friendships.filter((f) => f.status === 'accepted').map(other);

  let friendRows: EntryRow[] = [];
  if (friendIds.length) {
    const { data, error } = await supabase
      .from('entries')
      .select(ENTRY_COLS)
      .in('owner_id', friendIds)
      .eq('map_native', false)
      .order('created_at', { ascending: false })
      .limit(200);
    check(error);
    friendRows = (data || []) as unknown as EntryRow[];
  }

  const ids = new Set(friendships.map(other));
  for (const r of [...ownRows, ...friendRows]) {
    r.kudos?.forEach((k) => ids.add(k.user_id));
    r.comments?.forEach((c) => ids.add(c.author_id));
  }
  ids.delete(me);
  const people = await fetchProfiles([...ids]);
  people.set(me, { name: myName.trim() || 'You', handle: '', initials: ME_KEY });

  const privById = new Map(((priv.data || []) as { id: string; person_name: string; place: string }[]).map((p) => [p.id, p]));
  const toEntry = (r: EntryRow) => rowToEntry(r, me, people, privById.get(r.id));

  const groupMaps: GroupMap[] = mapRows.map((m) => ({
    id: m.id,
    name: m.name,
    companionId: m.companion_id || undefined,
    nationalities: m.nationalities || [],
    entries: ownRows.filter((r) => r.map_native && r.map_id === m.id).map(toEntry),
  }));

  const friends: Friend[] = friendships.map((f) => {
    const id = other(f);
    const p = people.get(id) || UNKNOWN_PERSON;
    const requestState = f.status === 'accepted' ? 'accepted' : f.requested_by === me ? 'pending_out' : 'pending_in';
    const status = requestState === 'accepted' ? `@${p.handle}` : requestState === 'pending_out' ? 'request sent' : 'wants to be friends';
    return { id, name: p.name, handle: p.handle, initials: p.initials, status, requestState, requestedAt: new Date(f.created_at).getTime() };
  });

  return {
    entries: ownRows.filter((r) => !r.map_native).map(toEntry),
    companions: ((comps.data || []) as { id: string; name: string; initials: string; nationalities: string[] | null }[]).map((c) => ({
      id: c.id,
      name: c.name,
      initials: c.initials,
      nationalities: c.nationalities || [],
    })),
    maps: groupMaps,
    friends,
    friendPosts: friendRows.map((r) => rowToFriendPost(r, me, people)),
  };
}

// ============================================================
// One-time local → server migration
// ============================================================

export function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export interface LocalData {
  entries: Entry[];
  companions: Companion[];
  maps: GroupMap[];
}

// Uploads what only ever lived in this browser's localStorage (pre-backend
// test data), so signing in doesn't make it vanish. Pre-backend ids weren't
// UUIDs, so rows get fresh ids and entry → companion/map links are remapped.
// `people` = companions + personal entries (only when the account has none
// yet); `maps` = group maps + their countries (only when it has no maps yet).
export async function migrateLocalData(
  userId: string,
  local: LocalData,
  what: { people: boolean; maps: boolean; serverMapIds: string[] }
): Promise<void> {
  const fresh = (id: string) => (isUuid(id) ? id : crypto.randomUUID());
  const mapIds = new Map<string, string>(what.serverMapIds.map((id) => [id, id]));

  if (what.maps) {
    for (const m of local.maps) {
      const id = fresh(m.id);
      mapIds.set(m.id, id);
      await createMap(userId, { id, name: m.name, nationalities: m.nationalities });
      await createEntries(
        userId,
        m.entries.map((e) => ({ id: fresh(e.id), fields: { ...e, photoPath: '', companionId: undefined, mapId: id, mapNative: true } }))
      );
    }
  }

  if (what.people) {
    const companionIds = new Map<string, string>();
    for (const c of local.companions) {
      const id = fresh(c.id);
      companionIds.set(c.id, id);
      await createCompanion(userId, { ...c, id });
    }
    await createEntries(
      userId,
      local.entries.map((e) => ({
        id: fresh(e.id),
        fields: {
          ...e,
          photoPath: '', // pre-backend "photos" were placeholders with no image behind them
          companionId: e.companionId ? companionIds.get(e.companionId) : undefined,
          mapId: e.mapId ? mapIds.get(e.mapId) : undefined,
        },
      }))
    );
  } else if (what.maps) {
    // Personal entries already on the server keep their UUIDs — relink them.
    await Promise.all(
      local.entries
        .filter((e) => e.mapId && isUuid(e.id) && mapIds.has(e.mapId))
        .map((e) => updateEntry(e.id, { mapId: mapIds.get(e.mapId!) }))
    );
  }
}
