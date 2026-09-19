import { byCountry, natToCountry, CONTINENTS, pct, type ContinentCode } from '../data/countries';
import type { AppState } from './types';
import type { Entry } from '../types';

export function beenCountries(state: AppState): string[] {
  const set = new Set<string>();
  state.entries.forEach((e) => e.country && set.add(e.country));
  return [...set];
}

export function natsLogged(state: AppState): string[] {
  const set = new Set<string>();
  state.entries.forEach((e) => e.nationality.forEach((n) => n && set.add(n)));
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

export function entryNats(e: Entry): string[] {
  return e.nationality.filter(Boolean);
}

export function natLabel(e: Entry): string {
  return entryNats(e).join(' · ');
}

export { pct };
