import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Toast } from '../components/Toast';
import { MetricCard } from '../components/MetricCard';
import { LeadBadge } from '../components/LeadBadge';
import {
  Users, TrendingUp, Clock, ArrowRight, Bell, X, Activity,
  ChevronLeft, ChevronRight, Calendar, CheckCheck,
} from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';
import { useNotificacoes } from '../hooks/useNotificacoes';
import { useToast } from '../hooks/useToast';
import { format, subDays, startOfDay, endOfDay, isWithinInterval, isSameDay, getDaysInMonth, getMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import { formatTime, formatTelefone, formatRelativeTime } from '../utils/formatters';
import { NotificacoesList } from './Notificacoes';
import { cn } from '../utils/cn';
import type { StatusLead } from '../types/database';

// ─── Period Selector Types ───
type PresetKey = 'hoje' | '7dias' | '15dias' | '30dias' | 'custom';

interface DateRange {
  start: Date;
  end: Date;
}

const PRESETS: { key: PresetKey; label: string; days: number }[] = [
  { key: 'hoje', label: 'Hoje', days: 1 },
  { key: '7dias', label: '7 dias', days: 7 },
  { key: '15dias', label: '15 dias', days: 15 },
  { key: '30dias', label: '30 dias', days: 30 },
];

const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// Parse date string as local time — avoids UTC shift that moves the date back 1 day in BR timezone
function parseLocalDate(dateStr: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr + 'T12:00:00');
  }
  return new Date(dateStr);
}

// ─── Compact Day Picker ───
const DayPicker: React.FC<{
  selectedDate: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
  label: string;
}> = ({ selectedDate, onSelect, onClose, label }) => {
  const [viewMonth, setViewMonth] = useState(getMonth(selectedDate));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const now = new Date();
  const currentYear = now.getFullYear();
  const daysInMonth = getDaysInMonth(new Date(currentYear, viewMonth));
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handleSelect = (day: number) => {
    const d = new Date(currentYear, viewMonth, day);
    if (d > now) return;
    onSelect(d);
    onClose();
  };

  return (
    <div
      ref={ref}
      className="absolute top-full mt-2 z-[100] animate-fade-in w-[260px] overflow-hidden"
      style={{
        background: 'rgba(22, 27, 34, 0.97)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '14px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.06)',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
      }}
    >
      {/* Label */}
      <div style={{ padding: '16px 16px 4px' }}>
        <span className="text-[11px] uppercase font-medium" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px' }}>{label}</span>
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between" style={{ padding: '8px 16px' }}>
        <button
          onClick={() => setViewMonth(m => Math.max(0, m - 1))}
          className="transition-all duration-150"
          style={{ color: 'rgba(255,255,255,0.4)', background: 'transparent', border: 'none', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="text-[14px] font-semibold text-white">{MONTHS_SHORT[viewMonth]}</span>
        <button
          onClick={() => setViewMonth(m => Math.min(11, m + 1))}
          className="transition-all duration-150"
          style={{ color: viewMonth >= getMonth(now) ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.4)', background: 'transparent', border: 'none', padding: '4px 8px', borderRadius: '6px', cursor: viewMonth >= getMonth(now) ? 'default' : 'pointer' }}
          onMouseEnter={(e) => { if (viewMonth < getMonth(now)) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; } }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = viewMonth >= getMonth(now) ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.4)'; }}
          disabled={viewMonth >= getMonth(now)}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Day grid */}
      <div style={{ padding: '0 16px 16px' }}>
        <div className="grid grid-cols-7" style={{ gap: '2px' }}>
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
            <div key={i} className="text-[11px] text-center font-medium" style={{ color: 'rgba(255,255,255,0.35)', padding: '6px 0' }}>{d}</div>
          ))}
          {Array.from({ length: new Date(currentYear, viewMonth, 1).getDay() }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}
          {days.map(day => {
            const date = new Date(currentYear, viewMonth, day);
            const isFuture = date > now;
            const isSelected = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, now);

            return (
              <button
                key={day}
                onClick={() => handleSelect(day)}
                disabled={isFuture}
                className="flex items-center justify-center transition-all duration-150"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  background: isSelected ? '#3b82f6' : 'transparent',
                  color: isFuture ? 'rgba(255,255,255,0.15)' : isSelected ? '#fff' : isToday ? '#60a5fa' : 'rgba(255,255,255,0.7)',
                  fontWeight: isSelected || isToday ? 600 : 400,
                  cursor: isFuture ? 'not-allowed' : 'pointer',
                  border: isToday && !isSelected ? '1px solid rgba(59,130,246,0.4)' : '1px solid transparent',
                }}
                onMouseEnter={(e) => { if (!isFuture && !isSelected) { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; } }}
                onMouseLeave={(e) => { if (!isFuture && !isSelected) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = isToday ? '#60a5fa' : 'rgba(255,255,255,0.7)'; } }}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── Period Selector Component ───
const PeriodSelector: React.FC<{
  activePreset: PresetKey;
  dateRange: DateRange;
  onPresetChange: (key: PresetKey) => void;
  onDateRangeChange: (range: DateRange) => void;
}> = ({ activePreset, dateRange, onPresetChange, onDateRangeChange }) => {
  const [startPickerOpen, setStartPickerOpen] = useState(false);
  const [endPickerOpen, setEndPickerOpen] = useState(false);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      {/* Preset pills */}
      <div className="flex items-center gap-1 p-0.5 rounded-xl">
        {PRESETS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onPresetChange(key)}
            className={cn(
              "px-3 py-1.5 rounded-full text-[11px] font-medium font-display transition-all duration-300",
              activePreset === key
                ? "text-[#60a5fa]"
                : "text-white/[0.4] hover:text-white/[0.6] bg-transparent"
            )}
            style={activePreset === key ? {
              background: 'rgba(59,130,246,0.15)',
              border: '1px solid rgba(59,130,246,0.3)',
            } : {
              border: '1px solid transparent',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Separator */}
      <div className="hidden sm:block w-px h-5 bg-white/[0.06]" />

      {/* Date range display */}
      <div className="flex items-center gap-2 text-[11px] font-mono">
        <Calendar className="w-3 h-3 text-txt-dim" />

        {/* Start date */}
        <div className="relative">
          <button
            onClick={() => { setStartPickerOpen(!startPickerOpen); setEndPickerOpen(false); }}
            className={cn(
              "px-2 py-1 rounded-lg transition-all duration-200 tabular-nums",
              startPickerOpen
                ? "bg-[#3b82f6]/10 text-[#60a5fa] border border-[#3b82f6]/20"
                : "text-txt-secondary hover:text-txt hover:bg-white/[0.03] border border-transparent"
            )}
          >
            {format(dateRange.start, 'dd/MM')}
          </button>
          {startPickerOpen && (
            <DayPicker
              selectedDate={dateRange.start}
              onSelect={(d) => {
                onDateRangeChange({ start: d, end: dateRange.end < d ? d : dateRange.end });
              }}
              onClose={() => setStartPickerOpen(false)}
              label="Data inicio"
            />
          )}
        </div>

        <span className="text-txt-dim">—</span>

        {/* End date */}
        <div className="relative">
          <button
            onClick={() => { setEndPickerOpen(!endPickerOpen); setStartPickerOpen(false); }}
            className={cn(
              "px-2 py-1 rounded-lg transition-all duration-200 tabular-nums",
              endPickerOpen
                ? "bg-[#3b82f6]/10 text-[#60a5fa] border border-[#3b82f6]/20"
                : "text-txt-secondary hover:text-txt hover:bg-white/[0.03] border border-transparent"
            )}
          >
            {format(dateRange.end, 'dd/MM')}
          </button>
          {endPickerOpen && (
            <DayPicker
              selectedDate={dateRange.end}
              onSelect={(d) => {
                onDateRangeChange({ start: dateRange.start > d ? d : dateRange.start, end: d });
              }}
              onClose={() => setEndPickerOpen(false)}
              label="Data fim"
            />
          )}
        </div>
      </div>
    </div>
  );
};

// ─── KPI Date Range Picker ───
const KpiDateRangePicker: React.FC<{
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}> = ({ dateRange, onDateRangeChange }) => {
  const [startPickerOpen, setStartPickerOpen] = useState(false);
  const [endPickerOpen, setEndPickerOpen] = useState(false);

  return (
    <div className="flex items-center gap-2 text-[11px] font-mono">
      <Calendar className="w-3 h-3 text-txt-dim" />

      {/* Start date */}
      <div className="relative">
        <button
          onClick={() => { setStartPickerOpen(!startPickerOpen); setEndPickerOpen(false); }}
          className={cn(
            "px-2 py-1 rounded-lg transition-all duration-200 tabular-nums",
            startPickerOpen
              ? "bg-[#3b82f6]/10 text-[#60a5fa] border border-[#3b82f6]/20"
              : "text-txt-secondary hover:text-txt hover:bg-white/[0.03] border border-transparent"
          )}
        >
          {format(dateRange.start, 'dd/MM')}
        </button>
        {startPickerOpen && (
          <DayPicker
            selectedDate={dateRange.start}
            onSelect={(d) => {
              onDateRangeChange({ start: d, end: dateRange.end < d ? d : dateRange.end });
            }}
            onClose={() => setStartPickerOpen(false)}
            label="Data inicio"
          />
        )}
      </div>

      <span className="text-txt-dim">—</span>

      {/* End date */}
      <div className="relative">
        <button
          onClick={() => { setEndPickerOpen(!endPickerOpen); setStartPickerOpen(false); }}
          className={cn(
            "px-2 py-1 rounded-lg transition-all duration-200 tabular-nums",
            endPickerOpen
              ? "bg-[#3b82f6]/10 text-[#60a5fa] border border-[#3b82f6]/20"
              : "text-txt-secondary hover:text-txt hover:bg-white/[0.03] border border-transparent"
          )}
        >
          {format(dateRange.end, 'dd/MM')}
        </button>
        {endPickerOpen && (
          <DayPicker
            selectedDate={dateRange.end}
            onSelect={(d) => {
              onDateRangeChange({ start: dateRange.start > d ? d : dateRange.start, end: d });
            }}
            onClose={() => setEndPickerOpen(false)}
            label="Data fim"
          />
        )}
      </div>
    </div>
  );
};

// ─── Chart Tooltip ───
type TooltipEntry = { color?: string; name?: string; value?: number | string };
type TooltipProps = { active?: boolean; payload?: TooltipEntry[]; label?: string };

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (!active || !payload) return null;
  return (
    <div className="relative rounded-xl p-3.5 shadow-2xl overflow-hidden"
      style={{
        background: 'rgba(255, 255, 255, 0.04)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255, 255, 255, 0.04)',
      }}
    >
      <p className="text-[10px] font-mono mb-2.5 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.45)' }}>
        {label ? format(parseLocalDate(label), "EEE, dd 'de' MMM", { locale: ptBR }) : ''}
      </p>
      <div className="space-y-1.5">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-6 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color || '#3370FF', boxShadow: `0 0 6px ${entry.color || '#3370FF'}40` }} />
              <span className="text-txt-secondary text-[11px]">{entry.name ?? ''}</span>
            </div>
            <span className="text-txt font-mono font-semibold text-[11px] tabular-nums">{entry.value ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Skeleton Loader ───
const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-10 bg-white/[0.03] rounded-xl w-64" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="card-dark p-5 h-44">
          <div className="h-4 bg-white/[0.04] rounded w-20 mb-4" />
          <div className="h-8 bg-white/[0.04] rounded w-16 mb-2" />
          <div className="h-3 bg-white/[0.03] rounded w-32" />
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 card-dark p-6 h-96" />
      <div className="card-dark p-5 h-96" />
    </div>
  </div>
);

// ─── Dashboard ───
export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<PresetKey>('7dias');
  const [dias, setDias] = useState(7);
  const [dateRange, setDateRange] = useState<DateRange>({
    start: startOfDay(subDays(new Date(), 6)),
    end: endOfDay(new Date()),
  });

  // KPI date range (default: today)
  const [kpiRange, setKpiRange] = useState<DateRange>({
    start: startOfDay(new Date()),
    end: endOfDay(new Date()),
  });

  const kpiInicio = format(kpiRange.start, 'yyyy-MM-dd');
  const kpiFim = format(kpiRange.end, 'yyyy-MM-dd');
  const kpiIsSingleDay = isSameDay(kpiRange.start, kpiRange.end);
  const kpiIsToday = kpiIsSingleDay && isSameDay(kpiRange.start, new Date());

  const { metricas, chartData, leadsPeriodo, loading, error: dashboardError, refresh } = useDashboard(dias, kpiInicio, kpiFim);
  const {
    notificacoes,
    contadorNaoLidas,
    loading: loadingNotif,
    marcarComoLida,
    marcarTodasComoLidas,
  } = useNotificacoes();
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    if (dashboardError) showToast('error', dashboardError);
  }, [dashboardError, showToast]);

  const handlePresetChange = (key: PresetKey) => {
    setActivePreset(key);
    const now = new Date();
    const preset = PRESETS.find(p => p.key === key);
    if (preset) {
      setDias(preset.days);
      setDateRange({
        start: startOfDay(subDays(now, preset.days - 1)),
        end: endOfDay(now),
      });
    }
  };

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange({ start: startOfDay(range.start), end: endOfDay(range.end) });
    setActivePreset('custom');
    // Calculate days from custom range
    const diffTime = Math.abs(range.end.getTime() - range.start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    setDias(diffDays);
  };

  // Filter chart data by selected date range (for custom ranges)
  const filteredChartData = useMemo(() => {
    if (activePreset !== 'custom') return chartData;
    return chartData.filter(metric => {
      const metricDate = parseLocalDate(metric.data);
      return isWithinInterval(metricDate, { start: dateRange.start, end: dateRange.end });
    });
  }, [chartData, dateRange, activePreset]);

  // KPI values from real data
  const totalLeads = leadsPeriodo.length;
  const leadsNoGrupo = leadsPeriodo.filter(l => !!l.entrou_no_grupo).length;
  const conversionRate = totalLeads > 0 ? Math.round((leadsNoGrupo / totalLeads) * 100) : 0;
  const leadsWaiting = leadsPeriodo.filter(l => l.status === 'sem_resposta').length;

  // Sparkline data derived from real chart data
  const sparkLeads = useMemo(() => filteredChartData.map(d => d.leads_total), [filteredChartData]);
  const sparkConversao = useMemo(() => filteredChartData.map(d => d.no_grupo), [filteredChartData]);
  const sparkAguardando = useMemo(() => filteredChartData.map(d => d.leads_total - d.no_grupo), [filteredChartData]);

  // Compute chart title dynamically
  const chartTitle = useMemo(() => {
    const preset = PRESETS.find(p => p.key === activePreset);
    if (preset) {
      if (activePreset === 'hoje') return 'Metricas de Conversao - Hoje';
      return `Metricas de Conversao - ${preset.days} Dias`;
    }
    return 'Metricas de Conversao';
  }, [activePreset]);

  // Summary stats for the selected period
  const periodSummary = useMemo(() => {
    if (filteredChartData.length === 0) return { total: 0, avg: 0, best: 0 };
    const total = filteredChartData.reduce((sum, d) => sum + d.leads_total, 0);
    const avg = Math.round(total / filteredChartData.length);
    const best = Math.max(...filteredChartData.map(d => d.leads_total));
    return { total, avg, best };
  }, [filteredChartData]);


  // Show skeleton on initial load
  if (loading && !metricas) {
    return (
      <div className="space-y-6">
      <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && <Toast toast={toast} onClose={hideToast} />}

      <PageHeader
        title="Dashboard"
        subtitle={format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        onRefresh={refresh}
        isRefreshing={loading}
        titleRight={
          <button
            onClick={() => setIsNotificationsOpen(true)}
            className="relative p-2.5 rounded-xl transition-all duration-300 group"
            style={{ color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)' }}
            aria-label="Abrir notificacoes"
          >
            <Bell className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
            {contadorNaoLidas > 0 && (
              <>
                <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" style={{ boxShadow: '0 0 6px var(--color-primary-bg)' }} />
                <span className={cn(
                  "absolute -top-1 -right-1 h-4 text-white text-[9px] font-mono font-bold flex items-center justify-center rounded-full",
                  contadorNaoLidas > 99 ? "min-w-5 px-1" : "w-4"
                )} style={{ background: 'rgba(59,130,246,0.9)', backdropFilter: 'blur(4px)' }}>
                  {contadorNaoLidas > 99 ? '99+' : contadorNaoLidas}
                </span>
              </>
            )}
          </button>
        }
      />

      {/* KPI Date Filter */}
      <div className="flex items-center gap-3 relative z-20">
        <KpiDateRangePicker
          dateRange={kpiRange}
          onDateRangeChange={(range) => setKpiRange({ start: startOfDay(range.start), end: endOfDay(range.end) })}
        />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch relative z-10">
        <div className="animate-slide-up stagger-1 opacity-0 h-full">
          <MetricCard
            title={kpiIsToday ? 'Leads Hoje' : kpiIsSingleDay ? `Leads - ${format(kpiRange.start, 'dd/MM')}` : 'Leads no Periodo'}
            value={totalLeads}
            subtitle={kpiIsToday ? undefined : `${format(kpiRange.start, 'dd/MM')} a ${format(kpiRange.end, 'dd/MM')}`}
            icon={Users}
            color="cyan"
            sparklineData={sparkLeads.length > 1 ? sparkLeads : undefined}
          />
        </div>
        <div className="animate-slide-up stagger-2 opacity-0 h-full">
          <MetricCard
            title="Taxa de Conversao"
            value={`${conversionRate}%`}
            subtitle={`${leadsNoGrupo} de ${totalLeads} entraram no grupo`}
            icon={TrendingUp}
            color="green"
            sparklineData={sparkConversao.length > 1 ? sparkConversao : undefined}
          />
        </div>
        <div className="animate-slide-up stagger-3 opacity-0 h-full">
          <MetricCard
            title="Aguardando Resposta"
            value={leadsWaiting}
            subtitle="Leads sem resposta no periodo"
            icon={Clock}
            color="amber"
            trend={leadsWaiting > 5 ? 'Atencao necessaria' : 'Dentro do normal'}
            trendType={leadsWaiting > 5 ? 'negative' : 'positive'}
            sparklineData={sparkAguardando.length > 1 ? sparkAguardando : undefined}
          />
        </div>
      </div>

      {/* Chart + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 relative z-10">

        {/* Chart */}
        <div className="lg:col-span-2 glass-card p-6 animate-slide-up stagger-4 opacity-0">
          {/* Chart header row 1: Title + Period summary */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-xl" style={{ background: 'rgba(59,130,246,0.12)' }}>
                <Activity className="w-3.5 h-3.5 text-[#60a5fa]" />
              </div>
              <h3 className="text-sm font-semibold text-white font-display">{chartTitle}</h3>
            </div>

            {/* Compact period stats */}
            <div className="hidden md:flex items-center gap-4">
              {[
                { label: 'Total', value: periodSummary.total },
                { label: 'Media/dia', value: periodSummary.avg },
                { label: 'Melhor dia', value: periodSummary.best },
              ].map(({ label, value }) => (
                <div key={label} className="text-right">
                  <div className="text-[9px] font-mono uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</div>
                  <div className="text-sm font-bold text-white font-display tabular-nums leading-tight">{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Chart header row 2: Period selector + Legend */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <PeriodSelector
              activePreset={activePreset}
              dateRange={dateRange}
              onPresetChange={handlePresetChange}
              onDateRangeChange={handleDateRangeChange}
            />

            {/* Legend */}
            <div className="flex items-center gap-5">
              {[
                { label: 'Total', color: '#FBBF24' },
                { label: 'Interessados', color: '#34D399' },
                { label: 'No Grupo', color: 'var(--color-primary)' },
              ].map(({ label, color }) => (
                <div key={label} className="flex items-center gap-1.5 group/legend cursor-default">
                  <div
                    className="w-2 h-2 rounded-full transition-transform duration-200 group-hover/legend:scale-125"
                    style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}30` }}
                  />
                  <span className="text-[10px] font-mono transition-colors" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Chart area */}
          <div className="h-72 [&_*]:outline-none [&_.recharts-surface]:cursor-default">
            {filteredChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={filteredChartData} barGap={2}>
                  <defs>
                    <linearGradient id="gradientTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FBBF24" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#FBBF24" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradientInteressados" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34D399" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#34D399" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradientGrupo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="rgba(255,255,255,0.04)"
                  />
                  <XAxis
                    dataKey="data"
                    tickFormatter={(val) => format(parseLocalDate(val), activePreset === 'hoje' ? 'HH:mm' : 'dd/MM')}
                    stroke="transparent"
                    fontSize={10}
                    fontFamily="JetBrains Mono"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'rgba(255,255,255,0.3)' }}
                  />
                  <YAxis
                    stroke="transparent"
                    fontSize={10}
                    fontFamily="JetBrains Mono"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'rgba(255,255,255,0.3)' }}
                    width={30}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.03)' }} />
                  <Area
                    type="monotone"
                    dataKey="leads_total"
                    name="Total Leads"
                    fill="url(#gradientTotal)"
                    stroke="#FBBF24"
                    strokeWidth={1.5}
                    strokeOpacity={0.6}
                    dot={false}
                    activeDot={{ r: 4, fill: '#FBBF24', stroke: '#0A0A0B', strokeWidth: 2 }}
                    animationDuration={600}
                    animationEasing="ease-out"
                  />
                  <Area
                    type="monotone"
                    dataKey="interessados"
                    name="Interessados"
                    fill="url(#gradientInteressados)"
                    stroke="#34D399"
                    strokeWidth={1.5}
                    strokeOpacity={0.5}
                    dot={false}
                    activeDot={{ r: 3, fill: '#34D399', stroke: '#0A0A0B', strokeWidth: 2 }}
                    animationDuration={700}
                    animationEasing="ease-out"
                  />
                  <Area
                    type="monotone"
                    dataKey="no_grupo"
                    name="No Grupo"
                    fill="url(#gradientGrupo)"
                    stroke="var(--color-primary)"
                    strokeWidth={1.5}
                    strokeOpacity={0.5}
                    dot={false}
                    activeDot={{ r: 3, fill: 'var(--color-primary)', stroke: '#0A0A0B', strokeWidth: 2 }}
                    animationDuration={800}
                    animationEasing="ease-out"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Calendar className="w-8 h-8 mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.15)' }} />
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Sem dados para o periodo selecionado</p>
                  <p className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>Selecione um periodo com dados disponiveis</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent leads */}
        <div className="glass-card p-5 flex flex-col animate-slide-up stagger-5 opacity-0">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-sm font-semibold text-white font-display">
              {kpiIsToday ? 'Leads de Hoje' : kpiIsSingleDay ? `Leads - ${format(kpiRange.start, 'dd/MM')}` : 'Leads do Periodo'}
            </h3>
            <span className="text-[10px] text-[#60a5fa] font-mono font-semibold px-2.5 py-1 rounded-lg" style={{ background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.20)' }}>
              {leadsPeriodo.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 max-h-[340px]">
            {leadsPeriodo.slice(0, 10).map((lead, i) => (
              <div
                key={lead.id}
                className="inner-item flex items-center justify-between group cursor-default"
                style={{ animationDelay: `${0.3 + i * 0.03}s` }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-semibold font-mono shrink-0" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.04)' }}>
                    {(lead.nome || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-medium text-white group-hover:text-[#60a5fa] transition-colors duration-300">{lead.nome || 'Sem nome'}</span>
                    <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>{formatTelefone(lead.telefone)}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <LeadBadge status={lead.status as StatusLead} />
                  <span className="text-[9px] font-mono tabular-nums" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {lead.ultima_interacao ? formatRelativeTime(lead.ultima_interacao) : formatTime(lead.data_primeiro_contato ?? lead.created_at)}
                  </span>
                </div>
              </div>
            ))}
            {leadsPeriodo.length === 0 && (
              <div className="text-center py-12 flex flex-col items-center gap-2">
                <Users className="w-8 h-8" style={{ color: 'rgba(255,255,255,0.15)' }} />
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Nenhum lead no periodo.</p>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <button
              onClick={() => navigate('/leads')}
              className="flex items-center justify-center w-full text-xs text-[#60a5fa] font-medium hover:underline transition-colors duration-300 group py-1"
            >
              Ver todos <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1 transition-transform duration-300" />
            </button>
          </div>
        </div>
      </div>

      {/* Notifications Modal */}
      {isNotificationsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setIsNotificationsOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="w-full max-w-2xl relative z-10" onClick={(e) => e.stopPropagation()}>
            <div className="card-dark-elevated overflow-hidden flex flex-col max-h-[70vh] animate-slide-up">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-[#3b82f6]/10 ring-1 ring-[#3b82f6]/20">
                    <Bell className="w-4 h-4 text-[#60a5fa]" />
                  </div>
                  <span className="text-sm font-semibold text-txt font-display">Notificacoes</span>
                  {contadorNaoLidas > 0 && (
                    <span className="text-[10px] text-[#60a5fa] font-mono font-semibold bg-[#3b82f6]/8 px-2 py-0.5 rounded-lg ring-1 ring-[#3b82f6]/15">
                      {contadorNaoLidas}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {notificacoes.length > 0 && (
                    <button
                      onClick={marcarTodasComoLidas}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-[#60a5fa] hover:text-blue-300 font-medium transition-colors rounded-lg hover:bg-[#3b82f6]/5"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Marcar todas como lidas
                    </button>
                  )}
                  <button
                    onClick={() => setIsNotificationsOpen(false)}
                    className="p-2 rounded-xl hover:bg-white/[0.04] text-txt-muted hover:text-txt transition-all duration-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <NotificacoesList
                  notificacoes={notificacoes}
                  loading={loadingNotif}
                  onMarcarComoLida={marcarComoLida}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
