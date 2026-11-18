import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Share, PlusSquare, X, MoreVertical, MoreHorizontal, Copy, Check, ArrowDown, ArrowUp } from 'lucide-react';

// "Установить приложение": puts the KGzone icon on the phone's home screen (no app store needed).
// Chrome/Edge on Android and computers: one tap (the browser's own install window).
// Everywhere else: short steps for exactly this phone and browser, with the buttons drawn as they look.

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let saved: PromptEvent | null = null;
// The help window lives outside the button: the phone menu closes (and unmounts the button) on tap
let helpOpen = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); saved = e as PromptEvent; notify(); });
  window.addEventListener('appinstalled', () => { saved = null; markInstalled(); helpOpen = false; notify(); });
}
// Installed: opened from the home-screen icon now, or installed earlier in this browser (remembered)
const INSTALLED_KEY = 'kgz-app-installed';
function markInstalled() { try { localStorage.setItem(INSTALLED_KEY, '1'); } catch { /* storage unavailable */ } }
const runningAsApp = () => typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true);
const installed = () => {
  if (runningAsApp()) { markInstalled(); return true; }
  try { return localStorage.getItem(INSTALLED_KEY) === '1'; } catch { return false; }
};

/** Which way of installing works here */
type Way = 'prompt' | 'ios-safari' | 'ios-other' | 'inapp' | 'samsung' | 'yandex' | 'android-other' | null;
function installWay(): Way {
  if (typeof navigator === 'undefined') return null;
  if (saved) return 'prompt';
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  // Opened from WhatsApp, Instagram, Telegram, Facebook, TikTok…: those built-in windows cannot install
  if (/FBAN|FBAV|Instagram|WhatsApp|Telegram|Line\/|TikTok|musical_ly|; wv\)/i.test(ua)) return 'inapp';
  if (ios) return /CriOS|FxiOS|EdgiOS|YaBrowser/i.test(ua) ? 'ios-other' : 'ios-safari';
  if (android) {
    if (/SamsungBrowser/i.test(ua)) return 'samsung';
    if (/YaBrowser|YaApp/i.test(ua)) return 'yandex';
    return 'android-other';
  }
  return null; // computer without the browser's install window: nothing to show
}
const canOffer = () => !installed() && installWay() !== null;

const setHelp = (v: boolean) => { helpOpen = v; notify(); };

/**
 * Inside WhatsApp / Instagram / Telegram the site cannot be installed: jump straight to the real browser.
 * Android: an intent link opens Chrome; iPhone (iOS 17+): x-safari-https opens Safari.
 * "?install=1" makes the install offer appear at once there.
 */
function openInRealBrowser(): boolean {
  const ua = navigator.userAgent;
  const target = location.host + location.pathname + (location.search ? location.search + '&' : '?') + 'install=1';
  if (/Android/i.test(ua)) { location.href = `intent://${target}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent('https://' + target)};end`; return true; }
  if (/iPhone|iPad|iPod/i.test(ua)) { location.href = `x-safari-https://${target}`; return true; }
  return false;
}

/** Chrome sometimes sends its install offer a few seconds after the page opens: wait for it a little */
const waitForPrompt = (ms: number) => new Promise<void>((resolve) => {
  if (saved) return resolve();
  const watch = () => { if (saved) done(); };
  const done = () => { listeners.delete(watch); window.clearTimeout(t); resolve(); };
  const t = window.setTimeout(done, ms);
  listeners.add(watch);
});

async function startInstall(): Promise<boolean> {
  if (!saved && installWay() === 'inapp') {
    // Try to jump to Chrome/Safari by itself; if the phone blocks it, the steps are shown
    openInRealBrowser();
    window.setTimeout(() => { if (document.visibilityState === 'visible') setHelp(true); }, 1500);
    return false;
  }
  if (!saved && /Android/i.test(navigator.userAgent)) await waitForPrompt(2500);
  if (saved) {
    try {
      await saved.prompt();
      const r = await saved.userChoice.catch(() => ({ outcome: '' }));
      if (r.outcome === 'accepted') markInstalled();
    } catch { /* the browser refused (no user tap) */ }
    saved = null;
    notify();
    return true;
  }
  setHelp(true);
  return false;
}

/** One step: a number, a drawn button and the words */
const Step: React.FC<{ n: number; icon?: React.ReactNode; children: React.ReactNode }> = ({ n, icon, children }) => (
  <li className="flex items-center gap-3">
    <span className="w-7 h-7 rounded-full bg-[#C8102E] text-white text-sm font-black flex items-center justify-center shrink-0">{n}</span>
    {icon && <span className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-[#1d6fb8]">{icon}</span>}
    <span className="text-sm text-slate-800 leading-snug">{children}</span>
  </li>
);

const HelpWindow: React.FC = () => {
  const way = installWay();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(location.origin + '/'); setCopied(true); } catch {
      const t = document.createElement('textarea'); t.value = location.origin + '/'; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); setCopied(true); } catch { /* ignore */ } t.remove();
    }
  };
  const title = way === 'inapp' ? 'Откройте сайт в браузере' : 'Установить KGzone — 3 шага';
  // Safari on iPhone: the share button is in the bottom bar — a bouncing arrow points at it
  const pointDown = way === 'ios-safari' && /iPhone|iPod/i.test(navigator.userAgent);
  const pointUp = way === 'ios-other' || way === 'samsung' || way === 'yandex' || way === 'android-other';
  return (
    <div className="fixed inset-0 z-[80] bg-black/55 flex items-end sm:items-center justify-center p-3" onClick={() => setHelp(false)} role="dialog" aria-label="Как установить приложение">
      {pointDown && <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-white animate-bounce pointer-events-none"><ArrowDown size={42} strokeWidth={3} /></div>}
      {pointUp && <div className="absolute top-2 right-4 text-white animate-bounce pointer-events-none"><ArrowUp size={42} strokeWidth={3} /></div>}
      <div className="w-full max-w-sm rounded-2xl bg-white p-4 mb-12 sm:mb-0 text-slate-800 space-y-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <img src="/apple-touch-icon.png" alt="" className="w-9 h-9 rounded-xl" />
            <b className="text-slate-900">{title}</b>
          </div>
          <button type="button" onClick={() => setHelp(false)} aria-label="Закрыть" className="p-1 rounded-full hover:bg-slate-100 cursor-pointer"><X size={18} /></button>
        </div>

        {way === 'ios-safari' && (
          <ol className="space-y-2.5">
            <Step n={1} icon={<Share size={18} />}>Нажмите «Поделиться» — {/iPad/.test(navigator.userAgent) ? 'вверху справа' : 'внизу экрана, по центру'} (стрелка покажет)</Step>
            <Step n={2} icon={<PlusSquare size={18} />}>Прокрутите и выберите «На экран Домой»</Step>
            <Step n={3}>Нажмите «Добавить» — значок KGzone появится на экране</Step>
          </ol>
        )}
        {way === 'ios-other' && (
          <ol className="space-y-2.5">
            <Step n={1} icon={<Share size={18} />}>Нажмите «Поделиться» — вверху справа, в строке адреса</Step>
            <Step n={2} icon={<PlusSquare size={18} />}>Выберите «На экран Домой»</Step>
            <Step n={3}>Нажмите «Добавить». Если такого пункта нет — откройте сайт в Safari</Step>
          </ol>
        )}
        {way === 'samsung' && (
          <ol className="space-y-2.5">
            <Step n={1} icon={<MoreHorizontal size={18} />}>Нажмите меню ☰ внизу справа</Step>
            <Step n={2} icon={<PlusSquare size={18} />}>Выберите «Добавить страницу на» → «Главный экран»</Step>
            <Step n={3}>Нажмите «Добавить» — значок KGzone появится на экране</Step>
          </ol>
        )}
        {way === 'yandex' && (
          <ol className="space-y-2.5">
            <Step n={1} icon={<MoreVertical size={18} />}>Нажмите меню ⋮ (три точки) рядом со строкой адреса</Step>
            <Step n={2} icon={<PlusSquare size={18} />}>Выберите «Добавить ярлык» или «На главный экран»</Step>
            <Step n={3}>Подтвердите — значок KGzone появится на экране</Step>
          </ol>
        )}
        {way === 'android-other' && (
          <ol className="space-y-2.5">
            <Step n={1} icon={<MoreVertical size={18} />}>Нажмите меню ⋮ вверху справа</Step>
            <Step n={2} icon={<PlusSquare size={18} />}>Выберите «Установить приложение» или «Добавить на главный экран»</Step>
            <Step n={3}>Нажмите «Установить» — значок KGzone появится на экране</Step>
          </ol>
        )}
        {way === 'inapp' && (
          <>
            <p className="text-sm text-slate-600">Сайт открыт внутри другого приложения (WhatsApp, Instagram, Telegram…) — оттуда установить нельзя. Откройте его в обычном браузере:</p>
            <ol className="space-y-2.5">
              <Step n={1} icon={<MoreVertical size={18} />}>Нажмите ⋮ или ⋯ вверху экрана</Step>
              <Step n={2}>Выберите «Открыть в браузере» ({/iPhone|iPad/.test(navigator.userAgent) ? 'Safari' : 'Chrome'})</Step>
              <Step n={3}>Там нажмите «Установить приложение KGzone»</Step>
            </ol>
            <button type="button" onClick={() => openInRealBrowser()} className="w-full py-2.5 rounded-xl bg-[#C8102E] hover:bg-[#a60d26] text-white text-sm font-black cursor-pointer">Открыть в {/iPhone|iPad/.test(navigator.userAgent) ? 'Safari' : 'Chrome'}</button>
            <button type="button" onClick={copy} className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer">
              {copied ? <><Check size={15} className="text-emerald-600" />Ссылка скопирована — вставьте в браузер</> : <><Copy size={15} />Скопировать ссылку на сайт</>}
            </button>
          </>
        )}
        <p className="text-[11px] text-slate-500">Это бесплатно и без магазина приложений. Значок открывает KGzone на весь экран, как обычное приложение.</p>
        {way !== 'inapp' && (
          <button type="button" onClick={() => { markInstalled(); setHelp(false); }} className="w-full py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 cursor-pointer">У меня уже установлено</button>
        )}
      </div>
    </div>
  );
};

/** host: the one always-mounted copy (in the footer) that shows the help window */
export const InstallAppButton: React.FC<{ className?: string; onDone?: () => void; host?: boolean }> = ({ className = '', onDone, host = false }) => {
  const [, tick] = useState(0);
  useEffect(() => { const l = () => tick((n) => n + 1); listeners.add(l); return () => { listeners.delete(l); }; }, []);
  const help = host && helpOpen ? createPortal(<HelpWindow />, document.body) : null;
  if (!canOffer()) return help;
  return (
    <>
      <button type="button" onClick={async () => { await startInstall(); onDone?.(); }} className={`inline-flex items-center justify-center gap-2 cursor-pointer ${className}`}>
        <Download size={16} />
        <span>Установить приложение KGzone</span>
      </button>
      {help}
    </>
  );
};

const SHOWN_KEY = 'kgz-install-offer-shown';

/**
 * On every visit (once per browser session): a small card «Установите приложение KGzone» if the app is not installed.
 * Not shown inside the installed app, after installing, or on a computer that cannot install.
 */
export const InstallAppPrompt: React.FC = () => {
  const [show, setShow] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => { const l = () => tick((n) => n + 1); listeners.add(l); return () => { listeners.delete(l); }; }, []);
  useEffect(() => {
    let shown = false;
    try { shown = sessionStorage.getItem(SHOWN_KEY) === '1'; } catch { /* storage unavailable */ }
    // Came here from WhatsApp/Instagram by the "open in browser" jump: offer at once
    const fromJump = /[?&]install=1/.test(location.search);
    if (fromJump) {
      try { history.replaceState(null, '', location.pathname + location.search.replace(/[?&]install=1/, '').replace(/^&/, '?') + location.hash); } catch { /* ignore */ }
    }
    if ((shown && !fromJump) || installed()) return;
    // Give the page a moment; Chrome's install offer may come a little later
    const t = window.setTimeout(() => {
      // iPhone Safari after the jump: show the steps with the arrow right away
      if (fromJump && installWay() === 'ios-safari') { setHelp(true); return; }
      if (!canOffer()) return;
      // Do not cover a question that is already on the screen
      if (document.querySelector('[aria-label="Вы купили?"], [aria-label="Оцените продавца"], [aria-label="Напоминание о корзине"]')) return;
      setShow(true);
      try { sessionStorage.setItem(SHOWN_KEY, '1'); } catch { /* storage unavailable */ }
    }, fromJump ? 1500 : 4000);
    return () => window.clearTimeout(t);
  }, []);
  if (!show || !canOffer()) return null;
  const way = installWay();
  return (
    <div role="dialog" aria-label="Установить приложение" className="fixed z-[58] left-3 bottom-20 w-[calc(100vw-1.5rem)] max-w-[420px] sm:left-auto sm:right-6 sm:bottom-6 sm:w-[380px] p-4 rounded-2xl bg-white border border-slate-200 shadow-2xl text-slate-900">
      <button type="button" onClick={() => setShow(false)} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer" aria-label="Закрыть"><X size={16} /></button>
      <div className="flex items-start gap-3 pr-5">
        <img src="/apple-touch-icon.png" alt="" className="w-12 h-12 rounded-xl shrink-0" />
        <div>
          <div className="font-black text-sm">Установите приложение KGzone</div>
          <div className="text-xs text-slate-500 mt-0.5">{way === 'prompt' ? 'Одно нажатие — и значок KGzone на экране телефона. Бесплатно, без магазина приложений.' : 'Значок на экране телефона — запчасти, заказы и сообщения в одно касание. Покажем, как — 3 шага.'}</div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button type="button" onClick={async () => { await startInstall(); setShow(false); }} className="flex-1 py-2.5 rounded-xl bg-[#C8102E] hover:bg-[#a60d26] text-white text-sm font-black inline-flex items-center justify-center gap-1.5 cursor-pointer">
          <Download size={15} />{way === 'prompt' || way === 'inapp' ? 'Установить' : 'Как установить'}
        </button>
        {way !== 'prompt' && way !== 'inapp' && <button type="button" onClick={() => { markInstalled(); setShow(false); }} className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer">Уже установлено</button>}
      </div>
    </div>
  );
};
