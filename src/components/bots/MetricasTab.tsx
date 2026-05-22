import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  MessageSquare,
  Heart,
  Bot,
  Users,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  AlertTriangle,
  BarChart3,
  ChevronRight,
} from 'lucide-react';
import { useBotMetricas } from '../../hooks/useBotMetricas';
import type { BotMetrica, BotMensagemLog } from '../../hooks/useBotMetricas';
import { MetricCard } from '../MetricCard';

// ─── Seletor de período ───

const PERIODOS = [7, 15, 30] as const;

const PeriodoSelector: React.FC<{
  periodo: 7 | 15 | 30;
  onChange: (p: 7 | 15 | 30) => void;
  loading: boolean;
}> = ({ periodo, onChange, loading }) => (
  <div
    className="inline-flex gap-1 p-[3px] rounded-xl"
    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}
  >
    {PERIODOS.map((p) => {
      const isActive = periodo === p;
      return (
        <button
          key={p}
          onClick={() => onChange(p)}
          disabled={loading}
          className="px-4 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-200"
          style={isActive ? {
            background: 'rgba(var(--color-primary-rgb),0.1)',
            border: '1px solid rgba(var(--color-primary-rgb),0.2)',
            color: 'var(--color-primary-light)',
          } : {
            background: 'transparent',
            border: '1px solid transparent',
            color: 'rgba(255,255,255,0.4)',
          }}
          onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
          onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}
        >
          {p} dias
        </button>
      );
    })}
  </div>
);

// ─── Tabela de métricas ───

type SortKey = 'persona_nome' | 'grupo_nome' | 'total_mensagens' | 'total_reacoes' | 'media_por_dia';
type SortDir = 'asc' | 'desc';

const HEADERS: { key: SortKey; label: string; align?: 'right' }[] = [
  { key: 'persona_nome', label: 'Persona' },
  { key: 'grupo_nome', label: 'Grupo' },
  { key: 'total_mensagens', label: 'Msgs', align: 'right' },
  { key: 'total_reacoes', label: 'Reações', align: 'right' },
  { key: 'media_por_dia', label: 'Média/dia', align: 'right' },
];

// ─── Cores por tipo_trigger ───

const TRIGGER_COLORS: Record<string, { bg: string; text: string }> = {
  silencio: { bg: 'rgba(161,161,170,0.1)', text: '#a1a1aa' },
  engajamento: { bg: 'rgba(59,130,246,0.1)', text: '#60a5fa' },
  hype: { bg: 'rgba(52,211,153,0.1)', text: '#34d399' },
  defesa: { bg: 'rgba(251,146,60,0.1)', text: '#fb923c' },
  social_proof: { bg: 'rgba(168,85,247,0.1)', text: '#a855f7' },
  comportamento: { bg: 'rgba(96,165,250,0.1)', text: '#60a5fa' },
};

const getTriggerColor = (trigger: string) =>
  TRIGGER_COLORS[trigger] || { bg: 'rgba(255,255,255,0.05)', text: 'rgba(255,255,255,0.5)' };

// ─── Painel expandido com mensagens ───

const MensagensPanel: React.FC<{ mensagens: BotMensagemLog[]; loading: boolean }> = ({ mensagens, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'rgba(255,255,255,0.2)' }} />
      </div>
    );
  }

  if (mensagens.length === 0) {
    return (
      <p className="text-[12px] py-6 text-center" style={{ color: 'rgba(255,255,255,0.25)' }}>
        Nenhuma mensagem registrada neste período
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {mensagens.map((msg) => {
        const colors = getTriggerColor(msg.tipo_trigger);
        const hora = new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const isReacao = msg.tipo_acao === 'reacao';

        return (
          <div
            key={msg.id}
            className="flex items-start gap-2.5 px-1 py-1.5 rounded-lg transition-colors duration-150"
            style={{ background: 'transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            {/* Badge tipo_trigger */}
            <span
              className="shrink-0 mt-0.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
              style={{ background: colors.bg, color: colors.text }}
            >
              {msg.tipo_trigger?.replace('_', ' ') || 'outro'}
            </span>

            {/* Conteúdo */}
            <span className="flex-1 min-w-0 text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {isReacao ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-[16px]">{msg.conteudo}</span>
                  <span className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>Reação</span>
                </span>
              ) : (
                <span className="line-clamp-2">{msg.conteudo}</span>
              )}
            </span>

            {/* Hora */}
            <span
              className="shrink-0 text-[10px] tabular-nums font-medium mt-0.5"
              style={{ color: 'rgba(255,255,255,0.2)' }}
            >
              {hora}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// ─── Tabela com linhas expandíveis ───

const MetricasTable: React.FC<{
  data: BotMetrica[];
  periodo: number;
  buscarMensagens: (personaId: string, grupoId: string, dias: number) => Promise<BotMensagemLog[]>;
}> = ({ data, periodo, buscarMensagens }) => {
  const [sortKey, setSortKey] = useState<SortKey>('total_mensagens');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<BotMensagemLog[]>([]);
  const [loadingMensagens, setLoadingMensagens] = useState(false);

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [data, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const handleRowClick = useCallback(async (row: BotMetrica) => {
    const key = `${row.persona_id}-${row.grupo_id}`;
    if (expandedKey === key) {
      setExpandedKey(null);
      return;
    }
    setExpandedKey(key);
    setMensagens([]);
    setLoadingMensagens(true);
    const result = await buscarMensagens(row.persona_id, row.grupo_id, periodo);
    setMensagens(result);
    setLoadingMensagens(false);
  }, [expandedKey, buscarMensagens, periodo]);

  // Fechar ao trocar período
  useEffect(() => {
    setExpandedKey(null);
  }, [periodo]);

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  if (data.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
      >
        <BarChart3 className="w-8 h-8 mb-3" style={{ color: 'rgba(255,255,255,0.12)' }} />
        <p className="text-[13px] font-medium" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Nenhuma atividade registrada no período
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.04)' }}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr>
              {/* Coluna do chevron */}
              <th
                className="w-10 px-2 py-3"
                style={{ background: 'rgba(10,10,15,0.9)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              />
              {HEADERS.map((h) => (
                <th
                  key={h.key}
                  onClick={() => handleSort(h.key)}
                  className={`px-4 py-3 text-[11px] uppercase tracking-wider font-semibold cursor-pointer select-none transition-colors ${h.align === 'right' ? 'text-right' : 'text-left'}`}
                  style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(10,10,15,0.9)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {h.label}
                    <SortIcon col={h.key} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => {
              const rowKey = `${row.persona_id}-${row.grupo_id}`;
              const isExpanded = expandedKey === rowKey;

              return (
                <React.Fragment key={`${row.persona_nome}-${row.grupo_nome}-${i}`}>
                  <tr
                    className="cursor-pointer transition-colors duration-150"
                    style={{ borderBottom: isExpanded ? 'none' : '1px solid rgba(255,255,255,0.04)' }}
                    onClick={() => handleRowClick(row)}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent' }}
                  >
                    {/* Chevron */}
                    <td className="w-10 px-2 py-3.5 text-center">
                      <ChevronRight
                        className="w-3.5 h-3.5 mx-auto transition-transform duration-200"
                        style={{
                          color: isExpanded ? 'var(--color-primary-light)' : 'rgba(255,255,255,0.2)',
                          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        }}
                      />
                    </td>
                    <td className="px-4 py-3.5 text-[13px] font-medium text-white">{row.persona_nome}</td>
                    <td className="px-4 py-3.5 text-[13px]" style={{ color: 'rgba(255,255,255,0.6)' }}>{row.grupo_nome}</td>
                    <td className="px-4 py-3.5 text-[13px] text-right tabular-nums font-medium" style={{ color: '#34d399' }}>{row.total_mensagens}</td>
                    <td className="px-4 py-3.5 text-[13px] text-right tabular-nums font-medium" style={{ color: '#fb7185' }}>{row.total_reacoes}</td>
                    <td className="px-4 py-3.5 text-[13px] text-right tabular-nums" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {typeof row.media_por_dia === 'number' ? row.media_por_dia.toFixed(1) : row.media_por_dia}
                    </td>
                  </tr>
                  {/* Painel expandido */}
                  {isExpanded && (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-0"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      >
                        <div
                          className="px-4 py-4"
                          style={{ background: '#0f0f0f', borderTop: '1px solid #232328' }}
                        >
                          <MensagensPanel mensagens={mensagens} loading={loadingMensagens} />
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Alertas de suspeita ───

const AlertasSuspeita: React.FC<{ alertas: Array<{ id: string; grupo_id: string; autor_nome: string; conteudo: string; created_at: string }> }> = ({ alertas }) => {
  if (alertas.length === 0) {
    return (
      <div
        className="rounded-2xl p-5"
        style={{ background: 'rgba(52,211,153,0.04)', borderLeft: '3px solid #34d399', border: '1px solid rgba(52,211,153,0.1)', borderLeftWidth: '3px' }}
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" style={{ color: '#34d399' }} />
          <span className="text-[13px] font-medium" style={{ color: '#34d399' }}>Nenhuma suspeita detectada</span>
        </div>
        <p className="text-[12px] mt-1 ml-6" style={{ color: 'rgba(52,211,153,0.6)' }}>
          Nenhum membro mencionou termos suspeitos nos grupos monitorados
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(250,204,60,0.03)', borderLeft: '3px solid #facc3c', border: '1px solid rgba(250,204,60,0.08)', borderLeftWidth: '3px' }}
    >
      <div className="px-5 py-3.5" style={{ borderBottom: '1px solid rgba(250,204,60,0.08)' }}>
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" style={{ color: '#facc3c' }} />
          <span className="text-[14px] font-semibold" style={{ color: '#facc3c' }}>Alertas de Suspeita</span>
          <span
            className="px-2 py-0.5 rounded-md text-[10px] font-bold tabular-nums"
            style={{ background: 'rgba(250,204,60,0.12)', color: '#facc3c' }}
          >
            {alertas.length}
          </span>
        </div>
      </div>

      <div className="divide-y" style={{ borderColor: 'rgba(250,204,60,0.06)' }}>
        {alertas.map((alerta) => (
          <div key={alerta.id} className="px-5 py-3 flex items-start gap-3">
            <div className="shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full" style={{ background: '#facc3c', opacity: 0.6 }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="text-[12px] font-semibold text-white truncate">{alerta.autor_nome || 'Anônimo'}</span>
                <span className="text-[10px] shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  {new Date(alerta.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-[12px] leading-relaxed truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>{alerta.conteudo}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── MetricasTab ───

interface MetricasTabProps {
  showToast: (type: 'success' | 'error', message: string) => void;
}

export const MetricasTab: React.FC<MetricasTabProps> = ({ showToast }) => {
  const {
    metricas,
    alertas,
    totalBots,
    totalGrupos,
    loading,
    periodo,
    carregarTudo,
    trocarPeriodo,
    buscarMensagensPersona,
  } = useBotMetricas();

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized) {
      carregarTudo(periodo);
      setInitialized(true);
    }
  }, [initialized, carregarTudo, periodo]);

  // Totais calculados a partir das métricas
  const totalMsgs = useMemo(() => metricas.reduce((sum, m) => sum + m.total_mensagens, 0), [metricas]);
  const totalReacoes = useMemo(() => metricas.reduce((sum, m) => sum + m.total_reacoes, 0), [metricas]);

  const handlePeriodoChange = async (p: 7 | 15 | 30) => {
    await trocarPeriodo(p);
  };

  if (loading && !initialized) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-white/20 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Cards de resumo ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricCard
          title={`Mensagens (${periodo}d)`}
          value={totalMsgs}
          icon={MessageSquare}
          color="green"
          subtitle="Enviadas pelos bots"
        />
        <MetricCard
          title={`Reações (${periodo}d)`}
          value={totalReacoes}
          icon={Heart}
          color="rose"
          subtitle="Reações em mensagens"
        />
        <MetricCard
          title="Bots Ativos"
          value={totalBots}
          icon={Bot}
          color="primary"
          subtitle="Em operação agora"
        />
        <MetricCard
          title="Grupos com Bots"
          value={totalGrupos}
          icon={Users}
          color="cyan"
          subtitle="Com pelo menos 1 bot"
        />
      </div>

      {/* ── Header + seletor de período ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-[14px] font-semibold text-white/80">Atividade por Persona</h3>
        <PeriodoSelector periodo={periodo} onChange={handlePeriodoChange} loading={loading} />
      </div>

      {/* ── Tabela detalhada ── */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 text-white/20 animate-spin" />
        </div>
      ) : (
        <MetricasTable data={metricas} periodo={periodo} buscarMensagens={buscarMensagensPersona} />
      )}

      {/* ── Alertas de suspeita ── */}
      <AlertasSuspeita alertas={alertas} />
    </div>
  );
};
