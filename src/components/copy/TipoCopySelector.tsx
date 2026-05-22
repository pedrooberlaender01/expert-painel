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
            : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }
          }
          onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(255,255,255,0.85)' } }}
          onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' } }}
        >
          {label}
        </button>
      );
    })}
  </div>
);

export { TIPOS as TIPOS_COPY };
