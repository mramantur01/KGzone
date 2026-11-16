import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Share, PlusSquare, X } from 'lucide-react';

// "Установить приложение": puts the KGzone icon on the phone's home screen (no app store needed).
// Android/Chrome give an install prompt; on iPhone we show how to do it via "Поделиться".

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let saved: PromptEvent | null = null;
// The iPhone help lives outside the button: the phone menu closes (and unmounts the button) on tap
let iosHelpOpen = false;
const listeners = new Set<() => void>();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); saved = e as PromptEvent; listeners.forEach((l) => l()); });
  window.addEventListener('appinstalled', () => { saved = null; listeners.forEach((l) => l()); });
}
const installed = () => typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true);
const isIos = () => typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);

const setIosHelp = (v: boolean) => { iosHelpOpen = v; listeners.forEach((l) => l()); };

/** host: the one always-mounted copy (in the footer) that shows the iPhone help */
export const InstallAppButton: React.FC<{ className?: string; onDone?: () => void; host?: boolean }> = ({ className = '', onDone, host = false }) => {
  const [, tick] = useState(0);
  const iosHelp = host && iosHelpOpen;
  useEffect(() => { const l = () => tick((n) => n + 1); listeners.add(l); return () => { listeners.delete(l); }; }, []);

  if (installed() || (!saved && !isIos())) return null;

  const install = async () => {
    if (saved) {
      await saved.prompt();
      await saved.userChoice.catch(() => undefined);
      saved = null;
      tick((n) => n + 1);
      onDone?.();
    } else { setIosHelp(true); onDone?.(); }
  };

  return (
    <>
      <button type="button" onClick={install} className={`inline-flex items-center justify-center gap-2 cursor-pointer ${className}`}>
        <Download size={16} />
        <span>Установить приложение KGzone</span>
      </button>
      {iosHelp && createPortal(
        <div className="fixed inset-0 z-[80] bg-black/50 flex items-end sm:items-center justify-center p-3" onClick={() => setIosHelp(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-4 text-slate-800 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <b className="text-slate-900">Установить на iPhone</b>
              <button type="button" onClick={() => setIosHelp(false)} aria-label="Закрыть" className="p-1 rounded-full hover:bg-slate-100 cursor-pointer"><X size={18} /></button>
            </div>
            <ol className="space-y-2 text-sm">
              <li className="flex items-center gap-2">1. Нажмите <Share size={16} className="text-[#1d6fb8]" /> «Поделиться» внизу Safari</li>
              <li className="flex items-center gap-2">2. Выберите <PlusSquare size={16} /> «На экран Домой»</li>
              <li>3. Нажмите «Добавить» — значок KGzone появится на экране</li>
            </ol>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};
