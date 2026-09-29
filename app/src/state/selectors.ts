import { byCountry, natToCountry, CONTINENTS, pct, type ContinentCode } from '../data/countries';
import { ME_KEY, initialsOf } from '../lib/identity';
import type { AppState, GroupMap } from './types';
import type { Entry, NotificationItem } from '../types';

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
  countries: string[];
  hasMap: boolean;
}

const norm = (name: string) => name.trim().toLowerCase();

// A map named after a remembered person is that person's map.
export function sameName(a: string, b: string): boolean {
  return norm(a) === norm(b);
}

export function nameRows(state: AppState): NameRow[] {
  const mapCountries = (m: GroupMap) => [...m.entries, ...state.entries.filter((e) => e.mapId === m.id)].map((e) => e.country);
  const unique = (xs: string[]) => [...new Set(xs.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const rows: NameRow[] = state.companions.map((c) => {
    // A map named after this person is theirs too.
    const map = state.maps.find((m) => norm(m.name) === norm(c.name));
    const stories = state.entries.filter((e) => e.companionId === c.id).map((e) => e.country);
    return { id: c.id, name: c.name, initials: c.initials, nationalities: c.nationalities, countries: unique([...stories, ...(map ? mapCountries(map) : [])]), hasMap: !!map };
  });
  const named = new Set(state.companions.map((c) => norm(c.name)));
  for (const m of state.maps) {
    if (named.has(norm(m.name))) continue;
    rows.push({ id: m.id, name: m.name, initials: initialsOf(m.name) || '??', nationalities: m.nationalities, countries: unique(mapCountries(m)), hasMap: true });
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}
