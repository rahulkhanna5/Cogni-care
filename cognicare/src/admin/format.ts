export const day = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/** "today", "3 days ago", "never" — for last-played lines. */
export function ago(iso: string | null | undefined, now = new Date()): string {
  if (!iso) return 'never';
  const d = Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`;
}

export const pct = (v: number | null | undefined) => (v == null ? '—' : `${Math.round(v * 100)}%`);
export const cap = (s: string | null | undefined) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '—');
