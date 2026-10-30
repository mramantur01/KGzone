import React from 'react';
import { Crown } from 'lucide-react';

// Crown for sellers checked by KGzone (in person, or a company with verified documents)
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
