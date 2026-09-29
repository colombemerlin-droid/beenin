-- Been In — backlog names become remembered people; editing a person
-- updates their stories. Paste into the Supabase SQL Editor and run once.

-- ============================================================
-- 1. Earlier backfills stored "who with" as free text (person_name) instead
--    of a remembered person. Turn each distinct name (per account) into a
--    companion — reusing one that already has that name — with the passports
--    logged for them, then link the entries to it.
-- ============================================================

insert into public.companions (owner_id, name, initials, nationalities)
select
  p.owner_id,
  p.name,
  case
    when array_length(regexp_split_to_array(p.name, '\s+'), 1) = 1 then upper(left(p.name, 2))
    else upper(
      left(p.name, 1)
      || left((regexp_split_to_array(p.name, '\s+'))[array_length(regexp_split_to_array(p.name, '\s+'), 1)], 1)
    )
  end,
  p.nats
from (
  select
    e.owner_id,
    min(trim(e.person_name)) as name,
    lower(trim(e.person_name)) as key,
    array(
      select distinct n
      from public.entries e2, unnest(e2.nationality) as n
      where e2.owner_id = e.owner_id
        and e2.companion_id is null
        and lower(trim(e2.person_name)) = lower(trim(e.person_name))
        and n <> 'Unknown'
    ) as nats
  from public.entries e
  where e.companion_id is null and trim(e.person_name) <> '' and not e.map_native
  group by e.owner_id, lower(trim(e.person_name))
) p
where not exists (
  select 1 from public.companions c where c.owner_id = p.owner_id and lower(trim(c.name)) = p.key
);

update public.entries e
set companion_id = c.id, person_name = ''
from public.companions c
where e.companion_id is null
  and trim(e.person_name) <> ''
  and not e.map_native
  and c.owner_id = e.owner_id
  and lower(trim(c.name)) = lower(trim(e.person_name));

-- ============================================================
-- 2. Editing a person (Profile → Names) updates their stories: logged
--    passport stamps follow the new passports, and touching the rows re-runs
--    entries_shared_fields so friends see the new name on shared posts.
-- ============================================================

create function public.companion_changed()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.name is distinct from old.name or new.nationalities is distinct from old.nationalities then
    update public.entries
    set
      nationality = case
        when cardinality(nationality) > 0 and new.nationalities is distinct from old.nationalities then new.nationalities
        else nationality
      end,
      updated_at = now()
    where companion_id = new.id;
  end if;
  return new;
end;
$$;

create trigger companions_changed
  after update on public.companions
  for each row execute function public.companion_changed();
