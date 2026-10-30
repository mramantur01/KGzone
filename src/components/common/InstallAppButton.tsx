import React, { useEffect, useState } from 'react';
import { Smartphone } from 'lucide-react';

// "Install as an app" — shown only when the browser offers installation (Android Chrome, desktop
// Chrome/Edge). On iPhone the user adds the site via Share → "На экран «Домой»".
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener('appinstalled', () => { deferred = null; listeners.forEach((l) => l()); });
}

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window.navigator as any).standalone;

export const InstallAppButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [, force] = useState(0);
  const [iosHint, setIosHint] = useState(false);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);

  if (!deferred && !isIos()) return null;

  const install = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice.catch(() => undefined);
      deferred = null;
      force((n) => n + 1);
    } else {
      setIosHint((v) => !v);
    }
  };

  return (
    <div className={className}>
      <button type="button" onClick={install} className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer">
        <Smartphone size={14} />
        <span>Установить приложение</span>
      </button>
      {iosHint && <p className="text-[11px] text-slate-400 mt-1.5">В Safari нажмите «Поделиться» → «На экран „Домой“».</p>}
    </div>
  );
};
