import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Trophy, BarChart3, Users, Plus, Loader2, X, Pencil, Trash2, Pause, Play, XCircle, MoreHorizontal, RefreshCw, Crown, Search, ChevronDown, ChevronUp, AlertTriangle, Send, Smartphone, Wifi, WifiOff } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Toast } from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { WEBHOOKS, fetchWithTimeout } from '../config/webhooks';
import { InstanciaCard } from '../components/numeros/InstanciaCard';
import { NovaInstanciaModal } from '../components/numeros/NovaInstanciaModal';
import { NumeroFormModal } from '../components/numeros/NumeroFormModal';
import { ConfirmDeleteNumeroModal } from '../components/numeros/ConfirmDeleteNumeroModal';
import { useWhatsappRotacao } from '../hooks/useWhatsappRotacao';
import type { WhatsappRotacao } from '../hooks/useWhatsappRotacao';
import { cn } from '../utils/cn';

// ── Types ──────────────────────────────────────────────────────────

interface Torneio {
  id: string;
  nome: string;
  data_inicio: string;
  data_fim: string;
  status: 'ativo' | 'encerrado' | 'pausado';
  created_at: string;
  logica_ganhador?: 'quantidade' | 'lucro' | null;
}

interface ResumoAtivo {
  torneio: Torneio | null;
  totalParticipantes: number;
  totalGreens: number;
  somaPagamentos: number;
}

interface RankingEntry {
  torneio_id: string;
  torneio_nome: string;
  participante_id: string;
  telefone_whatsapp: string;
  id_conta: string | null;
  participante_nome: string | null;
  total_greens: number;
  soma_pagamentos: number;
  soma_lucro_liquido: number;
  primeiro_green: string | null;
  ultimo_green: string | null;
}

interface TorneioOption {
  id: string;
  nome: string;
  status: string;
  logica_ganhador?: 'quantidade' | 'lucro' | null;
}

interface GreenEntry {
  id: string;
  torneio_id: string;
  participante_id: string;
  id_aposta: string;
  jogo: string;
  data_hora_aposta: string;
  valor_apostado: number;
  valor_green: number;
  imagem_referencia: string | null;
  created_at: string;
}

interface InstanciaWpp {
  id: string;
  nome: string;
  numero: string;
  instancia: string;
  token: string;
  ativo: boolean;
}

// ── Tabs ───────────────────────────────────────────────────────────

const tabs = [
  { key: 'torneios', label: 'Torneios', icon: Trophy },
  { key: 'ranking', label: 'Ranking', icon: BarChart3 },
  { key: 'participantes', label: 'Participantes', icon: Users },
  { key: 'instancia', label: 'Instância', icon: Smartphone },
] as const;

type TabKey = typeof tabs[number]['key'];

// ── Helpers ────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function fmtBRL(val: number) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function calcCountdown(dataFim: string) {
  const diff = new Date(dataFim).getTime() - Date.now();
  if (diff <= 0) return null;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { d, h, m, s };
}

function fmtPhone(phone: string) {
  const nums = phone.replace(/\D/g, '');
  if (nums.length >= 12) {
    const ddd = nums.slice(2, 4);
    const p1 = nums.slice(4, 9);
    const p2 = nums.slice(9);
    return `(${ddd}) ${p1}-${p2}`;
  }
  return phone;
}

function displayName(entry: RankingEntry) {
  return entry.participante_nome || fmtPhone(entry.telefone_whatsapp);
}

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `ha ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `ha ${hrs}h`;
  const d = new Date(iso);
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} as ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

function buildRankingMsg(ranking: RankingEntry[], torneioNome: string, dataInicio: string, dataFim: string, top10: boolean) {
  const list = top10 ? ranking.slice(0, 10) : ranking;
  const numEmojis: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉', 4: '4️⃣', 5: '5️⃣', 6: '6️⃣', 7: '7️⃣', 8: '8️⃣', 9: '9️⃣', 10: '🔟' };

  const fmtD = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  let msg = `🏆 *RANKING — ${torneioNome}* 🏆\n📅 ${fmtD(dataInicio)} a ${fmtD(dataFim)}\n`;

  list.forEach((e, i) => {
    const pos = i + 1;
    const emoji = numEmojis[pos] || `${pos}º`;
    const nome = e.participante_nome || fmtPhone(e.telefone_whatsapp);
    const idConta = e.id_conta && e.id_conta.trim() ? e.id_conta : 'Pendente';
    msg += `\n${emoji} *${pos}º ${nome}*\n💰 ${fmtBRL(e.soma_pagamentos)} | 🎯 ${e.total_greens} greens\n🆔 ${idConta}\n`;
  });

  const totalGreens = ranking.reduce((s, e) => s + e.total_greens, 0);
  const totalPag = ranking.reduce((s, e) => s + e.soma_pagamentos, 0);
  msg += `\n📊 Total: ${ranking.length} participantes | ${totalGreens} greens\n💰 Total em pagamentos: ${fmtBRL(totalPag)}`;

  return msg;
}

// ── Custom Card Icons ──────────────────────────────────────────────

const TrophyIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" fill="none" className={className}>
    <defs>
      <linearGradient id="trophy-grad" x1="10" y1="2" x2="30" y2="38" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="var(--color-primary-light)" />
        <stop offset="50%" stopColor="var(--color-primary)" />
        <stop offset="100%" stopColor="var(--color-primary-hover)" />
      </linearGradient>
      <radialGradient id="trophy-glow" cx="20" cy="14" r="14" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="var(--color-primary-light)" stopOpacity="0.25" />
        <stop offset="100%" stopColor="var(--color-primary-light)" stopOpacity="0" />
      </radialGradient>
    </defs>
    <circle cx="20" cy="14" r="14" fill="url(#trophy-glow)" />
    <path d="M14 7h12v11c0 4-2.7 7-6 7s-6-3-6-7V7z" fill="url(#trophy-grad)" opacity="0.9" />
    <path d="M15 7h10v4H15z" fill="#fff" opacity="0.15" />
    <path d="M14 9H9.5c-.5 0-1 .4-1 1v1c0 3 2 5.5 5 5.5h.5" stroke="url(#trophy-grad)" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    <path d="M26 9h4.5c.5 0 1 .4 1 1v1c0 3-2 5.5-5 5.5h-.5" stroke="url(#trophy-grad)" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    <rect x="18" y="25" width="4" height="4" rx="0.8" fill="url(#trophy-grad)" opacity="0.7" />
    <rect x="14.5" y="29" width="11" height="3" rx="1.5" fill="url(#trophy-grad)" />
    <rect x="14.5" y="29" width="11" height="1.2" rx="0.6" fill="#fff" opacity="0.12" />
    <circle cx="20" cy="15.5" r="3" fill="none" stroke="#fff" strokeWidth="1.2" opacity="0.25" />
    <text x="20" y="17.7" textAnchor="middle" fill="#fff" fontSize="4.5" fontWeight="bold" opacity="0.35" fontFamily="sans-serif">1</text>
  </svg>
);

const TimerIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" fill="none" className={className}>
    <defs>
      <linearGradient id="timer-grad" x1="8" y1="4" x2="32" y2="36" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#004AFF" />
        <stop offset="100%" stopColor="#0040E0" />
      </linearGradient>
      <linearGradient id="timer-inner" x1="12" y1="10" x2="28" y2="34" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#fff" stopOpacity="0.12" />
        <stop offset="100%" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
    </defs>
    <circle cx="20" cy="22" r="14" stroke="url(#timer-grad)" strokeWidth="2.5" opacity="0.3" />
    <circle cx="20" cy="22" r="14" stroke="url(#timer-grad)" strokeWidth="2.5" strokeDasharray="88" strokeDashoffset="22" strokeLinecap="round">
      <animateTransform attributeName="transform" type="rotate" from="0 20 22" to="360 20 22" dur="8s" repeatCount="indefinite" />
    </circle>
    <circle cx="20" cy="22" r="10" fill="url(#timer-grad)" opacity="0.12" />
    <circle cx="20" cy="22" r="10" fill="url(#timer-inner)" />
    <line x1="20" y1="22" x2="20" y2="15" stroke="url(#timer-grad)" strokeWidth="2" strokeLinecap="round" />
    <line x1="20" y1="22" x2="25" y2="22" stroke="url(#timer-grad)" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
    <circle cx="20" cy="22" r="1.5" fill="url(#timer-grad)" />
    <rect x="17" y="4" width="6" height="3" rx="1.5" fill="url(#timer-grad)" opacity="0.6" />
    <line x1="29" y1="10" x2="31" y2="8" stroke="url(#timer-grad)" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
  </svg>
);

const ParticipantsIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" fill="none" className={className}>
    <defs>
      <linearGradient id="part-grad" x1="4" y1="8" x2="36" y2="36" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
    </defs>
    <circle cx="20" cy="12" r="5.5" fill="url(#part-grad)" />
    <circle cx="20" cy="12" r="5.5" fill="#fff" opacity="0.15" />
    <path d="M10 32c0-5.523 4.477-10 10-10s10 4.477 10 10" fill="url(#part-grad)" opacity="0.25" />
    <path d="M11 32c0-4.97 4.03-9 9-9s9 4.03 9 9" stroke="url(#part-grad)" strokeWidth="2" strokeLinecap="round" fill="none" />
    <circle cx="31" cy="14" r="3.5" fill="url(#part-grad)" opacity="0.5" />
    <path d="M34 26c0-3-1.5-5.5-4-6.8" stroke="url(#part-grad)" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" fill="none" />
    <circle cx="9" cy="14" r="3.5" fill="url(#part-grad)" opacity="0.5" />
    <path d="M6 26c0-3 1.5-5.5 4-6.8" stroke="url(#part-grad)" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" fill="none" />
  </svg>
);

const GreensIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" fill="none" className={className}>
    <defs>
      <linearGradient id="greens-grad" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#4ade80" />
        <stop offset="100%" stopColor="#16a34a" />
      </linearGradient>
      <linearGradient id="greens-bolt" x1="16" y1="6" x2="24" y2="34" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#86efac" />
        <stop offset="100%" stopColor="#16a34a" />
      </linearGradient>
    </defs>
    <circle cx="20" cy="20" r="16" fill="url(#greens-grad)" opacity="0.08" />
    <circle cx="20" cy="20" r="12" fill="url(#greens-grad)" opacity="0.1" />
    <circle cx="20" cy="20" r="16" stroke="url(#greens-grad)" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.3">
      <animateTransform attributeName="transform" type="rotate" from="0 20 20" to="-360 20 20" dur="20s" repeatCount="indefinite" />
    </circle>
    <polygon points="22,6 16,22 22,20 18,34 24,18 18,20" fill="url(#greens-bolt)" />
    <polygon points="22,6 16,22 22,20 18,34 24,18 18,20" fill="#fff" opacity="0.2" />
  </svg>
);

// ── Status Badge ───────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cfg: Record<string, string> = {
    ativo: 'bg-primary-bg text-primary-light border-primary-bg',
    pausado: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    encerrado: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
  };
  return (
    <span className={cn('px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wider border', cfg[status] || cfg.encerrado)}>
      {status}
    </span>
  );
};

// ── Modal ──────────────────────────────────────────────────────────

interface ModalProps {
  torneio?: Torneio | null;
  onClose: () => void;
  onSave: (data: { nome: string; data_inicio: string; data_fim: string; status: 'ativo' | 'pausado'; logica_ganhador: 'quantidade' | 'lucro' }) => Promise<void>;
  saving: boolean;
}

const TorneioModal: React.FC<ModalProps> = ({ torneio, onClose, onSave, saving }) => {
  const [nome, setNome] = useState(torneio?.nome || '');
  const [dataInicio, setDataInicio] = useState(torneio?.data_inicio ? torneio.data_inicio.slice(0, 16) : '');
  const [dataFim, setDataFim] = useState(torneio?.data_fim ? torneio.data_fim.slice(0, 16) : '');
  const [status, setStatus] = useState<'ativo' | 'pausado'>(torneio?.status === 'pausado' ? 'pausado' : 'ativo');
  const [logica, setLogica] = useState<'quantidade' | 'lucro'>(torneio?.logica_ganhador === 'quantidade' ? 'quantidade' : 'lucro');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !dataInicio || !dataFim) return;
    onSave({ nome: nome.trim(), data_inicio: new Date(dataInicio).toISOString(), data_fim: new Date(dataFim).toISOString(), status, logica_ganhador: logica });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card-dark-elevated w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-surface-300/20">
          <h2 className="text-[15px] font-semibold text-txt font-display">
            {torneio ? 'Editar Torneio' : 'Novo Torneio'}
          </h2>
          <button onClick={onClose} className="p-1.5 text-txt-muted hover:text-txt hover:bg-surface-200/40 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-[10px] font-mono font-semibold text-txt-muted mb-2 uppercase tracking-widest">Nome do Torneio *</label>
            <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Torneio Semanal #1" className="input-dark w-full" required />
          </div>
          <div>
            <label className="block text-[10px] font-mono font-semibold text-txt-muted mb-2 uppercase tracking-widest">Data e Hora Inicio *</label>
            <input type="datetime-local" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="input-dark w-full" required />
          </div>
          <div>
            <label className="block text-[10px] font-mono font-semibold text-txt-muted mb-2 uppercase tracking-widest">Data e Hora Fim *</label>
            <input type="datetime-local" value={dataFim} onChange={e => setDataFim(e.target.value)} className="input-dark w-full" required />
          </div>
          <div>
            <label className="block text-[10px] font-mono font-semibold text-txt-muted mb-2 uppercase tracking-widest">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value as 'ativo' | 'pausado')} className="input-dark w-full">
              <option value="ativo">Ativo</option>
              <option value="pausado">Pausado</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-mono font-semibold text-txt-muted mb-2 uppercase tracking-widest">Lógica de ganhador</label>
            <select value={logica} onChange={e => setLogica(e.target.value as 'quantidade' | 'lucro')} className="input-dark w-full">
              <option value="quantidade">Maior quantidade de greens</option>
              <option value="lucro">Maior lucro (soma dos greens)</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-txt-muted hover:text-txt hover:bg-surface-200/40 rounded-xl transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !nome.trim() || !dataInicio || !dataFim}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-semibold text-white bg-[#004AFF] hover:bg-[#004AFF]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {torneio ? 'Salvar' : 'Criar Torneio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Confirm Modal ──────────────────────────────────────────────────

const ConfirmModal: React.FC<{
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor?: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}> = ({ title, message, confirmLabel, confirmColor = 'bg-rose-500 hover:bg-rose-600', onConfirm, onClose, loading }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
    <div className="relative card-dark-elevated w-full max-w-sm animate-slide-up p-5">
      <h3 className="text-[15px] font-semibold text-txt font-display mb-2">{title}</h3>
      <p className="text-[13px] text-txt-secondary mb-5">{message}</p>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-txt-muted hover:text-txt hover:bg-surface-200/40 rounded-xl transition-colors">
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={cn('flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white transition-colors disabled:opacity-50', confirmColor)}
        >
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

// ── Enviar Ranking Modal ───────────────────────────────────────────

interface EnviarRankingModalProps {
  ranking: RankingEntry[];
  torneio: TorneioOption | undefined;
  dataInicio: string;
  dataFim: string;
  onClose: () => void;
  showToast: (type: 'success' | 'error', message: string) => void;
}

const EnviarRankingModal: React.FC<EnviarRankingModalProps> = ({ ranking, torneio, dataInicio, dataFim, onClose, showToast }) => {
  const [instancias, setInstancias] = useState<InstanciaWpp[]>([]);
  const [instSelecionada, setInstSelecionada] = useState('');
  const [numDestino, setNumDestino] = useState('');
  const [formato, setFormato] = useState<'top10' | 'completo'>('top10');
  const [enviando, setEnviando] = useState(false);
  const [loadingInst, setLoadingInst] = useState(true);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ranking_envio_prefs');
    if (saved) {
      try {
        const prefs = JSON.parse(saved);
        if (prefs.numDestino) setNumDestino(prefs.numDestino);
        if (prefs.instancia) setInstSelecionada(prefs.instancia);
      } catch { /* ignore */ }
    }
  }, []);

  // Fetch instancias
  useEffect(() => {
    (async () => {
      setLoadingInst(true);
      const expertId = useAuthStore.getState().getActiveExpertId();
      let instQuery = supabase
        .from('whatsapp_rotacao')
        .select('id, nome, numero, instancia, token, ativo')
        .eq('ativo', true)
        .order('ordem', { ascending: true });
      if (expertId) instQuery = instQuery.eq('expert_id', expertId);
      const { data } = await instQuery;
      const list = (data as InstanciaWpp[]) || [];
      setInstancias(list);
      if (list.length > 0) {
        const savedInst = localStorage.getItem('ranking_envio_prefs');
        let preselect = '';
        if (savedInst) {
          try { preselect = JSON.parse(savedInst).instancia || ''; } catch { /* ignore */ }
        }
        if (preselect && list.find(i => i.id === preselect)) {
          setInstSelecionada(preselect);
        } else {
          setInstSelecionada(list[0].id);
        }
      }
      setLoadingInst(false);
    })();
  }, []);

  const instObj = instancias.find(i => i.id === instSelecionada);
  const mensagemPreview = torneio ? buildRankingMsg(ranking, torneio.nome, dataInicio, dataFim, formato === 'top10') : '';

  const handleEnviar = async () => {
    if (!instObj || !numDestino.trim() || !torneio) return;
    setEnviando(true);

    // Save prefs
    localStorage.setItem('ranking_envio_prefs', JSON.stringify({ numDestino: numDestino.trim(), instancia: instSelecionada }));

    try {
      const res = await fetchWithTimeout(WEBHOOKS.RANKING_TORNEIO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instancia: instObj.instancia,
          token: instObj.token.trim(),
          numero_instancia: instObj.numero,
          numero_destino: numDestino.replace(/\D/g, ''),
          mensagem: mensagemPreview,
          torneio_nome: torneio.nome,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast('success', 'Ranking enviado com sucesso!');
      onClose();
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao enviar ranking');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card-dark-elevated w-full max-w-lg animate-slide-up max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-surface-300/20 shrink-0">
          <h2 className="text-[15px] font-semibold text-txt font-display flex items-center gap-2">
            <Send className="w-4 h-4 text-[#004AFF]" />
            Enviar Ranking via WhatsApp
          </h2>
          <button onClick={onClose} className="p-1.5 text-txt-muted hover:text-txt hover:bg-surface-200/40 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-[10px] font-mono font-semibold text-txt-muted mb-2 uppercase tracking-widest">Instancia *</label>
            {loadingInst ? (
              <div className="h-10 bg-surface-200/40 rounded-xl animate-pulse" />
            ) : (
              <select value={instSelecionada} onChange={e => setInstSelecionada(e.target.value)} className="input-dark w-full">
                {instancias.map(i => (
                  <option key={i.id} value={i.id}>{i.nome} ({i.instancia})</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-mono font-semibold text-txt-muted mb-2 uppercase tracking-widest">Numero Destino *</label>
            <input
              type="text"
              value={numDestino}
              onChange={e => setNumDestino(e.target.value.replace(/\D/g, ''))}
              placeholder="Ex: 5511999999999"
              className="input-dark w-full"
              maxLength={15}
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono font-semibold text-txt-muted mb-2 uppercase tracking-widest">Formato</label>
            <select value={formato} onChange={e => setFormato(e.target.value as 'top10' | 'completo')} className="input-dark w-full">
              <option value="top10">Top 10</option>
              <option value="completo">Ranking completo</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-mono font-semibold text-txt-muted mb-2 uppercase tracking-widest">Preview da Mensagem</label>
            <textarea
              readOnly
              value={mensagemPreview}
              className="w-full rounded-xl border border-surface-300/20 bg-[#0a0a0a] text-[12px] text-txt-secondary font-mono p-3 resize-none"
              style={{ minHeight: 180, maxHeight: 300 }}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-surface-300/20 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-txt-muted hover:text-txt hover:bg-surface-200/40 rounded-xl transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleEnviar}
            disabled={enviando || !instObj || !numDestino.trim() || numDestino.length < 10}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-semibold text-white bg-[#004AFF] hover:bg-[#004AFF]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {enviando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {enviando ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────

export const Torneios: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('torneios');
  const { toast, showToast, hideToast } = useToast();

  // Data
  const [torneios, setTorneios] = useState<Torneio[]>([]);
  const [resumo, setResumo] = useState<ResumoAtivo>({ torneio: null, totalParticipantes: 0, totalGreens: 0, somaPagamentos: 0 });
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Torneio | null>(null);
  const [saving, setSaving] = useState(false);

  // Confirm state
  const [confirmAction, setConfirmAction] = useState<{ type: 'encerrar' | 'pausar' | 'retomar' | 'excluir'; torneio: Torneio } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Dropdown state
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Countdown
  const [countdown, setCountdown] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  // Ranking state
  const [rankTorneioId, setRankTorneioId] = useState<string>('');
  const [rankTorneios, setRankTorneios] = useState<TorneioOption[]>([]);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [rankLoading, setRankLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Participantes state
  const [partTorneioId, setPartTorneioId] = useState<string>('');
  const [partTorneios, setPartTorneios] = useState<TorneioOption[]>([]);
  const [participantes, setParticipantes] = useState<RankingEntry[]>([]);
  const [partLoading, setPartLoading] = useState(false);
  const [partBusca, setPartBusca] = useState('');
  const [partSort, setPartSort] = useState<{ col: string; asc: boolean }>({ col: 'soma_lucro_liquido', asc: false });
  const [expandedPart, setExpandedPart] = useState<string | null>(null);
  const [expandedGreens, setExpandedGreens] = useState<GreenEntry[]>([]);
  const [expandedLoading, setExpandedLoading] = useState(false);
  const [editIdContaModal, setEditIdContaModal] = useState<RankingEntry | null>(null);
  const [editIdContaVal, setEditIdContaVal] = useState('');
  const [editIdContaSaving, setEditIdContaSaving] = useState(false);
  const [partDropdown, setPartDropdown] = useState<string | null>(null);
  const partDropdownRef = useRef<HTMLDivElement>(null);
  const [removePartConfirm, setRemovePartConfirm] = useState<RankingEntry | null>(null);
  const [removePartLoading, setRemovePartLoading] = useState(false);

  // Enviar Ranking modal
  const [enviarRankingOpen, setEnviarRankingOpen] = useState(false);

  // Instância Torneio state
  const {
    instanciasTorneio,
    loading: wppLoading,
    fetchData: wppFetchData,
    toggleAtivo: wppToggleAtivo,
    editarNumero: wppEditarNumero,
    excluirNumero: wppExcluirNumero,
    trocarOrdem: wppTrocarOrdem,
    reconectar: wppReconectar,
    criarInstancia: wppCriarInstancia,
  } = useWhatsappRotacao();

  const [torneioInstanciaModal, setTorneioInstanciaModal] = useState(false);
  const [torneioEditModal, setTorneioEditModal] = useState<{ open: boolean; numero: WhatsappRotacao | null }>({ open: false, numero: null });
  const [torneioDeleteModal, setTorneioDeleteModal] = useState<WhatsappRotacao | null>(null);

  const conectadosTorneio = instanciasTorneio.filter((n) => n.status_conexao === 'connected').length;
  const desconectadosTorneio = instanciasTorneio.filter((n) => n.status_conexao === 'disconnected' || !n.status_conexao).length;

  const handleTorneioToggleAtivo = async (id: number, ativo: boolean) => {
    // Se está ativando, desativar todas as outras instâncias de torneio primeiro
    if (ativo) {
      const outrasAtivas = instanciasTorneio.filter((n) => n.id !== id && n.ativo);
      for (const outra of outrasAtivas) {
        await wppToggleAtivo(outra.id, false);
      }
    }
    const erro = await wppToggleAtivo(id, ativo);
    if (erro) showToast('error', erro);
    else showToast('success', ativo ? 'Instância ativada!' : 'Instância desativada!');
  };

  const handleTorneioCriarInstancia = async (nome: string, numero: string) => {
    const result = await wppCriarInstancia(nome, numero, 'torneio');
    if (result.sucesso) {
      showToast('success', 'Instância criada! Aguardando pareamento...');
      wppFetchData(false);
    }
    return result;
  };

  const handleTorneioSaveNumero = async (data: { nome: string; numero: string; instancia: string; ordem: number }) => {
    if (torneioEditModal.numero) {
      const erro = await wppEditarNumero(torneioEditModal.numero.id, data);
      if (erro) { showToast('error', erro); return; }
      showToast('success', 'Instância atualizada!');
    }
    setTorneioEditModal({ open: false, numero: null });
  };

  const handleTorneioDeleteNumero = async () => {
    if (!torneioDeleteModal) return;
    const erro = await wppExcluirNumero(torneioDeleteModal.id, torneioDeleteModal);
    if (erro) { showToast('error', erro); return; }
    showToast('success', 'Instância excluída!');
    setTorneioDeleteModal(null);
  };

  const handleTorneioReconectar = async (id: number) => {
    const result = await wppReconectar(id);
    if (result.sucesso) showToast('success', result.mensagem || 'Reconexão iniciada!');
    else showToast('error', result.mensagem || 'Erro ao reconectar');
    return result;
  };

  const handleTorneioMoveUp = async (numero: WhatsappRotacao) => {
    const idx = instanciasTorneio.findIndex((n) => n.id === numero.id);
    if (idx <= 0) return;
    const erro = await wppTrocarOrdem(numero.id, instanciasTorneio[idx - 1].id);
    if (erro) showToast('error', erro);
  };

  const handleTorneioMoveDown = async (numero: WhatsappRotacao) => {
    const idx = instanciasTorneio.findIndex((n) => n.id === numero.id);
    if (idx < 0 || idx >= instanciasTorneio.length - 1) return;
    const erro = await wppTrocarOrdem(numero.id, instanciasTorneio[idx + 1].id);
    if (erro) showToast('error', erro);
  };

  // ── Fetch ──────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Todos os torneios
      const expertId = useAuthStore.getState().getActiveExpertId();
      let torneiosQuery = supabase
        .from('torneios')
        .select('*')
        .order('created_at', { ascending: false });
      if (expertId) torneiosQuery = torneiosQuery.eq('expert_id', expertId);
      const { data: allTorneios } = await torneiosQuery;

      setTorneios((allTorneios as Torneio[]) || []);

      // Torneio ativo
      const ativo = (allTorneios as Torneio[])?.find(t => t.status === 'ativo') || null;

      if (ativo) {
        // Greens do torneio ativo
        const { data: greensData } = await supabase
          .from('greens')
          .select('participante_id, valor_green')
          .eq('torneio_id', ativo.id);

        const greens = greensData || [];
        const participantesUnicos = new Set(greens.map(g => (g as any).participante_id)).size;
        const soma = greens.reduce((acc, g) => acc + (Number((g as any).valor_green) || 0), 0);

        setResumo({ torneio: ativo, totalParticipantes: participantesUnicos, totalGreens: greens.length, somaPagamentos: soma });
      } else {
        setResumo({ torneio: null, totalParticipantes: 0, totalGreens: 0, somaPagamentos: 0 });
      }
    } catch {
      showToast('error', 'Erro ao carregar torneios');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Countdown timer
  useEffect(() => {
    if (!resumo.torneio) { setCountdown(null); return; }
    const tick = () => setCountdown(calcCountdown(resumo.torneio!.data_fim));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [resumo.torneio]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Ranking fetch ─────────────────────────────────────────────

  const fetchRankTorneios = useCallback(async () => {
    const expertId = useAuthStore.getState().getActiveExpertId();
    let rankQuery = supabase
      .from('torneios')
      .select('id, nome, status, logica_ganhador')
      .order('created_at', { ascending: false });
    if (expertId) rankQuery = rankQuery.eq('expert_id', expertId);
    const { data } = await rankQuery;
    const list = (data as TorneioOption[]) || [];
    setRankTorneios(list);
    // Pre-select active tournament
    if (!rankTorneioId || !list.find(t => t.id === rankTorneioId)) {
      const ativo = list.find(t => t.status === 'ativo');
      if (ativo) setRankTorneioId(ativo.id);
      else if (list.length > 0) setRankTorneioId(list[0].id);
    }
  }, [rankTorneioId]);

  const fetchRanking = useCallback(async (torneioId?: string) => {
    const tid = torneioId || rankTorneioId;
    if (!tid) return;
    setRankLoading(true);
    try {
      const torneio = rankTorneios.find(t => t.id === tid);
      const orderColumn = torneio?.logica_ganhador === 'quantidade' ? 'total_greens' : 'soma_lucro_liquido';
      const { data } = await supabase
        .from('ranking_torneio')
        .select('*')
        .eq('torneio_id', tid)
        .order(orderColumn, { ascending: false });
      setRanking((data as RankingEntry[]) || []);
    } catch {
      showToast('error', 'Erro ao carregar ranking');
    } finally {
      setRankLoading(false);
    }
  }, [rankTorneioId, rankTorneios, showToast]);

  // Load ranking torneios when tab changes
  useEffect(() => {
    if (activeTab === 'ranking') fetchRankTorneios();
  }, [activeTab, fetchRankTorneios]);

  // Fetch ranking when torneio selected
  useEffect(() => {
    if (activeTab === 'ranking' && rankTorneioId) fetchRanking(rankTorneioId);
  }, [activeTab, rankTorneioId, fetchRanking]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    if (autoRefresh && activeTab === 'ranking' && rankTorneioId) {
      autoRefreshRef.current = setInterval(() => fetchRanking(rankTorneioId), 30000);
    }
    return () => { if (autoRefreshRef.current) clearInterval(autoRefreshRef.current); };
  }, [autoRefresh, activeTab, rankTorneioId, fetchRanking]);

  useEffect(() => {
    if (!partTorneioId) return;
    const torneio = partTorneios.find(t => t.id === partTorneioId);
    if (!torneio) return;
    const col = torneio.logica_ganhador === 'quantidade' ? 'total_greens' : 'soma_lucro_liquido';
    setPartSort(prev => (prev.col === col ? prev : { col, asc: false }));
  }, [partTorneioId, partTorneios]);

  // ── Participantes fetch ──────────────────────────────────────

  const fetchPartTorneios = useCallback(async () => {
    const expertId = useAuthStore.getState().getActiveExpertId();
    let partQuery = supabase
      .from('torneios')
      .select('id, nome, status, logica_ganhador')
      .order('created_at', { ascending: false });
    if (expertId) partQuery = partQuery.eq('expert_id', expertId);
    const { data } = await partQuery;
    const list = (data as TorneioOption[]) || [];
    setPartTorneios(list);
    if (!partTorneioId || !list.find(t => t.id === partTorneioId)) {
      const ativo = list.find(t => t.status === 'ativo');
      if (ativo) setPartTorneioId(ativo.id);
      else if (list.length > 0) setPartTorneioId(list[0].id);
    }
  }, [partTorneioId]);

  const fetchParticipantes = useCallback(async (torneioId?: string) => {
    const tid = torneioId || partTorneioId;
    if (!tid) return;
    setPartLoading(true);
    try {
      const torneio = partTorneios.find(t => t.id === tid);
      const orderColumn = torneio?.logica_ganhador === 'quantidade' ? 'total_greens' : 'soma_lucro_liquido';
      const { data } = await supabase
        .from('ranking_torneio')
        .select('*')
        .eq('torneio_id', tid)
        .order(orderColumn, { ascending: false });
      setParticipantes((data as RankingEntry[]) || []);
    } catch {
      showToast('error', 'Erro ao carregar participantes');
    } finally {
      setPartLoading(false);
    }
  }, [partTorneioId, partTorneios, showToast]);

  const fetchGreensParticipante = useCallback(async (participanteId: string) => {
    if (!partTorneioId) return;
    setExpandedLoading(true);
    try {
      const { data } = await supabase
        .from('greens')
        .select('*')
        .eq('torneio_id', partTorneioId)
        .eq('participante_id', participanteId)
        .order('data_hora_aposta', { ascending: false });
      setExpandedGreens((data as GreenEntry[]) || []);
    } catch {
      showToast('error', 'Erro ao carregar greens');
    } finally {
      setExpandedLoading(false);
    }
  }, [partTorneioId, showToast]);

  useEffect(() => {
    if (activeTab === 'participantes') fetchPartTorneios();
  }, [activeTab, fetchPartTorneios]);

  useEffect(() => {
    if (activeTab === 'participantes' && partTorneioId) {
      fetchParticipantes(partTorneioId);
      setExpandedPart(null);
    }
  }, [activeTab, partTorneioId, fetchParticipantes]);

  // Close part dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (partDropdownRef.current && !partDropdownRef.current.contains(e.target as Node)) {
        setPartDropdown(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleExpandParticipante = (id: string) => {
    if (expandedPart === id) {
      setExpandedPart(null);
      setExpandedGreens([]);
    } else {
      setExpandedPart(id);
      fetchGreensParticipante(id);
    }
  };

  const handleEditIdConta = async () => {
    if (!editIdContaModal) return;
    setEditIdContaSaving(true);
    try {
      const { error } = await supabase
        .from('participantes')
        .update({ id_conta: editIdContaVal.trim() || null })
        .eq('id', editIdContaModal.participante_id);
      if (error) throw error;
      showToast('success', 'ID Conta atualizado');
      setEditIdContaModal(null);
      fetchParticipantes();
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao atualizar');
    } finally {
      setEditIdContaSaving(false);
    }
  };

  const handleRemoveParticipante = async () => {
    if (!removePartConfirm || !partTorneioId) return;
    setRemovePartLoading(true);
    try {
      const { error } = await supabase
        .from('greens')
        .delete()
        .eq('torneio_id', partTorneioId)
        .eq('participante_id', removePartConfirm.participante_id);
      if (error) throw error;
      showToast('success', 'Participante removido do torneio');
      setRemovePartConfirm(null);
      setExpandedPart(null);
      fetchParticipantes();
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao remover');
    } finally {
      setRemovePartLoading(false);
    }
  };

  // Filtered & sorted participantes
  const filteredParticipantes = (() => {
    let list = participantes;
    if (partBusca.trim()) {
      const q = partBusca.toLowerCase();
      list = list.filter(p =>
        (p.participante_nome || '').toLowerCase().includes(q) ||
        p.telefone_whatsapp.includes(q) ||
        (p.id_conta || '').toLowerCase().includes(q)
      );
    }
    const sorted = [...list].sort((a, b) => {
      const col = partSort.col as keyof RankingEntry;
      const av = a[col] ?? '';
      const bv = b[col] ?? '';
      if (typeof av === 'number' && typeof bv === 'number') return partSort.asc ? av - bv : bv - av;
      return partSort.asc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return sorted;
  })();

  const partResumo = {
    total: participantes.length,
    comId: participantes.filter(p => p.id_conta && p.id_conta.trim()).length,
    semId: participantes.filter(p => !p.id_conta || !p.id_conta.trim()).length,
  };

  const handlePartSort = (col: string) => {
    setPartSort(prev => prev.col === col ? { col, asc: !prev.asc } : { col, asc: false });
  };

  const SortIcon: React.FC<{ col: string }> = ({ col }) => {
    if (partSort.col !== col) return null;
    return partSort.asc ? <ChevronUp className="w-3 h-3 inline ml-1" /> : <ChevronDown className="w-3 h-3 inline ml-1" />;
  };

  // ── Actions ────────────────────────────────────────────────────

  const handleSave = async (data: { nome: string; data_inicio: string; data_fim: string; status: 'ativo' | 'pausado'; logica_ganhador: 'quantidade' | 'lucro' }) => {
    setSaving(true);
    try {
      // Se vai ativar, checar se já existe outro ativo
      if (data.status === 'ativo') {
        const outroAtivo = torneios.find(t => t.status === 'ativo' && t.id !== editando?.id);
        if (outroAtivo) {
          // Encerrar o anterior
          await supabase.from('torneios').update({ status: 'encerrado' }).eq('id', outroAtivo.id);
        }
      }

      if (editando) {
        const { error } = await supabase.from('torneios').update(data).eq('id', editando.id);
        if (error) throw error;
        showToast('success', 'Torneio atualizado');
      } else {
        const expertId = useAuthStore.getState().getActiveExpertId();
        const { error } = await supabase.from('torneios').insert({ ...data, expert_id: expertId });
        if (error) throw error;
        showToast('success', 'Torneio criado');
      }

      setModalOpen(false);
      setEditando(null);
      fetchData();
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao salvar torneio');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    setConfirmLoading(true);
    const { type, torneio } = confirmAction;

    try {
      if (type === 'encerrar') {
        await supabase.from('torneios').update({ status: 'encerrado' }).eq('id', torneio.id);
        showToast('success', 'Torneio encerrado');
      } else if (type === 'pausar') {
        await supabase.from('torneios').update({ status: 'pausado' }).eq('id', torneio.id);
        showToast('success', 'Torneio pausado');
      } else if (type === 'retomar') {
        // Checar se já existe outro ativo
        const outroAtivo = torneios.find(t => t.status === 'ativo' && t.id !== torneio.id);
        if (outroAtivo) {
          await supabase.from('torneios').update({ status: 'encerrado' }).eq('id', outroAtivo.id);
        }
        await supabase.from('torneios').update({ status: 'ativo' }).eq('id', torneio.id);
        showToast('success', 'Torneio retomado');
      } else if (type === 'excluir') {
        const { count } = await supabase.from('greens').select('*', { count: 'exact', head: true }).eq('torneio_id', torneio.id);
        if (count && count > 0) {
          showToast('error', `Nao e possivel excluir: ${count} greens vinculados`);
          setConfirmAction(null);
          setConfirmLoading(false);
          return;
        }
        await supabase.from('torneios').delete().eq('id', torneio.id);
        showToast('success', 'Torneio excluido');
      }

      setConfirmAction(null);
      fetchData();
    } catch (err: any) {
      showToast('error', err.message || 'Erro na operacao');
    } finally {
      setConfirmLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────

  const confirmMessages: Record<string, { title: string; message: string; label: string; color?: string }> = {
    encerrar: { title: 'Encerrar Torneio', message: `Deseja encerrar "${confirmAction?.torneio.nome}"? Esta acao nao pode ser desfeita.`, label: 'Encerrar', color: 'bg-rose-500 hover:bg-rose-600' },
    pausar: { title: 'Pausar Torneio', message: `Deseja pausar "${confirmAction?.torneio.nome}"?`, label: 'Pausar', color: 'bg-amber-500 hover:bg-amber-600' },
    retomar: { title: 'Retomar Torneio', message: `Deseja reativar "${confirmAction?.torneio.nome}"? Se houver outro torneio ativo, ele sera encerrado.`, label: 'Retomar', color: 'bg-primary hover:bg-primary-hover' },
    excluir: { title: 'Excluir Torneio', message: `Deseja excluir "${confirmAction?.torneio.nome}" permanentemente? So e possivel se nao houver greens vinculados.`, label: 'Excluir', color: 'bg-rose-500 hover:bg-rose-600' },
  };

  return (
    <div className="space-y-6 overflow-x-hidden">
      <PageHeader title="Torneios" subtitle="Gerencie torneios, rankings e participantes" />

      {/* Tabs */}
      <div className="grid grid-cols-2 md:flex gap-1 p-1 bg-surface-50/80 rounded-xl border border-surface-300/10 w-full md:w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-all duration-200',
              activeTab === tab.key
                ? 'shadow-sm'
                : 'text-[#A8A8B3] hover:text-[#D4D4DB] hover:bg-surface-200/20'
            )}
            style={activeTab === tab.key ? { background: 'var(--color-primary-bg)', color: 'var(--color-primary-light)' } : undefined}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Aba Torneios ───────────────────────────────────── */}
      {activeTab === 'torneios' && (
        <>
          {/* Cards resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1 — Torneio Ativo */}
            <div className="card-dark p-5 group transition-all duration-500 relative overflow-hidden hover:scale-[1.01]">
              <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(to right, var(--color-primary-bg), transparent)' }} />
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary-bg rounded-full blur-2xl group-hover:bg-primary-bg transition-all duration-700" />
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div className="relative">
                    <TrophyIcon className="w-11 h-11" />
                    <div className="absolute inset-0 bg-primary-bg rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>
                  {resumo.torneio && <StatusBadge status={resumo.torneio.status} />}
                </div>
                <p className="text-txt-muted text-[10px] font-mono font-semibold uppercase tracking-[0.12em] mb-1.5">Torneio Ativo</p>
                <div className="text-lg font-bold text-txt font-display tracking-tight leading-tight">
                  {loading ? (
                    <div className="h-5 w-32 bg-surface-200/40 rounded animate-pulse" />
                  ) : resumo.torneio ? resumo.torneio.nome : (
                    <span className="text-txt-dim text-sm font-normal italic">Nenhum ativo</span>
                  )}
                </div>
                {resumo.torneio && (
                  <p className="text-[10px] text-txt-dim mt-1.5 font-mono tracking-wide">
                    {fmtDate(resumo.torneio.data_inicio)} — {fmtDate(resumo.torneio.data_fim)}
                  </p>
                )}
              </div>
            </div>

            {/* Card 2 — Tempo Restante */}
            <div className="card-dark p-5 group transition-all duration-500 relative overflow-hidden hover:scale-[1.01]">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500/60 via-blue-600/30 to-transparent" />
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-600/[0.04] rounded-full blur-2xl group-hover:bg-blue-600/[0.08] transition-all duration-700" />
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div className="relative">
                    <TimerIcon className="w-11 h-11" />
                    <div className="absolute inset-0 bg-blue-500/10 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>
                </div>
                <p className="text-txt-muted text-[10px] font-mono font-semibold uppercase tracking-[0.12em] mb-1.5">Tempo Restante</p>
                {loading ? (
                  <div className="h-8 w-40 bg-surface-200/40 rounded animate-pulse" />
                ) : !resumo.torneio ? (
                  <span className="text-txt-dim text-sm italic">—</span>
                ) : countdown ? (
                  <div className="flex gap-2 mt-1">
                    {[
                      { val: countdown.d, label: 'DIA' },
                      { val: countdown.h, label: 'HOR' },
                      { val: countdown.m, label: 'MIN' },
                      { val: countdown.s, label: 'SEG' },
                    ].map((u, i) => (
                      <React.Fragment key={u.label}>
                        <div className="text-center">
                          <div className="text-xl font-bold text-txt font-display tabular-nums bg-surface-200/30 rounded-lg px-2 py-0.5 border border-surface-300/10">
                            {String(u.val).padStart(2, '0')}
                          </div>
                          <div className="text-[8px] text-txt-muted font-mono font-semibold uppercase tracking-widest mt-1">{u.label}</div>
                        </div>
                        {i < 3 && <span className="text-blue-600/40 font-bold text-lg self-start mt-0.5">:</span>}
                      </React.Fragment>
                    ))}
                  </div>
                ) : (
                  <span className="text-rose-400 text-sm font-semibold">Encerrado</span>
                )}
              </div>
            </div>

            {/* Card 3 — Participantes */}
            <div className="card-dark p-5 group transition-all duration-500 relative overflow-hidden hover:scale-[1.01]">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-400/60 via-amber-500/30 to-transparent" />
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/[0.04] rounded-full blur-2xl group-hover:bg-amber-500/[0.08] transition-all duration-700" />
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div className="relative">
                    <ParticipantsIcon className="w-11 h-11" />
                    <div className="absolute inset-0 bg-amber-400/10 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>
                </div>
                <p className="text-txt-muted text-[10px] font-mono font-semibold uppercase tracking-[0.12em] mb-1.5">Participantes</p>
                <div className="flex items-baseline gap-1.5">
                  <div className="text-[2rem] font-bold text-txt font-display tracking-tight leading-none">
                    {loading ? <div className="h-8 w-12 bg-surface-200/40 rounded animate-pulse" /> : resumo.totalParticipantes}
                  </div>
                  {!loading && <span className="text-[11px] text-txt-dim font-mono">jogadores</span>}
                </div>
                <p className="text-[10px] text-txt-dim mt-1.5 font-mono">com greens registrados</p>
              </div>
            </div>

            {/* Card 4 — Greens Registrados */}
            <div className="card-dark p-5 group transition-all duration-500 relative overflow-hidden hover:scale-[1.01]">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-green-400/60 via-green-500/30 to-transparent" />
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-green-500/[0.04] rounded-full blur-2xl group-hover:bg-green-500/[0.08] transition-all duration-700" />
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div className="relative">
                    <GreensIcon className="w-11 h-11" />
                    <div className="absolute inset-0 bg-green-400/10 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>
                </div>
                <p className="text-txt-muted text-[10px] font-mono font-semibold uppercase tracking-[0.12em] mb-1.5">Greens Registrados</p>
                <div className="flex items-baseline gap-1.5">
                  <div className="text-[2rem] font-bold text-txt font-display tracking-tight leading-none">
                    {loading ? <div className="h-8 w-12 bg-surface-200/40 rounded animate-pulse" /> : resumo.totalGreens}
                  </div>
                  {!loading && <span className="text-[11px] text-txt-dim font-mono">greens</span>}
                </div>
                <p className="text-[10px] text-txt-dim mt-1.5 font-mono">
                  {loading ? '' : fmtBRL(resumo.somaPagamentos) + ' em pagamentos'}
                </p>
              </div>
            </div>
          </div>

          {/* Botão Novo Torneio + Tabela */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-txt font-display">Todos os Torneios</h3>
            <button
              onClick={() => { setEditando(null); setModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white bg-[#004AFF] hover:bg-[#004AFF]/80 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo Torneio
            </button>
          </div>

          {/* Tabela */}
          <div className="card-dark !overflow-visible relative" ref={dropdownRef}>
            <div className="overflow-x-auto overflow-y-visible">
              <table className="w-full min-w-[640px] text-left">
                <thead>
                  <tr className="border-b border-surface-300/20">
                    <th className="px-5 py-3.5 text-[10px] font-mono font-semibold text-txt-muted uppercase tracking-widest">Nome</th>
                    <th className="px-5 py-3.5 text-[10px] font-mono font-semibold text-txt-muted uppercase tracking-widest">Inicio</th>
                    <th className="px-5 py-3.5 text-[10px] font-mono font-semibold text-txt-muted uppercase tracking-widest">Fim</th>
                    <th className="px-5 py-3.5 text-[10px] font-mono font-semibold text-txt-muted uppercase tracking-widest">Status</th>
                    <th className="px-5 py-3.5 text-[10px] font-mono font-semibold text-txt-muted uppercase tracking-widest text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="border-b border-surface-300/10">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <td key={j} className="px-5 py-4"><div className="h-4 w-24 bg-surface-200/40 rounded animate-pulse" /></td>
                        ))}
                      </tr>
                    ))
                  ) : torneios.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-sm text-txt-muted">
                        Nenhum torneio cadastrado
                      </td>
                    </tr>
                  ) : (
                    torneios.map(t => (
                      <tr key={t.id} className="border-b border-surface-300/10 hover:bg-surface-200/20 transition-colors duration-150 group">
                        <td className="px-5 py-4 text-sm font-medium text-txt group-hover:text-[#004AFF] transition-colors">{t.nome}</td>
                        <td className="px-5 py-4 text-[12px] text-txt-secondary font-mono">{fmtDate(t.data_inicio)}</td>
                        <td className="px-5 py-4 text-[12px] text-txt-secondary font-mono">{fmtDate(t.data_fim)}</td>
                        <td className="px-5 py-4"><StatusBadge status={t.status} /></td>
                        <td className="px-5 py-4 text-right relative">
                          <button
                            onClick={() => setOpenDropdown(openDropdown === t.id ? null : t.id)}
                            className="p-1.5 text-txt-muted hover:text-txt hover:bg-surface-200/40 rounded-lg transition-colors"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {openDropdown === t.id && (
                            <div className="absolute right-0 bottom-full mb-2 z-50 w-44 py-1.5 rounded-xl border border-surface-300/20 bg-surface-50 shadow-2xl animate-slide-up">
                              {/* Editar — sempre visível */}
                              <button
                                onClick={() => { setOpenDropdown(null); setEditando(t); setModalOpen(true); }}
                                className="flex items-center gap-2.5 w-full px-4 py-2 text-[13px] text-txt-secondary hover:bg-surface-200/40 hover:text-txt transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" /> Editar
                              </button>

                              {/* Pausar — só se ativo */}
                              {t.status === 'ativo' && (
                                <button
                                  onClick={() => { setOpenDropdown(null); setConfirmAction({ type: 'pausar', torneio: t }); }}
                                  className="flex items-center gap-2.5 w-full px-4 py-2 text-[13px] text-amber-400 hover:bg-surface-200/40 transition-colors"
                                >
                                  <Pause className="w-3.5 h-3.5" /> Pausar
                                </button>
                              )}

                              {/* Retomar — só se pausado */}
                              {t.status === 'pausado' && (
                                <button
                                  onClick={() => { setOpenDropdown(null); setConfirmAction({ type: 'retomar', torneio: t }); }}
                                  className="flex items-center gap-2.5 w-full px-4 py-2 text-[13px] text-primary-light hover:bg-surface-200/40 transition-colors"
                                >
                                  <Play className="w-3.5 h-3.5" /> Retomar
                                </button>
                              )}

                              {/* Encerrar — se ativo ou pausado */}
                              {(t.status === 'ativo' || t.status === 'pausado') && (
                                <button
                                  onClick={() => { setOpenDropdown(null); setConfirmAction({ type: 'encerrar', torneio: t }); }}
                                  className="flex items-center gap-2.5 w-full px-4 py-2 text-[13px] text-rose-400 hover:bg-surface-200/40 transition-colors"
                                >
                                  <XCircle className="w-3.5 h-3.5" /> Encerrar
                                </button>
                              )}

                              <div className="h-px bg-surface-300/15 my-1" />
                              <button
                                onClick={() => { setOpenDropdown(null); setConfirmAction({ type: 'excluir', torneio: t }); }}
                                className="flex items-center gap-2.5 w-full px-4 py-2 text-[13px] text-rose-400 hover:bg-surface-200/40 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Excluir
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ─── Aba Ranking ────────────────────────────────────── */}
      {activeTab === 'ranking' && (
        <>
          {/* Seletor + controles */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={rankTorneioId}
              onChange={e => setRankTorneioId(e.target.value)}
              className="input-dark min-w-[220px]"
            >
              {rankTorneios.map(t => (
                <option key={t.id} value={t.id}>
                  {t.nome} {t.status === 'ativo' ? '(Ativo)' : t.status === 'pausado' ? '(Pausado)' : ''}
                </option>
              ))}
            </select>

            <button
              onClick={() => fetchRanking()}
              disabled={rankLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium text-txt-secondary hover:text-txt hover:bg-surface-200/40 border border-surface-300/20 transition-colors"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', rankLoading && 'animate-spin')} />
              Atualizar
            </button>

            <label className="flex items-center gap-2 cursor-pointer ml-auto">
              <span className="text-[12px] text-txt-muted">Auto-refresh</span>
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={autoRefresh}
                  onChange={e => setAutoRefresh(e.target.checked)}
                />
                <div className="w-9 h-5 bg-surface-300/40 rounded-full peer peer-checked:bg-[#004AFF]/30 peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-txt-dim after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:bg-[#004AFF]"></div>
              </div>
              {autoRefresh && <span className="w-2 h-2 rounded-full bg-primary-light animate-pulse" />}
            </label>
          </div>

          {/* Content */}
          {rankLoading && ranking.length === 0 ? (
            <div className="space-y-4">
              {/* Podium skeleton */}
              <div className="card-dark p-8 relative overflow-hidden">
                <div className="flex justify-center items-end gap-6 pt-12 pb-4">
                  {[{ w: 'w-44', h: 'h-36' }, { w: 'w-48', h: 'h-48' }, { w: 'w-40', h: 'h-28' }].map((s, i) => (
                    <div key={i} className={cn(s.w, s.h, 'rounded-xl bg-surface-200/20 animate-pulse')} />
                  ))}
                </div>
              </div>
              {/* Table skeleton */}
              <div className="card-dark overflow-hidden">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-4 px-5 py-4 border-b border-surface-300/10">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <div key={j} className="h-4 flex-1 bg-surface-200/40 rounded animate-pulse" />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : ranking.length === 0 ? (
            <div className="card-dark p-16 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-surface-200/5 to-transparent pointer-events-none" />
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-surface-200/20 flex items-center justify-center mb-5">
                  <Trophy className="w-10 h-10 text-txt-muted/30" />
                </div>
                <p className="text-sm text-txt-muted font-display">Nenhum participante registrou greens neste torneio ainda</p>
              </div>
            </div>
          ) : (
            <>
              {/* ── Podio ── */}
              {ranking.length >= 3 ? (
                <div className="card-dark relative overflow-hidden">
                  {/* Background ambient */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[#FFD700]/[0.03] rounded-full blur-[100px]" />
                    <div className="absolute top-1/3 left-1/4 w-[200px] h-[200px] bg-[#C0C0C0]/[0.02] rounded-full blur-[80px]" />
                    <div className="absolute top-1/3 right-1/4 w-[200px] h-[200px] bg-[#CD7F32]/[0.02] rounded-full blur-[80px]" />
                  </div>

                  {/* Header */}
                  <div className="relative z-10 text-center pt-8 pb-2">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FFD700]/[0.08] border border-[#FFD700]/[0.12]">
                      <Crown className="w-4 h-4 text-[#FFD700]" />
                      <span className="text-[11px] font-mono font-bold text-[#FFD700]/80 uppercase tracking-[0.15em]">Top 3 Ranking</span>
                    </div>
                  </div>

                  {/* Podium visual */}
                  <div className="relative z-10 flex justify-center items-end gap-3 sm:gap-5 px-4 pt-4 pb-0">
                    {/* 2nd place */}
                    <div className="flex-1 max-w-[200px] animate-[fadeScale_0.5s_ease-out_0.1s_both]">
                      <div className="text-center mb-3">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-[#D4D4D8] to-[#A1A1AA] shadow-lg shadow-[#C0C0C0]/10 mb-2">
                          <span className="text-[15px] font-display font-black text-[#0A0A0B]">2</span>
                        </div>
                        <p className="text-[13px] font-semibold text-txt truncate px-2">{displayName(ranking[1])}</p>
                        <p className="text-[10px] text-txt-dim font-mono truncate px-2">{ranking[1].id_conta || 'Pendente'}</p>
                      </div>
                      <div className="relative">
                        <div className="h-28 rounded-t-2xl bg-gradient-to-t from-[#A1A1AA]/20 via-[#C0C0C0]/10 to-[#C0C0C0]/5 border border-b-0 border-[#C0C0C0]/15 flex flex-col items-center justify-center gap-1 px-3">
                          <span className="text-lg font-bold text-[#D4D4D8] font-display tabular-nums">{fmtBRL(ranking[1].soma_pagamentos)}</span>
                          <span className="text-[10px] text-txt-dim font-mono">{ranking[1].total_greens} greens</span>
                        </div>
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#C0C0C0]/50 to-transparent" />
                      </div>
                    </div>

                    {/* 1st place */}
                    <div className="flex-1 max-w-[220px] animate-[fadeScale_0.5s_ease-out_both]">
                      <div className="text-center mb-3">
                        <div className="relative inline-block">
                          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-[#FFD700] via-[#F5C842] to-[#DAA520] shadow-xl shadow-[#FFD700]/20">
                            <Crown className="w-7 h-7 text-[#0A0A0B]" />
                          </div>
                          <div className="absolute -inset-1 rounded-full border-2 border-[#FFD700]/20 animate-pulse" />
                        </div>
                        <p className="text-[15px] font-bold text-txt truncate px-2 mt-2">{displayName(ranking[0])}</p>
                        <p className="text-[10px] text-txt-dim font-mono truncate px-2">{ranking[0].id_conta || 'Pendente'}</p>
                      </div>
                      <div className="relative">
                        <div className="h-40 rounded-t-2xl bg-gradient-to-t from-[#DAA520]/20 via-[#FFD700]/10 to-[#FFD700]/5 border border-b-0 border-[#FFD700]/20 flex flex-col items-center justify-center gap-1 px-3">
                          <span className="text-2xl font-bold text-[#FFD700] font-display tabular-nums">{fmtBRL(ranking[0].soma_pagamentos)}</span>
                          <span className="text-[10px] text-txt-dim font-mono">{ranking[0].total_greens} greens</span>
                        </div>
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FFD700]/60 to-transparent" />
                        <div className="absolute -top-px left-1/2 -translate-x-1/2 w-12 h-[2px] bg-[#FFD700]/80 blur-sm" />
                      </div>
                    </div>

                    {/* 3rd place */}
                    <div className="flex-1 max-w-[180px] animate-[fadeScale_0.5s_ease-out_0.2s_both]">
                      <div className="text-center mb-3">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-[#CD7F32] to-[#A0522D] shadow-lg shadow-[#CD7F32]/10 mb-2">
                          <span className="text-[15px] font-display font-black text-[#0A0A0B]">3</span>
                        </div>
                        <p className="text-[13px] font-semibold text-txt truncate px-2">{displayName(ranking[2])}</p>
                        <p className="text-[10px] text-txt-dim font-mono truncate px-2">{ranking[2].id_conta || 'Pendente'}</p>
                      </div>
                      <div className="relative">
                        <div className="h-20 rounded-t-2xl bg-gradient-to-t from-[#A0522D]/20 via-[#CD7F32]/10 to-[#CD7F32]/5 border border-b-0 border-[#CD7F32]/15 flex flex-col items-center justify-center gap-1 px-3">
                          <span className="text-lg font-bold text-[#CD7F32] font-display tabular-nums">{fmtBRL(ranking[2].soma_pagamentos)}</span>
                          <span className="text-[10px] text-txt-dim font-mono">{ranking[2].total_greens} greens</span>
                        </div>
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#CD7F32]/50 to-transparent" />
                      </div>
                    </div>
                  </div>

                  {/* Base line */}
                  <div className="relative z-10 h-[1px] bg-gradient-to-r from-transparent via-surface-300/30 to-transparent" />
                </div>
              ) : (
                /* Less than 3: show available in podium style */
                <div className="card-dark relative overflow-hidden p-8">
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-[#FFD700]/[0.03] rounded-full blur-[80px]" />
                  </div>
                  <div className="relative z-10 text-center mb-6">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FFD700]/[0.08] border border-[#FFD700]/[0.12]">
                      <Crown className="w-4 h-4 text-[#FFD700]" />
                      <span className="text-[11px] font-mono font-bold text-[#FFD700]/80 uppercase tracking-[0.15em]">Ranking</span>
                    </div>
                  </div>
                  <div className="relative z-10 flex justify-center gap-6">
                    {ranking.slice(0, 3).map((entry, i) => {
                      const colors = ['#FFD700', '#C0C0C0', '#CD7F32'];
                      return (
                        <div key={entry.participante_id} className="text-center animate-[fadeScale_0.5s_ease-out_both]">
                          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3 shadow-lg" style={{ background: `linear-gradient(135deg, ${colors[i]}, ${colors[i]}99)`, boxShadow: `0 4px 20px ${colors[i]}20` }}>
                            {i === 0 ? <Crown className="w-6 h-6 text-[#0A0A0B]" /> : <span className="text-[17px] font-display font-black text-[#0A0A0B]">{i + 1}</span>}
                          </div>
                          <p className="text-sm font-semibold text-txt truncate max-w-[160px]">{displayName(entry)}</p>
                          <p className="text-[10px] text-txt-dim font-mono truncate max-w-[160px]">{entry.id_conta || 'Pendente'}</p>
                          <p className="text-lg font-bold font-display mt-2 tabular-nums" style={{ color: colors[i] }}>{fmtBRL(entry.soma_pagamentos)}</p>
                          <p className="text-[10px] text-txt-dim font-mono">{entry.total_greens} greens</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Tabela completa ── */}
              <div className="card-dark overflow-hidden">
                {/* Table header label */}
                <div className="px-5 py-3 border-b border-surface-300/10 flex items-center justify-between">
                  <span className="text-[11px] font-mono font-semibold text-txt-muted uppercase tracking-[0.12em]">Ranking Completo</span>
                  <span className="text-[11px] font-mono text-txt-dim">{ranking.length} participantes</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-surface-300/20">
                        <th className="px-5 py-3 text-[10px] font-mono font-semibold text-txt-muted uppercase tracking-widest w-16">#</th>
                        <th className="px-5 py-3 text-[10px] font-mono font-semibold text-txt-muted uppercase tracking-widest">Nome</th>
                        <th className="px-5 py-3 text-[10px] font-mono font-semibold text-txt-muted uppercase tracking-widest">ID Conta</th>
                        <th className="px-5 py-3 text-[10px] font-mono font-semibold text-txt-muted uppercase tracking-widest text-center">Greens</th>
                        <th className="px-5 py-3 text-[10px] font-mono font-semibold text-txt-muted uppercase tracking-widest text-right">Total Pagamentos</th>
                        <th className="px-5 py-3 text-[10px] font-mono font-semibold text-txt-muted uppercase tracking-widest text-right">Lucro Liquido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranking.map((entry, i) => {
                        const pos = i + 1;
                        const isTop3 = pos <= 3;
                        const medalColors: Record<number, string> = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' };
                        const rowHighlight: Record<number, string> = {
                          1: 'bg-[#FFD700]/[0.03] hover:bg-[#FFD700]/[0.06]',
                          2: 'bg-[#C0C0C0]/[0.02] hover:bg-[#C0C0C0]/[0.04]',
                          3: 'bg-[#CD7F32]/[0.02] hover:bg-[#CD7F32]/[0.04]',
                        };
                        const lucro = entry.soma_lucro_liquido;
                        return (
                          <tr
                            key={entry.participante_id}
                            className={cn(
                              'border-b border-surface-300/10 transition-colors duration-150 group',
                              rowHighlight[pos] || 'hover:bg-surface-200/20'
                            )}
                          >
                            <td className="px-5 py-3.5">
                              {isTop3 ? (
                                <div className="inline-flex items-center justify-center w-7 h-7 rounded-full" style={{ background: `linear-gradient(135deg, ${medalColors[pos]}, ${medalColors[pos]}88)` }}>
                                  <span className="text-[12px] font-display font-black text-[#0A0A0B]">{pos}</span>
                                </div>
                              ) : (
                                <span className="text-[13px] font-display font-bold text-txt-muted tabular-nums pl-1.5">{pos}</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={cn('text-[13px] font-medium transition-colors', isTop3 ? 'text-txt' : 'text-txt-secondary group-hover:text-txt')}>{displayName(entry)}</span>
                            </td>
                            <td className="px-5 py-3.5">
                              {entry.id_conta ? (
                                <span className="text-[11px] text-txt-secondary font-mono">{entry.id_conta}</span>
                              ) : (
                                <span className="text-[11px] text-amber-400/70 font-mono">Pendente</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              <span className="inline-flex items-center justify-center min-w-[28px] px-1.5 py-0.5 rounded-md bg-primary-bg text-[12px] font-semibold text-primary-light tabular-nums">{entry.total_greens}</span>
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <span className="text-[13px] font-semibold text-txt font-mono tabular-nums">{fmtBRL(entry.soma_pagamentos)}</span>
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <span className={cn('text-[13px] font-semibold font-mono tabular-nums', lucro >= 0 ? 'text-primary-light' : 'text-rose-400')}>
                                {fmtBRL(lucro)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ─── Aba Participantes ──────────────────────────────── */}
      {activeTab === 'participantes' && (
        <>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={partTorneioId}
              onChange={e => setPartTorneioId(e.target.value)}
              className="input-dark min-w-[220px]"
            >
              {partTorneios.map(t => (
                <option key={t.id} value={t.id}>
                  {t.nome} {t.status === 'ativo' ? '(Ativo)' : t.status === 'pausado' ? '(Pausado)' : ''}
                </option>
              ))}
            </select>
            <button
              onClick={() => fetchParticipantes()}
              disabled={partLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium text-txt-secondary hover:text-txt hover:bg-surface-200/40 border border-surface-300/20 transition-colors"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', partLoading && 'animate-spin')} />
              Atualizar
            </button>
          </div>

          {/* Stats strip */}
          <div className="card-dark relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-1/4 w-[300px] h-[100px] bg-blue-600/[0.03] rounded-full blur-[60px]" />
              <div className="absolute top-0 right-1/4 w-[200px] h-[100px] bg-amber-500/[0.03] rounded-full blur-[60px]" />
            </div>
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-surface-300/10">
              {/* Total */}
              <div className="p-5 flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600/15 to-blue-600/5 border border-blue-600/10 flex items-center justify-center shrink-0 group-hover:border-blue-600/20 transition-colors">
                  <Users className="w-5 h-5 text-blue-400" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-[10px] font-mono font-semibold text-txt-muted uppercase tracking-[0.12em] mb-0.5">Total Participantes</p>
                  <p className="text-2xl font-bold text-txt font-display tabular-nums">
                    {partLoading ? <span className="inline-block h-7 w-10 bg-surface-200/40 rounded animate-pulse" /> : partResumo.total}
                  </p>
                </div>
              </div>
              {/* Com ID */}
              <div className="p-5 flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-2xl bg-primary-bg border border-primary-bg flex items-center justify-center shrink-0 group-hover:border-primary-bg transition-colors">
                  <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
                    <circle cx="10" cy="10" r="8" stroke="var(--color-primary-light)" strokeWidth="1.5" opacity="0.5" />
                    <path d="M6.5 10.5l2 2 5-5" stroke="var(--color-primary-light)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-mono font-semibold text-txt-muted uppercase tracking-[0.12em] mb-0.5">Com ID Conta</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-primary-light font-display tabular-nums">
                      {partLoading ? <span className="inline-block h-7 w-10 bg-surface-200/40 rounded animate-pulse" /> : partResumo.comId}
                    </p>
                    {!partLoading && partResumo.total > 0 && (
                      <span className="text-[11px] text-txt-dim font-mono">{Math.round((partResumo.comId / partResumo.total) * 100)}%</span>
                    )}
                  </div>
                </div>
              </div>
              {/* Pendente */}
              <div className="p-5 flex items-center gap-4 group">
                <div className={cn(
                  'w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 transition-colors',
                  partResumo.semId > 0
                    ? 'bg-gradient-to-br from-amber-500/15 to-amber-500/5 border-amber-500/10 group-hover:border-amber-500/20'
                    : 'bg-gradient-to-br from-surface-200/20 to-surface-200/5 border-surface-300/10'
                )}>
                  <AlertTriangle className={cn('w-5 h-5', partResumo.semId > 0 ? 'text-amber-400' : 'text-txt-dim')} strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-[10px] font-mono font-semibold text-txt-muted uppercase tracking-[0.12em] mb-0.5">ID Pendente</p>
                  <div className="flex items-baseline gap-2">
                    <p className={cn('text-2xl font-bold font-display tabular-nums', partResumo.semId > 0 ? 'text-amber-400' : 'text-txt')}>
                      {partLoading ? <span className="inline-block h-7 w-10 bg-surface-200/40 rounded animate-pulse" /> : partResumo.semId}
                    </p>
                    {!partLoading && partResumo.semId > 0 && partResumo.total > 0 && (
                      <span className="text-[11px] text-amber-400/50 font-mono">{Math.round((partResumo.semId / partResumo.total) * 100)}%</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-muted group-focus-within:text-[#004AFF] transition-colors" />
            <input
              type="text"
              value={partBusca}
              onChange={e => setPartBusca(e.target.value)}
              placeholder="Buscar por nome, telefone ou ID conta..."
              className="input-dark w-full pl-11 text-[13px]"
            />
            {partBusca && (
              <button
                onClick={() => setPartBusca('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-txt-muted hover:text-txt rounded-md hover:bg-surface-200/40 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Table */}
          {partLoading && participantes.length === 0 ? (
            <div className="card-dark overflow-hidden">
              <div className="px-5 py-3 border-b border-surface-300/10">
                <div className="h-3 w-32 bg-surface-200/40 rounded animate-pulse" />
              </div>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-4 px-5 py-4 border-b border-surface-300/10">
                  <div className="h-8 w-8 rounded-full bg-surface-200/30 animate-pulse shrink-0" />
                  {Array.from({ length: 5 }).map((_, j) => (
                    <div key={j} className="h-4 flex-1 bg-surface-200/40 rounded animate-pulse" />
                  ))}
                </div>
              ))}
            </div>
          ) : filteredParticipantes.length === 0 ? (
            <div className="card-dark p-16 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-surface-200/5 to-transparent pointer-events-none" />
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-surface-200/20 flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-txt-muted/30" />
                </div>
                <p className="text-sm text-txt-muted font-display">
                  {participantes.length === 0 ? 'Nenhum participante neste torneio' : 'Nenhum resultado encontrado'}
                </p>
                {partBusca && (
                  <button onClick={() => setPartBusca('')} className="mt-3 text-[12px] text-[#004AFF] hover:text-[#004AFF]/80 font-medium transition-colors">
                    Limpar busca
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="card-dark !overflow-visible relative" ref={partDropdownRef}>
              {/* Table header */}
              <div className="px-5 py-3 border-b border-surface-300/10 flex items-center justify-between">
                <span className="text-[11px] font-mono font-semibold text-txt-muted uppercase tracking-[0.12em]">
                  {filteredParticipantes.length !== participantes.length
                    ? `${filteredParticipantes.length} de ${participantes.length} participantes`
                    : `${participantes.length} participantes`
                  }
                </span>
              </div>

              <div className="overflow-x-auto overflow-y-visible">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-surface-300/20">
                      <th onClick={() => handlePartSort('participante_nome')} className="px-5 py-3 text-[10px] font-mono font-semibold text-txt-muted uppercase tracking-widest cursor-pointer hover:text-txt-secondary transition-colors select-none">
                        Nome <SortIcon col="participante_nome" />
                      </th>
                      <th className="px-5 py-3 text-[10px] font-mono font-semibold text-txt-muted uppercase tracking-widest">Telefone</th>
                      <th onClick={() => handlePartSort('id_conta')} className="px-5 py-3 text-[10px] font-mono font-semibold text-txt-muted uppercase tracking-widest cursor-pointer hover:text-txt-secondary transition-colors select-none">
                        ID Conta <SortIcon col="id_conta" />
                      </th>
                      <th onClick={() => handlePartSort('total_greens')} className="px-5 py-3 text-[10px] font-mono font-semibold text-txt-muted uppercase tracking-widest text-center cursor-pointer hover:text-txt-secondary transition-colors select-none">
                        Greens <SortIcon col="total_greens" />
                      </th>
                      <th onClick={() => handlePartSort('soma_pagamentos')} className="px-5 py-3 text-[10px] font-mono font-semibold text-txt-muted uppercase tracking-widest text-right cursor-pointer hover:text-txt-secondary transition-colors select-none">
                        Total Pag. <SortIcon col="soma_pagamentos" />
                      </th>
                      <th onClick={() => handlePartSort('ultimo_green')} className="px-5 py-3 text-[10px] font-mono font-semibold text-txt-muted uppercase tracking-widest text-right cursor-pointer hover:text-txt-secondary transition-colors select-none">
                        Atividade <SortIcon col="ultimo_green" />
                      </th>
                      <th className="px-5 py-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParticipantes.map((p, idx) => {
                      const isExpanded = expandedPart === p.participante_id;
                      const pendingId = !p.id_conta || !p.id_conta.trim();
                      return (
                        <React.Fragment key={p.participante_id}>
                          <tr
                            onClick={() => handleExpandParticipante(p.participante_id)}
                            className={cn(
                              'border-b border-surface-300/10 transition-all duration-150 group cursor-pointer',
                              isExpanded
                                ? 'bg-[#004AFF]/[0.04] hover:bg-[#004AFF]/[0.06]'
                                : pendingId
                                  ? 'hover:bg-amber-500/[0.03]'
                                  : 'hover:bg-surface-200/20'
                            )}
                          >
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                {/* Avatar */}
                                <div className={cn(
                                  'w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold font-display border transition-colors',
                                  pendingId
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/15'
                                    : 'bg-[#004AFF]/10 text-[#004AFF] border-[#004AFF]/15'
                                )}>
                                  {(p.participante_nome || fmtPhone(p.telefone_whatsapp)).charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <span className="text-[13px] font-medium text-txt group-hover:text-[#004AFF] transition-colors block truncate">
                                    {p.participante_nome || fmtPhone(p.telefone_whatsapp)}
                                  </span>
                                  {p.participante_nome && (
                                    <span className="text-[10px] text-txt-dim font-mono block">{fmtPhone(p.telefone_whatsapp)}</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-[11px] text-txt-secondary font-mono">{!p.participante_nome ? '' : fmtPhone(p.telefone_whatsapp)}</td>
                            <td className="px-5 py-3.5">
                              {pendingId ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/15">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                  Pendente
                                </span>
                              ) : (
                                <span className="text-[11px] text-txt-secondary font-mono">{p.id_conta}</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              <span className="inline-flex items-center justify-center min-w-[28px] px-1.5 py-0.5 rounded-md bg-primary-bg text-[12px] font-semibold text-primary-light tabular-nums">
                                {p.total_greens}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <span className="text-[13px] font-semibold text-txt font-mono tabular-nums">{fmtBRL(p.soma_pagamentos)}</span>
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <span className="text-[11px] text-txt-secondary font-mono">{p.ultimo_green ? fmtRelative(p.ultimo_green) : '—'}</span>
                            </td>
                            <td className="px-5 py-3.5 text-right relative" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => setPartDropdown(partDropdown === p.participante_id ? null : p.participante_id)}
                                className="p-1.5 text-txt-muted hover:text-txt hover:bg-surface-200/40 rounded-lg transition-colors"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                              {partDropdown === p.participante_id && (
                                <div className={cn(
                                  'absolute right-0 z-50 w-48 py-1.5 rounded-xl border border-surface-300/20 bg-surface-50 shadow-2xl animate-slide-up',
                                  idx >= filteredParticipantes.length - 2 ? 'bottom-full mb-2' : 'top-full mt-1'
                                )}>
                                  <button
                                    onClick={() => { setPartDropdown(null); handleExpandParticipante(p.participante_id); }}
                                    className="flex items-center gap-2.5 w-full px-4 py-2 text-[13px] text-txt-secondary hover:bg-surface-200/40 hover:text-txt transition-colors"
                                  >
                                    <BarChart3 className="w-3.5 h-3.5" /> Ver greens
                                  </button>
                                  <button
                                    onClick={() => { setPartDropdown(null); setEditIdContaVal(p.id_conta || ''); setEditIdContaModal(p); }}
                                    className="flex items-center gap-2.5 w-full px-4 py-2 text-[13px] text-txt-secondary hover:bg-surface-200/40 hover:text-txt transition-colors"
                                  >
                                    <Pencil className="w-3.5 h-3.5" /> Editar ID Conta
                                  </button>
                                  <div className="h-px bg-surface-300/15 my-1" />
                                  <button
                                    onClick={() => { setPartDropdown(null); setRemovePartConfirm(p); }}
                                    className="flex items-center gap-2.5 w-full px-4 py-2 text-[13px] text-rose-400 hover:bg-surface-200/40 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Remover do torneio
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>

                          {/* Expanded greens */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={7} className="p-0">
                                <div className="bg-[#004AFF]/[0.02] border-b border-surface-300/10 animate-slide-up">
                                  {/* Expanded header */}
                                  <div className="px-6 py-3 border-b border-surface-300/8 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-mono font-semibold text-[#004AFF]/70 uppercase tracking-[0.12em]">
                                        Historico de Greens
                                      </span>
                                      {!expandedLoading && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-txt-dim bg-surface-200/30">
                                          {expandedGreens.length}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {expandedLoading ? (
                                    <div className="flex items-center gap-2 py-6 justify-center">
                                      <Loader2 className="w-4 h-4 animate-spin text-[#004AFF]" />
                                      <span className="text-[12px] text-txt-muted font-mono">Carregando...</span>
                                    </div>
                                  ) : expandedGreens.length === 0 ? (
                                    <p className="text-[12px] text-txt-muted text-center py-6 font-mono">Nenhum green encontrado</p>
                                  ) : (
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-left">
                                        <thead>
                                          <tr className="border-b border-surface-300/8">
                                            <th className="px-6 py-2 text-[9px] font-mono font-semibold text-txt-muted uppercase tracking-widest">Jogo</th>
                                            <th className="px-4 py-2 text-[9px] font-mono font-semibold text-txt-muted uppercase tracking-widest">Data/Hora</th>
                                            <th className="px-4 py-2 text-[9px] font-mono font-semibold text-txt-muted uppercase tracking-widest text-right">Aposta</th>
                                            <th className="px-4 py-2 text-[9px] font-mono font-semibold text-txt-muted uppercase tracking-widest text-right">Green</th>
                                            <th className="px-4 py-2 text-[9px] font-mono font-semibold text-txt-muted uppercase tracking-widest text-right">Lucro</th>
                                            <th className="px-4 py-2 text-[9px] font-mono font-semibold text-txt-muted uppercase tracking-widest">ID Aposta</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {expandedGreens.map(g => {
                                            const lucro = Number(g.valor_green) - Number(g.valor_apostado);
                                            return (
                                              <tr key={g.id} className="border-b border-surface-300/5 hover:bg-surface-200/10 transition-colors">
                                                <td className="px-6 py-2.5 text-[11px] text-txt font-medium">{g.jogo}</td>
                                                <td className="px-4 py-2.5 text-[10px] text-txt-secondary font-mono">{fmtDate(g.data_hora_aposta)}</td>
                                                <td className="px-4 py-2.5 text-[11px] text-txt-secondary font-mono text-right tabular-nums">{fmtBRL(Number(g.valor_apostado))}</td>
                                                <td className="px-4 py-2.5 text-[11px] text-primary-light font-mono font-semibold text-right tabular-nums">{fmtBRL(Number(g.valor_green))}</td>
                                                <td className={cn('px-4 py-2.5 text-[11px] font-mono font-semibold text-right tabular-nums', lucro >= 0 ? 'text-primary-light' : 'text-rose-400')}>
                                                  {fmtBRL(lucro)}
                                                </td>
                                                <td className="px-4 py-2.5 text-[10px] text-txt-dim font-mono truncate max-w-[120px]">{g.id_aposta}</td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
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
            </div>
          )}
        </>
      )}

      {/* ─── Aba Instância ──────────────────────────────────── */}
      {activeTab === 'instancia' && (
        <>
          {wppLoading ? (
            <div className="space-y-4">
              <div className="card-dark p-4 animate-pulse">
                <div className="h-4 w-48 bg-surface-200/40 rounded" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {[1, 2].map((i) => (
                  <div key={i} className="card-dark p-5 animate-pulse">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-surface-200/50 rounded-lg" />
                        <div className="h-4 w-32 bg-surface-200/50 rounded" />
                      </div>
                      <div className="w-11 h-6 bg-surface-200/30 rounded-full" />
                    </div>
                    <div className="h-3 w-48 bg-surface-200/30 rounded mb-2" />
                    <div className="h-3 w-36 bg-surface-200/20 rounded" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Status summary */}
              <div className="card-dark p-4 mb-6 flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary-bg">
                    <Wifi className="w-4 h-4 text-primary-light" />
                  </div>
                  <p className="text-[14px] font-semibold text-txt">
                    <span className="text-primary-light">{conectadosTorneio}</span>
                    <span className="text-txt-muted text-[12px] ml-1">conectado{conectadosTorneio !== 1 ? 's' : ''}</span>
                  </p>
                </div>
                <div className="w-px h-6 bg-surface-300/20" />
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-red-500/10">
                    <WifiOff className="w-4 h-4 text-red-400" />
                  </div>
                  <p className="text-[14px] font-semibold text-txt">
                    <span className="text-red-400">{desconectadosTorneio}</span>
                    <span className="text-txt-muted text-[12px] ml-1">desconectado{desconectadosTorneio !== 1 ? 's' : ''}</span>
                  </p>
                </div>
                <div className="w-px h-6 bg-surface-300/20" />
                <p className="text-[13px] text-txt-muted">
                  <span className="text-txt-secondary font-semibold">{instanciasTorneio.length}</span> instância{instanciasTorneio.length !== 1 ? 's' : ''} no total
                </p>
              </div>

              <p className="text-sm text-white mb-5">
                Instância dedicada ao torneio para receber prints e mensagens dos participantes via WhatsApp.
              </p>

              {/* Lista */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                {instanciasTorneio.map((numero, idx) => (
                  <InstanciaCard
                    key={numero.id}
                    numero={numero}
                    isFirst={idx === 0}
                    isLast={idx === instanciasTorneio.length - 1}
                    onToggleAtivo={handleTorneioToggleAtivo}
                    onEdit={(n) => setTorneioEditModal({ open: true, numero: n })}
                    onDelete={(n) => setTorneioDeleteModal(n)}
                    onMoveUp={handleTorneioMoveUp}
                    onMoveDown={handleTorneioMoveDown}
                    onReconectar={handleTorneioReconectar}
                  />
                ))}
              </div>

              <button
                onClick={() => setTorneioInstanciaModal(true)}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed border-white/[0.12] text-white/50 hover:text-primary-light hover:border-primary-bg hover:bg-primary-bg transition-all duration-200 text-[13px] font-medium"
              >
                <Plus className="w-4 h-4" />
                Nova Instância Torneio
              </button>
            </>
          )}
        </>
      )}

      {/* Modals: Instância Torneio */}
      {torneioInstanciaModal && (
        <NovaInstanciaModal
          onCriarInstancia={handleTorneioCriarInstancia}
          onClose={() => setTorneioInstanciaModal(false)}
        />
      )}
      {torneioEditModal.open && torneioEditModal.numero && (
        <NumeroFormModal
          numero={torneioEditModal.numero}
          proximaOrdem={torneioEditModal.numero.ordem}
          onSave={handleTorneioSaveNumero}
          onClose={() => setTorneioEditModal({ open: false, numero: null })}
        />
      )}
      {torneioDeleteModal && (
        <ConfirmDeleteNumeroModal
          nome={torneioDeleteModal.nome}
          onConfirm={handleTorneioDeleteNumero}
          onClose={() => setTorneioDeleteModal(null)}
        />
      )}

      {/* Modals */}
      {modalOpen && (
        <TorneioModal
          torneio={editando}
          onClose={() => { setModalOpen(false); setEditando(null); }}
          onSave={handleSave}
          saving={saving}
        />
      )}

      {confirmAction && (
        <ConfirmModal
          title={confirmMessages[confirmAction.type].title}
          message={confirmMessages[confirmAction.type].message}
          confirmLabel={confirmMessages[confirmAction.type].label}
          confirmColor={confirmMessages[confirmAction.type].color}
          onConfirm={handleConfirmAction}
          onClose={() => setConfirmAction(null)}
          loading={confirmLoading}
        />
      )}

      {/* Edit ID Conta Modal */}
      {editIdContaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEditIdContaModal(null)} />
          <div className="relative card-dark-elevated w-full max-w-sm animate-slide-up">
            <div className="flex items-center justify-between p-5 border-b border-surface-300/20">
              <h2 className="text-[15px] font-semibold text-txt font-display">Editar ID Conta</h2>
              <button onClick={() => setEditIdContaModal(null)} className="p-1.5 text-txt-muted hover:text-txt hover:bg-surface-200/40 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-[13px] text-txt-secondary">
                Participante: <span className="text-txt font-medium">{displayName(editIdContaModal)}</span>
              </p>
              <div>
                <label className="block text-[10px] font-mono font-semibold text-txt-muted mb-2 uppercase tracking-widest">ID da Conta</label>
                <input
                  type="text"
                  value={editIdContaVal}
                  onChange={e => setEditIdContaVal(e.target.value)}
                  placeholder="Ex: 123456789"
                  className="input-dark w-full"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setEditIdContaModal(null)} className="px-4 py-2 text-[13px] font-medium text-txt-muted hover:text-txt hover:bg-surface-200/40 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={handleEditIdConta}
                  disabled={editIdContaSaving}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-semibold text-white bg-[#004AFF] hover:bg-[#004AFF]/80 transition-colors disabled:opacity-50"
                >
                  {editIdContaSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Remove participante confirm */}
      {removePartConfirm && (
        <ConfirmModal
          title="Remover Participante"
          message={`Deseja remover ${displayName(removePartConfirm)} deste torneio? Todos os greens dele neste torneio serao excluidos.`}
          confirmLabel="Remover"
          confirmColor="bg-rose-500 hover:bg-rose-600"
          onConfirm={handleRemoveParticipante}
          onClose={() => setRemovePartConfirm(null)}
          loading={removePartLoading}
        />
      )}

      {toast && <Toast toast={toast} onClose={hideToast} />}
    </div>
  );
};
