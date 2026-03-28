import React, { useState, useRef, useEffect, useCallback } from 'react';
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

const TIPOS_RECORRENCIA = [
  { value: 'diario' as const, label: 'Diário' },
  { value: 'semanal' as const, label: 'Semanal' },
  { value: 'personalizado' as const, label: 'Personalizado' },
];

// ─── Glass Dropdown ────────────────────────────────────────────────────

const GlassDropdown: React.FC<{
  value: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  onChange: (val: string) => void;
  className?: string;
}> = ({ value, options, placeholder, onChange, className }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, close]);

  // Scroll to selected item when opened
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
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-center gap-1 font-mono text-[13px] transition-all duration-200 outline-none"
        style={{
          background: open ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.04)',
          border: open ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(255,255,255,0.04)',
          borderRadius: '10px',
          padding: '8px 6px',
          color: selected ? '#fff' : 'rgba(255,255,255,0.35)',
          boxShadow: open ? '0 0 0 3px rgba(59,130,246,0.08)' : 'none',
        }}
      >
        <span className="tabular-nums">{selected?.label ?? placeholder ?? '—'}</span>
        <ChevronDown
          className="w-3 h-3 transition-transform duration-200 shrink-0"
          style={{ color: 'rgba(255,255,255,0.3)', transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1 left-1/2 -translate-x-1/2 animate-fade-in"
          style={{
            background: 'rgba(16,16,28,0.97)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '12px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset',
            width: '56px',
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
                    background: isSelected ? 'rgba(59,130,246,0.15)' : 'transparent',
                    color: isSelected ? '#60a5fa' : 'rgba(255,255,255,0.6)',
                    fontWeight: isSelected ? 600 : 400,
                  }}
                  onMouseEnter={(e) => { if (!isSelected) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#fff' } }}
                  onMouseLeave={(e) => { if (!isSelected) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' } }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
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
    if (checked && !regraRecorrencia) {
      onRegraChange({ tipo: 'diario', dias_semana: [], horario: horario || '09:00', data_fim: null });
    } else if (!checked) {
      onRegraChange(null);
    }
  };

  const handleTipoChange = (tipo: RegraRecorrencia['tipo']) => {
    onRegraChange({
      ...(regraRecorrencia ?? { dias_semana: [], horario: horario || '09:00', data_fim: null }),
      tipo,
    });
  };

  const handleDiaSemanaToggle = (dia: number) => {
    if (!regraRecorrencia) return;
    const dias = regraRecorrencia.dias_semana.includes(dia)
      ? regraRecorrencia.dias_semana.filter((d) => d !== dia)
      : [...regraRecorrencia.dias_semana, dia].sort();
    onRegraChange({ ...regraRecorrencia, dias_semana: dias });
  };

  const handleDataFimChange = (dataFim: string | null) => {
    if (!regraRecorrencia) return;
    onRegraChange({ ...regraRecorrencia, data_fim: dataFim });
  };

  const showDiasSemana =
    regraRecorrencia &&
    (regraRecorrencia.tipo === 'semanal' || regraRecorrencia.tipo === 'personalizado');

  const [dParts, hParts] = [dataEnvio.split('-'), horario.split(':')];

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)' }}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <span
            className="inline-flex items-center justify-center w-6 h-6 rounded-lg text-[11px] font-bold font-mono"
            style={{ background: isTelegram ? 'rgba(56,189,248,0.15)' : 'var(--color-primary-bg)', color: isTelegram ? '#38bdf8' : 'var(--color-primary-light)' }}
          >
            2
          </span>
          <h3 className="text-[14px] font-semibold text-white font-display">Agendamento</h3>
        </div>

        {/* Date + Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.5px] mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Data</label>
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
              />
              <span className="font-bold text-[14px]" style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
              <GlassDropdown
                value={dParts[1] ?? ''}
                options={MONTHS}
                placeholder="MM"
                onChange={(v) => {
                  const [y, , d] = dParts;
                  onDataChange(`${y || hojePartes[0]}-${v}-${d || '01'}`);
                }}
                className="flex-1"
              />
              <span className="font-bold text-[14px]" style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
              <GlassDropdown
                value={dParts[0] ?? ''}
                options={YEARS}
                placeholder="AAAA"
                onChange={(v) => {
                  const [, m, d] = dParts;
                  onDataChange(`${v}-${m || hojePartes[1]}-${d || hojePartes[2]}`);
                }}
                className="flex-[1.3]"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.5px] mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Horário</label>
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
              />
              <span className="font-bold text-[14px]" style={{ color: 'rgba(255,255,255,0.2)' }}>:</span>
              <GlassDropdown
                value={hParts[1] ?? ''}
                options={MINUTES}
                placeholder="mm"
                onChange={(v) => {
                  const hr = hParts[0] ?? '00';
                  onHorarioChange(`${hr}:${v}`);
                }}
                className="flex-1"
              />
            </div>
          </div>
        </div>

        {/* Recorrente toggle */}
        <label
          className="flex items-center gap-3 p-3 rounded-xl cursor-pointer group transition-all"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}
        >
          <div className="relative">
            <input
              type="checkbox"
              checked={recorrente}
              onChange={(e) => handleRecorrenteToggle(e.target.checked)}
              className="sr-only peer"
            />
            <div
              className="w-[44px] h-[24px] rounded-full transition-all duration-300"
              style={{
                background: recorrente
                  ? (isTelegram ? 'rgba(56,189,248,0.35)' : 'var(--color-primary-bg)')
                  : 'rgba(255,255,255,0.1)',
                border: recorrente
                  ? (isTelegram ? '1px solid rgba(56,189,248,0.5)' : '1px solid var(--color-primary-bg)')
                  : '1px solid rgba(255,255,255,0.15)',
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
          <span className="text-[12px] font-medium transition-colors" style={{ color: recorrente ? '#fff' : 'rgba(255,255,255,0.5)' }}>
            Horários recorrentes
          </span>
        </label>

        {/* Recurrence options */}
        {recorrente && regraRecorrencia && (
          <div className="mt-4 space-y-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            {/* Tipo */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.5px] mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Frequência
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {TIPOS_RECORRENCIA.map((t) => {
                  const isActive = regraRecorrencia.tipo === t.value;
                  return (
                    <button
                      key={t.value}
                      onClick={() => handleTipoChange(t.value)}
                      className="px-3 py-2 rounded-xl text-[11px] font-medium transition-all duration-200"
                      style={isActive
                        ? {
                            background: isTelegram ? 'rgba(56,189,248,0.12)' : 'var(--color-primary-bg)',
                            border: isTelegram ? '1px solid rgba(56,189,248,0.25)' : '1px solid var(--color-primary-bg)',
                            color: isTelegram ? '#38bdf8' : 'var(--color-primary-light)',
                          }
                        : { background: 'rgba(255,255,255,0.04)', border: '1px solid transparent', color: 'rgba(255,255,255,0.35)' }
                      }
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dias da semana */}
            {showDiasSemana && (
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.5px] mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Dias da semana
                </label>
                <div className="flex gap-1">
                  {DIAS_SEMANA.map((d) => {
                    const isActive = regraRecorrencia.dias_semana.includes(d.value);
                    return (
                      <button
                        key={d.value}
                        onClick={() => handleDiaSemanaToggle(d.value)}
                        className="flex-1 py-2 rounded-lg text-[10px] font-semibold transition-all duration-200"
                        style={isActive
                          ? {
                              background: isTelegram ? 'rgba(56,189,248,0.15)' : 'rgba(52,211,153,0.15)',
                              border: isTelegram ? '1px solid rgba(56,189,248,0.25)' : '1px solid var(--color-primary-bg)',
                              color: isTelegram ? '#38bdf8' : 'var(--color-primary-light)',
                            }
                          : { background: 'rgba(255,255,255,0.04)', border: '1px solid transparent', color: 'rgba(255,255,255,0.35)' }
                        }
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Data fim */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.5px] mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Até</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="radio"
                    name="data_fim"
                    checked={regraRecorrencia.data_fim === null}
                    onChange={() => handleDataFimChange(null)}
                    className={cn('w-3.5 h-3.5', isTelegram ? 'accent-sky-500' : 'accent-primary')}
                  />
                  <span className="text-[12px] transition-colors" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    Sem data fim
                  </span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="radio"
                    name="data_fim"
                    checked={regraRecorrencia.data_fim !== null}
                    onChange={() => handleDataFimChange(hoje)}
                    className={cn('w-3.5 h-3.5', isTelegram ? 'accent-sky-500' : 'accent-primary')}
                  />
                  <span className="text-[12px] transition-colors" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    Data específica
                  </span>
                </label>
                {regraRecorrencia.data_fim !== null && (() => {
                  const fParts = (regraRecorrencia.data_fim ?? hoje).split('-');
                  return (
                    <div className="flex items-center gap-1.5 ml-6">
                      <GlassDropdown
                        value={fParts[2] ?? ''}
                        options={DAYS}
                        placeholder="DD"
                        onChange={(v) => {
                          handleDataFimChange(`${fParts[0]}-${fParts[1]}-${v}`);
                        }}
                        className="flex-1"
                      />
                      <span className="font-bold text-[14px]" style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
                      <GlassDropdown
                        value={fParts[1] ?? ''}
                        options={MONTHS}
                        placeholder="MM"
                        onChange={(v) => {
                          handleDataFimChange(`${fParts[0]}-${v}-${fParts[2]}`);
                        }}
                        className="flex-1"
                      />
                      <span className="font-bold text-[14px]" style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
                      <GlassDropdown
                        value={fParts[0] ?? ''}
                        options={YEARS}
                        placeholder="AAAA"
                        onChange={(v) => {
                          handleDataFimChange(`${v}-${fParts[1]}-${fParts[2]}`);
                        }}
                        className="flex-[1.3]"
                      />
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
