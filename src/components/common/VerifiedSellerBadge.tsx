import React from 'react';
import { Crown, Store } from 'lucide-react';

// Crown for private sellers checked by KGzone; ИП / ОсОО have the blue "Официальный магазин" badge
export const VERIFIED_SELLER_HINT = 'Проверенный продавец: администрация KGzone проверила этого продавца — документы и место продажи.';

export const VerifiedSellerBadge: React.FC<{ withLabel?: boolean; size?: number; className?: string }> = ({ withLabel = false, size = 12, className = '' }) =>
  withLabel ? (
    <span
      title={VERIFIED_SELLER_HINT}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-300 to-yellow-500 text-neutral-950 text-[10px] font-black shadow-sm shadow-amber-500/30 ${className}`}
    >
      <Crown size={size} className="fill-neutral-950/15" />
      <span>Проверенный продавец</span>
    </span>
  ) : (
    <span title={VERIFIED_SELLER_HINT} className={`inline-flex shrink-0 ${className}`}>
      <Crown size={size} className="text-amber-400 fill-amber-400/30" aria-label="Проверенный продавец" />
    </span>
  );

export const OFFICIAL_COMPANY_HINT = 'Официальный магазин: ИП или ОсОО, документы проверены администрацией KGzone.';

/** Blue shop badge for ИП / ОсОО with checked documents (different from the private seller crown) */
export const OfficialCompanyBadge: React.FC<{ className?: string; compact?: boolean }> = ({ className = '', compact = false }) => (
  <span title={OFFICIAL_COMPANY_HINT} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-600 text-white text-[10px] font-black shadow-sm ${className}`}>
    <Store size={11} />
    <span>{compact ? 'Магазин' : 'Официальный магазин'}</span>
  </span>
);
