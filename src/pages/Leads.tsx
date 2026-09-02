import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { PageHeader } from '../components/PageHeader';
import { LeadBadge } from '../components/LeadBadge';
import { useLeads, type LeadFiltro } from '../hooks/useLeads';
import { formatTelefone, formatRelativeTime, formatDate, formatTempoNoGrupo, getStatusPremiumLabel } from '../utils/formatters';
import { Search, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2, MessageCircle, Bot, Crown, Clock, ArrowUp, ArrowDown, Activity, Phone, ChevronDown, Check, X } from 'lucide-react';
import { useFunil } from '../hooks/useFunil';
import { cn } from '../utils/cn';
import { getStatusLabel } from '../utils/formatters';
import type { StatusLead as StatusLeadUI } from '../types';
import type { StatusPremium } from '../types/database';
import { supabase } from '../backend/client';
import type { LeadRow } from '../types/database';
import { usePlanLimits } from '../hooks/usePlanLimits';
import { PlanLimitBanner } from '../components/PlanLimitBanner';

// ─── Custom Dropdown (portal-based to escape overflow:hidden) ───
const CustomSelect: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}> = ({ value, onChange, options, placeholder = 'Selecionar' }) => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node)) return;
      if (dropRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const dropWidth = Math.max(rect.width, 200);
      const left = rect.left + rect.width / 2 - dropWidth / 2;
      const clampedLeft = Math.max(8, Math.min(left, window.innerWidth - dropWidth - 8));
      setPos({ top: rect.bottom + 8, left: clampedLeft, width: dropWidth });
    }
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen(!open)}
        className="relative flex items-center gap-2 text-[13px] font-medium transition-all duration-150"
        style={{
          background: open ? 'rgba(59,130,246,0.12)' : 'var(--c-popup-bg)',
          border: open ? '1px solid rgba(59,130,246,0.25)' : '1px solid var(--c-border-strong)',
          color: open ? '#60a5fa' : 'rgb(var(--c-fg-rgb) / 0.7)',
          borderRadius: '10px',
          padding: '8px 32px 8px 12px',
        }}
      >
        {selected?.label || placeholder}
        <ChevronDown className="w-3.5 h-3.5 absolute right-2.5" style={{ color: '#60a5fa' }} />
      </button>
      {/* Desktop dropdown */}
      {open && ReactDOM.createPortal(
        <div
          ref={dropRef}
          className="hidden md:block fixed overflow-y-auto animate-fade-in"
          style={{
            top: pos.top,
            left: pos.left,
            width: pos.width,
            maxHeight: '280px',
            zIndex: 9999,
            background: 'var(--c-popup-bg)',
            border: '1px solid var(--c-border-strong)',
            borderRadius: '14px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.06)',
          }}
        >
          <div className="p-1.5">
            {options.map(o => {
              const active = o.value === value;
              return (
                <button
                  key={o.value}
                  onClick={() => { onChange(o.value); setOpen(false); }}
                  className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-[12px] transition-all duration-150 text-left"
                  style={{
                    background: active ? 'rgba(59,130,246,0.1)' : 'transparent',
                    color: active ? '#60a5fa' : 'rgb(var(--c-fg-rgb) / 0.5)',
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--c-glass)'; e.currentTarget.style.color = 'rgb(var(--c-fg-rgb))'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = active ? 'rgba(59,130,246,0.1)' : 'transparent'; e.currentTarget.style.color = active ? '#60a5fa' : 'rgb(var(--c-fg-rgb) / 0.5)'; }}
                >
                  <span>{o.label}</span>
                  {active && <Check size={12} className="text-[#60a5fa] flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}

      {/* Mobile bottom sheet */}
      {open && ReactDOM.createPortal(
        <div className="md:hidden fixed inset-0 z-[100] flex items-end animate-fade-in">
          <div
            className="absolute inset-0 bg-black/60"
            style={{ backdropFilter: 'blur(4px)' }}
            onClick={() => setOpen(false)}
          />
          <div
            ref={dropRef}
            className="relative w-full rounded-t-3xl border-t border-glass animate-slide-up"
            style={{
              background: 'var(--c-popup-bg)',
              maxHeight: '80vh',
              boxShadow: '0 -20px 60px rgba(0,0,0,0.6)',
            }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-glass-hover" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-glass">
              <h4 className="text-[14px] font-semibold text-txt font-display">{placeholder}</h4>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center bg-glass text-txt-dim hover:text-txt hover:bg-glass-hover transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div
              className="overflow-y-auto p-2 space-y-1"
              style={{ maxHeight: 'calc(80vh - 80px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
            >
              {options.map(o => {
                const active = o.value === value;
                return (
                  <button
                    key={o.value}
                    onClick={() => { onChange(o.value); setOpen(false); }}
                    className="flex items-center justify-between w-full px-4 py-3.5 rounded-xl text-[13px] font-medium transition-all duration-150 text-left"
                    style={{
                      background: active ? 'rgba(59,130,246,0.12)' : 'var(--c-glass)',
                      border: active ? '1px solid rgba(59,130,246,0.3)' : '1px solid var(--c-border)',
                      color: active ? '#60a5fa' : 'rgb(var(--c-fg-rgb) / 0.7)',
                    }}
                  >
                    <span>{o.label}</span>
                    {active && <Check size={14} className="text-[#60a5fa] flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

// === Funil / Monitoramento constants ===
const FUNIL_COLUMNS: StatusLeadUI[] = [
  "primeiro_audio_enviado",
  "convite_enviado",
  "aguardando_cadastro",
  "link_enviado",
  "aguardando_confirmacao_entrada",
  "entrou_grupo",
  "sem_resposta",
  "atendimento_manual",
];

// Glassmorphism color system for funnel stages
const FUNIL_STYLE: Record<string, {
  color: string; barColor: string;
  bg: string; border: string; dotShadow: string;
}> = {
  primeiro_audio_enviado:         { color: '#eab308', barColor: '#eab308', bg: 'rgba(234,179,8,0.12)',  border: 'rgba(234,179,8,0.2)',  dotShadow: '0 0 6px rgba(234,179,8,0.4)' },
  convite_enviado:                { color: '#3b82f6', barColor: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.2)', dotShadow: '0 0 6px rgba(59,130,246,0.4)' },
  aguardando_cadastro:            { color: '#f97316', barColor: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.2)', dotShadow: '0 0 6px rgba(249,115,22,0.4)' },
  link_enviado:                   { color: '#60a5fa', barColor: '#60a5fa', bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.2)', dotShadow: '0 0 6px rgba(96,165,250,0.4)' },
  aguardando_confirmacao_entrada: { color: '#8b5cf6', barColor: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.2)', dotShadow: '0 0 6px rgba(139,92,246,0.4)' },
  entrou_grupo:                   { color: 'var(--color-primary)', barColor: 'var(--color-primary)', bg: 'var(--color-primary-bg)', border: 'var(--color-primary-bg)', dotShadow: '0 0 6px var(--color-primary-bg)' },
  sem_resposta:                   { color: '#f87171', barColor: '#f87171', bg: 'rgba(248,113,113,0.12)',border: 'rgba(248,113,113,0.2)',dotShadow: '0 0 6px rgba(248,113,113,0.4)' },
  atendimento_manual:             { color: '#a1a1aa', barColor: '#a1a1aa', bg: 'rgba(161,161,170,0.12)',border: 'rgba(161,161,170,0.2)',dotShadow: '0 0 6px rgba(161,161,170,0.3)' },
};

// Legacy color map kept for non-monitoramento usage (unused keys return safe defaults)
const FUNIL_COLORS: Record<string, {
  bar: string; count: string; accent: string; dot: string; gradient: string; ring: string; cardHover: string; icon: string;
}> = {
  primeiro_audio_enviado: { bar: "bg-gradient-to-r from-amber-400 to-amber-500", count: "bg-amber-500/10 text-amber-400 ring-amber-500/20", accent: "hover:border-amber-500/20", dot: "bg-amber-400", gradient: "from-amber-500/5 to-transparent", ring: "ring-amber-500/15", cardHover: "group-hover:bg-amber-500/[0.03]", icon: "text-amber-400/60" },
  convite_enviado: { bar: "bg-gradient-to-r from-sky-400 to-sky-500", count: "bg-sky-500/10 text-sky-400 ring-sky-500/20", accent: "hover:border-sky-500/20", dot: "bg-sky-400", gradient: "from-sky-500/5 to-transparent", ring: "ring-sky-500/15", cardHover: "group-hover:bg-sky-500/[0.03]", icon: "text-sky-400/60" },
  aguardando_cadastro: { bar: "bg-gradient-to-r from-orange-400 to-orange-500", count: "bg-orange-500/10 text-orange-400 ring-orange-500/20", accent: "hover:border-orange-500/20", dot: "bg-orange-400", gradient: "from-orange-500/5 to-transparent", ring: "ring-orange-500/15", cardHover: "group-hover:bg-orange-500/[0.03]", icon: "text-orange-400/60" },
  link_enviado: { bar: "bg-gradient-to-r from-violet-400 to-violet-500", count: "bg-violet-500/10 text-violet-400 ring-violet-500/20", accent: "hover:border-violet-500/20", dot: "bg-violet-400", gradient: "from-violet-500/5 to-transparent", ring: "ring-violet-500/15", cardHover: "group-hover:bg-violet-500/[0.03]", icon: "text-violet-400/60" },
  aguardando_confirmacao_entrada: { bar: "bg-gradient-to-r from-blue-500 to-blue-600", count: "bg-blue-600/10 text-blue-400 ring-blue-600/20", accent: "hover:border-blue-600/20", dot: "bg-blue-400", gradient: "from-blue-600/5 to-transparent", ring: "ring-blue-600/15", cardHover: "group-hover:bg-blue-600/[0.03]", icon: "text-blue-400/60" },
  entrou_grupo: { bar: "bg-gradient-to-r from-primary-light to-blue-400", count: "bg-primary-bg text-primary-light ring-1 ring-primary-bg", accent: "hover:border-primary-bg", dot: "bg-primary-light", gradient: "from-primary-bg to-transparent", ring: "ring-primary-bg", cardHover: "group-hover:bg-primary-bg", icon: "text-primary-light" },
  sem_resposta: { bar: "bg-gradient-to-r from-rose-400 to-rose-500", count: "bg-rose-500/10 text-rose-400 ring-rose-500/20", accent: "hover:border-rose-500/20", dot: "bg-rose-400", gradient: "from-rose-500/5 to-transparent", ring: "ring-rose-500/15", cardHover: "group-hover:bg-rose-500/[0.03]", icon: "text-rose-400/60" },
  atendimento_manual: { bar: "bg-gradient-to-r from-zinc-400 to-zinc-500", count: "bg-zinc-500/10 text-zinc-400 ring-zinc-500/20", accent: "hover:border-zinc-500/15", dot: "bg-zinc-400", gradient: "from-zinc-500/5 to-transparent", ring: "ring-zinc-500/15", cardHover: "group-hover:bg-zinc-500/[0.02]", icon: "text-zinc-400/60" },
};

/** Garante que o número tenha apenas dígitos e comece com 55 */
const toWhatsAppNumber = (telefone: string): string => {
  const digits = telefone.replace(/\D/g, '');
  if (digits.startsWith('55')) return digits;
  return `55${digits}`;
};

const FILTER_OPTIONS: { value: LeadFiltro; label: string }[] = [
  { value: 'aguardando_nome', label: 'Aguardando Nome' },
  { value: 'aguardando_cadastro', label: 'Aguardando Cadastro' },
  { value: 'link_enviado', label: 'Link Enviado' },
  { value: 'no_grupo', label: 'No Grupo' },
  { value: 'saiu_grupo', label: 'Saiu do Grupo' },
];

const PREMIUM_STATUS_OPTIONS: { value: StatusPremium; label: string }[] = [
  { value: 'primeiro_audio_enviado', label: 'Primeiro Áudio Enviado' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'encerrado', label: 'Encerrado' },
];

const PREMIUM_STATUS_COLORS: Record<StatusPremium, string> = {
  primeiro_audio_enviado: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  em_andamento: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  encerrado: 'bg-zinc-500/10 text-txt-muted border-zinc-500/20',
};

type TabKey = 'automatico' | 'premium' | 'monitoramento';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

/** Hook dedicado para leads do assistente premium */
function useLeadsPremium({ busca = '', pagina = 1, limite = 10, filtroStatus, ordenarTempo = 'desc' }: {
  busca?: string;
  pagina?: number;
  limite?: number;
  filtroStatus?: StatusPremium | 'all' | 'sem_status';
  ordenarTempo?: 'asc' | 'desc';
}) {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++abortRef.current;
    try {
      setLoading(true);
      const from = (pagina - 1) * limite;
      const to = from + limite - 1;

      let query = supabase
        .from('leads')
        .select('*', { count: 'exact' })
        .not('entrou_no_grupo', 'is', null)
        .is('saiu_grupo', null);

      if (filtroStatus === 'sem_status') {
        query = query.is('status_premium', null);
      } else if (filtroStatus && filtroStatus !== 'all') {
        query = query.eq('status_premium', filtroStatus);
      }

      if (busca.trim()) {
        const term = `%${busca.trim()}%`;
        query = query.or(`nome.ilike.${term},telefone.ilike.${term}`);
      }

      // 'desc' = mais tempo (entrou ha mais tempo = ascending timestamp)
      // 'asc' = menos tempo (entrou recentemente = descending timestamp)
      const ascending = ordenarTempo === 'desc';
      query = query
        .order('entrou_no_grupo', { ascending })
        .range(from, to);

      const { data, error, count } = await query;
      if (requestId !== abortRef.current) return;
      if (error) throw new Error(error.message);

      setLeads((data as LeadRow[]) ?? []);
      setTotal(count ?? 0);
    } catch (err: unknown) {
      if (requestId !== abortRef.current) return;
      console.error('Erro ao carregar leads premium:', err);
    } finally {
      if (requestId === abortRef.current) setLoading(false);
    }
  }, [busca, pagina, limite, filtroStatus, ordenarTempo]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel('leads-premium-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => { load(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  return { leads, total, loading, refetch: load };
}

/** Componente de badge para status premium */
const PremiumBadge: React.FC<{ status: StatusPremium }> = ({ status }) => (
  <span className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium border whitespace-nowrap tracking-wide ${PREMIUM_STATUS_COLORS[status]}`}>
    {getStatusPremiumLabel(status)}
  </span>
);

/** Dropdown inline para trocar status premium */
const PremiumStatusSelect: React.FC<{ lead: LeadRow; onUpdate: () => void }> = ({ lead, onUpdate }) => {
  const [updating, setUpdating] = useState(false);

  const handleChange = async (newStatus: StatusPremium) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status_premium: newStatus })
        .eq('id', lead.id);
      if (error) throw error;
      onUpdate();
    } catch (err) {
      console.error('Erro ao atualizar status premium:', err);
    } finally {
      setUpdating(false);
    }
  };

  if (lead.status_premium) {
    return (
      <div className="flex items-center gap-2">
        <PremiumBadge status={lead.status_premium as StatusPremium} />
        <select
          className="!text-[10px] !py-0.5 !px-1 !pr-5 !rounded-md"
          value={lead.status_premium}
          onChange={(e) => handleChange(e.target.value as StatusPremium)}
          disabled={updating}
        >
          {PREMIUM_STATUS_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <select
      className="!text-[11px] !py-1 !px-2"
      value=""
      onChange={(e) => handleChange(e.target.value as StatusPremium)}
      disabled={updating}
    >
      <option value="" disabled>Definir status...</option>
      {PREMIUM_STATUS_OPTIONS.map(({ value, label }) => (
        <option key={value} value={value}>{label}</option>
      ))}
    </select>
  );
};

/** Gera array de números de página com ellipsis */
function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | '...')[] = [];

  // Always show first page
  pages.push(1);

  if (current <= 4) {
    // Near start: 1 2 3 4 5 ... last
    for (let i = 2; i <= Math.min(5, total - 1); i++) pages.push(i);
    if (total > 6) pages.push('...');
  } else if (current >= total - 3) {
    // Near end: 1 ... n-4 n-3 n-2 n-1 last
    pages.push('...');
    for (let i = Math.max(total - 4, 2); i <= total - 1; i++) pages.push(i);
  } else {
    // Middle: 1 ... c-1 c c+1 ... last
    pages.push('...');
    pages.push(current - 1);
    pages.push(current);
    pages.push(current + 1);
    pages.push('...');
  }

  // Always show last page
  pages.push(total);

  return pages;
}

/** Componente de paginação reutilizável */
const Pagination: React.FC<{
  current: number;
  total: number;
  totalPages: number;
  itemsPerPage: number;
  onChange: (page: number) => void;
}> = ({ current, total, totalPages, itemsPerPage, onChange }) => {
  const pages = getPageNumbers(current, totalPages);

  return (
    <div className="px-3 md:px-5 py-3 md:py-4 border-t border-surface-300/20 flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between md:gap-0">
      <span className="text-[11px] text-txt-muted font-mono whitespace-nowrap text-center md:text-left">
        {total === 0
          ? '0 de 0'
          : `${(current - 1) * itemsPerPage + 1}-${Math.min(current * itemsPerPage, total)} de ${total}`
        }
      </span>
      <div className="flex items-center justify-center gap-1 flex-nowrap">
        {/* First page (desktop only) */}
        <button
          onClick={() => onChange(1)}
          disabled={current === 1}
          className="hidden md:flex p-1.5 border border-surface-300/30 rounded-lg hover:bg-surface-200/40 hover:border-surface-300/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-txt-muted hover:text-txt"
          title="Primeira página"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>
        {/* Previous */}
        <button
          onClick={() => onChange(Math.max(1, current - 1))}
          disabled={current === 1}
          className="p-1.5 border border-surface-300/30 rounded-lg hover:bg-surface-200/40 hover:border-surface-300/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-txt-muted hover:text-txt"
          title="Página anterior"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Page numbers */}
        {pages.map((p, idx) => {
          // Em mobile mostra so paginas adjacentes (current-1, current, current+1) + atual sempre
          const showOnMobile = p === '...' || p === current || p === current - 1 || p === current + 1;
          if (p === '...') {
            return (
              <span
                key={`dots-${idx}`}
                className={cn(
                  "px-1.5 text-[11px] text-txt-dim font-mono select-none",
                  !showOnMobile && "hidden md:inline"
                )}
              >
                ...
              </span>
            );
          }
          return (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={cn(
                "min-w-[32px] h-[32px] flex items-center justify-center rounded-lg text-[11px] font-mono font-medium transition-all duration-150",
                !showOnMobile && "hidden md:flex",
                p === current
                  ? 'bg-[#3b82f6]/15 text-[#3b82f6] border border-[#3b82f6]/30'
                  : 'border border-surface-300/30 text-txt-muted hover:bg-surface-200/40 hover:border-surface-300/50 hover:text-txt'
              )}
            >
              {p}
            </button>
          );
        })}

        {/* Next */}
        <button
          onClick={() => onChange(Math.min(totalPages, current + 1))}
          disabled={current === totalPages}
          className="p-1.5 border border-surface-300/30 rounded-lg hover:bg-surface-200/40 hover:border-surface-300/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-txt-muted hover:text-txt"
          title="Próxima página"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        {/* Last page (desktop only) */}
        <button
          onClick={() => onChange(totalPages)}
          disabled={current === totalPages}
          className="hidden md:flex p-1.5 border border-surface-300/30 rounded-lg hover:bg-surface-200/40 hover:border-surface-300/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-txt-muted hover:text-txt"
          title="Última página"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export const Leads: React.FC = () => {
  const { leads: leadLimit } = usePlanLimits();
  const [activeTab, setActiveTab] = useState<TabKey>('automatico');

  // === Assistente Automático state ===
  const [searchTerm, setSearchTerm] = useState('');
  const [filtro, setFiltro] = useState<LeadFiltro>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const debouncedSearch = useDebounce(searchTerm, 300);

  const prevSearchRef = useRef(debouncedSearch);
  const prevFiltroRef = useRef(filtro);
  useEffect(() => {
    if (prevSearchRef.current !== debouncedSearch || prevFiltroRef.current !== filtro) {
      setCurrentPage(1);
      prevSearchRef.current = debouncedSearch;
      prevFiltroRef.current = filtro;
    }
  }, [debouncedSearch, filtro]);

  const { leads, total, loading, refetch } = useLeads({
    filtro,
    busca: debouncedSearch,
    pagina: currentPage,
    limite: itemsPerPage,
  });

  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));

  // === Assistente Premium state ===
  const [premiumSearch, setPremiumSearch] = useState('');
  const [premiumFiltro, setPremiumFiltro] = useState<StatusPremium | 'all' | 'sem_status'>('all');
  const [premiumPage, setPremiumPage] = useState(1);
  const [tempoSort, setTempoSort] = useState<'desc' | 'asc'>('desc');
  const debouncedPremiumSearch = useDebounce(premiumSearch, 300);

  const prevPremiumSearchRef = useRef(debouncedPremiumSearch);
  const prevPremiumFiltroRef = useRef(premiumFiltro);
  useEffect(() => {
    if (prevPremiumSearchRef.current !== debouncedPremiumSearch || prevPremiumFiltroRef.current !== premiumFiltro) {
      setPremiumPage(1);
      prevPremiumSearchRef.current = debouncedPremiumSearch;
      prevPremiumFiltroRef.current = premiumFiltro;
    }
  }, [debouncedPremiumSearch, premiumFiltro]);

  const { leads: premiumLeads, total: premiumTotal, loading: premiumLoading, refetch: premiumRefetch } = useLeadsPremium({
    busca: debouncedPremiumSearch,
    pagina: premiumPage,
    limite: itemsPerPage,
    filtroStatus: premiumFiltro,
    ordenarTempo: tempoSort,
  });

  const premiumTotalPages = Math.max(1, Math.ceil(premiumTotal / itemsPerPage));

  // === Monitoramento state ===
  const { columns: funilColumns, totalLeads: funilTotal, loading: funilLoading, lastUpdated: funilLastUpdated, refresh: funilRefresh } = useFunil();
  const [expandedFunilCols, setExpandedFunilCols] = useState<Set<string>>(new Set());
  const toggleFunilCol = (status: string) => setExpandedFunilCols((prev) => {
    const next = new Set(prev);
    if (next.has(status)) next.delete(status); else next.add(status);
    return next;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={activeTab === 'monitoramento' ? 'Monitoramento de Funil' : 'Todos os Leads'}
        subtitle={activeTab === 'automatico' ? `${total} leads encontrados` : activeTab === 'premium' ? `${premiumTotal} leads no grupo` : `${funilTotal} leads no funil`}
        onRefresh={activeTab === 'automatico' ? refetch : activeTab === 'premium' ? premiumRefetch : funilRefresh}
        isRefreshing={activeTab === 'automatico' ? loading : activeTab === 'premium' ? premiumLoading : funilLoading}
        rightContent={activeTab === 'monitoramento' ? (
          <div
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full"
            style={{ background: 'var(--c-glass)', border: '1px solid var(--c-border)' }}
          >
            <div
              className="w-2 h-2 rounded-full animate-breathe"
              style={{ background: 'var(--color-primary-light)', boxShadow: '0 0 8px var(--color-primary-bg)' }}
            />
            <span className="text-[12px] font-mono tabular-nums" style={{ color: 'var(--c-t-50)' }}>
              {funilLastUpdated.toLocaleTimeString()}
            </span>
          </div>
        ) : undefined}
      />

      <PlanLimitBanner
        label="leads"
        current={leadLimit.current}
        max={leadLimit.max}
        atLimit={leadLimit.atLimit}
        className="mb-4"
      />

      {/* Tabs — Glass Pill Selector */}
      <div
        className="grid grid-cols-2 md:inline-flex gap-1 p-1 rounded-[14px] w-full md:w-fit"
        style={{ background: 'var(--c-glass)', border: '1px solid var(--c-border)' }}
      >
        <button
          onClick={() => setActiveTab('automatico')}
          className="flex items-center justify-center md:justify-start gap-1.5 md:gap-2 px-3 md:px-5 py-2 rounded-[10px] text-[12px] md:text-[13px] font-medium transition-all duration-250 whitespace-nowrap"
          style={activeTab === 'automatico' ? {
            background: 'var(--color-primary-bg)', border: '1px solid var(--color-primary-bg)', color: 'var(--color-primary-light)',
          } : {
            background: 'transparent', border: '1px solid transparent', color: 'var(--c-t-45)',
          }}
          onMouseEnter={(e) => { if (activeTab !== 'automatico') { e.currentTarget.style.color = 'rgb(var(--c-fg-rgb) / 0.65)'; e.currentTarget.style.background = 'var(--c-glass)' } }}
          onMouseLeave={(e) => { if (activeTab !== 'automatico') { e.currentTarget.style.color = 'rgb(var(--c-fg-rgb) / 0.45)'; e.currentTarget.style.background = 'transparent' } }}
        >
          <Bot className="w-4 h-4 shrink-0" style={{ opacity: activeTab === 'automatico' ? 1 : 0.45 }} />
          <span className="md:hidden">Assistente</span>
          <span className="hidden md:inline">Assistente Automatico</span>
        </button>
        <button
          onClick={() => setActiveTab('monitoramento')}
          className="flex items-center justify-center md:justify-start gap-1.5 md:gap-2 px-3 md:px-5 py-2 rounded-[10px] text-[12px] md:text-[13px] font-medium transition-all duration-250 whitespace-nowrap"
          style={activeTab === 'monitoramento' ? {
            background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', color: '#a78bfa',
          } : {
            background: 'transparent', border: '1px solid transparent', color: 'var(--c-t-45)',
          }}
          onMouseEnter={(e) => { if (activeTab !== 'monitoramento') { e.currentTarget.style.color = 'rgb(var(--c-fg-rgb) / 0.65)'; e.currentTarget.style.background = 'var(--c-glass)' } }}
          onMouseLeave={(e) => { if (activeTab !== 'monitoramento') { e.currentTarget.style.color = 'rgb(var(--c-fg-rgb) / 0.45)'; e.currentTarget.style.background = 'transparent' } }}
        >
          <Activity className="w-4 h-4 shrink-0" style={{ opacity: activeTab === 'monitoramento' ? 1 : 0.45 }} />
          Monitoramento
        </button>
      </div>

      {/* ============================================ */}
      {/* ASSISTENTE AUTOMATICO TAB                    */}
      {/* ============================================ */}
      {activeTab === 'automatico' && (
        <>
          {/* Filters */}
          <div className="card-dark p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-dim" />
              <input
                type="text"
                placeholder="Buscar por nome ou telefone..."
                className="input-dark pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <Filter className="w-4 h-4 text-txt-dim" />
              <CustomSelect
                value={filtro}
                onChange={(v) => setFiltro(v as LeadFiltro)}
                options={[{ value: 'all', label: 'Todos' }, ...FILTER_OPTIONS]}
              />
            </div>
          </div>

          {/* Table */}
          <div className="card-dark overflow-hidden relative">
            {loading && leads.length > 0 && (
              <div className="absolute inset-0 bg-surface/50 z-10 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-[#3b82f6]" />
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-surface-300/20">
                    <th className="px-5 py-3.5 text-[10px] font-mono font-semibold text-txt-muted uppercase tracking-widest">Data Entrada</th>
                    <th className="px-5 py-3.5 text-[10px] font-mono font-semibold text-txt-muted uppercase tracking-widest">Lead</th>
                    <th className="px-5 py-3.5 text-[10px] font-mono font-semibold text-txt-muted uppercase tracking-widest">Status</th>
                    <th className="px-5 py-3.5 text-[10px] font-mono font-semibold text-txt-muted uppercase tracking-widest">Ultima Interacao</th>
                    <th className="px-5 py-3.5 text-[10px] font-mono font-semibold text-txt-muted uppercase tracking-widest">No Grupo?</th>
                    <th className="px-5 py-3.5 text-[10px] font-mono font-semibold text-txt-muted uppercase tracking-widest text-center">Mensagem</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && leads.length === 0 && (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={`skel-${i}`} className="border-b border-surface-300/10 animate-pulse">
                        <td className="px-5 py-4"><div className="h-4 bg-[rgb(var(--c-fg-rgb)/0.04)] rounded w-20" /></td>
                        <td className="px-5 py-4">
                          <div className="h-4 bg-[rgb(var(--c-fg-rgb)/0.04)] rounded w-32 mb-1" />
                          <div className="h-3 bg-[rgb(var(--c-fg-rgb)/0.03)] rounded w-24" />
                        </td>
                        <td className="px-5 py-4"><div className="h-5 bg-[rgb(var(--c-fg-rgb)/0.04)] rounded-lg w-24" /></td>
                        <td className="px-5 py-4"><div className="h-4 bg-[rgb(var(--c-fg-rgb)/0.04)] rounded w-20" /></td>
                        <td className="px-5 py-4"><div className="h-4 bg-[rgb(var(--c-fg-rgb)/0.04)] rounded w-10" /></td>
                        <td className="px-5 py-4"><div className="h-6 bg-[rgb(var(--c-fg-rgb)/0.04)] rounded w-6 mx-auto" /></td>
                      </tr>
                    ))
                  )}

                  {!loading && leads.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-txt-muted text-sm">
                        Nenhum lead encontrado com os filtros atuais.
                      </td>
                    </tr>
                  )}

                  {leads.map((lead) => {
                    let grupoContent: React.ReactNode;
                    if (lead.entrou_no_grupo && !lead.saiu_grupo) {
                      grupoContent = <span className="text-primary-light font-mono text-xs font-semibold">SIM</span>;
                    } else if (lead.saiu_grupo) {
                      grupoContent = <span className="text-rose-400 font-mono text-xs font-semibold">SAIU</span>;
                    } else {
                      grupoContent = <span className="text-txt-dim font-mono text-xs">---</span>;
                    }

                    return (
                      <tr key={lead.id} className="border-b border-surface-300/10 hover:bg-surface-200/20 transition-colors duration-150 group">
                        <td className="px-5 py-4 whitespace-nowrap text-sm text-txt-secondary font-mono text-[12px]">
                          {lead.data_primeiro_contato ? formatDate(lead.data_primeiro_contato) : '-'}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-txt group-hover:text-[#3b82f6] transition-colors">{lead.nome || '-'}</span>
                            <span className="text-[11px] text-txt-dim font-mono">{formatTelefone(lead.telefone)}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <LeadBadge status={lead.status as StatusLeadUI} />
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-[12px] text-txt-secondary font-mono">
                          {lead.ultima_interacao ? formatRelativeTime(lead.ultima_interacao) : '-'}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm">
                          {grupoContent}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-center">
                          <a
                            href={`https://wa.me/${toWhatsAppNumber(lead.telefone)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-primary-light hover:bg-primary-bg hover:text-primary transition-all duration-200"
                            title="Enviar mensagem no WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Pagination
              current={currentPage}
              total={total}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              onChange={setCurrentPage}
            />
          </div>
        </>
      )}

      {/* ============================================ */}
      {/* ASSISTENTE PREMIUM TAB                       */}
      {/* ============================================ */}
      {activeTab === 'premium' && (
        <>
          {/* Filters */}
          <div className="card-dark p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-dim" />
              <input
                type="text"
                placeholder="Buscar por nome ou telefone..."
                className="input-dark pl-10"
                value={premiumSearch}
                onChange={(e) => setPremiumSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <Filter className="w-4 h-4 text-txt-dim" />
              <CustomSelect
                value={premiumFiltro}
                onChange={(v) => setPremiumFiltro(v as StatusPremium | 'all' | 'sem_status')}
                options={[
                  { value: 'all', label: 'Todos os Status' },
                  { value: 'sem_status', label: 'Sem Status' },
                  ...PREMIUM_STATUS_OPTIONS,
                ]}
              />
            </div>
          </div>

          {/* Table */}
          <div className="card-dark overflow-hidden relative">
            {premiumLoading && premiumLeads.length > 0 && (
              <div className="absolute inset-0 bg-surface/50 z-10 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-surface-300/20">
                    <th className="px-5 py-3.5 text-[10px] font-mono font-semibold text-txt-muted uppercase tracking-widest">Lead</th>
                    <th className="px-5 py-3.5 text-[10px] font-mono font-semibold text-txt-muted uppercase tracking-widest">Status Funil</th>
                    <th className="px-5 py-3.5 text-[10px] font-mono font-semibold text-txt-muted uppercase tracking-widest">Status Premium</th>
                    <th className="px-5 py-3.5 text-[10px] font-mono font-semibold text-txt-muted uppercase tracking-widest">
                      <button
                        onClick={() => { setTempoSort(prev => prev === 'desc' ? 'asc' : 'desc'); setPremiumPage(1); }}
                        className="flex items-center gap-1.5 hover:text-txt transition-colors"
                        title={tempoSort === 'desc' ? 'Ordenar: menos tempo no grupo' : 'Ordenar: mais tempo no grupo'}
                      >
                        <Clock className="w-3 h-3" />
                        Tempo no Grupo
                        {tempoSort === 'desc'
                          ? <ArrowDown className="w-3 h-3 text-amber-400" />
                          : <ArrowUp className="w-3 h-3 text-amber-400" />
                        }
                      </button>
                    </th>
                    <th className="px-5 py-3.5 text-[10px] font-mono font-semibold text-txt-muted uppercase tracking-widest">Ultima Interacao</th>
                    <th className="px-5 py-3.5 text-[10px] font-mono font-semibold text-txt-muted uppercase tracking-widest text-center">Mensagem</th>
                  </tr>
                </thead>
                <tbody>
                  {premiumLoading && premiumLeads.length === 0 && (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={`skel-p-${i}`} className="border-b border-surface-300/10 animate-pulse">
                        <td className="px-5 py-4">
                          <div className="h-4 bg-[rgb(var(--c-fg-rgb)/0.04)] rounded w-32 mb-1" />
                          <div className="h-3 bg-[rgb(var(--c-fg-rgb)/0.03)] rounded w-24" />
                        </td>
                        <td className="px-5 py-4"><div className="h-5 bg-[rgb(var(--c-fg-rgb)/0.04)] rounded-lg w-24" /></td>
                        <td className="px-5 py-4"><div className="h-5 bg-[rgb(var(--c-fg-rgb)/0.04)] rounded-lg w-28" /></td>
                        <td className="px-5 py-4"><div className="h-4 bg-[rgb(var(--c-fg-rgb)/0.04)] rounded w-16" /></td>
                        <td className="px-5 py-4"><div className="h-4 bg-[rgb(var(--c-fg-rgb)/0.04)] rounded w-20" /></td>
                        <td className="px-5 py-4"><div className="h-6 bg-[rgb(var(--c-fg-rgb)/0.04)] rounded w-6 mx-auto" /></td>
                      </tr>
                    ))
                  )}

                  {!premiumLoading && premiumLeads.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-txt-muted text-sm">
                        Nenhum lead premium encontrado.
                      </td>
                    </tr>
                  )}

                  {premiumLeads.map((lead) => (
                    <tr key={lead.id} className="border-b border-surface-300/10 hover:bg-surface-200/20 transition-colors duration-150 group">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-txt group-hover:text-amber-400 transition-colors">{lead.nome || '-'}</span>
                          <span className="text-[11px] text-txt-dim font-mono">{formatTelefone(lead.telefone)}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <LeadBadge status={lead.status as StatusLeadUI} />
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <PremiumStatusSelect lead={lead} onUpdate={premiumRefetch} />
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {lead.entrou_no_grupo ? (
                          <span className="text-[12px] font-mono text-primary-light font-semibold">
                            {formatTempoNoGrupo(lead.entrou_no_grupo)}
                          </span>
                        ) : (
                          <span className="text-txt-dim font-mono text-xs">-</span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-[12px] text-txt-secondary font-mono">
                        {lead.ultima_interacao ? formatRelativeTime(lead.ultima_interacao) : '-'}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-center">
                        <a
                          href={`https://wa.me/${toWhatsAppNumber(lead.telefone)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-primary-light hover:bg-primary-bg hover:text-primary transition-all duration-200"
                          title="Enviar mensagem no WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Pagination
              current={premiumPage}
              total={premiumTotal}
              totalPages={premiumTotalPages}
              itemsPerPage={itemsPerPage}
              onChange={setPremiumPage}
            />
          </div>
        </>
      )}

      {/* ============================================ */}
      {/* MONITORAMENTO TAB                            */}
      {/* ============================================ */}
      {activeTab === 'monitoramento' && (
        <>
          {funilLoading && funilTotal === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(59,130,246,0.2)', borderTopColor: '#3b82f6' }} />
            </div>
          ) : (
            <>
              {/* Summary progress bar */}
              <div className="flex items-center gap-3 px-1">
                <div className="flex-1 h-[6px] rounded-[6px] overflow-hidden flex" style={{ background: 'var(--c-glass)' }}>
                  {FUNIL_COLUMNS.map((status) => {
                    const col = funilColumns[status];
                    const percentage = col ? col.percentual : 0;
                    const style = FUNIL_STYLE[status];
                    if (!style) return null;
                    return (
                      <div
                        key={status}
                        className="h-full transition-all duration-700"
                        style={{ width: `${percentage}%`, background: style.barColor }}
                        title={`${getStatusLabel(status)}: ${col?.quantidade ?? 0} (${percentage}%)`}
                      />
                    );
                  })}
                </div>
                <span
                  className="text-[12px] font-medium font-mono shrink-0 px-3 py-1 rounded-lg"
                  style={{ background: 'var(--c-glass)', border: '1px solid var(--c-border)', color: 'var(--c-t-50)' }}
                >
                  {funilTotal} leads
                </span>
              </div>

              {/* Kanban columns */}
              <div className="md:overflow-x-auto pb-4" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgb(var(--c-fg-rgb) / 0.04) transparent' }}>
                <div className="flex flex-col md:flex-row gap-3 md:min-w-[1200px]" style={{ height: 'auto' }}>
                  {FUNIL_COLUMNS.map((status, colIndex) => {
                    const col = funilColumns[status];
                    const colLeads = col?.leads ?? [];
                    const quantidade = col?.quantidade ?? 0;
                    const percentage = col?.percentual ?? 0;
                    const style = FUNIL_STYLE[status];
                    if (!style) return null;
                    const isHighVolume = quantidade > 50;
                    const isExpanded = expandedFunilCols.has(status);

                    return (
                      <div
                        key={status}
                        className={cn(
                          "flex-1 min-w-0 md:min-w-[200px] flex flex-col md:max-h-full animate-slide-up opacity-0 overflow-hidden",
                          `stagger-${colIndex + 1}`
                        )}
                        style={{
                          background: 'var(--c-glass-2)',
                          border: isHighVolume ? `1px solid ${style.border}` : '1px solid var(--c-border)',
                          borderRadius: '16px',
                          boxShadow: isHighVolume ? `0 0 20px ${style.bg}` : 'none',
                          transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
                          scrollbarWidth: 'thin',
                          scrollbarColor: 'rgb(var(--c-fg-rgb) / 0.04) transparent',
                        }}
                      >
                        {/* Column header — clickable on mobile, sticky on desktop */}
                        <button
                          type="button"
                          onClick={() => toggleFunilCol(status)}
                          className="p-3.5 md:sticky md:top-0 md:z-10 md:cursor-default text-left w-full"
                          style={{
                            background: 'rgb(var(--c-surface-rgb) / 0.85)',
                            borderBottom: '1px solid var(--c-border)',
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ background: style.color, boxShadow: style.dotShadow }}
                              />
                              <h3 className="font-semibold text-txt text-[13px] font-display tracking-tight leading-none truncate">
                                {getStatusLabel(status)}
                              </h3>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className="text-[11px] px-2 py-0.5 rounded-lg font-mono font-semibold"
                                style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}`, minWidth: 24, textAlign: 'center' }}
                              >
                                {quantidade}
                              </span>
                              {/* Chevron (mobile only) */}
                              <ChevronDown
                                className={cn(
                                  "w-4 h-4 md:hidden transition-transform duration-200",
                                  isExpanded && "rotate-180"
                                )}
                                style={{ color: 'var(--c-t-40)' }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: 'var(--c-glass)' }}>
                              <div
                                className="h-full rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${percentage}%`, background: style.color }}
                              />
                            </div>
                            <span className="text-[11px] font-mono tabular-nums shrink-0" style={{ color: 'var(--c-t-35)' }}>
                              {percentage}%
                            </span>
                          </div>
                        </button>

                        {/* Cards — collapsed on mobile by default; always visible on desktop */}
                        <div className={cn(
                          "p-2 overflow-y-auto flex-1 space-y-2",
                          !isExpanded && "hidden md:block"
                        )}>
                          {colLeads.map((lead) => {
                            const hasExited = lead.observacoes?.toLowerCase().includes('saiu');
                            return (
                              <div
                                key={lead.id}
                                className="p-3 cursor-default group transition-all duration-200"
                                style={{
                                  background: 'var(--c-glass)',
                                  border: '1px solid var(--c-border)',
                                  borderRadius: '12px',
                                  opacity: hasExited ? 0.7 : 1,
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'var(--c-glass-hover)';
                                  e.currentTarget.style.borderColor = 'var(--c-border-strong)';
                                  e.currentTarget.style.transform = 'translateY(-1px)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'var(--c-glass)';
                                  e.currentTarget.style.borderColor = 'var(--c-border)';
                                  e.currentTarget.style.transform = 'translateY(0)';
                                }}
                              >
                                <div className="flex justify-between items-start mb-1.5">
                                  <span className="font-semibold text-txt text-[13px] leading-tight">
                                    {lead.nome || 'Sem nome'}
                                  </span>
                                  <div className="flex items-center gap-1" style={{ color: 'var(--c-t-30)' }}>
                                    <Clock className="w-[10px] h-[10px]" style={{ opacity: 0.4 }} />
                                    <span className="text-[10px] font-mono">
                                      {lead.ultima_interacao ? formatRelativeTime(lead.ultima_interacao) : '-'}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Phone className="w-[11px] h-[11px]" style={{ color: 'var(--c-t-20)' }} />
                                  <span className="text-[11px] font-mono" style={{ color: 'var(--c-t-40)' }}>{formatTelefone(lead.telefone)}</span>
                                </div>
                                {lead.observacoes && (
                                  <div
                                    className="flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium w-fit"
                                    style={
                                      hasExited
                                        ? { background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.15)' }
                                        : { background: 'rgba(96,165,250,0.1)', color: '#93c5fd', border: '1px solid rgba(96,165,250,0.15)' }
                                    }
                                  >
                                    <MessageCircle className="w-2.5 h-2.5 shrink-0" />
                                    <span className="truncate" style={{ maxWidth: 140 }}>{lead.observacoes}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {colLeads.length === 0 && (
                            <div className="text-center py-8 text-[12px] italic" style={{ color: 'var(--c-t-15)' }}>
                              Vazio
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};
