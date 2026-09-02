import React from 'react';

const TIPOS = [
  { key: 'live', label: 'Aviso de Live' },
  { key: 'bom_dia', label: 'Bom dia' },
  { key: 'cadastro', label: 'Cadastro' },
  { key: 'aviso', label: 'Aviso' },
  { key: 'normal', label: 'Normal' },
  { key: 'resultado', label: 'Resultado' },
  { key: 'hype', label: 'Hype' },
  { key: 'promocao', label: 'Promoção' },
] as const;

interface TipoCopySelectorProps {
  selected: string;
  onChange: (tipo: string) => void;
}

export const TipoCopySelector: React.FC<TipoCopySelectorProps> = ({ selected, onChange }) => (
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
    {TIPOS.map(({ key, label }) => {
      const isActive = selected === key;
      return (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className="flex items-center justify-center px-3 py-3 rounded-xl text-[13px] font-medium transition-all duration-200"
          style={isActive
            ? { background: 'rgba(var(--color-primary-rgb),0.12)', border: '1px solid rgba(var(--color-primary-rgb),0.3)', color: 'var(--color-primary-light)', boxShadow: '0 0 12px rgba(var(--color-primary-rgb),0.08)' }
            : { background: 'var(--c-glass)', border: '1px solid var(--c-border-strong)', color: 'var(--c-t-60)' }
          }
          onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = 'var(--c-glass-hover)'; e.currentTarget.style.borderColor = 'var(--c-border-strong)'; e.currentTarget.style.color = 'rgb(var(--c-fg-rgb) / 0.85)' } }}
          onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = 'var(--c-glass)'; e.currentTarget.style.borderColor = 'var(--c-border-strong)'; e.currentTarget.style.color = 'rgb(var(--c-fg-rgb) / 0.6)' } }}
        >
          {label}
        </button>
      );
    })}
  </div>
);

export { TIPOS as TIPOS_COPY };
