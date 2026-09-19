export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function fmtDate(iso: string): string {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  return `${Number(parts[2])} ${MONTHS[Number(parts[1]) - 1]} ${parts[0]}`;
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
