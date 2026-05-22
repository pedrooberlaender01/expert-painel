import React from 'react';

interface Opcoes {
  incluir_cta: boolean;
  usar_urgencia: boolean;
  mencionar_comunidade: boolean;
  incluir_link: boolean;
  link: string;
}

interface OpcoesExtrasProps {
  opcoes: Opcoes;
  onChange: (opcoes: Opcoes) => void;
}

const CHECKS = [
  { key: 'incluir_cta' as const, label: 'Incluir CTA (chamada para ação)' },
  { key: 'usar_urgencia' as const, label: 'Usar urgência/escassez' },
  { key: 'mencionar_comunidade' as const, label: 'Mencionar comunidade' },
  { key: 'incluir_link' as const, label: 'Incluir link' },
];

export const OpcoesExtras: React.FC<OpcoesExtrasProps> = ({ opcoes, onChange }) => {
  const toggle = (key: keyof Omit<Opcoes, 'link'>) => {
    onChange({ ...opcoes, [key]: !opcoes[key] });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {CHECKS.map(({ key, label }) => (
          <label
            key={key}
            className="group flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200"
            style={{
              background: opcoes[key] ? 'rgba(var(--color-primary-rgb),0.04)' : 'rgba(255,255,255,0.04)',
              border: opcoes[key] ? '1px solid rgba(var(--color-primary-rgb),0.2)' : '1px solid rgba(255,255,255,0.04)',
            }}
          >
            {/* Glass toggle */}
            <div
              className="relative w-[44px] h-[24px] rounded-full transition-all duration-300 shrink-0 cursor-pointer"
              style={{
                background: opcoes[key] ? 'rgba(var(--color-primary-rgb),0.35)' : 'rgba(255,255,255,0.1)',
                border: opcoes[key] ? '1px solid rgba(var(--color-primary-rgb),0.5)' : '1px solid rgba(255,255,255,0.15)',
              }}
              onClick={(e) => { e.preventDefault(); toggle(key); }}
            >
              <div
                className="absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white transition-transform duration-300"
                style={{
                  transform: opcoes[key] ? 'translateX(22px)' : 'translateX(2px)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }}
              />
            </div>
            <input
              type="checkbox"
              checked={opcoes[key]}
              onChange={() => toggle(key)}
              className="sr-only"
            />
            <span className="text-[13px] font-medium" style={{ color: opcoes[key] ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.6)' }}>
              {label}
            </span>
          </label>
        ))}
      </div>

      {opcoes.incluir_link && (
        <input
          type="url"
          value={opcoes.link}
          onChange={(e) => onChange({ ...opcoes, link: e.target.value })}
          placeholder="https://..."
          className="w-full text-white text-[13px] outline-none transition-all duration-200 animate-[slideDown_150ms_ease-out]"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '10px 16px',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(var(--color-primary-rgb),0.3)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(var(--color-primary-rgb),0.08)' }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none' }}
        />
      )}
    </div>
  );
};
