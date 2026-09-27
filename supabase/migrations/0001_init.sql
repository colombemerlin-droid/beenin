-- Been In — initial schema, RLS policies, and storage setup.
-- Corresponds to docs/backend-migration-plan.md, Phases 1-3.
-- Paste this whole file into the Supabase SQL Editor and run it once.

-- ============================================================
-- Extensions
-- ============================================================
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ============================================================
-- Phase 1 — Tables
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  handle text not null unique,
  display_name text not null default '',
  created_at timestamptz not null default now()
);

create table public.companions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles on delete cascade,
  name text not null,
  initials text not null,
  nationalities text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.group_maps (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles on delete cascade,
  name text not null,
  nationalities text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles on delete cascade,
  companion_id uuid references public.companions on delete set null,
  map_id uuid references public.group_maps on delete set null,
  country text not null default '',
  nationality text[] not null default '{}',
  city text,
  date date,
  person_name text not null default '', -- legacy free-text name (pre-Companion entries)
  hide_name boolean not null default false,
  met_date_number text,
  met_date_location text,
  note text not null default '',
  emoji text not null default '',
  place text not null default '',
  place_public boolean not null default true,
  pub boolean not null default false,
  stub boolean not null default false,
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.kudos (
  entry_id uuid not null references public.entries on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (entry_id, user_id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries on delete cascade,
  author_id uuid not null references public.profiles on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create table public.friendships (
  user_id_1 uuid not null references public.profiles on delete cascade,
  user_id_2 uuid not null references public.profiles on delete cascade,
  requested_by uuid not null references public.profiles on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (user_id_1, user_id_2),
  constraint friendships_ordered check (user_id_1 < user_id_2),
  constraint friendships_requester_is_party check (requested_by in (user_id_1, user_id_2))
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries on delete cascade,
  reporter_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Auto-create a bare profile row when a new auth user signs up.
-- Avoids a client-side insert racing against RLS.
-- Handle is a temporary placeholder ("user_<8 hex chars>") — the client
-- overwrites it via ChooseHandleScreen -> upsertHandle() on first login.
-- ============================================================

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, handle)
  values (new.id, 'user_' || substr(replace(new.id::text, '-', ''), 1, 8));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Phase 2 — Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.companions enable row level security;
alter table public.group_maps enable row level security;
alter table public.entries enable row level security;
alter table public.kudos enable row level security;
alter table public.comments enable row level security;
alter table public.friendships enable row level security;
alter table public.reports enable row level security;

-- is_friend: true only for an ACCEPTED friendship row between a and b.
-- A merely-pending request grants no visibility.
create function public.is_friend(a uuid, b uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and (
        (f.user_id_1 = a and f.user_id_2 = b) or
        (f.user_id_1 = b and f.user_id_2 = a)
      )
  );
$$;

-- profiles: anyone signed in can look up handle/display_name (needed for
-- friend search); a user may only write their own row.
create policy "profiles_select_any_authenticated" on public.profiles
  for select using (auth.uid() is not null);
create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

-- companions: strictly owner-only, never shared.
create policy "companions_all_own" on public.companions
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- group_maps: strictly owner-only, never shared.
create policy "group_maps_all_own" on public.group_maps
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- entries: the core privacy boundary. Owner sees everything; a friend sees
-- only public, non-stub entries.
create policy "entries_select" on public.entries
  for select using (
    owner_id = auth.uid()
    or (pub = true and stub = false and public.is_friend(auth.uid(), owner_id))
  );
create policy "entries_insert_own" on public.entries
  for insert with check (owner_id = auth.uid());
create policy "entries_update_own" on public.entries
  for update using (owner_id = auth.uid());
create policy "entries_delete_own" on public.entries
  for delete using (owner_id = auth.uid());

-- kudos: visible/insertable only against a visible entry; a user can only
-- act as themselves, and can only remove their own kudos.
create policy "kudos_select" on public.kudos
  for select using (
    exists (select 1 from public.entries e where e.id = entry_id
      and (e.owner_id = auth.uid() or (e.pub = true and e.stub = false and public.is_friend(auth.uid(), e.owner_id))))
  );
create policy "kudos_insert" on public.kudos
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.entries e where e.id = entry_id
      and (e.owner_id = auth.uid() or (e.pub = true and e.stub = false and public.is_friend(auth.uid(), e.owner_id))))
  );
create policy "kudos_delete_own" on public.kudos
  for delete using (user_id = auth.uid());

-- comments: same visibility gate as kudos; a user can only author as themselves.
create policy "comments_select" on public.comments
  for select using (
    exists (select 1 from public.entries e where e.id = entry_id
      and (e.owner_id = auth.uid() or (e.pub = true and e.stub = false and public.is_friend(auth.uid(), e.owner_id))))
  );
create policy "comments_insert" on public.comments
  for insert with check (
    author_id = auth.uid()
    and exists (select 1 from public.entries e where e.id = entry_id
      and (e.owner_id = auth.uid() or (e.pub = true and e.stub = false and public.is_friend(auth.uid(), e.owner_id))))
  );

-- friendships: strictly two-party. Only a party can see the row. Only the
-- requester can create it (as 'pending'). Only the NON-requester can accept
-- it — this is what makes Approve/Decline a real, server-enforced flow.
-- Either party can delete (decline a pending request, or unfriend).
create policy "friendships_select" on public.friendships
  for select using (auth.uid() in (user_id_1, user_id_2));
create policy "friendships_insert" on public.friendships
  for insert with check (
    requested_by = auth.uid()
    and auth.uid() in (user_id_1, user_id_2)
  );
create policy "friendships_update_accept" on public.friendships
  for update using (
    auth.uid() in (user_id_1, user_id_2)
    and auth.uid() <> requested_by
  ) with check (
    status = 'accepted'
  );
create policy "friendships_delete" on public.friendships
  for delete using (auth.uid() in (user_id_1, user_id_2));

-- reports: write-only for regular users. No select policy is added on
-- purpose — reports are read from the Supabase table editor by you, not by
-- app users.
create policy "reports_insert" on public.reports
  for insert with check (reporter_id = auth.uid());

-- ============================================================
-- Phase 3 — Storage
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

-- Path convention: {owner_id}/{entry_id}/{uuid}.{ext}
-- storage.foldername(name) splits the object path into an array of its
-- folder segments, e.g. '{owner_id}/{entry_id}/file.jpg' -> {owner_id, entry_id}.

create policy "photos_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "photos_delete_own" on storage.objects
  for delete using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Select inherits the referenced entry's own visibility rule, so a friend
-- who can't see a private entry can't get a working signed URL for its photo.
create policy "photos_select_visible" on storage.objects
  for select using (
    bucket_id = 'photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.entries e
        where e.id::text = (storage.foldername(name))[2]
          and e.pub = true and e.stub = false
          and public.is_friend(auth.uid(), e.owner_id)
      )
    )
  );
