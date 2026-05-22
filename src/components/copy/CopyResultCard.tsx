import React, { useState } from 'react';
import { Copy, Pencil, Check, X } from 'lucide-react';
import { SalvarBibliotecaPopover } from './SalvarBibliotecaPopover';

interface CopyResultCardProps {
  index: number;
  copy: string;
  onSave: (nome: string, conteudo: string) => Promise<void>;
  onCopied: () => void;
}

export const CopyResultCard: React.FC<CopyResultCardProps> = ({
  index,
  copy,
  onSave,
  onCopied,
}) => {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(copy);
  const [copied, setCopied] = useState(false);

  const currentText = editing ? editText : copy;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(currentText);
    setCopied(true);
    onCopied();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartEdit = () => {
    setEditText(copy);
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditText(copy);
  };

  return (
    <div
      className="relative overflow-hidden transition-all duration-300"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.04)',
        borderRadius: '16px',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)' }}
    >
      {/* Blue left accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: 'linear-gradient(to bottom, var(--color-primary), rgba(var(--color-primary-rgb),0.3))' }} />

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-bold tabular-nums" style={{ color: 'var(--color-primary-light)' }}>
            #{index + 1}
          </span>
          <span className="text-[12px] font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>Variacao {index + 1}</span>
        </div>

        {editing && (
          <div className="flex gap-1">
            <button
              onClick={handleCancelEdit}
              className="p-1.5 rounded-lg transition-all"
              style={{ color: 'rgba(255,255,255,0.4)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(248,113,113,0.08)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'transparent' }}
              title="Cancelar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setEditing(false)}
              className="p-1.5 rounded-lg transition-all"
              style={{ color: 'rgba(255,255,255,0.4)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-primary-light)'; e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.08)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'transparent' }}
              title="Confirmar"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-5 py-3.5">
        {editing ? (
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full text-white text-[13px] leading-relaxed rounded-lg p-3.5 resize-none min-h-[120px] outline-none transition-all"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(var(--color-primary-rgb),0.3)' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)' }}
            rows={6}
          />
        ) : (
          <p className="text-[13px] leading-[1.7] whitespace-pre-line" style={{ color: 'rgba(255,255,255,0.8)' }}>
            {currentText}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 px-5 py-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all duration-200"
          style={copied
            ? { background: 'rgba(var(--color-primary-rgb),0.12)', border: '1px solid rgba(var(--color-primary-rgb),0.2)', color: 'var(--color-primary-light)' }
            : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)' }
          }
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>

        <SalvarBibliotecaPopover onSave={(nome) => onSave(nome, currentText)} />

        {!editing && (
          <button
            onClick={handleStartEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all duration-200"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
          >
            <Pencil className="w-3.5 h-3.5" />
            Editar
          </button>
        )}
      </div>
    </div>
  );
};
