import React, { useId } from 'react';

export const OWNER_HINT = 'Владелец сайта KGzone: полное управление сайтом';

/** The owner's own crown: five points with gems, gold to ruby — not like the sellers' outline crown */
export const OwnerCrown: React.FC<{ size?: number; className?: string }> = ({ size = 28, className = '' }) => {
  const id = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size * 0.82} viewBox="0 0 64 52" className={`shrink-0 drop-shadow-[0_2px_4px_rgba(200,16,46,0.45)] ${className}`} aria-label="Владелец сайта" role="img">
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff3b0" />
          <stop offset="0.45" stopColor="#f5c400" />
          <stop offset="1" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id={`b${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#b45309" />
          <stop offset="0.5" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
      </defs>
      {/* crown body with five points */}
      <path d="M4 40 L2 12 L17 25 L24 5 L32 20 L40 5 L47 25 L62 12 L60 40 Z" fill={`url(#g${id})`} stroke="#92400e" strokeWidth="1.6" strokeLinejoin="round" />
      {/* band */}
      <rect x="4" y="38" width="56" height="10" rx="3" fill={`url(#b${id})`} stroke="#92400e" strokeWidth="1.6" />
      {/* gems on the points */}
      <circle cx="2.8" cy="11" r="3.2" fill="#C8102E" stroke="#7f1d1d" strokeWidth="1" />
      <circle cx="24" cy="4.5" r="3.2" fill="#2563eb" stroke="#1e3a8a" strokeWidth="1" />
      <circle cx="40" cy="4.5" r="3.2" fill="#2563eb" stroke="#1e3a8a" strokeWidth="1" />
      <circle cx="61.2" cy="11" r="3.2" fill="#C8102E" stroke="#7f1d1d" strokeWidth="1" />
      <circle cx="32" cy="19" r="3.6" fill="#10b981" stroke="#065f46" strokeWidth="1" />
      {/* gems on the band */}
      <rect x="29" y="40" width="6" height="6" rx="1" transform="rotate(45 32 43)" fill="#C8102E" stroke="#7f1d1d" strokeWidth="0.8" />
      <circle cx="16" cy="43" r="2.2" fill="#fff" opacity="0.9" />
      <circle cx="48" cy="43" r="2.2" fill="#fff" opacity="0.9" />
      {/* shine */}
      <path d="M9 34 L8 18 L15 25" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
};

/** Big badge for the owner: crown + «Владелец сайта» on a dark ruby-gold plate */
export const OwnerBadge: React.FC<{ compact?: boolean; className?: string }> = ({ compact = false, className = '' }) =>
  compact ? (
    <span title={OWNER_HINT} className={`inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#7f1d1d] via-[#C8102E] to-[#7f1d1d] text-amber-200 text-[11px] font-black ring-1 ring-amber-400/70 shadow shadow-red-900/30 ${className}`}>
      <OwnerCrown size={18} />
      <span>Владелец сайта</span>
    </span>
  ) : (
    <span title={OWNER_HINT} className={`inline-flex items-center gap-2.5 pl-2 pr-4 py-1.5 rounded-2xl bg-gradient-to-r from-[#450a0a] via-[#C8102E] to-[#450a0a] ring-2 ring-amber-400 shadow-lg shadow-red-900/30 ${className}`}>
      <OwnerCrown size={38} />
      <span className="leading-tight">
        <span className="block text-amber-200 text-sm font-black tracking-wide">Владелец сайта</span>
        <span className="block text-[10px] font-bold text-amber-100/80">Полное управление KGzone</span>
      </span>
    </span>
  );
