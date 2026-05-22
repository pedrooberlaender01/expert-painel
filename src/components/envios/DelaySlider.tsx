import React from 'react';
import { Timer } from 'lucide-react';

interface DelaySliderProps {
  value: number;
  onChange: (v: number) => void;
}

export const DelaySlider: React.FC<DelaySliderProps> = ({ value, onChange }) => {
  const pct = ((value - 3) / (30 - 3)) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer className="w-3.5 h-3.5 text-txt-muted" />
          <span className="text-[13px] text-txt-secondary">Intervalo entre envios</span>
        </div>
        <span className="text-[13px] font-mono text-primary font-semibold">{value}s</span>
      </div>

      <div className="relative">
        <input
          type="range"
          min={3}
          max={30}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${pct}%, rgba(63,63,70,0.4) ${pct}%, rgba(63,63,70,0.4) 100%)`,
          }}
        />
      </div>

      <p className="text-[11px] text-txt-dim">
        Recomendado: 5-10s para evitar bloqueio
      </p>
    </div>
  );
};
