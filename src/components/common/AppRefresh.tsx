import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw, ChevronLeft, ChevronRight, WifiOff } from 'lucide-react';
import { refreshParts } from '../../api/parts';
import { refreshCars } from '../../api/cars';

// Keeps the installed app fresh:
// 1) «Pull down to refresh» inside the installed app (the browser does not do it there, iPhone never does);
// 2) a new version of the site is picked up by itself: checked on start, every 2 minutes and when the app comes back;
// 3) listings are reloaded when the app comes back after a few minutes in the background.

const runningAsApp = () => window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true;
const PULL_TO_RELOAD = 80; // px

/** The main script of the page as it is now and on the server: different = a new version is out */
const currentBuild = () => document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/index-"]')?.getAttribute('src') || '';
async function serverBuild(): Promise<string> {
  try {
    const html = await (await fetch('/?build-check=' + Date.now(), { cache: 'no-store' })).text();
    return html.match(/<script type="module"[^>]*src="(\/assets\/index-[^"]+)"/)?.[1] || '';
  } catch { return ''; }
}
const typing = () => { const a = document.activeElement; return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || (a as HTMLElement).isContentEditable); };

/**
 * Inside the installed app the phone hides the browser's «Назад / Вперёд»: our own two buttons (bottom left)
 * plus a swipe from the left edge of the screen to go back.
 */
const historyPlace = () => {
  const idx = Number(window.history.state?.idx) || 0;
  let max = idx;
  try { max = Math.max(idx, Number(sessionStorage.getItem('kgz-history-max')) || 0); } catch { /* storage unavailable */ }
  return { back: idx > 0, forward: idx < max };
};
const AppNav: React.FC = () => {
  const [place, setPlace] = useState(historyPlace);
  // Above the cabinet's bottom menu when it is on screen
  const [lift, setLift] = useState(0);
  const edge = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const measure = () => {
      const bar = document.querySelector<HTMLElement>('nav.fixed.bottom-0');
      setLift(bar ? Math.round(bar.getBoundingClientRect().height) : 0);
    };
    measure();
    const t = window.setInterval(measure, 800);
    return () => window.clearInterval(t);
  }, []);
  useEffect(() => {
    const update = () => setPlace(historyPlace());
    window.addEventListener('popstate', update);
    window.addEventListener('kgz:history', update);
    // Swipe right from the left edge = back (like in the browser)
    const onStart = (e: TouchEvent) => { const t = e.touches[0]; edge.current = e.touches.length === 1 && t.clientX < 24 ? { x: t.clientX, y: t.clientY } : null; };
    const onEnd = (e: TouchEvent) => {
      const s = edge.current; edge.current = null;
      const t = e.changedTouches[0];
      if (s && t && t.clientX - s.x > 90 && Math.abs(t.clientY - s.y) < 60 && historyPlace().back) window.history.back();
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      window.removeEventListener('popstate', update); window.removeEventListener('kgz:history', update);
      window.removeEventListener('touchstart', onStart); window.removeEventListener('touchend', onEnd);
    };
  }, []);
  const btn = 'w-11 h-11 flex items-center justify-center rounded-full transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-default';
  return (
    <nav aria-label="Назад и вперёд" className="fixed z-[44] left-3 flex items-center gap-1 p-1 rounded-full bg-slate-900/85 text-white shadow-xl backdrop-blur" style={{ bottom: lift ? `${lift + 10}px` : 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
      <button type="button" aria-label="Назад" disabled={!place.back} onClick={() => window.history.back()} className={`${btn} hover:bg-white/15`}><ChevronLeft size={24} /></button>
      <button type="button" aria-label="Вперёд" disabled={!place.forward} onClick={() => window.history.forward()} className={`${btn} hover:bg-white/15`}><ChevronRight size={24} /></button>
    </nav>
  );
};

export const AppRefresh: React.FC = () => {
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const start = useRef<number | null>(null);
  const pending = useRef(false);
  const hiddenAt = useRef(0);
  const pullNow = useRef(0);

  // Connection state, shown so it is clear whether the app is online
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' && navigator.onLine === false);
  const [updating, setUpdating] = useState(false);

  // 2 + 3: new version and fresh listings.
  // Checked when the app opens, every 2 minutes while it is open, and each time it comes back to the screen.
  useEffect(() => {
    const mine = currentBuild();
    if (!mine) return; // local development
    let checking = false;
    let lastCheck = 0;
    const reloadNow = () => {
      setUpdating(true); // «Новая версия — обновляю…»
      window.setTimeout(() => window.location.reload(), 900);
    };
    const check = async () => {
      // At most once in 5 s (focus and «back on screen» often come together)
      if (checking || navigator.onLine === false || Date.now() - lastCheck < 5_000) return;
      checking = true;
      lastCheck = Date.now();
      try {
        const latest = await serverBuild();
        if (!latest || latest === mine) return;
        // A new version: reload now if the person is not typing and the app is on screen, otherwise on return
        if (document.visibilityState === 'visible' && !typing()) reloadNow();
        else pending.current = true;
      } finally { checking = false; }
    };
    const onBack = () => {
      if (document.visibilityState === 'hidden') { hiddenAt.current = Date.now(); return; }
      if (pending.current && !typing()) { reloadNow(); return; }
      navigator.serviceWorker?.getRegistration().then((r) => r?.update()).catch(() => undefined);
      check();
      if (hiddenAt.current && Date.now() - hiddenAt.current > 3 * 60_000) { refreshParts(); refreshCars(); }
    };
    const onOnline = () => { setOffline(false); check(); };
    const onOffline = () => setOffline(true);
    const first = window.setTimeout(check, 3000);
    const t = window.setInterval(check, 2 * 60_000);
    document.addEventListener('visibilitychange', onBack);
    window.addEventListener('pageshow', onBack); // iPhone: the app is shown again from memory
    window.addEventListener('focus', onBack);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.clearTimeout(first); window.clearInterval(t);
      document.removeEventListener('visibilitychange', onBack);
      window.removeEventListener('pageshow', onBack); window.removeEventListener('focus', onBack);
      window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline);
    };
  }, []);

  // 1: pull down from the very top of the page (only inside the installed app; the browser does it itself)
  useEffect(() => {
    if (!runningAsApp()) return;
    const modalOpen = () => !!document.querySelector('.fixed.inset-0, [role="dialog"]');
    const onStart = (e: TouchEvent) => { start.current = window.scrollY <= 0 && !modalOpen() && e.touches.length === 1 ? e.touches[0].clientY : null; };
    const onMove = (e: TouchEvent) => {
      if (start.current === null) return;
      const dy = e.touches[0].clientY - start.current;
      if (dy <= 0 || window.scrollY > 0) { pullNow.current = 0; setPull(0); return; }
      pullNow.current = Math.min(140, dy * 0.6);
      setPull(pullNow.current);
    };
    const onEnd = () => {
      if (start.current === null) return;
      start.current = null;
      if (pullNow.current >= PULL_TO_RELOAD) { setBusy(true); window.setTimeout(() => window.location.reload(), 150); return; }
      pullNow.current = 0;
      setPull(0);
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    return () => { window.removeEventListener('touchstart', onStart); window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onEnd); };
  }, []);

  const nav = (
    <>
      {runningAsApp() && <AppNav />}
      {(offline || updating) && (
        <div role="status" className="fixed z-[95] left-1/2 -translate-x-1/2 px-4 py-2 rounded-full shadow-xl text-[13px] font-bold text-[#fff] whitespace-nowrap flex items-center gap-2" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 10px)', background: updating ? '#15803d' : '#334155' }}>
          {updating ? <><RefreshCw size={15} className="animate-spin" />Новая версия — обновляю…</> : <><WifiOff size={15} />Нет интернета — показаны сохранённые данные</>}
        </div>
      )}
    </>
  );
  if (!pull && !busy) return nav;
  const ready = pull >= PULL_TO_RELOAD || busy;
  return (
    <>{nav}
    <div className="fixed top-0 inset-x-0 z-[90] flex justify-center pointer-events-none" style={{ transform: `translateY(${busy ? 70 : Math.max(0, pull - 30)}px)` }}>
      <div className={`w-11 h-11 rounded-full shadow-lg flex items-center justify-center ${ready ? 'bg-[#C8102E] text-white' : 'bg-white text-slate-500'}`}>
        <RefreshCw size={20} className={busy ? 'animate-spin' : ''} style={busy ? undefined : { transform: `rotate(${pull * 3}deg)` }} />
      </div>
    </div>
    </>
  );
};
