import React from 'react';
import { X, CheckCircle2, XCircle, Loader2, Clock, History } from 'lucide-react';
import { EnvioProgresso } from '../../types/envios';
import { formatTelefone } from '../../utils/formatters';
import { cn } from '../../utils/cn';

interface ProgressoEnvioModalProps {
  progresso: EnvioProgresso;
  onClose: () => void;
  onVerHistorico: () => void;
}

export const ProgressoEnvioModal: React.FC<ProgressoEnvioModalProps> = ({
  progresso,
  onClose,
  onVerHistorico,
}) => {
  const { total, enviados, erros, atual, status, log } = progresso;
  const concluido = status === 'concluido';
  const processados = enviados + erros;
  const pct = total > 0 ? Math.round((processados / total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative card-dark-elevated w-full max-w-lg max-h-[80vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-300/20">
          <div className="flex items-center gap-3">
            {concluido ? (
              <CheckCircle2 className="w-5 h-5 text-primary" />
            ) : (
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            )}
            <h2 className="text-[15px] font-semibold text-txt font-display">
              {concluido ? 'Envio concluído!' : status === 'preparando' ? 'Preparando envio...' : 'Enviando mensagens...'}
            </h2>
          </div>
          {concluido && (
            <button
              onClick={onClose}
              className="p-1.5 text-txt-muted hover:text-txt hover:bg-surface-200/40 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Progress */}
        <div className="p-5 space-y-4 border-b border-surface-300/20">
          {/* Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] text-txt-muted font-mono">{pct}%</span>
              <span className="text-[12px] text-txt-muted">
                {processados} de {total}
              </span>
            </div>
            <div className="h-2 bg-surface-200/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent to-accent-bright rounded-full transition-all duration-500 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Current */}
          {atual && !concluido && (
            <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-xl border border-primary/10">
              <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
              <span className="text-[12px] text-txt-secondary truncate">
                {atual.nome || 'Sem nome'} ({formatTelefone(atual.telefone)})
              </span>
            </div>
          )}

          {/* Summary when done */}
          {concluido && (
            <div className="flex items-center gap-4 text-[13px]">
              <span className="text-primary font-medium">{enviados} enviados com sucesso</span>
              {erros > 0 && <span className="text-rose-400 font-medium">{erros} falharam</span>}
            </div>
          )}
        </div>

        {/* Log */}
        <div className="flex-1 overflow-y-auto p-5 space-y-1 min-h-0 max-h-[300px]">
          {log.map((entry, i) => (
            <div key={i} className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg">
              {entry.status === 'sucesso' && <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />}
              {entry.status === 'erro' && <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
              {entry.status === 'enviando' && <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />}
              {entry.status === 'aguardando' && <Clock className="w-3.5 h-3.5 text-txt-dim shrink-0" />}

              <span className={cn(
                'text-[12px] truncate flex-1',
                entry.status === 'aguardando' ? 'text-txt-dim' : 'text-txt-secondary'
              )}>
                {entry.nome || formatTelefone(entry.telefone)}
              </span>

              {entry.status === 'sucesso' && entry.timestamp && (
                <span className="text-[10px] text-txt-dim font-mono shrink-0">
                  Enviado às {entry.timestamp}
                </span>
              )}
              {entry.status === 'erro' && (
                <span className="text-[10px] text-rose-400/80 shrink-0">
                  {entry.erro_mensagem || 'Erro'}
                </span>
              )}
              {entry.status === 'enviando' && (
                <span className="text-[10px] text-amber-400/80 shrink-0">Enviando...</span>
              )}
              {entry.status === 'aguardando' && (
                <span className="text-[10px] text-txt-dim shrink-0">Aguardando</span>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        {concluido && (
          <div className="flex items-center justify-end gap-3 p-5 border-t border-surface-300/20">
            <button
              onClick={onVerHistorico}
              className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-txt-secondary hover:text-txt bg-surface-200/30 hover:bg-surface-200/50 rounded-xl border border-surface-300/20 transition-all"
            >
              <History className="w-3.5 h-3.5" />
              Ver histórico
            </button>
            <button
              onClick={onClose}
              className="btn-primary text-[13px] px-5 py-2"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
