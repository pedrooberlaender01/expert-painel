import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface PlanLimitBannerProps {
  label: string;           // e.g. "leads", "instancias", "envios este mes"
  current: number;
  max: number | null;      // null = unlimited (don't show banner)
  atLimit: boolean;
  className?: string;
}

export const PlanLimitBanner: React.FC<PlanLimitBannerProps> = ({
  label,
  current,
  max,
  atLimit,
  className = '',
}) => {
  // Don't render if unlimited
  if (max === null) return null;

  const percentage = max > 0 ? Math.min(Math.round((current / max) * 100), 100) : 0;

  // Always show when >= 80% or at limit
  if (percentage < 80) return null;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-medium ${className}`}
      style={{
        background: atLimit
          ? 'rgba(244, 63, 94, 0.08)'
          : 'rgba(250, 204, 60, 0.08)',
        border: `1px solid ${atLimit ? 'rgba(244, 63, 94, 0.2)' : 'rgba(250, 204, 60, 0.2)'}`,
        color: atLimit ? '#fb7185' : '#facc3c',
      }}
    >
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <div className="flex-1">
        {atLimit ? (
          <span>Limite de {max} {label} atingido ({current}/{max}). Contate o administrador.</span>
        ) : (
          <span>{current}/{max} {label} utilizados ({percentage}%)</span>
        )}
      </div>
      {/* Progress bar */}
      <div className="w-20 h-1.5 rounded-full shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            background: atLimit ? '#fb7185' : '#facc3c',
          }}
        />
      </div>
    </div>
  );
};
