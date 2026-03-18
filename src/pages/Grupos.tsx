import React, { useState, useEffect, useMemo, useRef } from 'react';
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
} from 'lucide-react';
import { format, isSameDay, getDaysInMonth, getMonth, startOfDay, endOfDay } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useToast } from '../hooks/useToast';
import { Toast } from '../components/Toast';
import { cn } from '../utils/cn';

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
      className="absolute top-full mt-2 z-50 animate-slide-up"
      style={{ animationDuration: '0.25s' }}
    >
      <div
        className="rounded-xl p-3 border border-white/[0.06] shadow-2xl w-[260px]"
        style={{
          background: 'linear-gradient(145deg, rgba(20, 20, 22, 0.97) 0%, rgba(26, 26, 30, 0.97) 100%)',
          backdropFilter: 'blur(24px)',
        }}
      >
        <div className="absolute top-0 left-3 right-3 h-[1px] bg-gradient-to-r from-transparent via-blue-600/30 to-transparent" />
        <div className="text-[9px] uppercase tracking-[0.1em] text-txt-dim font-mono mb-2">{label}</div>
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setViewMonth(m => Math.max(0, m - 1))}
            className="p-1 rounded-lg hover:bg-white/[0.04] text-txt-muted hover:text-txt transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-semibold text-txt font-display">{MONTHS_SHORT[viewMonth]}</span>
          <button
            onClick={() => setViewMonth(m => Math.min(11, m + 1))}
            className="p-1 rounded-lg hover:bg-white/[0.04] text-txt-muted hover:text-txt transition-colors"
            disabled={viewMonth >= getMonth(now)}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
            <div key={i} className="text-[8px] text-txt-dim font-mono text-center py-1">{d}</div>
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
                className={cn(
                  "w-full aspect-square rounded-lg text-[11px] font-mono transition-all duration-200 relative",
                  isFuture && "opacity-20 cursor-not-allowed",
                  isSelected
                    ? "bg-[#004AFF] text-surface font-semibold shadow-[0_0_12px_rgba(0,74,255,0.3)]"
                    : isToday
                    ? "text-[#004AFF] ring-1 ring-[#004AFF]/30 hover:bg-[#004AFF]/10"
                    : "text-txt-secondary hover:bg-white/[0.04] hover:text-txt"
                )}
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
            ? "bg-[#004AFF]/10 text-[#004AFF] border border-[#004AFF]/20"
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
          className="absolute top-full mt-2 left-0 z-50 animate-slide-up"
          style={{ animationDuration: '0.25s' }}
        >
          <div
            className="rounded-xl p-2 border border-white/[0.06] shadow-2xl min-w-[180px]"
            style={{
              background: 'linear-gradient(145deg, rgba(20, 20, 22, 0.97) 0%, rgba(26, 26, 30, 0.97) 100%)',
              backdropFilter: 'blur(24px)',
            }}
          >
            <div className="absolute top-0 left-3 right-3 h-[1px] bg-gradient-to-r from-transparent via-blue-600/30 to-transparent" />
            <div className="text-[9px] uppercase tracking-[0.1em] text-txt-dim font-mono mb-1.5 px-2">{label}</div>
            <div className="space-y-0.5 max-h-[240px] overflow-y-auto">
              <button
                onClick={() => { onChange('all'); setOpen(false); }}
                className={cn(
                  "w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-mono transition-all duration-200",
                  value === 'all'
                    ? "bg-[#004AFF] text-surface font-semibold"
                    : "text-txt-secondary hover:bg-white/[0.04] hover:text-txt"
                )}
              >
                {allLabel}
              </button>
              {options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={cn(
                    "w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-mono transition-all duration-200",
                    value === opt.value
                      ? "bg-[#004AFF] text-surface font-semibold"
                      : "text-txt-secondary hover:bg-white/[0.04] hover:text-txt"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ITEMS_PER_PAGE = 20;

export const Grupos: React.FC = () => {
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('id, nome, telefone, origem, observacoes, id_grupo, nome_grupo, entrou_no_grupo, saiu_grupo')
        .not('entrou_no_grupo', 'is', null)
        .order('entrou_no_grupo', { ascending: false });

      if (error) throw error;
      setLeads((data as Lead[]) || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar dados';
      showToast('error', message);
    } finally {
      setLoading(false);
    }
  };

  // Extract unique groups
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

  // Extract unique origens
  const origens = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.origem) set.add(l.origem);
    });
    return Array.from(set).sort();
  }, [leads]);

  // Combined filter pipeline (group + origem + status + period) — affects cards + table
  const combinedFiltered = useMemo(() => {
    let result = leads;

    // Group filter
    if (selectedGroup !== 'all') {
      if (selectedGroup === '__unknown__') {
        result = result.filter((l) => !l.id_grupo);
      } else {
        result = result.filter((l) => l.id_grupo === selectedGroup);
      }
    }

    // Origem filter
    if (filterOrigem !== 'all') {
      result = result.filter((l) => l.origem === filterOrigem);
    }

    // Status filter
    if (filterStatus === 'ativo') {
      result = result.filter((l) => !l.saiu_grupo);
    } else if (filterStatus === 'saiu') {
      result = result.filter((l) => !!l.saiu_grupo);
    }

    // Period filter
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

  // Stats (based on all filters except search)
  const stats = useMemo(() => {
    const total = combinedFiltered.length;
    const ativos = combinedFiltered.filter((l) => !l.saiu_grupo).length;
    const sairam = total - ativos;
    const retencao = total > 0 ? ((ativos / total) * 100).toFixed(1) : '0';
    return { total, ativos, sairam, retencao };
  }, [combinedFiltered]);

  // Search filter (table only)
  const searchFiltered = useMemo(() => {
    if (!search.trim()) return combinedFiltered;
    const q = search.toLowerCase();
    return combinedFiltered.filter(
      (l) =>
        (l.nome && l.nome.toLowerCase().includes(q)) ||
        l.telefone.includes(q)
    );
  }, [combinedFiltered, search]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(searchFiltered.length / ITEMS_PER_PAGE));
  const paginatedData = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return searchFiltered.slice(start, start + ITEMS_PER_PAGE);
  }, [searchFiltered, page]);

  // Reset page when any filter changes
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

      const res = await fetch('https://n8n-gend.srv1431760.hstgr.cloud/webhook/relatorio-grupo', {
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="mb-8">
          <div className="h-9 w-40 bg-[#1a1a1a] rounded-lg animate-pulse" />
          <div className="h-5 w-80 bg-[#1a1a1a] rounded-lg animate-pulse mt-2" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#111111] border border-[#1a1a1a] rounded-2xl p-6 h-[140px] animate-pulse" />
          ))}
        </div>
        <div className="bg-[#111111] border border-[#1a1a1a] rounded-2xl p-6 mt-6">
          <div className="h-10 w-full max-w-[400px] bg-[#1a1a1a] rounded-lg animate-pulse mb-4" />
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-12 w-full bg-[#1a1a1a] rounded-lg animate-pulse mb-2" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && <Toast toast={toast} onClose={hideToast} />}

      {/* Modal Gerar Relatório */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => !sendingReport && setReportModalOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative bg-[#111111] border border-[#1a1a1a] rounded-2xl p-8 max-w-[480px] w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h2 className="text-xl font-bold text-white">Gerar Relatório</h2>
              <p className="text-sm text-[#6b7280] mt-1">O relatório será gerado com os filtros atuais</p>
            </div>

            {/* Resumo dos filtros */}
            <div className="mt-5 bg-[#0a0a0a] border border-[#2a2a2a] rounded-[10px] p-4 space-y-1.5">
              <p className="text-sm text-[#9ca3af]">
                Grupo: <span className="text-white">{selectedGroup === 'all' ? 'Todos' : groups.find(([id]) => id === selectedGroup)?.[1] || 'Desconhecido'}</span>
              </p>
              <p className="text-sm text-[#9ca3af]">
                Origem: <span className="text-white">{filterOrigem === 'all' ? 'Todas' : capitalize(filterOrigem)}</span>
              </p>
              <p className="text-sm text-[#9ca3af]">
                Status: <span className="text-white">{filterStatus === 'all' ? 'Todos' : filterStatus === 'ativo' ? 'Ativo' : 'Saiu'}</span>
              </p>
              {(dateFrom || dateTo) && (
                <p className="text-sm text-[#9ca3af]">
                  Período: <span className="text-white">{dateFrom ? format(dateFrom, 'dd/MM/yyyy') : '...'} até {dateTo ? format(dateTo, 'dd/MM/yyyy') : '...'}</span>
                </p>
              )}
              <p className="text-sm text-[#9ca3af]">
                Total de membros: <span className="text-white font-semibold">{searchFiltered.length}</span>
              </p>
            </div>

            {/* Toggle WhatsApp */}
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setSendViaWhatsapp(!sendViaWhatsapp)}
                className="flex items-center gap-3 w-full"
              >
                <div className={cn(
                  "relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0",
                  sendViaWhatsapp ? "bg-[#06b6d4]" : "bg-[#2a2a2a]"
                )}>
                  <div className={cn(
                    "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow-sm",
                    sendViaWhatsapp ? "translate-x-[22px]" : "translate-x-1"
                  )} />
                </div>
                <span className="text-sm font-medium text-white">Enviar relatório via WhatsApp</span>
              </button>

              {/* WhatsApp fields */}
              <div className={cn(
                "overflow-hidden transition-all duration-300",
                sendViaWhatsapp ? "max-h-[200px] mt-4 opacity-100" : "max-h-0 mt-0 opacity-0"
              )}>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-[#6b7280] uppercase tracking-wide font-semibold mb-1.5 block">Número do destinatário</label>
                    <input
                      type="text"
                      value={whatsappNumero}
                      onChange={(e) => setWhatsappNumero(e.target.value)}
                      placeholder="5524999999999"
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-lg py-2.5 px-3.5 text-sm placeholder-[#4b5563] focus:outline-none focus:border-[#06b6d4]/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#6b7280] uppercase tracking-wide font-semibold mb-1.5 block">Instância de envio</label>
                    {loadingInstancias ? (
                      <div className="flex items-center gap-2 text-[#6b7280] text-sm py-2.5 px-3.5">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Carregando instâncias...
                      </div>
                    ) : (
                      <select
                        value={whatsappInstancia}
                        onChange={(e) => setWhatsappInstancia(e.target.value)}
                        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-lg py-2.5 px-3.5 text-sm focus:outline-none focus:border-[#06b6d4]/50 transition-colors appearance-none cursor-pointer"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                          backgroundPosition: 'right 12px center',
                          backgroundRepeat: 'no-repeat',
                          backgroundSize: '18px',
                          paddingRight: '36px',
                        }}
                      >
                        <option value="">Selecione uma instância</option>
                        {instancias.map((inst) => (
                          <option key={inst.id} value={inst.instancia}>
                            {inst.nome} ({inst.numero})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setReportModalOpen(false)}
                disabled={sendingReport}
                className="px-5 py-2.5 bg-transparent border border-[#2a2a2a] text-[#9ca3af] rounded-lg text-sm transition-colors hover:bg-[#1a1a1a] hover:text-white disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleGerarRelatorio}
                disabled={sendingReport || !canSubmitReport}
                className={cn(
                  "flex items-center gap-2 bg-[#06b6d4] text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-all duration-200",
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

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Grupos</h1>
          <p className="text-sm text-[#6b7280] mt-1">Gerencie os membros dos grupos da comunidade</p>
        </div>
        <button
          onClick={openReportModal}
          disabled={searchFiltered.length === 0}
          className={cn(
            "flex items-center gap-2 bg-[#06b6d4] text-white font-medium text-sm px-5 py-2.5 rounded-[10px] transition-all duration-200 shrink-0",
            searchFiltered.length === 0
              ? "opacity-50 cursor-not-allowed"
              : "hover:brightness-110 active:scale-[0.98]"
          )}
        >
          <FileDown className="w-[18px] h-[18px]" />
          Gerar Relatório
        </button>
      </div>

      {/* Filtro de Grupo */}
      <div className="flex items-center gap-4 mt-5">
        <select
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          className="bg-[#111111] border border-[#2a2a2a] text-white rounded-[10px] px-4 py-2.5 min-w-[320px] text-sm focus:outline-none focus:border-[#06b6d4]/50 transition-colors appearance-none cursor-pointer"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: 'right 12px center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '20px',
            paddingRight: '40px',
          }}
        >
          <option value="all">Todos os grupos</option>
          {groups.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <span className="bg-[#06b6d4] text-white rounded-full px-3 py-1 text-sm font-bold tabular-nums">
          {stats.total} membros
        </span>
      </div>

      {/* Cards Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-5">
        <div className="bg-[#111111] border border-[#1a1a1a] rounded-2xl p-6">
          <div className="flex items-center justify-center w-[44px] h-[44px] rounded-full bg-[rgba(6,182,212,0.15)]">
            <Users className="w-[22px] h-[22px] text-[#06b6d4]" />
          </div>
          <p className="text-[#6b7280] text-xs uppercase tracking-[1px] font-semibold mt-4">Total de Membros</p>
          <p className="text-white font-bold text-3xl mt-1 tabular-nums">{stats.total}</p>
        </div>

        <div className="bg-[#111111] border border-[#1a1a1a] rounded-2xl p-6">
          <div className="flex items-center justify-center w-[44px] h-[44px] rounded-full bg-[rgba(16,185,129,0.15)]">
            <UserCheck className="w-[22px] h-[22px] text-[#10b981]" />
          </div>
          <p className="text-[#6b7280] text-xs uppercase tracking-[1px] font-semibold mt-4">Ativos no Grupo</p>
          <p className="text-[#10b981] font-bold text-3xl mt-1 tabular-nums">{stats.ativos}</p>
        </div>

        <div className="bg-[#111111] border border-[#1a1a1a] rounded-2xl p-6">
          <div className="flex items-center justify-center w-[44px] h-[44px] rounded-full bg-[rgba(239,68,68,0.15)]">
            <UserMinus className="w-[22px] h-[22px] text-[#ef4444]" />
          </div>
          <p className="text-[#6b7280] text-xs uppercase tracking-[1px] font-semibold mt-4">Saíram do Grupo</p>
          <p className="text-[#ef4444] font-bold text-3xl mt-1 tabular-nums">{stats.sairam}</p>
        </div>

        <div className="bg-[#111111] border border-[#1a1a1a] rounded-2xl p-6">
          <div className="flex items-center justify-center w-[44px] h-[44px] rounded-full bg-[rgba(245,158,11,0.15)]">
            <TrendingUp className="w-[22px] h-[22px] text-[#f59e0b]" />
          </div>
          <p className="text-[#6b7280] text-xs uppercase tracking-[1px] font-semibold mt-4">Taxa de Retenção</p>
          <p className="text-[#f59e0b] font-bold text-3xl mt-1 tabular-nums">{stats.retencao}%</p>
        </div>
      </div>

      {/* Tabela de Membros */}
      <div className="bg-[#111111] border border-[#1a1a1a] rounded-2xl p-6 mt-6">
        {/* Filter bar */}
        <div className="flex items-center gap-3 flex-wrap items-stretch">
          {/* Search */}
          <div className="relative max-w-[280px] flex-1 min-w-[200px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou telefone..."
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-2.5 pl-11 pr-4 text-sm text-white placeholder-[#6b7280] focus:outline-none focus:border-[#06b6d4]/50 transition-colors"
            />
          </div>

          <div className="w-px h-6 bg-white/[0.06] self-center" />

          {/* Origem */}
          <FilterDropdown
            label="Origem"
            value={filterOrigem}
            allLabel="Todas"
            options={origens.map(o => ({ value: o, label: capitalize(o) }))}
            onChange={setFilterOrigem}
            icon={<Filter className="w-3 h-3 text-txt-dim" />}
          />

          <div className="w-px h-6 bg-white/[0.06] self-center" />

          {/* Status */}
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

          {/* Period */}
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <Calendar className="w-3 h-3 text-txt-dim" />

            <div className="relative">
              <button
                onClick={() => { setStartPickerOpen(!startPickerOpen); setEndPickerOpen(false); }}
                className={cn(
                  "px-2 py-1 rounded-lg transition-all duration-200 tabular-nums",
                  startPickerOpen
                    ? "bg-[#004AFF]/10 text-[#004AFF] border border-[#004AFF]/20"
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
                    ? "bg-[#004AFF]/10 text-[#004AFF] border border-[#004AFF]/20"
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

          {/* Clear all */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-[#06b6d4] text-sm hover:underline cursor-pointer ml-auto shrink-0"
            >
              Limpar filtros
            </button>
          )}
        </div>

        {/* Table */}
        {searchFiltered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Users className="w-16 h-16 text-[#2a2a2a] mb-4" />
            <p className="text-[#6b7280] text-sm">Nenhum membro encontrado</p>
          </div>
        ) : (
          <>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="bg-[#0d0d0d]">
                    <th className="text-left text-[#6b7280] text-xs uppercase font-semibold tracking-[1px] px-4 py-3 first:rounded-tl-lg last:rounded-tr-lg">Nome</th>
                    <th className="text-left text-[#6b7280] text-xs uppercase font-semibold tracking-[1px] px-4 py-3">Telefone</th>
                    <th className="text-left text-[#6b7280] text-xs uppercase font-semibold tracking-[1px] px-4 py-3">Grupo</th>
                    <th className="text-left text-[#6b7280] text-xs uppercase font-semibold tracking-[1px] px-4 py-3">Status</th>
                    <th className="text-left text-[#6b7280] text-xs uppercase font-semibold tracking-[1px] px-4 py-3">Origem</th>
                    <th className="text-left text-[#6b7280] text-xs uppercase font-semibold tracking-[1px] px-4 py-3">Observação</th>
                    <th className="text-left text-[#6b7280] text-xs uppercase font-semibold tracking-[1px] px-4 py-3">Entrada</th>
                    <th className="text-left text-[#6b7280] text-xs uppercase font-semibold tracking-[1px] px-4 py-3 first:rounded-tl-lg last:rounded-tr-lg">Saída</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((lead) => (
                    <tr
                      key={lead.id}
                      className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a]/50 transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        {lead.nome ? (
                          <span className="text-white font-medium text-sm">{lead.nome}</span>
                        ) : (
                          <span className="text-[#4b5563] italic text-sm">Sem nome</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-[#9ca3af] text-sm font-mono">
                        {formatTelefone(lead.telefone)}
                      </td>
                      <td className="px-4 py-3.5 text-sm">
                        {lead.nome_grupo ? (
                          <span className="text-white">{lead.nome_grupo}</span>
                        ) : (
                          <span className="text-[#4b5563]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {!lead.saiu_grupo ? (
                          <span className="inline-block bg-[rgba(16,185,129,0.15)] text-[#10b981] px-2.5 py-1 rounded-md text-xs font-medium">
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-block bg-[rgba(239,68,68,0.15)] text-[#ef4444] px-2.5 py-1 rounded-md text-xs font-medium">
                            Saiu
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-[#9ca3af] text-sm">
                        {capitalize(lead.origem)}
                      </td>
                      <td className="px-4 py-3.5">
                        {lead.observacoes ? (
                          <span
                            className="text-[#9ca3af] text-sm block max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap"
                            title={lead.observacoes}
                          >
                            {lead.observacoes}
                          </span>
                        ) : (
                          <span className="text-[#4b5563] text-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-[#9ca3af] text-sm whitespace-nowrap">
                        {formatDate(lead.entrou_no_grupo)}
                      </td>
                      <td className="px-4 py-3.5 text-sm whitespace-nowrap">
                        {lead.saiu_grupo ? (
                          <span className="text-[#9ca3af]">{formatDate(lead.saiu_grupo)}</span>
                        ) : (
                          <span className="text-[#4b5563]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            <div className="flex items-center justify-between mt-4">
              <span className="text-[#6b7280] text-sm">
                Mostrando {startItem}–{endItem} de {searchFiltered.length} membros
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1.5 bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-2 rounded-lg text-sm transition-colors hover:bg-[#222] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1.5 bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-2 rounded-lg text-sm transition-colors hover:bg-[#222] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Próximo
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
