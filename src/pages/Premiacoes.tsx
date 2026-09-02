import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Gift, Upload, Loader2, Search, CheckCircle2, Clock, Image, X, Calendar, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FileText, Check, Send } from 'lucide-react';
import { format, isSameDay, getDaysInMonth, getMonth } from 'date-fns';
import { PageHeader } from '../components/PageHeader';
import { Toast } from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { usePremiacoes } from '../hooks/usePremiacoes';
import type { PremiacaoFiltros, Premiacao } from '../hooks/usePremiacoes';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { WEBHOOKS, fetchWithTimeout } from '../config/webhooks';
import { cn } from '../utils/cn';

const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// ── Day Picker (replicado do Dashboard) ──

const DayPicker: React.FC<{
  selectedDate: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
  label: string;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}> = ({ selectedDate, onSelect, onClose, label, anchorRef }) => {
  const [viewMonth, setViewMonth] = useState(getMonth(selectedDate));
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  // Calcula posicao fixa a partir do botao (abre pra cima se nao cabe embaixo)
  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      const pickerWidth = 260;
      const pickerHeight = 340;
      let left = rect.left + rect.width / 2 - pickerWidth / 2;
      left = Math.max(8, Math.min(left, window.innerWidth - pickerWidth - 8));
      const spaceBelow = window.innerHeight - rect.bottom;
      const top = spaceBelow < pickerHeight + 16
        ? rect.top - pickerHeight - 8
        : rect.bottom + 8;
      setPos({ top, left });
    }
  }, [anchorRef]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && anchorRef.current && !anchorRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose, anchorRef]);

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

  return ReactDOM.createPortal(
    <div
      ref={ref}
      className="fixed animate-fade-in w-[260px] overflow-hidden"
      style={{
        top: pos.top,
        left: pos.left,
        zIndex: 9999,
        background: 'var(--c-popup-bg)',
        border: '1px solid var(--c-border)',
        borderRadius: '14px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgb(var(--c-fg-rgb) / 0.04), inset 0 1px 0 rgb(var(--c-fg-rgb) / 0.06)',
        backdropFilter: 'blur(20px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
      }}
    >
      <div style={{ padding: '16px 16px 4px' }}>
        <span className="text-[11px] uppercase font-medium" style={{ color: 'var(--c-t-40)', letterSpacing: '0.5px' }}>{label}</span>
      </div>

      <div className="flex items-center justify-between" style={{ padding: '8px 16px' }}>
        <button
          onClick={() => setViewMonth(m => Math.max(0, m - 1))}
          className="transition-all duration-150"
          style={{ color: 'var(--c-t-40)', background: 'transparent', border: 'none', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--c-glass-hover)'; e.currentTarget.style.color = 'rgb(var(--c-fg-rgb) / 0.7)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgb(var(--c-fg-rgb) / 0.4)'; }}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="text-[14px] font-semibold text-txt">{MONTHS_SHORT[viewMonth]}</span>
        <button
          onClick={() => setViewMonth(m => Math.min(11, m + 1))}
          className="transition-all duration-150"
          style={{ color: viewMonth >= getMonth(now) ? 'rgb(var(--c-fg-rgb) / 0.15)' : 'rgb(var(--c-fg-rgb) / 0.4)', background: 'transparent', border: 'none', padding: '4px 8px', borderRadius: '6px', cursor: viewMonth >= getMonth(now) ? 'default' : 'pointer' }}
          onMouseEnter={(e) => { if (viewMonth < getMonth(now)) { e.currentTarget.style.background = 'var(--c-glass-hover)'; e.currentTarget.style.color = 'rgb(var(--c-fg-rgb) / 0.7)'; } }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = viewMonth >= getMonth(now) ? 'rgb(var(--c-fg-rgb) / 0.15)' : 'rgb(var(--c-fg-rgb) / 0.4)'; }}
          disabled={viewMonth >= getMonth(now)}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div style={{ padding: '0 16px 16px' }}>
        <div className="grid grid-cols-7" style={{ gap: '2px' }}>
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
            <div key={i} className="text-[11px] text-center font-medium" style={{ color: 'var(--c-t-35)', padding: '6px 0' }}>{d}</div>
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
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  background: isSelected ? 'var(--color-primary)' : 'transparent',
                  color: isFuture ? 'rgb(var(--c-fg-rgb) / 0.15)' : isSelected ? '#fff' : isToday ? 'var(--color-primary-light)' : 'rgb(var(--c-fg-rgb) / 0.7)',
                  fontWeight: isSelected || isToday ? 600 : 400,
                  cursor: isFuture ? 'not-allowed' : 'pointer',
                  border: isToday && !isSelected ? '1px solid rgba(var(--color-primary-rgb),0.4)' : '1px solid transparent',
                }}
                onMouseEnter={(e) => { if (!isFuture && !isSelected) { e.currentTarget.style.background = 'var(--c-glass-hover)'; e.currentTarget.style.color = 'rgb(var(--c-fg-rgb))'; } }}
                onMouseLeave={(e) => { if (!isFuture && !isSelected) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = isToday ? 'var(--color-primary-light)' : 'rgb(var(--c-fg-rgb) / 0.7)'; } }}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
};

// ── Paginacao (replicado do Leads) ──

const ITEMS_PER_PAGE = 10;

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 1) return [1];
  const pages: (number | '...')[] = [1];
  if (current <= 4) {
    for (let i = 2; i <= Math.min(5, total - 1); i++) pages.push(i);
    if (total > 6) pages.push('...');
  } else if (current >= total - 3) {
    pages.push('...');
    for (let i = Math.max(total - 4, 2); i <= total - 1; i++) pages.push(i);
  } else {
    pages.push('...');
    pages.push(current - 1);
    pages.push(current);
    pages.push(current + 1);
    pages.push('...');
  }
  pages.push(total);
  return pages;
}

const Pagination: React.FC<{
  current: number;
  total: number;
  totalPages: number;
  onChange: (page: number) => void;
}> = ({ current, total, totalPages, onChange }) => {
  const pages = getPageNumbers(current, totalPages);

  return (
    <div className="px-5 py-4 border-t border-surface-300/20 flex items-center justify-between">
      <span className="text-[11px] text-txt-muted font-mono">
        {total === 0
          ? '0 de 0'
          : `${(current - 1) * ITEMS_PER_PAGE + 1}-${Math.min(current * ITEMS_PER_PAGE, total)} de ${total}`
        }
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(1)}
          disabled={current === 1}
          className="p-1.5 border border-surface-300/30 rounded-lg hover:bg-surface-200/40 hover:border-surface-300/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-txt-muted hover:text-txt"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onChange(Math.max(1, current - 1))}
          disabled={current === 1}
          className="p-1.5 border border-surface-300/30 rounded-lg hover:bg-surface-200/40 hover:border-surface-300/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-txt-muted hover:text-txt"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        {pages.map((p, idx) =>
          p === '...' ? (
            <span key={`dots-${idx}`} className="px-1.5 text-[11px] text-txt-dim font-mono select-none">...</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`min-w-[32px] h-[32px] flex items-center justify-center rounded-lg text-[11px] font-mono font-medium transition-all duration-150 ${
                p === current
                  ? 'bg-[#3b82f6]/15 text-[#3b82f6] border border-[#3b82f6]/30'
                  : 'border border-surface-300/30 text-txt-muted hover:bg-surface-200/40 hover:border-surface-300/50 hover:text-txt'
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onChange(Math.min(totalPages, current + 1))}
          disabled={current === totalPages}
          className="p-1.5 border border-surface-300/30 rounded-lg hover:bg-surface-200/40 hover:border-surface-300/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-txt-muted hover:text-txt"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onChange(totalPages)}
          disabled={current === totalPages}
          className="p-1.5 border border-surface-300/30 rounded-lg hover:bg-surface-200/40 hover:border-surface-300/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-txt-muted hover:text-txt"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

// ── Formatadores ──

const formatarData = (iso: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const formatarValor = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ── Status Badge ──

const StatusBadge: React.FC<{ status: Premiacao['status'] }> = ({ status }) => {
  const config = status === 'recebido'
    ? { label: 'Recebido', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.25)', color: '#34d399', Icon: CheckCircle2 }
    : { label: 'Pendente', bg: 'rgba(250,204,21,0.12)', border: 'rgba(250,204,21,0.25)', color: '#facc15', Icon: Clock };

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wide"
      style={{ background: config.bg, border: `1px solid ${config.border}`, color: config.color }}
    >
      <config.Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
};

// ── Skeleton ──

const SkeletonRow: React.FC = () => (
  <div className="card-dark rounded-xl p-4 border border-surface-300/10 animate-pulse">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 bg-surface-200/40 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-48 bg-surface-200/30 rounded" />
        <div className="h-3 w-32 bg-surface-200/20 rounded" />
      </div>
      <div className="h-6 w-20 bg-surface-200/20 rounded-lg" />
    </div>
  </div>
);

// ── Foto Preview Modal ──

const FotoPreviewModal: React.FC<{ url: string; onClose: () => void }> = ({ url, onClose }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
    style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
    onClick={onClose}
  >
    <div className="relative max-w-2xl max-h-[80vh] animate-slide-up" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={onClose}
        className="absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center z-10"
        style={{ background: 'var(--c-popup-bg)', border: '1px solid var(--c-border-strong)', color: 'var(--c-t-60)' }}
      >
        <X className="w-4 h-4" />
      </button>
      <img src={url} alt="Print do direct" className="rounded-xl max-h-[80vh] object-contain" />
    </div>
  </div>
);

// ── Instancia type ──

interface InstanciaWpp {
  id: number;
  nome: string;
  numero: string;
  instancia: string;
  token: string;
  status_conexao: string;
}

// ── Modal Relatorio WhatsApp ──

const RelatorioModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  premiacoes: Premiacao[];
  showToast: (type: 'success' | 'error', msg: string) => void;
}> = ({ isOpen, onClose, premiacoes, showToast }) => {
  const getActiveExpertId = useAuthStore((s) => s.getActiveExpertId);

  // Selecao
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  // Filtros internos do modal
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pendente' | 'recebido'>('todos');
  const [busca, setBusca] = useState('');

  // Envio
  const [instancias, setInstancias] = useState<InstanciaWpp[]>([]);
  const [loadingInst, setLoadingInst] = useState(false);
  const [instanciaSelecionada, setInstanciaSelecionada] = useState('');
  const [telefone, setTelefone] = useState('');
  const [enviarPrints, setEnviarPrints] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // Buscar instancias conectadas
  useEffect(() => {
    if (!isOpen) return;
    const fetchInst = async () => {
      setLoadingInst(true);
      try {
        const expertId = getActiveExpertId();
        let query = supabase
          .from('whatsapp_rotacao')
          .select('id, nome, numero, instancia, token, status_conexao')
          .eq('tipo', 'disparadora')
          .eq('ativo', true)
          .eq('status_conexao', 'connected')
          .order('nome');
        if (expertId) query = query.eq('expert_id', expertId);
        const { data } = await query;
        setInstancias((data ?? []) as InstanciaWpp[]);
      } catch (err: unknown) {
        console.error('Erro ao buscar instancias:', err);
      } finally {
        setLoadingInst(false);
      }
    };
    fetchInst();
  }, [isOpen, getActiveExpertId]);

  // Reset ao abrir
  useEffect(() => {
    if (isOpen) {
      setSelecionados(new Set());
      setFiltroStatus('todos');
      setBusca('');
      setInstanciaSelecionada('');
      setTelefone('');
      setEnviarPrints(false);
    }
  }, [isOpen]);

  // Premiacoes filtradas no modal
  const filtradas = useMemo(() => {
    return premiacoes.filter(p => {
      if (filtroStatus !== 'todos' && p.status !== filtroStatus) return false;
      if (busca) {
        const b = busca.toLowerCase();
        if (!p.instagram_username.toLowerCase().includes(b) && !p.id_conta.toLowerCase().includes(b)) return false;
      }
      return true;
    });
  }, [premiacoes, filtroStatus, busca]);

  const toggleSelecionado = (id: string) => {
    setSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleTodos = () => {
    if (selecionados.size === filtradas.length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(filtradas.map(p => p.id)));
    }
  };

  const handleEnviar = async () => {
    if (selecionados.size === 0) { showToast('error', 'Selecione pelo menos uma premiacao'); return; }

    const inst = instancias.find(i => i.instancia === instanciaSelecionada);
    if (!inst) { showToast('error', 'Selecione uma instancia'); return; }

    const tel = telefone.replace(/\D/g, '');
    if (!tel || tel.length < 10) { showToast('error', 'Informe um telefone valido'); return; }

    const premiacoesSelecionadas = premiacoes
      .filter(p => selecionados.has(p.id))
      .map(p => ({
        instagram_username: p.instagram_username,
        id_conta: p.id_conta,
        valor: p.valor,
        status: p.status,
        data_lancamento: p.data_lancamento,
        data_recebimento: p.data_recebimento,
        foto_url: p.foto_url,
      }));

    try {
      setEnviando(true);
      const res = await fetchWithTimeout(WEBHOOKS.RELATORIO_PREMIACOES, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instancia: inst.instancia,
          token: inst.token,
          telefone_destino: tel,
          premiacoes: premiacoesSelecionadas,
          enviar_prints: enviarPrints,
        }),
      }, 60000);

      const data = await res.json();
      if (data.sucesso) {
        showToast('success', 'Relatorio enviado com sucesso!');
        onClose();
      } else {
        showToast('error', data.mensagem || 'Erro ao enviar relatorio');
      }
    } catch {
      showToast('error', 'Erro ao enviar relatorio');
    } finally {
      setEnviando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] flex flex-col animate-slide-up overflow-hidden"
        style={{
          background: 'var(--c-popup-bg)',
          border: '1px solid var(--c-border-strong)',
          borderRadius: '20px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-glass shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(var(--color-primary-rgb),0.12)', border: '1px solid rgba(var(--color-primary-rgb),0.2)' }}
            >
              <FileText className="w-4 h-4" style={{ color: 'var(--color-primary-light)' }} />
            </div>
            <h3 className="text-[16px] font-semibold text-txt font-display">Enviar Relatorio WhatsApp</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ background: 'var(--c-glass)', border: '1px solid var(--c-border)', color: 'var(--c-t-40)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conteudo scrollavel */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Filtros do modal */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--c-t-30)' }} />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar Instagram ou ID..."
                className="w-full text-[12px] rounded-lg py-2 pl-9 pr-3 outline-none"
                style={{ background: 'var(--c-glass)', border: '1px solid var(--c-border)', color: 'var(--c-t-100)' }}
              />
            </div>
            <div className="flex gap-1">
              {(['todos', 'pendente', 'recebido'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setFiltroStatus(s)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all border',
                    filtroStatus === s
                      ? 'bg-surface-200/40 text-txt border-surface-300/20'
                      : 'text-txt-dim hover:text-txt border-transparent'
                  )}
                >
                  {s === 'todos' ? 'Todos' : s === 'pendente' ? 'Pendentes' : 'Recebidos'}
                </button>
              ))}
            </div>
          </div>

          {/* Selecionar todos + contagem */}
          <div className="flex items-center justify-between">
            <button
              onClick={toggleTodos}
              className="flex items-center gap-1.5 text-[11px] font-medium transition-all"
              style={{ color: 'var(--color-primary-light)' }}
            >
              <div
                className="w-4 h-4 rounded border flex items-center justify-center"
                style={selecionados.size === filtradas.length && filtradas.length > 0
                  ? { background: 'var(--color-primary)', borderColor: 'var(--color-primary)' }
                  : { background: 'var(--c-glass)', borderColor: 'var(--c-border-strong)' }
                }
              >
                {selecionados.size === filtradas.length && filtradas.length > 0 && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
              </div>
              {selecionados.size === filtradas.length && filtradas.length > 0 ? 'Limpar selecao' : 'Selecionar todos'}
            </button>
            <span className="text-[11px] font-mono" style={{ color: 'var(--c-t-40)' }}>
              {selecionados.size} de {filtradas.length} selecionado{selecionados.size !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Lista de premiacoes */}
          <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgb(var(--c-fg-rgb) / 0.1) transparent' }}>
            {filtradas.length === 0 ? (
              <p className="text-[12px] text-center py-6" style={{ color: 'var(--c-t-30)' }}>Nenhuma premiacao encontrada</p>
            ) : (
              filtradas.map(p => {
                const checked = selecionados.has(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleSelecionado(p.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-left"
                    style={{
                      background: checked ? 'rgba(var(--color-primary-rgb),0.08)' : 'var(--c-glass-2)',
                      border: `1px solid ${checked ? 'rgba(var(--color-primary-rgb),0.2)' : 'var(--c-border)'}`,
                    }}
                  >
                    <div
                      className="w-4 h-4 rounded border shrink-0 flex items-center justify-center"
                      style={checked
                        ? { background: 'var(--color-primary)', borderColor: 'var(--color-primary)' }
                        : { background: 'var(--c-glass)', borderColor: 'var(--c-border-strong)' }
                      }
                    >
                      {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-medium text-txt truncate">@{p.instagram_username}</span>
                        <span
                          className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded"
                          style={p.status === 'recebido'
                            ? { background: 'rgba(52,211,153,0.12)', color: '#34d399' }
                            : { background: 'rgba(250,204,21,0.12)', color: '#facc15' }
                          }
                        >
                          {p.status}
                        </span>
                      </div>
                      <span className="text-[11px]" style={{ color: 'var(--c-t-35)' }}>
                        ID: {p.id_conta} — R$ {Number(p.valor).toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                    {p.foto_url && <Image className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--c-t-20)' }} />}
                  </button>
                );
              })
            )}
          </div>

          {/* Separador */}
          <div className="h-px" style={{ background: 'var(--c-border)' }} />

          {/* Config de envio */}
          <div className="space-y-4">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.5px]" style={{ color: 'var(--c-t-40)' }}>
              Configuracao de envio
            </h4>

            {/* Instancia */}
            <div>
              <label className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--c-t-35)' }}>Instancia WhatsApp</label>
              {loadingInst ? (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--c-t-30)' }} />
                  <span className="text-[12px]" style={{ color: 'var(--c-t-30)' }}>Carregando...</span>
                </div>
              ) : (
                <select
                  value={instanciaSelecionada}
                  onChange={(e) => setInstanciaSelecionada(e.target.value)}
                  className="w-full text-[13px] rounded-lg py-2.5 px-3 outline-none"
                  style={{ background: 'var(--c-glass)', border: '1px solid var(--c-border)', color: 'var(--c-t-100)' }}
                >
                  <option value="">Selecione uma instancia</option>
                  {instancias.map(i => (
                    <option key={i.id} value={i.instancia}>{i.nome} — {i.numero}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Telefone */}
            <div>
              <label className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--c-t-35)' }}>Telefone destino</label>
              <input
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="5511999999999"
                className="w-full text-[13px] rounded-lg py-2.5 px-3 outline-none font-mono"
                style={{ background: 'var(--c-glass)', border: '1px solid var(--c-border)', color: 'var(--c-t-100)' }}
              />
            </div>

            {/* Toggle enviar prints */}
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium" style={{ color: 'var(--c-t-50)' }}>Enviar prints junto</span>
              <button
                type="button"
                onClick={() => setEnviarPrints(!enviarPrints)}
                role="switch"
                aria-checked={enviarPrints}
                className="relative w-10 h-[22px] rounded-full transition-colors duration-200"
                style={{ background: enviarPrints ? 'var(--color-primary)' : 'rgb(var(--c-fg-rgb) / 0.1)' }}
              >
                <div
                  className="absolute top-[3px] w-4 h-4 rounded-full bg-white transition-all duration-200"
                  style={{ left: enviarPrints ? '22px' : '3px' }}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-glass shrink-0">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200"
              style={{ background: 'var(--c-glass)', border: '1px solid var(--c-border)', color: 'var(--c-t-60)' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleEnviar}
              disabled={enviando || selecionados.size === 0 || !instanciaSelecionada || !telefone.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: 'rgba(var(--color-primary-rgb),0.2)',
                border: '1px solid rgba(var(--color-primary-rgb),0.3)',
                color: 'var(--color-primary-light)',
              }}
            >
              {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {enviando ? 'Enviando...' : `Enviar Relatorio (${selecionados.size})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Pagina Principal ──

export const Premiacoes: React.FC = () => {
  const { toast, showToast, hideToast } = useToast();
  const {
    premiacoes, loading, submitting,
    fetchPremiacoes, verificarBloqueio, uploadFoto, criarPremiacao, toggleStatus,
  } = usePremiacoes();

  // Formulario
  const [instagram, setInstagram] = useState('');
  const [idConta, setIdConta] = useState('');
  const [valor, setValor] = useState<50 | 100>(50);
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [observacoes, setObservacoes] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pendente' | 'recebido'>('todos');
  const [filtroBusca, setFiltroBusca] = useState('');
  const [dateStart, setDateStart] = useState<Date | null>(null);
  const [dateEnd, setDateEnd] = useState<Date | null>(null);
  const [startPickerOpen, setStartPickerOpen] = useState(false);
  const [endPickerOpen, setEndPickerOpen] = useState(false);
  const startBtnRef = useRef<HTMLButtonElement>(null);
  const endBtnRef = useRef<HTMLButtonElement>(null);

  const dataInicioStr = dateStart ? format(dateStart, 'yyyy-MM-dd') : '';
  const dataFimStr = dateEnd ? format(dateEnd, 'yyyy-MM-dd') : '';

  // Paginacao
  const [currentPage, setCurrentPage] = useState(1);

  // Preview de foto na lista
  const [fotoModal, setFotoModal] = useState<string | null>(null);
  const [relatorioModal, setRelatorioModal] = useState(false);

  // Carregar dados + resetar pagina ao mudar filtros
  useEffect(() => {
    setCurrentPage(1);
    fetchPremiacoes({ status: filtroStatus, busca: filtroBusca, dataInicio: dataInicioStr, dataFim: dataFimStr });
  }, [fetchPremiacoes, filtroStatus, filtroBusca, dataInicioStr, dataFimStr]);

  const handleRefresh = useCallback(() => {
    fetchPremiacoes({ status: filtroStatus, busca: filtroBusca, dataInicio: dataInicioStr, dataFim: dataFimStr });
  }, [fetchPremiacoes, filtroStatus, filtroBusca, dataInicioStr, dataFimStr]);

  // Dados paginados
  const totalPages = Math.max(1, Math.ceil(premiacoes.length / ITEMS_PER_PAGE));
  const paginatedPremiacoes = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return premiacoes.slice(start, start + ITEMS_PER_PAGE);
  }, [premiacoes, currentPage]);

  // Upload de foto (formulario)
  const handleFileChange = (file: File | null) => {
    if (!file) {
      setFoto(null);
      setFotoPreview(null);
      return;
    }
    setFoto(file);
    const reader = new FileReader();
    reader.onload = () => setFotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const instaClean = instagram.replace('@', '').trim();
    const contaClean = idConta.trim();

    if (!instaClean || !contaClean) {
      showToast('error', 'Preencha o Instagram e o ID da banca');
      return;
    }

    // Verificar bloqueio
    const bloqueio = await verificarBloqueio(contaClean);
    if (bloqueio.bloqueado) {
      showToast('error', `Esta banca esta bloqueada. Faltam ${bloqueio.dias_restantes} dia(s) para liberar.`);
      return;
    }

    // Upload foto se houver
    let fotoUrl: string | null = null;
    if (foto) {
      setUploading(true);
      fotoUrl = await uploadFoto(foto);
      setUploading(false);
      if (!fotoUrl) {
        showToast('error', 'Erro ao fazer upload da foto');
        return;
      }
    }

    const ok = await criarPremiacao({
      instagram_username: instaClean,
      id_conta: contaClean,
      valor,
      foto_url: fotoUrl,
      observacoes: observacoes.trim() || null,
    });

    if (ok) {
      showToast('success', 'Banca enviada com sucesso!');
      setInstagram('');
      setIdConta('');
      setValor(50);
      setFoto(null);
      setFotoPreview(null);
      setObservacoes('');
      fetchPremiacoes(filtros);
    } else {
      showToast('error', 'Erro ao enviar banca');
    }
  };

  // Alternar status
  const handleToggleStatus = async (id: string) => {
    const novoStatus = await toggleStatus(id);
    if (novoStatus) {
      showToast('success', novoStatus === 'recebido' ? 'Marcado como recebido!' : 'Voltou para pendente!');
    } else {
      showToast('error', 'Erro ao alterar status');
    }
  };

  const isSubmitting = submitting || uploading;

  // Contadores
  const totalPendentes = premiacoes.filter(p => p.status === 'pendente').length;
  const totalRecebidos = premiacoes.filter(p => p.status === 'recebido').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Premiacoes"
        subtitle="Gerenciamento de bancas e premiacoes"
        onRefresh={handleRefresh}
        isRefreshing={loading}
        rightContent={
          <button
            onClick={() => setRelatorioModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200"
            style={{
              background: 'rgba(var(--color-primary-rgb),0.12)',
              border: '1px solid rgba(var(--color-primary-rgb),0.2)',
              color: 'var(--color-primary-light)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.2)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.12)' }}
          >
            <FileText className="w-4 h-4" />
            Enviar Relatorio
          </button>
        }
      />

      {/* ── Formulario: Enviar Banca ── */}
      <div className="glass-card p-6 space-y-5">
        <h2 className="text-[15px] font-semibold text-txt font-display mb-1">Enviar Banca</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Instagram */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.5px] mb-1.5" style={{ color: 'var(--c-t-40)' }}>
                @ do Instagram
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-medium" style={{ color: 'var(--c-t-30)' }}>@</span>
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value.replace('@', ''))}
                  placeholder="username"
                  className="input-dark text-[13px] pl-8"
                />
              </div>
            </div>

            {/* ID da Banca */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.5px] mb-1.5" style={{ color: 'var(--c-t-40)' }}>
                ID da Banca
              </label>
              <input
                type="text"
                value={idConta}
                onChange={(e) => setIdConta(e.target.value)}
                placeholder="ID da conta na casa de apostas"
                className="input-dark text-[13px]"
              />
            </div>
          </div>

          {/* Valor */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.5px] mb-1.5" style={{ color: 'var(--c-t-40)' }}>
              Valor
            </label>
            <div className="flex gap-3">
              {([50, 100] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setValor(v)}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl text-[14px] font-semibold transition-all duration-200 border',
                    valor === v
                      ? 'text-white'
                      : 'text-txt-muted hover:text-txt-secondary hover:bg-glass'
                  )}
                  style={valor === v
                    ? { background: 'rgba(var(--color-primary-rgb),0.15)', borderColor: 'rgba(var(--color-primary-rgb),0.4)', color: 'var(--color-primary-light)' }
                    : { background: 'var(--c-glass)', borderColor: 'var(--c-border)' }
                  }
                >
                  R$ {v},00
                </button>
              ))}
            </div>
          </div>

          {/* Upload de foto */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.5px] mb-1.5" style={{ color: 'var(--c-t-40)' }}>
              Print do Direct (opcional)
            </label>
            {fotoPreview ? (
              <div className="relative inline-block">
                <img src={fotoPreview} alt="Preview" className="h-24 rounded-xl object-cover border border-glass" />
                <button
                  type="button"
                  onClick={() => handleFileChange(null)}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(239,68,68,0.9)', color: '#fff' }}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200"
                style={{ borderColor: 'var(--c-border)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(var(--color-primary-rgb),0.3)';
                  e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--c-border)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <Upload className="w-5 h-5 mx-auto mb-1.5" style={{ color: 'var(--c-t-30)' }} />
                <p className="text-[12px]" style={{ color: 'var(--c-t-35)' }}>Arraste uma imagem ou clique para selecionar</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
            />
          </div>

          {/* Observacoes */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.5px] mb-1.5" style={{ color: 'var(--c-t-40)' }}>
              Observacoes (opcional)
            </label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
              placeholder="Alguma observacao sobre esta premiacao..."
              className="input-dark text-[13px] resize-none"
            />
          </div>

          {/* Botao submit */}
          <button
            type="submit"
            disabled={isSubmitting || !instagram.trim() || !idConta.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'rgba(var(--color-primary-rgb),0.2)',
              border: '1px solid rgba(var(--color-primary-rgb),0.4)',
              color: 'var(--color-primary-light)',
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.2)';
            }}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting ? 'Enviando...' : 'Enviar Banca'}
          </button>
        </form>
      </div>

      {/* ── Filtros ── */}
      <div className="glass-card p-4 overflow-visible">
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
          {/* Busca */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--c-t-30)' }} />
            <input
              type="text"
              value={filtroBusca}
              onChange={(e) => setFiltroBusca(e.target.value)}
              placeholder="Buscar por Instagram ou ID da conta..."
              className="input-dark text-[13px] pl-10"
            />
          </div>

          {/* Filtro status */}
          <div className="flex gap-1">
            {([
              { key: 'todos', label: 'Todos' },
              { key: 'pendente', label: 'Pendentes' },
              { key: 'recebido', label: 'Recebidos' },
            ] as const).map((f) => (
              <button
                key={f.key}
                onClick={() => setFiltroStatus(f.key)}
                className={cn(
                  'px-3 py-2 rounded-lg text-[12px] font-medium transition-all duration-200 whitespace-nowrap border',
                  filtroStatus === f.key
                    ? 'bg-surface-200/40 text-txt border-surface-300/20'
                    : 'text-txt-dim hover:text-txt hover:bg-surface-200/20 border-transparent'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Periodo — calendario customizado */}
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <Calendar className="w-3 h-3 text-txt-dim" />

            {/* Data inicio */}
            <div className="relative">
              <button
                ref={startBtnRef}
                onClick={() => { setStartPickerOpen(!startPickerOpen); setEndPickerOpen(false); }}
                className={cn(
                  "px-2 py-1 rounded-lg transition-all duration-200 tabular-nums",
                  startPickerOpen
                    ? "bg-primary-bg text-primary-light border border-primary-bg"
                    : "text-txt-secondary hover:text-txt hover:bg-glass border border-transparent"
                )}
              >
                {dateStart ? format(dateStart, 'dd/MM') : '-- /--'}
              </button>
              {startPickerOpen && (
                <DayPicker
                  selectedDate={dateStart || new Date()}
                  onSelect={(d) => {
                    setDateStart(d);
                    if (!dateEnd || dateEnd < d) setDateEnd(d);
                  }}
                  onClose={() => setStartPickerOpen(false)}
                  label="Data inicio"
                  anchorRef={startBtnRef}
                />
              )}
            </div>

            <span className="text-txt-dim">—</span>

            {/* Data fim */}
            <div className="relative">
              <button
                ref={endBtnRef}
                onClick={() => { setEndPickerOpen(!endPickerOpen); setStartPickerOpen(false); }}
                className={cn(
                  "px-2 py-1 rounded-lg transition-all duration-200 tabular-nums",
                  endPickerOpen
                    ? "bg-primary-bg text-primary-light border border-primary-bg"
                    : "text-txt-secondary hover:text-txt hover:bg-glass border border-transparent"
                )}
              >
                {dateEnd ? format(dateEnd, 'dd/MM') : '-- /--'}
              </button>
              {endPickerOpen && (
                <DayPicker
                  selectedDate={dateEnd || new Date()}
                  onSelect={(d) => {
                    setDateEnd(d);
                    if (!dateStart || dateStart > d) setDateStart(d);
                  }}
                  onClose={() => setEndPickerOpen(false)}
                  label="Data fim"
                  anchorRef={endBtnRef}
                />
              )}
            </div>

            {/* Limpar datas */}
            {(dateStart || dateEnd) && (
              <button
                onClick={() => { setDateStart(null); setDateEnd(null); }}
                className="p-1 rounded-md transition-all duration-200 text-txt-dim hover:text-txt hover:bg-glass"
                title="Limpar periodo"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Contadores */}
      <div className="flex gap-4">
        <p className="text-[12px] text-txt-dim font-mono">
          {premiacoes.length} premiacao{premiacoes.length !== 1 ? 'es' : ''}
        </p>
        {totalPendentes > 0 && (
          <p className="text-[12px] font-mono" style={{ color: '#facc15' }}>
            {totalPendentes} pendente{totalPendentes !== 1 ? 's' : ''}
          </p>
        )}
        {totalRecebidos > 0 && (
          <p className="text-[12px] font-mono" style={{ color: '#34d399' }}>
            {totalRecebidos} recebido{totalRecebidos !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* ── Lista ── */}
      {loading ? (
        <div className="space-y-3">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : premiacoes.length === 0 ? (
        <div className="card-dark p-12 flex flex-col items-center justify-center gap-3">
          <Gift className="w-10 h-10 text-txt-dim" />
          <div className="text-center">
            <p className="text-txt-muted text-[14px] font-medium">Nenhuma premiacao</p>
            <p className="text-txt-dim text-[12px] mt-1">
              {filtroStatus !== 'todos' || filtroBusca
                ? 'Nenhuma premiacao encontrada com esses filtros.'
                : 'Envie sua primeira banca usando o formulario acima.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {paginatedPremiacoes.map((p) => (
            <div
              key={p.id}
              className="card-dark rounded-xl p-4 border border-surface-300/10 transition-all duration-200 hover:border-surface-300/20"
            >
              <div className="flex items-center gap-4">
                {/* Foto thumbnail ou icone */}
                {p.foto_url ? (
                  <button
                    onClick={() => setFotoModal(p.foto_url)}
                    className="w-11 h-11 rounded-xl overflow-hidden shrink-0 border transition-all duration-200 hover:border-[rgb(var(--c-fg-rgb)/0.2)]"
                    style={{ borderColor: 'var(--c-border)' }}
                  >
                    <img src={p.foto_url} alt="Print" className="w-full h-full object-cover" />
                  </button>
                ) : (
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'var(--c-glass)', border: '1px solid var(--c-border)' }}
                  >
                    <Image className="w-4 h-4" style={{ color: 'var(--c-t-20)' }} />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-[14px] font-semibold text-txt truncate">
                      @{p.instagram_username}
                    </span>
                    <StatusBadge status={p.status} />
                    <span
                      className="text-[13px] font-semibold"
                      style={{ color: 'var(--color-primary-light)' }}
                    >
                      {formatarValor(p.valor)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-[12px]" style={{ color: 'var(--c-t-40)' }}>
                      ID: {p.id_conta}
                    </span>
                    <span className="text-[11px]" style={{ color: 'var(--c-t-30)' }}>
                      Lancado: {formatarData(p.data_lancamento)}
                    </span>
                    {p.data_recebimento && (
                      <span className="text-[11px]" style={{ color: 'rgba(52,211,153,0.7)' }}>
                        Recebido: {formatarData(p.data_recebimento)}
                      </span>
                    )}
                    {p.observacoes && (
                      <span className="text-[11px] italic" style={{ color: 'var(--c-t-25)' }}>
                        {p.observacoes}
                      </span>
                    )}
                  </div>
                </div>

                {/* Acao: toggle status */}
                <button
                  onClick={() => handleToggleStatus(p.id)}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all duration-200"
                  style={p.status === 'pendente'
                    ? { background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399' }
                    : { background: 'rgba(250,204,21,0.1)', border: '1px solid rgba(250,204,21,0.2)', color: '#facc15' }
                  }
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = p.status === 'pendente'
                      ? 'rgba(52,211,153,0.2)' : 'rgba(250,204,21,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = p.status === 'pendente'
                      ? 'rgba(52,211,153,0.1)' : 'rgba(250,204,21,0.1)';
                  }}
                >
                  {p.status === 'pendente'
                    ? <><CheckCircle2 className="w-3.5 h-3.5" /> Recebido</>
                    : <><Clock className="w-3.5 h-3.5" /> Pendente</>
                  }
                </button>
              </div>
            </div>
          ))}

          {/* Paginacao */}
          {premiacoes.length > ITEMS_PER_PAGE && (
            <Pagination
              current={currentPage}
              total={premiacoes.length}
              totalPages={totalPages}
              onChange={setCurrentPage}
            />
          )}
        </div>
      )}

      {/* Foto Preview Modal */}
      {fotoModal && <FotoPreviewModal url={fotoModal} onClose={() => setFotoModal(null)} />}

      {/* Relatorio Modal */}
      <RelatorioModal
        isOpen={relatorioModal}
        onClose={() => setRelatorioModal(false)}
        premiacoes={premiacoes}
        showToast={showToast}
      />

      {toast && <Toast toast={toast} onClose={hideToast} />}
    </div>
  );
};

export default Premiacoes;
