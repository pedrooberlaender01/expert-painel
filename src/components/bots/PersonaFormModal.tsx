import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ChevronDown, ChevronUp, User, Sparkles, Activity, Zap, EyeOff, ShieldAlert, Check } from 'lucide-react';
import type { BotPersonaFormData } from '../../hooks/useBotPersonas';
import { PERSONA_DEFAULTS } from '../../hooks/useBotPersonas';
import { TagInput } from './TagInput';

interface PersonaFormModalProps {
  initial?: Partial<BotPersonaFormData>;
  title: string;
  onSave: (data: BotPersonaFormData) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

const TOM_VOZ_OPTIONS = [
  { value: 'muito_informal', label: 'Muito Informal' },
  { value: 'casual', label: 'Casual' },
  { value: 'neutro', label: 'Neutro' },
  { value: 'animado', label: 'Animado' },
];

// Seção colapsável (acordeão)
const Section: React.FC<{ title: string; icon: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode }> = ({ title, icon, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-[13px] font-medium text-white/70 hover:text-white/90 transition-colors"
        style={{ background: 'rgba(255,255,255,0.02)' }}
      >
        <span className="flex items-center gap-2">{icon}{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
      </button>
      {open && <div className="px-4 pb-4 pt-2 space-y-3">{children}</div>}
    </div>
  );
};

// Campo com label
const Field: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className = '' }) => (
  <div className={className}>
    <label className="block text-[11px] uppercase tracking-wider text-white/40 font-medium mb-1.5">{label}</label>
    {children}
  </div>
);

const inputClass = "w-full bg-white/[0.02] border border-white/[0.04] text-white rounded-lg py-2.5 px-3.5 text-[13px] placeholder-[#4b5563] focus:outline-none focus:border-[rgba(var(--color-primary-rgb),0.3)] focus:shadow-[0_0_0_3px_rgba(var(--color-primary-rgb),0.08)] transition-all";

// ─── Arrays de horas/minutos (formato 24h) ───────────────────────────
const HOURS_24 = Array.from({ length: 24 }, (_, i) => {
  const v = String(i).padStart(2, '0');
  return { value: v, label: v };
});
const MINUTES_60 = Array.from({ length: 60 }, (_, i) => {
  const v = String(i).padStart(2, '0');
  return { value: v, label: v };
});

// ─── Dropdown glass para hora/minuto ──────────────────────────────────
const TimeDropdown: React.FC<{
  value: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  onChange: (val: string) => void;
}> = ({ value, options, placeholder, onChange }) => {
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

  useEffect(() => {
    if (open && listRef.current && value) {
      const el = listRef.current.querySelector(`[data-value="${value}"]`) as HTMLElement | null;
      if (el) el.scrollIntoView({ block: 'center' });
    }
  }, [open, value]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative flex-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-center gap-1 font-mono text-[13px] transition-all duration-200 outline-none"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: open ? '1px solid rgba(var(--color-primary-rgb),0.3)' : '1px solid rgba(255,255,255,0.04)',
          borderRadius: '10px',
          padding: '8px 6px',
          color: selected ? '#fff' : 'rgba(255,255,255,0.35)',
          boxShadow: open ? '0 0 0 3px rgba(var(--color-primary-rgb),0.08)' : 'none',
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
                    background: isSelected ? 'rgba(var(--color-primary-rgb),0.15)' : 'transparent',
                    color: isSelected ? 'var(--color-primary)' : 'rgba(255,255,255,0.6)',
                    fontWeight: isSelected ? 600 : 400,
                  }}
                  onMouseEnter={(e) => { if (!isSelected) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#fff'; } }}
                  onMouseLeave={(e) => { if (!isSelected) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; } }}
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

// ─── Picker completo HH:mm ───────────────────────────────────────────
const TimePicker24h: React.FC<{
  value: string;
  onChange: (val: string) => void;
}> = ({ value, onChange }) => {
  const parts = value.split(':');
  const hh = parts[0] ?? '00';
  const mm = parts[1] ?? '00';

  return (
    <div className="flex items-center gap-1.5">
      <TimeDropdown
        value={hh}
        options={HOURS_24}
        placeholder="HH"
        onChange={(v) => onChange(`${v}:${mm}`)}
      />
      <span className="font-bold text-[14px]" style={{ color: 'rgba(255,255,255,0.2)' }}>:</span>
      <TimeDropdown
        value={mm}
        options={MINUTES_60}
        placeholder="mm"
        onChange={(v) => onChange(`${hh}:${v}`)}
      />
    </div>
  );
};

export const PersonaFormModal: React.FC<PersonaFormModalProps> = ({ initial, title, onSave, onClose, saving }) => {
  const defaults = { ...PERSONA_DEFAULTS, ...initial };
  const [form, setForm] = useState<BotPersonaFormData>({
    nome: defaults.nome,
    foto_url: defaults.foto_url || '',
    idade: defaults.idade,
    cidade: defaults.cidade || '',
    profissao: defaults.profissao || '',
    tom_voz: defaults.tom_voz,
    girias: defaults.girias,
    emojis_favoritos: defaults.emojis_favoritos,
    exemplos_frases: defaults.exemplos_frases,
    horario_inicio: defaults.horario_inicio,
    horario_fim: defaults.horario_fim,
    msgs_por_dia_min: defaults.msgs_por_dia_min,
    msgs_por_dia_max: defaults.msgs_por_dia_max,
    chance_so_reagir: defaults.chance_so_reagir,
    emojis_reacao: defaults.emojis_reacao,
    warmup_dias: defaults.warmup_dias,
    warmup_progressao: defaults.warmup_progressao,
    ausencia_habilitada: defaults.ausencia_habilitada,
    ausencia_frequencia_dias: defaults.ausencia_frequencia_dias,
    ausencia_duracao_min: defaults.ausencia_duracao_min,
    ausencia_duracao_max: defaults.ausencia_duracao_max,
    blacklist_palavras: defaults.blacklist_palavras,
    blacklist_atitudes: defaults.blacklist_atitudes,
    system_prompt_extra: defaults.system_prompt_extra || '',
    template_origem_id: defaults.template_origem_id,
    ativo: defaults.ativo ?? true,
  });

  const set = <K extends keyof BotPersonaFormData>(key: K, val: BotPersonaFormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  // Para inputs numéricos: aceita campo vazio durante digitação
  const setNum = (key: string, raw: string) =>
    setForm((prev) => ({ ...prev, [key]: raw === '' ? '' : parseInt(raw) }));
  const blurNum = (key: string, fallback: number) =>
    setForm((prev) => {
      const val = (prev as Record<string, unknown>)[key];
      if (val === '' || val === undefined || val === null) return { ...prev, [key]: fallback };
      return prev;
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) return;

    const payload: BotPersonaFormData = {
      ...form,
      foto_url: form.foto_url || null,
      cidade: form.cidade || null,
      profissao: form.profissao || null,
      system_prompt_extra: form.system_prompt_extra || null,
      idade: form.idade || null,
    };
    await onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} />
      <div
        className="relative w-full max-w-[640px] max-h-[85vh] flex flex-col rounded-2xl shadow-2xl animate-fade-in"
        style={{ background: 'rgba(20,20,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 className="text-[16px] font-bold text-white">{title}</h2>
          <button onClick={onClose} className="p-1.5 text-white/40 hover:text-white/70 hover:bg-white/[0.04] rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content — scroll */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-3" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>

          {/* ── Identidade ── */}
          <Section title="Identidade" icon={<User className="w-4 h-4" />} defaultOpen={true}>
            <Field label="Nome *">
              <input type="text" value={form.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Nome da persona" className={inputClass} required />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Idade">
                <input type="number" value={form.idade ?? ''} onChange={(e) => set('idade', e.target.value ? parseInt(e.target.value) : null)} placeholder="25" className={inputClass} min={1} max={99} />
              </Field>
              <Field label="Cidade">
                <input type="text" value={form.cidade ?? ''} onChange={(e) => set('cidade', e.target.value)} placeholder="São Paulo" className={inputClass} />
              </Field>
            </div>
            <Field label="Profissão">
              <input type="text" value={form.profissao ?? ''} onChange={(e) => set('profissao', e.target.value)} placeholder="Apostador profissional" className={inputClass} />
            </Field>
            <Field label="Foto (URL)">
              <input type="url" value={form.foto_url ?? ''} onChange={(e) => set('foto_url', e.target.value)} placeholder="https://..." className={inputClass} />
            </Field>
          </Section>

          {/* ── Personalidade ── */}
          <Section title="Personalidade" icon={<Sparkles className="w-4 h-4" />}>
            <Field label="Tom de voz">
              {(() => {
                const [open, setOpen] = useState(false);
                const ref = useRef<HTMLDivElement>(null);
                const selected = TOM_VOZ_OPTIONS.find((o) => o.value === form.tom_voz);

                useEffect(() => {
                  const handler = (e: MouseEvent) => {
                    if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
                  };
                  document.addEventListener('mousedown', handler);
                  return () => document.removeEventListener('mousedown', handler);
                }, []);

                return (
                  <div ref={ref} className="relative">
                    <button
                      type="button"
                      onClick={() => setOpen(!open)}
                      className={`${inputClass} flex items-center justify-between gap-2 text-left`}
                    >
                      <span>{selected?.label || 'Selecionar...'}</span>
                      <ChevronDown
                        className="w-3.5 h-3.5 shrink-0 transition-transform duration-200"
                        style={{
                          color: 'rgba(255,255,255,0.3)',
                          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                        }}
                      />
                    </button>
                    {open && (
                      <div
                        className="absolute z-50 mt-1.5 w-full rounded-xl py-1.5 overflow-hidden"
                        style={{
                          background: 'rgba(22,27,34,0.97)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)',
                        }}
                      >
                        {TOM_VOZ_OPTIONS.map((o) => {
                          const isSelected = o.value === form.tom_voz;
                          return (
                            <button
                              key={o.value}
                              type="button"
                              onClick={() => { set('tom_voz', o.value); setOpen(false); }}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-left transition-colors duration-100"
                              style={{
                                color: isSelected ? 'var(--color-primary-light)' : 'rgba(255,255,255,0.7)',
                                background: isSelected ? 'rgba(var(--color-primary-rgb),0.08)' : 'transparent',
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                                  e.currentTarget.style.color = '#fff';
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = isSelected ? 'rgba(var(--color-primary-rgb),0.08)' : 'transparent';
                                e.currentTarget.style.color = isSelected ? 'var(--color-primary-light)' : 'rgba(255,255,255,0.7)';
                              }}
                            >
                              <span className="flex-1">{o.label}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-primary-light)' }} />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </Field>
            <Field label="Gírias">
              <TagInput tags={form.girias} onChange={(v) => set('girias', v)} placeholder="Adicionar gíria..." />
            </Field>
            <Field label="Emojis favoritos">
              <TagInput tags={form.emojis_favoritos} onChange={(v) => set('emojis_favoritos', v)} placeholder="Adicionar emoji..." />
            </Field>
            <Field label="Exemplos de frases (1 por linha)">
              <textarea
                value={form.exemplos_frases.join('\n')}
                onChange={(e) => set('exemplos_frases', e.target.value.split('\n').filter(Boolean))}
                placeholder="Bora que hoje tem green certo 🔥&#10;Esse jogo tá no papo, confia"
                className={`${inputClass} resize-none`}
                rows={3}
              />
            </Field>
            <Field label="Prompt extra (instruções adicionais para LLM)">
              <textarea
                value={form.system_prompt_extra ?? ''}
                onChange={(e) => set('system_prompt_extra', e.target.value)}
                placeholder="Instruções adicionais..."
                className={`${inputClass} resize-none`}
                rows={2}
              />
            </Field>
          </Section>

          {/* ── Comportamento ── */}
          <Section title="Comportamento" icon={<Activity className="w-4 h-4" />}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Horário início">
                <TimePicker24h value={form.horario_inicio} onChange={(v) => set('horario_inicio', v)} />
              </Field>
              <Field label="Horário fim">
                <TimePicker24h value={form.horario_fim} onChange={(v) => set('horario_fim', v)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Msgs/dia mínimo">
                <input type="number" value={form.msgs_por_dia_min} onChange={(e) => setNum('msgs_por_dia_min', e.target.value)} onBlur={() => blurNum('msgs_por_dia_min', 0)} className={inputClass} min={0} />
              </Field>
              <Field label="Msgs/dia máximo">
                <input type="number" value={form.msgs_por_dia_max} onChange={(e) => setNum('msgs_por_dia_max', e.target.value)} onBlur={() => blurNum('msgs_por_dia_max', 0)} className={inputClass} min={0} />
              </Field>
            </div>
            <Field label={`Chance de só reagir com emoji: ${form.chance_so_reagir}%`}>
              <input
                type="range"
                min={0}
                max={100}
                value={form.chance_so_reagir}
                onChange={(e) => set('chance_so_reagir', parseInt(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${form.chance_so_reagir}%, rgba(255,255,255,0.1) ${form.chance_so_reagir}%, rgba(255,255,255,0.1) 100%)`,
                  accentColor: 'var(--color-primary)',
                }}
              />
            </Field>
            <Field label="Emojis de reação">
              <TagInput tags={form.emojis_reacao} onChange={(v) => set('emojis_reacao', v)} placeholder="Adicionar emoji..." />
            </Field>
          </Section>

          {/* ── Warmup ── */}
          <Section title="Warmup" icon={<Zap className="w-4 h-4" />}>
            <Field label="Dias de warmup">
              <input type="number" value={form.warmup_dias} onChange={(e) => setNum('warmup_dias', e.target.value)} onBlur={() => blurNum('warmup_dias', 7)} className={inputClass} min={0} />
            </Field>
            <div className="grid grid-cols-4 gap-2">
              {['semana1', 'semana2', 'semana3', 'semana4'].map((key, i) => (
                <Field key={key} label={`Sem ${i + 1}`}>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    max={1}
                    value={form.warmup_progressao[key] ?? 0}
                    onChange={(e) => set('warmup_progressao', { ...form.warmup_progressao, [key]: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                    onBlur={(e) => { if (e.target.value === '') set('warmup_progressao', { ...form.warmup_progressao, [key]: 0 }); }}
                    className={inputClass}
                  />
                </Field>
              ))}
            </div>
          </Section>

          {/* ── Ausência ── */}
          <Section title="Ausência" icon={<EyeOff className="w-4 h-4" />}>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-white/60">Ausência habilitada</span>
              <button
                type="button"
                role="switch"
                aria-checked={form.ausencia_habilitada}
                onClick={() => set('ausencia_habilitada', !form.ausencia_habilitada)}
                className="relative inline-flex h-[22px] w-[42px] shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:outline-none"
                style={{
                  background: form.ausencia_habilitada
                    ? 'rgba(var(--color-primary-rgb),0.5)'
                    : 'rgba(255,255,255,0.08)',
                  boxShadow: form.ausencia_habilitada
                    ? '0 0 8px rgba(var(--color-primary-rgb),0.15), inset 0 1px 2px rgba(0,0,0,0.1)'
                    : 'inset 0 1px 2px rgba(0,0,0,0.2)',
                }}
              >
                <span
                  className="pointer-events-none block h-[16px] w-[16px] rounded-full transition-all duration-200"
                  style={{
                    background: form.ausencia_habilitada ? '#fff' : 'rgba(255,255,255,0.35)',
                    transform: form.ausencia_habilitada ? 'translateX(23px)' : 'translateX(3px)',
                    boxShadow: form.ausencia_habilitada
                      ? '0 1px 3px rgba(0,0,0,0.3), 0 0 4px rgba(var(--color-primary-rgb),0.2)'
                      : '0 1px 2px rgba(0,0,0,0.3)',
                  }}
                />
              </button>
            </div>
            {form.ausencia_habilitada && (
              <div className="grid grid-cols-3 gap-3">
                <Field label="A cada N dias">
                  <input type="number" value={form.ausencia_frequencia_dias} onChange={(e) => setNum('ausencia_frequencia_dias', e.target.value)} onBlur={() => blurNum('ausencia_frequencia_dias', 15)} className={inputClass} min={1} />
                </Field>
                <Field label="Duração mín (dias)">
                  <input type="number" value={form.ausencia_duracao_min} onChange={(e) => setNum('ausencia_duracao_min', e.target.value)} onBlur={() => blurNum('ausencia_duracao_min', 1)} className={inputClass} min={1} />
                </Field>
                <Field label="Duração máx (dias)">
                  <input type="number" value={form.ausencia_duracao_max} onChange={(e) => setNum('ausencia_duracao_max', e.target.value)} onBlur={() => blurNum('ausencia_duracao_max', 3)} className={inputClass} min={1} />
                </Field>
              </div>
            )}
          </Section>

          {/* ── Restrições ── */}
          <Section title="Restrições" icon={<ShieldAlert className="w-4 h-4" />}>
            <Field label="Palavras proibidas">
              <TagInput tags={form.blacklist_palavras} onChange={(v) => set('blacklist_palavras', v)} placeholder="Adicionar palavra..." />
            </Field>
            <Field label="Atitudes proibidas">
              <TagInput tags={form.blacklist_atitudes} onChange={(v) => set('blacklist_atitudes', v)} placeholder="Ex: nunca xinga outros membros" />
            </Field>
          </Section>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-[13px] font-medium rounded-xl transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || !form.nome.trim()}
            onClick={handleSubmit}
            className="px-5 py-2.5 text-[13px] font-semibold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'var(--color-primary)', color: '#fff', boxShadow: '0 2px 12px rgba(var(--color-primary-rgb),0.2)' }}
            onMouseEnter={(e) => { if (!saving) e.currentTarget.style.boxShadow = '0 4px 20px rgba(var(--color-primary-rgb),0.3)' }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(var(--color-primary-rgb),0.2)' }}
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
};
