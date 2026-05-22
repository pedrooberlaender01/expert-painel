import React from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import type { AgendamentoGrupo } from '../../hooks/useAgendamentos';
import { cn } from '../../utils/cn';

interface ConfirmCancelAgendamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  agendamento: AgendamentoGrupo | null;
  loading: boolean;
}

export const ConfirmCancelAgendamentoModal: React.FC<ConfirmCancelAgendamentoModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  agendamento,
  loading,
}) => {
  if (!isOpen || !agendamento) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative card-dark-elevated w-full max-w-md animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-300/20">
          <h2 className="text-[15px] font-semibold text-txt font-display">
            Cancelar Agendamento
          </h2>
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
            Tem certeza que deseja cancelar este agendamento?
          </p>

          {agendamento.recorrente && (
            <div className="flex gap-3 p-3.5 rounded-xl bg-yellow-500/5 border border-yellow-500/15">
              <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
              <p className="text-[12px] text-yellow-400/90 leading-relaxed">
                Este agendamento é recorrente. Todos os envios futuros pendentes também serão
                cancelados.
              </p>
            </div>
          )}
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
            disabled={loading}
            className={cn(
              'flex items-center gap-2 px-5 py-2 text-[13px] font-semibold rounded-xl transition-all duration-200',
              loading
                ? 'bg-surface-200/30 text-txt-dim cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-500 text-white shadow-[0_2px_12px_rgba(239,68,68,0.2)] hover:shadow-[0_4px_20px_rgba(239,68,68,0.3)]'
            )}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Cancelar Agendamento
          </button>
        </div>
      </div>
    </div>
  );
};
