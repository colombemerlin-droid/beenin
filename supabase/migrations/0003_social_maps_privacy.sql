-- Been In — group maps on the server, friend-safe entry fields, and
-- friendship hardening. Paste into the Supabase SQL Editor and run once.

-- ============================================================
-- Entries: map-native rows + friend-safe computed columns
-- ============================================================

alter table public.entries
  -- A country logged directly on a group map (backfill / "Add to a map"),
  -- as opposed to a personal story that merely links to a map via map_id.
  add column map_native boolean not null default false,
  -- What a friend is allowed to see, computed server-side on every write:
  -- the companion's name only when the post is public and not hidden, the
  -- place only when marked shareable.
  add column shared_name text,
  add column shared_place text;

create function public.entries_shared_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.shared_name := case
    when new.pub and not new.hide_name
      then (select c.name from public.companions c where c.id = new.companion_id)
  end;
  new.shared_place := case when new.place_public and new.place <> '' then new.place end;
  return new;
end;
$$;

create trigger entries_shared_fields
  before insert or update on public.entries
  for each row execute function public.entries_shared_fields();

-- Companion-linked entries carry the name through companion_id now, so drop
-- the duplicated copy (and fire the trigger for every existing row).
update public.entries
set person_name = case when companion_id is not null then '' else person_name end;

-- ============================================================
-- Column-level privacy on entries
-- RLS is per-row: a friend who can see a public row could otherwise read
-- every column of it. Friends get everything except the raw private
-- person_name/place; the owner reads those through my_entry_private().
-- ============================================================

revoke select on public.entries from anon, authenticated;
grant select (
  id, owner_id, companion_id, map_id, map_native, country, nationality, city, date,
  hide_name, met_date_number, met_date_location, note, emoji, place_public, pub, stub,
  photo_path, shared_name, shared_place, created_at, updated_at
) on public.entries to authenticated;

create function public.my_entry_private()
returns table (id uuid, person_name text, place text)
language sql
security definer
set search_path = public
stable
as $$
  select e.id, e.person_name, e.place from public.entries e where e.owner_id = auth.uid();
$$;

revoke all on function public.my_entry_private() from public, anon;
grant execute on function public.my_entry_private() to authenticated;

-- ============================================================
-- Friendship hardening
-- 0001 let the requester insert a row that was already 'accepted', and let
-- the other party rewrite user_id_1/user_id_2 while accepting. Requests now
-- always start pending, and accepting can only ever touch `status`.
-- ============================================================

drop policy "friendships_insert" on public.friendships;
create policy "friendships_insert" on public.friendships
  for insert with check (
    requested_by = auth.uid()
    and auth.uid() in (user_id_1, user_id_2)
    and status = 'pending'
  );

drop policy "friendships_update_accept" on public.friendships;
create policy "friendships_update_accept" on public.friendships
  for update using (
    auth.uid() in (user_id_1, user_id_2)
    and auth.uid() <> requested_by
  ) with check (
    status = 'accepted'
    and auth.uid() in (user_id_1, user_id_2)
    and auth.uid() <> requested_by
  );

revoke update on public.friendships from anon, authenticated;
grant update (status) on public.friendships to authenticated;

-- ============================================================
-- Handles: enforce the same format the app validates.
-- (The auto-generated placeholder "user_xxxxxxxx" already matches.)
-- ============================================================

alter table public.profiles
  add constraint profiles_handle_format check (handle ~ '^[a-z0-9_]{3,20}$');
