import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
  Users,
  UserCheck,
  UserMinus,
  TrendingUp,
  Search,
  ChevronLeft,
  ChevronRight,
  Calendar,
  X,
  ChevronDown,
  Filter,
  CircleDot,
  FileDown,
  Loader2,
  Shield,
  Plus,
  Trash2,
  Clock,
  AlertTriangle,
  Settings,
  ChevronUp,
  MessageSquareText,
  Ban,
  Wifi,
  WifiOff,
  Smartphone,
  ShieldOff,
  ShieldCheck,
  EyeOff,
  Check,
  Lock,
  Unlock,
  Bot,
  UserCircle,
  BookOpen,
  BarChart3,
  ShieldAlert,
  Phone,
} from 'lucide-react';
import { format, isSameDay, getDaysInMonth, getMonth, startOfDay, endOfDay } from 'date-fns';
import { supabase } from '../lib/supabase';
import { WEBHOOKS, N8N_GEND, UAZAPI_BASE_URL, fetchWithTimeout } from '../config/webhooks';
import { useToast } from '../hooks/useToast';
import { useModeracao, EMPTY_LOG_FILTERS } from '../hooks/useModeracao';
import type { ModeracaoGrupo, RegrasAtivas, InstanciaColeta, LogFilters } from '../hooks/useModeracao';
import { Toast } from '../components/Toast';
import { InstanciaCard } from '../components/numeros/InstanciaCard';
import { NovaInstanciaModal } from '../components/numeros/NovaInstanciaModal';
import { ConfirmDeleteNumeroModal } from '../components/numeros/ConfirmDeleteNumeroModal';
import { NumeroFormModal } from '../components/numeros/NumeroFormModal';
import { useWhatsappRotacao } from '../hooks/useWhatsappRotacao';
import type { WhatsappRotacao } from '../hooks/useWhatsappRotacao';
import { cn } from '../utils/cn';
import { useAuthStore } from '../stores/authStore';
import { useSectionGate } from '../hooks/useSectionGate';
import type { SectionState } from '../types';
import { PersonasTab } from '../components/bots/PersonasTab';
import { GruposAtivosTab } from '../components/bots/GruposAtivosTab';
import { ConhecimentoTab } from '../components/bots/ConhecimentoTab';
import { MetricasTab } from '../components/bots/MetricasTab';
import { BotInstanciaTab } from '../components/bots/BotInstanciaTab';

// ─── Types ───

interface Lead {
  id: number;
  nome: string | null;
  telefone: string;
  origem: string | null;
  observacoes: string | null;
  id_grupo: string | null;
  nome_grupo: string | null;
  entrou_no_grupo: string;
  saiu_grupo: string | null;
}

type MainTab = 'membros' | 'moderacao' | 'configuracao' | 'bots';
type ModeracaoSubTab = 'grupos' | 'log' | 'instancia' | 'fechar-abrir';
type BotSubTab = 'personas' | 'grupos-ativos' | 'conhecimento' | 'metricas' | 'instancia';

// ─── UAZAPI Group Types ───
interface UazapiGroup {
  JID: string;
  Name: string;
  IsAnnounce: boolean;
  OwnerIsAdmin: boolean;
  IsDefaultSubGroup?: boolean;
}

// ─── Helpers ───

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTelefone(raw: string): string {
  const d = raw.replace(/\D/g, '');
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)} ${d.slice(2)}`;
  if (d.length <= 9) return `${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4)}`;
  return `${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 9)}-${d.slice(9)}`;
}

function capitalize(str: string | null): string {
  if (!str) return '—';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const VIOLACAO_MAP: Record<string, { label: string; bg: string; text: string }> = {
  links_spam: { label: 'Links/Spam', bg: 'bg-red-500/10', text: 'text-red-400' },
  palavroes: { label: 'Palavrões', bg: 'bg-orange-500/10', text: 'text-orange-400' },
  adulto: { label: 'Adulto', bg: 'bg-pink-500/10', text: 'text-pink-400' },
  propaganda: { label: 'Propaganda', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  captacao_leads: { label: 'Captação', bg: 'bg-purple-500/10', text: 'text-purple-400' },
  religiao: { label: 'Religião', bg: 'bg-teal-500/10', text: 'text-teal-400' },
  politica: { label: 'Política', bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
};

function formatarAcao(acao: string): { label: string; bg: string; text: string } {
  if (acao === 'expulsao') return { label: 'Expulsão', bg: 'bg-red-500/10', text: 'text-red-400' };
  if (acao.startsWith('aviso_')) return { label: `Aviso ${acao.split('_')[1]}`, bg: 'bg-amber-500/10', text: 'text-amber-400' };
  return { label: acao, bg: 'bg-[#2a2a2a]', text: 'text-white/50' };
}

function formatarDataBR(isoString: string): string {
  return new Date(isoString).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Select styling helper
const selectStyle = {
  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
  backgroundPosition: 'right 10px center',
  backgroundRepeat: 'no-repeat',
  backgroundSize: '16px',
  paddingRight: '32px',
};

// ─── Custom Dropdown (portal-based) ───
const CustomSelect: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}> = ({ value, onChange, options, placeholder = 'Selecionar' }) => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node)) return;
      if (dropRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const dropWidth = Math.max(rect.width, 200);
      const left = rect.left + rect.width / 2 - dropWidth / 2;
      const clampedLeft = Math.max(8, Math.min(left, window.innerWidth - dropWidth - 8));
      setPos({ top: rect.bottom + 8, left: clampedLeft, width: dropWidth });
    }
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen(!open)}
        className="relative flex items-center gap-2 text-[13px] font-medium transition-all duration-150"
        style={{
          background: open ? 'rgba(var(--color-primary-rgb),0.12)' : 'rgba(22, 27, 34, 0.97)',
          border: open ? '1px solid rgba(var(--color-primary-rgb),0.25)' : '1px solid rgba(255,255,255,0.1)',
          color: open ? 'var(--color-primary-light)' : 'rgba(255,255,255,0.7)',
          borderRadius: '10px',
          padding: '8px 32px 8px 12px',
        }}
      >
        {selected?.label || placeholder}
        <ChevronDown className="w-3.5 h-3.5 absolute right-2.5" style={{ color: 'var(--color-primary-light)' }} />
      </button>
      {open && ReactDOM.createPortal(
        <div
          ref={dropRef}
          className="fixed overflow-y-auto animate-fade-in"
          style={{
            top: pos.top,
            left: pos.left,
            width: pos.width,
            maxHeight: '280px',
            zIndex: 9999,
            background: 'rgba(22, 27, 34, 0.97)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '14px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.06)',
          }}
        >
          <div className="p-1.5">
            {options.map(o => {
              const active = o.value === value;
              return (
                <button
                  key={o.value}
                  onClick={() => { onChange(o.value); setOpen(false); }}
                  className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-[12px] transition-all duration-150 text-left"
                  style={{
                    background: active ? 'rgba(var(--color-primary-rgb),0.1)' : 'transparent',
                    color: active ? 'var(--color-primary-light)' : 'rgba(255,255,255,0.5)',
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = active ? 'rgba(var(--color-primary-rgb),0.1)' : 'transparent'; e.currentTarget.style.color = active ? 'var(--color-primary-light)' : 'rgba(255,255,255,0.5)'; }}
                >
                  <span className="truncate">{o.label}</span>
                  {active && <Check size={12} className="text-primary-light flex-shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

// ─── TimePicker (portal-based, 24h) ───
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

const TimePicker: React.FC<{
  value: string | null;
  onChange: (v: string | null) => void;
  disabled?: boolean;
  variant?: 'fechar' | 'abrir';
}> = ({ value, onChange, disabled = false, variant = 'fechar' }) => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const hoursRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, openUp: false });

  const currentHour = value ? value.split(':')[0] : null;
  const currentMinute = value ? value.split(':')[1] : null;
  // Arredonda para o multiplo de 5 mais proximo para highlight
  const nearestMinute = currentMinute ? String(Math.round(parseInt(currentMinute) / 5) * 5).padStart(2, '0') : null;

  const isFechar = variant === 'fechar';
  const accent = isFechar ? '#f87171' : '#34d399';
  const accentRgb = isFechar ? '239,68,68' : '52,211,153';

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node)) return;
      if (dropRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const dropH = 280;
      const spaceBelow = window.innerHeight - rect.bottom - 12;
      const openUp = spaceBelow < dropH && rect.top > dropH;
      setPos({
        top: openUp ? rect.top - dropH - 8 : rect.bottom + 8,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 200)),
        openUp,
      });
    }
  }, [open]);

  // Scroll para a hora selecionada quando abre
  useEffect(() => {
    if (open && hoursRef.current && currentHour) {
      const el = hoursRef.current.querySelector(`[data-hour="${currentHour}"]`) as HTMLElement;
      if (el) el.scrollIntoView({ block: 'center' });
    }
  }, [open, currentHour]);

  const selectHour = (h: string) => {
    const m = currentMinute || '00';
    onChange(`${h}:${m}`);
  };

  const selectMinute = (m: string) => {
    const h = currentHour || '00';
    onChange(`${h}:${m}`);
    setOpen(false);
  };

  const clear = () => {
    onChange(null);
    setOpen(false);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className="flex items-center justify-center gap-1.5 font-mono text-[13px] font-medium rounded-lg px-3 py-1.5 transition-all duration-200 disabled:opacity-25 disabled:cursor-not-allowed"
        style={{
          background: open
            ? `rgba(${accentRgb},0.15)`
            : `rgba(${accentRgb},0.06)`,
          border: open
            ? `1px solid rgba(${accentRgb},0.4)`
            : value
              ? `1px solid rgba(${accentRgb},0.25)`
              : `1px solid rgba(${accentRgb},0.12)`,
          color: value ? accent : `rgba(${accentRgb},0.4)`,
          minWidth: '90px',
        }}
      >
        <Clock className="w-3 h-3" style={{ opacity: value ? 0.7 : 0.4 }} />
        {value || '--:--'}
      </button>
      {open && ReactDOM.createPortal(
        <div
          ref={dropRef}
          className="fixed animate-fade-in"
          style={{
            top: pos.top,
            left: pos.left,
            zIndex: 9999,
            width: '196px',
          }}
        >
          <div
            className="overflow-hidden"
            style={{
              background: 'rgba(22, 27, 34, 0.98)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '14px',
              boxShadow: `0 12px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.04), 0 0 20px rgba(${accentRgb}, 0.06)`,
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-3 py-2"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: accent }}>
                {isFechar ? 'Fechar às' : 'Abrir às'}
              </span>
              {value && (
                <button
                  onClick={clear}
                  className="text-[10px] px-1.5 py-0.5 rounded transition-all duration-150"
                  style={{ color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.04)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                >
                  Limpar
                </button>
              )}
            </div>

            {/* Valor atual */}
            <div className="flex items-center justify-center py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="font-mono text-[22px] font-bold tracking-widest" style={{ color: value ? accent : 'rgba(255,255,255,0.15)' }}>
                {value || '--:--'}
              </span>
            </div>

            {/* Colunas hora / minuto */}
            <div className="flex" style={{ height: '180px' }}>
              {/* Horas */}
              <div
                ref={hoursRef}
                className="flex-1 overflow-y-auto py-1 px-1"
                style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="text-center text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  Hora
                </div>
                {HOURS.map(h => {
                  const active = h === currentHour;
                  return (
                    <button
                      key={h}
                      data-hour={h}
                      onClick={() => selectHour(h)}
                      className="w-full text-center py-1 rounded-md text-[13px] font-mono transition-all duration-100"
                      style={{
                        background: active ? `rgba(${accentRgb},0.2)` : 'transparent',
                        color: active ? accent : 'rgba(255,255,255,0.45)',
                        fontWeight: active ? 600 : 400,
                      }}
                      onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff'; } }}
                      onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; } }}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>

              {/* Minutos */}
              <div className="flex-1 overflow-y-auto py-1 px-1">
                <div className="text-center text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  Min
                </div>
                {MINUTES.map(m => {
                  const active = m === nearestMinute;
                  return (
                    <button
                      key={m}
                      onClick={() => selectMinute(m)}
                      className="w-full text-center py-1 rounded-md text-[13px] font-mono transition-all duration-100"
                      style={{
                        background: active ? `rgba(${accentRgb},0.2)` : 'transparent',
                        color: active ? accent : 'rgba(255,255,255,0.45)',
                        fontWeight: active ? 600 : 400,
                      }}
                      onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff'; } }}
                      onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; } }}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

// ─── Toggle Component ───

const Toggle: React.FC<{
  checked: boolean;
  onChange: (val: boolean) => void;
  color?: string;
}> = ({ checked, onChange, color }) => (
  <button
    type="button"
    onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
    className="relative inline-flex h-[24px] w-[44px] rounded-full transition-all duration-300 shrink-0"
    style={{
      background: checked
        ? (color === 'bg-primary' ? 'var(--color-primary-bg)' : 'rgba(var(--color-primary-rgb),0.3)')
        : 'rgba(255,255,255,0.1)',
      border: checked
        ? (color === 'bg-primary' ? '1px solid var(--color-primary-bg)' : '1px solid rgba(var(--color-primary-rgb),0.4)')
        : '1px solid rgba(255,255,255,0.15)',
    }}
  >
    <span
      className="inline-block h-[18px] w-[18px] rounded-full bg-white transition-transform duration-300 mt-[2px]"
      style={{
        transform: checked ? 'translateX(22px)' : 'translateX(2px)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      }}
    />
  </button>
);

// ─── Tag Input Component ───

const TagInput: React.FC<{
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
}> = ({ tags, onChange, placeholder }) => {
  const [input, setInput] = useState('');

  const addTag = () => {
    const val = input.trim();
    if (val && !tags.includes(val)) {
      onChange([...tags, val]);
    }
    setInput('');
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {tags.map((tag, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.04] text-white text-xs px-2.5 py-1.5 rounded-lg"
        >
          {tag}
          <button
            onClick={() => onChange(tags.filter((_, idx) => idx !== i))}
            className="text-white/40 hover:text-red-400 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder={placeholder}
          className="bg-transparent border-none text-white text-xs placeholder-[#4b5563] focus:outline-none w-[140px]"
        />
        {input.trim() && (
          <button
            onClick={addTag}
            className="text-primary text-xs hover:underline"
          >
            Adicionar
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Variable Buttons Component ───

const VariableButtons: React.FC<{
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (val: string) => void;
}> = ({ textareaRef, value, onChange }) => {
  const vars = ['{{nome}}', '{{tipo}}', '{{strike}}', '{{limite}}', '{{telefone}}', '{{grupo}}'];

  const insertVar = (v: string) => {
    const ta = textareaRef.current;
    if (ta) {
      const start = ta.selectionStart || value.length;
      const end = ta.selectionEnd || value.length;
      const newVal = value.slice(0, start) + v + value.slice(end);
      onChange(newVal);
      setTimeout(() => {
        ta.focus();
        ta.setSelectionRange(start + v.length, start + v.length);
      }, 0);
    } else {
      onChange(value + v);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {vars.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => insertVar(v)}
          className="text-[12px] px-3 py-1 rounded-lg font-mono transition-all duration-200"
          style={{ background: 'rgba(var(--color-primary-rgb),0.12)', color: 'var(--color-primary-light)', border: '1px solid rgba(var(--color-primary-rgb),0.25)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.2)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.12)' }}
        >
          {v}
        </button>
      ))}
    </div>
  );
};

// ─── DayPicker (unchanged) ───

const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const DayPicker: React.FC<{
  selectedDate: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
  label: string;
}> = ({ selectedDate, onSelect, onClose, label }) => {
  const [viewMonth, setViewMonth] = useState(getMonth(selectedDate));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const now = new Date();
  const currentYear = now.getFullYear();
  const daysInMonth = getDaysInMonth(new Date(currentYear, viewMonth));
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handleSelect = (day: number) => {
    const d = new Date(currentYear, viewMonth, day);
    if (d > now) return;
    onSelect(d);
    onClose();
  };

  return (
    <div
      ref={ref}
      className="absolute top-full mt-2 z-[100] animate-fade-in w-[260px] overflow-hidden"
      style={{
        background: 'rgba(22, 27, 34, 0.97)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '14px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.06)',
      }}
    >
      <div style={{ padding: '16px 16px 4px' }}>
        <span className="text-[11px] uppercase font-medium" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px' }}>{label}</span>
      </div>
      <div className="flex items-center justify-between" style={{ padding: '8px 16px' }}>
        <button
          onClick={() => setViewMonth(m => Math.max(0, m - 1))}
          className="transition-all duration-150"
          style={{ color: 'rgba(255,255,255,0.4)', background: 'transparent', border: 'none', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="text-[14px] font-semibold text-white">{MONTHS_SHORT[viewMonth]}</span>
        <button
          onClick={() => setViewMonth(m => Math.min(11, m + 1))}
          className="transition-all duration-150"
          style={{ color: viewMonth >= getMonth(now) ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.4)', background: 'transparent', border: 'none', padding: '4px 8px', borderRadius: '6px', cursor: viewMonth >= getMonth(now) ? 'default' : 'pointer' }}
          onMouseEnter={(e) => { if (viewMonth < getMonth(now)) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; } }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = viewMonth >= getMonth(now) ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.4)'; }}
          disabled={viewMonth >= getMonth(now)}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
      <div style={{ padding: '0 16px 16px' }}>
        <div className="grid grid-cols-7" style={{ gap: '2px' }}>
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
            <div key={i} className="text-[11px] text-center font-medium" style={{ color: 'rgba(255,255,255,0.35)', padding: '6px 0' }}>{d}</div>
          ))}
          {Array.from({ length: new Date(currentYear, viewMonth, 1).getDay() }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}
          {days.map(day => {
            const date = new Date(currentYear, viewMonth, day);
            const isFuture = date > now;
            const isSelected = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, now);
            return (
              <button
                key={day}
                onClick={() => handleSelect(day)}
                disabled={isFuture}
                className="flex items-center justify-center transition-all duration-150"
                style={{
                  width: '32px', height: '32px', borderRadius: '8px', fontSize: '13px',
                  background: isSelected ? 'var(--color-primary)' : 'transparent',
                  color: isFuture ? 'rgba(255,255,255,0.15)' : isSelected ? '#fff' : isToday ? 'var(--color-primary-light)' : 'rgba(255,255,255,0.7)',
                  fontWeight: isSelected || isToday ? 600 : 400,
                  cursor: isFuture ? 'not-allowed' : 'pointer',
                  border: isToday && !isSelected ? '1px solid rgba(var(--color-primary-rgb),0.4)' : '1px solid transparent',
                }}
                onMouseEnter={(e) => { if (!isFuture && !isSelected) { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; } }}
                onMouseLeave={(e) => { if (!isFuture && !isSelected) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = isToday ? 'var(--color-primary-light)' : 'rgba(255,255,255,0.7)'; } }}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── FilterDropdown (unchanged) ───

const FilterDropdown: React.FC<{
  label: string;
  value: string;
  allLabel: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  icon: React.ReactNode;
}> = ({ label, value, allLabel, options, onChange, icon }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedLabel = value === 'all' ? allLabel : options.find(o => o.value === value)?.label || value;

  return (
    <div ref={ref} className="relative flex items-center gap-1.5 text-[11px] font-mono">
      {icon}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "px-2 py-1 rounded-lg transition-all duration-200 flex items-center gap-1",
          open
            ? "bg-primary/10 text-primary border border-primary/20"
            : value !== 'all'
            ? "text-txt-secondary hover:text-txt hover:bg-white/[0.03] border border-transparent"
            : "text-txt-dim hover:text-txt-secondary hover:bg-white/[0.03] border border-transparent"
        )}
      >
        <span className="tabular-nums">{selectedLabel}</span>
        <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", open && "rotate-180")} />
      </button>
      {value !== 'all' && (
        <button
          onClick={() => onChange('all')}
          className="p-0.5 text-txt-dim hover:text-white transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
      {open && (
        <div
          className="absolute top-full mt-2 left-0 z-[100] animate-fade-in overflow-y-auto"
          style={{
            background: 'rgba(22, 27, 34, 0.97)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '14px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.06)',
            minWidth: '180px',
            maxHeight: '280px',
          }}
        >
          <div className="px-3 pt-3 pb-1">
            <span className="text-[11px] uppercase font-medium" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px' }}>{label}</span>
          </div>
          <div className="p-1.5">
            {[{ value: 'all', label: allLabel }, ...options].map((opt) => {
              const active = value === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-[12px] transition-all duration-150 text-left"
                  style={{
                    background: active ? 'rgba(var(--color-primary-rgb),0.1)' : 'transparent',
                    color: active ? 'var(--color-primary-light)' : 'rgba(255,255,255,0.5)',
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = active ? 'rgba(var(--color-primary-rgb),0.1)' : 'transparent'; e.currentTarget.style.color = active ? 'var(--color-primary-light)' : 'rgba(255,255,255,0.5)'; }}
                >
                  <span>{opt.label}</span>
                  {active && <Check size={12} className="text-primary-light flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── GrupoModeracaoCard ───

const GrupoModeracaoCard: React.FC<{
  grupo: ModeracaoGrupo;
  onSave: (id: string, campos: Partial<ModeracaoGrupo>) => Promise<string | null>;
  onDelete: (id: string) => Promise<string | null>;
  showToast: (type: 'success' | 'error', msg: string) => void;
}> = ({ grupo, onSave, onDelete, showToast }) => {
  const [localGrupo, setLocalGrupo] = useState(grupo);
  const [collapsed, setCollapsed] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const avisoRef = useRef<HTMLTextAreaElement>(null);
  const expulsaoRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalGrupo(grupo);
  }, [grupo]);

  const updateRegra = (key: keyof RegrasAtivas, val: boolean) => {
    setLocalGrupo(prev => ({
      ...prev,
      regras_ativas: { ...prev.regras_ativas, [key]: val },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const err = await onSave(localGrupo.id, {
      regras_ativas: localGrupo.regras_ativas,
      links_permitidos: localGrupo.links_permitidos,
      casas_permitidas: localGrupo.casas_permitidas,
      perfis_permitidos: localGrupo.perfis_permitidos,
      contexto_extra: localGrupo.contexto_extra,
      mensagem_aviso: localGrupo.mensagem_aviso,
      mensagem_expulsao: localGrupo.mensagem_expulsao,
      strikes_para_expulsao: localGrupo.strikes_para_expulsao,
      enviar_aviso: localGrupo.enviar_aviso,
      bloquear_internacionais: localGrupo.bloquear_internacionais,
      ativo: localGrupo.ativo,
    });
    setSaving(false);
    if (err) {
      showToast('error', err);
    } else {
      showToast('success', 'Grupo atualizado!');
    }
  };

  const handleDelete = async () => {
    const err = await onDelete(localGrupo.id);
    if (err) {
      showToast('error', err);
    } else {
      showToast('success', 'Grupo removido!');
    }
    setConfirmDelete(false);
  };

  const regras: { key: keyof RegrasAtivas; label: string }[] = [
    { key: 'links_spam', label: 'Links/Spam' },
    { key: 'palavroes', label: 'Palavrões' },
    { key: 'adulto', label: 'Adulto' },
    { key: 'propaganda', label: 'Propaganda' },
    { key: 'captacao_leads', label: 'Captação de Leads' },
    { key: 'religiao', label: 'Religião' },
    { key: 'politica', label: 'Política' },
  ];

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '14px', overflow: 'hidden', marginBottom: '8px' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer select-none transition-colors duration-200"
        style={{ borderBottom: collapsed ? 'none' : '1px solid rgba(255,255,255,0.04)' }}
        onClick={() => setCollapsed(prev => !prev)}
      >
        <div className="flex items-center gap-3.5">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(var(--color-primary-rgb),0.12)' }}
          >
            <Users className="w-4 h-4" style={{ color: 'var(--color-primary-light)' }} />
          </div>
          <div>
            <p className="text-white font-semibold text-[14px]">{localGrupo.grupo_nome}</p>
            <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Instância: {localGrupo.instancia}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.5px] px-2.5 py-0.5 rounded-md"
            style={localGrupo.ativo
              ? { background: 'var(--color-primary-bg)', color: 'var(--color-primary-light)', border: '1px solid var(--color-primary-bg)' }
              : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }
            }
          >
            {localGrupo.ativo ? 'Ativo' : 'Inativo'}
          </span>
          <span onClick={(e) => e.stopPropagation()}>
            <Toggle
              checked={localGrupo.ativo}
              onChange={(val) => { setLocalGrupo(prev => ({ ...prev, ativo: val })); onSave(grupo.id, { ativo: val }); }}
              color="bg-primary"
            />
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
            className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Excluir grupo"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <ChevronDown className={cn("w-4 h-4 text-white/40 transition-transform duration-200", !collapsed && "rotate-180")} />
        </div>
      </div>

      {!collapsed && <div className="p-5 space-y-5">
        {/* Regras */}
        <div>
          <p className="text-white/40 text-[10px] uppercase tracking-[1.5px] font-semibold mb-2.5">Regras de Moderação</p>
          <div className="grid grid-cols-2 gap-2">
            {regras.map((r) => (
              <div key={r.key} className="flex items-center justify-between rounded-[10px] px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span className="text-white text-[13px] font-medium">{r.label}</span>
                <Toggle
                  checked={localGrupo.regras_ativas[r.key]}
                  onChange={(val) => updateRegra(r.key, val)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Mensagens */}
        <div>
          <p className="text-white/40 text-[10px] uppercase tracking-[1.5px] font-semibold mb-2.5">Mensagens</p>

          {/* Toggle enviar aviso */}
          <div className="flex items-center justify-between rounded-[10px] px-4 py-3 mb-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <span className="text-white text-[13px] font-medium">Enviar aviso após remoção de mensagem</span>
            <Toggle
              checked={localGrupo.enviar_aviso}
              onChange={(val) => setLocalGrupo(prev => ({ ...prev, enviar_aviso: val }))}
            />
          </div>

          {/* Toggle bloquear internacionais */}
          <div className="rounded-[10px] px-4 py-3 mb-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center justify-between">
              <span className="text-white text-[13px] font-medium">Bloquear números internacionais</span>
              <Toggle
                checked={localGrupo.bloquear_internacionais}
                onChange={(val) => setLocalGrupo(prev => ({ ...prev, bloquear_internacionais: val }))}
              />
            </div>
            <p className="text-[11px] text-white/25 mt-1.5 leading-relaxed">Remove automaticamente membros com números que não começam com 55 (Brasil) ao entrar no grupo</p>
          </div>

          <div className={cn("space-y-3 transition-all duration-200", !localGrupo.enviar_aviso && "opacity-40 pointer-events-none select-none")}>
            <div>
              <label className="text-white/50 text-[11px] mb-1 block">Mensagem de Aviso</label>
              <textarea
                ref={avisoRef}
                value={localGrupo.mensagem_aviso}
                onChange={(e) => setLocalGrupo(prev => ({ ...prev, mensagem_aviso: e.target.value }))}
                rows={3}
                disabled={!localGrupo.enviar_aviso}
                className="w-full bg-white/[0.02] border border-white/[0.04] text-white rounded-lg py-2.5 px-3.5 text-[13px] placeholder-[#4b5563] focus:outline-none focus:border-primary/40 transition-colors resize-none disabled:cursor-not-allowed"
              />
              <VariableButtons
                textareaRef={avisoRef}
                value={localGrupo.mensagem_aviso}
                onChange={(val) => setLocalGrupo(prev => ({ ...prev, mensagem_aviso: val }))}
              />
            </div>
            <div>
              <label className="text-white/50 text-[11px] mb-1 block">Mensagem de Expulsão</label>
              <textarea
                ref={expulsaoRef}
                value={localGrupo.mensagem_expulsao}
                onChange={(e) => setLocalGrupo(prev => ({ ...prev, mensagem_expulsao: e.target.value }))}
                rows={3}
                disabled={!localGrupo.enviar_aviso}
                className="w-full bg-white/[0.02] border border-white/[0.04] text-white rounded-lg py-2.5 px-3.5 text-[13px] placeholder-[#4b5563] focus:outline-none focus:border-primary/40 transition-colors resize-none disabled:cursor-not-allowed"
              />
              <VariableButtons
                textareaRef={expulsaoRef}
                value={localGrupo.mensagem_expulsao}
                onChange={(val) => setLocalGrupo(prev => ({ ...prev, mensagem_expulsao: val }))}
              />
            </div>
          </div>
        </div>

        {/* Strikes */}
        <div>
          <p className="text-white/40 text-[10px] uppercase tracking-[1.5px] font-semibold mb-2.5">Strikes</p>
          <div className="flex items-center gap-3">
            <label className="text-white/50 text-[12px]">Strikes para expulsão</label>
            <input
              type="text"
              inputMode="numeric"
              value={localGrupo.strikes_para_expulsao}
              onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); setLocalGrupo(prev => ({ ...prev, strikes_para_expulsao: v === '' ? 0 : parseInt(v) })); }}
              min={1}
              max={99}
              className="w-16 bg-white/[0.02] border border-white/[0.04] text-white rounded-lg py-1.5 px-2.5 text-[13px] text-center focus:outline-none focus:border-primary/40 transition-colors"
            />
          </div>
          <p className="text-white/20 text-[11px] mt-1">Número de violações antes da expulsão</p>
        </div>

        {/* Whitelists */}
        <div>
          <p className="text-white/40 text-[10px] uppercase tracking-[1.5px] font-semibold mb-2.5">Whitelists</p>
          <div className="space-y-3">
            <div>
              <label className="text-white/50 text-[11px] mb-1.5 block">Casas permitidas</label>
              <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg px-3 py-2.5 min-h-[38px]">
                <TagInput
                  tags={localGrupo.casas_permitidas}
                  onChange={(tags) => setLocalGrupo(prev => ({ ...prev, casas_permitidas: tags }))}
                  placeholder="Adicionar casa..."
                />
              </div>
            </div>
            <div>
              <label className="text-white/50 text-[11px] mb-1.5 block">Perfis permitidos</label>
              <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg px-3 py-2.5 min-h-[38px]">
                <TagInput
                  tags={localGrupo.perfis_permitidos}
                  onChange={(tags) => setLocalGrupo(prev => ({ ...prev, perfis_permitidos: tags }))}
                  placeholder="@perfil..."
                />
              </div>
            </div>
            <div>
              <label className="text-white/50 text-[11px] mb-1.5 block">Links permitidos</label>
              <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg px-3 py-2.5 min-h-[38px]">
                <TagInput
                  tags={localGrupo.links_permitidos}
                  onChange={(tags) => setLocalGrupo(prev => ({ ...prev, links_permitidos: tags }))}
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Contexto Extra */}
        <div>
          <p className="text-white/40 text-[10px] uppercase tracking-[1.5px] font-semibold mb-2.5">Contexto Extra</p>
          <textarea
            value={localGrupo.contexto_extra || ''}
            onChange={(e) => setLocalGrupo(prev => ({ ...prev, contexto_extra: e.target.value }))}
            rows={3}
            placeholder="Contexto adicional sobre o grupo..."
            className="w-full bg-white/[0.02] border border-white/[0.04] text-white rounded-lg py-2.5 px-3.5 text-[13px] placeholder-[#4b5563] focus:outline-none focus:border-primary/40 transition-colors resize-none"
          />
          <p className="text-white/20 text-[11px] mt-1">Ajuda a IA a moderar com mais precisão</p>
        </div>
      </div>}

      {/* Footer */}
      {!collapsed &&
      <div className="flex items-center justify-between px-5 py-3.5" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.02)' }}>
        <button
          onClick={() => setConfirmDelete(true)}
          className="flex items-center gap-1.5 text-[12px] transition-all duration-200"
          style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)', padding: '6px 16px', borderRadius: '8px' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(248,113,113,0.15)'; e.currentTarget.style.color = '#f87171' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(248,113,113,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Excluir
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 text-white font-medium text-[13px] px-5 py-2 rounded-lg transition-all duration-200"
          style={{
            background: 'rgba(var(--color-primary-rgb),0.15)',
            border: '1px solid rgba(var(--color-primary-rgb),0.25)',
            color: 'var(--color-primary-light)',
            opacity: saving ? 0.5 : 1,
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={(e) => { if (!saving) { e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.25)' } }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.15)' }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Salvar
        </button>
      </div>}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setConfirmDelete(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative bg-white/[0.03] border border-white/[0.04] rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-white font-semibold text-center">Excluir grupo?</h3>
            <p className="text-white/40 text-sm text-center mt-2">
              O grupo <span className="text-white font-medium">{localGrupo.grupo_nome}</span> será removido da moderação. Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 px-4 py-2.5 bg-transparent border border-white/[0.04] text-white/50 rounded-lg text-sm transition-colors hover:bg-white/[0.04] hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2.5 bg-red-500/80 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Log de Ações Component ───

const LOGS_PER_PAGE = 20;

const LogDeAcoes: React.FC<{
  moderacao: ReturnType<typeof useModeracao>;
  showToast: (type: 'success' | 'error', msg: string) => void;
}> = ({ moderacao, showToast }) => {
  const [filters, setFilters] = useState<LogFilters>({ ...EMPTY_LOG_FILTERS });
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [startPickerOpen, setStartPickerOpen] = useState(false);
  const [endPickerOpen, setEndPickerOpen] = useState(false);

  const hasActiveFilters = filters.grupo_id || filters.tipo_violacao || filters.acao ||
    filters.data_inicio || filters.data_fim || filters.busca;

  const updateFilter = (key: keyof LogFilters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    moderacao.setLogFiltersAndFetch(newFilters);
  };

  const clearFilters = () => {
    const empty = { ...EMPTY_LOG_FILTERS };
    setFilters(empty);
    moderacao.setLogFiltersAndFetch(empty);
  };

  // Strikes map from moderacao_grupos
  const strikesMap = useMemo(() => {
    const map: Record<string, number> = {};
    moderacao.grupos.forEach(g => {
      map[g.grupo_id] = g.strikes_para_expulsao;
    });
    return map;
  }, [moderacao.grupos]);

  const totalPages = Math.max(1, Math.ceil(moderacao.logsTotal / LOGS_PER_PAGE));
  const startItem = moderacao.logsTotal === 0 ? 0 : (moderacao.logsPage - 1) * LOGS_PER_PAGE + 1;
  const endItem = Math.min(moderacao.logsPage * LOGS_PER_PAGE, moderacao.logsTotal);

  // Toast on new realtime log
  const prevNewLogId = useRef<string | null>(null);
  useEffect(() => {
    if (moderacao.newLogId && moderacao.newLogId !== prevNewLogId.current) {
      prevNewLogId.current = moderacao.newLogId;
      showToast('success', 'Nova ação de moderação registrada');
    }
  }, [moderacao.newLogId, showToast]);

  return (
    <>
      {/* Card Ações Hoje */}
      <div
        className="flex items-center gap-3.5 px-5 py-4"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '14px' }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(var(--color-primary-rgb),0.12)', border: '1px solid rgba(var(--color-primary-rgb),0.2)' }}
        >
          <Shield className="w-5 h-5" style={{ color: 'var(--color-primary-light)' }} />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.5px] font-semibold" style={{ color: 'rgba(255,255,255,0.45)' }}>Ações Hoje</p>
          <p className="text-white font-bold text-[24px] tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>{moderacao.acoesHoje}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/[0.03] border border-white/[0.04] rounded-2xl p-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Grupo */}
          <CustomSelect
            value={filters.grupo_id}
            onChange={(v) => updateFilter('grupo_id', v)}
            options={[{ value: '', label: 'Todos os grupos' }, ...moderacao.grupos.map(g => ({ value: g.grupo_id, label: g.grupo_nome }))]}
          />

          {/* Tipo Violação */}
          <CustomSelect
            value={filters.tipo_violacao}
            onChange={(v) => updateFilter('tipo_violacao', v)}
            options={[
              { value: '', label: 'Todas violações' },
              { value: 'links_spam', label: 'Links/Spam' },
              { value: 'palavroes', label: 'Palavrões' },
              { value: 'adulto', label: 'Adulto' },
              { value: 'propaganda', label: 'Propaganda' },
              { value: 'captacao_leads', label: 'Captação' },
              { value: 'religiao', label: 'Religião' },
              { value: 'politica', label: 'Política' },
            ]}
          />

          {/* Ação */}
          <CustomSelect
            value={filters.acao}
            onChange={(v) => updateFilter('acao', v)}
            options={[
              { value: '', label: 'Todas ações' },
              { value: 'aviso', label: 'Aviso' },
              { value: 'expulsao', label: 'Expulsão' },
            ]}
          />

          <div className="w-px h-6 bg-white/[0.06] self-center" />

          {/* Date range display — same design as Dashboard */}
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <Calendar className="w-3 h-3 text-white/30" />

            {/* Data Início */}
            <div className="relative">
              <button
                onClick={() => { setStartPickerOpen(!startPickerOpen); setEndPickerOpen(false); }}
                className={cn(
                  "px-2 py-1 rounded-lg transition-all duration-200 tabular-nums",
                  startPickerOpen
                    ? "bg-primary/10 text-primary-light border border-primary/20"
                    : filters.data_inicio
                      ? "text-white/70 hover:text-white hover:bg-white/[0.03] border border-transparent"
                      : "text-white/30 hover:text-white/50 hover:bg-white/[0.03] border border-transparent"
                )}
              >
                {filters.data_inicio
                  ? format(new Date(filters.data_inicio + 'T00:00:00'), 'dd/MM')
                  : 'Início'}
              </button>
              {startPickerOpen && (
                <DayPicker
                  selectedDate={filters.data_inicio ? new Date(filters.data_inicio + 'T00:00:00') : new Date()}
                  onSelect={(d) => {
                    updateFilter('data_inicio', format(d, 'yyyy-MM-dd'));
                  }}
                  onClose={() => setStartPickerOpen(false)}
                  label="Data início"
                />
              )}
            </div>

            <span className="text-white/20">—</span>

            {/* Data Fim */}
            <div className="relative">
              <button
                onClick={() => { setEndPickerOpen(!endPickerOpen); setStartPickerOpen(false); }}
                className={cn(
                  "px-2 py-1 rounded-lg transition-all duration-200 tabular-nums",
                  endPickerOpen
                    ? "bg-primary/10 text-primary-light border border-primary/20"
                    : filters.data_fim
                      ? "text-white/70 hover:text-white hover:bg-white/[0.03] border border-transparent"
                      : "text-white/30 hover:text-white/50 hover:bg-white/[0.03] border border-transparent"
                )}
              >
                {filters.data_fim
                  ? format(new Date(filters.data_fim + 'T00:00:00'), 'dd/MM')
                  : 'Fim'}
              </button>
              {endPickerOpen && (
                <DayPicker
                  selectedDate={filters.data_fim ? new Date(filters.data_fim + 'T00:00:00') : new Date()}
                  onSelect={(d) => {
                    updateFilter('data_fim', format(d, 'yyyy-MM-dd'));
                  }}
                  onClose={() => setEndPickerOpen(false)}
                  label="Data fim"
                />
              )}
            </div>
          </div>

          <div className="w-px h-6 bg-white/[0.06] self-center" />

          {/* Busca */}
          <div className="relative flex-1 min-w-[180px] max-w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
            <input
              type="text"
              value={filters.busca}
              onChange={(e) => updateFilter('busca', e.target.value)}
              placeholder="Nome ou telefone..."
              className="w-full bg-white/[0.04] border border-white/[0.04] rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-[#4b5563] focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          {/* Limpar */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-primary text-xs hover:underline cursor-pointer ml-auto shrink-0"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {moderacao.loadingLogs ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white/[0.03] border border-white/[0.04] rounded-xl h-14 animate-pulse" />
          ))}
        </div>
      ) : moderacao.logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)' }}
          >
            <Shield className="w-7 h-7" style={{ color: 'rgba(255,255,255,0.15)' }} />
          </div>
          <p className="text-[15px] font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Nenhuma ação de moderação registrada</p>
          <p className="text-[13px] mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>As ações do segurança aparecerão aqui automaticamente</p>
        </div>
      ) : (
        <div className="bg-white/[0.03] border border-white/[0.04] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-white/[0.02]">
                  <th className="w-8 px-2 py-3" />
                  <th className="text-left text-white/40 text-xs uppercase font-semibold tracking-[1px] px-4 py-3">Data/Hora</th>
                  <th className="text-left text-white/40 text-xs uppercase font-semibold tracking-[1px] px-4 py-3">Grupo</th>
                  <th className="text-left text-white/40 text-xs uppercase font-semibold tracking-[1px] px-4 py-3">Autor</th>
                  <th className="text-left text-white/40 text-xs uppercase font-semibold tracking-[1px] px-4 py-3">Violação</th>
                  <th className="text-left text-white/40 text-xs uppercase font-semibold tracking-[1px] px-4 py-3">Ação</th>
                  <th className="text-left text-white/40 text-xs uppercase font-semibold tracking-[1px] px-4 py-3">Strike</th>
                </tr>
              </thead>
              <tbody>
                {moderacao.logs.map((log) => {
                  const violacao = VIOLACAO_MAP[log.tipo_violacao] || { label: log.tipo_violacao, bg: 'bg-[#2a2a2a]', text: 'text-white/50' };
                  const acao = formatarAcao(log.acao_tomada);
                  const maxStrikes = strikesMap[log.grupo_id] || 3;
                  const isExpanded = expandedRow === log.id;
                  const isNew = moderacao.newLogId === log.id;

                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() => setExpandedRow(isExpanded ? null : log.id)}
                        className={cn(
                          "border-b border-white/[0.04] cursor-pointer transition-all duration-300",
                          isExpanded ? "bg-white/[0.04]/70" : "hover:bg-white/[0.04]/50",
                          isNew && "animate-pulse bg-primary/5"
                        )}
                      >
                        {/* Chevron */}
                        <td className="px-2 py-3 text-center">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-white/40 mx-auto" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-white/20 mx-auto" />
                          )}
                        </td>
                        {/* Data */}
                        <td className="px-4 py-3 text-white/50 text-sm whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-white/20 shrink-0" />
                            {formatarDataBR(log.created_at)}
                          </div>
                        </td>
                        {/* Grupo */}
                        <td className="px-4 py-3 text-white text-sm max-w-[180px] truncate" title={log.grupo_nome}>
                          {log.grupo_nome}
                        </td>
                        {/* Autor */}
                        <td className="px-4 py-3">
                          {log.nome_autor ? (
                            <p className="text-white text-sm">{log.nome_autor}</p>
                          ) : (
                            <p className="text-white/20 italic text-sm">Sem nome</p>
                          )}
                          <p className="text-white/40 text-xs font-mono">{formatTelefone(log.telefone_autor)}</p>
                        </td>
                        {/* Violação */}
                        <td className="px-4 py-3">
                          <span className={cn("inline-block px-2.5 py-1 rounded-md text-xs font-medium", violacao.bg, violacao.text)}>
                            {violacao.label}
                          </span>
                        </td>
                        {/* Ação */}
                        <td className="px-4 py-3">
                          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium", acao.bg, acao.text)}>
                            {log.acao_tomada === 'expulsao' ? <Ban className="w-3 h-3" /> : null}
                            {acao.label}
                          </span>
                        </td>
                        {/* Strike */}
                        <td className="px-4 py-3">
                          <span className={cn(
                            "text-sm font-mono tabular-nums font-medium",
                            log.strike_numero >= maxStrikes ? "text-red-400" : "text-white"
                          )}>
                            {log.strike_numero}/{maxStrikes}
                          </span>
                        </td>
                      </tr>
                      {/* Expanded content */}
                      {isExpanded && (
                        <tr className="bg-white/[0.02]">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="flex flex-col gap-3 max-w-3xl">
                              {/* Conteúdo original */}
                              <div>
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <MessageSquareText className="w-3.5 h-3.5 text-white/40" />
                                  <span className="text-white/40 text-xs uppercase tracking-[1px] font-semibold">Conteúdo original</span>
                                </div>
                                <div className="bg-white/[0.03] border border-white/[0.04] rounded-lg px-4 py-3">
                                  <p className="text-white/50 text-sm whitespace-pre-wrap break-words leading-relaxed">
                                    {log.conteudo_original || '—'}
                                  </p>
                                </div>
                              </div>
                              {/* Justificativa */}
                              <div>
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <Shield className="w-3.5 h-3.5 text-white/40" />
                                  <span className="text-white/40 text-xs uppercase tracking-[1px] font-semibold">Justificativa</span>
                                </div>
                                <div className="bg-white/[0.03] border border-white/[0.04] rounded-lg px-4 py-3">
                                  <p className="text-white/50 text-sm">
                                    {log.detalhes_ia || '—'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.04]">
            <span className="text-white/40 text-sm">
              Mostrando {startItem}–{endItem} de {moderacao.logsTotal}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => moderacao.setLogsPageAndFetch(moderacao.logsPage - 1)}
                disabled={moderacao.logsPage === 1}
                className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.04] text-white px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-white/[0.06] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Anterior
              </button>

              {/* Page numbers */}
              {(() => {
                const pages: (number | string)[] = [];
                if (totalPages <= 7) {
                  for (let i = 1; i <= totalPages; i++) pages.push(i);
                } else {
                  pages.push(1);
                  if (moderacao.logsPage > 3) pages.push('...');
                  const start = Math.max(2, moderacao.logsPage - 1);
                  const end = Math.min(totalPages - 1, moderacao.logsPage + 1);
                  for (let i = start; i <= end; i++) pages.push(i);
                  if (moderacao.logsPage < totalPages - 2) pages.push('...');
                  pages.push(totalPages);
                }
                return pages.map((p, i) =>
                  typeof p === 'string' ? (
                    <span key={`dot-${i}`} className="text-white/20 text-xs px-1">...</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => moderacao.setLogsPageAndFetch(p)}
                      className="min-w-[32px] h-[32px] flex items-center justify-center rounded-lg text-[11px] font-mono font-medium transition-all duration-150"
                      style={moderacao.logsPage === p
                        ? { background: 'rgba(var(--color-primary-rgb),0.15)', color: 'var(--color-primary-light)', border: '1px solid rgba(var(--color-primary-rgb),0.3)' }
                        : { background: 'transparent', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.06)' }
                      }
                      onMouseEnter={(e) => { if (moderacao.logsPage !== p) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; } }}
                      onMouseLeave={(e) => { if (moderacao.logsPage !== p) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; } }}
                    >
                      {p}
                    </button>
                  )
                );
              })()}

              <button
                onClick={() => moderacao.setLogsPageAndFetch(moderacao.logsPage + 1)}
                disabled={moderacao.logsPage === totalPages}
                className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.04] text-white px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-white/[0.06] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Próximo
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ─── Add Group Modal ───

const AddGroupModal: React.FC<{
  onClose: () => void;
  fetchInstancias: () => Promise<InstanciaColeta[]>;
  fetchGruposWpp: (instancia: string, token: string) => Promise<{ sucesso: boolean; mensagem?: string; total?: number }>;
  showToast: (type: 'success' | 'error', msg: string) => void;
  onRefetch: () => void;
}> = ({ onClose, fetchInstancias, fetchGruposWpp, showToast, onRefetch }) => {
  const [instancias, setInstancias] = useState<InstanciaColeta[]>([]);
  const [loadingInst, setLoadingInst] = useState(true);
  const [selectedInstancia, setSelectedInstancia] = useState('');
  const [loadingGrupos, setLoadingGrupos] = useState(false);

  useEffect(() => {
    fetchInstancias().then(data => {
      setInstancias(data);
      setLoadingInst(false);
    });
  }, [fetchInstancias]);

  const handleBuscarGrupos = async () => {
    const inst = instancias.find(i => i.instancia === selectedInstancia);
    if (!inst) return;
    setLoadingGrupos(true);
    try {
      const result = await fetchGruposWpp(inst.instancia, inst.token);
      if (result.sucesso) {
        showToast('success', `${result.total ?? 0} grupos adicionados com sucesso`);
        onRefetch();
        onClose();
      } else {
        showToast('error', result.mensagem || 'Erro ao buscar grupos');
      }
    } catch {
      showToast('error', 'Erro ao buscar grupos');
    } finally {
      setLoadingGrupos(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div
        className="relative w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col animate-slide-up"
        style={{ background: 'rgba(20,20,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[16px] font-semibold text-white">Adicionar Grupo</h2>
              <p className="text-[13px] mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Selecione a instância e os grupos para monitorar</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Instância select */}
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wide font-semibold mb-1.5 block">Instância</label>
            {loadingInst ? (
              <div className="flex items-center gap-2 text-white/40 text-sm py-2.5">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando instâncias...
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="flex-1">
                  <CustomSelect
                    value={selectedInstancia}
                    onChange={(v) => { setSelectedInstancia(v); }}
                    options={[{ value: '', label: 'Selecione uma instância' }, ...instancias.map(inst => ({ value: inst.instancia, label: `${inst.nome} (${inst.numero})` }))]}
                    placeholder="Selecione uma instância"
                  />
                </div>
                <button
                  onClick={handleBuscarGrupos}
                  disabled={!selectedInstancia || loadingGrupos}
                  className="px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'rgba(var(--color-primary-rgb),0.2)', border: '1px solid rgba(var(--color-primary-rgb),0.3)', color: 'var(--color-primary-light)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.3)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.2)' }}
                >
                  {loadingGrupos ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar Grupos'}
                </button>
              </div>
            )}
          </div>

          {loadingGrupos && (
            <p className="text-[13px] text-white/40">Buscando e adicionando grupos... Isso pode levar alguns segundos.</p>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 flex justify-end gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <button
            onClick={onClose}
            disabled={loadingGrupos}
            className="px-6 py-2.5 rounded-[10px] text-[13px] font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───

const ITEMS_PER_PAGE = 20;

export const Grupos: React.FC = () => {
  const getActiveExpertId = useAuthStore((s) => s.getActiveExpertId);

  // ── Visibilidade de sub-funcionalidades ──
  const gMembros = useSectionGate('grupos_membros');
  const gFecharAbrir = useSectionGate('grupos_fechar_abrir');
  const gBlacklist = useSectionGate('grupos_blacklist');
  const gBots = useSectionGate('grupos_bots');
  const gModGrupos = useSectionGate('grupos_moderacao_grupos');
  const gModLog = useSectionGate('grupos_moderacao_log');
  const gModInstancia = useSectionGate('grupos_moderacao_instancia');

  // ── Main Tab ──
  const [mainTab, setMainTab] = useState<MainTab>('membros');
  const [modSubTab, setModSubTab] = useState<ModeracaoSubTab>('grupos');

  // Mapa de gate para cada sub-tab de moderação
  const modSubTabGates: Record<ModeracaoSubTab, SectionState> = useMemo(() => ({
    'grupos': gModGrupos,
    'log': gModLog,
    'instancia': gModInstancia,
    'fechar-abrir': gFecharAbrir,
  }), [gModGrupos, gModLog, gModInstancia, gFecharAbrir]);

  // Fallback: se a sub-tab ativa está hidden/disabled, vai para a primeira habilitada
  useEffect(() => {
    const currentGate = modSubTabGates[modSubTab];
    if (currentGate === 'hidden' || currentGate === 'disabled') {
      const allTabs: ModeracaoSubTab[] = ['grupos', 'log', 'instancia', 'fechar-abrir'];
      const firstEnabled = allTabs.find(t => modSubTabGates[t] === 'enabled');
      if (firstEnabled) setModSubTab(firstEnabled);
    }
  }, [modSubTabGates, modSubTab]);
  const [botSubTab, setBotSubTab] = useState<BotSubTab>('personas');

  // ── Fechar/Abrir Grupos (estados) ──
  const [faInstancia, setFaInstancia] = useState('');
  const [faGrupos, setFaGrupos] = useState<UazapiGroup[]>([]);
  const [faSelecionados, setFaSelecionados] = useState<Set<string>>(new Set());
  const [faLoading, setFaLoading] = useState(false);
  const [faProcessando, setFaProcessando] = useState(false);
  const [faBuscou, setFaBuscou] = useState(false);
  const [faConfirmModal, setFaConfirmModal] = useState<{ open: boolean; acao: 'fechar' | 'abrir' } | null>(null);
  const [faMode, setFaMode] = useState<'manual' | 'automatico'>('manual');
  const [faHorarios, setFaHorarios] = useState<{ grupo_id: string; grupo_nome: string; horario_fechar: string | null; horario_abrir: string | null; controle_horario_ativo: boolean; dias_semana: number[] }[]>([]);
  const [faHorariosLoading, setFaHorariosLoading] = useState(false);
  const [faHorariosSaving, setFaHorariosSaving] = useState(false);
  const [faHorariosBuscou, setFaHorariosBuscou] = useState(false);
  const [faFiltroStatus, setFaFiltroStatus] = useState<'todos' | 'abertos' | 'fechados'>('todos');

  // ── Membros state (original) ──
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [filterOrigem, setFilterOrigem] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [startPickerOpen, setStartPickerOpen] = useState(false);
  const [endPickerOpen, setEndPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sendingReport, setSendingReport] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [sendViaWhatsapp, setSendViaWhatsapp] = useState(false);
  const [whatsappNumero, setWhatsappNumero] = useState('');
  const [whatsappInstancia, setWhatsappInstancia] = useState('');
  const [instancias, setInstancias] = useState<{ id: number; nome: string; numero: string; instancia: string; token: string }[]>([]);
  const [loadingInstancias, setLoadingInstancias] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  // ── Moderação ──
  const moderacao = useModeracao();
  const [addGroupModal, setAddGroupModal] = useState(false);
  const [buscaGrupoMod, setBuscaGrupoMod] = useState('');
  const [numNotificacao, setNumNotificacao] = useState('');
  const [numNotificacaoSaving, setNumNotificacaoSaving] = useState(false);
  const [msgHack, setMsgHack] = useState('');
  const [msgHackSaving, setMsgHackSaving] = useState(false);
  const [globalFieldsLoaded, setGlobalFieldsLoaded] = useState(false);
  const [showRegrasEmMassa, setShowRegrasEmMassa] = useState(false);
  const [regrasEmMassa, setRegrasEmMassa] = useState<RegrasAtivas>({
    links_spam: true, palavroes: true, adulto: true, propaganda: true, captacao_leads: true, religiao: true, politica: true,
  });
  const [enviarAvisoEmMassa, setEnviarAvisoEmMassa] = useState(false);
  const [bloquearInternacionaisEmMassa, setBloquearInternacionaisEmMassa] = useState(false);
  const [strikesEmMassa, setStrikesEmMassa] = useState(5);
  const [mensagemAvisoEmMassa, setMensagemAvisoEmMassa] = useState('⚠ Mensagem removida por violar as regras do grupo.');
  const [mensagemExpulsaoEmMassa, setMensagemExpulsaoEmMassa] = useState('🚫 Membro removido após 3 violações das regras.');
  const [casasEmMassa, setCasasEmMassa] = useState<string[]>([]);
  const [perfisEmMassa, setPerfisEmMassa] = useState<string[]>([]);
  const [linksEmMassa, setLinksEmMassa] = useState<string[]>([]);
  const [contextoEmMassa, setContextoEmMassa] = useState('');
  const [aplicarWhitelists, setAplicarWhitelists] = useState(false);
  const [salvandoEmMassa, setSalvandoEmMassa] = useState(false);
  const avisoEmMassaRef = useRef<HTMLTextAreaElement>(null);
  const expulsaoEmMassaRef = useRef<HTMLTextAreaElement>(null);

  const aplicarRegrasEmMassa = async () => {
    setSalvandoEmMassa(true);
    for (const g of moderacao.grupos) {
      const campos: Partial<ModeracaoGrupo> = {
        regras_ativas: regrasEmMassa,
        enviar_aviso: enviarAvisoEmMassa,
        bloquear_internacionais: bloquearInternacionaisEmMassa,
        strikes_para_expulsao: strikesEmMassa,
        mensagem_aviso: mensagemAvisoEmMassa,
        mensagem_expulsao: mensagemExpulsaoEmMassa,
        contexto_extra: contextoEmMassa || null,
      };
      // So sobrescreve whitelists se o usuario ativou a opcao
      if (aplicarWhitelists) {
        campos.casas_permitidas = casasEmMassa;
        campos.perfis_permitidos = perfisEmMassa;
        campos.links_permitidos = linksEmMassa;
      }
      await moderacao.updateGrupo(g.id, campos);
    }
    setSalvandoEmMassa(false);
    setShowRegrasEmMassa(false);
    setAplicarWhitelists(false);
    showToast('success', 'Configurações aplicadas a todos os grupos!');
  };

  // ── Segurança (Instância) ──
  const {
    instanciasSeguranca,
    instanciasColeta,
    loading: loadingSeguranca,
    fetchData: fetchSegurancaData,
    toggleAtivo: toggleAtivoSeguranca,
    editarNumero: editarSeguranca,
    excluirNumero: excluirSeguranca,
    trocarOrdem: trocarOrdemSeguranca,
    reconectar: reconectarSeguranca,
    criarInstancia: criarInstanciaSeguranca,
  } = useWhatsappRotacao();
  const [segEditModal, setSegEditModal] = useState<{ open: boolean; numero: WhatsappRotacao | null }>({ open: false, numero: null });
  const [segNovaModal, setSegNovaModal] = useState(false);
  const [segNovaTipo, setSegNovaTipo] = useState<'seguranca' | 'antihack'>('seguranca');
  const [segNovaNome, setSegNovaNome] = useState('');
  const [segNovaTel, setSegNovaTel] = useState('');
  const [segNovaSaving, setSegNovaSaving] = useState(false);
  const [segNovaResultado, setSegNovaResultado] = useState<{ sucesso: boolean; pairing_code?: string; mensagem?: string; expira_em?: string } | null>(null);
  const [segDeleteModal, setSegDeleteModal] = useState<WhatsappRotacao | null>(null);

  // ── Fechar/Abrir Grupos (logica - usa instancias de coleta) ──
  const faInstanciasConectadas = useMemo(() =>
    instanciasColeta.filter(i => i.status_conexao === 'connected'),
    [instanciasColeta]
  );

  const faBuscarGrupos = async () => {
    const inst = instanciasColeta.find(i => i.instancia === faInstancia);
    if (!inst) return;
    setFaLoading(true);
    setFaSelecionados(new Set());
    setFaBuscou(false);
    try {
      // Busca grupos via webhook dedicado de abrir/fechar (retorna status real da UAZAPI)
      const resp = await fetchWithTimeout(WEBHOOKS.BUSCAR_GRUPOS_ABRIR_FECHAR, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instancia: inst.instancia, token: inst.token, expert_id: getActiveExpertId() }),
      }, 60000);

      if (!resp.ok) throw new Error(`Webhook retornou ${resp.status}`);
      const payload = await resp.json().catch(() => null) as
        | { sucesso?: boolean; grupos?: Array<{ grupo_id: string; grupo_nome: string; fechado?: boolean; status?: string }> }
        | null;
      const gruposRaw = payload?.grupos ?? [];

      const grupos: UazapiGroup[] = gruposRaw.map(g => ({
        JID: g.grupo_id,
        Name: g.grupo_nome,
        IsAnnounce: typeof g.fechado === 'boolean' ? g.fechado : g.status === 'fechado',
        OwnerIsAdmin: true,
        IsDefaultSubGroup: false,
      }));
      grupos.sort((a, b) => {
        if (a.IsAnnounce !== b.IsAnnounce) return a.IsAnnounce ? -1 : 1;
        return a.Name.localeCompare(b.Name, 'pt-BR');
      });
      setFaGrupos(grupos);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao buscar grupos';
      showToast('error', msg);
      setFaGrupos([]);
    } finally {
      setFaLoading(false);
      setFaBuscou(true);
    }
  };

  const faGruposFiltrados = useMemo(() => {
    if (faFiltroStatus === 'abertos') return faGrupos.filter(g => !g.IsAnnounce);
    if (faFiltroStatus === 'fechados') return faGrupos.filter(g => g.IsAnnounce);
    return faGrupos;
  }, [faGrupos, faFiltroStatus]);

  const faSelecionadosAbertosCount = useMemo(
    () => faGrupos.filter(g => faSelecionados.has(g.JID) && !g.IsAnnounce).length,
    [faGrupos, faSelecionados]
  );
  const faSelecionadosFechadosCount = useMemo(
    () => faGrupos.filter(g => faSelecionados.has(g.JID) && g.IsAnnounce).length,
    [faGrupos, faSelecionados]
  );

  const faToggleSelecionarTodos = () => {
    const visiveis = faGruposFiltrados.map(g => g.JID);
    const todosVisiveisSelecionados = visiveis.length > 0 && visiveis.every(j => faSelecionados.has(j));
    setFaSelecionados(prev => {
      const next = new Set(prev);
      if (todosVisiveisSelecionados) {
        visiveis.forEach(j => next.delete(j));
      } else {
        visiveis.forEach(j => next.add(j));
      }
      return next;
    });
  };

  const faToggleGrupo = (jid: string) => {
    setFaSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(jid)) next.delete(jid);
      else next.add(jid);
      return next;
    });
  };

  const faExecutarAcao = async (acao: 'fechar' | 'abrir') => {
    const inst = instanciasColeta.find(i => i.instancia === faInstancia);
    if (!inst) return;
    // Só age sobre grupos cujo estado atual difere da ação (fechar → abertos; abrir → fechados)
    const alvoJids = faGrupos
      .filter(g => faSelecionados.has(g.JID) && (acao === 'fechar' ? !g.IsAnnounce : g.IsAnnounce))
      .map(g => g.JID);
    if (alvoJids.length === 0) {
      showToast('error', acao === 'fechar' ? 'Nenhum grupo aberto selecionado' : 'Nenhum grupo fechado selecionado');
      setFaConfirmModal(null);
      return;
    }
    setFaProcessando(true);
    try {
      const res = await fetch(`${N8N_GEND}/fechar-grupos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grupos: alvoJids,
          acao,
          token: inst.token,
          expert_id: getActiveExpertId(),
        }),
      });
      const result = await res.json();
      if (result.sucesso) {
        showToast('success', result.mensagem || `Grupos ${acao === 'fechar' ? 'fechados' : 'abertos'} com sucesso!`);
        const alvoSet = new Set(alvoJids);
        setFaGrupos(prev => prev.map(g =>
          alvoSet.has(g.JID) ? { ...g, IsAnnounce: acao === 'fechar' } : g
        ).sort((a, b) => {
          if (a.IsAnnounce !== b.IsAnnounce) return a.IsAnnounce ? -1 : 1;
          return a.Name.localeCompare(b.Name, 'pt-BR');
        }));
        setFaSelecionados(new Set());
      } else {
        showToast('error', result.mensagem || `Erro ao ${acao} grupos`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Erro ao ${acao} grupos`;
      showToast('error', msg);
    } finally {
      setFaProcessando(false);
      setFaConfirmModal(null);
    }
  };

  // ── Controle de Horarios (automatico) ──

  // Auto-load dos grupos com horario configurado ao abrir a aba
  useEffect(() => {
    if (faMode !== 'automatico' || faHorariosBuscou) return;
    const loadConfigured = async () => {
      setFaHorariosLoading(true);
      try {
        const expertId = getActiveExpertId();
        let query = supabase
          .from('moderacao_grupos')
          .select('grupo_id, grupo_nome, horario_fechar, horario_abrir, controle_horario_ativo, dias_semana')
          .eq('ativo', true)
          .eq('controle_horario_ativo', true);
        if (expertId) query = query.eq('expert_id', expertId);

        const { data, error } = await query;
        if (error) throw error;

        if (data && data.length > 0) {
          setFaHorarios(((data) as { grupo_id: string; grupo_nome: string; horario_fechar: string | null; horario_abrir: string | null; controle_horario_ativo: boolean | null; dias_semana: number[] | null }[]).map(g => ({
            grupo_id: g.grupo_id,
            grupo_nome: g.grupo_nome,
            horario_fechar: g.horario_fechar ? g.horario_fechar.substring(0, 5) : null,
            horario_abrir: g.horario_abrir ? g.horario_abrir.substring(0, 5) : null,
            controle_horario_ativo: g.controle_horario_ativo ?? false,
            dias_semana: Array.isArray(g.dias_semana) && g.dias_semana.length > 0 ? g.dias_semana : [0,1,2,3,4,5,6],
          })));
        }
        setFaHorariosBuscou(true);
      } catch {
        // silencioso no auto-load
      } finally {
        setFaHorariosLoading(false);
      }
    };
    loadConfigured();
  }, [faMode, faHorariosBuscou]);

  const faBuscarHorarios = async () => {
    const inst = instanciasColeta.find(i => i.instancia === faInstancia);
    if (!inst) return;
    setFaHorariosLoading(true);
    setFaHorariosBuscou(false);
    try {
      // Sincroniza grupos via webhook
      await fetchWithTimeout(WEBHOOKS.BUSCAR_GRUPOS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instancia: inst.instancia, token: inst.token, expert_id: getActiveExpertId() }),
      }, 60000);

      const expertId = getActiveExpertId();
      let query = supabase
        .from('moderacao_grupos')
        .select('grupo_id, grupo_nome, horario_fechar, horario_abrir, controle_horario_ativo, dias_semana')
        .eq('instancia', inst.instancia)
        .eq('ativo', true);
      if (expertId) query = query.eq('expert_id', expertId);

      const { data, error } = await query;
      if (error) throw error;

      setFaHorarios(((data ?? []) as { grupo_id: string; grupo_nome: string; horario_fechar: string | null; horario_abrir: string | null; controle_horario_ativo: boolean | null; dias_semana: number[] | null }[]).map(g => ({
        grupo_id: g.grupo_id,
        grupo_nome: g.grupo_nome,
        horario_fechar: g.horario_fechar ? g.horario_fechar.substring(0, 5) : null,
        horario_abrir: g.horario_abrir ? g.horario_abrir.substring(0, 5) : null,
        controle_horario_ativo: g.controle_horario_ativo ?? false,
        dias_semana: Array.isArray(g.dias_semana) && g.dias_semana.length > 0 ? g.dias_semana : [0,1,2,3,4,5,6],
      })));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao buscar grupos';
      showToast('error', msg);
      setFaHorarios([]);
    } finally {
      setFaHorariosLoading(false);
      setFaHorariosBuscou(true);
    }
  };

  const faSalvarHorarios = async () => {
    setFaHorariosSaving(true);
    try {
      const expertId = getActiveExpertId();
      for (const g of faHorarios) {
        let query = supabase
          .from('moderacao_grupos')
          .update({
            horario_fechar: g.horario_fechar || null,
            horario_abrir: g.horario_abrir || null,
            controle_horario_ativo: g.controle_horario_ativo,
            dias_semana: g.dias_semana,
          })
          .eq('grupo_id', g.grupo_id);
        if (expertId) query = query.eq('expert_id', expertId);
        await query;
      }
      showToast('success', 'Horários salvos com sucesso!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar horários';
      showToast('error', msg);
    } finally {
      setFaHorariosSaving(false);
    }
  };

  const faUpdateHorario = (grupoId: string, field: string, value: string | boolean | null) => {
    setFaHorarios(prev => prev.map(g =>
      g.grupo_id === grupoId ? { ...g, [field]: value } : g
    ));
  };

  const faToggleDia = (grupoId: string, dia: number) => {
    setFaHorarios(prev => prev.map(g => {
      if (g.grupo_id !== grupoId) return g;
      const has = g.dias_semana.includes(dia);
      const next = has ? g.dias_semana.filter(d => d !== dia) : [...g.dias_semana, dia].sort((a, b) => a - b);
      return { ...g, dias_semana: next };
    }));
  };

  const faSetDias = (grupoId: string, dias: number[]) => {
    setFaHorarios(prev => prev.map(g =>
      g.grupo_id === grupoId ? { ...g, dias_semana: [...dias].sort((a, b) => a - b) } : g
    ));
  };

  const faHorariosAtivos = useMemo(() =>
    faHorarios.filter(g => g.controle_horario_ativo).length,
    [faHorarios]
  );

  // ── Blacklist ──
  interface BlacklistItem {
    id: string;
    telefone: string;
    motivo: string | null;
    adicionado_por: string | null;
    created_at: string;
  }
  const [blacklist, setBlacklist] = useState<BlacklistItem[]>([]);
  const [loadingBlacklist, setLoadingBlacklist] = useState(false);
  const [blacklistTelefone, setBlacklistTelefone] = useState('');
  const [blacklistMotivo, setBlacklistMotivo] = useState('');
  const [blacklistBusca, setBlacklistBusca] = useState('');
  const [blacklistAdding, setBlacklistAdding] = useState(false);
  const [blacklistDeleteConfirm, setBlacklistDeleteConfirm] = useState<BlacklistItem | null>(null);

  // Remove modal state
  interface InstanciaRemocao { id: number; nome: string; numero: string; instancia: string; token: string }
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [telefoneBloqueado, setTelefoneBloqueado] = useState('');
  const [motivoBloqueio, setMotivoBloqueio] = useState('');
  const [instanciasDisponiveis, setInstanciasDisponiveis] = useState<InstanciaRemocao[]>([]);
  const [instanciasSelecionadas, setInstanciasSelecionadas] = useState<Set<number>>(new Set());
  const [loadingInstanciasRemocao, setLoadingInstanciasRemocao] = useState(false);

  const fetchBlacklist = useCallback(async () => {
    const expertId = getActiveExpertId();
    if (!expertId) {
      setBlacklist([]);
      return;
    }
    setLoadingBlacklist(true);
    const { data, error } = await supabase
      .from('blacklist_grupos')
      .select('*')
      .eq('expert_id', expertId)
      .order('created_at', { ascending: false });
    if (!error && data) setBlacklist(data as BlacklistItem[]);
    setLoadingBlacklist(false);
  }, [getActiveExpertId]);

  useEffect(() => {
    if (mainTab === 'configuracao') fetchBlacklist();
  }, [mainTab, fetchBlacklist]);

  // Carregar campos globais do primeiro grupo monitorado
  useEffect(() => {
    if (!globalFieldsLoaded && moderacao.grupos.length > 0) {
      const ref = moderacao.grupos[0];
      setNumNotificacao(ref.numero_notificacao || '');
      setMsgHack(ref.mensagem_hack || '');
      setGlobalFieldsLoaded(true);
    }
  }, [moderacao.grupos, globalFieldsLoaded]);

  const salvarNumNotificacao = async () => {
    const limpo = numNotificacao.replace(/[\s+\-]/g, '');
    if (limpo && (limpo.length < 10 || limpo.length > 15)) {
      showToast('error', 'Número deve ter entre 10 e 15 dígitos');
      return;
    }
    setNumNotificacaoSaving(true);
    try {
      const expertId = getActiveExpertId();
      const { error } = await supabase
        .from('moderacao_grupos')
        .update({ numero_notificacao: limpo })
        .eq('expert_id', expertId);
      if (error) throw error;
      showToast('success', limpo ? 'Número de notificação salvo!' : 'Notificações desativadas');
    } catch {
      showToast('error', 'Erro ao salvar número');
    } finally {
      setNumNotificacaoSaving(false);
    }
  };

  const salvarMsgHack = async () => {
    setMsgHackSaving(true);
    try {
      const expertId = getActiveExpertId();
      const { error } = await supabase
        .from('moderacao_grupos')
        .update({ mensagem_hack: msgHack })
        .eq('expert_id', expertId);
      if (error) throw error;
      showToast('success', msgHack ? 'Mensagem anti-hack salva!' : 'Mensagem anti-hack removida');
    } catch {
      showToast('error', 'Erro ao salvar mensagem');
    } finally {
      setMsgHackSaving(false);
    }
  };

  const addBlacklist = async () => {
    const tel = blacklistTelefone.replace(/\D/g, '');
    const expertId = getActiveExpertId();
    if (!expertId) {
      showToast('error', 'Expert não identificado para salvar o bloqueio');
      return;
    }
    if (tel.length < 10) {
      showToast('error', 'Telefone deve ter no mínimo 10 dígitos');
      return;
    }
    setBlacklistAdding(true);
    const { error } = await supabase
      .from('blacklist_grupos')
      .insert({
        expert_id: expertId,
        telefone: tel,
        motivo: blacklistMotivo.trim() || null,
        adicionado_por: null,
      });
    if (error) {
      if (error.code === '23505') showToast('error', 'Este número já está na blacklist');
      else showToast('error', error.message);
      setBlacklistAdding(false);
      return;
    }
    // Success — open remove modal
    setTelefoneBloqueado(tel);
    setMotivoBloqueio(blacklistMotivo.trim());
    setBlacklistTelefone('');
    setBlacklistMotivo('');
    await fetchBlacklist();
    setBlacklistAdding(false);

    // Fetch instâncias do expert e abrir modal
    setLoadingInstanciasRemocao(true);
    setShowRemoveModal(true);
    const activeExpert = getActiveExpertId();
    let instQuery = supabase
      .from('whatsapp_rotacao')
      .select('id, nome, numero, instancia, token')
      .eq('ativo', true)
      .order('ordem');
    if (activeExpert) instQuery = instQuery.eq('expert_id', activeExpert);
    const { data: instData } = await instQuery;
    const list = (instData as InstanciaRemocao[]) || [];
    setInstanciasDisponiveis(list);
    setInstanciasSelecionadas(new Set(list.map(i => i.id)));
    setLoadingInstanciasRemocao(false);
  };

  const handleToggleInstancia = (id: number) => {
    setInstanciasSelecionadas(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRemoveModalClose = () => {
    setShowRemoveModal(false);
    showToast('success', 'Número adicionado à blacklist');
  };

  const handleRemoveFromGroups = () => {
    const selected = instanciasDisponiveis.filter(i => instanciasSelecionadas.has(i.id));
    setShowRemoveModal(false);
    showToast('success', 'Número adicionado à blacklist e sendo removido dos grupos');
    try {
      fetchWithTimeout(WEBHOOKS.BLACKLIST_REMOVER, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefone: telefoneBloqueado,
          motivo: motivoBloqueio,
          instancias: selected.map(inst => ({
            instancia: inst.instancia,
            token: inst.token,
            base_url: UAZAPI_BASE_URL,
          })),
        }),
      });
    } catch (e) {
      console.error('Webhook blacklist:', e);
    }
  };

  const removeBlacklist = async (id: string) => {
    const expertId = getActiveExpertId();
    if (!expertId) {
      showToast('error', 'Expert não identificado');
      return;
    }
    const { error } = await supabase
      .from('blacklist_grupos')
      .delete()
      .eq('id', id)
      .eq('expert_id', expertId);
    if (error) showToast('error', error.message);
    else {
      showToast('success', 'Número removido da blacklist');
      setBlacklist(prev => prev.filter(b => b.id !== id));
    }
    setBlacklistDeleteConfirm(null);
  };

  const filteredBlacklist = useMemo(() => {
    if (!blacklistBusca.trim()) return blacklist;
    const q = blacklistBusca.replace(/\D/g, '');
    return blacklist.filter(b => b.telefone.includes(q));
  }, [blacklist, blacklistBusca]);

  // ── Grupos Ignorados na Coleta ──
  interface GrupoIgnorado {
    id: string;
    grupo_id: string;
    grupo_nome: string;
    created_at: string;
  }
  interface GrupoDisponivel {
    id_grupo: string;
    nome_grupo: string;
    count: number;
  }
  const [gruposIgnorados, setGruposIgnorados] = useState<GrupoIgnorado[]>([]);
  const [gruposDisponiveis, setGruposDisponiveis] = useState<GrupoDisponivel[]>([]);
  const [loadingGruposIgnorados, setLoadingGruposIgnorados] = useState(false);
  const [grupoIgnoradoSelecionado, setGrupoIgnoradoSelecionado] = useState('');
  const [addingGrupoIgnorado, setAddingGrupoIgnorado] = useState(false);
  const [grupoIgnoradoBusca, setGrupoIgnoradoBusca] = useState('');
  const [grupoSelectAberto, setGrupoSelectAberto] = useState(false);
  const [grupoSelectBusca, setGrupoSelectBusca] = useState('');
  const grupoSelectRef = useRef<HTMLDivElement>(null);
  const [grupoIgnoradoRemoveConfirm, setGrupoIgnoradoRemoveConfirm] = useState<GrupoIgnorado | null>(null);
  const [membrosCountMap, setMembrosCountMap] = useState<Record<string, number>>({});
  const [showDeleteMembrosModal, setShowDeleteMembrosModal] = useState<{ grupo_id: string; grupo_nome: string; count: number } | null>(null);
  const [deletingMembros, setDeletingMembros] = useState(false);

  // Click outside handler for grupo select dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (grupoSelectRef.current && !grupoSelectRef.current.contains(e.target as Node)) {
        setGrupoSelectAberto(false);
      }
    };
    if (grupoSelectAberto) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [grupoSelectAberto]);

  const fetchGruposIgnorados = useCallback(async () => {
    setLoadingGruposIgnorados(true);
    try {
      const expertId = getActiveExpertId();
      const { data, error } = await supabase
        .from('grupos_ignorar_coleta')
        .select('*')
        .eq('expert_id', expertId)
        .order('created_at', { ascending: false });
      if (!error && data) setGruposIgnorados(data as GrupoIgnorado[]);
    } catch (e) {
      console.error('fetchGruposIgnorados:', e);
    }
    setLoadingGruposIgnorados(false);
  }, [getActiveExpertId]);

  const fetchGruposDisponiveis = useCallback(async () => {
    try {
      const expertId = getActiveExpertId();
      const { data: gruposUnicos } = await supabase.rpc('listar_grupos_distintos', {
        p_expert_id: expertId || null,
      });

      const todos: GrupoDisponivel[] = (gruposUnicos || []).map((g: { id_grupo: string; nome_grupo: string; total_membros: number }) => ({
        id_grupo: g.id_grupo,
        nome_grupo: g.nome_grupo || g.id_grupo,
        count: Number(g.total_membros),
      }));

      setGruposDisponiveis(todos);

      // Build membros count map
      const countMap: Record<string, number> = {};
      todos.forEach(g => { countMap[g.id_grupo] = g.count; });
      setMembrosCountMap(countMap);
    } catch (e) {
      console.error('fetchGruposDisponiveis:', e);
    }
  }, [getActiveExpertId]);

  useEffect(() => {
    if (mainTab === 'configuracao') {
      fetchGruposIgnorados();
      fetchGruposDisponiveis();
    }
  }, [mainTab, fetchGruposIgnorados, fetchGruposDisponiveis]);

  const gruposDisponiveisFiltrados = useMemo(() => {
    return gruposDisponiveis.filter(g =>
      !gruposIgnorados.some(ig => ig.grupo_id === g.id_grupo)
    );
  }, [gruposDisponiveis, gruposIgnorados]);

  const grupoSelectFiltrados = useMemo(() => {
    const lista = [...gruposDisponiveisFiltrados].sort((a, b) => b.count - a.count);
    if (!grupoSelectBusca.trim()) return lista;
    const q = grupoSelectBusca.toLowerCase();
    return lista.filter(g => g.nome_grupo.toLowerCase().includes(q));
  }, [gruposDisponiveisFiltrados, grupoSelectBusca]);

  const grupoSelecionadoObj = useMemo(() => {
    if (!grupoIgnoradoSelecionado) return null;
    return gruposDisponiveis.find(g => g.id_grupo === grupoIgnoradoSelecionado) || null;
  }, [grupoIgnoradoSelecionado, gruposDisponiveis]);

  const filteredGruposIgnorados = useMemo(() => {
    if (!grupoIgnoradoBusca.trim()) return gruposIgnorados;
    const q = grupoIgnoradoBusca.toLowerCase();
    return gruposIgnorados.filter(g => g.grupo_nome.toLowerCase().includes(q));
  }, [gruposIgnorados, grupoIgnoradoBusca]);

  const addGrupoIgnorado = async () => {
    if (!grupoIgnoradoSelecionado) {
      showToast('error', 'Selecione um grupo');
      return;
    }
    const grupo = gruposDisponiveis.find(g => g.id_grupo === grupoIgnoradoSelecionado);
    if (!grupo) return;

    setAddingGrupoIgnorado(true);
    const expertId = getActiveExpertId();
    const { error } = await supabase.from('grupos_ignorar_coleta').insert({
      grupo_id: grupo.id_grupo,
      grupo_nome: grupo.nome_grupo,
      expert_id: expertId,
    });

    if (error) {
      if (error.code === '23505') showToast('error', 'Esse grupo já está na lista de ignorados');
      else showToast('error', error.message);
      setAddingGrupoIgnorado(false);
      return;
    }

    setGrupoIgnoradoSelecionado('');
    await fetchGruposIgnorados();
    setAddingGrupoIgnorado(false);

    // Check member count
    const memberCount = membrosCountMap[grupo.id_grupo] || 0;
    if (memberCount > 0) {
      setShowDeleteMembrosModal({ grupo_id: grupo.id_grupo, grupo_nome: grupo.nome_grupo, count: memberCount });
    } else {
      showToast('success', 'Grupo adicionado à lista de ignorados');
    }
  };

  const handleDeleteMembros = async () => {
    if (!showDeleteMembrosModal) return;
    setDeletingMembros(true);
    const { grupo_id, count } = showDeleteMembrosModal;
    const { error } = await supabase.from('leads').delete().eq('id_grupo', grupo_id);
    setDeletingMembros(false);
    if (error) {
      showToast('error', error.message);
    } else {
      showToast('success', `Grupo ignorado e ${count} membros excluídos`);
      await fetchGruposDisponiveis();
    }
    setShowDeleteMembrosModal(null);
  };

  const handleKeepMembros = () => {
    showToast('success', 'Grupo adicionado à lista de ignorados');
    setShowDeleteMembrosModal(null);
  };

  const removeGrupoIgnorado = async (id: string) => {
    const { error } = await supabase.from('grupos_ignorar_coleta').delete().eq('id', id);
    if (error) showToast('error', error.message);
    else {
      showToast('success', 'Grupo removido da lista de ignorados');
      setGruposIgnorados(prev => prev.filter(g => g.id !== id));
    }
    setGrupoIgnoradoRemoveConfirm(null);
  };

  // ── Membros data ──
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const PAGE_SIZE = 1000;
      const expertId = getActiveExpertId();
      let allData: Lead[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('leads')
          .select('id, nome, telefone, origem, observacoes, id_grupo, nome_grupo, entrou_no_grupo, saiu_grupo')
          .not('entrou_no_grupo', 'is', null)
          .order('entrou_no_grupo', { ascending: false })
          .range(from, from + PAGE_SIZE - 1);

        if (expertId) {
          query = query.eq('expert_id', expertId);
        }

        const { data, error } = await query;

        if (error) throw error;
        const chunk = (data as Lead[]) || [];
        allData = allData.concat(chunk);
        hasMore = chunk.length === PAGE_SIZE;
        from += PAGE_SIZE;
      }

      setLeads(allData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar dados';
      showToast('error', message);
    } finally {
      setLoading(false);
    }
  };

  const groups = useMemo(() => {
    const map = new Map<string, string>();
    leads.forEach((l) => {
      const key = l.id_grupo || '__unknown__';
      if (!map.has(key)) {
        map.set(key, l.nome_grupo || 'Grupo desconhecido');
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [leads]);

  const origens = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.origem) set.add(l.origem);
    });
    return Array.from(set).sort();
  }, [leads]);

  const combinedFiltered = useMemo(() => {
    let result = leads;
    if (selectedGroup !== 'all') {
      if (selectedGroup === '__unknown__') {
        result = result.filter((l) => !l.id_grupo);
      } else {
        result = result.filter((l) => l.id_grupo === selectedGroup);
      }
    }
    if (filterOrigem !== 'all') {
      result = result.filter((l) => l.origem === filterOrigem);
    }
    if (filterStatus === 'ativo') {
      result = result.filter((l) => !l.saiu_grupo);
    } else if (filterStatus === 'saiu') {
      result = result.filter((l) => !!l.saiu_grupo);
    }
    if (dateFrom) {
      const from = startOfDay(dateFrom);
      result = result.filter((l) => new Date(l.entrou_no_grupo) >= from);
    }
    if (dateTo) {
      const to = endOfDay(dateTo);
      result = result.filter((l) => new Date(l.entrou_no_grupo) <= to);
    }
    return result;
  }, [leads, selectedGroup, filterOrigem, filterStatus, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const total = combinedFiltered.length;
    const ativos = combinedFiltered.filter((l) => !l.saiu_grupo).length;
    const sairam = total - ativos;
    const retencao = total > 0 ? ((ativos / total) * 100).toFixed(1) : '0';
    return { total, ativos, sairam, retencao };
  }, [combinedFiltered]);

  const searchFiltered = useMemo(() => {
    if (!search.trim()) return combinedFiltered;
    const q = search.toLowerCase();
    return combinedFiltered.filter(
      (l) =>
        (l.nome && l.nome.toLowerCase().includes(q)) ||
        l.telefone.includes(q)
    );
  }, [combinedFiltered, search]);

  const totalPages = Math.max(1, Math.ceil(searchFiltered.length / ITEMS_PER_PAGE));
  const paginatedData = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return searchFiltered.slice(start, start + ITEMS_PER_PAGE);
  }, [searchFiltered, page]);

  useEffect(() => {
    setPage(1);
  }, [selectedGroup, filterOrigem, filterStatus, dateFrom, dateTo, search]);

  const startItem = searchFiltered.length === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(page * ITEMS_PER_PAGE, searchFiltered.length);

  const hasActiveFilters = filterOrigem !== 'all' || filterStatus !== 'all' || dateFrom !== null || dateTo !== null || search !== '';

  const clearAllFilters = () => {
    setFilterOrigem('all');
    setFilterStatus('all');
    setDateFrom(null);
    setDateTo(null);
    setSearch('');
  };

  const openReportModal = async () => {
    setReportModalOpen(true);
    setSendViaWhatsapp(false);
    setWhatsappNumero('');
    setWhatsappInstancia('');
    setLoadingInstancias(true);
    try {
      const { data } = await supabase
        .from('whatsapp_rotacao')
        .select('id, nome, numero, instancia, token')
        .eq('ativo', true)
        .order('ordem');
      setInstancias(data || []);
    } catch {
      setInstancias([]);
    } finally {
      setLoadingInstancias(false);
    }
  };

  const handleGerarRelatorio = async () => {
    setSendingReport(true);
    try {
      const selectedGroupName = selectedGroup === 'all'
        ? 'Todos os grupos'
        : groups.find(([id]) => id === selectedGroup)?.[1] || 'Grupo desconhecido';

      const selectedInst = instancias.find(i => i.instancia === whatsappInstancia);

      const payload = {
        tipo: 'relatorio_grupo',
        gerado_em: new Date().toISOString(),
        filtros: {
          grupo: selectedGroupName,
          id_grupo: selectedGroup === 'all' ? null : selectedGroup,
          origem: filterOrigem === 'all' ? 'Todas' : filterOrigem,
          status: filterStatus === 'all' ? 'Todos' : filterStatus,
          periodo_inicio: dateFrom ? dateFrom.toISOString() : null,
          periodo_fim: dateTo ? dateTo.toISOString() : null,
          busca: search.trim() || null,
        },
        resumo: {
          total_membros: stats.total,
          ativos: stats.ativos,
          sairam: stats.sairam,
          taxa_retencao: parseFloat(stats.retencao as string),
        },
        envio_whatsapp: sendViaWhatsapp
          ? {
              enviar: true,
              numero_destino: whatsappNumero,
              instancia: whatsappInstancia,
              token_instancia: selectedInst?.token || null,
              numero_instancia: selectedInst?.numero || null,
            }
          : {
              enviar: false,
              numero_destino: null,
              instancia: null,
              token_instancia: null,
              numero_instancia: null,
            },
        membros: searchFiltered.map((l) => ({
          id: l.id,
          nome: l.nome || null,
          telefone: l.telefone,
          origem: l.origem,
          observacoes: l.observacoes || null,
          id_grupo: l.id_grupo,
          nome_grupo: l.nome_grupo,
          entrou_no_grupo: l.entrou_no_grupo,
          saiu_grupo: l.saiu_grupo || null,
          status_grupo: l.saiu_grupo ? 'saiu' : 'ativo',
        })),
      };

      const res = await fetchWithTimeout(WEBHOOKS.RELATORIO_GRUPO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Status ${res.status}`);
      setReportModalOpen(false);
      showToast('success', 'Relatorio gerado com sucesso!');
    } catch {
      showToast('error', 'Erro ao gerar relatorio');
    } finally {
      setSendingReport(false);
    }
  };

  const canSubmitReport = !sendViaWhatsapp || (whatsappNumero.trim() !== '' && whatsappInstancia !== '');

  const fetchInstanciasCb = useCallback(() => moderacao.fetchInstanciasColeta(), [moderacao]);
  const fetchGruposWppCb = useCallback((inst: string, token: string) => moderacao.fetchGruposWhatsapp(inst, token), [moderacao.fetchGruposWhatsapp]);

  // ── Segurança handlers ──
  const segConectados = instanciasSeguranca.filter((n) => n.status_conexao === 'connected').length;
  const segDesconectados = instanciasSeguranca.filter((n) => n.status_conexao === 'disconnected' || !n.status_conexao).length;

  const handleSegToggleAtivo = async (id: number, ativo: boolean) => {
    const erro = await toggleAtivoSeguranca(id, ativo);
    if (erro) showToast('error', erro);
    else showToast('success', ativo ? 'Instância ativada!' : 'Instância desativada!');
  };

  const handleSegCriarInstancia = async (nome: string, numero: string) => {
    const result = await criarInstanciaSeguranca(nome, numero, segNovaTipo);
    if (result.sucesso) {
      const label = segNovaTipo === 'antihack' ? 'Anti-Hack' : 'Segurança';
      showToast('success', `Instância ${label} criada! Aguardando pareamento...`);
      fetchSegurancaData(false);
    }
    return result;
  };

  const handleSegSaveNumero = async (data: { nome: string; numero: string; instancia: string; ordem: number }) => {
    if (segEditModal.numero) {
      const erro = await editarSeguranca(segEditModal.numero.id, data);
      if (erro) { showToast('error', erro); return; }
      showToast('success', 'Instância atualizada!');
    }
    setSegEditModal({ open: false, numero: null });
  };

  const handleSegDeleteNumero = async () => {
    if (!segDeleteModal) return;
    const erro = await excluirSeguranca(segDeleteModal.id, segDeleteModal);
    if (erro) { showToast('error', erro); return; }
    showToast('success', 'Instância excluída!');
    setSegDeleteModal(null);
  };

  const handleSegReconectar = async (id: number) => {
    const result = await reconectarSeguranca(id);
    if (result.sucesso) {
      showToast('success', result.mensagem || 'Reconexão iniciada!');
    } else {
      showToast('error', result.mensagem || 'Erro ao reconectar');
    }
    return result;
  };

  const handleSegMoveUp = async (numero: WhatsappRotacao) => {
    const idx = instanciasSeguranca.findIndex((n) => n.id === numero.id);
    if (idx <= 0) return;
    const erro = await trocarOrdemSeguranca(numero.id, instanciasSeguranca[idx - 1].id);
    if (erro) showToast('error', erro);
  };

  const handleSegMoveDown = async (numero: WhatsappRotacao) => {
    const idx = instanciasSeguranca.findIndex((n) => n.id === numero.id);
    if (idx < 0 || idx >= instanciasSeguranca.length - 1) return;
    const erro = await trocarOrdemSeguranca(numero.id, instanciasSeguranca[idx + 1].id);
    if (erro) showToast('error', erro);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="mb-8">
          <div className="h-9 w-40 bg-white/[0.04] rounded-lg animate-pulse" />
          <div className="h-5 w-80 bg-white/[0.04] rounded-lg animate-pulse mt-2" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white/[0.03] border border-white/[0.04] rounded-2xl p-6 h-[140px] animate-pulse" />
          ))}
        </div>
        <div className="bg-white/[0.03] border border-white/[0.04] rounded-2xl p-6 mt-6">
          <div className="h-10 w-full max-w-[400px] bg-white/[0.04] rounded-lg animate-pulse mb-4" />
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-12 w-full bg-white/[0.04] rounded-lg animate-pulse mb-2" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && <Toast toast={toast} onClose={hideToast} />}

      {/* Header */}
      <div>
        <h1 className="text-[22px] font-bold text-white font-display tracking-tight">Grupos</h1>
        <p className="text-[13px] mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Gerencie membros, moderação e configurações dos grupos</p>
      </div>

      {/* ═══ Main Tabs — Glass Pill Selector ═══ */}
      <div
        className="flex flex-wrap md:inline-flex gap-1 p-1 rounded-[14px] w-full md:w-fit mb-2"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}
      >
        {([
          { key: 'membros' as MainTab, label: 'Membros', icon: Users, gate: gMembros, activeStyle: { background: 'rgba(var(--color-primary-rgb),0.1)', border: '1px solid rgba(var(--color-primary-rgb),0.2)', color: 'var(--color-primary-light)' } },
          { key: 'moderacao' as MainTab, label: 'Moderação', icon: Shield, gate: 'enabled' as SectionState, activeStyle: { background: 'rgba(250,204,21,0.1)', border: '1px solid rgba(250,204,21,0.25)', color: '#facc15' } },
          { key: 'configuracao' as MainTab, label: 'Configuração', icon: Settings, gate: 'enabled' as SectionState, activeStyle: { background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' } },
          { key: 'bots' as MainTab, label: 'Bots', icon: Bot, gate: gBots, activeStyle: { background: 'rgba(var(--color-primary-rgb),0.1)', border: '1px solid rgba(var(--color-primary-rgb),0.2)', color: 'var(--color-primary-light)' } },
        ]).filter((tab) => tab.gate !== 'hidden').map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              if (tab.gate === 'disabled') { showToast('error', 'Funcionalidade não disponível no seu plano'); return; }
              setMainTab(tab.key);
            }}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-[10px] text-[13px] font-medium transition-all duration-250"
            style={mainTab === tab.key
              ? tab.activeStyle
              : { background: 'transparent', border: '1px solid transparent', color: tab.gate === 'disabled' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.45)' }
            }
            onMouseEnter={(e) => { if (mainTab !== tab.key) { e.currentTarget.style.color = tab.gate === 'disabled' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.65)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' } }}
            onMouseLeave={(e) => { if (mainTab !== tab.key) { e.currentTarget.style.color = tab.gate === 'disabled' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.45)'; e.currentTarget.style.background = 'transparent' } }}
          >
            <tab.icon className="w-4 h-4" style={{ opacity: mainTab === tab.key ? 1 : 0.45 }} />
            {tab.label}
            {tab.gate === 'disabled' && <Lock className="w-3 h-3" style={{ color: '#facc15', opacity: 0.6 }} />}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* ═══ TAB: MEMBROS (original content) ═══ */}
      {/* ═══════════════════════════════════════════ */}
      {mainTab === 'membros' && (
        <>
          {/* Modal Gerar Relatório */}
          {reportModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} onClick={() => !sendingReport && setReportModalOpen(false)}>
              <div
                className="relative rounded-2xl p-8 max-w-[480px] w-full mx-4 shadow-2xl"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div>
                  <h2 className="text-xl font-bold text-white">Gerar Relatório</h2>
                  <p className="text-sm text-white/40 mt-1">O relatório será gerado com os filtros atuais</p>
                </div>

                <div className="mt-5 bg-white/[0.02] border border-white/[0.04] rounded-[10px] p-4 space-y-1.5">
                  <p className="text-sm text-white/50">
                    Grupo: <span className="text-white">{selectedGroup === 'all' ? 'Todos' : groups.find(([id]) => id === selectedGroup)?.[1] || 'Desconhecido'}</span>
                  </p>
                  <p className="text-sm text-white/50">
                    Origem: <span className="text-white">{filterOrigem === 'all' ? 'Todas' : capitalize(filterOrigem)}</span>
                  </p>
                  <p className="text-sm text-white/50">
                    Status: <span className="text-white">{filterStatus === 'all' ? 'Todos' : filterStatus === 'ativo' ? 'Ativo' : 'Saiu'}</span>
                  </p>
                  {(dateFrom || dateTo) && (
                    <p className="text-sm text-white/50">
                      Período: <span className="text-white">{dateFrom ? format(dateFrom, 'dd/MM/yyyy') : '...'} até {dateTo ? format(dateTo, 'dd/MM/yyyy') : '...'}</span>
                    </p>
                  )}
                  <p className="text-sm text-white/50">
                    Total de membros: <span className="text-white font-semibold">{searchFiltered.length}</span>
                  </p>
                </div>

                <div className="mt-5">
                  <button
                    type="button"
                    onClick={() => setSendViaWhatsapp(!sendViaWhatsapp)}
                    className="flex items-center gap-3 w-full"
                  >
                    <div className={cn(
                      "relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0",
                      sendViaWhatsapp ? "bg-primary" : "bg-[#2a2a2a]"
                    )}>
                      <div className={cn(
                        "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow-sm",
                        sendViaWhatsapp ? "translate-x-[22px]" : "translate-x-1"
                      )} />
                    </div>
                    <span className="text-sm font-medium text-white">Enviar relatório via WhatsApp</span>
                  </button>

                  <div className={cn(
                    "overflow-hidden transition-all duration-300",
                    sendViaWhatsapp ? "max-h-[200px] mt-4 opacity-100" : "max-h-0 mt-0 opacity-0"
                  )}>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-white/40 uppercase tracking-wide font-semibold mb-1.5 block">Número do destinatário</label>
                        <input
                          type="text"
                          value={whatsappNumero}
                          onChange={(e) => setWhatsappNumero(e.target.value)}
                          placeholder="5524999999999"
                          className="w-full bg-white/[0.04] border border-white/[0.04] text-white rounded-lg py-2.5 px-3.5 text-sm placeholder-[#4b5563] focus:outline-none focus:border-primary/50 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-white/40 uppercase tracking-wide font-semibold mb-1.5 block">Instância de envio</label>
                        {loadingInstancias ? (
                          <div className="flex items-center gap-2 text-white/40 text-sm py-2.5 px-3.5">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Carregando instâncias...
                          </div>
                        ) : (
                          <CustomSelect
                            value={whatsappInstancia}
                            onChange={setWhatsappInstancia}
                            options={[{ value: '', label: 'Selecione uma instância' }, ...instancias.map(inst => ({ value: inst.instancia, label: `${inst.nome} (${inst.numero})` }))]}
                            placeholder="Selecione uma instância"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setReportModalOpen(false)}
                    disabled={sendingReport}
                    className="px-5 py-2.5 bg-transparent border border-white/[0.04] text-white/50 rounded-lg text-sm transition-colors hover:bg-white/[0.04] hover:text-white disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleGerarRelatorio}
                    disabled={sendingReport || !canSubmitReport}
                    className={cn(
                      "flex items-center gap-2 bg-primary text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-all duration-200",
                      sendingReport || !canSubmitReport
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:brightness-110 active:scale-[0.98]"
                    )}
                  >
                    {sendingReport ? (
                      <>
                        <Loader2 className="w-[18px] h-[18px] animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <FileDown className="w-[18px] h-[18px]" />
                        Gerar Relatório
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Membros Header + Report Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <CustomSelect
                value={selectedGroup}
                onChange={setSelectedGroup}
                options={[{ value: 'all', label: 'Todos os grupos' }, ...groups.map(([id, name]) => ({ value: id, label: name }))]}
              />
              <span
                className="rounded-full px-3.5 py-1.5 text-[12px] font-semibold tabular-nums"
                style={{ background: 'rgba(var(--color-primary-rgb),0.12)', border: '1px solid rgba(var(--color-primary-rgb),0.2)', color: 'var(--color-primary-light)' }}
              >
                {stats.total} membros
              </span>
            </div>
            <button
              onClick={openReportModal}
              disabled={searchFiltered.length === 0}
              className="flex items-center gap-2 text-[13px] font-medium transition-all duration-200 shrink-0"
              style={{
                background: 'rgba(var(--color-primary-rgb),0.12)',
                border: '1px solid rgba(var(--color-primary-rgb),0.25)',
                color: 'var(--color-primary-light)',
                padding: '10px 20px',
                borderRadius: '12px',
                opacity: searchFiltered.length === 0 ? 0.5 : 1,
                cursor: searchFiltered.length === 0 ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => { if (searchFiltered.length > 0) { e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.2)'; e.currentTarget.style.borderColor = 'rgba(var(--color-primary-rgb),0.35)' } }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.12)'; e.currentTarget.style.borderColor = 'rgba(var(--color-primary-rgb),0.25)' }}
            >
              <FileDown className="w-[18px] h-[18px]" />
              Gerar Relatório
            </button>
          </div>

          {/* Cards Resumo — Glass */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { icon: Users, label: 'Total de Membros', value: stats.total, suffix: '', iconBg: 'rgba(var(--color-primary-rgb),0.12)', iconColor: 'var(--color-primary-light)', valueColor: '#fff' },
              { icon: UserCheck, label: 'Ativos no Grupo', value: stats.ativos, suffix: '', iconBg: 'var(--color-primary-bg)', iconColor: 'var(--color-primary-light)', valueColor: 'var(--color-primary-light)' },
              { icon: UserMinus, label: 'Saíram do Grupo', value: stats.sairam, suffix: '', iconBg: 'rgba(248,113,113,0.12)', iconColor: '#f87171', valueColor: '#f87171' },
              { icon: TrendingUp, label: 'Taxa de Retenção', value: stats.retencao, suffix: '%', iconBg: 'rgba(234,179,8,0.12)', iconColor: '#facc3c', valueColor: '#facc3c' },
            ].map((card, i) => (
              <div
                key={i}
                className="p-5 transition-all duration-300"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  borderRadius: '16px',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: card.iconBg }}>
                  <card.icon className="w-[18px] h-[18px]" style={{ color: card.iconColor }} />
                </div>
                <p className="text-[11px] uppercase tracking-[0.5px] font-semibold mt-4" style={{ color: 'rgba(255,255,255,0.45)' }}>{card.label}</p>
                <p className="font-bold text-[28px] mt-1 tabular-nums" style={{ color: card.valueColor, fontVariantNumeric: 'tabular-nums' }}>{card.value}{card.suffix}</p>
              </div>
            ))}
          </div>

          {/* Tabela de Membros */}
          <div
            className="p-6"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '16px' }}
          >
            <div className="flex items-center gap-3 flex-wrap items-stretch">
              <div className="relative max-w-[280px] flex-1 min-w-[200px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.25)' }} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nome ou telefone..."
                  className="w-full text-[13px] text-white outline-none transition-all duration-200"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.04)',
                    borderRadius: '10px',
                    padding: '8px 14px 8px 36px',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(var(--color-primary-rgb),0.3)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(var(--color-primary-rgb),0.08)' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.boxShadow = 'none' }}
                />
              </div>

              <div className="w-px h-6 bg-white/[0.06] self-center" />

              <FilterDropdown
                label="Origem"
                value={filterOrigem}
                allLabel="Todas"
                options={origens.map(o => ({ value: o, label: capitalize(o) }))}
                onChange={setFilterOrigem}
                icon={<Filter className="w-3 h-3 text-txt-dim" />}
              />

              <div className="w-px h-6 bg-white/[0.06] self-center" />

              <FilterDropdown
                label="Status"
                value={filterStatus}
                allLabel="Todos"
                options={[
                  { value: 'ativo', label: 'Ativo' },
                  { value: 'saiu', label: 'Saiu' },
                ]}
                onChange={setFilterStatus}
                icon={<CircleDot className="w-3 h-3 text-txt-dim" />}
              />

              <div className="w-px h-6 bg-white/[0.06] self-center" />

              <div className="flex items-center gap-2 text-[11px] font-mono">
                <Calendar className="w-3 h-3 text-txt-dim" />

                <div className="relative">
                  <button
                    onClick={() => { setStartPickerOpen(!startPickerOpen); setEndPickerOpen(false); }}
                    className={cn(
                      "px-2 py-1 rounded-lg transition-all duration-200 tabular-nums",
                      startPickerOpen
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : dateFrom
                        ? "text-txt-secondary hover:text-txt hover:bg-white/[0.03] border border-transparent"
                        : "text-txt-dim hover:text-txt-secondary hover:bg-white/[0.03] border border-transparent"
                    )}
                  >
                    {dateFrom ? format(dateFrom, 'dd/MM') : 'Início'}
                  </button>
                  {startPickerOpen && (
                    <DayPicker
                      selectedDate={dateFrom || new Date()}
                      onSelect={(d) => {
                        setDateFrom(d);
                        if (dateTo && dateTo < d) setDateTo(d);
                      }}
                      onClose={() => setStartPickerOpen(false)}
                      label="Data início"
                    />
                  )}
                </div>

                <span className="text-txt-dim">—</span>

                <div className="relative">
                  <button
                    onClick={() => { setEndPickerOpen(!endPickerOpen); setStartPickerOpen(false); }}
                    className={cn(
                      "px-2 py-1 rounded-lg transition-all duration-200 tabular-nums",
                      endPickerOpen
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : dateTo
                        ? "text-txt-secondary hover:text-txt hover:bg-white/[0.03] border border-transparent"
                        : "text-txt-dim hover:text-txt-secondary hover:bg-white/[0.03] border border-transparent"
                    )}
                  >
                    {dateTo ? format(dateTo, 'dd/MM') : 'Fim'}
                  </button>
                  {endPickerOpen && (
                    <DayPicker
                      selectedDate={dateTo || new Date()}
                      onSelect={(d) => {
                        setDateTo(d);
                        if (dateFrom && dateFrom > d) setDateFrom(d);
                      }}
                      onClose={() => setEndPickerOpen(false)}
                      label="Data fim"
                    />
                  )}
                </div>

                {(dateFrom || dateTo) && (
                  <button
                    onClick={() => { setDateFrom(null); setDateTo(null); }}
                    className="p-1 text-txt-dim hover:text-white transition-colors"
                    title="Limpar período"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="text-primary text-sm hover:underline cursor-pointer ml-auto shrink-0"
                >
                  Limpar filtros
                </button>
              )}
            </div>

            {searchFiltered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Users className="w-12 h-12 mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
                <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Nenhum membro encontrado</p>
              </div>
            ) : (
              <>
                <div className="mt-4 overflow-x-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.04) transparent' }}>
                  <table className="w-full min-w-[900px]">
                    <thead>
                      <tr>
                        {['Nome', 'Telefone', 'Grupo', 'Status', 'Origem', 'Observação', 'Entrada', 'Saída'].map((h) => (
                          <th
                            key={h}
                            className="text-left text-[11px] uppercase font-semibold tracking-[0.5px] px-4 py-3 sticky top-0 z-10"
                            style={{ color: 'rgba(255,255,255,0.4)', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(10,10,15,0.9)' }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData.map((lead) => (
                        <tr
                          key={lead.id}
                          className="transition-colors duration-200"
                          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                        >
                          <td className="px-4 py-3.5 text-[13px]">
                            {lead.nome ? (
                              <span className="text-white font-medium">{lead.nome}</span>
                            ) : (
                              <span className="italic" style={{ color: 'rgba(255,255,255,0.35)' }}>Sem nome</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-[13px] font-mono tabular-nums" style={{ color: 'rgba(255,255,255,0.5)' }}>
                            {formatTelefone(lead.telefone)}
                          </td>
                          <td className="px-4 py-3.5 text-[13px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                            {lead.nome_grupo ? (
                              <span>{lead.nome_grupo}</span>
                            ) : (
                              <span style={{ color: 'rgba(255,255,255,0.15)' }}>—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            {!lead.saiu_grupo ? (
                              <span
                                className="inline-block px-2.5 py-1 rounded-md text-[11px] font-medium"
                                style={{ background: 'var(--color-primary-bg)', color: 'var(--color-primary-light)', border: '1px solid var(--color-primary-bg)' }}
                              >
                                Ativo
                              </span>
                            ) : (
                              <span
                                className="inline-block px-2.5 py-1 rounded-md text-[11px] font-medium"
                                style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}
                              >
                                Saiu
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-[13px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                            {capitalize(lead.origem)}
                          </td>
                          <td className="px-4 py-3.5">
                            {lead.observacoes ? (
                              <span
                                className="text-[12px] block max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap"
                                style={{ color: 'rgba(255,255,255,0.4)' }}
                                title={lead.observacoes}
                              >
                                {lead.observacoes}
                              </span>
                            ) : (
                              <span style={{ color: 'rgba(255,255,255,0.15)' }}>—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-[12px] whitespace-nowrap tabular-nums" style={{ color: 'rgba(255,255,255,0.35)' }}>
                            {formatDate(lead.entrou_no_grupo)}
                          </td>
                          <td className="px-4 py-3.5 text-[12px] whitespace-nowrap tabular-nums">
                            {lead.saiu_grupo ? (
                              <span style={{ color: 'rgba(255,255,255,0.35)' }}>{formatDate(lead.saiu_grupo)}</span>
                            ) : (
                              <span style={{ color: 'rgba(255,255,255,0.15)' }}>—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <span className="text-[12px] font-mono tabular-nums" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Mostrando {startItem}–{endItem} de {searchFiltered.length} membros
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="flex items-center gap-1.5 text-white px-4 py-2 rounded-lg text-[13px] transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)' }}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Anterior
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="flex items-center gap-1.5 text-white px-4 py-2 rounded-lg text-[13px] transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)' }}
                    >
                      Próximo
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* ═══ TAB: MODERAÇÃO ═══ */}
      {/* ═══════════════════════════════════════════ */}
      {mainTab === 'moderacao' && (
        <>
          {/* Sub-tabs — Glass Pill */}
          <div className="block">
          <div
            className="inline-flex gap-1 p-[3px] rounded-xl w-fit"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}
          >
            {([
              { key: 'grupos' as ModeracaoSubTab, label: 'Grupos Monitorados', gate: gModGrupos },
              { key: 'log' as ModeracaoSubTab, label: 'Log de Ações', gate: gModLog },
              { key: 'instancia' as ModeracaoSubTab, label: 'Instância', gate: gModInstancia },
              { key: 'fechar-abrir' as ModeracaoSubTab, label: 'Fechar/Abrir', gate: gFecharAbrir },
            ]).filter((tab) => tab.gate !== 'hidden').map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  if (tab.gate === 'disabled') { showToast('error', 'Funcionalidade não disponível no seu plano'); return; }
                  setModSubTab(tab.key);
                }}
                className="px-4 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-200 flex items-center gap-1.5"
                style={modSubTab === tab.key
                  ? { background: 'rgba(var(--color-primary-rgb),0.1)', border: '1px solid rgba(var(--color-primary-rgb),0.2)', color: 'var(--color-primary-light)' }
                  : { background: 'transparent', border: '1px solid transparent', color: tab.gate === 'disabled' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.4)' }
                }
                onMouseEnter={(e) => { if (modSubTab !== tab.key) { e.currentTarget.style.color = tab.gate === 'disabled' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.6)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' } }}
                onMouseLeave={(e) => { if (modSubTab !== tab.key) { e.currentTarget.style.color = tab.gate === 'disabled' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'transparent' } }}
              >
                {tab.label}
                {tab.gate === 'disabled' && <Lock className="w-3 h-3" style={{ color: '#facc15', opacity: 0.6 }} />}
              </button>
            ))}
          </div>
          </div>

          {/* ─── Sub-tab: Grupos Monitorados ─── */}
          {modSubTab === 'grupos' && (
            <>
              {/* Card Ações Hoje */}
              <div
                className="flex items-center gap-3.5 px-5 py-4"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '14px' }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(var(--color-primary-rgb),0.12)', border: '1px solid rgba(var(--color-primary-rgb),0.2)' }}
                >
                  <Shield className="w-5 h-5" style={{ color: 'var(--color-primary-light)' }} />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.5px] font-semibold" style={{ color: 'rgba(255,255,255,0.45)' }}>Ações Hoje</p>
                  <p className="text-white font-bold text-[24px] tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>{moderacao.acoesHoje}</p>
                </div>
              </div>

              <p className="text-[13px] max-w-[800px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Grupos com moderação automática ativa. O segurança analisa mensagens de texto, áudio e imagem, remove violações e expulsa membros reincidentes.
              </p>

              {/* Número para Notificações (global) */}
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}
              >
                <Phone className="w-4 h-4 shrink-0" style={{ color: 'var(--color-primary-light)', opacity: 0.6 }} />
                <div className="flex-1 min-w-0">
                  <label className="text-white/50 text-[11px] font-medium block mb-1">Número para Notificações</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={numNotificacao}
                      onChange={(e) => setNumNotificacao(e.target.value.replace(/[^\d]/g, '').slice(0, 15))}
                      placeholder="5524992136800"
                      className="flex-1 bg-white/[0.02] border border-white/[0.04] text-white rounded-lg py-1.5 px-3 text-[13px] font-mono placeholder-white/20 focus:outline-none focus:border-primary/40 transition-colors"
                    />
                    <button
                      onClick={salvarNumNotificacao}
                      disabled={numNotificacaoSaving}
                      className="shrink-0 px-3.5 py-1.5 text-[11px] font-semibold rounded-lg transition-all disabled:opacity-50"
                      style={{ background: 'rgba(var(--color-primary-rgb),0.12)', border: '1px solid rgba(var(--color-primary-rgb),0.25)', color: 'var(--color-primary-light)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.2)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.12)' }}
                    >
                      {numNotificacaoSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Salvar'}
                    </button>
                  </div>
                  <p className="text-white/20 text-[10px] mt-1 leading-relaxed">
                    Recebe alertas quando o segurança moderar uma mensagem. Deixe vazio para desativar.
                  </p>
                </div>
              </div>

              {/* Mensagem Anti-Hack (global) */}
              <div
                className="flex gap-3 px-4 py-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}
              >
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#fbbf24', opacity: 0.6 }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-white/50 text-[11px] font-medium">Mensagem Anti-Hack</label>
                    <button
                      onClick={salvarMsgHack}
                      disabled={msgHackSaving}
                      className="shrink-0 px-3.5 py-1.5 text-[11px] font-semibold rounded-lg transition-all disabled:opacity-50"
                      style={{ background: 'rgba(var(--color-primary-rgb),0.12)', border: '1px solid rgba(var(--color-primary-rgb),0.25)', color: 'var(--color-primary-light)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.2)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.12)' }}
                    >
                      {msgHackSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Salvar'}
                    </button>
                  </div>
                  <textarea
                    value={msgHack}
                    onChange={(e) => setMsgHack(e.target.value)}
                    placeholder="Mensagem enviada no grupo quando um hack é detectado..."
                    rows={4}
                    className="w-full bg-white/[0.02] border border-white/[0.04] text-white rounded-lg py-2 px-3 text-[13px] placeholder-white/20 focus:outline-none focus:border-primary/40 transition-colors resize-none"
                  />
                  <p className="text-white/20 text-[10px] mt-1 leading-relaxed">
                    Mensagem automática enviada no grupo ao detectar golpe. Aplicada a todos os grupos. Deixe vazio para não enviar alerta. Suporta formatação: <strong className="text-white/30">*negrito*</strong> <em className="text-white/30">_itálico_</em> <span className="text-white/30 line-through">~tachado~</span>
                  </p>
                </div>
              </div>

              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  type="text"
                  value={buscaGrupoMod}
                  onChange={(e) => setBuscaGrupoMod(e.target.value)}
                  placeholder="Buscar grupo pelo nome..."
                  className="w-full bg-white/[0.03] border border-white/[0.04] text-white rounded-xl py-2.5 pl-10 pr-10 text-[13px] placeholder-[#4b5563] focus:outline-none focus:border-primary/40 transition-colors"
                />
                {buscaGrupoMod && (
                  <button
                    onClick={() => setBuscaGrupoMod('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Loading */}
              {moderacao.loading ? (
                <div className="space-y-4">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="bg-white/[0.03] border border-white/[0.04] rounded-2xl p-6 h-[200px] animate-pulse" />
                  ))}
                </div>
              ) : (
                <>
                  {/* Ativar/Desativar todos */}
                  {moderacao.grupos.length > 0 && (
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={async () => {
                          for (const g of moderacao.grupos) {
                            if (!g.ativo) await moderacao.updateGrupo(g.id, { ativo: true });
                          }
                          showToast('success', 'Todos os grupos ativados!');
                        }}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-200"
                        style={{ background: 'transparent', border: '1px solid var(--color-primary-bg)', color: 'var(--color-primary-light)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-primary-bg)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                      >
                        Ativar todos
                      </button>
                      <button
                        onClick={async () => {
                          for (const g of moderacao.grupos) {
                            if (g.ativo) await moderacao.updateGrupo(g.id, { ativo: false });
                          }
                          showToast('success', 'Todos os grupos desativados!');
                        }}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-200"
                        style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                      >
                        Desativar todos
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm('Tem certeza que deseja apagar TODOS os grupos monitorados? Esta ação não pode ser desfeita.')) return;
                          for (const g of moderacao.grupos) {
                            await moderacao.deleteGrupo(g.id);
                          }
                          showToast('success', 'Todos os grupos foram apagados!');
                        }}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-200"
                        style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                      >
                        Apagar todos
                      </button>
                      <button
                        onClick={() => {
                          setShowRegrasEmMassa(prev => {
                            if (!prev && moderacao.grupos.length > 0) {
                              // Pre-carrega valores do primeiro grupo ao abrir
                              const ref = moderacao.grupos[0];
                              setRegrasEmMassa({ ...ref.regras_ativas });
                              setEnviarAvisoEmMassa(ref.enviar_aviso);
                              setBloquearInternacionaisEmMassa(ref.bloquear_internacionais);
                              setStrikesEmMassa(ref.strikes_para_expulsao);
                              setMensagemAvisoEmMassa(ref.mensagem_aviso);
                              setMensagemExpulsaoEmMassa(ref.mensagem_expulsao);
                              setCasasEmMassa([...ref.casas_permitidas]);
                              setPerfisEmMassa([...ref.perfis_permitidos]);
                              setLinksEmMassa([...ref.links_permitidos]);
                              setContextoEmMassa(ref.contexto_extra || '');
                              setAplicarWhitelists(false);
                            }
                            return !prev;
                          });
                        }}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-200"
                        style={{ background: showRegrasEmMassa ? 'rgba(var(--color-primary-rgb),0.12)' : 'transparent', border: '1px solid rgba(var(--color-primary-rgb),0.25)', color: 'var(--color-primary-light)' }}
                        onMouseEnter={(e) => { if (!showRegrasEmMassa) e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.08)' }}
                        onMouseLeave={(e) => { if (!showRegrasEmMassa) e.currentTarget.style.background = 'transparent' }}
                      >
                        <Settings className="w-3.5 h-3.5" />
                        Regras em massa
                      </button>
                    </div>
                  )}

                  {/* Painel de Regras em Massa */}
                  {showRegrasEmMassa && moderacao.grupos.length > 0 && (
                    <div
                      className="rounded-2xl p-5 space-y-5"
                      style={{ background: 'rgba(var(--color-primary-rgb),0.04)', border: '1px solid rgba(var(--color-primary-rgb),0.12)' }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-semibold text-[14px]">Configurar todos os grupos em massa</p>
                          <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                            Aplicar configurações a todos os {moderacao.grupos.length} grupos de uma vez
                          </p>
                        </div>
                        <button onClick={() => setShowRegrasEmMassa(false)} className="text-white/40 hover:text-white/70 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Regras de moderação */}
                      <div>
                        <p className="text-white/40 text-[10px] uppercase tracking-[1.5px] font-semibold mb-2.5">Regras de Moderação</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {([
                            { key: 'links_spam' as keyof RegrasAtivas, label: 'Links/Spam' },
                            { key: 'palavroes' as keyof RegrasAtivas, label: 'Palavrões' },
                            { key: 'adulto' as keyof RegrasAtivas, label: 'Adulto' },
                            { key: 'propaganda' as keyof RegrasAtivas, label: 'Propaganda' },
                            { key: 'captacao_leads' as keyof RegrasAtivas, label: 'Captação de Leads' },
                            { key: 'religiao' as keyof RegrasAtivas, label: 'Religião' },
                            { key: 'politica' as keyof RegrasAtivas, label: 'Política' },
                          ]).map((r) => (
                            <div
                              key={r.key}
                              className="flex items-center justify-between rounded-[10px] px-4 py-3"
                              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                            >
                              <span className="text-white text-[13px] font-medium">{r.label}</span>
                              <Toggle
                                checked={regrasEmMassa[r.key]}
                                onChange={(val) => setRegrasEmMassa(prev => ({ ...prev, [r.key]: val }))}
                                color="bg-primary"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Mensagens */}
                      <div>
                        <p className="text-white/40 text-[10px] uppercase tracking-[1.5px] font-semibold mb-2.5">Mensagens</p>
                        <div className="flex items-center justify-between rounded-[10px] px-4 py-3 mb-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <span className="text-white text-[13px] font-medium">Enviar aviso após remoção de mensagem</span>
                          <Toggle checked={enviarAvisoEmMassa} onChange={setEnviarAvisoEmMassa} color="bg-primary" />
                        </div>
                        <div className="rounded-[10px] px-4 py-3 mb-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div className="flex items-center justify-between">
                            <span className="text-white text-[13px] font-medium">Bloquear números internacionais</span>
                            <Toggle checked={bloquearInternacionaisEmMassa} onChange={setBloquearInternacionaisEmMassa} color="bg-primary" />
                          </div>
                          <p className="text-[11px] text-white/25 mt-1.5 leading-relaxed">Remove automaticamente membros com números que não começam com 55 (Brasil) ao entrar no grupo</p>
                        </div>
                        <div className={`space-y-3 transition-all duration-200 ${!enviarAvisoEmMassa ? 'opacity-40 pointer-events-none select-none' : ''}`}>
                          <div>
                            <label className="text-white/50 text-[11px] mb-1 block">Mensagem de Aviso</label>
                            <textarea
                              ref={avisoEmMassaRef}
                              value={mensagemAvisoEmMassa}
                              onChange={(e) => setMensagemAvisoEmMassa(e.target.value)}
                              rows={3}
                              className="w-full bg-white/[0.02] border border-white/[0.04] text-white rounded-lg py-2.5 px-3.5 text-[13px] placeholder-[#4b5563] focus:outline-none focus:border-primary/40 transition-colors resize-none"
                            />
                            <VariableButtons textareaRef={avisoEmMassaRef} value={mensagemAvisoEmMassa} onChange={setMensagemAvisoEmMassa} />
                          </div>
                          <div>
                            <label className="text-white/50 text-[11px] mb-1 block">Mensagem de Expulsão</label>
                            <textarea
                              ref={expulsaoEmMassaRef}
                              value={mensagemExpulsaoEmMassa}
                              onChange={(e) => setMensagemExpulsaoEmMassa(e.target.value)}
                              rows={3}
                              className="w-full bg-white/[0.02] border border-white/[0.04] text-white rounded-lg py-2.5 px-3.5 text-[13px] placeholder-[#4b5563] focus:outline-none focus:border-primary/40 transition-colors resize-none"
                            />
                            <VariableButtons textareaRef={expulsaoEmMassaRef} value={mensagemExpulsaoEmMassa} onChange={setMensagemExpulsaoEmMassa} />
                          </div>
                        </div>
                      </div>

                      {/* Strikes */}
                      <div>
                        <p className="text-white/40 text-[10px] uppercase tracking-[1.5px] font-semibold mb-2.5">Strikes</p>
                        <div className="flex items-center gap-3">
                          <label className="text-white/50 text-[12px]">Strikes para expulsão</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={strikesEmMassa}
                            onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); setStrikesEmMassa(v === '' ? 0 : Number(v)); }}
                            className="w-16 text-center rounded-lg py-1 text-[13px] font-medium text-white [appearance:textfield] outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                          />
                        </div>
                        <p className="text-white/20 text-[11px] mt-1">Número de violações antes da expulsão</p>
                      </div>

                      {/* Whitelists */}
                      <div>
                        <div className="flex items-center justify-between mb-2.5">
                          <p className="text-white/40 text-[10px] uppercase tracking-[1.5px] font-semibold">Whitelists</p>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <span className="text-white/40 text-[11px]">Sobrescrever whitelists</span>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={aplicarWhitelists}
                              onClick={() => setAplicarWhitelists(!aplicarWhitelists)}
                              className={`relative w-9 h-5 rounded-full transition-colors ${aplicarWhitelists ? 'bg-primary' : 'bg-white/10'}`}
                            >
                              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${aplicarWhitelists ? 'translate-x-4' : ''}`} />
                            </button>
                          </label>
                        </div>
                        {!aplicarWhitelists && (
                          <p className="text-amber-400/60 text-[11px] mb-2">Desativado — as whitelists de cada grupo serão mantidas</p>
                        )}
                        <div className={`space-y-3 ${!aplicarWhitelists ? 'opacity-30 pointer-events-none' : ''}`}>
                          <div>
                            <label className="text-white/50 text-[11px] mb-1.5 block">Casas permitidas</label>
                            <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg px-3 py-2.5 min-h-[38px]">
                              <TagInput tags={casasEmMassa} onChange={setCasasEmMassa} placeholder="Adicionar casa..." />
                            </div>
                          </div>
                          <div>
                            <label className="text-white/50 text-[11px] mb-1.5 block">Perfis permitidos</label>
                            <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg px-3 py-2.5 min-h-[38px]">
                              <TagInput tags={perfisEmMassa} onChange={setPerfisEmMassa} placeholder="@perfil..." />
                            </div>
                          </div>
                          <div>
                            <label className="text-white/50 text-[11px] mb-1.5 block">Links permitidos</label>
                            <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg px-3 py-2.5 min-h-[38px]">
                              <TagInput tags={linksEmMassa} onChange={setLinksEmMassa} placeholder="https://..." />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Contexto Extra */}
                      <div>
                        <p className="text-white/40 text-[10px] uppercase tracking-[1.5px] font-semibold mb-2.5">Contexto Extra</p>
                        <textarea
                          value={contextoEmMassa}
                          onChange={(e) => setContextoEmMassa(e.target.value)}
                          rows={3}
                          placeholder="Contexto adicional sobre os grupos..."
                          className="w-full bg-white/[0.02] border border-white/[0.04] text-white rounded-lg py-2.5 px-3.5 text-[13px] placeholder-[#4b5563] focus:outline-none focus:border-primary/40 transition-colors resize-none"
                        />
                        <p className="text-white/20 text-[11px] mt-1">Ajuda a IA a moderar com mais precisão</p>
                      </div>

                      {/* Botão aplicar */}
                      <button
                        onClick={aplicarRegrasEmMassa}
                        disabled={salvandoEmMassa}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 disabled:opacity-50"
                        style={{ background: 'rgba(var(--color-primary-rgb),0.15)', border: '1px solid rgba(var(--color-primary-rgb),0.3)', color: 'var(--color-primary-light)' }}
                        onMouseEnter={(e) => { if (!salvandoEmMassa) e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.25)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.15)' }}
                      >
                        {salvandoEmMassa ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Aplicando...</>
                        ) : (
                          <>Aplicar a todos os {moderacao.grupos.length} grupos</>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Grupo Cards */}
                  <div className="space-y-4">
                    {moderacao.grupos
                      .filter((g) => g.grupo_nome.toLowerCase().includes(buscaGrupoMod.toLowerCase()))
                      .map((grupo) => (
                      <GrupoModeracaoCard
                        key={grupo.id}
                        grupo={grupo}
                        onSave={moderacao.updateGrupo}
                        onDelete={moderacao.deleteGrupo}
                        showToast={showToast}
                      />
                    ))}
                  </div>

                  {/* Add Group Button */}
                  <button
                    onClick={() => setAddGroupModal(true)}
                    className="w-full flex items-center justify-center gap-2 py-5 text-[14px] font-medium transition-all duration-300"
                    style={{ border: '2px dashed rgba(var(--color-primary-rgb),0.2)', borderRadius: '14px', color: 'rgba(var(--color-primary-rgb),0.6)', background: 'transparent' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(var(--color-primary-rgb),0.4)'; e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.04)'; e.currentTarget.style.color = 'var(--color-primary-light)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(var(--color-primary-rgb),0.2)'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(var(--color-primary-rgb),0.6)' }}
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Grupo
                  </button>
                </>
              )}
            </>
          )}

          {/* ─── Sub-tab: Log de Ações ─── */}
          {modSubTab === 'log' && (
            <LogDeAcoes
              moderacao={moderacao}
              showToast={showToast}
            />
          )}

          {/* ─── Sub-tab: Instância ─── */}
          {modSubTab === 'instancia' && (
            <>
              {/* Status summary */}
              {loadingSeguranca ? (
                <div className="space-y-4">
                  <div className="bg-white/[0.03] border border-white/[0.04] rounded-2xl p-4 h-[56px] animate-pulse" />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="bg-white/[0.03] border border-white/[0.04] rounded-2xl p-5 h-[200px] animate-pulse" />
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div
                    className="flex items-center gap-5 flex-wrap px-5 py-3"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px' }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-primary-bg)' }}>
                        <Wifi className="w-4 h-4" style={{ color: 'var(--color-primary-light)' }} />
                      </div>
                      <p className="text-[14px] font-semibold">
                        <span style={{ color: 'var(--color-primary-light)' }}>{segConectados}</span>
                        <span className="text-[12px] ml-1" style={{ color: 'rgba(255,255,255,0.4)' }}>conectado{segConectados !== 1 ? 's' : ''}</span>
                      </p>
                    </div>
                    <div className="w-px h-6" style={{ background: 'rgba(255,255,255,0.04)' }} />
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(248,113,113,0.12)' }}>
                        <WifiOff className="w-4 h-4" style={{ color: '#f87171' }} />
                      </div>
                      <p className="text-[14px] font-semibold">
                        <span style={{ color: '#f87171' }}>{segDesconectados}</span>
                        <span className="text-[12px] ml-1" style={{ color: 'rgba(255,255,255,0.4)' }}>desconectado{segDesconectados !== 1 ? 's' : ''}</span>
                      </p>
                    </div>
                    <div className="w-px h-6" style={{ background: 'rgba(255,255,255,0.04)' }} />
                    <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      <span className="font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>{instanciasSeguranca.length}</span> instância{instanciasSeguranca.length !== 1 ? 's' : ''} no total
                    </p>
                  </div>

                  <p className="text-[13px] max-w-[800px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Gerencie as instâncias de segurança dos grupos. Instâncias de <strong className="text-cyan-400/70">Segurança</strong> moderam mensagens e expulsam membros. Instâncias <strong className="text-amber-400/70">Anti-Hack</strong> detectam invasões em grupos fechados.
                  </p>

                  {/* Lista */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {instanciasSeguranca.map((numero, idx) => (
                      <InstanciaCard
                        key={numero.id}
                        numero={numero}
                        isFirst={idx === 0}
                        isLast={idx === instanciasSeguranca.length - 1}
                        onToggleAtivo={handleSegToggleAtivo}
                        onEdit={(n) => setSegEditModal({ open: true, numero: n })}
                        onDelete={(n) => setSegDeleteModal(n)}
                        onMoveUp={handleSegMoveUp}
                        onMoveDown={handleSegMoveDown}
                        onReconectar={handleSegReconectar}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => setSegNovaModal(true)}
                    className="w-full flex items-center justify-center gap-2 py-5 text-[14px] font-medium transition-all duration-300"
                    style={{ border: '2px dashed rgba(var(--color-primary-rgb),0.2)', borderRadius: '14px', color: 'rgba(var(--color-primary-rgb),0.6)', background: 'transparent' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(var(--color-primary-rgb),0.4)'; e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.04)'; e.currentTarget.style.color = 'var(--color-primary-light)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(var(--color-primary-rgb),0.2)'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(var(--color-primary-rgb),0.6)' }}
                  >
                    <Plus className="w-4 h-4" />
                    Nova Instância
                  </button>
                </>
              )}
            </>
          )}

          {/* ─── Sub-tab: Fechar/Abrir Grupos ─── */}
          {modSubTab === 'fechar-abrir' && (
            <>
              {/* Texto explicativo */}
              <p className="text-[13px] max-w-[800px] leading-relaxed" style={{ color: '#9ca3af' }}>
                Feche ou abra seus grupos WhatsApp. Grupos fechados permitem que apenas administradores enviem mensagens.
              </p>

              {/* Toggle Manual / Automático */}
              <div
                className="inline-flex p-1 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <button
                  onClick={() => setFaMode('manual')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium transition-all duration-200"
                  style={faMode === 'manual'
                    ? { background: 'rgba(var(--color-primary-rgb),0.15)', color: 'var(--color-primary-light)', border: '1px solid rgba(var(--color-primary-rgb),0.25)' }
                    : { background: 'transparent', color: 'rgba(255,255,255,0.45)', border: '1px solid transparent' }
                  }
                >
                  <Lock className="w-3.5 h-3.5" />
                  Manual
                </button>
                <button
                  onClick={() => setFaMode('automatico')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium transition-all duration-200"
                  style={faMode === 'automatico'
                    ? { background: 'rgba(var(--color-primary-rgb),0.15)', color: 'var(--color-primary-light)', border: '1px solid rgba(var(--color-primary-rgb),0.25)' }
                    : { background: 'transparent', color: 'rgba(255,255,255,0.45)', border: '1px solid transparent' }
                  }
                >
                  <Clock className="w-3.5 h-3.5" />
                  Automático
                </button>
              </div>

              {/* ═══ MODO MANUAL ═══ */}
              {faMode === 'manual' && (
                <>
                  {/* Barra de ações */}
                  <div
                    className="flex items-center gap-3 flex-wrap px-4 py-3 sticky top-0 z-10"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px' }}
                  >
                    <CustomSelect
                      value={faInstancia}
                      onChange={setFaInstancia}
                      options={faInstanciasConectadas.map(i => ({ value: i.instancia, label: i.nome || i.numero }))}
                      placeholder="Selecionar instância"
                    />
                    <button
                      onClick={faBuscarGrupos}
                      disabled={!faInstancia || faLoading}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ background: 'rgba(var(--color-primary-rgb),0.12)', border: '1px solid rgba(var(--color-primary-rgb),0.25)', color: 'var(--color-primary-light)' }}
                    >
                      {faLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                      Buscar Grupos
                    </button>
                    {faGrupos.length > 0 && (
                      <>
                        <div className="w-px h-6" style={{ background: 'rgba(255,255,255,0.08)' }} />
                        {/* Filtro por status */}
                        <div
                          className="inline-flex p-0.5 rounded-lg"
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                        >
                          {(['todos', 'abertos', 'fechados'] as const).map(opt => (
                            <button
                              key={opt}
                              onClick={() => setFaFiltroStatus(opt)}
                              className="px-3 py-1.5 rounded-md text-[11px] font-medium transition-all duration-150"
                              style={faFiltroStatus === opt
                                ? opt === 'abertos'
                                  ? { background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }
                                  : opt === 'fechados'
                                    ? { background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }
                                    : { background: 'rgba(var(--color-primary-rgb),0.12)', color: 'var(--color-primary-light)', border: '1px solid rgba(var(--color-primary-rgb),0.25)' }
                                : { background: 'transparent', color: 'rgba(255,255,255,0.45)', border: '1px solid transparent' }
                              }
                            >
                              {opt === 'todos' ? 'Todos' : opt === 'abertos' ? 'Apenas abertos' : 'Apenas fechados'}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={faToggleSelecionarTodos}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all duration-200"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}
                        >
                          {faGruposFiltrados.length > 0 && faGruposFiltrados.every(g => faSelecionados.has(g.JID)) ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                          {faGruposFiltrados.length > 0 && faGruposFiltrados.every(g => faSelecionados.has(g.JID)) ? 'Desmarcar Visíveis' : 'Selecionar Visíveis'}
                        </button>
                        {faSelecionadosAbertosCount > 0 && (
                          <button
                            onClick={() => setFaConfirmModal({ open: true, acao: 'fechar' })}
                            disabled={faProcessando}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}
                          >
                            <Lock className="w-3.5 h-3.5" />
                            Fechar {faSelecionadosAbertosCount} aberto{faSelecionadosAbertosCount !== 1 ? 's' : ''}
                          </button>
                        )}
                        {faSelecionadosFechadosCount > 0 && (
                          <button
                            onClick={() => setFaConfirmModal({ open: true, acao: 'abrir' })}
                            disabled={faProcessando}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)', color: '#34d399' }}
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            Abrir {faSelecionadosFechadosCount} fechado{faSelecionadosFechadosCount !== 1 ? 's' : ''}
                          </button>
                        )}
                        {faSelecionados.size > 0 && (
                          <span
                            className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
                            style={{ background: 'rgba(var(--color-primary-rgb),0.12)', color: 'var(--color-primary-light)' }}
                          >
                            {faSelecionados.size} selecionado{faSelecionados.size !== 1 ? 's' : ''}
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Lista de grupos - manual */}
                  {faLoading ? (
                    <div className="space-y-2">
                      {[...Array(6)].map((_, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl animate-pulse"
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}
                        >
                          <div className="w-4 h-4 rounded bg-white/10" />
                          <div className="flex-1 h-4 rounded bg-white/10" />
                          <div className="w-16 h-5 rounded-full bg-white/10" />
                        </div>
                      ))}
                    </div>
                  ) : !faBuscou ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                      >
                        <Lock className="w-7 h-7" style={{ color: 'rgba(255,255,255,0.2)' }} />
                      </div>
                      <p className="text-white/50 text-[14px] font-medium mb-1">Selecione uma instância e busque os grupos</p>
                      <p className="text-white/30 text-[12px]">Os grupos da instância selecionada aparecerão aqui</p>
                    </div>
                  ) : faGrupos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                      >
                        <AlertTriangle className="w-7 h-7" style={{ color: 'rgba(255,255,255,0.2)' }} />
                      </div>
                      <p className="text-white/50 text-[14px] font-medium">Nenhum grupo encontrado</p>
                      <p className="text-white/30 text-[12px]">A instância não é admin de nenhum grupo</p>
                    </div>
                  ) : faGruposFiltrados.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                      >
                        <AlertTriangle className="w-7 h-7" style={{ color: 'rgba(255,255,255,0.2)' }} />
                      </div>
                      <p className="text-white/50 text-[14px] font-medium">Nenhum grupo {faFiltroStatus === 'abertos' ? 'aberto' : 'fechado'}</p>
                      <p className="text-white/30 text-[12px]">Ajuste o filtro para ver outros grupos</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {faGruposFiltrados.map((grupo) => (
                        <button
                          key={grupo.JID}
                          type="button"
                          onClick={() => faToggleGrupo(grupo.JID)}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 text-left"
                          style={{
                            background: faSelecionados.has(grupo.JID) ? 'rgba(var(--color-primary-rgb),0.06)' : 'rgba(255,255,255,0.02)',
                            border: faSelecionados.has(grupo.JID) ? '1px solid rgba(var(--color-primary-rgb),0.2)' : '1px solid rgba(255,255,255,0.04)',
                          }}
                        >
                          <div
                            className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center transition-all duration-150"
                            style={{
                              background: faSelecionados.has(grupo.JID) ? 'var(--color-primary)' : 'rgba(255,255,255,0.06)',
                              border: faSelecionados.has(grupo.JID) ? '1px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.15)',
                            }}
                          >
                            {faSelecionados.has(grupo.JID) && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                          <span className="flex-1 text-[13px] text-white/80 truncate">{grupo.Name}</span>
                          <span
                            className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider flex-shrink-0"
                            style={grupo.IsAnnounce
                              ? { background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }
                              : { background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }
                            }
                          >
                            {grupo.IsAnnounce ? 'Fechado' : 'Aberto'}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Modal de confirmação */}
                  {faConfirmModal && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center">
                      <div className="absolute inset-0 bg-black/60" onClick={() => !faProcessando && setFaConfirmModal(null)} />
                      <div
                        className="relative w-full max-w-md mx-4 p-6 rounded-2xl space-y-4"
                        style={{ background: 'rgba(22,27,34,0.97)', border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{
                              background: faConfirmModal.acao === 'fechar' ? 'rgba(239,68,68,0.12)' : 'rgba(52,211,153,0.12)',
                              border: `1px solid ${faConfirmModal.acao === 'fechar' ? 'rgba(239,68,68,0.2)' : 'rgba(52,211,153,0.2)'}`,
                            }}
                          >
                            {faConfirmModal.acao === 'fechar'
                              ? <Lock className="w-5 h-5" style={{ color: '#f87171' }} />
                              : <Unlock className="w-5 h-5" style={{ color: '#34d399' }} />
                            }
                          </div>
                          <div>
                            <h3 className="text-white text-[15px] font-semibold">
                              {faConfirmModal.acao === 'fechar' ? 'Fechar' : 'Abrir'} grupos
                            </h3>
                            <p className="text-white/40 text-[12px]">
                              {(faConfirmModal.acao === 'fechar' ? faSelecionadosAbertosCount : faSelecionadosFechadosCount)} grupo{(faConfirmModal.acao === 'fechar' ? faSelecionadosAbertosCount : faSelecionadosFechadosCount) !== 1 ? 's' : ''} {faConfirmModal.acao === 'fechar' ? 'aberto' : 'fechado'}{(faConfirmModal.acao === 'fechar' ? faSelecionadosAbertosCount : faSelecionadosFechadosCount) !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <p className="text-white/60 text-[13px]">
                          Tem certeza que deseja {faConfirmModal.acao === 'fechar' ? 'fechar' : 'abrir'} {(faConfirmModal.acao === 'fechar' ? faSelecionadosAbertosCount : faSelecionadosFechadosCount)} grupo{(faConfirmModal.acao === 'fechar' ? faSelecionadosAbertosCount : faSelecionadosFechadosCount) !== 1 ? 's' : ''}?
                          {faConfirmModal.acao === 'fechar' && ' Apenas administradores poderão enviar mensagens.'}
                        </p>
                        <div className="flex gap-3 justify-end">
                          <button
                            onClick={() => setFaConfirmModal(null)}
                            disabled={faProcessando}
                            className="px-4 py-2 rounded-lg text-[12px] font-medium transition-all duration-200"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => faExecutarAcao(faConfirmModal.acao)}
                            disabled={faProcessando}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium transition-all duration-200"
                            style={faConfirmModal.acao === 'fechar'
                              ? { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }
                              : { background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399' }
                            }
                          >
                            {faProcessando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            {faConfirmModal.acao === 'fechar' ? 'Fechar' : 'Abrir'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ═══ MODO AUTOMÁTICO ═══ */}
              {faMode === 'automatico' && (
                <>
                  {/* Barra de ações automático */}
                  <div
                    className="flex items-center gap-3 flex-wrap px-4 py-3"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px' }}
                  >
                    <CustomSelect
                      value={faInstancia}
                      onChange={setFaInstancia}
                      options={faInstanciasConectadas.map(i => ({ value: i.instancia, label: i.nome || i.numero }))}
                      placeholder="Selecionar instância"
                    />
                    <button
                      onClick={faBuscarHorarios}
                      disabled={!faInstancia || faHorariosLoading}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ background: 'rgba(var(--color-primary-rgb),0.12)', border: '1px solid rgba(var(--color-primary-rgb),0.25)', color: 'var(--color-primary-light)' }}
                    >
                      {faHorariosLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                      Buscar Grupos
                    </button>

                    {faHorarios.length > 0 && (
                      <>
                        <div className="w-px h-6" style={{ background: 'rgba(255,255,255,0.08)' }} />
                        <button
                          onClick={faSalvarHorarios}
                          disabled={faHorariosSaving}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium transition-all duration-200 disabled:opacity-40"
                          style={{ background: 'rgba(var(--color-primary-rgb),0.15)', border: '1px solid rgba(var(--color-primary-rgb),0.3)', color: 'var(--color-primary-light)' }}
                        >
                          {faHorariosSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          Salvar Horários
                        </button>
                        {faHorariosAtivos > 0 && (
                          <span
                            className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
                            style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}
                          >
                            {faHorariosAtivos} ativo{faHorariosAtivos !== 1 ? 's' : ''}
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Cabeçalho da tabela */}
                  {faHorarios.length > 0 && (
                    <div
                      className="grid items-center gap-3 px-4 py-2.5 rounded-lg"
                      style={{ gridTemplateColumns: '52px 1fr 110px 110px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30 text-center">Ativo</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Grupo</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30 text-center flex items-center justify-center gap-1">
                        <Lock className="w-3 h-3" style={{ color: 'rgba(248,113,113,0.6)' }} />
                        Fechar
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30 text-center flex items-center justify-center gap-1">
                        <Unlock className="w-3 h-3" style={{ color: 'rgba(52,211,153,0.6)' }} />
                        Abrir
                      </span>
                    </div>
                  )}

                  {/* Lista de grupos com horários */}
                  {faHorariosLoading ? (
                    <div className="space-y-2">
                      {[...Array(6)].map((_, i) => (
                        <div
                          key={i}
                          className="grid items-center gap-3 px-4 py-3.5 rounded-xl animate-pulse"
                          style={{ gridTemplateColumns: '52px 1fr 110px 110px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}
                        >
                          <div className="w-9 h-5 rounded-full bg-white/10 mx-auto" />
                          <div className="h-4 rounded bg-white/10 w-3/4" />
                          <div className="h-8 rounded-lg bg-white/10" />
                          <div className="h-8 rounded-lg bg-white/10" />
                        </div>
                      ))}
                    </div>
                  ) : !faHorariosBuscou ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                      >
                        <Clock className="w-7 h-7" style={{ color: 'rgba(255,255,255,0.2)' }} />
                      </div>
                      <p className="text-white/50 text-[14px] font-medium mb-1">Configure horários para abrir e fechar grupos</p>
                      <p className="text-white/30 text-[12px]">Selecione uma instância e busque os grupos para configurar</p>
                    </div>
                  ) : faHorarios.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                      >
                        <AlertTriangle className="w-7 h-7" style={{ color: 'rgba(255,255,255,0.2)' }} />
                      </div>
                      <p className="text-white/50 text-[14px] font-medium">Nenhum grupo encontrado</p>
                      <p className="text-white/30 text-[12px]">A instância não é admin de nenhum grupo</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {faHorarios.map((grupo) => {
                        const DIAS = [
                          { v: 0, l: 'D' }, { v: 1, l: 'S' }, { v: 2, l: 'T' },
                          { v: 3, l: 'Q' }, { v: 4, l: 'Q' }, { v: 5, l: 'S' }, { v: 6, l: 'S' },
                        ];
                        const totalDias = grupo.dias_semana.length;
                        const todosDias = totalDias === 7;
                        const uteis = totalDias === 5 && [1,2,3,4,5].every(d => grupo.dias_semana.includes(d));
                        const fimSemana = totalDias === 2 && [0,6].every(d => grupo.dias_semana.includes(d));
                        return (
                          <div
                            key={grupo.grupo_id}
                            className="rounded-xl transition-all duration-150 overflow-hidden"
                            style={{
                              background: grupo.controle_horario_ativo ? 'rgba(var(--color-primary-rgb),0.04)' : 'rgba(255,255,255,0.02)',
                              border: grupo.controle_horario_ativo ? '1px solid rgba(var(--color-primary-rgb),0.12)' : '1px solid rgba(255,255,255,0.04)',
                            }}
                          >
                            {/* Linha principal */}
                            <div
                              className="grid items-center gap-3 px-4 py-3"
                              style={{ gridTemplateColumns: '52px 1fr 110px 110px' }}
                            >
                              {/* Toggle ativo */}
                              <div className="flex justify-center">
                                <button
                                  type="button"
                                  onClick={() => faUpdateHorario(grupo.grupo_id, 'controle_horario_ativo', !grupo.controle_horario_ativo)}
                                  className="relative w-9 h-5 rounded-full transition-all duration-200"
                                  style={{
                                    background: grupo.controle_horario_ativo ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)',
                                  }}
                                >
                                  <div
                                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200"
                                    style={{ left: grupo.controle_horario_ativo ? '18px' : '2px' }}
                                  />
                                </button>
                              </div>

                              {/* Nome do grupo */}
                              <span
                                className="text-[13px] truncate"
                                style={{ color: grupo.controle_horario_ativo ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.45)' }}
                              >
                                {grupo.grupo_nome}
                              </span>

                              {/* Horário fechar */}
                              <TimePicker
                                value={grupo.horario_fechar}
                                onChange={(v) => faUpdateHorario(grupo.grupo_id, 'horario_fechar', v)}
                                disabled={!grupo.controle_horario_ativo}
                                variant="fechar"
                              />

                              {/* Horário abrir */}
                              <TimePicker
                                value={grupo.horario_abrir}
                                onChange={(v) => faUpdateHorario(grupo.grupo_id, 'horario_abrir', v)}
                                disabled={!grupo.controle_horario_ativo}
                                variant="abrir"
                              />
                            </div>

                            {/* Sub-row: dias da semana */}
                            {grupo.controle_horario_ativo && (
                              <div
                                className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 px-4 py-2.5"
                                style={{ borderTop: '1px solid rgba(var(--color-primary-rgb),0.08)' }}
                              >
                                {/* Linha 1 (mobile): label + chips + contador */}
                                <div className="flex items-center gap-2 md:gap-3">
                                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                    Dias
                                  </span>

                                  {/* Chips dos 7 dias */}
                                  <div className="flex items-center gap-1">
                                    {DIAS.map(({ v, l }) => {
                                      const ativo = grupo.dias_semana.includes(v);
                                      return (
                                        <button
                                          key={v}
                                          type="button"
                                          onClick={() => faToggleDia(grupo.grupo_id, v)}
                                          className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold font-mono transition-all duration-150 shrink-0"
                                          style={{
                                            background: ativo ? 'rgba(var(--color-primary-rgb),0.18)' : 'rgba(255,255,255,0.03)',
                                            border: ativo ? '1px solid rgba(var(--color-primary-rgb),0.4)' : '1px solid rgba(255,255,255,0.05)',
                                            color: ativo ? 'var(--color-primary-light)' : 'rgba(255,255,255,0.4)',
                                            boxShadow: ativo ? '0 0 8px rgba(var(--color-primary-rgb),0.12)' : 'none',
                                          }}
                                          title={['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'][v]}
                                          onMouseEnter={(e) => { if (!ativo) { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; } }}
                                          onMouseLeave={(e) => { if (!ativo) { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; } }}
                                        >
                                          {l}
                                        </button>
                                      );
                                    })}
                                  </div>

                                  {/* Contador (mobile: aqui mesmo) */}
                                  <div className="md:hidden ml-auto text-[10px] font-mono shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                    {totalDias === 0 ? (
                                      <span style={{ color: '#f87171' }}>0/7</span>
                                    ) : (
                                      <span>{totalDias}/7</span>
                                    )}
                                  </div>
                                </div>

                                {/* Divider (apenas desktop) */}
                                <div className="hidden md:block w-px h-5 mx-1" style={{ background: 'rgba(255,255,255,0.06)' }} />

                                {/* Atalhos (mobile: linha separada com wrap) */}
                                <div className="flex items-center gap-1 flex-wrap">
                                  {([
                                    { key: 'todos', label: 'Todos', dias: [0,1,2,3,4,5,6], active: todosDias },
                                    { key: 'uteis', label: 'Úteis', dias: [1,2,3,4,5], active: uteis },
                                    { key: 'fds', label: 'Fim de semana', dias: [0,6], active: fimSemana },
                                  ]).map((p) => (
                                    <button
                                      key={p.key}
                                      type="button"
                                      onClick={() => faSetDias(grupo.grupo_id, p.dias)}
                                      className="px-2.5 py-1 rounded-md text-[10px] font-medium transition-all duration-150 shrink-0"
                                      style={{
                                        background: p.active ? 'rgba(var(--color-primary-rgb),0.1)' : 'transparent',
                                        border: p.active ? '1px solid rgba(var(--color-primary-rgb),0.25)' : '1px solid rgba(255,255,255,0.05)',
                                        color: p.active ? 'var(--color-primary-light)' : 'rgba(255,255,255,0.4)',
                                      }}
                                      onMouseEnter={(e) => { if (!p.active) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#fff'; } }}
                                      onMouseLeave={(e) => { if (!p.active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; } }}
                                    >
                                      {p.label}
                                    </button>
                                  ))}
                                </div>

                                {/* Contador (desktop only — alinhado direita) */}
                                <div className="hidden md:block ml-auto text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                  {totalDias === 0 ? (
                                    <span style={{ color: '#f87171' }}>Nenhum dia ativo</span>
                                  ) : (
                                    <span>{totalDias}/7</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Info sobre timezone */}
                  {faHorarios.length > 0 && (
                    <p className="text-[11px] flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
                      <Clock className="w-3 h-3" />
                      Horários no fuso de Brasília (UTC-3). O sistema verifica a cada minuto.
                    </p>
                  )}
                </>
              )}
            </>
          )}

          {/* Segurança Modals */}
          {segEditModal.open && segEditModal.numero && (
            <NumeroFormModal
              numero={segEditModal.numero}
              proximaOrdem={segEditModal.numero.ordem}
              onSave={handleSegSaveNumero}
              onClose={() => setSegEditModal({ open: false, numero: null })}
            />
          )}
          {segNovaModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => { setSegNovaModal(false); setSegNovaTipo('seguranca'); setSegNovaNome(''); setSegNovaTel(''); setSegNovaResultado(null); }} />
              <div className="relative card-dark-elevated w-full max-w-md animate-slide-up">
                <div className="flex items-center justify-between p-5 border-b border-surface-300/20">
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: segNovaTipo === 'antihack' ? 'rgba(251,191,36,0.1)' : 'rgba(34,211,238,0.1)' }}>
                      {segNovaTipo === 'antihack' ? <ShieldAlert className="w-4 h-4 text-amber-400" /> : <Shield className="w-4 h-4 text-cyan-400" />}
                    </div>
                    <h2 className="text-[15px] font-semibold text-txt font-display">
                      Nova Instância {segNovaTipo === 'antihack' ? 'Anti-Hack' : 'Segurança'}
                    </h2>
                  </div>
                  <button onClick={() => { setSegNovaModal(false); setSegNovaTipo('seguranca'); setSegNovaNome(''); setSegNovaTel(''); setSegNovaResultado(null); }} className="p-1.5 text-txt-muted hover:text-txt hover:bg-surface-200/40 rounded-lg transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {!segNovaResultado ? (
                  <>
                    <div className="p-5 space-y-4">
                      {/* Seletor de tipo */}
                      <div>
                        <label className="text-[13px] font-medium text-txt mb-2 block">Tipo de Instância</label>
                        <div className="flex gap-2">
                          {([
                            { value: 'seguranca' as const, label: 'Segurança', icon: Shield, color: '#22d3ee', bg: 'rgba(34,211,238,0.08)', border: 'rgba(34,211,238,0.25)' },
                            { value: 'antihack' as const, label: 'Anti-Hack', icon: ShieldAlert, color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.25)' },
                          ] as const).map((opt) => {
                            const isActive = segNovaTipo === opt.value;
                            const Icon = opt.icon;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => setSegNovaTipo(opt.value)}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200"
                                style={{
                                  background: isActive ? opt.bg : 'rgba(255,255,255,0.02)',
                                  border: `1.5px solid ${isActive ? opt.border : 'rgba(255,255,255,0.06)'}`,
                                  color: isActive ? opt.color : 'rgba(255,255,255,0.35)',
                                  boxShadow: isActive ? `0 0 12px ${opt.bg}` : 'none',
                                }}
                              >
                                <Icon className="w-4 h-4" />
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-[11px] text-txt-dim mt-2 leading-relaxed">
                          {segNovaTipo === 'antihack'
                            ? 'Instância não-admin que detecta mensagens não autorizadas em grupos fechados.'
                            : 'Instância admin que monitora mensagens, remove violações e expulsa membros.'}
                        </p>
                      </div>

                      <div>
                        <label className="text-[13px] font-medium text-txt mb-1.5 block">Nome do aparelho</label>
                        <input type="text" value={segNovaNome} onChange={(e) => setSegNovaNome(e.target.value)} placeholder="Ex: iPhone 8 - Branco" className="input-dark text-[13px]" autoFocus />
                      </div>
                      <div>
                        <label className="text-[13px] font-medium text-txt mb-1.5 block">Número WhatsApp (com DDI)</label>
                        <input type="text" value={segNovaTel} onChange={(e) => setSegNovaTel(e.target.value)} placeholder="5534999999999" className="input-dark text-[13px]" />
                        <p className="text-[11px] text-txt-dim mt-1.5">Formato: código do país + DDD + número (sem espaços ou traços)</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 p-5 border-t border-surface-300/20">
                      <button onClick={() => { setSegNovaModal(false); setSegNovaTipo('seguranca'); setSegNovaNome(''); setSegNovaTel(''); }} className="px-4 py-2 text-[13px] font-medium text-txt-secondary hover:text-txt bg-surface-200/30 hover:bg-surface-200/50 rounded-xl border border-surface-300/20 transition-all">
                        Cancelar
                      </button>
                      <button
                        onClick={async () => {
                          if (!segNovaNome.trim() || !segNovaTel.trim() || segNovaSaving) return;
                          setSegNovaSaving(true);
                          try {
                            const result = await handleSegCriarInstancia(segNovaNome.trim(), segNovaTel.trim());
                            setSegNovaResultado(result);
                          } finally {
                            setSegNovaSaving(false);
                          }
                        }}
                        disabled={!segNovaNome.trim() || !segNovaTel.trim() || segNovaSaving}
                        className="btn-primary text-[13px] px-5 py-2 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none"
                      >
                        {segNovaSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        Criar Instância
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="p-5">
                    {segNovaResultado.sucesso ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 rounded-full bg-primary-light" />
                          <span className="text-[13px] font-semibold text-primary-light">Instância criada com sucesso!</span>
                        </div>
                        {segNovaResultado.pairing_code && (
                          <div className="relative px-4 py-4 rounded-xl bg-zinc-800/80 border border-zinc-700/60 text-center">
                            <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold mb-2">Código de Pareamento</p>
                            <p className="text-2xl font-mono font-bold text-white tracking-[0.15em] select-all">{segNovaResultado.pairing_code}</p>
                            {segNovaResultado.expira_em && <p className="text-[11px] text-zinc-500 mt-2">Expira em {segNovaResultado.expira_em}</p>}
                          </div>
                        )}
                        <div className="px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/10">
                          <p className="text-[12px] text-primary/80 leading-relaxed">
                            Abra o WhatsApp no aparelho, vá em <strong>Dispositivos Conectados</strong> e selecione <strong>Conectar com número de telefone</strong>. Insira o código acima.
                          </p>
                        </div>
                        {segNovaResultado.mensagem && <p className="text-[12px] text-txt-muted">{segNovaResultado.mensagem}</p>}
                        <button onClick={() => { setSegNovaModal(false); setSegNovaTipo('seguranca'); setSegNovaNome(''); setSegNovaTel(''); setSegNovaResultado(null); }} className="w-full px-4 py-2.5 text-[13px] font-medium text-txt-secondary hover:text-txt bg-surface-200/30 hover:bg-surface-200/50 rounded-xl border border-surface-300/20 transition-all">
                          Fechar
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-400" />
                          <span className="text-[13px] font-semibold text-red-400">Erro ao criar instância</span>
                        </div>
                        <p className="text-[13px] text-txt-secondary">{segNovaResultado.mensagem || 'Erro desconhecido. Tente novamente.'}</p>
                        <div className="flex gap-3">
                          <button onClick={() => setSegNovaResultado(null)} className="flex-1 px-4 py-2 text-[13px] font-medium text-primary bg-primary/10 hover:bg-primary/15 rounded-xl border border-primary/20 transition-all">Tentar novamente</button>
                          <button onClick={() => { setSegNovaModal(false); setSegNovaTipo('seguranca'); setSegNovaNome(''); setSegNovaTel(''); setSegNovaResultado(null); }} className="flex-1 px-4 py-2 text-[13px] font-medium text-txt-secondary hover:text-txt bg-surface-200/30 hover:bg-surface-200/50 rounded-xl border border-surface-300/20 transition-all">Fechar</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          {segDeleteModal && (
            <ConfirmDeleteNumeroModal
              nome={segDeleteModal.nome}
              onConfirm={handleSegDeleteNumero}
              onClose={() => setSegDeleteModal(null)}
            />
          )}

          {/* Add Group Modal */}
          {addGroupModal && (
            <AddGroupModal
              onClose={() => setAddGroupModal(false)}
              fetchInstancias={fetchInstanciasCb}
              fetchGruposWpp={fetchGruposWppCb}
              showToast={showToast}
              onRefetch={moderacao.refetch}
            />
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* ═══ TAB: CONFIGURAÇÃO ═══ */}
      {/* ═══════════════════════════════════════════ */}
      {mainTab === 'configuracao' && (
        <div className="space-y-6">
          {/* Blacklist — controlada por grupos_blacklist */}
          {gBlacklist === 'disabled' && (
            <div className="flex items-center gap-3 px-5 py-4 rounded-xl" style={{ background: 'rgba(250,204,21,0.04)', border: '1px solid rgba(250,204,21,0.15)' }}>
              <Lock className="w-5 h-5 shrink-0" style={{ color: '#facc15' }} />
              <p className="text-[13px] text-white/50">Blacklist de números não está disponível no seu plano</p>
            </div>
          )}
          {gBlacklist === 'enabled' && (<>
          {/* Header */}
          <div>
            <h2 className="text-white text-[18px] font-bold font-display mb-1">Blacklist de Números</h2>
            <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Números bloqueados são removidos automaticamente ao entrar em qualquer grupo</p>
          </div>

          {/* Formulário de adição */}
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="5511999999999"
              value={blacklistTelefone}
              onChange={e => setBlacklistTelefone(e.target.value.replace(/\D/g, ''))}
              className="flex-1 text-white text-[13px] outline-none transition-all duration-200"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', padding: '10px 16px' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(var(--color-primary-rgb),0.3)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(var(--color-primary-rgb),0.08)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.boxShadow = 'none' }}
            />
            <input
              type="text"
              placeholder="Ex: Spam, propaganda..."
              value={blacklistMotivo}
              onChange={e => setBlacklistMotivo(e.target.value)}
              className="flex-1 text-white text-[13px] outline-none transition-all duration-200"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', padding: '10px 16px' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(var(--color-primary-rgb),0.3)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(var(--color-primary-rgb),0.08)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.boxShadow = 'none' }}
            />
            <button
              onClick={addBlacklist}
              disabled={blacklistAdding || !blacklistTelefone.trim()}
              className="flex items-center justify-center gap-2 text-[13px] font-medium whitespace-nowrap transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171', padding: '10px 20px', borderRadius: '12px' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(248,113,113,0.2)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(248,113,113,0.12)' }}
            >
              {blacklistAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
              Bloquear número
            </button>
          </div>

          {/* Contador + Busca */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <span
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px]"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)' }}
            >
              <Shield className="w-3.5 h-3.5" />
              {blacklist.length} número{blacklist.length !== 1 ? 's' : ''} bloqueado{blacklist.length !== 1 ? 's' : ''}
            </span>
            {blacklist.length > 0 && (
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.25)' }} />
                <input
                  type="text"
                  placeholder="Buscar por telefone..."
                  value={blacklistBusca}
                  onChange={e => setBlacklistBusca(e.target.value)}
                  className="w-full text-white text-[13px] outline-none transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', padding: '8px 14px 8px 36px' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(var(--color-primary-rgb),0.3)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(var(--color-primary-rgb),0.08)' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.boxShadow = 'none' }}
                />
              </div>
            )}
          </div>

          {/* Tabela ou estado vazio */}
          {loadingBlacklist ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(var(--color-primary-rgb),0.2)', borderTopColor: 'var(--color-primary)' }} />
            </div>
          ) : blacklist.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <ShieldOff className="w-7 h-7" style={{ color: 'rgba(255,255,255,0.15)' }} />
              </div>
              <p className="text-[15px] font-medium mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Nenhum número bloqueado</p>
              <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Adicione números para bloquear automaticamente ao entrar nos grupos</p>
            </div>
          ) : filteredBlacklist.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Search className="w-12 h-12 mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
              <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Nenhum resultado para a busca</p>
            </div>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '16px', overflow: 'hidden' }}>
              <table className="w-full text-[13px]">
                <thead>
                  <tr>
                    {['Telefone', 'Motivo', 'Data de Bloqueio', ''].map((h, i) => (
                      <th key={h || i} className={`${i === 3 ? 'text-right' : 'text-left'} text-[11px] uppercase font-semibold tracking-[0.5px] px-4 py-3`} style={{ color: 'rgba(255,255,255,0.4)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        {h || 'Ações'}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredBlacklist.map(item => (
                    <tr
                      key={item.id}
                      className="transition-colors duration-200"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <td className="px-4 py-3 font-mono tabular-nums" style={{ color: 'rgba(255,255,255,0.7)' }}>{formatTelefone(item.telefone)}</td>
                      <td className="px-4 py-3" style={{ color: item.motivo ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)' }}>{item.motivo || '—'}</td>
                      <td className="px-4 py-3 text-[12px] tabular-nums" style={{ color: 'rgba(255,255,255,0.35)' }}>{formatDate(item.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setBlacklistDeleteConfirm(item)}
                          className="inline-flex items-center gap-1 text-[12px] transition-colors duration-200"
                          style={{ color: 'rgba(248,113,113,0.6)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171' }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(248,113,113,0.6)' }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Modal de confirmação de remoção */}
          {blacklistDeleteConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
              <div
                className="w-full max-w-sm mx-4 animate-slide-up"
                style={{ background: 'rgba(20,20,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '28px', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(248,113,113,0.12)' }}>
                    <AlertTriangle className="w-5 h-5" style={{ color: '#f87171' }} />
                  </div>
                  <h3 className="text-white font-semibold text-[16px]">Remover da blacklist</h3>
                </div>
                <p className="text-[13px] mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Tem certeza que deseja remover <span className="text-white font-mono">{formatTelefone(blacklistDeleteConfirm.telefone)}</span> da blacklist?
                </p>
                <div className="flex gap-3 justify-end" style={{ paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <button
                    onClick={() => setBlacklistDeleteConfirm(null)}
                    className="px-6 py-2.5 rounded-[10px] text-[13px] font-medium transition-all duration-200"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => removeBlacklist(blacklistDeleteConfirm.id)}
                    className="px-6 py-2.5 rounded-[10px] text-[13px] font-medium transition-all duration-200"
                    style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(248,113,113,0.25)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(248,113,113,0.15)' }}
                  >
                    Remover
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal: Remover de todos os grupos? */}
          {showRemoveModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
              <div
                className="w-full max-w-md mx-4 animate-slide-up"
                style={{ background: 'rgba(20,20,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '28px', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(250,204,60,0.12)' }}>
                    <AlertTriangle className="w-5 h-5" style={{ color: '#facc3c' }} />
                  </div>
                  <h3 className="text-white text-[16px] font-semibold">Remover de todos os grupos?</h3>
                </div>

                <p className="text-[13px] mb-5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Deseja remover o número <span className="text-white font-mono">{telefoneBloqueado}</span> de todos os grupos? Selecione as instâncias:
                </p>

                {loadingInstanciasRemocao ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(var(--color-primary-rgb),0.2)', borderTopColor: 'var(--color-primary)' }} />
                  </div>
                ) : instanciasDisponiveis.length === 0 ? (
                  <p className="text-[13px] text-center py-4" style={{ color: 'rgba(255,255,255,0.4)' }}>Nenhuma instância ativa encontrada</p>
                ) : (
                  <div className="space-y-2 mb-6">
                    {instanciasDisponiveis.map(inst => {
                      const isChecked = instanciasSelecionadas.has(inst.id);
                      return (
                        <label
                          key={inst.id}
                          className="flex items-center gap-3 p-3 rounded-[10px] cursor-pointer transition-all duration-200"
                          style={{
                            background: isChecked ? 'rgba(var(--color-primary-rgb),0.06)' : 'rgba(255,255,255,0.04)',
                            border: isChecked ? '1px solid rgba(var(--color-primary-rgb),0.2)' : '1px solid rgba(255,255,255,0.04)',
                          }}
                        >
                          <div
                            onClick={(e) => { e.preventDefault(); handleToggleInstancia(inst.id); }}
                            className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all duration-200 cursor-pointer"
                            style={{
                              background: isChecked ? 'var(--color-primary)' : 'rgba(255,255,255,0.04)',
                              border: isChecked ? '1px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.2)',
                            }}
                          >
                            {isChecked && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleInstancia(inst.id)}
                            className="sr-only"
                          />
                          <span className="text-[13px] text-white">
                            {inst.nome} <span style={{ color: 'rgba(255,255,255,0.4)' }}>({inst.numero})</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}

                <div className="flex gap-3 justify-end" style={{ paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <button
                    onClick={handleRemoveModalClose}
                    className="px-5 py-2.5 rounded-[10px] text-[13px] font-medium transition-all duration-200"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                  >
                    Não, apenas bloquear
                  </button>
                  <button
                    onClick={handleRemoveFromGroups}
                    disabled={instanciasSelecionadas.size === 0 || loadingInstanciasRemocao}
                    className="px-5 py-2.5 rounded-[10px] text-[13px] font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171' }}
                  >
                    Sim, remover dos grupos
                  </button>
                </div>
              </div>
            </div>
          )}

          </>)}

          {/* ═══════════════════════════════════════════ */}
          {/* ═══ GRUPOS IGNORADOS NA COLETA ═══ */}
          {/* ═══════════════════════════════════════════ */}
          <div className="relative" style={{ marginTop: '40px' }}>
            <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 20%, rgba(255,255,255,0.06) 80%, transparent 100%)' }} />
          </div>

          <div style={{ marginTop: '48px' }}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.12)' }}>
                <EyeOff className="w-4 h-4" style={{ color: '#ef4444' }} />
              </div>
              <div>
                <h2 className="text-white text-[18px] font-bold font-display">Grupos Ignorados na Coleta</h2>
                <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Grupos que não terão membros coletados automaticamente</p>
              </div>
            </div>
          </div>

          {/* Formulário de adição */}
          <div className="flex flex-col sm:flex-row gap-3" style={{ marginTop: '20px' }}>
            <div className="relative flex-1" ref={grupoSelectRef}>
              {/* Trigger button */}
              <button
                type="button"
                onClick={() => { setGrupoSelectAberto(prev => !prev); setGrupoSelectBusca(''); }}
                className="w-full flex items-center justify-between text-[13px] outline-none transition-all duration-200 cursor-pointer text-left"
                style={{
                  background: grupoSelectAberto ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.04)',
                  border: grupoSelectAberto ? '1px solid rgba(var(--color-primary-rgb),0.3)' : '1px solid rgba(255,255,255,0.04)',
                  borderRadius: '12px',
                  padding: '10px 16px',
                  color: grupoSelecionadoObj ? 'white' : 'rgba(255,255,255,0.35)',
                  boxShadow: grupoSelectAberto ? '0 0 0 3px rgba(var(--color-primary-rgb),0.08)' : 'none',
                }}
              >
                <span className="truncate flex-1 mr-2">
                  {grupoSelecionadoObj
                    ? `${grupoSelecionadoObj.nome_grupo} (${grupoSelecionadoObj.count} membro${grupoSelecionadoObj.count !== 1 ? 's' : ''})`
                    : 'Escolha um grupo...'
                  }
                </span>
                <ChevronDown
                  className="w-4 h-4 flex-shrink-0 transition-transform duration-200"
                  style={{ color: 'rgba(255,255,255,0.25)', transform: grupoSelectAberto ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
              </button>

              {/* Dropdown */}
              {grupoSelectAberto && (
                <div
                  className="absolute left-0 right-0 top-full mt-2 z-[100] animate-fade-in"
                  style={{
                    background: 'rgba(22, 27, 34, 0.97)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '14px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.06)',
                    maxHeight: '340px',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Search inside dropdown */}
                  <div className="p-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.25)' }} />
                      <input
                        type="text"
                        autoFocus
                        placeholder="Buscar grupo..."
                        value={grupoSelectBusca}
                        onChange={e => setGrupoSelectBusca(e.target.value)}
                        className="w-full text-white text-[12px] outline-none"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '7px 10px 7px 30px' }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(var(--color-primary-rgb),0.2)' }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)' }}
                      />
                    </div>
                  </div>

                  {/* List */}
                  <div className="overflow-y-auto p-1.5" style={{ maxHeight: '260px' }}>
                    {grupoSelectFiltrados.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-6">
                        <Search className="w-5 h-5 mb-2" style={{ color: 'rgba(255,255,255,0.1)' }} />
                        <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Nenhum grupo encontrado</p>
                      </div>
                    ) : (
                      grupoSelectFiltrados.map(g => {
                        const isActive = grupoIgnoradoSelecionado === g.id_grupo;
                        return (
                          <button
                            key={g.id_grupo}
                            onClick={() => {
                              setGrupoIgnoradoSelecionado(isActive ? '' : g.id_grupo);
                              setGrupoSelectAberto(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] transition-all duration-150 text-left"
                            style={{
                              background: isActive ? 'rgba(255,255,255,0.04)' : 'transparent',
                              color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                            }}
                            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                          >
                            <span className="flex-1 truncate">{g.nome_grupo}</span>
                            <span className="flex-shrink-0 text-[11px] tabular-nums" style={{ color: 'rgba(255,255,255,0.25)' }}>
                              {g.count} membro{g.count !== 1 ? 's' : ''}
                            </span>
                            {isActive && <Check size={12} className="text-primary-light flex-shrink-0" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={addGrupoIgnorado}
              disabled={addingGrupoIgnorado || !grupoIgnoradoSelecionado}
              className="flex items-center justify-center gap-2 text-[13px] font-medium whitespace-nowrap transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: '#ef4444', color: 'white', padding: '10px 20px', borderRadius: '12px' }}
              onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = '#dc2626' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#ef4444' }}
            >
              {addingGrupoIgnorado ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
              Ignorar Grupo
            </button>
          </div>

          {/* Contador + Busca */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style={{ marginTop: '16px' }}>
            <span
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px]"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)' }}
            >
              <EyeOff className="w-3.5 h-3.5" />
              {gruposIgnorados.length} grupo{gruposIgnorados.length !== 1 ? 's' : ''} ignorado{gruposIgnorados.length !== 1 ? 's' : ''}
            </span>
            {gruposIgnorados.length > 0 && (
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.25)' }} />
                <input
                  type="text"
                  placeholder="Buscar por nome do grupo..."
                  value={grupoIgnoradoBusca}
                  onChange={e => setGrupoIgnoradoBusca(e.target.value)}
                  className="w-full text-white text-[13px] outline-none transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', padding: '8px 14px 8px 36px' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(var(--color-primary-rgb),0.3)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(var(--color-primary-rgb),0.08)' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.boxShadow = 'none' }}
                />
              </div>
            )}
          </div>

          {/* Tabela ou estado vazio — Grupos Ignorados */}
          {loadingGruposIgnorados ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(var(--color-primary-rgb),0.2)', borderTopColor: 'var(--color-primary)' }} />
            </div>
          ) : gruposIgnorados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <ShieldCheck className="w-7 h-7" style={{ color: 'rgba(255,255,255,0.15)' }} />
              </div>
              <p className="text-[15px] font-medium mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Nenhum grupo ignorado</p>
              <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Todos os grupos estão sendo coletados normalmente</p>
            </div>
          ) : filteredGruposIgnorados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Search className="w-12 h-12 mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
              <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Nenhum resultado para a busca</p>
            </div>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '16px', overflow: 'hidden', marginTop: '8px' }}>
              <table className="w-full text-[13px]">
                <thead>
                  <tr>
                    {['Grupo', 'Membros', 'Data', ''].map((h, i) => (
                      <th key={h || 'acoes'} className={`${i === 3 ? 'text-right' : 'text-left'} text-[11px] uppercase font-semibold tracking-[0.5px] px-4 py-3`} style={{ color: 'rgba(255,255,255,0.4)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        {h || 'Ações'}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredGruposIgnorados.map(item => (
                    <tr
                      key={item.id}
                      className="transition-colors duration-200"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <td className="px-4 py-3" style={{ color: 'rgba(255,255,255,0.7)' }}>{item.grupo_nome}</td>
                      <td className="px-4 py-3 tabular-nums" style={{ color: 'rgba(255,255,255,0.5)' }}>{membrosCountMap[item.grupo_id] || 0}</td>
                      <td className="px-4 py-3 text-[12px] tabular-nums" style={{ color: 'rgba(255,255,255,0.35)' }}>{formatDate(item.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setGrupoIgnoradoRemoveConfirm(item)}
                          className="inline-flex items-center gap-1 text-[12px] transition-colors duration-200"
                          style={{ color: 'rgba(248,113,113,0.6)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171' }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(248,113,113,0.6)' }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Modal: Confirmar remoção de grupo ignorado */}
          {grupoIgnoradoRemoveConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
              <div
                className="w-full max-w-sm mx-4 animate-slide-up"
                style={{ background: 'rgba(20,20,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '28px', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(248,113,113,0.12)' }}>
                    <AlertTriangle className="w-5 h-5" style={{ color: '#f87171' }} />
                  </div>
                  <h3 className="text-white font-semibold text-[16px]">Remover da lista de ignorados</h3>
                </div>
                <p className="text-[13px] mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Remover <span className="text-white">&ldquo;{grupoIgnoradoRemoveConfirm.grupo_nome}&rdquo;</span> da lista de ignorados? O sistema voltará a coletar membros desse grupo.
                </p>
                <div className="flex gap-3 justify-end" style={{ paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <button
                    onClick={() => setGrupoIgnoradoRemoveConfirm(null)}
                    className="px-6 py-2.5 rounded-[10px] text-[13px] font-medium transition-all duration-200"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => removeGrupoIgnorado(grupoIgnoradoRemoveConfirm.id)}
                    className="px-6 py-2.5 rounded-[10px] text-[13px] font-medium transition-all duration-200"
                    style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(248,113,113,0.25)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(248,113,113,0.15)' }}
                  >
                    Remover
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal: Excluir membros existentes? */}
          {showDeleteMembrosModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
              <div
                className="w-full max-w-md mx-4 animate-slide-up"
                style={{ background: 'rgba(20,20,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '28px', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(250,204,60,0.12)' }}>
                    <AlertTriangle className="w-5 h-5" style={{ color: '#facc3c' }} />
                  </div>
                  <h3 className="text-white text-[16px] font-semibold">Excluir membros existentes?</h3>
                </div>

                <div className="space-y-3 mb-6">
                  <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    O grupo <span className="text-white">&ldquo;{showDeleteMembrosModal.grupo_nome}&rdquo;</span> foi adicionado à lista de ignorados.
                  </p>
                  <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Esse grupo possui <span className="text-white font-semibold">{showDeleteMembrosModal.count}</span> membro{showDeleteMembrosModal.count !== 1 ? 's' : ''} cadastrado{showDeleteMembrosModal.count !== 1 ? 's' : ''} no sistema. Deseja excluir todos os leads desse grupo?
                  </p>
                  <p className="text-[12px] flex items-center gap-1.5" style={{ color: 'rgba(239,68,68,0.7)' }}>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Essa ação não pode ser desfeita!
                  </p>
                </div>

                <div className="flex gap-3 justify-end" style={{ paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <button
                    onClick={handleKeepMembros}
                    className="px-5 py-2.5 rounded-[10px] text-[13px] font-medium transition-all duration-200"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                  >
                    Não, manter leads
                  </button>
                  <button
                    onClick={handleDeleteMembros}
                    disabled={deletingMembros}
                    className="px-5 py-2.5 rounded-[10px] text-[13px] font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: '#ef4444', color: 'white' }}
                    onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = '#dc2626' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#ef4444' }}
                  >
                    {deletingMembros ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
                    Sim, excluir {showDeleteMembrosModal.count} lead{showDeleteMembrosModal.count !== 1 ? 's' : ''}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* ═══ TAB: BOTS ═══ */}
      {/* ═══════════════════════════════════════════ */}
      {mainTab === 'bots' && (
        <>
          {/* Sub-tabs — Glass Pill (scroll horizontal em mobile, fixo desktop) */}
          <div className="overflow-x-auto md:overflow-visible -mx-3 px-3 md:mx-0 md:px-0" style={{ scrollbarWidth: 'none' }}>
            <div
              className="inline-flex gap-1 p-[3px] rounded-xl w-max md:w-fit"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}
            >
              {([
                { key: 'personas' as BotSubTab, label: 'Personas', icon: UserCircle },
                { key: 'grupos-ativos' as BotSubTab, label: 'Grupos Ativos', icon: Users },
                { key: 'conhecimento' as BotSubTab, label: 'Conhecimento', icon: BookOpen },
                { key: 'metricas' as BotSubTab, label: 'Métricas', icon: BarChart3 },
                { key: 'instancia' as BotSubTab, label: 'Instância', icon: Smartphone },
              ]).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setBotSubTab(tab.key)}
                  className="flex items-center gap-1.5 px-3 md:px-4 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-200 whitespace-nowrap shrink-0"
                  style={botSubTab === tab.key
                    ? { background: 'rgba(var(--color-primary-rgb),0.1)', border: '1px solid rgba(var(--color-primary-rgb),0.2)', color: 'var(--color-primary-light)' }
                    : { background: 'transparent', border: '1px solid transparent', color: 'rgba(255,255,255,0.4)' }
                  }
                  onMouseEnter={(e) => { if (botSubTab !== tab.key) { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' } }}
                  onMouseLeave={(e) => { if (botSubTab !== tab.key) { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'transparent' } }}
                >
                  <tab.icon className="w-3.5 h-3.5 shrink-0" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* ─── Sub-tab: Personas ─── */}
          {botSubTab === 'personas' && (
            <div className="mt-2">
              <PersonasTab showToast={showToast} />
            </div>
          )}

          {/* ─── Sub-tab: Grupos Ativos ─── */}
          {botSubTab === 'grupos-ativos' && (
            <div className="mt-2">
              <GruposAtivosTab showToast={showToast} />
            </div>
          )}

          {/* ─── Sub-tab: Conhecimento ─── */}
          {botSubTab === 'conhecimento' && (
            <div className="mt-2">
              <ConhecimentoTab showToast={showToast} />
            </div>
          )}

          {/* ─── Sub-tab: Métricas ─── */}
          {botSubTab === 'metricas' && (
            <div className="mt-2">
              <MetricasTab showToast={showToast} />
            </div>
          )}

          {/* ─── Sub-tab: Instância ─── */}
          {botSubTab === 'instancia' && (
            <div className="mt-2">
              <BotInstanciaTab showToast={showToast} />
            </div>
          )}
        </>
      )}
    </div>
  );
};
