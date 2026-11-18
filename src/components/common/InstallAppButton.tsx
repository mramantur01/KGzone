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
  window.addEventListener('appinstalled', () => { saved = null; markInstalled(); listeners.forEach((l) => l()); });
}
// Installed: opened from the home-screen icon now, or installed earlier in this browser (remembered)
const INSTALLED_KEY = 'kgz-app-installed';
function markInstalled() { try { localStorage.setItem(INSTALLED_KEY, '1'); } catch { /* storage unavailable */ } }
const runningAsApp = () => typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true);
const installed = () => {
  if (runningAsApp()) { markInstalled(); return true; }
  try { return localStorage.getItem(INSTALLED_KEY) === '1'; } catch { return false; }
};
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
      try {
        await saved.prompt();
        await saved.userChoice.catch(() => undefined);
      } catch { /* the browser refused (no user tap) — nothing to do */ }
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

const SHOWN_KEY = 'kgz-install-offer-shown';

/**
 * On every visit (once per browser session): a small card «Установите приложение KGzone» if the app is not installed.
 * Not shown inside the installed app, after installing, or when the browser cannot install (no prompt and not iPhone).
 */
export const InstallAppPrompt: React.FC = () => {
  const [show, setShow] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => { const l = () => tick((n) => n + 1); listeners.add(l); return () => { listeners.delete(l); }; }, []);
  useEffect(() => {
    let shown = false;
    try { shown = sessionStorage.getItem(SHOWN_KEY) === '1'; } catch { /* storage unavailable */ }
    if (shown || installed()) return;
    // Give the page a moment; Chrome's install offer may come a little later
    const t = window.setTimeout(() => {
      if (installed() || (!saved && !isIos())) return;
      // Do not cover a question that is already on the screen
      if (document.querySelector('[aria-label="Вы купили?"], [aria-label="Оцените продавца"], [aria-label="Напоминание о корзине"]')) return;
      setShow(true);
      try { sessionStorage.setItem(SHOWN_KEY, '1'); } catch { /* storage unavailable */ }
    }, 4000);
    return () => window.clearTimeout(t);
  }, []);
  if (!show || installed() || (!saved && !isIos())) return null;

  const install = async () => {
    if (saved) {
      try { await saved.prompt(); const r = await saved.userChoice.catch(() => ({ outcome: '' })); if (r.outcome === 'accepted') markInstalled(); } catch { /* refused */ }
      saved = null;
      setShow(false);
    } else { setIosHelp(true); setShow(false); }
  };
  return (
    <div role="dialog" aria-label="Установить приложение" className="fixed z-[58] left-3 bottom-20 w-[calc(100vw-1.5rem)] max-w-[420px] sm:left-auto sm:right-6 sm:bottom-6 sm:w-[380px] p-4 rounded-2xl bg-white border border-slate-200 shadow-2xl text-slate-900">
      <button type="button" onClick={() => setShow(false)} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer" aria-label="Закрыть"><X size={16} /></button>
      <div className="flex items-start gap-3 pr-5">
        <img src="/apple-touch-icon.png" alt="" className="w-12 h-12 rounded-xl shrink-0" />
        <div>
          <div className="font-black text-sm">Установите приложение KGzone</div>
          <div className="text-xs text-slate-500 mt-0.5">Значок на экране телефона — запчасти, заказы и сообщения в одно касание. Без магазина приложений, бесплатно.</div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button type="button" onClick={install} className="flex-1 py-2.5 rounded-xl bg-[#C8102E] hover:bg-[#a60d26] text-white text-sm font-black inline-flex items-center justify-center gap-1.5 cursor-pointer"><Download size={15} />Установить</button>
        {isIos() && <button type="button" onClick={() => { markInstalled(); setShow(false); }} className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer">Уже установлено</button>}
      </div>
    </div>
  );
};
