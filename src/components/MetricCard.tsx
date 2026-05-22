import React, { useMemo } from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../utils/cn';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: string;
  trendType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  color?: 'primary' | 'cyan' | 'amber' | 'rose' | 'green';
  sparklineData?: number[];
}

const colorMap = {
  primary: {
    iconBg: 'var(--color-primary-bg)',
    iconColor: 'var(--color-primary-light)',
    sparkline: 'var(--color-primary)',
    sparklineFill: 'var(--color-primary-bg)',
    badgeBg: 'var(--color-primary-bg)',
    badgeBorder: 'var(--color-primary-bg)',
    badgeText: 'var(--color-primary-light)',
  },
  cyan: {
    iconBg: 'rgba(var(--color-primary-rgb), 0.12)',
    iconColor: 'var(--color-primary-light)',
    sparkline: 'var(--color-primary)',
    sparklineFill: 'rgba(var(--color-primary-rgb), 0.08)',
    badgeBg: 'rgba(var(--color-primary-rgb), 0.10)',
    badgeBorder: 'rgba(var(--color-primary-rgb), 0.20)',
    badgeText: 'var(--color-primary-light)',
  },
  amber: {
    iconBg: 'rgba(250, 204, 60, 0.12)',
    iconColor: '#facc3c',
    sparkline: '#F59E0B',
    sparklineFill: 'rgba(245, 158, 11, 0.08)',
    badgeBg: 'rgba(250, 204, 60, 0.10)',
    badgeBorder: 'rgba(250, 204, 60, 0.20)',
    badgeText: '#facc3c',
  },
  rose: {
    iconBg: 'rgba(244, 63, 94, 0.12)',
    iconColor: '#fb7185',
    sparkline: '#F43F5E',
    sparklineFill: 'rgba(244, 63, 94, 0.08)',
    badgeBg: 'rgba(244, 63, 94, 0.10)',
    badgeBorder: 'rgba(244, 63, 94, 0.20)',
    badgeText: '#fb7185',
  },
  green: {
    iconBg: 'rgba(52, 211, 153, 0.12)',
    iconColor: '#34d399',
    sparkline: '#10b981',
    sparklineFill: 'rgba(52, 211, 153, 0.08)',
    badgeBg: 'rgba(52, 211, 153, 0.10)',
    badgeBorder: 'rgba(52, 211, 153, 0.20)',
    badgeText: '#34d399',
  },
};

const Sparkline: React.FC<{ data: number[]; color: string; fill: string; colorKey: string }> = ({ data, color, fill, colorKey }) => {
  const width = 100;
  const height = 32;
  const padding = 2;
  const gradientId = `spark-fill-${colorKey}`;

  const points = useMemo(() => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    return data.map((val, i) => ({
      x: padding + (i / (data.length - 1)) * (width - padding * 2),
      y: padding + (1 - (val - min) / range) * (height - padding * 2),
    }));
  }, [data]);

  const linePath = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-8" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity="1" />
          <stop offset="100%" stopColor={fill} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="2" fill={color} />
    </svg>
  );
};

const defaultSparklines: Record<string, number[]> = {
  primary: [4, 6, 5, 8, 7, 9, 10, 8, 12, 11, 13],
  cyan: [8, 10, 9, 12, 11, 15, 14, 13, 16, 15, 18],
  amber: [3, 2, 4, 3, 5, 4, 3, 5, 4, 6, 3],
  rose: [5, 4, 6, 5, 3, 4, 5, 3, 4, 3, 2],
  green: [4, 6, 5, 8, 7, 9, 10, 8, 12, 11, 13],
};

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  trendType = 'neutral',
  icon: Icon,
  color = 'primary',
  sparklineData,
}) => {
  const colors = colorMap[color];
  const data = sparklineData || defaultSparklines[color];

  const trendConfig = {
    positive: { color: '#34d399', icon: TrendingUp, bg: 'rgba(52, 211, 153, 0.10)', border: 'rgba(52, 211, 153, 0.20)' },
    negative: { color: '#fb7185', icon: TrendingDown, bg: 'rgba(244, 63, 94, 0.10)', border: 'rgba(244, 63, 94, 0.20)' },
    neutral: { color: 'rgba(255,255,255,0.5)', icon: Minus, bg: 'rgba(255, 255, 255, 0.05)', border: 'rgba(255, 255, 255, 0.04)' },
  };

  const TrendIcon = trendConfig[trendType].icon;

  return (
    <div className="glass-card p-5 group h-full flex flex-col relative">
      <div className="relative z-10 flex flex-col h-full">
        {/* Header: icon + trend badge */}
        <div className="flex justify-between items-start mb-4">
          <Icon
            className="w-[22px] h-[22px] transition-all duration-300 group-hover:scale-110"
            strokeWidth={1.6}
            style={{
              color: colors.iconColor,
              filter: `drop-shadow(0 0 6px ${colors.iconBg})`,
            }}
          />

          {trend && (
            <div
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium tracking-wide"
              style={{
                background: trendConfig[trendType].bg,
                border: `1px solid ${trendConfig[trendType].border}`,
                color: trendConfig[trendType].color,
              }}
            >
              <TrendIcon className="w-3 h-3" />
              <span>{trend}</span>
            </div>
          )}
        </div>

        {/* Label */}
        <p className="text-[11px] font-semibold uppercase tracking-[0.5px] mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {title}
        </p>

        {/* Value */}
        <div className="text-[28px] font-bold text-white font-display tracking-tight leading-none mb-1 animate-count-up" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </div>

        {subtitle && (
          <p className="text-[12px] leading-relaxed mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {subtitle}
          </p>
        )}

        {/* Sparkline */}
        <div className="mt-auto pt-3">
          <div className="sparkline-container">
            <Sparkline data={data} color={colors.sparkline} fill={colors.sparklineFill} colorKey={color} />
          </div>
        </div>
      </div>
    </div>
  );
};
