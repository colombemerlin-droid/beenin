// Sentinel used internally wherever "the current viewer" needs to be recorded
// (kudos, comments) without baking in a fake name. Distinct from any real
// person's initials so it can never collide.
export const ME_KEY = '__me__';

// Deterministic per-name color so any real friend gets a stable avatar color
// without a hardcoded name->color lookup table.
const PALETTE = ['#C25A45', '#3D5A4A', '#B8893A', '#D89B92', '#9A4534', '#5C544E', '#6B7FA3', '#8A6BA3'];

export function colorFor(key: string): string {
  if (key === ME_KEY) return '#E2725B';
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Resolves what to print inside an avatar bubble: the viewer's own initials
// (falling back to "Y" for "You" until they've set a name) for the ME_KEY
// sentinel, or the token as-is for anyone else.
export function displayInitials(key: string, myName: string): string {
  if (key === ME_KEY) return initialsOf(myName) || 'Y';
  return key;
}
