import React, { useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '../../utils/cn';

interface MensagemEditorProps {
  label: string;
  sublabel: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  showNomeButton?: boolean;
  validacao: 'deve-ter-nome' | 'nao-pode-ter-nome';
}

export const MensagemEditor: React.FC<MensagemEditorProps> = ({
  label,
  sublabel,
  placeholder,
  value,
  onChange,
  showNomeButton,
  validacao,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const inserirNome = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = value.substring(0, start) + '{{nome}}' + value.substring(end);
    onChange(newValue);
    // Restore cursor position after {{nome}}
    requestAnimationFrame(() => {
      textarea.focus();
      const newPos = start + 8; // length of '{{nome}}'
      textarea.setSelectionRange(newPos, newPos);
    });
  };

  const temNome = value.includes('{{nome}}');
  const isInvalid =
    (validacao === 'deve-ter-nome' && value.length > 0 && !temNome) ||
    (validacao === 'nao-pode-ter-nome' && temNome);

  const erroMsg =
    validacao === 'deve-ter-nome' && value.length > 0 && !temNome
      ? 'A mensagem deve conter {{nome}}'
      : validacao === 'nao-pode-ter-nome' && temNome
        ? 'Esta mensagem não pode conter {{nome}}'
        : null;

  return (
    <div className="space-y-2">
      <div>
        <label className="text-[13px] font-medium text-txt">{label}</label>
        <p className="text-[11px] text-txt-muted">{sublabel}</p>
      </div>
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={500}
          rows={4}
          className={cn(
            'input-dark resize-none text-[13px] leading-relaxed pr-16',
            isInvalid && '!border-rose-500/50 focus:!border-rose-500/70 focus:!shadow-[0_0_0_3px_rgba(239,68,68,0.08)]'
          )}
        />
        <span className={cn(
          'absolute bottom-3 right-3 text-[11px] font-mono',
          value.length > 450 ? 'text-amber-400' : 'text-txt-dim'
        )}>
          {value.length}/500
        </span>
      </div>

      <div className="flex items-center gap-2">
        {showNomeButton && (
          <button
            type="button"
            onClick={inserirNome}
            className="px-2.5 py-1 text-[11px] font-mono text-primary bg-primary/10 hover:bg-primary/20 rounded-lg border border-primary/20 transition-colors"
          >
            + {'{{nome}}'}
          </button>
        )}
        {erroMsg && (
          <div className="flex items-center gap-1.5 text-rose-400">
            <AlertTriangle className="w-3 h-3" />
            <span className="text-[11px]">{erroMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
};
