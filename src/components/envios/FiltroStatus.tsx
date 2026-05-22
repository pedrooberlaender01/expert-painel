import React from 'react';
import { StatusLead } from '../../types';
import { getStatusLabel } from '../../utils/formatters';
import { cn } from '../../utils/cn';
import { Check } from 'lucide-react';

const STATUS_OPTIONS: StatusLead[] = [
  'primeiro_audio_enviado',
  'convite_enviado',
  'interessado',
  'nao_interessado',
  'link_enviado',
  'no_grupo',
  'sem_resposta',
];

const statusCheckboxColors: Record<StatusLead, string> = {
  primeiro_audio_enviado: 'border-amber-500/40 bg-amber-500/10 data-[checked]:bg-amber-500 data-[checked]:border-amber-500',
  convite_enviado: 'border-sky-500/40 bg-sky-500/10 data-[checked]:bg-sky-500 data-[checked]:border-sky-500',
  interessado: 'border-primary-bg bg-primary-bg data-[checked]:bg-primary data-[checked]:border-primary',
  nao_interessado: 'border-surface-300/40 bg-surface-300/10 data-[checked]:bg-surface-300 data-[checked]:border-surface-300',
  link_enviado: 'border-violet-500/40 bg-violet-500/10 data-[checked]:bg-violet-500 data-[checked]:border-violet-500',
  no_grupo: 'border-primary-bg bg-primary-bg data-[checked]:bg-primary-light data-[checked]:border-primary-light',
  sem_resposta: 'border-rose-500/40 bg-rose-500/10 data-[checked]:bg-rose-500 data-[checked]:border-rose-500',
};

interface FiltroStatusProps {
  selecionados: StatusLead[];
  onChange: (status: StatusLead[]) => void;
}

export const FiltroStatus: React.FC<FiltroStatusProps> = ({ selecionados, onChange }) => {
  const todosSelected = selecionados.length === STATUS_OPTIONS.length;

  const toggleTodos = () => {
    onChange(todosSelected ? [] : [...STATUS_OPTIONS]);
  };

  const toggleStatus = (status: StatusLead) => {
    if (selecionados.includes(status)) {
      onChange(selecionados.filter((s) => s !== status));
    } else {
      onChange([...selecionados, status]);
    }
  };

  return (
    <div className="space-y-2.5">
      {/* Todos */}
      <label
        className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer hover:bg-surface-200/30 transition-colors"
        onClick={toggleTodos}
      >
        <div
          data-checked={todosSelected || undefined}
          className={cn(
            'w-4.5 h-4.5 min-w-[18px] min-h-[18px] rounded-md border-2 flex items-center justify-center transition-all duration-200',
            'border-primary/40 bg-primary/10 data-[checked]:bg-primary data-[checked]:border-primary'
          )}
        >
          {todosSelected && <Check className="w-3 h-3 text-surface" strokeWidth={3} />}
        </div>
        <span className="text-[13px] font-medium text-txt">Todos</span>
      </label>

      <div className="h-px bg-surface-300/20 mx-3" />

      {/* Individual statuses */}
      {STATUS_OPTIONS.map((status) => {
        const checked = selecionados.includes(status);
        return (
          <label
            key={status}
            className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer hover:bg-surface-200/30 transition-colors"
            onClick={() => toggleStatus(status)}
          >
            <div
              data-checked={checked || undefined}
              className={cn(
                'w-4.5 h-4.5 min-w-[18px] min-h-[18px] rounded-md border-2 flex items-center justify-center transition-all duration-200',
                statusCheckboxColors[status]
              )}
            >
              {checked && <Check className="w-3 h-3 text-surface" strokeWidth={3} />}
            </div>
            <span className="text-[13px] text-txt-secondary">{getStatusLabel(status)}</span>
          </label>
        );
      })}
    </div>
  );
};
