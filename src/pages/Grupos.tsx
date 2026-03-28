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
} from 'lucide-react';
import { format, isSameDay, getDaysInMonth, getMonth, startOfDay, endOfDay } from 'date-fns';
import { supabase } from '../lib/supabase';
import { WEBHOOKS, UAZAPI_BASE_URL, fetchWithTimeout } from '../config/webhooks';
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

type MainTab = 'membros' | 'moderacao' | 'configuracao';
type ModeracaoSubTab = 'grupos' | 'log' | 'instancia';

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
          background: open ? 'rgba(59,130,246,0.12)' : 'rgba(22, 27, 34, 0.97)',
          border: open ? '1px solid rgba(59,130,246,0.25)' : '1px solid rgba(255,255,255,0.1)',
          color: open ? '#60a5fa' : 'rgba(255,255,255,0.7)',
          borderRadius: '10px',
          padding: '8px 32px 8px 12px',
        }}
      >
        {selected?.label || placeholder}
        <ChevronDown className="w-3.5 h-3.5 absolute right-2.5" style={{ color: '#60a5fa' }} />
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
                    background: active ? 'rgba(59,130,246,0.1)' : 'transparent',
                    color: active ? '#60a5fa' : 'rgba(255,255,255,0.5)',
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = active ? 'rgba(59,130,246,0.1)' : 'transparent'; e.currentTarget.style.color = active ? '#60a5fa' : 'rgba(255,255,255,0.5)'; }}
                >
                  <span className="truncate">{o.label}</span>
                  {active && <Check size={12} className="text-[#60a5fa] flex-shrink-0 ml-2" />}
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
        ? (color === 'bg-primary' ? 'var(--color-primary-bg)' : 'rgba(59,130,246,0.3)')
        : 'rgba(255,255,255,0.1)',
      border: checked
        ? (color === 'bg-primary' ? '1px solid var(--color-primary-bg)' : '1px solid rgba(59,130,246,0.4)')
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
            className="text-[#3b82f6] text-xs hover:underline"
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
          style={{ background: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.25)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.2)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.12)' }}
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
                  background: isSelected ? '#3b82f6' : 'transparent',
                  color: isFuture ? 'rgba(255,255,255,0.15)' : isSelected ? '#fff' : isToday ? '#60a5fa' : 'rgba(255,255,255,0.7)',
                  fontWeight: isSelected || isToday ? 600 : 400,
                  cursor: isFuture ? 'not-allowed' : 'pointer',
                  border: isToday && !isSelected ? '1px solid rgba(59,130,246,0.4)' : '1px solid transparent',
                }}
                onMouseEnter={(e) => { if (!isFuture && !isSelected) { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; } }}
                onMouseLeave={(e) => { if (!isFuture && !isSelected) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = isToday ? '#60a5fa' : 'rgba(255,255,255,0.7)'; } }}
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
            ? "bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20"
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
                    background: active ? 'rgba(59,130,246,0.1)' : 'transparent',
                    color: active ? '#60a5fa' : 'rgba(255,255,255,0.5)',
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = active ? 'rgba(59,130,246,0.1)' : 'transparent'; e.currentTarget.style.color = active ? '#60a5fa' : 'rgba(255,255,255,0.5)'; }}
                >
                  <span>{opt.label}</span>
                  {active && <Check size={12} className="text-[#60a5fa] flex-shrink-0" />}
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
            style={{ background: 'rgba(59,130,246,0.12)' }}
          >
            <Users className="w-4 h-4" style={{ color: '#60a5fa' }} />
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

          <div className={cn("space-y-3 transition-all duration-200", !localGrupo.enviar_aviso && "opacity-40 pointer-events-none select-none")}>
            <div>
              <label className="text-white/50 text-[11px] mb-1 block">Mensagem de Aviso</label>
              <textarea
                ref={avisoRef}
                value={localGrupo.mensagem_aviso}
                onChange={(e) => setLocalGrupo(prev => ({ ...prev, mensagem_aviso: e.target.value }))}
                rows={3}
                disabled={!localGrupo.enviar_aviso}
                className="w-full bg-white/[0.02] border border-white/[0.04] text-white rounded-lg py-2.5 px-3.5 text-[13px] placeholder-[#4b5563] focus:outline-none focus:border-[#3b82f6]/40 transition-colors resize-none disabled:cursor-not-allowed"
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
                className="w-full bg-white/[0.02] border border-white/[0.04] text-white rounded-lg py-2.5 px-3.5 text-[13px] placeholder-[#4b5563] focus:outline-none focus:border-[#3b82f6]/40 transition-colors resize-none disabled:cursor-not-allowed"
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
              className="w-16 bg-white/[0.02] border border-white/[0.04] text-white rounded-lg py-1.5 px-2.5 text-[13px] text-center focus:outline-none focus:border-[#3b82f6]/40 transition-colors"
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
            className="w-full bg-white/[0.02] border border-white/[0.04] text-white rounded-lg py-2.5 px-3.5 text-[13px] placeholder-[#4b5563] focus:outline-none focus:border-[#3b82f6]/40 transition-colors resize-none"
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
            background: 'rgba(59,130,246,0.15)',
            border: '1px solid rgba(59,130,246,0.25)',
            color: '#60a5fa',
            opacity: saving ? 0.5 : 1,
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={(e) => { if (!saving) { e.currentTarget.style.background = 'rgba(59,130,246,0.25)' } }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.15)' }}
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
          style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)' }}
        >
          <Shield className="w-5 h-5" style={{ color: '#60a5fa' }} />
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
                    ? "bg-[#3b82f6]/10 text-[#60a5fa] border border-[#3b82f6]/20"
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
                    ? "bg-[#3b82f6]/10 text-[#60a5fa] border border-[#3b82f6]/20"
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
              className="w-full bg-white/[0.04] border border-white/[0.04] rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-[#4b5563] focus:outline-none focus:border-[#3b82f6]/50 transition-colors"
            />
          </div>

          {/* Limpar */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-[#3b82f6] text-xs hover:underline cursor-pointer ml-auto shrink-0"
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
                          isNew && "animate-pulse bg-[#3b82f6]/5"
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
                      className={cn(
                        "w-8 h-8 rounded-lg text-xs font-medium transition-colors",
                        moderacao.logsPage === p
                          ? "bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20"
                          : "text-white/50 hover:bg-white/[0.04] hover:text-white"
                      )}
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
  onAdd: (grupo: { grupo_id: string; grupo_nome: string; instancia: string; token_instancia: string; mensagem_aviso: string; mensagem_expulsao: string }) => Promise<string | null>;
  fetchInstancias: () => Promise<InstanciaColeta[]>;
  fetchGruposWpp: (instancia: string, token: string) => Promise<{ Name: string; JID: string }[]>;
  showToast: (type: 'success' | 'error', msg: string) => void;
}> = ({ onClose, onAdd, fetchInstancias, fetchGruposWpp, showToast }) => {
  const [instancias, setInstancias] = useState<InstanciaColeta[]>([]);
  const [loadingInst, setLoadingInst] = useState(true);
  const [selectedInstancia, setSelectedInstancia] = useState('');
  const [gruposWpp, setGruposWpp] = useState<{ Name: string; JID: string }[]>([]);
  const [loadingGrupos, setLoadingGrupos] = useState(false);
  const [selectedGrupos, setSelectedGrupos] = useState<Set<string>>(new Set());
  const [msgAviso, setMsgAviso] = useState('⚠️ {{nome}}, sua mensagem foi removida. Motivo: {{tipo}}. Aviso {{strike}}/{{limite}}.');
  const [msgExpulsao, setMsgExpulsao] = useState('🚫 {{nome}} foi removido do grupo após {{limite}} violações.');
  const [adding, setAdding] = useState(false);

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
    const data = await fetchGruposWpp(inst.instancia, inst.token);
    setGruposWpp(data);
    setLoadingGrupos(false);
    if (data.length > 0) {
      showToast('success', 'Grupos buscados com sucesso!');
    } else {
      showToast('error', 'Nenhum grupo encontrado ou erro na busca.');
    }
  };

  const toggleGrupo = (jid: string) => {
    setSelectedGrupos(prev => {
      const next = new Set(prev);
      if (next.has(jid)) next.delete(jid);
      else next.add(jid);
      return next;
    });
  };

  const handleAdd = async () => {
    const inst = instancias.find(i => i.instancia === selectedInstancia);
    if (!inst || selectedGrupos.size === 0) return;
    setAdding(true);
    let errorCount = 0;
    for (const jid of selectedGrupos) {
      const grupo = gruposWpp.find(g => g.JID === jid);
      if (!grupo) continue;
      const err = await onAdd({
        grupo_id: jid,
        grupo_nome: grupo.Name || jid,
        instancia: inst.instancia,
        token_instancia: inst.token,
        mensagem_aviso: msgAviso,
        mensagem_expulsao: msgExpulsao,
      });
      if (err) errorCount++;
    }
    setAdding(false);
    if (errorCount === 0) {
      showToast('success', `${selectedGrupos.size} grupo(s) adicionado(s)!`);
      onClose();
    } else {
      showToast('error', `${errorCount} grupo(s) falharam ao adicionar`);
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
                    onChange={(v) => { setSelectedInstancia(v); setGruposWpp([]); setSelectedGrupos(new Set()); }}
                    options={[{ value: '', label: 'Selecione uma instância' }, ...instancias.map(inst => ({ value: inst.instancia, label: `${inst.nome} (${inst.numero})` }))]}
                    placeholder="Selecione uma instância"
                  />
                </div>
                <button
                  onClick={handleBuscarGrupos}
                  disabled={!selectedInstancia || loadingGrupos}
                  className="px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.3)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.2)' }}
                >
                  {loadingGrupos ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar Grupos'}
                </button>
              </div>
            )}
          </div>

          {/* Grupos list */}
          {gruposWpp.length > 0 && (
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wide font-semibold mb-1.5 block">
                Grupos encontrados ({gruposWpp.length})
              </label>
              <div className="max-h-[200px] overflow-y-auto space-y-1 bg-white/[0.02] border border-white/[0.04] rounded-lg p-2">
                {gruposWpp.map(g => (
                  <button
                    key={g.JID}
                    onClick={() => toggleGrupo(g.JID)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
                      selectedGrupos.has(g.JID)
                        ? "bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20"
                        : "text-white hover:bg-white/[0.04] border border-transparent"
                    )}
                  >
                    <p className="font-medium text-sm">{g.Name || 'Sem nome'}</p>
                    <p className="text-white/40 text-xs font-mono mt-0.5">{g.JID}</p>
                  </button>
                ))}
              </div>
              {selectedGrupos.size > 0 && (
                <p className="text-[#3b82f6] text-xs mt-2">{selectedGrupos.size} grupo(s) selecionado(s)</p>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 flex justify-end gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-[10px] text-[13px] font-medium transition-all duration-200"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleAdd}
            disabled={adding || selectedGrupos.size === 0}
            className="flex items-center gap-2 text-[13px] font-medium px-6 py-2.5 rounded-[10px] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--color-primary-bg)', border: '1px solid var(--color-primary-bg)', color: 'var(--color-primary-light)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-primary-bg)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-primary-bg)' }}
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───

const ITEMS_PER_PAGE = 20;

export const Grupos: React.FC = () => {
  // ── Main Tab ──
  const [mainTab, setMainTab] = useState<MainTab>('membros');
  const [modSubTab, setModSubTab] = useState<ModeracaoSubTab>('grupos');

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
  const [showRegrasEmMassa, setShowRegrasEmMassa] = useState(false);
  const [regrasEmMassa, setRegrasEmMassa] = useState<RegrasAtivas>({
    links_spam: true, palavroes: true, adulto: true, propaganda: true, captacao_leads: false,
  });
  const [enviarAvisoEmMassa, setEnviarAvisoEmMassa] = useState(true);
  const [strikesEmMassa, setStrikesEmMassa] = useState(3);
  const [mensagemAvisoEmMassa, setMensagemAvisoEmMassa] = useState('⚠ Mensagem removida por violar as regras do grupo.');
  const [mensagemExpulsaoEmMassa, setMensagemExpulsaoEmMassa] = useState('🚫 Membro removido após 3 violações das regras.');
  const [casasEmMassa, setCasasEmMassa] = useState<string[]>([]);
  const [perfisEmMassa, setPerfisEmMassa] = useState<string[]>([]);
  const [linksEmMassa, setLinksEmMassa] = useState<string[]>([]);
  const [contextoEmMassa, setContextoEmMassa] = useState('');
  const [salvandoEmMassa, setSalvandoEmMassa] = useState(false);
  const avisoEmMassaRef = useRef<HTMLTextAreaElement>(null);
  const expulsaoEmMassaRef = useRef<HTMLTextAreaElement>(null);

  const aplicarRegrasEmMassa = async () => {
    setSalvandoEmMassa(true);
    for (const g of moderacao.grupos) {
      await moderacao.updateGrupo(g.id, {
        regras_ativas: regrasEmMassa,
        enviar_aviso: enviarAvisoEmMassa,
        strikes_para_expulsao: strikesEmMassa,
        mensagem_aviso: mensagemAvisoEmMassa,
        mensagem_expulsao: mensagemExpulsaoEmMassa,
        casas_permitidas: casasEmMassa,
        perfis_permitidos: perfisEmMassa,
        links_permitidos: linksEmMassa,
        contexto_extra: contextoEmMassa || null,
      });
    }
    setSalvandoEmMassa(false);
    setShowRegrasEmMassa(false);
    showToast('success', 'Configurações aplicadas a todos os grupos!');
  };

  // ── Segurança (Instância) ──
  const {
    instanciasSeguranca,
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
  const [segDeleteModal, setSegDeleteModal] = useState<WhatsappRotacao | null>(null);

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
    setLoadingBlacklist(true);
    const { data, error } = await supabase
      .from('blacklist_grupos')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setBlacklist(data as BlacklistItem[]);
    setLoadingBlacklist(false);
  }, []);

  useEffect(() => {
    if (mainTab === 'configuracao') fetchBlacklist();
  }, [mainTab, fetchBlacklist]);

  const addBlacklist = async () => {
    const tel = blacklistTelefone.replace(/\D/g, '');
    if (tel.length < 10) {
      showToast('error', 'Telefone deve ter no mínimo 10 dígitos');
      return;
    }
    setBlacklistAdding(true);
    const { error } = await supabase
      .from('blacklist_grupos')
      .insert({ telefone: tel, motivo: blacklistMotivo.trim() || null, adicionado_por: null });
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

    // Fetch instâncias and open modal
    setLoadingInstanciasRemocao(true);
    setShowRemoveModal(true);
    const { data: instData } = await supabase
      .from('whatsapp_rotacao')
      .select('id, nome, numero, instancia, token')
      .eq('ativo', true)
      .order('ordem');
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
    const { error } = await supabase.from('blacklist_grupos').delete().eq('id', id);
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
      const { data, error } = await supabase
        .from('grupos_ignorar_coleta')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) setGruposIgnorados(data as GrupoIgnorado[]);
    } catch (e) {
      console.error('fetchGruposIgnorados:', e);
    }
    setLoadingGruposIgnorados(false);
  }, []);

  const fetchGruposDisponiveis = useCallback(async () => {
    try {
      const { data: gruposUnicos } = await supabase.rpc('listar_grupos_distintos');

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
  }, []);

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
    const { error } = await supabase.from('grupos_ignorar_coleta').insert({
      grupo_id: grupo.id_grupo,
      grupo_nome: grupo.nome_grupo,
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
      let allData: Lead[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('leads')
          .select('id, nome, telefone, origem, observacoes, id_grupo, nome_grupo, entrou_no_grupo, saiu_grupo')
          .not('entrou_no_grupo', 'is', null)
          .order('entrou_no_grupo', { ascending: false })
          .range(from, from + PAGE_SIZE - 1);

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
  const fetchGruposWppCb = useCallback((inst: string, token: string) => moderacao.fetchGruposWhatsapp(inst, token), [moderacao]);

  // ── Segurança handlers ──
  const segConectados = instanciasSeguranca.filter((n) => n.status_conexao === 'connected').length;
  const segDesconectados = instanciasSeguranca.filter((n) => n.status_conexao === 'disconnected' || !n.status_conexao).length;

  const handleSegToggleAtivo = async (id: number, ativo: boolean) => {
    const erro = await toggleAtivoSeguranca(id, ativo);
    if (erro) showToast('error', erro);
    else showToast('success', ativo ? 'Instância ativada!' : 'Instância desativada!');
  };

  const handleSegCriarInstancia = async (nome: string, numero: string) => {
    const result = await criarInstanciaSeguranca(nome, numero, 'seguranca');
    if (result.sucesso) {
      showToast('success', 'Instância segurança criada! Aguardando pareamento...');
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
          { key: 'membros' as MainTab, label: 'Membros', icon: Users, activeStyle: { background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa' } },
          { key: 'moderacao' as MainTab, label: 'Moderação', icon: Shield, activeStyle: { background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa' } },
          { key: 'configuracao' as MainTab, label: 'Configuração', icon: Settings, activeStyle: { background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' } },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setMainTab(tab.key)}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-[10px] text-[13px] font-medium transition-all duration-250"
            style={mainTab === tab.key
              ? tab.activeStyle
              : { background: 'transparent', border: '1px solid transparent', color: 'rgba(255,255,255,0.45)' }
            }
            onMouseEnter={(e) => { if (mainTab !== tab.key) { e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' } }}
            onMouseLeave={(e) => { if (mainTab !== tab.key) { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; e.currentTarget.style.background = 'transparent' } }}
          >
            <tab.icon className="w-4 h-4" style={{ opacity: mainTab === tab.key ? 1 : 0.45 }} />
            {tab.label}
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
                      sendViaWhatsapp ? "bg-[#3b82f6]" : "bg-[#2a2a2a]"
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
                          className="w-full bg-white/[0.04] border border-white/[0.04] text-white rounded-lg py-2.5 px-3.5 text-sm placeholder-[#4b5563] focus:outline-none focus:border-[#3b82f6]/50 transition-colors"
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
                      "flex items-center gap-2 bg-[#3b82f6] text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-all duration-200",
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
                style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa' }}
              >
                {stats.total} membros
              </span>
            </div>
            <button
              onClick={openReportModal}
              disabled={searchFiltered.length === 0}
              className="flex items-center gap-2 text-[13px] font-medium transition-all duration-200 shrink-0"
              style={{
                background: 'rgba(59,130,246,0.12)',
                border: '1px solid rgba(59,130,246,0.25)',
                color: '#60a5fa',
                padding: '10px 20px',
                borderRadius: '12px',
                opacity: searchFiltered.length === 0 ? 0.5 : 1,
                cursor: searchFiltered.length === 0 ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => { if (searchFiltered.length > 0) { e.currentTarget.style.background = 'rgba(59,130,246,0.2)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.35)' } }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.12)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.25)' }}
            >
              <FileDown className="w-[18px] h-[18px]" />
              Gerar Relatório
            </button>
          </div>

          {/* Cards Resumo — Glass */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { icon: Users, label: 'Total de Membros', value: stats.total, suffix: '', iconBg: 'rgba(59,130,246,0.12)', iconColor: '#60a5fa', valueColor: '#fff' },
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
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.08)' }}
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
                        ? "bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20"
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
                        ? "bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20"
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
                  className="text-[#3b82f6] text-sm hover:underline cursor-pointer ml-auto shrink-0"
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
              { key: 'grupos' as ModeracaoSubTab, label: 'Grupos Monitorados' },
              { key: 'log' as ModeracaoSubTab, label: 'Log de Ações' },
              { key: 'instancia' as ModeracaoSubTab, label: 'Instância' },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setModSubTab(tab.key)}
                className="px-4 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-200"
                style={modSubTab === tab.key
                  ? { background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa' }
                  : { background: 'transparent', border: '1px solid transparent', color: 'rgba(255,255,255,0.4)' }
                }
                onMouseEnter={(e) => { if (modSubTab !== tab.key) { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' } }}
                onMouseLeave={(e) => { if (modSubTab !== tab.key) { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'transparent' } }}
              >
                {tab.label}
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
                  style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)' }}
                >
                  <Shield className="w-5 h-5" style={{ color: '#60a5fa' }} />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.5px] font-semibold" style={{ color: 'rgba(255,255,255,0.45)' }}>Ações Hoje</p>
                  <p className="text-white font-bold text-[24px] tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>{moderacao.acoesHoje}</p>
                </div>
              </div>

              <p className="text-[13px] max-w-[800px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Grupos com moderação automática ativa. O segurança analisa mensagens de texto, áudio e imagem, remove violações e expulsa membros reincidentes.
              </p>

              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  type="text"
                  value={buscaGrupoMod}
                  onChange={(e) => setBuscaGrupoMod(e.target.value)}
                  placeholder="Buscar grupo pelo nome..."
                  className="w-full bg-white/[0.03] border border-white/[0.04] text-white rounded-xl py-2.5 pl-10 pr-10 text-[13px] placeholder-[#4b5563] focus:outline-none focus:border-[#3b82f6]/40 transition-colors"
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
                        onClick={() => setShowRegrasEmMassa(prev => !prev)}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-200"
                        style={{ background: showRegrasEmMassa ? 'rgba(59,130,246,0.12)' : 'transparent', border: '1px solid rgba(59,130,246,0.25)', color: '#60a5fa' }}
                        onMouseEnter={(e) => { if (!showRegrasEmMassa) e.currentTarget.style.background = 'rgba(59,130,246,0.08)' }}
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
                      style={{ background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.12)' }}
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
                                color="bg-blue-500"
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
                          <Toggle checked={enviarAvisoEmMassa} onChange={setEnviarAvisoEmMassa} color="bg-blue-500" />
                        </div>
                        <div className={`space-y-3 transition-all duration-200 ${!enviarAvisoEmMassa ? 'opacity-40 pointer-events-none select-none' : ''}`}>
                          <div>
                            <label className="text-white/50 text-[11px] mb-1 block">Mensagem de Aviso</label>
                            <textarea
                              ref={avisoEmMassaRef}
                              value={mensagemAvisoEmMassa}
                              onChange={(e) => setMensagemAvisoEmMassa(e.target.value)}
                              rows={3}
                              className="w-full bg-white/[0.02] border border-white/[0.04] text-white rounded-lg py-2.5 px-3.5 text-[13px] placeholder-[#4b5563] focus:outline-none focus:border-[#3b82f6]/40 transition-colors resize-none"
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
                              className="w-full bg-white/[0.02] border border-white/[0.04] text-white rounded-lg py-2.5 px-3.5 text-[13px] placeholder-[#4b5563] focus:outline-none focus:border-[#3b82f6]/40 transition-colors resize-none"
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
                            className="w-16 text-center rounded-lg py-1 text-[13px] font-medium text-white [appearance:textfield] outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
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
                          className="w-full bg-white/[0.02] border border-white/[0.04] text-white rounded-lg py-2.5 px-3.5 text-[13px] placeholder-[#4b5563] focus:outline-none focus:border-[#3b82f6]/40 transition-colors resize-none"
                        />
                        <p className="text-white/20 text-[11px] mt-1">Ajuda a IA a moderar com mais precisão</p>
                      </div>

                      {/* Botão aplicar */}
                      <button
                        onClick={aplicarRegrasEmMassa}
                        disabled={salvandoEmMassa}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 disabled:opacity-50"
                        style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa' }}
                        onMouseEnter={(e) => { if (!salvandoEmMassa) e.currentTarget.style.background = 'rgba(59,130,246,0.25)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.15)' }}
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
                    style={{ border: '2px dashed rgba(59,130,246,0.2)', borderRadius: '14px', color: 'rgba(59,130,246,0.6)', background: 'transparent' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)'; e.currentTarget.style.background = 'rgba(59,130,246,0.04)'; e.currentTarget.style.color = '#60a5fa' }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.2)'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(59,130,246,0.6)' }}
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
                    Instância dedicada à moderação dos grupos. Este número será o segurança que monitora mensagens, remove violações e expulsa membros reincidentes.
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
                    style={{ border: '2px dashed rgba(59,130,246,0.2)', borderRadius: '14px', color: 'rgba(59,130,246,0.6)', background: 'transparent' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)'; e.currentTarget.style.background = 'rgba(59,130,246,0.04)'; e.currentTarget.style.color = '#60a5fa' }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.2)'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(59,130,246,0.6)' }}
                  >
                    <Plus className="w-4 h-4" />
                    Nova Instância Segurança
                  </button>
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
            <NovaInstanciaModal
              onCriarInstancia={handleSegCriarInstancia}
              onClose={() => setSegNovaModal(false)}
            />
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
              onAdd={moderacao.insertGrupo}
              fetchInstancias={fetchInstanciasCb}
              fetchGruposWpp={fetchGruposWppCb}
              showToast={showToast}
            />
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* ═══ TAB: CONFIGURAÇÃO ═══ */}
      {/* ═══════════════════════════════════════════ */}
      {mainTab === 'configuracao' && (
        <div className="space-y-6">
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
              onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.08)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.boxShadow = 'none' }}
            />
            <input
              type="text"
              placeholder="Ex: Spam, propaganda..."
              value={blacklistMotivo}
              onChange={e => setBlacklistMotivo(e.target.value)}
              className="flex-1 text-white text-[13px] outline-none transition-all duration-200"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', padding: '10px 16px' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.08)' }}
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
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.08)' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.boxShadow = 'none' }}
                />
              </div>
            )}
          </div>

          {/* Tabela ou estado vazio */}
          {loadingBlacklist ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(59,130,246,0.2)', borderTopColor: '#3b82f6' }} />
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
                    <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(59,130,246,0.2)', borderTopColor: '#3b82f6' }} />
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
                            background: isChecked ? 'rgba(59,130,246,0.06)' : 'rgba(255,255,255,0.04)',
                            border: isChecked ? '1px solid rgba(59,130,246,0.2)' : '1px solid rgba(255,255,255,0.04)',
                          }}
                        >
                          <div
                            onClick={(e) => { e.preventDefault(); handleToggleInstancia(inst.id); }}
                            className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all duration-200 cursor-pointer"
                            style={{
                              background: isChecked ? '#3b82f6' : 'rgba(255,255,255,0.04)',
                              border: isChecked ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.2)',
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
                  border: grupoSelectAberto ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(255,255,255,0.04)',
                  borderRadius: '12px',
                  padding: '10px 16px',
                  color: grupoSelecionadoObj ? 'white' : 'rgba(255,255,255,0.35)',
                  boxShadow: grupoSelectAberto ? '0 0 0 3px rgba(59,130,246,0.08)' : 'none',
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
                        onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.2)' }}
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
                            {isActive && <Check size={12} className="text-[#60a5fa] flex-shrink-0" />}
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
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.08)' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.boxShadow = 'none' }}
                />
              </div>
            )}
          </div>

          {/* Tabela ou estado vazio — Grupos Ignorados */}
          {loadingGruposIgnorados ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(59,130,246,0.2)', borderTopColor: '#3b82f6' }} />
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
    </div>
  );
};
