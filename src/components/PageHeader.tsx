import React from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '../utils/cn';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  rightContent?: React.ReactNode;
  titleRight?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  onRefresh,
  isRefreshing,
  rightContent,
  titleRight
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-bold text-txt font-display tracking-tight">{title}</h1>
          {titleRight}
        </div>
        {subtitle && <p className="text-[13px] mt-1 font-light" style={{ color: 'var(--c-t-45)' }}>{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {rightContent}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl transition-all duration-200 disabled:opacity-50"
            style={{
              color: 'var(--c-t-50)',
              background: 'var(--c-glass)',
              border: '1px solid var(--c-border)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--color-primary-light)';
              e.currentTarget.style.borderColor = 'rgba(var(--color-primary-rgb),0.3)';
              e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgb(var(--c-fg-rgb) / 0.5)';
              e.currentTarget.style.borderColor = 'var(--c-border)';
              e.currentTarget.style.background = 'var(--c-glass)';
            }}
            title="Atualizar dados"
          >
            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
          </button>
        )}
      </div>
    </div>
  );
};
