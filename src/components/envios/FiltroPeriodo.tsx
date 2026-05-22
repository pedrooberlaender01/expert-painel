import React from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '../../utils/cn';

interface FiltroPeriodoProps {
  ativo: boolean;
  onToggle: (ativo: boolean) => void;
  inicio: string;
  fim: string;
  onInicioChange: (v: string) => void;
  onFimChange: (v: string) => void;
}

export const FiltroPeriodo: React.FC<FiltroPeriodoProps> = ({
  ativo,
  onToggle,
  inicio,
  fim,
  onInicioChange,
  onFimChange,
}) => {
  return (
    <div className="space-y-3">
      {/* Toggle */}
      <label className="flex items-center gap-3 cursor-pointer group">
        <button
          type="button"
          role="switch"
          aria-checked={ativo}
          onClick={() => onToggle(!ativo)}
          className={cn(
            'relative w-10 h-[22px] rounded-full transition-colors duration-200 shrink-0',
            ativo ? 'bg-primary' : 'bg-surface-300/50'
          )}
        >
          <span
            className={cn(
              'absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow-sm',
              ativo && 'translate-x-[18px]'
            )}
          />
        </button>
        <span className="text-[13px] text-txt-secondary group-hover:text-txt transition-colors">
          Filtrar por período
        </span>
      </label>

      {/* Date pickers */}
      {ativo && (
        <div className="flex gap-3 animate-fade-in">
          <div className="flex-1">
            <label className="text-[11px] text-txt-muted mb-1 block font-mono uppercase tracking-wide">De</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-txt-muted pointer-events-none" />
              <input
                type="date"
                value={inicio}
                onChange={(e) => onInicioChange(e.target.value)}
                className="input-dark pl-9 text-[13px] [color-scheme:dark]"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="text-[11px] text-txt-muted mb-1 block font-mono uppercase tracking-wide">Até</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-txt-muted pointer-events-none" />
              <input
                type="date"
                value={fim}
                onChange={(e) => onFimChange(e.target.value)}
                className="input-dark pl-9 text-[13px] [color-scheme:dark]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
