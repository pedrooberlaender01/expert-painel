import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Crown,
  FileText,
  BarChart3,
  ScrollText,
  Trophy,
  Loader2,
  Save,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  ChevronUp,
  PlayCircle,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

// ─── Types ───
interface CopyRow { id: string; torneio_id: string; chave: string; valor: string }
interface Premiacao { id: string; torneio_id: string; posicao: number; valor: number; ativo: boolean }
interface TorneioOption { id: string; nome: string; status: string; data_inicio: string; data_fim: string }

// ─── Sections config ───
interface CopyField { chave: string; label: string; desc: string; type: 'input' | 'textarea' | 'video-url' | 'number'; rows?: number; min?: number; suffix?: string }
interface Section { key: string; label: string; icon: typeof FileText; color: string; fields: CopyField[] }

const SECTIONS: Section[] = [
  {
    key: 'cabecalho', label: 'Cabeçalho', icon: Crown, color: '#8b5cf6',
    fields: [
      { chave: 'titulo_regulamento', label: 'Título do Regulamento', desc: 'Nome exibido no topo da página', type: 'input' },
      { chave: 'link_botao', label: 'Link botão / Plataforma', desc: 'URL do botão de acesso à plataforma', type: 'input' },
      { chave: 'texto_botao', label: 'Titulo Botão', desc: 'Texto exibido no botão', type: 'input' },
    ],
  },
  {
    key: 'ranking', label: 'Ranking', icon: BarChart3, color: '#f59e0b',
    fields: [
      { chave: 'titulo_ranking', label: 'Título do Ranking', desc: 'Título exibido na seção de ranking', type: 'input' },
      { chave: 'subtitulo_ranking', label: 'Subtítulo do Ranking', desc: 'Texto complementar abaixo do título', type: 'input' },
    ],
  },
  {
    key: 'regulamento', label: 'Regulamento', icon: ScrollText, color: '#10b981',
    fields: [
      { chave: 'texto_regulamento', label: 'Texto do Regulamento', desc: 'Regras completas do torneio', type: 'textarea', rows: 16 },
    ],
  },
  {
    key: 'inscricao', label: 'Inscrição', icon: PlayCircle, color: '#06b6d4',
    fields: [
      { chave: 'url_video_inscricao', label: 'URL do vídeo de inscrição', desc: 'Cole qualquer link do YouTube (watch, shorts, youtu.be ou embed) — convertido automaticamente para formato embed', type: 'video-url' },
      { chave: 'tempo_cta_segundos', label: 'Tempo até botão aparecer (segundos)', desc: 'Segundos de vídeo antes do botão de inscrição ficar visível', type: 'number', min: 0, suffix: 's' },
    ],
  },
];

// Normaliza URL YouTube para formato embed
function normalizarUrlVideo(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  const match = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  if (match) return `https://www.youtube.com/embed/${match[1]}`;
  return trimmed;
}

const ALL_KEYS = SECTIONS.flatMap((s) => s.fields.map((f) => f.chave));

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch { return '—'; }
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  agendado: { label: 'Agendado', color: '#22d3ee', bg: 'rgba(34,211,238,0.1)' },
  ativo: { label: 'Ativo', color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
  pausado: { label: 'Pausado', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
  encerrado: { label: 'Encerrado', color: 'var(--c-t-35)', bg: 'var(--c-glass)' },
};

// Status visual derivado: se DB diz 'ativo' mas data_inicio ainda nao chegou, exibe 'agendado'
function getDisplayStatus(torneio: { status: string; data_inicio: string }): string {
  if (torneio.status === 'ativo' && new Date(torneio.data_inicio).getTime() > Date.now()) {
    return 'agendado';
  }
  return torneio.status;
}

// ─── Component ───
interface TorneioCopyTabProps {
  showToast: (type: 'success' | 'error', msg: string) => void;
}

export const TorneioCopyTab: React.FC<TorneioCopyTabProps> = ({ showToast }) => {
  const getActiveExpertId = useAuthStore((s) => s.getActiveExpertId);

  // ── Torneio selector ──
  const [torneios, setTorneios] = useState<TorneioOption[]>([]);
  const [torneioId, setTorneioId] = useState('');
  const [loadingTorneios, setLoadingTorneios] = useState(true);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectorOpen) return;
    const handler = (e: MouseEvent) => { if (selectorRef.current && !selectorRef.current.contains(e.target as Node)) setSelectorOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [selectorOpen]);

  // ── Copy fields ──
  const [copyRows, setCopyRows] = useState<CopyRow[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [originalValues, setOriginalValues] = useState<Record<string, string>>({});
  const [loadingCopy, setLoadingCopy] = useState(false);
  const [savingCopy, setSavingCopy] = useState(false);

  // ── Premiacoes ──
  const [premiacoes, setPremiacoes] = useState<Premiacao[]>([]);
  const [loadingPrem, setLoadingPrem] = useState(false);
  const [novaPosicao, setNovaPosicao] = useState('');
  const [novoValor, setNovoValor] = useState('');
  const [addingPrem, setAddingPrem] = useState(false);
  const [editingPremId, setEditingPremId] = useState<string | null>(null);
  const [editingPremValor, setEditingPremValor] = useState('');

  // ── Active section ──
  const [activeSection, setActiveSection] = useState('cabecalho');

  // ── Fetch torneios ──
  const fetchTorneios = useCallback(async () => {
    setLoadingTorneios(true);
    const expertId = getActiveExpertId();
    let query = supabase.from('torneios').select('id, nome, status, data_inicio, data_fim').order('created_at', { ascending: false });
    if (expertId) query = query.eq('expert_id', expertId);
    const { data } = await query;
    const list = (data || []) as unknown as TorneioOption[];
    setTorneios(list);
    if (list.length > 0 && !torneioId) setTorneioId(list[0].id);
    setLoadingTorneios(false);
  }, [getActiveExpertId, torneioId]);

  useEffect(() => { fetchTorneios(); }, [fetchTorneios]);

  // ── Fetch copy rows ──
  const fetchCopy = useCallback(async () => {
    if (!torneioId) return;
    setLoadingCopy(true);
    const { data } = await supabase.from('torneio_copy').select('*').eq('torneio_id', torneioId);
    const rows = (data || []) as unknown as CopyRow[];
    setCopyRows(rows);
    const vals: Record<string, string> = {};
    for (const key of ALL_KEYS) { vals[key] = rows.find((r) => r.chave === key)?.valor || ''; }
    setValues(vals);
    setOriginalValues({ ...vals });
    setLoadingCopy(false);
  }, [torneioId]);

  // ── Fetch premiacoes ──
  const fetchPremiacoes = useCallback(async () => {
    if (!torneioId) return;
    setLoadingPrem(true);
    const { data } = await supabase.from('torneio_premiacoes').select('*').eq('torneio_id', torneioId).order('posicao');
    setPremiacoes((data || []) as unknown as Premiacao[]);
    setLoadingPrem(false);
  }, [torneioId]);

  useEffect(() => { fetchCopy(); fetchPremiacoes(); }, [fetchCopy, fetchPremiacoes]);

  // ── Computed ──
  const hasChanges = Object.keys(values).some((k) => values[k] !== originalValues[k]);
  const premAtivas = premiacoes.filter((p) => p.ativo);
  const somaTotal = premAtivas.reduce((acc, p) => acc + Number(p.valor), 0);
  const getFilledCount = (s: Section) => s.fields.filter((f) => (values[f.chave] || '').trim().length > 0).length;
  const totalFilled = SECTIONS.reduce((acc, s) => acc + getFilledCount(s), 0);
  const totalPercent = ALL_KEYS.length > 0 ? Math.round((totalFilled / ALL_KEYS.length) * 100) : 0;
  const selectedTorneio = torneios.find((t) => t.id === torneioId);
  const selectedStatus = STATUS_MAP[selectedTorneio ? getDisplayStatus(selectedTorneio) : ''] || STATUS_MAP.encerrado;

  // ── Save copy ──
  const handleSaveCopy = async () => {
    if (!torneioId) return;
    setSavingCopy(true);
    const expertId = getActiveExpertId();
    // Mapa de transformacoes por chave antes de persistir
    const VALUE_TRANSFORMERS: Record<string, (v: string) => string> = {
      url_video_inscricao: normalizarUrlVideo,
      tempo_cta_segundos: (v) => {
        const n = parseInt(v.replace(/[^\d]/g, ''), 10);
        return Number.isFinite(n) && n >= 0 ? String(n) : '';
      },
    };
    try {
      for (const key of ALL_KEYS) {
        const raw = values[key] || '';
        const val = VALUE_TRANSFORMERS[key] ? VALUE_TRANSFORMERS[key](raw) : raw;
        const existing = copyRows.find((r) => r.chave === key);
        if (existing) {
          if (val !== (existing.valor || '')) await supabase.from('torneio_copy').update({ valor: val, atualizado_em: new Date().toISOString() }).eq('id', existing.id);
        } else if (val) {
          await supabase.from('torneio_copy').insert({ torneio_id: torneioId, chave: key, valor: val, expert_id: expertId });
        }
      }
      showToast('success', 'Copys salvas com sucesso!');
      await fetchCopy();
    } catch { showToast('error', 'Erro ao salvar copys'); }
    finally { setSavingCopy(false); }
  };

  // ── Premiacao CRUD ──
  const handleAddPremiacao = async () => {
    if (!torneioId || !novaPosicao || !novoValor) return;
    setAddingPrem(true);
    try {
      await supabase.from('torneio_premiacoes').insert({ torneio_id: torneioId, posicao: parseInt(novaPosicao), valor: parseFloat(novoValor), expert_id: getActiveExpertId() });
      setNovaPosicao(''); setNovoValor('');
      await fetchPremiacoes();
      showToast('success', 'Premiação adicionada!');
    } catch { showToast('error', 'Erro ao adicionar premiação'); }
    finally { setAddingPrem(false); }
  };

  const handleTogglePremiacao = async (p: Premiacao) => { await supabase.from('torneio_premiacoes').update({ ativo: !p.ativo }).eq('id', p.id); await fetchPremiacoes(); };
  const handleDeletePremiacao = async (id: string) => { await supabase.from('torneio_premiacoes').delete().eq('id', id); await fetchPremiacoes(); showToast('success', 'Premiação removida'); };
  const handleSaveEditPremiacao = async () => {
    if (!editingPremId || !editingPremValor) return;
    await supabase.from('torneio_premiacoes').update({ valor: parseFloat(editingPremValor) }).eq('id', editingPremId);
    setEditingPremId(null); await fetchPremiacoes(); showToast('success', 'Premiação atualizada');
  };

  // ── Loading / Empty ──
  if (loadingTorneios) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-txt-dim animate-spin" /></div>;
  if (torneios.length === 0) return (
    <div className="card-dark p-12 flex flex-col items-center justify-center gap-3">
      <Trophy className="w-10 h-10 text-txt-dim" />
      <p className="text-txt-muted text-[14px] font-medium">Nenhum torneio encontrado</p>
      <p className="text-txt-dim text-[12px]">Crie um torneio na aba "Torneios" primeiro</p>
    </div>
  );

  const currentSection = SECTIONS.find((s) => s.key === activeSection) || SECTIONS[0];

  return (
    <div className="space-y-5">

      {/* ═══ Torneio Selector — Card style ═══ */}
      <div ref={selectorRef} className="relative">
        <button
          type="button"
          onClick={() => setSelectorOpen(!selectorOpen)}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200"
          style={{
            background: 'var(--c-glass)',
            border: selectorOpen ? '1px solid rgba(var(--color-primary-rgb),0.3)' : '1px solid var(--c-border)',
            boxShadow: selectorOpen ? '0 0 0 3px rgba(var(--color-primary-rgb),0.06)' : 'none',
          }}
        >
          {/* Icon */}
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(var(--color-primary-rgb),0.1)', border: '1px solid rgba(var(--color-primary-rgb),0.15)' }}>
            <Trophy className="w-5 h-5" style={{ color: 'var(--color-primary-light)' }} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[15px] font-bold text-txt truncate">{selectedTorneio?.nome || 'Selecione...'}</p>
            {selectedTorneio && (
              <p className="text-[11px] text-txt-dim mt-0.5">
                <span className="inline-flex items-center gap-1 mr-2 font-semibold" style={{ color: selectedStatus.color }}>{selectedStatus.label}</span>
                {fmtDate(selectedTorneio.data_inicio)} — {fmtDate(selectedTorneio.data_fim)}
              </p>
            )}
          </div>

          {/* Chevron */}
          <ChevronUp className="w-4 h-4 shrink-0 transition-transform duration-200" style={{ color: 'var(--c-t-30)', transform: selectorOpen ? 'rotate(0)' : 'rotate(180deg)' }} />
        </button>

        {/* Dropdown */}
        {selectorOpen && (
          <div
            className="absolute z-50 mt-2 w-full animate-fade-in"
            style={{ background: 'var(--c-popup-bg)', border: '1px solid var(--c-border-strong)', borderRadius: '16px', boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgb(var(--c-fg-rgb) / 0.04) inset', overflow: 'hidden' }}
          >
            <div className="overflow-y-auto py-1.5" style={{ maxHeight: '280px', scrollbarWidth: 'thin', scrollbarColor: 'rgb(var(--c-fg-rgb) / 0.1) transparent' }}>
              {torneios.map((t) => {
                const isSelected = t.id === torneioId;
                const ds = getDisplayStatus(t);
                const st = STATUS_MAP[ds] || STATUS_MAP.encerrado;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => { setTorneioId(t.id); setSelectorOpen(false); }}
                    className="w-full flex items-center gap-3.5 px-4 py-3 text-left transition-colors duration-100"
                    style={{ background: isSelected ? 'rgba(var(--color-primary-rgb),0.08)' : 'transparent' }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--c-glass)' }}
                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                  >
                    {/* Status dot */}
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: st.color, boxShadow: ds === 'ativo' ? `0 0 6px ${st.color}60` : 'none' }} />

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold truncate" style={{ color: isSelected ? 'var(--color-primary-light)' : 'rgb(var(--c-fg-rgb))' }}>{t.nome}</p>
                      <p className="text-[10px] text-txt-dim font-mono mt-0.5">{st.label} · {fmtDate(t.data_inicio)} — {fmtDate(t.data_fim)}</p>
                    </div>

                    {/* Check */}
                    {isSelected && <Check className="w-4 h-4 shrink-0" style={{ color: 'var(--color-primary-light)' }} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ═══ Content ═══ */}
      {loadingCopy ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 text-txt-dim animate-spin" /></div>
      ) : (
        <div className="flex gap-5 items-start">

          {/* ─── Sidebar ─── */}
          <div className="w-64 shrink-0 space-y-1.5 rounded-2xl p-3" style={{ background: 'var(--c-glass-2)', border: '1px solid var(--c-border)' }}>
            {SECTIONS.map((section) => {
              const filled = getFilledCount(section);
              const total = section.fields.length;
              const isActive = activeSection === section.key;
              const Icon = section.icon;
              const pct = total > 0 ? (filled / total) * 100 : 0;
              return (
                <button
                  key={section.key}
                  onClick={() => setActiveSection(section.key)}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all duration-200"
                  style={{
                    background: isActive ? `${section.color}10` : 'transparent',
                    border: isActive ? `1px solid ${section.color}25` : '1px solid transparent',
                  }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: isActive ? `${section.color}18` : 'var(--c-glass)' }}>
                    <Icon className="w-4 h-4" style={{ color: isActive ? section.color : 'rgb(var(--c-fg-rgb) / 0.25)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate" style={{ color: isActive ? 'rgb(var(--c-fg-rgb))' : 'rgb(var(--c-fg-rgb) / 0.45)' }}>{section.label}</p>
                    <p className="text-[11px] font-mono" style={{ color: isActive ? section.color : 'rgb(var(--c-fg-rgb) / 0.25)' }}>{filled}/{total}</p>
                  </div>
                  {/* Mini progress bar */}
                  <div className="w-10 h-1.5 rounded-full overflow-hidden shrink-0" style={{ background: 'var(--c-glass-hover)' }}>
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: section.color, opacity: filled > 0 ? 1 : 0.15 }} />
                  </div>
                </button>
              );
            })}

            {/* Premiacoes */}
            <button
              onClick={() => setActiveSection('premiacoes')}
              className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all duration-200"
              style={{
                background: activeSection === 'premiacoes' ? 'rgba(245,158,11,0.08)' : 'transparent',
                border: activeSection === 'premiacoes' ? '1px solid rgba(245,158,11,0.2)' : '1px solid transparent',
              }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: activeSection === 'premiacoes' ? 'rgba(245,158,11,0.15)' : 'var(--c-glass)' }}>
                <Trophy className="w-4 h-4" style={{ color: activeSection === 'premiacoes' ? '#f59e0b' : 'rgb(var(--c-fg-rgb) / 0.25)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold" style={{ color: activeSection === 'premiacoes' ? 'rgb(var(--c-fg-rgb))' : 'rgb(var(--c-fg-rgb) / 0.45)' }}>Premiações</p>
                <p className="text-[11px] font-mono" style={{ color: activeSection === 'premiacoes' ? '#f59e0b' : 'rgb(var(--c-fg-rgb) / 0.25)' }}>{premAtivas.length} ativa{premAtivas.length !== 1 ? 's' : ''}</p>
              </div>
            </button>

            {/* Progress total */}
            <div className="mt-3 pt-3 px-2" style={{ borderTop: '1px solid var(--c-border)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-txt-dim font-semibold uppercase tracking-wider">Progresso</span>
                <span className="text-[12px] font-bold tabular-nums" style={{ color: 'var(--color-primary-light)' }}>{totalPercent}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--c-glass)' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${totalPercent}%`, background: 'var(--color-primary)' }} />
              </div>
            </div>
          </div>

          {/* ─── Main panel ─── */}
          <div className="flex-1 min-w-0 rounded-2xl p-5" style={{ background: 'var(--c-glass-2)', border: '1px solid var(--c-border)' }}>
            {activeSection !== 'premiacoes' ? (
              <div className="space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${currentSection.color}12`, border: `1px solid ${currentSection.color}20` }}>
                      <currentSection.icon className="w-4.5 h-4.5" style={{ color: currentSection.color }} />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-txt">{currentSection.label}</h3>
                      <p className="text-[11px] text-txt-dim">{getFilledCount(currentSection)}/{currentSection.fields.length} preenchidos</p>
                    </div>
                  </div>
                  {hasChanges && (
                    <button
                      onClick={handleSaveCopy}
                      disabled={savingCopy}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all duration-200 disabled:opacity-50"
                      style={{ background: 'rgba(var(--color-primary-rgb),0.15)', border: '1px solid rgba(var(--color-primary-rgb),0.3)', color: 'var(--color-primary-light)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.25)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.15)' }}
                    >
                      {savingCopy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Salvar
                    </button>
                  )}
                </div>

                <div className="h-px" style={{ background: `linear-gradient(90deg, ${currentSection.color}20, transparent)` }} />

                {/* Fields */}
                {currentSection.fields.map((field) => {
                  const rawValue = values[field.chave] || '';
                  const previewUrl = field.type === 'video-url' ? normalizarUrlVideo(rawValue) : '';
                  return (
                    <div key={field.chave}>
                      <label className="block text-[12px] font-semibold text-txt-muted mb-1">{field.label}</label>
                      <p className="text-[10px] text-txt-dim mb-2">{field.desc}</p>
                      {field.type === 'textarea' ? (
                        <textarea
                          value={rawValue}
                          onChange={(e) => setValues((prev) => ({ ...prev, [field.chave]: e.target.value }))}
                          rows={field.rows || 4}
                          placeholder="..."
                          className="w-full text-[13px] text-txt outline-none transition-all duration-200 resize-none placeholder-txt-dim"
                          style={{ background: 'var(--c-glass)', border: '1px solid var(--c-border)', borderRadius: '10px', padding: '10px 14px' }}
                          onFocus={(e) => { e.currentTarget.style.borderColor = `${currentSection.color}40`; e.currentTarget.style.boxShadow = `0 0 0 3px ${currentSection.color}0a` }}
                          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--c-border)'; e.currentTarget.style.boxShadow = 'none' }}
                        />
                      ) : field.type === 'number' ? (
                        <div className="relative">
                          <input
                            type="number"
                            inputMode="numeric"
                            min={field.min ?? 0}
                            step={1}
                            value={rawValue}
                            onChange={(e) => {
                              // Sanitiza: somente dígitos, sem negativo, sem decimal
                              const cleaned = e.target.value.replace(/[^\d]/g, '');
                              setValues((prev) => ({ ...prev, [field.chave]: cleaned }));
                            }}
                            placeholder="0"
                            className="w-full text-[13px] text-txt outline-none transition-all duration-200 placeholder-txt-dim font-mono"
                            style={{ background: 'var(--c-glass)', border: '1px solid var(--c-border)', borderRadius: '10px', padding: '10px 14px', paddingRight: field.suffix ? '40px' : '14px' }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = `${currentSection.color}40`; e.currentTarget.style.boxShadow = `0 0 0 3px ${currentSection.color}0a` }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--c-border)'; e.currentTarget.style.boxShadow = 'none' }}
                          />
                          {field.suffix && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono pointer-events-none" style={{ color: `${currentSection.color}aa` }}>{field.suffix}</span>
                          )}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={rawValue}
                          onChange={(e) => setValues((prev) => ({ ...prev, [field.chave]: e.target.value }))}
                          placeholder={field.type === 'video-url' ? 'https://www.youtube.com/watch?v=...' : '...'}
                          className="w-full text-[13px] text-txt outline-none transition-all duration-200 placeholder-txt-dim"
                          style={{ background: 'var(--c-glass)', border: '1px solid var(--c-border)', borderRadius: '10px', padding: '10px 14px' }}
                          onFocus={(e) => { e.currentTarget.style.borderColor = `${currentSection.color}40`; e.currentTarget.style.boxShadow = `0 0 0 3px ${currentSection.color}0a` }}
                          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--c-border)'; e.currentTarget.style.boxShadow = 'none' }}
                        />
                      )}

                      {/* Preview da URL normalizada */}
                      {field.type === 'video-url' && rawValue.trim() && (
                        <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: `${currentSection.color}08`, border: `1px solid ${currentSection.color}1a` }}>
                          <ExternalLink className="w-3 h-3 shrink-0" style={{ color: currentSection.color }} />
                          <span className="text-[10px] text-txt-dim uppercase tracking-wider font-semibold shrink-0">Salvará como:</span>
                          <span className="text-[11px] text-txt-secondary font-mono truncate flex-1">{previewUrl}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ─── Premiacoes ─── */
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                      <Trophy className="w-4.5 h-4.5" style={{ color: '#f59e0b' }} />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-txt">Premiações</h3>
                      <p className="text-[11px] text-txt-dim">{premAtivas.length} ativa{premAtivas.length !== 1 ? 's' : ''} · Total <strong className="text-amber-400 font-mono">R$ {somaTotal.toFixed(2)}</strong></p>
                    </div>
                  </div>
                </div>

                <div className="h-px" style={{ background: 'linear-gradient(90deg, rgba(245,158,11,0.2), transparent)' }} />

                {/* Add form */}
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="block text-[10px] font-semibold text-txt-dim mb-1 uppercase tracking-wider">Posição</label>
                    <input type="number" value={novaPosicao} onChange={(e) => setNovaPosicao(e.target.value)} placeholder="1" min={1}
                      className="w-full text-[13px] text-txt outline-none font-mono"
                      style={{ background: 'var(--c-glass)', border: '1px solid var(--c-border)', borderRadius: '10px', padding: '8px 12px' }} />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-semibold text-txt-dim mb-1 uppercase tracking-wider">Valor R$</label>
                    <input type="number" value={novoValor} onChange={(e) => setNovoValor(e.target.value)} placeholder="100.00" step="0.01"
                      className="w-full text-[13px] text-txt outline-none font-mono"
                      style={{ background: 'var(--c-glass)', border: '1px solid var(--c-border)', borderRadius: '10px', padding: '8px 12px' }} />
                  </div>
                  <button onClick={handleAddPremiacao} disabled={addingPrem || !novaPosicao || !novoValor}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all duration-200 disabled:opacity-30 shrink-0"
                    style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b' }}>
                    {addingPrem ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Adicionar
                  </button>
                </div>

                {/* Table */}
                {loadingPrem ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-txt-dim animate-spin" /></div>
                ) : premiacoes.length === 0 ? (
                  <p className="text-[13px] text-txt-dim text-center py-8">Nenhuma premiação cadastrada</p>
                ) : (
                  <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--c-border)' }}>
                    <table className="w-full">
                      <thead>
                        <tr style={{ background: 'var(--c-glass-2)' }}>
                          <th className="text-left text-[10px] font-semibold text-txt-dim uppercase tracking-wider px-4 py-2.5">Pos.</th>
                          <th className="text-left text-[10px] font-semibold text-txt-dim uppercase tracking-wider px-4 py-2.5">Valor R$</th>
                          <th className="text-center text-[10px] font-semibold text-txt-dim uppercase tracking-wider px-4 py-2.5">Status</th>
                          <th className="text-right text-[10px] font-semibold text-txt-dim uppercase tracking-wider px-4 py-2.5">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {premiacoes.map((p) => (
                          <tr key={p.id} className="border-t" style={{ borderColor: 'var(--c-border)' }}>
                            <td className="px-4 py-3 text-[13px] font-bold text-txt-muted font-mono">#{p.posicao}</td>
                            <td className="px-4 py-3">
                              {editingPremId === p.id ? (
                                <div className="flex items-center gap-1.5">
                                  <input type="number" value={editingPremValor} onChange={(e) => setEditingPremValor(e.target.value)} step="0.01" autoFocus
                                    className="w-24 text-[13px] text-txt font-mono outline-none"
                                    style={{ background: 'var(--c-glass)', border: '1px solid rgba(var(--color-primary-rgb),0.3)', borderRadius: '8px', padding: '4px 8px' }} />
                                  <button onClick={handleSaveEditPremiacao} className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded-md transition-colors"><Check className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => setEditingPremId(null)} className="p-1 text-txt-dim hover:bg-glass-2 rounded-md transition-colors"><X className="w-3.5 h-3.5" /></button>
                                </div>
                              ) : (
                                <span className="text-[13px] text-txt-muted font-mono">R$ {Number(p.valor).toFixed(2)}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button onClick={() => handleTogglePremiacao(p)} className="relative w-9 h-5 rounded-full transition-colors duration-200 shrink-0" style={{ background: p.ativo ? 'rgba(var(--color-primary-rgb),0.3)' : 'var(--c-glass-hover)' }}>
                                <span className="absolute top-[2px] left-[2px] w-4 h-4 rounded-full transition-all duration-200" style={{ background: p.ativo ? 'var(--color-primary)' : 'rgb(var(--c-fg-rgb) / 0.3)', transform: p.ativo ? 'translateX(16px)' : 'translateX(0)' }} />
                              </button>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center gap-1 justify-end">
                                <button onClick={() => { setEditingPremId(p.id); setEditingPremValor(String(p.valor)); }} className="p-1.5 text-txt-dim hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"><Pencil className="w-3 h-3" /></button>
                                <button onClick={() => handleDeletePremiacao(p.id)} className="p-1.5 text-txt-dim hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 className="w-3 h-3" /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
