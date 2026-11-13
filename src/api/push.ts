import { call } from './admin';

// Phone / browser notifications (web push). Works in Chrome on Android and computers;
// on iPhone only after "Add to Home Screen" (iOS 16.4+).

export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const b64ToBytes = (b64: string) => {
  const s = atob((b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

async function registration() {
  const existing = await navigator.serviceWorker.getRegistration();
  return existing || navigator.serviceWorker.register('/sw.js');
}

export async function pushEnabled(): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== 'granted') return false;
  const reg = await navigator.serviceWorker.getRegistration();
  return Boolean(reg && (await reg.pushManager.getSubscription()));
}

export async function enablePush(): Promise<void> {
  if (!pushSupported()) throw new Error('Этот браузер не поддерживает уведомления. На iPhone сначала добавьте сайт на экран «Домой».');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Вы запретили уведомления. Разрешите их в настройках браузера для этого сайта.');
  const reg = await registration();
  await navigator.serviceWorker.ready;
  const { publicKey } = await call<{ publicKey: string }>('/api/push/key');
  const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(publicKey) }));
  await call('/api/push/subscribe', { method: 'POST', body: JSON.stringify({ subscription: sub.toJSON() }) });
}

export async function disablePush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await call('/api/push/unsubscribe', { method: 'POST', body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => undefined);
  await sub.unsubscribe();
}
