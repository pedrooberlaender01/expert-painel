import React from 'react';
import { PageHeader } from '../components/PageHeader';
import { useFunil } from '../hooks/useFunil';
import { StatusLead } from '../types';
import { formatTelefone, formatRelativeTime, getStatusLabel } from '../utils/formatters';
import { cn } from '../utils/cn';
import { Phone, MessageCircle, Clock, Loader2 } from 'lucide-react';

const COLUMNS: StatusLead[] = [
  "primeiro_audio_enviado",
  "convite_enviado",
  "aguardando_cadastro",
  "link_enviado",
  "aguardando_confirmacao_entrada",
  "entrou_grupo",
  "sem_resposta",
  "atendimento_manual",
];

const COLUMN_COLORS: Record<StatusLead, {
  bar: string;
  count: string;
  accent: string;
  dot: string;
  gradient: string;
  ring: string;
  cardHover: string;
  icon: string;
}> = {
  primeiro_audio_enviado: {
    bar: "bg-gradient-to-r from-amber-400 to-amber-500",
    count: "bg-amber-500/10 text-amber-400 ring-amber-500/20",
    accent: "hover:border-amber-500/20",
    dot: "bg-amber-400",
    gradient: "from-amber-500/5 to-transparent",
    ring: "ring-amber-500/15",
    cardHover: "group-hover:bg-amber-500/[0.03]",
    icon: "text-amber-400/60",
  },
  convite_enviado: {
    bar: "bg-gradient-to-r from-sky-400 to-sky-500",
    count: "bg-sky-500/10 text-sky-400 ring-sky-500/20",
    accent: "hover:border-sky-500/20",
    dot: "bg-sky-400",
    gradient: "from-sky-500/5 to-transparent",
    ring: "ring-sky-500/15",
    cardHover: "group-hover:bg-sky-500/[0.03]",
    icon: "text-sky-400/60",
  },
  interessado: {
    bar: "bg-gradient-to-r from-primary-light to-primary",
    count: "bg-primary-bg text-primary-light ring-1 ring-primary-bg",
    accent: "hover:border-primary-bg",
    dot: "bg-primary-light",
    gradient: "from-primary-bg to-transparent",
    ring: "ring-primary-bg",
    cardHover: "group-hover:bg-primary-bg",
    icon: "text-primary-light",
  },
  aguardando_cadastro: {
    bar: "bg-gradient-to-r from-orange-400 to-orange-500",
    count: "bg-orange-500/10 text-orange-400 ring-orange-500/20",
    accent: "hover:border-orange-500/20",
    dot: "bg-orange-400",
    gradient: "from-orange-500/5 to-transparent",
    ring: "ring-orange-500/15",
    cardHover: "group-hover:bg-orange-500/[0.03]",
    icon: "text-orange-400/60",
  },
  link_enviado: {
    bar: "bg-gradient-to-r from-violet-400 to-violet-500",
    count: "bg-violet-500/10 text-violet-400 ring-violet-500/20",
    accent: "hover:border-violet-500/20",
    dot: "bg-violet-400",
    gradient: "from-violet-500/5 to-transparent",
    ring: "ring-violet-500/15",
    cardHover: "group-hover:bg-violet-500/[0.03]",
    icon: "text-violet-400/60",
  },
  aguardando_confirmacao_entrada: {
    bar: "bg-gradient-to-r from-primary to-primary",
    count: "bg-primary-bg text-primary-light ring-primary-bg",
    accent: "hover:border-primary-bg",
    dot: "bg-primary-light",
    gradient: "from-primary/5 to-transparent",
    ring: "ring-primary/15",
    cardHover: "group-hover:bg-primary/[0.03]",
    icon: "text-primary-light/60",
  },
  no_grupo: {
    bar: "bg-gradient-to-r from-primary-light to-primary-light",
    count: "bg-primary-bg text-primary-light ring-1 ring-primary-bg",
    accent: "hover:border-primary-bg",
    dot: "bg-primary-light",
    gradient: "from-primary-bg to-transparent",
    ring: "ring-primary-bg",
    cardHover: "group-hover:bg-primary-bg",
    icon: "text-primary-light",
  },
  entrou_grupo: {
    bar: "bg-gradient-to-r from-primary-light to-primary-light",
    count: "bg-primary-bg text-primary-light ring-1 ring-primary-bg",
    accent: "hover:border-primary-bg",
    dot: "bg-primary-light",
    gradient: "from-primary-bg to-transparent",
    ring: "ring-primary-bg",
    cardHover: "group-hover:bg-primary-bg",
    icon: "text-primary-light",
  },
  nao_interessado: {
    bar: "bg-gradient-to-r from-zinc-500 to-zinc-600",
    count: "bg-zinc-500/10 text-txt-muted ring-zinc-500/20",
    accent: "hover:border-zinc-500/15",
    dot: "bg-zinc-500",
    gradient: "from-zinc-500/5 to-transparent",
    ring: "ring-zinc-500/15",
    cardHover: "group-hover:bg-zinc-500/[0.02]",
    icon: "text-txt-dim",
  },
  sem_resposta: {
    bar: "bg-gradient-to-r from-rose-400 to-rose-500",
    count: "bg-rose-500/10 text-rose-400 ring-rose-500/20",
    accent: "hover:border-rose-500/20",
    dot: "bg-rose-400",
    gradient: "from-rose-500/5 to-transparent",
    ring: "ring-rose-500/15",
    cardHover: "group-hover:bg-rose-500/[0.03]",
    icon: "text-rose-400/60",
  },
  atendimento_manual: {
    bar: "bg-gradient-to-r from-zinc-400 to-zinc-500",
    count: "bg-zinc-500/10 text-txt-muted ring-zinc-500/20",
    accent: "hover:border-zinc-500/15",
    dot: "bg-zinc-400",
    gradient: "from-zinc-500/5 to-transparent",
    ring: "ring-zinc-500/15",
    cardHover: "group-hover:bg-zinc-500/[0.02]",
    icon: "text-txt-dim",
  },
};

export const Funil: React.FC = () => {
  const { columns, totalLeads, loading, lastUpdated, refresh } = useFunil();

  // Skeleton for initial load
  if (loading && totalLeads === 0) {
    return (
      <div className="h-[calc(100vh-2rem)] flex flex-col">
        <div className="noise-overlay" />
        <PageHeader title="Monitoramento de Funil" />
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col">
      <div className="noise-overlay" />

      <PageHeader
        title="Monitoramento de Funil"
        onRefresh={refresh}
        isRefreshing={loading}
        rightContent={
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary-light animate-breathe" />
            <span className="text-[11px] text-txt-dim font-mono mr-2">
              {lastUpdated.toLocaleTimeString()}
            </span>
          </div>
        }
      />

      {/* Summary bar */}
      <div className="flex items-center gap-3 mb-4 px-1 relative z-10">
        <div className="flex-1 h-1.5 rounded-full bg-surface-200/40 overflow-hidden flex">
          {COLUMNS.map((status) => {
            const col = columns[status];
            const percentage = col ? col.percentual : 0;
            const colors = COLUMN_COLORS[status];
            return (
              <div
                key={status}
                className={cn("h-full first:rounded-l-full last:rounded-r-full transition-all duration-700", colors.bar)}
                style={{ width: `${percentage}%` }}
                title={`${getStatusLabel(status)}: ${col?.quantidade ?? 0} (${percentage}%)`}
              />
            );
          })}
        </div>
        <span className="text-[10px] text-txt-dim font-mono shrink-0">{totalLeads} leads</span>
      </div>

      <div className="flex-1 overflow-x-auto pb-4 relative z-10">
        <div className="flex gap-3 min-w-[1200px] h-full">
          {COLUMNS.map((status, colIndex) => {
            const col = columns[status];
            const leads = col?.leads ?? [];
            const quantidade = col?.quantidade ?? 0;
            const percentage = col?.percentual ?? 0;
            const colors = COLUMN_COLORS[status];

            return (
              <div
                key={status}
                className={cn(
                  "flex-1 min-w-[240px] flex flex-col max-h-full animate-slide-up opacity-0 rounded-2xl overflow-hidden",
                  `stagger-${colIndex + 1}`
                )}
                style={{
                  background: 'linear-gradient(180deg, rgb(var(--c-surface-100-rgb) / 0.6) 0%, rgb(var(--c-surface-100-rgb) / 0.3) 100%)',
                  border: '1px solid var(--c-border)',
                }}
              >
                {/* Column header */}
                <div className="p-3.5 sticky top-0 z-10 backdrop-blur-md bg-surface-50/70 border-b border-glass">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full shrink-0 status-dot", colors.dot)} />
                      <h3 className="font-semibold text-txt-secondary text-xs font-display tracking-tight leading-none">
                        {getStatusLabel(status)}
                      </h3>
                    </div>
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-md font-mono font-semibold ring-1", colors.count)}>
                      {quantidade}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-[3px] rounded-full bg-surface-300/15 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-1000 ease-out", colors.bar)}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-txt-dim font-mono tabular-nums shrink-0">
                      {percentage}%
                    </span>
                  </div>
                </div>

                {/* Cards */}
                <div className="p-2 overflow-y-auto flex-1 space-y-1.5">
                  {leads.map((lead) => (
                    <div
                      key={lead.id}
                      className={cn(
                        "relative p-3 rounded-xl border border-glass transition-all duration-300 cursor-default group",
                        colors.accent,
                        colors.cardHover
                      )}
                      style={{
                        background: 'rgb(var(--c-surface-100-rgb) / 0.5)',
                      }}
                    >
                      {/* Subtle top gradient on hover */}
                      <div className={cn(
                        "absolute inset-0 rounded-xl bg-gradient-to-b opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none",
                        colors.gradient
                      )} />

                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-1.5">
                          <span className="font-medium text-txt text-[13px] group-hover:text-txt transition-colors duration-300 leading-tight">
                            {lead.nome || 'Sem nome'}
                          </span>
                          <div className="flex items-center gap-1 text-txt-dim">
                            <Clock className="w-2.5 h-2.5" />
                            <span className="text-[9px] font-mono">
                              {lead.ultima_interacao ? formatRelativeTime(lead.ultima_interacao) : '-'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Phone className={cn("w-2.5 h-2.5", colors.icon)} />
                          <span className="text-[10px] text-txt-dim font-mono">{formatTelefone(lead.telefone)}</span>
                        </div>

                        {lead.observacoes && (
                          <div className="flex items-start gap-1.5 mt-2">
                            <MessageCircle className="w-2.5 h-2.5 text-amber-400/40 mt-0.5 shrink-0" />
                            <p className="text-[10px] text-amber-400/70 leading-relaxed">
                              {lead.observacoes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {leads.length === 0 && (
                    <div className="text-center py-10 text-txt-dim text-[11px] font-mono opacity-50">
                      Vazio
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
