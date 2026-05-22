import React from 'react';
import { MessageSquareText, Mic, Play, Pencil, Trash2 } from 'lucide-react';
import { Template } from '../../types/envios';
import { formatDate } from '../../utils/formatters';
import { cn } from '../../utils/cn';

interface TemplateCardProps {
  template: Template;
  onUsar: () => void;
  onEditar: () => void;
  onExcluir: () => void;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onUsar,
  onEditar,
  onExcluir,
}) => {
  const isAudio = template.tipo === 'audio';
  const preview = template.mensagem_com_nome.length > 80
    ? template.mensagem_com_nome.substring(0, 80) + '...'
    : template.mensagem_com_nome;

  return (
    <div className="card-dark p-5 space-y-4 group">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
          isAudio ? 'bg-violet-500/10 border border-violet-500/20' : 'bg-primary/10 border border-primary/20'
        )}>
          {isAudio
            ? <Mic className="w-5 h-5 text-violet-400" />
            : <MessageSquareText className="w-5 h-5 text-primary" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-semibold text-txt font-display truncate">{template.nome}</h3>
          <span className={cn(
            'text-[11px] font-mono uppercase tracking-wide',
            isAudio ? 'text-violet-400' : 'text-primary'
          )}>
            {isAudio ? 'Áudio' : 'Texto'}
          </span>
        </div>
      </div>

      {/* Preview */}
      <div className="px-3 py-2.5 bg-surface-50/60 rounded-xl border border-surface-300/10">
        <p className="text-[12px] text-txt-secondary leading-relaxed">{preview}</p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-txt-dim">
          Criado em {formatDate(template.created_at)}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onUsar}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg border border-primary/20 transition-all"
          >
            <Play className="w-3 h-3" />
            Usar
          </button>
          <button
            onClick={onEditar}
            className="p-1.5 text-txt-muted hover:text-txt hover:bg-surface-200/40 rounded-lg transition-colors"
            title="Editar"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onExcluir}
            className="p-1.5 text-txt-muted hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            title="Excluir"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
