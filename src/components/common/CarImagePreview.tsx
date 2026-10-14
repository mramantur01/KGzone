import React, { useState } from 'react';
import { KochkorMuyuzIcon } from '../ornaments/KyrgyzOrnaments';

interface CarImagePreviewProps {
  src?: string;
  alt: string;
  bodyType?: string;
  brand?: string;
  color?: string;
  className?: string;
  aspectRatio?: 'video' | '4/3' | '16/9' | 'auto';
}

export const CarImagePreview: React.FC<CarImagePreviewProps> = ({
  src,
  alt,
  bodyType = 'Седан',
  brand = 'Toyota',
  color = '#2563EB',
  className = '',
  aspectRatio = '4/3',
}) => {
  const [hasError, setHasError] = useState(false);

  const getAspectClass = () => {
    switch (aspectRatio) {
      case 'video':
      case '16/9':
        return 'aspect-video';
      case '4/3':
        return 'aspect-4/3';
      default:
        return 'aspect-4/3';
    }
  };

  if (src && !hasError) {
    return (
      <div className={`relative overflow-hidden bg-slate-900 ${getAspectClass()} ${className}`}>
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Мягкий градиент затемнения снизу для четкости текста */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent pointer-events-none" />
      </div>
    );
  }

  // Высококачественный SVG fallback с силуэтом машины и панорамой Тянь-Шаня
  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 flex flex-col justify-end ${getAspectClass()} ${className}`}
    >
      {/* Фоновый силуэт гор Кыргызстана (Ала-Тоо / Тянь-Шань) */}
      <svg
        className="absolute inset-0 w-full h-full opacity-40 pointer-events-none"
        preserveAspectRatio="none"
        viewBox="0 0 400 250"
      >
        <defs>
          <linearGradient id="mountainsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#CBD5E1" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#1E293B" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="snowCap" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#E2E8F0" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Задние снежные пики */}
        <polygon points="60,30 110,130 10,130" fill="url(#mountainsGrad)" />
        <polygon points="60,30 80,65 40,65" fill="url(#snowCap)" />

        <polygon points="190,15 260,140 120,140" fill="url(#mountainsGrad)" />
        <polygon points="190,15 215,60 165,60" fill="url(#snowCap)" />

        <polygon points="320,40 390,140 250,140" fill="url(#mountainsGrad)" />
        <polygon points="320,40 340,75 300,75" fill="url(#snowCap)" />

        {/* Дорожное полотно */}
        <path d="M0,170 Q200,165 400,170 L400,250 L0,250 Z" fill="#0F172A" />
        <line x1="0" y1="210" x2="400" y2="210" stroke="#E2E8F0" strokeWidth="2" strokeDasharray="16,12" opacity="0.3" />
      </svg>

      {/* Тонкий кыргызский орнамент водяной знак */}
      <div className="absolute top-2 right-2 text-white/20">
        <KochkorMuyuzIcon size={32} />
      </div>

      {/* Стилизованный кузов авто в зависимости от типа кузова */}
      <div className="relative z-10 w-full px-6 pb-4 pt-10 flex flex-col items-center">
        <svg
          viewBox="0 0 240 100"
          className="w-44 h-auto drop-shadow-xl text-slate-100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {bodyType === 'Внедорожник' || bodyType === 'Кроссовер' ? (
            /* Внедорожник / Кроссовер (Prado / LC300 / RX) */
            <g stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path
                d="M20 70 L28 48 L65 32 L155 32 L195 44 L222 55 L225 72 L195 72"
                fill="#1E293B"
                opacity="0.8"
              />
              <path d="M20 70 L225 70" />
              {/* Колесные арки */}
              <circle cx="60" cy="72" r="14" fill="#0F172A" stroke="currentColor" strokeWidth="3" />
              <circle cx="60" cy="72" r="7" fill="#64748B" />
              <circle cx="175" cy="72" r="14" fill="#0F172A" stroke="currentColor" strokeWidth="3" />
              <circle cx="175" cy="72" r="7" fill="#64748B" />
              {/* Окна и стойки */}
              <path d="M72 38 L115 38 L115 54 L64 54 Z" fill="#94A3B8" opacity="0.3" />
              <path d="M125 38 L165 38 L182 54 L125 54 Z" fill="#94A3B8" opacity="0.3" />
              {/* Рейлинги на крыше */}
              <line x1="75" y1="28" x2="160" y2="28" stroke="#FDE047" strokeWidth="2" />
              {/* Фара */}
              <polygon points="215,58 223,59 221,65 212,64" fill="#FDE047" />
            </g>
          ) : bodyType === 'Минивэн' ? (
            /* Минивэн / Бусик (Alphard / Stepwgn) */
            <g stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path
                d="M20 70 L22 35 L165 30 L195 45 L220 58 L222 72"
                fill="#1E293B"
                opacity="0.8"
              />
              <path d="M20 70 L222 70" />
              <circle cx="55" cy="72" r="13" fill="#0F172A" stroke="currentColor" strokeWidth="3" />
              <circle cx="55" cy="72" r="6" fill="#64748B" />
              <circle cx="175" cy="72" r="13" fill="#0F172A" stroke="currentColor" strokeWidth="3" />
              <circle cx="175" cy="72" r="6" fill="#64748B" />
              <path d="M30 40 L90 38 L90 55 L30 55 Z" fill="#94A3B8" opacity="0.3" />
              <path d="M98 38 L155 36 L175 55 L98 55 Z" fill="#94A3B8" opacity="0.3" />
            </g>
          ) : (
            /* Седан (Camry / E-Class / K5) */
            <g stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path
                d="M18 72 L32 58 L68 40 L140 40 L188 56 L222 62 L225 72"
                fill="#1E293B"
                opacity="0.8"
              />
              <path d="M18 72 L225 72" />
              <circle cx="58" cy="72" r="13" fill="#0F172A" stroke="currentColor" strokeWidth="3" />
              <circle cx="58" cy="72" r="6" fill="#64748B" />
              <circle cx="178" cy="72" r="13" fill="#0F172A" stroke="currentColor" strokeWidth="3" />
              <circle cx="178" cy="72" r="6" fill="#64748B" />
              <path d="M72 44 L110 44 L110 56 L55 56 Z" fill="#94A3B8" opacity="0.3" />
              <path d="M118 44 L152 44 L170 56 L118 56 Z" fill="#94A3B8" opacity="0.3" />
              <polygon points="214,64 222,64 220,68 212,68" fill="#FDE047" />
            </g>
          )}
        </svg>

        <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-slate-300">
          <span>{brand}</span>
          <span className="text-slate-500">·</span>
          <span>{bodyType}</span>
        </div>
      </div>
    </div>
  );
};
