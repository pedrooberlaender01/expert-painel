import React from 'react';
import { MessageSquareText, Mic } from 'lucide-react';
import { cn } from '../../utils/cn';

interface TipoEnvioSelectorProps {
  tipo: 'texto' | 'audio';
  onChange: (tipo: 'texto' | 'audio') => void;
}

export const TipoEnvioSelector: React.FC<TipoEnvioSelectorProps> = ({ tipo, onChange }) => {
  const options = [
    { value: 'texto' as const, label: 'Mensagem de Texto', icon: MessageSquareText },
    { value: 'audio' as const, label: 'Mensagem de Áudio', icon: Mic },
  ];

  return (
    <div className="space-y-3">
      {options.map((opt) => {
        const selected = tipo === opt.value;
        return (
          <label
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 border',
              selected
                ? 'bg-[#004AFF]/10 border-[#004AFF]/30 shadow-[inset_0_0_20px_var(--color-primary-bg)]'
                : 'bg-surface-50/50 border-surface-300/20 hover:border-surface-300/40'
            )}
          >
            {/* Radio circle */}
            <div
              className={cn(
                'w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-all duration-200 shrink-0',
                selected ? 'border-[#004AFF]' : 'border-surface-300/60'
              )}
            >
              {selected && (
                <div className="w-2 h-2 rounded-full bg-[#004AFF]" />
              )}
            </div>
            <opt.icon className={cn(
              'w-4 h-4 transition-colors',
              selected ? 'text-[#004AFF]' : 'text-txt-muted'
            )} />
            <span className={cn(
              'text-[13px] font-medium transition-colors',
              selected ? 'text-txt' : 'text-txt-secondary'
            )}>
              {opt.label}
            </span>
          </label>
        );
      })}
      <p className="text-[11px] text-txt-dim px-1">
        Áudios serão gerados automaticamente com IA
      </p>
    </div>
  );
};
