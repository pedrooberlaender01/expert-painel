import React from 'react';
import { Pencil, Trash2, ChevronUp, ChevronDown, Smartphone, Server } from 'lucide-react';
import type { WhatsappRotacao } from '../../hooks/useWhatsappRotacao';
import { cn } from '../../utils/cn';

interface NumeroCardProps {
  numero: WhatsappRotacao;
  isFirst: boolean;
  isLast: boolean;
  onToggleAtivo: (id: number, ativo: boolean) => void;
  onEdit: (numero: WhatsappRotacao) => void;
  onDelete: (numero: WhatsappRotacao) => void;
  onMoveUp: (numero: WhatsappRotacao) => void;
  onMoveDown: (numero: WhatsappRotacao) => void;
}

function formatNumero(raw: string): string {
  const d = raw.replace(/\D/g, '');
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)} ${d.slice(2)}`;
  if (d.length <= 9) return `${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4)}`;
  return `${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 9)}-${d.slice(9)}`;
}

export const NumeroCard: React.FC<NumeroCardProps> = ({
  numero,
  isFirst,
  isLast,
  onToggleAtivo,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}) => {
  return (
    <div className={cn(
      'card-dark p-5 transition-all duration-200',
      !numero.ativo && 'opacity-50'
    )}>
      {/* Header: ordem + nome + toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#004AFF]/10 text-[#004AFF] text-[13px] font-bold font-mono">
            #{numero.ordem}
          </span>
          <div>
            <h3 className="text-[14px] font-semibold text-txt font-display">{numero.nome}</h3>
            {!numero.ativo && (
              <span className="inline-block mt-0.5 px-2 py-0.5 text-[10px] font-semibold rounded-md bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20">
                Desativado
              </span>
            )}
          </div>
        </div>

        {/* Toggle */}
        <button
          onClick={() => onToggleAtivo(numero.id, !numero.ativo)}
          className={cn(
            'relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0',
            numero.ativo ? 'bg-primary' : 'bg-surface-300/40'
          )}
        >
          <span className={cn(
            'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200 shadow-sm',
            numero.ativo && 'translate-x-5'
          )} />
        </button>
      </div>

      {/* Info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-[13px]">
          <Smartphone className="w-3.5 h-3.5 text-txt-dim shrink-0" />
          <span className="text-txt-secondary font-mono">{formatNumero(numero.numero)}</span>
        </div>
        <div className="flex items-center gap-2 text-[13px]">
          <Server className="w-3.5 h-3.5 text-txt-dim shrink-0" />
          <span className="text-txt-muted">{numero.instancia}</span>
        </div>
      </div>

      {/* Footer: reorder + actions */}
      <div className="flex items-center justify-between pt-3 border-t border-surface-300/15">
        {/* Reorder */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onMoveUp(numero)}
            disabled={isFirst}
            className="p-1.5 text-txt-muted hover:text-[#004AFF] hover:bg-[#004AFF]/10 rounded-lg transition-all disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:text-txt-muted disabled:hover:bg-transparent"
            title="Mover para cima"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => onMoveDown(numero)}
            disabled={isLast}
            className="p-1.5 text-txt-muted hover:text-[#004AFF] hover:bg-[#004AFF]/10 rounded-lg transition-all disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:text-txt-muted disabled:hover:bg-transparent"
            title="Mover para baixo"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(numero)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-txt-secondary hover:text-txt bg-surface-200/30 hover:bg-surface-200/50 rounded-lg border border-surface-300/20 transition-all"
          >
            <Pencil className="w-3 h-3" />
            Editar
          </button>
          <button
            onClick={() => onDelete(numero)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg border border-rose-500/10 hover:border-rose-500/20 transition-all"
          >
            <Trash2 className="w-3 h-3" />
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
};
