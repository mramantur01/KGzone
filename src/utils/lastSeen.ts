// "Был на сайте сегодня / вчера / 3 дн. назад" for sellers (the server refreshes it hourly)
export function lastSeenText(iso?: string): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const days = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(t).setHours(0, 0, 0, 0)) / 86_400_000);
  if (days <= 0) return 'Был на сайте сегодня';
  if (days === 1) return 'Был на сайте вчера';
  if (days < 7) return `Был на сайте ${days} дн. назад`;
  if (days < 31) return 'Был на сайте больше недели назад';
  return 'Давно не заходил';
}

/** Seen within the last day */
export const seenRecently = (iso?: string) => Boolean(iso && Date.now() - Date.parse(iso) < 86_400_000);
