import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Megaphone, ExternalLink } from 'lucide-react';
import type { AdBanner } from '../../data/adBanners';

interface AdBannerSlotProps {
  banners: AdBanner[];
  intervalMs?: number;
  className?: string;
  /** tall = 300×600 half-page, box = 300×250 medium rectangle */
  variant?: 'tall' | 'box';
}

// Rotating ad slot (300×600 or 300×250). Pauses while hovered or focused.
export const AdBannerSlot: React.FC<AdBannerSlotProps> = ({ banners, intervalMs = 6000, className = '', variant = 'tall' }) => {
  const isBox = variant === 'box';
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = banners.length;

  useEffect(() => {
    if (paused || count < 2) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), intervalMs);
    return () => window.clearInterval(id);
  }, [paused, count, intervalMs]);

  if (count === 0) return null;
  const go = (delta: number) => setIndex((i) => (i + delta + count) % count);

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950 ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className={`relative w-full ${isBox ? 'aspect-[6/5]' : 'aspect-[1/2] max-h-[560px]'}`}>
        {banners.map((b, i) => (
          <a
            key={b.id}
            href={b.href}
            target="_blank"
            rel="noopener noreferrer sponsored"
            aria-hidden={i !== index}
            tabIndex={i === index ? 0 : -1}
            className={`absolute inset-0 flex flex-col justify-end ${isBox ? 'p-4' : 'p-5'} transition-opacity duration-500 ${
              i === index ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none'
            } ${b.image ? '' : `bg-gradient-to-b ${b.gradient}`}`}
          >
            {b.image && (
              <img src={b.image} alt={b.title} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
            )}
            {b.image && <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />}

            {!b.image && !isBox && (
              <div className="absolute inset-x-0 top-12 flex justify-center">
                <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <Megaphone size={40} className="text-amber-400" />
                </div>
              </div>
            )}

            {!b.image && isBox && (
              <Megaphone size={22} className="absolute right-4 top-4 text-amber-400/80" />
            )}

            <div className={`relative ${isBox ? 'space-y-1.5' : 'space-y-2.5'}`}>
              {b.badge && (
                <span className="inline-block px-2 py-0.5 rounded-md bg-black/50 border border-white/15 text-[10px] font-bold uppercase tracking-wider text-neutral-300">
                  {b.badge}
                </span>
              )}
              <h4 className={`font-black text-white leading-tight ${isBox ? 'text-base' : 'text-lg'}`}>{b.title}</h4>
              <p className={`text-neutral-300 ${isBox ? 'text-[11px] leading-snug' : 'text-xs leading-relaxed'}`}>{b.text}</p>
              <span className={`inline-flex items-center gap-1.5 ${isBox ? 'px-3 py-1.5' : 'px-3.5 py-2'} rounded-xl bg-[#C8102E] hover:bg-[#a60d26] text-white text-xs font-bold transition-colors`}>
                <span>{b.cta}</span>
                <ExternalLink size={13} />
              </span>
            </div>
          </a>
        ))}
      </div>

      {count > 1 && (
        <>
          {/* Arrows would cover the text in the small box format; dots are enough there */}
          {!isBox && (
          <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Предыдущий баннер"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 border border-white/10 text-white flex items-center justify-center cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Следующий баннер"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 border border-white/10 text-white flex items-center justify-center cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>
          </>
          )}
          <div className="absolute top-3 inset-x-0 z-20 flex justify-center gap-1.5">
            {banners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Баннер ${i + 1}`}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  i === index ? 'w-6 bg-amber-400' : 'w-1.5 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
