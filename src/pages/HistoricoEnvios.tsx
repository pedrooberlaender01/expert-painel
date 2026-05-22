import React, { useState, useMemo } from 'react';
import { Eye, MessageSquareText, Mic, X, Filter, Loader2 } from 'lucide-react';
import { StatusLead } from '../types';
import { useHistoricoEnvios } from '../hooks/useHistoricoEnvios';
import { PageHeader } from '../components/PageHeader';
import { EnviosNav } from '../components/envios/EnviosNav';
import { DetalhesEnvioModal } from '../components/envios/DetalhesEnvioModal';
import { LeadBadge } from '../components/LeadBadge';
import { formatDate, formatTime } from '../utils/formatters';
import { parseISO, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { cn } from '../utils/cn';
import type { EnvioMassaRow } from '../types/database';

// Adapter: EnvioMassaRow -> shape needed by DetalhesEnvioModal
function toHistoricoEnvio(envio: EnvioMassaRow) {
  return {
    id: envio.id,
    data_envio: envio.data_envio,
    tipo: envio.tipo,
    mensagem_com_nome: envio.mensagem_com_nome,
    mensagem_sem_nome: envio.mensagem_sem_nome,
    status_selecionados: envio.status_selecionados,
    periodo_inicio: envio.periodo_inicio,
    periodo_fim: envio.periodo_fim,
    total_leads: envio.total_leads,
    leads_com_nome: envio.leads_com_nome,
    leads_sem_nome: envio.leads_sem_nome,
    template_id: envio.template_id,
    leads_enviados: envio.leads_enviados,
    leads_erro: envio.leads_erro,
    status: envio.status,
  };
}

export const HistoricoEnvios: React.FC = () => {
  const { envios, loading } = useHistoricoEnvios();
  const [filtroInicio, setFiltroInicio] = useState('');
  const [filtroFim, setFiltroFim] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'texto' | 'audio'>('todos');
  const [detalheEnvio, setDetalheEnvio] = useState<ReturnType<typeof toHistoricoEnvio> | null>(null);

  const historico = useMemo(() => {
    let data = [...envios].sort(
      (a, b) => new Date(b.data_envio).getTime() - new Date(a.data_envio).getTime()
    );

    if (filtroTipo !== 'todos') {
      data = data.filter((e) => e.tipo === filtroTipo);
    }
    if (filtroInicio) {
      const start = startOfDay(parseISO(filtroInicio));
      data = data.filter((e) => isAfter(parseISO(e.data_envio), start));
    }
    if (filtroFim) {
      const end = endOfDay(parseISO(filtroFim));
      data = data.filter((e) => isBefore(parseISO(e.data_envio), end));
    }

    return data;
  }, [envios, filtroTipo, filtroInicio, filtroFim]);

  const hasFilters = filtroInicio || filtroFim || filtroTipo !== 'todos';

  const limparFiltros = () => {
    setFiltroInicio('');
    setFiltroFim('');
    setFiltroTipo('todos');
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case 'em_andamento': return 'Em andamento';
      case 'concluido': return 'Concluido';
      case 'cancelado': return 'Cancelado';
      case 'erro': return 'Erro';
      default: return s;
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'em_andamento': return 'text-amber-400';
      case 'concluido': return 'text-primary';
      case 'cancelado': return 'text-txt-muted';
      case 'erro': return 'text-rose-400';
      default: return 'text-txt-muted';
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <PageHeader title="Envios em Massa" subtitle="Histórico de envios realizados" />
      <EnviosNav />

      {/* Filters */}
      <div className="card-dark p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-2 text-txt-muted">
            <Filter className="w-3.5 h-3.5" />
            <span className="text-[12px] font-medium">Filtros</span>
          </div>

          <div>
            <label className="text-[11px] text-txt-muted mb-1 block font-mono uppercase tracking-wide">De</label>
            <input
              type="date"
              value={filtroInicio}
              onChange={(e) => setFiltroInicio(e.target.value)}
              className="input-dark text-[12px] py-2 px-3 w-40 [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="text-[11px] text-txt-muted mb-1 block font-mono uppercase tracking-wide">Até</label>
            <input
              type="date"
              value={filtroFim}
              onChange={(e) => setFiltroFim(e.target.value)}
              className="input-dark text-[12px] py-2 px-3 w-40 [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="text-[11px] text-txt-muted mb-1 block font-mono uppercase tracking-wide">Tipo</label>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as 'todos' | 'texto' | 'audio')}
              className="input-dark text-[12px] py-2 px-3 w-36 [color-scheme:dark]"
            >
              <option value="todos">Todos</option>
              <option value="texto">Texto</option>
              <option value="audio">Áudio</option>
            </select>
          </div>

          {hasFilters && (
            <button
              onClick={limparFiltros}
              className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium text-txt-muted hover:text-txt bg-surface-200/20 hover:bg-surface-200/40 rounded-xl transition-all"
            >
              <X className="w-3 h-3" />
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card-dark overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 text-primary animate-spin mr-3" />
            <span className="text-[13px] text-txt-muted">Carregando histórico...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-300/15">
                  <th className="text-left px-5 py-3 text-[11px] font-mono text-txt-muted uppercase tracking-wide">Data/Hora</th>
                  <th className="text-left px-5 py-3 text-[11px] font-mono text-txt-muted uppercase tracking-wide">Tipo</th>
                  <th className="text-center px-5 py-3 text-[11px] font-mono text-txt-muted uppercase tracking-wide">Total</th>
                  <th className="text-center px-5 py-3 text-[11px] font-mono text-txt-muted uppercase tracking-wide">Com nome</th>
                  <th className="text-center px-5 py-3 text-[11px] font-mono text-txt-muted uppercase tracking-wide">Sem nome</th>
                  <th className="text-left px-5 py-3 text-[11px] font-mono text-txt-muted uppercase tracking-wide">Status Filtrados</th>
                  <th className="text-center px-5 py-3 text-[11px] font-mono text-txt-muted uppercase tracking-wide">Status</th>
                  <th className="text-center px-5 py-3 text-[11px] font-mono text-txt-muted uppercase tracking-wide">Ações</th>
                </tr>
              </thead>
              <tbody>
                {historico.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center">
                      <p className="text-[13px] text-txt-muted">Nenhum envio encontrado</p>
                      <p className="text-[11px] text-txt-dim mt-1">Ajuste os filtros para ver resultados</p>
                    </td>
                  </tr>
                ) : (
                  historico.map((envio) => (
                    <tr
                      key={envio.id}
                      className="border-b border-surface-300/10 hover:bg-surface-200/10 transition-colors"
                    >
                      {/* Data */}
                      <td className="px-5 py-3.5">
                        <span className="text-[13px] text-txt font-medium">{formatDate(envio.data_envio)}</span>
                        <span className="text-[11px] text-txt-muted ml-2">{formatTime(envio.data_envio)}</span>
                      </td>

                      {/* Tipo */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {envio.tipo === 'audio'
                            ? <Mic className="w-3.5 h-3.5 text-violet-400" />
                            : <MessageSquareText className="w-3.5 h-3.5 text-primary" />
                          }
                          <span className={cn(
                            'text-[12px] font-medium',
                            envio.tipo === 'audio' ? 'text-violet-400' : 'text-primary'
                          )}>
                            {envio.tipo === 'audio' ? 'Áudio' : 'Texto'}
                          </span>
                        </div>
                      </td>

                      {/* Total */}
                      <td className="px-5 py-3.5 text-center">
                        <span className="text-[14px] font-bold text-txt font-display">{envio.total_leads}</span>
                      </td>

                      {/* Com nome */}
                      <td className="px-5 py-3.5 text-center">
                        <span className="text-[13px] text-txt-secondary">{envio.leads_com_nome}</span>
                      </td>

                      {/* Sem nome */}
                      <td className="px-5 py-3.5 text-center">
                        <span className="text-[13px] text-txt-secondary">{envio.leads_sem_nome}</span>
                      </td>

                      {/* Status Filtrados */}
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {envio.status_selecionados.length <= 3 ? (
                            envio.status_selecionados.map((s) => (
                              <LeadBadge key={s} status={s as StatusLead} className="!text-[9px] !px-1.5 !py-0.5" />
                            ))
                          ) : (
                            <>
                              {envio.status_selecionados.slice(0, 2).map((s) => (
                                <LeadBadge key={s} status={s as StatusLead} className="!text-[9px] !px-1.5 !py-0.5" />
                              ))}
                              <span className="text-[10px] text-txt-dim self-center ml-0.5">
                                +{envio.status_selecionados.length - 2}
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Status Envio */}
                      <td className="px-5 py-3.5 text-center">
                        <span className={cn('text-[11px] font-medium', statusColor(envio.status))}>
                          {statusLabel(envio.status)}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="px-5 py-3.5 text-center">
                        <button
                          onClick={() => setDetalheEnvio(toHistoricoEnvio(envio))}
                          className="p-2 text-txt-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                          title="Ver detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {detalheEnvio && (
        <DetalhesEnvioModal
          envio={detalheEnvio}
          onClose={() => setDetalheEnvio(null)}
        />
      )}
    </div>
  );
};
