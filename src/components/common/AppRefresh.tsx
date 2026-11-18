import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { refreshParts } from '../../api/parts';
import { refreshCars } from '../../api/cars';

// Keeps the installed app fresh:
// 1) «Pull down to refresh» inside the installed app (the browser does not do it there, iPhone never does);
// 2) a new version of the site is picked up by itself: checked every 10 minutes and when the app comes back;
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

export const AppRefresh: React.FC = () => {
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const start = useRef<number | null>(null);
  const pending = useRef(false);
  const hiddenAt = useRef(0);
  const pullNow = useRef(0);

  // 2 + 3: new version and fresh listings
  useEffect(() => {
    const mine = currentBuild();
    if (!mine) return; // local development
    const check = async () => {
      const latest = await serverBuild();
      if (!latest || latest === mine) return;
      // A new version: reload now if the person is not typing and the app is on screen, otherwise on return
      if (document.visibilityState === 'visible' && !typing()) window.location.reload();
      else pending.current = true;
    };
    const onVisible = () => {
      if (document.visibilityState === 'hidden') { hiddenAt.current = Date.now(); return; }
      if (pending.current && !typing()) { window.location.reload(); return; }
      navigator.serviceWorker?.getRegistration().then((r) => r?.update()).catch(() => undefined);
      check();
      if (hiddenAt.current && Date.now() - hiddenAt.current > 3 * 60_000) { refreshParts(); refreshCars(); }
    };
    const t = window.setInterval(check, 10 * 60_000);
    document.addEventListener('visibilitychange', onVisible);
    return () => { window.clearInterval(t); document.removeEventListener('visibilitychange', onVisible); };
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

  if (!pull && !busy) return null;
  const ready = pull >= PULL_TO_RELOAD || busy;
  return (
    <div className="fixed top-0 inset-x-0 z-[90] flex justify-center pointer-events-none" style={{ transform: `translateY(${busy ? 70 : Math.max(0, pull - 30)}px)` }}>
      <div className={`w-11 h-11 rounded-full shadow-lg flex items-center justify-center ${ready ? 'bg-[#C8102E] text-white' : 'bg-white text-slate-500'}`}>
        <RefreshCw size={20} className={busy ? 'animate-spin' : ''} style={busy ? undefined : { transform: `rotate(${pull * 3}deg)` }} />
      </div>
    </div>
  );
};
