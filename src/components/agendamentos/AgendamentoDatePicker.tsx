import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import type { RegraRecorrencia } from '../../hooks/useAgendamentos';
import { cn } from '../../utils/cn';

const DIAS_SEMANA = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

// ─── Glass Dropdown ────────────────────────────────────────────────────

const GlassDropdown: React.FC<{
  value: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  onChange: (val: string) => void;
  className?: string;
  accentColor?: string;
  accentRgb?: string;
}> = ({ value, options, placeholder, onChange, className, accentColor = '#34d399', accentRgb = '52,211,153' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; placement: 'top' | 'bottom' }>({ top: 0, left: 0, placement: 'bottom' });

  const close = useCallback(() => setOpen(false), []);

  // Calcula posição do popover (portal). Flip para cima quando faltar espaço.
  const updatePosition = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const POP_WIDTH = 56;
    const POP_HEIGHT = 200;
    const GAP = 4;
    const buttonCenter = rect.left + rect.width / 2;
    const left = Math.min(
      Math.max(8, buttonCenter - POP_WIDTH / 2),
      window.innerWidth - POP_WIDTH - 8,
    );
    const spaceBelow = window.innerHeight - rect.bottom;
    const placement: 'top' | 'bottom' = spaceBelow < POP_HEIGHT + GAP + 8 && rect.top > POP_HEIGHT + GAP + 8 ? 'top' : 'bottom';
    const top = placement === 'bottom' ? rect.bottom + GAP : rect.top - GAP - POP_HEIGHT;
    setPos({ top, left, placement });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (popRef.current?.contains(target)) return;
      close();
    };
    const onScrollOrResize = () => updatePosition();
    document.addEventListener('mousedown', handler);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open, close, updatePosition]);

  useEffect(() => {
    if (open && listRef.current && value) {
      const el = listRef.current.querySelector(`[data-value="${value}"]`) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ block: 'center' });
      }
    }
  }, [open, value]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-center gap-1 font-mono text-[13px] transition-all duration-200 outline-none"
        style={{
          background: 'var(--c-glass)',
          border: open ? `1px solid rgba(${accentRgb},0.35)` : '1px solid var(--c-border)',
          borderRadius: '10px',
          padding: '8px 6px',
          color: selected ? 'rgb(var(--c-fg-rgb))' : 'rgb(var(--c-fg-rgb) / 0.35)',
          boxShadow: open ? `0 0 0 3px rgba(${accentRgb},0.1)` : 'none',
        }}
      >
        <span className="tabular-nums">{selected?.label ?? placeholder ?? '—'}</span>
        <ChevronDown
          className="w-3 h-3 transition-transform duration-200 shrink-0"
          style={{ color: 'var(--c-t-30)', transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>

      {open && createPortal(
        <div
          ref={popRef}
          className="animate-fade-in"
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: '56px',
            zIndex: 9999,
            background: 'var(--c-popup-bg)',
            border: '1px solid var(--c-border-strong)',
            borderRadius: '12px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset',
            overflow: 'hidden',
          }}
        >
          <div
            ref={listRef}
            className="overflow-y-auto py-1"
            style={{ maxHeight: '200px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
          >
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  data-value={opt.value}
                  onClick={() => { onChange(opt.value); close(); }}
                  className="w-full text-center px-4 py-1.5 text-[13px] font-mono tabular-nums transition-all duration-150 outline-none"
                  style={{
                    background: isSelected ? `rgba(${accentRgb},0.15)` : 'transparent',
                    color: isSelected ? accentColor : 'rgb(var(--c-fg-rgb) / 0.6)',
                    fontWeight: isSelected ? 600 : 400,
                  }}
                  onMouseEnter={(e) => { if (!isSelected) { e.currentTarget.style.background = 'var(--c-glass)'; e.currentTarget.style.color = 'rgb(var(--c-fg-rgb))' } }}
                  onMouseLeave={(e) => { if (!isSelected) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgb(var(--c-fg-rgb) / 0.6)' } }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};

// ─── Helper: generate option arrays ────────────────────────────────────

const DAYS = Array.from({ length: 31 }, (_, i) => {
  const v = String(i + 1).padStart(2, '0');
  return { value: v, label: v };
});
const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const v = String(i + 1).padStart(2, '0');
  return { value: v, label: v };
});
const HOURS = Array.from({ length: 24 }, (_, i) => {
  const v = String(i).padStart(2, '0');
  return { value: v, label: v };
});
const MINUTES = Array.from({ length: 60 }, (_, i) => {
  const v = String(i).padStart(2, '0');
  return { value: v, label: v };
});

// ─── Calcula proximo data_envio para recorrencia ───────────────────────

export function calcularProximoEnvio(diasSemana: number[], horario: string): string {
  if (diasSemana.length === 0 || !horario) return '';

  const agora = new Date();
  const [hh, mm] = horario.split(':').map(Number);

  // Tenta encontrar o proximo dia valido nos proximos 8 dias
  for (let offset = 0; offset <= 7; offset++) {
    const candidato = new Date(agora);
    candidato.setDate(candidato.getDate() + offset);
    candidato.setHours(hh, mm, 0, 0);

    const diaSemana = candidato.getDay();
    if (!diasSemana.includes(diaSemana)) continue;

    // Se for hoje, so vale se ainda nao passou o horario
    if (offset === 0 && candidato.getTime() <= agora.getTime()) continue;

    const y = candidato.getFullYear();
    const m = String(candidato.getMonth() + 1).padStart(2, '0');
    const d = String(candidato.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return '';
}

// ─── Main Component ────────────────────────────────────────────────────

interface AgendamentoDatePickerProps {
  dataEnvio: string;
  horario: string;
  recorrente: boolean;
  regraRecorrencia: RegraRecorrencia | null;
  onDataChange: (data: string) => void;
  onHorarioChange: (horario: string) => void;
  onRecorrenteChange: (recorrente: boolean) => void;
  onRegraChange: (regra: RegraRecorrencia | null) => void;
  canal?: 'whatsapp' | 'telegram';
}

export const AgendamentoDatePicker: React.FC<AgendamentoDatePickerProps> = ({
  dataEnvio,
  horario,
  recorrente,
  regraRecorrencia,
  onDataChange,
  onHorarioChange,
  onRecorrenteChange,
  onRegraChange,
  canal = 'whatsapp',
}) => {
  const isTelegram = canal === 'telegram';
  const hoje = new Date().toISOString().split('T')[0];
  const hojePartes = hoje.split('-');

  const YEARS = Array.from({ length: 3 }, (_, i) => {
    const v = String(Number(hojePartes[0]) + i);
    return { value: v, label: v };
  });

  const handleRecorrenteToggle = (checked: boolean) => {
    onRecorrenteChange(checked);
    if (checked) {
      const hr = horario || '09:00';
      const regra: RegraRecorrencia = {
        tipo: 'diario',
        dias_semana: [],
        horario: hr,
        data_fim: null,
      };
      onRegraChange(regra);
    } else {
      onRegraChange(null);
      // Restaura data de hoje se estava vazia
      if (!dataEnvio) onDataChange(hoje);
    }
  };

  const handleDiaSemanaToggle = (dia: number) => {
    if (!regraRecorrencia) return;
    const dias = regraRecorrencia.dias_semana.includes(dia)
      ? regraRecorrencia.dias_semana.filter((d) => d !== dia)
      : [...regraRecorrencia.dias_semana, dia].sort();

    // tipo automatico: todos os 7 dias = diario, senao semanal
    const tipo = dias.length === 7 ? 'diario' : 'semanal';

    const novaRegra: RegraRecorrencia = { ...regraRecorrencia, dias_semana: dias, tipo };
    onRegraChange(novaRegra);

    // Recalcula data_envio automaticamente
    const hr = regraRecorrencia.horario || horario;
    if (dias.length > 0 && hr) {
      const proximaData = calcularProximoEnvio(dias, hr);
      if (proximaData) onDataChange(proximaData);
    }
  };

  const handleHorarioRecorrente = (novoHorario: string) => {
    onHorarioChange(novoHorario);
    if (regraRecorrencia) {
      const novaRegra = { ...regraRecorrencia, horario: novoHorario };
      onRegraChange(novaRegra);

      // Recalcula data_envio
      if (regraRecorrencia.dias_semana.length > 0) {
        const proximaData = calcularProximoEnvio(regraRecorrencia.dias_semana, novoHorario);
        if (proximaData) onDataChange(proximaData);
      }
    }
  };

  const [dParts, hParts] = [dataEnvio.split('-'), horario.split(':')];

  const accentColor = isTelegram ? '#38bdf8' : '#34d399';
  const accentBg = isTelegram ? 'rgba(56,189,248,' : 'rgba(52,211,153,';
  const accentRgb = isTelegram ? '56,189,248' : '52,211,153';

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--c-glass)', border: '1px solid var(--c-border)' }}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <span
            className="inline-flex items-center justify-center w-6 h-6 rounded-lg text-[11px] font-bold font-mono"
            style={{ background: `${accentBg}0.15)`, color: accentColor }}
          >
            2
          </span>
          <h3 className="text-[14px] font-semibold text-txt font-display">Agendamento</h3>
        </div>

        <div className="space-y-4">
          {/* Data + Horario — quando NAO recorrente */}
          {!recorrente && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.5px] mb-2" style={{ color: 'var(--c-t-40)' }}>Data</label>
                <div className="flex items-center gap-1.5">
                  <GlassDropdown
                    value={dParts[2] ?? ''}
                    options={DAYS}
                    placeholder="DD"
                    onChange={(v) => {
                      const [y, m] = dParts;
                      onDataChange(`${y || hojePartes[0]}-${m || hojePartes[1]}-${v}`);
                    }}
                    className="flex-1"
                    accentColor={accentColor}
                    accentRgb={accentRgb}
                  />
                  <span className="font-bold text-[14px]" style={{ color: 'var(--c-t-20)' }}>/</span>
                  <GlassDropdown
                    value={dParts[1] ?? ''}
                    options={MONTHS}
                    placeholder="MM"
                    onChange={(v) => {
                      const [y, , d] = dParts;
                      onDataChange(`${y || hojePartes[0]}-${v}-${d || '01'}`);
                    }}
                    className="flex-1"
                    accentColor={accentColor}
                    accentRgb={accentRgb}
                  />
                  <span className="font-bold text-[14px]" style={{ color: 'var(--c-t-20)' }}>/</span>
                  <GlassDropdown
                    value={dParts[0] ?? ''}
                    options={YEARS}
                    placeholder="AAAA"
                    onChange={(v) => {
                      const [, m, d] = dParts;
                      onDataChange(`${v}-${m || hojePartes[1]}-${d || hojePartes[2]}`);
                    }}
                    className="flex-[1.3]"
                    accentColor={accentColor}
                    accentRgb={accentRgb}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.5px] mb-2" style={{ color: 'var(--c-t-40)' }}>Horário</label>
                <div className="flex items-center gap-1.5">
                  <GlassDropdown
                    value={hParts[0] ?? ''}
                    options={HOURS}
                    placeholder="HH"
                    onChange={(v) => {
                      const min = hParts[1] ?? '00';
                      onHorarioChange(`${v}:${min}`);
                    }}
                    className="flex-1"
                    accentColor={accentColor}
                    accentRgb={accentRgb}
                  />
                  <span className="font-bold text-[14px]" style={{ color: 'var(--c-t-20)' }}>:</span>
                  <GlassDropdown
                    value={hParts[1] ?? ''}
                    options={MINUTES}
                    placeholder="mm"
                    onChange={(v) => {
                      const hr = hParts[0] ?? '00';
                      onHorarioChange(`${hr}:${v}`);
                    }}
                    className="flex-1"
                    accentColor={accentColor}
                    accentRgb={accentRgb}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Horario — quando recorrente */}
          {recorrente && (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.5px] mb-2" style={{ color: 'var(--c-t-40)' }}>
                Horário do envio
              </label>
              <div className="flex items-center gap-1.5" style={{ maxWidth: '160px' }}>
                <GlassDropdown
                  value={hParts[0] ?? ''}
                  options={HOURS}
                  placeholder="HH"
                  onChange={(v) => {
                    const min = hParts[1] ?? '00';
                    handleHorarioRecorrente(`${v}:${min}`);
                  }}
                  className="flex-1"
                  accentColor={accentColor}
                  accentRgb={accentRgb}
                />
                <span className="font-bold text-[14px]" style={{ color: 'var(--c-t-20)' }}>:</span>
                <GlassDropdown
                  value={hParts[1] ?? ''}
                  options={MINUTES}
                  placeholder="mm"
                  onChange={(v) => {
                    const hr = hParts[0] ?? '00';
                    handleHorarioRecorrente(`${hr}:${v}`);
                  }}
                  className="flex-1"
                  accentColor={accentColor}
                  accentRgb={accentRgb}
                />
              </div>
            </div>
          )}

          {/* Recorrente toggle */}
          <label
            className="flex items-center gap-3 p-3 rounded-xl cursor-pointer group transition-colors"
            style={{ background: 'var(--c-glass)', border: '1px solid var(--c-border)' }}
          >
            <div className="relative">
              <input
                type="checkbox"
                checked={recorrente}
                onChange={(e) => handleRecorrenteToggle(e.target.checked)}
                className="sr-only peer"
              />
              <div
                className="w-[44px] h-[24px] rounded-full transition-colors duration-300"
                style={{
                  background: recorrente ? `${accentBg}0.35)` : 'rgb(var(--c-fg-rgb) / 0.1)',
                  border: recorrente ? `1px solid ${accentBg}0.5)` : '1px solid var(--c-border-strong)',
                }}
              />
              <div
                className="absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white transition-transform duration-300"
                style={{
                  transform: recorrente ? 'translateX(22px)' : 'translateX(2px)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }}
              />
            </div>
            <span className="text-[12px] font-medium transition-colors" style={{ color: recorrente ? 'rgb(var(--c-fg-rgb))' : 'rgb(var(--c-fg-rgb) / 0.5)' }}>
              Horários recorrentes
            </span>
          </label>

          {/* Dias da semana — visivel apenas quando recorrente */}
          {recorrente && (
            <div style={{ borderTop: '1px solid var(--c-border)', paddingTop: '16px' }}>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.5px] mb-2.5" style={{ color: 'var(--c-t-40)' }}>
                Dias da semana
              </label>
              <div className="flex gap-1.5">
                {DIAS_SEMANA.map((d) => {
                  const isActive = regraRecorrencia?.dias_semana.includes(d.value) ?? false;
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => handleDiaSemanaToggle(d.value)}
                      className="flex-1 py-2.5 rounded-lg text-[11px] font-semibold transition-colors duration-200"
                      style={isActive
                        ? {
                            background: isTelegram ? 'rgba(56,189,248,0.25)' : 'rgba(16,185,129,0.6)',
                            color: '#fff',
                            boxShadow: `0 0 12px ${accentBg}0.2)`,
                          }
                        : {
                            background: 'var(--c-glass)',
                            color: 'var(--c-t-40)',
                          }
                      }
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
