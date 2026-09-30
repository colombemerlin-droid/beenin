-- Been In — a relationship map is for you and one person.
-- Paste into the Supabase SQL Editor and run once.

-- Who the map is with. Deleting the person unlinks the map (it doesn't delete
-- it); deleting the map never touches the person or their entries.
alter table public.group_maps
  add column companion_id uuid references public.companions on delete set null;

-- Maps made before this were paired with a person only by having the same
-- name. Make that link explicit.
update public.group_maps m
set companion_id = c.id
from public.companions c
where m.companion_id is null
  and c.owner_id = m.owner_id
  and lower(trim(c.name)) = lower(trim(m.name));

-- Countries pinned to a now-linked map become ordinary entries with its
-- person, so they count as logged with them and survive the map being deleted.
update public.entries e
set map_native = false,
    companion_id = m.companion_id,
    nationality = case when cardinality(e.nationality) > 0 then e.nationality else m.nationalities end
from public.group_maps m
where e.map_id = m.id
  and e.map_native
  and m.companion_id is not null;
