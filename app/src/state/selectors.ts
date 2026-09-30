import { byCountry, natToCountry, CONTINENTS, pct, type ContinentCode } from '../data/countries';
import { ME_KEY, initialsOf } from '../lib/identity';
import type { AppState, GroupMap } from './types';
import type { Entry, NotificationItem, Companion } from '../types';

export function beenCountries(state: AppState): string[] {
  const set = new Set<string>();
  state.entries.forEach((e) => e.country && set.add(e.country));
  // A country logged on any group map also colors the general "Been" map (unconditional propagation).
  state.maps.forEach((m) => m.entries.forEach((e) => e.country && set.add(e.country)));
  return [...set];
}

export function natsLogged(state: AppState): string[] {
  const set = new Set<string>();
  state.entries.forEach((e) => e.nationality.forEach((n) => n && set.add(n)));
  // A group map's nationalities propagate to "Been In" once that map has at least one entry.
  state.maps.forEach((m) => {
    if (m.entries.length) m.nationalities.forEach((n) => n && set.add(n));
  });
  return [...set];
}

export function natCountries(state: AppState): string[] {
  return [...new Set(natsLogged(state).map(natToCountry))];
}

export function activeForSide(state: AppState): string[] {
  return state.side === 0 ? beenCountries(state) : natCountries(state);
}

export interface ContinentStat {
  name: string;
  frac: string;
  pct: string;
  bar: string;
  color: string;
  n: number;
  total: number;
}

export function continentBreakdown(activeCountries: string[]): ContinentStat[] {
  const counts: Partial<Record<ContinentCode, number>> = {};
  activeCountries.forEach((c) => {
    const p = byCountry(c);
    if (p) counts[p.continent] = (counts[p.continent] || 0) + 1;
  });
  const ink = '#1F1A17';
  const ink40 = '#A39A92';
  return (Object.keys(CONTINENTS) as ContinentCode[])
    .map((k) => {
      const { name, total } = CONTINENTS[k];
      const n = counts[k] || 0;
      const v = (n / total) * 100;
      return {
        name,
        frac: `${n}/${total}`,
        pct: v.toFixed(1) + '%',
        bar: Math.max(v, n ? 2 : 0) + '%',
        color: n ? ink : ink40,
        n,
        total,
      };
    })
    .sort((x, y) => y.n / y.total - x.n / x.total);
}

export function touchedContinents(activeCountries: string[]): number {
  const set = new Set<ContinentCode>();
  activeCountries.forEach((c) => {
    const p = byCountry(c);
    if (p) set.add(p.continent);
  });
  return set.size;
}

export interface ContinentGroup {
  continent: string;
  countries: string[];
}

// Groups a list of country names by continent (continents ordered by display name,
// countries alphabetical within each). Unrecognized entries (e.g. "Unknown") are
// left out — callers append them as a trailing group if they want them shown.
export function continentGroups(countries: string[]): ContinentGroup[] {
  const byContinent: Partial<Record<ContinentCode, string[]>> = {};
  countries.forEach((c) => {
    const p = byCountry(c);
    if (!p) return;
    (byContinent[p.continent] ||= []).push(c);
  });
  return (Object.keys(CONTINENTS) as ContinentCode[])
    .filter((k) => byContinent[k] && byContinent[k]!.length)
    .map((k) => ({ continent: CONTINENTS[k].name, countries: byContinent[k]!.slice().sort((a, b) => a.localeCompare(b)) }))
    .sort((a, b) => a.continent.localeCompare(b.continent));
}

export function entryNats(e: Entry): string[] {
  return e.nationality.filter(Boolean);
}

export function natLabel(e: Entry): string {
  return entryNats(e).join(' · ');
}

const MAX_NOTIFICATIONS = 20;

// Kudos/comments have no real timestamp in this app's data model (everything is
// relative-label strings, e.g. "just now"), so recency is derived from each entry's
// existing `ord` (lower = more recent, the same convention the feed already sorts by),
// and "aging out" is a length cap rather than a real time window.
export function notificationFeed(state: AppState): NotificationItem[] {
  const items: NotificationItem[] = [];
  const now = new Date();

  state.entries.forEach((e) => {
    e.kudos.forEach((initials, i) => {
      if (initials === ME_KEY) return;
      items.push({ kind: 'kudos', id: `k-${e.id}-${i}`, entryId: e.id, who: e.kudosBy?.[i] || initials, initials, country: e.country, ord: e.ord });
    });
    e.comments.forEach((c, i) => {
      if (c.initials === ME_KEY) return;
      items.push({ kind: 'comment', id: `c-${e.id}-${i}`, entryId: e.id, who: c.who, initials: c.initials, country: e.country, text: c.text, ord: e.ord });
    });
    if (e.date) {
      const d = new Date(e.date);
      if (!Number.isNaN(d.getTime()) && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()) {
        const years = now.getFullYear() - d.getFullYear();
        if (years > 0) {
          items.push({ kind: 'memory', id: `m-${e.id}`, entryId: e.id, years, country: e.country, emoji: e.emoji, ord: e.ord });
        }
      }
    }
  });

  items.sort((a, b) => a.ord - b.ord);
  return items.slice(0, MAX_NOTIFICATIONS);
}

export { pct };

// Profile → Names: remembered people, plus the person behind each
// relationship map (merged when the map is named after them).
export interface NameRow {
  id: string; // companion id, or map id for a map with no matching person
  name: string;
  initials: string;
  nationalities: string[];
  countries: string[]; // "Been In": countries logged with them (stories, backfill, their map)
  stories: number; // everything logged with them, of any kind
  hasMap: boolean;
}

const norm = (name: string) => name.trim().toLowerCase();

// A map named after a remembered person is that person's map.
export function sameName(a: string, b: string): boolean {
  return norm(a) === norm(b);
}

const unique = (xs: string[]) => [...new Set(xs.filter(Boolean))].sort((a, b) => a.localeCompare(b));

// Who a relationship map is with. Maps made before maps had a person fall back
// to a remembered person with the map's name.
export function mapPerson(state: AppState, m: GroupMap): Companion | undefined {
  if (m.companionId) return state.companions.find((c) => c.id === m.companionId);
  return state.companions.find((c) => sameName(c.name, m.name));
}

// The map's countries: everything logged with its person, anywhere (stories,
// backfills, countries added on the map), plus what's pinned to the map itself.
export function mapCountries(state: AppState, m: GroupMap): string[] {
  const person = mapPerson(state, m);
  const logged = state.entries.filter((e) => e.mapId === m.id || (person && e.companionId === person.id));
  return unique([...m.entries, ...logged].map((e) => e.country));
}

// Everyone logged: any history at all keeps a person here — a "We met", a plain
// story, a backfill, a map. The "Been In" view is the subset with countries.
export function nameRows(state: AppState): NameRow[] {
  const rows: NameRow[] = state.companions.map((c) => {
    const map = state.maps.find((m) => mapPerson(state, m)?.id === c.id);
    const theirs = state.entries.filter((e) => e.companionId === c.id);
    return {
      id: c.id,
      name: c.name,
      initials: c.initials,
      nationalities: c.nationalities,
      countries: unique([...theirs.map((e) => e.country), ...(map ? mapCountries(state, map) : [])]),
      stories: theirs.length + (map ? map.entries.length : 0),
      hasMap: !!map,
    };
  });
  for (const m of state.maps) {
    if (mapPerson(state, m)) continue;
    rows.push({
      id: m.id,
      name: m.name,
      initials: initialsOf(m.name) || '??',
      nationalities: m.nationalities,
      countries: unique(mapCountries(state, m)),
      stories: m.entries.length,
      hasMap: true,
    });
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

// Everything that goes when a person is deleted from Names: the remembered
// person, every story/backfill logged with them, and their map (named after
// them, or the map itself for a map-only person) with the countries on it.
export interface PersonFootprint {
  name: string;
  companionId?: string;
  mapId?: string;
  entryIds: string[]; // their personal stories and backfills
  mapEntryIds: string[]; // countries logged on their map
  photoPaths: string[];
}

export function personFootprint(state: AppState, id: string): PersonFootprint | null {
  const c = state.companions.find((x) => x.id === id);
  const map = c ? state.maps.find((m) => mapPerson(state, m)?.id === c.id) : state.maps.find((m) => m.id === id);
  if (!c && !map) return null;
  const stories = c ? state.entries.filter((e) => e.companionId === c.id) : [];
  const mapEntries = map ? map.entries : [];
  return {
    name: c?.name || map!.name,
    companionId: c?.id,
    mapId: map?.id,
    entryIds: stories.map((e) => e.id),
    mapEntryIds: mapEntries.map((e) => e.id),
    photoPaths: [...stories, ...mapEntries].map((e) => e.photoPath).filter(Boolean),
  };
}
