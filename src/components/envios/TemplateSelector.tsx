import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, FileText } from 'lucide-react';
import { Template } from '../../types/envios';
import { cn } from '../../utils/cn';

interface TemplateSelectorProps {
  templates: Template[];
  onSelect: (template: Template) => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({ templates, onSelect }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg transition-all duration-200',
          'text-txt-muted hover:text-txt bg-surface-200/30 hover:bg-surface-200/50 border border-surface-300/20'
        )}
      >
        <FileText className="w-3 h-3" />
        Carregar template
        <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 card-dark-elevated p-1.5 z-50 animate-fade-in">
          {templates.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => { onSelect(tpl); setOpen(false); }}
              className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-surface-200/40 transition-colors group"
            >
              <div className="text-[13px] font-medium text-txt group-hover:text-primary transition-colors">
                {tpl.nome}
              </div>
              <div className="text-[11px] text-txt-muted truncate mt-0.5">
                {tpl.tipo === 'audio' ? '🎤 ' : '💬 '}
                {tpl.mensagem_com_nome.substring(0, 50)}...
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
