import React from 'react';
import { X, CheckCircle, XCircle, Users, Calendar } from 'lucide-react';
import type { AgendamentoGrupo } from '../../hooks/useAgendamentos';

function formatDataHora(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

interface AgendamentoDetalhesModalProps {
  isOpen: boolean;
  onClose: () => void;
  agendamento: AgendamentoGrupo | null;
}

export const AgendamentoDetalhesModal: React.FC<AgendamentoDetalhesModalProps> = ({
  isOpen,
  onClose,
  agendamento,
}) => {
  if (!isOpen || !agendamento) return null;

  const resultado = agendamento.resultado ?? [];
  const sucessos = resultado.filter((r) => r.sucesso).length;
  const erros = resultado.filter((r) => !r.sucesso).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative card-dark-elevated w-full max-w-lg animate-slide-up max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-300/20 shrink-0">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-txt font-display truncate">
              {agendamento.mensagem?.nome ?? 'Detalhes do Envio'}
            </h2>
            <p className="text-[11px] text-txt-dim mt-0.5 flex items-center gap-1.5">
              <Calendar className="w-3 h-3" />
              {formatDataHora(agendamento.data_envio)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-txt-muted hover:text-txt hover:bg-surface-200/40 rounded-lg transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 p-5 border-b border-surface-300/10 shrink-0">
          <div className="text-center p-3 rounded-xl bg-surface-50/40">
            <p className="text-[18px] font-bold text-txt font-mono">{resultado.length}</p>
            <p className="text-[10px] text-txt-dim uppercase tracking-wider mt-0.5">Total</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-primary-bg">
            <p className="text-[18px] font-bold text-primary-light font-mono">{sucessos}</p>
            <p className="text-[10px] text-primary-light/60 uppercase tracking-wider mt-0.5">Sucesso</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-red-500/5">
            <p className="text-[18px] font-bold text-red-400 font-mono">{erros}</p>
            <p className="text-[10px] text-red-400/60 uppercase tracking-wider mt-0.5">Erro</p>
          </div>
        </div>

        {/* Group results */}
        <div className="flex-1 overflow-y-auto min-h-0 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-3.5 h-3.5 text-txt-dim" />
            <p className="text-[12px] font-medium text-txt-muted">Resultado por grupo</p>
          </div>

          {resultado.length === 0 ? (
            <p className="text-[12px] text-txt-dim text-center py-6">
              Nenhum resultado disponível
            </p>
          ) : (
            <div className="space-y-1.5">
              {resultado.map((r, i) => (
                <div
                  key={`${r.grupo_id}-${i}`}
                  className="rounded-lg bg-surface-50/30 border border-surface-300/10 p-3"
                >
                  <div className="flex items-center gap-2.5">
                    {r.sucesso ? (
                      <CheckCircle className="w-4 h-4 text-primary-light shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <span className="text-[12px] text-txt-secondary font-medium truncate flex-1">
                      {r.grupo_nome}
                    </span>
                  </div>
                  {!r.sucesso && r.erro && (
                    <p className="text-[11px] text-red-400/80 mt-1.5 ml-[26px] leading-relaxed">
                      {r.erro}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-5 border-t border-surface-300/20 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 text-[13px] font-medium text-txt-secondary bg-surface-200/30 hover:bg-surface-200/50 rounded-xl border border-surface-300/20 transition-all"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
