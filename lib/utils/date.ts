// path: lib/utils/date.ts
/**
 * UTC-only date utilities. Business logic never uses local time.
 */

export function utcNowIso(): string {
  return new Date().toISOString();
}

export function toUtcIso(date: Date): string {
  return date.toISOString();
}

export function formatUtc(dateIso: string, opts?: { withTime?: boolean }): string {
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return dateIso;
  const date = d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    timeZone: 'UTC',
  });
  if (opts?.withTime !== true) return date;
  const time = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  });
  return `${date} ${time} UTC`;
}

export function addSeconds(dateIso: string, seconds: number): string {
  return new Date(new Date(dateIso).getTime() + seconds * 1000).toISOString();
}
