import React from 'react';

/**
 * Кыргызский орнамент "Кочкор мүйүз" (Рога архара / барана)
 * Символ достатка, силы, уважения и благополучия в Кыргызстане
 */
export const KochkorMuyuzIcon: React.FC<{
  className?: string;
  size?: number;
  color?: string;
}> = ({ className = '', size = 24, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Симметричные спиральные завитки Кочкор Мүйүз */}
    <path
      d="M50 85 C50 65 30 55 22 45 C14 35 15 22 25 16 C35 10 46 17 44 28 C42 37 32 38 29 32 C26 27 30 22 34 23"
      stroke={color}
      strokeWidth="5"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M50 85 C50 65 70 55 78 45 C86 35 85 22 75 16 C65 10 54 17 56 28 C58 37 68 38 71 32 C74 27 70 22 66 23"
      stroke={color}
      strokeWidth="5"
      strokeLinecap="round"
      fill="none"
    />
    {/* Нижняя сердцевина */}
    <circle cx="50" cy="85" r="4" fill={color} />
    <path
      d="M50 35 L50 70"
      stroke={color}
      strokeWidth="3.5"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * Түндүк жана Күн (Символ юрты и лучи солнца Кыргызстана)
 */
export const TundukIcon: React.FC<{
  className?: string;
  size?: number;
  color?: string;
}> = ({ className = '', size = 24, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Внешний круг солнца */}
    <circle cx="50" cy="50" r="32" stroke={color} strokeWidth="4.5" />
    
    {/* Тройные пересекающиеся изогнутые дуги тюндюка (чамгарак) */}
    {/* Горизонтально изогнутые дуги */}
    <path d="M22 42 C38 46 62 46 78 42" stroke={color} strokeWidth="3" strokeLinecap="round" />
    <path d="M19 50 C36 53 64 53 81 50" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
    <path d="M22 58 C38 54 62 54 78 58" stroke={color} strokeWidth="3" strokeLinecap="round" />
    
    {/* Вертикально изогнутые пересекающиеся дуги */}
    <path d="M42 22 C46 38 46 62 42 78" stroke={color} strokeWidth="3" strokeLinecap="round" />
    <path d="M50 19 C53 36 53 64 50 81" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
    <path d="M58 22 C54 38 54 62 58 78" stroke={color} strokeWidth="3" strokeLinecap="round" />

    {/* Декоративные лучи солнца */}
    <path d="M50 6 L50 12" stroke={color} strokeWidth="3" strokeLinecap="round" />
    <path d="M50 88 L50 94" stroke={color} strokeWidth="3" strokeLinecap="round" />
    <path d="M6 50 L12 50" stroke={color} strokeWidth="3" strokeLinecap="round" />
    <path d="M88 50 L94 50" stroke={color} strokeWidth="3" strokeLinecap="round" />
    <path d="M19 19 L23 23" stroke={color} strokeWidth="3" strokeLinecap="round" />
    <path d="M77 77 L81 81" stroke={color} strokeWidth="3" strokeLinecap="round" />
    <path d="M81 19 L77 23" stroke={color} strokeWidth="3" strokeLinecap="round" />
    <path d="M19 81 L23 77" stroke={color} strokeWidth="3" strokeLinecap="round" />
  </svg>
);

/**
 * Кыргызский флажок KG с автономером (KG с тюндюком)
 */
export const KyrgyzPlateBadge: React.FC<{ plate: string; className?: string }> = ({
  plate,
  className = '',
}) => {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white border border-slate-300 rounded shadow-xs font-mono font-bold text-xs tracking-wider text-slate-900 ${className}`}
      title={`Госномер Кыргызстана: ${plate}`}
    >
      <div className="flex flex-col items-center justify-center -ml-1 pr-1 border-r border-slate-300 h-4">
        {/* Флаг Кыргызстана миниатюрный */}
        <div className="w-3.5 h-2.5 bg-red-600 rounded-[1px] flex items-center justify-center relative overflow-hidden">
          <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 flex items-center justify-center">
            <div className="w-0.5 h-0.5 bg-red-600 rounded-full" />
          </div>
        </div>
        <span className="text-[7px] leading-tight font-black text-blue-900 tracking-tighter">KG</span>
      </div>
      <span className="tabular-nums font-semibold tracking-wide">{plate}</span>
    </div>
  );
};

/**
 * Декоративная бордюрная лента с традиционным узором "Шырдак"
 */
export const ShyrdakRibbon: React.FC<{
  className?: string;
  variant?: 'red' | 'gold' | 'dark' | 'subtle';
}> = ({ className = '', variant = 'red' }) => {
  const getColors = () => {
    switch (variant) {
      case 'gold':
        return { bg: 'bg-amber-600', stroke: '#FDE047', accent: '#CA8A04' };
      case 'dark':
        return { bg: 'bg-slate-900', stroke: '#E2E8F0', accent: '#C8102E' };
      case 'subtle':
        return { bg: 'bg-slate-100', stroke: '#94A3B8', accent: '#CBD5E1' };
      case 'red':
      default:
        return { bg: 'bg-[#C8102E]', stroke: '#FFD700', accent: '#990000' };
    }
  };

  const { stroke } = getColors();

  return (
    <div className={`w-full overflow-hidden h-3.5 flex items-center ${className}`}>
      <svg
        className="w-full h-full"
        viewBox="0 0 1200 24"
        preserveAspectRatio="repeat-x"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <pattern
          id={`kyrgyz-pattern-${variant}`}
          x="0"
          y="0"
          width="48"
          height="24"
          patternUnits="userSpaceOnUse"
        >
          {/* Роговой узор шырдак */}
          <path
            d="M0 12 Q12 0 24 12 Q36 24 48 12"
            stroke={stroke}
            strokeWidth="2"
            fill="none"
            opacity="0.85"
          />
          <path
            d="M12 12 Q24 24 24 12 Q24 0 36 12"
            stroke={stroke}
            strokeWidth="1.5"
            fill="none"
            opacity="0.6"
          />
          <circle cx="24" cy="12" r="2" fill={stroke} />
        </pattern>
        <rect width="1200" height="24" fill={`url(#kyrgyz-pattern-${variant})`} />
      </svg>
    </div>
  );
};

/**
 * Элегантный декоративный разделитель секций с центральным элементом Кочкор Мүйүз
 */
export const KyrgyzSectionDivider: React.FC<{
  title?: string;
  subtitle?: string;
  className?: string;
}> = ({ title, subtitle, className = '' }) => {
  return (
    <div className={`flex flex-col items-center justify-center my-6 ${className}`}>
      <div className="flex items-center w-full max-w-4xl gap-4">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-red-200 to-red-400" />
        <div className="flex items-center gap-2 px-3 py-1 bg-red-50 text-[#C8102E] rounded-md border border-red-100">
          <KochkorMuyuzIcon size={20} color="#C8102E" />
          <span className="text-xs font-semibold uppercase tracking-wider text-red-900">
            Кыргызстан · KGzone
          </span>
          <KochkorMuyuzIcon size={20} color="#C8102E" className="rotate-180" />
        </div>
        <div className="flex-1 h-px bg-gradient-to-l from-transparent via-red-200 to-red-400" />
      </div>
      {title && (
        <h2 className="mt-3 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          {title}
        </h2>
      )}
      {subtitle && (
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      )}
    </div>
  );
};
