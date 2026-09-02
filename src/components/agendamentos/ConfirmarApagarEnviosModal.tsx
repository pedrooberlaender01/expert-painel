import React from 'react';
import { X, AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import type { AgendamentoGrupo } from '../../hooks/useAgendamentos';
import { cn } from '../../utils/cn';

interface ConfirmarApagarEnviosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  agendamento: AgendamentoGrupo | null;
  loading: boolean;
}

// Conta quantos itens tem message_id rastreavel (enviados pelo workflow atualizado)
function countDeletavel(ag: AgendamentoGrupo | null): number {
  if (!ag?.resultado) return 0;
  return ag.resultado.filter(
    (r) => r.sucesso && (r as { message_id?: string }).message_id
  ).length;
}

export const ConfirmarApagarEnviosModal: React.FC<ConfirmarApagarEnviosModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  agendamento,
  loading,
}) => {
  if (!isOpen || !agendamento) return null;

  const deletaveis = countDeletavel(agendamento);
  const total = agendamento.resultado?.length ?? 0;
  const diff = total - deletaveis;
  const canal = agendamento.canal === 'telegram' ? 'Telegram' : 'WhatsApp';
  const limiteText = agendamento.canal === 'telegram' ? '48 horas' : '7 dias';

  const enviadoEm = new Date(agendamento.data_envio);
  const diffMs = Date.now() - enviadoEm.getTime();
  const horasPassadas = diffMs / (1000 * 60 * 60);
  const diasPassados = horasPassadas / 24;

  const limiteExcedido =
    agendamento.canal === 'telegram' ? horasPassadas > 48 : diasPassados > 7;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative card-dark-elevated w-full max-w-md animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-300/20">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </div>
            <h2 className="text-[15px] font-semibold text-txt font-display">
              Apagar mensagens enviadas
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-txt-muted hover:text-txt hover:bg-surface-200/40 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <p className="text-[13px] text-txt-secondary leading-relaxed">
            Apagar as <span className="font-semibold text-txt">{deletaveis}</span> mensagen{deletaveis !== 1 ? 's' : ''} enviadas para os grupos via {canal}?
          </p>

          {diff > 0 && (
            <div className="flex gap-3 p-3.5 rounded-xl" style={{ background: 'var(--c-glass)', border: '1px solid var(--c-border)' }}>
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--c-t-40)' }} />
              <p className="text-[12px] leading-relaxed" style={{ color: 'var(--c-t-50)' }}>
                {diff} envio{diff !== 1 ? 's' : ''} {diff !== 1 ? 'nao tem' : 'nao tem'} ID rastreavel (anterior a atualizacao do sistema). Esses nao serao apagados.
              </p>
            </div>
          )}

          {limiteExcedido && (
            <div className="flex gap-3 p-3.5 rounded-xl bg-yellow-500/5 border border-yellow-500/15">
              <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
              <p className="text-[12px] text-yellow-400/90 leading-relaxed">
                Mensagens enviadas ha mais de {limiteText} pelo {canal} podem nao ser apagadas pelo servidor. Algumas falhas sao esperadas.
              </p>
            </div>
          )}

          <div className="flex gap-3 p-3.5 rounded-xl bg-red-500/5 border border-red-500/15">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-[12px] text-red-400/90 leading-relaxed">
              Esta acao e irreversivel. As mensagens serao removidas do {canal} para todos os membros do grupo.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-surface-300/20">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-[13px] font-medium text-txt-secondary bg-surface-200/30 hover:bg-surface-200/50 rounded-xl border border-surface-300/20 transition-all"
          >
            Voltar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || deletaveis === 0}
            className={cn(
              'flex items-center gap-2 px-5 py-2 text-[13px] font-semibold rounded-xl transition-all duration-200',
              loading || deletaveis === 0
                ? 'bg-surface-200/30 text-txt-dim cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-500 text-white shadow-[0_2px_12px_rgba(239,68,68,0.2)] hover:shadow-[0_4px_20px_rgba(239,68,68,0.3)]'
            )}
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Apagar {deletaveis > 0 ? deletaveis : ''} {deletaveis === 1 ? 'mensagem' : 'mensagens'}
          </button>
        </div>
      </div>
    </div>
  );
};
