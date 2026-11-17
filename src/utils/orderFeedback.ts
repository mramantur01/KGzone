// Orders placed from this browser: some hours later the site asks the buyer "did you buy it?".
// The answer (with the private key from the server) closes the order and fixes the stock on the site.

export interface PendingOrder { key: string; orderNumber: string; seller: string; title: string; at: string; snoozeUntil?: string }

const KEY = 'kgz:order-feedback';
/** Ask this long after the order */
export const ASK_AFTER_MS = 3 * 3_600_000;
const FORGET_AFTER_MS = 14 * 86_400_000;

export const readOrders = (): PendingOrder[] => {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(list) ? list.filter((o) => o && o.key && Date.now() - Date.parse(o.at) < FORGET_AFTER_MS) : [];
  } catch { return []; }
};
const write = (list: PendingOrder[]) => {
  try { localStorage.setItem(KEY, JSON.stringify(list.slice(-20))); } catch { /* private mode */ }
  window.dispatchEvent(new Event('kgz:order-feedback'));
};
export const rememberOrder = (o: PendingOrder) => write([...readOrders().filter((x) => x.key !== o.key), o]);
export const forgetOrder = (key: string) => write(readOrders().filter((x) => x.key !== key));
export const snoozeOrder = (key: string) =>
  write(readOrders().map((x) => (x.key === key ? { ...x, snoozeUntil: new Date(Date.now() + 86_400_000).toISOString() } : x)));
/** The order to ask about now, if any */
export const dueOrder = (): PendingOrder | undefined =>
  readOrders().find((o) => Date.now() - Date.parse(o.at) >= ASK_AFTER_MS && (!o.snoozeUntil || Date.parse(o.snoozeUntil) <= Date.now()));
