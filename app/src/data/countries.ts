export type ContinentCode = 'AF' | 'AS' | 'EU' | 'NA' | 'SA' | 'OC';

export const WORLD_TOTAL = 195;

export const CONTINENTS: Record<ContinentCode, { name: string; total: number }> = {
  AF: { name: 'Africa', total: 54 },
  AS: { name: 'Asia', total: 48 },
  EU: { name: 'Europe', total: 44 },
  NA: { name: 'North America', total: 23 },
  SA: { name: 'South America', total: 12 },
  OC: { name: 'Oceania', total: 14 },
};

export interface CountryPair {
  country: string;
  nationality: string;
  continent: ContinentCode;
  iso2: string;
}

// country, nationality, continent code, ISO 3166-1 alpha-2 (for flag emoji)
const RAW: [string, string, ContinentCode, string][] = [
  ['Afghanistan', 'Afghan', 'AS', 'AF'], ['Albania', 'Albanian', 'EU', 'AL'], ['Algeria', 'Algerian', 'AF', 'DZ'],
  ['Argentina', 'Argentinian', 'SA', 'AR'], ['Armenia', 'Armenian', 'AS', 'AM'], ['Australia', 'Australian', 'OC', 'AU'],
  ['Austria', 'Austrian', 'EU', 'AT'], ['Bangladesh', 'Bangladeshi', 'AS', 'BD'], ['Belgium', 'Belgian', 'EU', 'BE'],
  ['Bolivia', 'Bolivian', 'SA', 'BO'], ['Brazil', 'Brazilian', 'SA', 'BR'], ['Bulgaria', 'Bulgarian', 'EU', 'BG'],
  ['Cambodia', 'Cambodian', 'AS', 'KH'], ['Cameroon', 'Cameroonian', 'AF', 'CM'], ['Canada', 'Canadian', 'NA', 'CA'],
  ['Chile', 'Chilean', 'SA', 'CL'], ['China', 'Chinese', 'AS', 'CN'], ['Colombia', 'Colombian', 'SA', 'CO'],
  ['Costa Rica', 'Costa Rican', 'NA', 'CR'], ['Croatia', 'Croatian', 'EU', 'HR'], ['Cuba', 'Cuban', 'NA', 'CU'],
  ['Czechia', 'Czech', 'EU', 'CZ'], ['Denmark', 'Danish', 'EU', 'DK'], ['Ecuador', 'Ecuadorian', 'SA', 'EC'],
  ['Egypt', 'Egyptian', 'AF', 'EG'], ['Estonia', 'Estonian', 'EU', 'EE'], ['Ethiopia', 'Ethiopian', 'AF', 'ET'],
  ['Finland', 'Finnish', 'EU', 'FI'], ['France', 'French', 'EU', 'FR'], ['Georgia', 'Georgian', 'AS', 'GE'],
  ['Germany', 'German', 'EU', 'DE'], ['Ghana', 'Ghanaian', 'AF', 'GH'], ['Greece', 'Greek', 'EU', 'GR'],
  ['Hungary', 'Hungarian', 'EU', 'HU'], ['Iceland', 'Icelandic', 'EU', 'IS'], ['India', 'Indian', 'AS', 'IN'],
  ['Indonesia', 'Indonesian', 'AS', 'ID'], ['Iran', 'Iranian', 'AS', 'IR'], ['Ireland', 'Irish', 'EU', 'IE'],
  ['Israel', 'Israeli', 'AS', 'IL'], ['Italy', 'Italian', 'EU', 'IT'], ['Jamaica', 'Jamaican', 'NA', 'JM'],
  ['Japan', 'Japanese', 'AS', 'JP'], ['Jordan', 'Jordanian', 'AS', 'JO'], ['Kenya', 'Kenyan', 'AF', 'KE'],
  ['Latvia', 'Latvian', 'EU', 'LV'], ['Lebanon', 'Lebanese', 'AS', 'LB'], ['Lithuania', 'Lithuanian', 'EU', 'LT'],
  ['Malaysia', 'Malaysian', 'AS', 'MY'], ['Mexico', 'Mexican', 'NA', 'MX'], ['Morocco', 'Moroccan', 'AF', 'MA'],
  ['Nepal', 'Nepali', 'AS', 'NP'], ['Netherlands', 'Dutch', 'EU', 'NL'], ['New Zealand', 'New Zealander', 'OC', 'NZ'],
  ['Nigeria', 'Nigerian', 'AF', 'NG'], ['Norway', 'Norwegian', 'EU', 'NO'], ['Pakistan', 'Pakistani', 'AS', 'PK'],
  ['Panama', 'Panamanian', 'NA', 'PA'], ['Peru', 'Peruvian', 'SA', 'PE'], ['Philippines', 'Filipino', 'AS', 'PH'],
  ['Poland', 'Polish', 'EU', 'PL'], ['Portugal', 'Portuguese', 'EU', 'PT'], ['Romania', 'Romanian', 'EU', 'RO'],
  ['Senegal', 'Senegalese', 'AF', 'SN'], ['Serbia', 'Serbian', 'EU', 'RS'], ['Singapore', 'Singaporean', 'AS', 'SG'],
  ['Slovakia', 'Slovak', 'EU', 'SK'], ['Slovenia', 'Slovenian', 'EU', 'SI'], ['South Africa', 'South African', 'AF', 'ZA'],
  ['South Korea', 'Korean', 'AS', 'KR'], ['Spain', 'Spanish', 'EU', 'ES'], ['Sri Lanka', 'Sri Lankan', 'AS', 'LK'],
  ['Sweden', 'Swedish', 'EU', 'SE'], ['Switzerland', 'Swiss', 'EU', 'CH'], ['Tanzania', 'Tanzanian', 'AF', 'TZ'],
  ['Thailand', 'Thai', 'AS', 'TH'], ['Tunisia', 'Tunisian', 'AF', 'TN'], ['Turkey', 'Turkish', 'AS', 'TR'],
  ['Ukraine', 'Ukrainian', 'EU', 'UA'], ['United Kingdom', 'British', 'EU', 'GB'], ['United States', 'American', 'NA', 'US'],
  ['Uruguay', 'Uruguayan', 'SA', 'UY'], ['Vietnam', 'Vietnamese', 'AS', 'VN'],
];

export const PAIRS: CountryPair[] = RAW.map(([country, nationality, continent, iso2]) => ({
  country, nationality, continent, iso2,
}));

export function byCountry(country: string): CountryPair | undefined {
  return PAIRS.find((p) => p.country === country);
}

export function byNationality(nat: string): CountryPair | undefined {
  return PAIRS.find((p) => p.nationality === nat);
}

export function flagOf(country: string): string {
  const p = byCountry(country);
  if (!p) return '\u{1F3F4}';
  return String.fromCodePoint(...p.iso2.split('').map((ch) => 0x1F1E6 + ch.charCodeAt(0) - 65));
}

export function natFlagOf(nat: string): string {
  const p = byNationality(nat);
  return p ? flagOf(p.country) : '\u{1F3F4}';
}

export function natToCountry(nat: string): string {
  const p = byNationality(nat);
  return p ? p.country : nat;
}

export function pct(n: number): string {
  return (n / WORLD_TOTAL * 100).toFixed(1) + '%';
}
