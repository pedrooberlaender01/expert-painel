import React from 'react';

const TAMANHOS = [
  { key: 'curta' as const, label: 'Curta', sub: '2-3 linhas' },
  { key: 'media' as const, label: 'Média', sub: '4-6 linhas' },
  { key: 'grande' as const, label: 'Grande', sub: '8-12 linhas' },
];

interface TamanhoSelectorProps {
  selected: 'curta' | 'media' | 'grande';
  onChange: (tamanho: 'curta' | 'media' | 'grande') => void;
}

export const TamanhoSelector: React.FC<TamanhoSelectorProps> = ({ selected, onChange }) => (
  <div
    className="flex p-1 rounded-[14px]"
    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}
  >
    {TAMANHOS.map(({ key, label, sub }) => {
      const isActive = selected === key;
      return (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className="flex-1 flex flex-col items-center gap-0.5 px-3 py-3 rounded-[10px] text-[14px] font-medium transition-all duration-250"
          style={isActive
            ? { background: 'rgba(var(--color-primary-rgb),0.15)', border: '1px solid rgba(var(--color-primary-rgb),0.3)', color: '#fff' }
            : { background: 'transparent', border: '1px solid transparent', color: 'rgba(255,255,255,0.45)' }
          }
          onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)' } }}
          onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)' } }}
        >
          <span className="font-semibold">{label}</span>
          <span className="text-[11px] font-normal" style={{ color: isActive ? 'var(--color-primary-light)' : 'rgba(255,255,255,0.25)', opacity: isActive ? 0.7 : 1 }}>
            {sub}
          </span>
        </button>
      );
    })}
  </div>
);
