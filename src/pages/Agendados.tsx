import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { CalendarX2, Clock, X, Loader2, Save, AlertTriangle, Calendar, ChevronLeft, ChevronRight, ArrowLeftRight, Wifi, WifiOff, Send, MessagesSquare, UsersRound, Undo2, Search, Trash2 } from 'lucide-react';
import { EnviosNav } from '../components/envios/EnviosNav';
import { Toast } from '../components/Toast';
import { AgendamentoCard } from '../components/agendamentos/AgendamentoCard';
import { AgendamentoDetalhesModal } from '../components/agendamentos/AgendamentoDetalhesModal';
import { ConfirmCancelAgendamentoModal } from '../components/agendamentos/ConfirmCancelAgendamentoModal';
import { ConfirmarApagarEnviosModal } from '../components/agendamentos/ConfirmarApagarEnviosModal';
import { NovaMensagemModal } from '../components/agendamentos/NovaMensagemModal';
import { useAgendamentos } from '../hooks/useAgendamentos';
import { useGerarCopy } from '../hooks/useGerarCopy';
import { useToast } from '../hooks/useToast';
import { useAuthStore } from '../stores/authStore';
import { WEBHOOKS, fetchWithTimeout } from '../config/webhooks';
import { cn } from '../utils/cn';
import type { AgendamentoGrupo, AgendamentoMensagem, InstanciaDisparadora } from '../hooks/useAgendamentos';

type FiltroStatus = 'todos' | 'pendente' | 'enviado' | 'cancelado' | 'erro' | 'recorrente';

const FILTROS: { key: FiltroStatus; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'pendente', label: 'Pendentes' },
  { key: 'recorrente', label: 'Recorrentes' },
  { key: 'enviado', label: 'Enviados' },
  { key: 'erro', label: 'Erro' },
  { key: 'cancelado', label: 'Cancelados' },
];

const SkeletonCard: React.FC = () => (
  <div className="card-dark rounded-xl p-5 border border-surface-300/10 animate-pulse">
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 bg-surface-200/40 rounded-xl shrink-0" />
      <div className="flex-1">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="h-4 w-48 bg-surface-200/30 rounded" />
          <div className="h-5 w-16 bg-surface-200/20 rounded-lg" />
        </div>
        <div className="h-3 w-64 bg-surface-200/20 rounded" />
      </div>
    </div>
  </div>
);

// Time picker para reagendamento — todos os 60 minutos selecionáveis em coluna scrollable
const ReagendarTimePicker: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  const [hStr, mStr] = value ? value.split(':') : ['', ''];
  const curH = hStr !== '' ? parseInt(hStr, 10) : -1;
  const curM = mStr !== '' ? parseInt(mStr, 10) : -1;
  const setH = (h: number) => onChange(`${String(h).padStart(2, '0')}:${curM >= 0 ? String(curM).padStart(2, '0') : '00'}`);
  const setM = (m: number) => onChange(`${curH >= 0 ? String(curH).padStart(2, '0') : '00'}:${String(m).padStart(2, '0')}`);

  const hoursRef = useRef<HTMLDivElement>(null);
  const minutesRef = useRef<HTMLDivElement>(null);

  // Scroll para a opção selecionada ao montar
  useEffect(() => {
    const scrollToActive = (container: HTMLDivElement | null) => {
      if (!container) return;
      const active = container.querySelector<HTMLButtonElement>('button[data-active="true"]');
      if (active) {
        const cTop = container.getBoundingClientRect().top;
        const aTop = active.getBoundingClientRect().top;
        container.scrollTop += aTop - cTop - container.clientHeight / 2 + active.clientHeight / 2;
      }
    };
    scrollToActive(hoursRef.current);
    scrollToActive(minutesRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      {/* Display selecionado */}
      <div className="flex items-center justify-center gap-1 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <span className="text-[22px] font-mono font-bold tabular-nums" style={{ color: curH >= 0 ? 'var(--color-primary-light)' : 'rgba(255,255,255,0.2)' }}>
          {curH >= 0 ? String(curH).padStart(2, '0') : '--'}
        </span>
        <span className="text-[18px] font-mono font-bold" style={{ color: 'rgba(255,255,255,0.25)' }}>:</span>
        <span className="text-[22px] font-mono font-bold tabular-nums" style={{ color: curM >= 0 ? 'var(--color-primary-light)' : 'rgba(255,255,255,0.2)' }}>
          {curM >= 0 ? String(curM).padStart(2, '0') : '--'}
        </span>
      </div>
      <div className="grid grid-cols-2" style={{ borderTop: 'none' }}>
        {/* Hora */}
        <div className="p-2" style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-[9px] uppercase tracking-widest text-center mb-2 font-semibold" style={{ color: 'rgba(255,255,255,0.2)' }}>Hora</p>
          <div
            ref={hoursRef}
            className="overflow-y-auto pr-1"
            style={{ maxHeight: '200px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
          >
            <div className="grid grid-cols-3 gap-1">
              {Array.from({ length: 24 }).map((_, h) => {
                const active = curH === h;
                return (
                  <button
                    key={h}
                    type="button"
                    data-active={active}
                    onClick={() => setH(h)}
                    className="rounded-lg flex items-center justify-center text-[11px] font-mono font-medium transition-colors duration-100"
                    style={{
                      height: '30px',
                      background: active ? 'rgba(var(--color-primary-rgb),0.2)' : 'rgba(255,255,255,0.03)',
                      border: active ? '1px solid rgba(var(--color-primary-rgb),0.4)' : '1px solid transparent',
                      color: active ? 'var(--color-primary-light)' : 'rgba(255,255,255,0.6)',
                      boxShadow: active ? '0 0 8px rgba(var(--color-primary-rgb),0.15)' : 'none',
                    }}
                    onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; } }}
                    onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; } }}
                  >
                    {String(h).padStart(2, '0')}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        {/* Minuto — todos 60 */}
        <div className="p-2">
          <p className="text-[9px] uppercase tracking-widest text-center mb-2 font-semibold" style={{ color: 'rgba(255,255,255,0.2)' }}>Minuto</p>
          <div
            ref={minutesRef}
            className="overflow-y-auto pr-1"
            style={{ maxHeight: '200px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
          >
            <div className="grid grid-cols-3 gap-1">
              {Array.from({ length: 60 }).map((_, m) => {
                const active = curM === m;
                return (
                  <button
                    key={m}
                    type="button"
                    data-active={active}
                    onClick={() => setM(m)}
                    className="rounded-lg flex items-center justify-center text-[11px] font-mono font-medium transition-colors duration-100"
                    style={{
                      height: '30px',
                      background: active ? 'rgba(var(--color-primary-rgb),0.2)' : 'rgba(255,255,255,0.03)',
                      border: active ? '1px solid rgba(var(--color-primary-rgb),0.4)' : '1px solid transparent',
                      color: active ? 'var(--color-primary-light)' : 'rgba(255,255,255,0.6)',
                      boxShadow: active ? '0 0 8px rgba(var(--color-primary-rgb),0.15)' : 'none',
                    }}
                    onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; } }}
                    onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; } }}
                  >
                    {String(m).padStart(2, '0')}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Agendados: React.FC = () => {
  const navigate = useNavigate();
  const { toast, showToast, hideToast } = useToast();

  const {
    agendamentos,
    loadingAgendamentos,
    fetchAgendamentos,
    cancelarAgendamento,
    duplicarAgendamento,
    editarMensagem,
    reagendarAgendamento,
    trocarInstanciaAgendamento,
    atualizarGruposAgendamento,
    instancias,
    fetchInstancias,
  } = useAgendamentos();

  const { adicionarExemplo } = useGerarCopy();

  const [filtro, setFiltro] = useState<FiltroStatus>('todos');
  const [filtroData, setFiltroData] = useState<string | null>(null); // 'YYYY-MM-DD' ou null
  const [filtroHora, setFiltroHora] = useState<number | null>(null); // 0-23 ou null
  const [filtroCanal, setFiltroCanal] = useState<'whatsapp' | 'telegram' | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [horaOpen, setHoraOpen] = useState(false);
  const [canalOpen, setCanalOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const calRef = useRef<HTMLDivElement>(null);
  const horaRef = useRef<HTMLDivElement>(null);
  const canalRef = useRef<HTMLDivElement>(null);
  const calSheetRef = useRef<HTMLDivElement>(null);
  const horaSheetRef = useRef<HTMLDivElement>(null);
  const canalSheetRef = useRef<HTMLDivElement>(null);

  // Fechar popovers ao clicar fora (considera tambem o conteudo do bottom sheet renderizado via portal)
  useEffect(() => {
    if (!calendarOpen && !horaOpen && !canalOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const inCal = (calRef.current?.contains(target)) || (calSheetRef.current?.contains(target));
      const inHora = (horaRef.current?.contains(target)) || (horaSheetRef.current?.contains(target));
      const inCanal = (canalRef.current?.contains(target)) || (canalSheetRef.current?.contains(target));
      if (calendarOpen && !inCal) setCalendarOpen(false);
      if (horaOpen && !inHora) setHoraOpen(false);
      if (canalOpen && !inCanal) setCanalOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [calendarOpen, horaOpen, canalOpen]);

  // Filtrar agendamentos por data/hora/canal selecionados
  const agendamentosFiltrados = useMemo(() => {
    return agendamentos.filter((ag) => {
      const dataAg = new Date(ag.data_envio);
      if (filtroData) {
        const [y, m, d] = filtroData.split('-').map(Number);
        if (dataAg.getFullYear() !== y || dataAg.getMonth() !== (m - 1) || dataAg.getDate() !== d) return false;
      }
      if (filtroHora !== null && dataAg.getHours() !== filtroHora) return false;
      if (filtroCanal && ag.canal !== filtroCanal) return false;
      return true;
    });
  }, [agendamentos, filtroData, filtroHora, filtroCanal]);

  // Horas que tem agendamentos (para highlight no popover)
  const horasComAgendamento = useMemo(() => {
    const set = new Set<number>();
    agendamentos.forEach((ag) => {
      const d = new Date(ag.data_envio);
      if (filtroData) {
        const [y, m, dy] = filtroData.split('-').map(Number);
        if (d.getFullYear() !== y || d.getMonth() !== (m - 1) || d.getDate() !== dy) return;
      }
      if (filtroCanal && ag.canal !== filtroCanal) return;
      set.add(d.getHours());
    });
    return set;
  }, [agendamentos, filtroData, filtroCanal]);

  const [detalhesModal, setDetalhesModal] = useState<AgendamentoGrupo | null>(null);
  const [cancelarModal, setCancelarModal] = useState<AgendamentoGrupo | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [editarModal, setEditarModal] = useState<AgendamentoMensagem | null>(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  // Reagendar state
  const [reagendarModal, setReagendarModal] = useState<AgendamentoGrupo | null>(null);
  const [reagendarData, setReagendarData] = useState('');
  const [reagendarHora, setReagendarHora] = useState('');
  const [salvandoReagendar, setSalvandoReagendar] = useState(false);
  const [reagCalOpen, setReagCalOpen] = useState(false);
  const [reagCalMonth, setReagCalMonth] = useState(new Date().getMonth());
  const [reagCalYear, setReagCalYear] = useState(new Date().getFullYear());
  const [trocaInstanciaModal, setTrocaInstanciaModal] = useState<AgendamentoGrupo | null>(null);
  const [novaInstancia, setNovaInstancia] = useState('');
  const [salvandoTrocaInstancia, setSalvandoTrocaInstancia] = useState(false);

  // Alterar grupos do agendamento
  const [alterarGruposModal, setAlterarGruposModal] = useState<AgendamentoGrupo | null>(null);
  const [gruposEditaveis, setGruposEditaveis] = useState<{ grupo_id: string; grupo_nome: string }[]>([]);
  const [gruposRemovidos, setGruposRemovidos] = useState<{ grupo_id: string; grupo_nome: string }[]>([]);
  const [buscaGrupo, setBuscaGrupo] = useState('');
  const [salvandoGrupos, setSalvandoGrupos] = useState(false);

  // Apagar mensagens enviadas (via UAZAPI /message/delete + Telegram deleteMessage)
  const [apagarEnviosModal, setApagarEnviosModal] = useState<AgendamentoGrupo | null>(null);
  const [apagandoEnvios, setApagandoEnvios] = useState(false);

  const handleConfirmarApagarEnvios = useCallback(async () => {
    if (!apagarEnviosModal) return;
    const expertId = useAuthStore.getState().getActiveExpertId();
    if (!expertId) {
      showToast('error', 'Expert nao identificado');
      return;
    }
    setApagandoEnvios(true);
    try {
      const res = await fetchWithTimeout(WEBHOOKS.DELETAR_AGENDAMENTO_ENVIADO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agendamento_id: apagarEnviosModal.id,
          expert_id: expertId,
        }),
      }, 300000);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json() as { success: boolean; total: number; deletadas: number; falhas?: Array<{ grupo_nome?: string; erro?: string }>; motivo?: string };

      if (data.success === false) {
        showToast('error', data.motivo || 'Nenhuma mensagem foi apagada');
      } else if (data.deletadas === data.total) {
        showToast('success', `${data.deletadas} mensagem${data.deletadas !== 1 ? 's' : ''} apagada${data.deletadas !== 1 ? 's' : ''} com sucesso`);
      } else {
        showToast('success', `${data.deletadas}/${data.total} apagadas — ${data.falhas?.length ?? 0} falharam`);
      }
      setApagarEnviosModal(null);
      fetchAgendamentos(filtro);
    } catch (err: unknown) {
      console.error('[Apagar envios] Erro:', err);
      showToast('error', 'Erro ao apagar mensagens. Tente novamente.');
    } finally {
      setApagandoEnvios(false);
    }
  }, [apagarEnviosModal, fetchAgendamentos, filtro, showToast]);

  useEffect(() => {
    fetchAgendamentos(filtro);
  }, [fetchAgendamentos, filtro]);

  useEffect(() => {
    fetchInstancias();
  }, [fetchInstancias]);

  const handleCancelar = async () => {
    if (!cancelarModal) return;
    try {
      setCancelando(true);
      await cancelarAgendamento(cancelarModal.id);
      showToast('success', 'Agendamento cancelado');
      setCancelarModal(null);
      fetchAgendamentos(filtro);
    } catch {
      showToast('error', 'Erro ao cancelar agendamento');
    } finally {
      setCancelando(false);
    }
  };

  const handleDuplicar = async (agendamento: AgendamentoGrupo) => {
    const duplicado = await duplicarAgendamento(agendamento.id);
    if (duplicado) {
      showToast('success', 'Agendamento duplicado! Edite a data e agende.');
      navigate('/envios/agendamentos');
    } else {
      showToast('error', 'Erro ao duplicar agendamento');
    }
  };

  const handleEditar = (agendamento: AgendamentoGrupo) => {
    if (agendamento.mensagem) {
      setEditarModal(agendamento.mensagem);
    }
  };

  const handleSalvarEdicao = async (dados: { nome: string; tipo: string; conteudo?: string; file?: File; mencionar_todos?: boolean }) => {
    if (!editarModal) return;
    try {
      setSalvandoEdicao(true);
      await editarMensagem(editarModal.id, {
        nome: dados.nome,
        conteudo: dados.conteudo ?? null,
        mencionar_todos: dados.mencionar_todos ?? false,
      });
      showToast('success', 'Mensagem atualizada!');
      setEditarModal(null);
      fetchAgendamentos(filtro);
    } catch {
      showToast('error', 'Erro ao salvar mensagem');
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const handleOpenReagendar = (agendamento: AgendamentoGrupo) => {
    const d = new Date(agendamento.data_envio);
    setReagendarData(d.toISOString().split('T')[0]);
    setReagendarHora(d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false }));
    setReagCalMonth(d.getMonth());
    setReagCalYear(d.getFullYear());
    setReagCalOpen(false);
    setReagendarModal(agendamento);
  };

  const getInstanciaAgendamento = (agendamento: AgendamentoGrupo): InstanciaDisparadora | undefined => {
    return instancias.find((i) => i.instancia === agendamento.instancia);
  };

  const precisaTrocarInstancia = (agendamento: AgendamentoGrupo): boolean => {
    if (agendamento.status !== 'pendente') return false;
    if (agendamento.token === 'telegram') return false;
    const inst = getInstanciaAgendamento(agendamento);
    return !inst || inst.status_conexao !== 'connected';
  };

  const handleOpenTrocaInstancia = (agendamento: AgendamentoGrupo) => {
    const atual = getInstanciaAgendamento(agendamento);
    setNovaInstancia(atual?.instancia ?? '');
    setTrocaInstanciaModal(agendamento);
  };

  const handleSalvarTrocaInstancia = async () => {
    if (!trocaInstanciaModal || !novaInstancia) return;
    const selected = instancias.find((i) => i.instancia === novaInstancia);
    if (!selected) {
      showToast('error', 'Selecione uma instância válida');
      return;
    }
    if (selected.status_conexao !== 'connected') {
      showToast('error', 'Selecione uma instância conectada');
      return;
    }
    try {
      setSalvandoTrocaInstancia(true);
      await trocarInstanciaAgendamento(trocaInstanciaModal.id, selected.instancia, selected.token);
      showToast('success', 'Instância trocada com sucesso');
      setTrocaInstanciaModal(null);
      fetchAgendamentos(filtro);
    } catch {
      showToast('error', 'Erro ao trocar instância');
    } finally {
      setSalvandoTrocaInstancia(false);
    }
  };

  const handleOpenAlterarGrupos = (agendamento: AgendamentoGrupo) => {
    setAlterarGruposModal(agendamento);
    setGruposEditaveis([...agendamento.grupos]);
    setGruposRemovidos([]);
    setBuscaGrupo('');
  };

  const handleRemoverGrupo = (grupoId: string) => {
    const grupo = gruposEditaveis.find((g) => g.grupo_id === grupoId);
    if (!grupo) return;
    setGruposEditaveis((prev) => prev.filter((g) => g.grupo_id !== grupoId));
    setGruposRemovidos((prev) => [...prev, grupo]);
  };

  const handleDesfazerRemocao = (grupoId: string) => {
    const grupo = gruposRemovidos.find((g) => g.grupo_id === grupoId);
    if (!grupo) return;
    setGruposRemovidos((prev) => prev.filter((g) => g.grupo_id !== grupoId));
    setGruposEditaveis((prev) => [...prev, grupo]);
  };

  const handleSalvarGrupos = async () => {
    if (!alterarGruposModal) return;
    if (gruposEditaveis.length === 0) {
      showToast('error', 'Mantenha ao menos 1 grupo no agendamento');
      return;
    }
    try {
      setSalvandoGrupos(true);
      await atualizarGruposAgendamento(alterarGruposModal.id, gruposEditaveis);
      showToast('success', `${gruposRemovidos.length} grupo${gruposRemovidos.length !== 1 ? 's' : ''} removido${gruposRemovidos.length !== 1 ? 's' : ''}`);
      setAlterarGruposModal(null);
      fetchAgendamentos(filtro);
    } catch {
      showToast('error', 'Erro ao atualizar grupos');
    } finally {
      setSalvandoGrupos(false);
    }
  };

  const handleSalvarReagendar = async () => {
    if (!reagendarModal || !reagendarData || !reagendarHora) return;
    try {
      setSalvandoReagendar(true);
      const novaDataISO = `${reagendarData}T${reagendarHora}:00-03:00`;

      const agora = new Date();
      const novaData = new Date(novaDataISO);
      if (novaData.getTime() - agora.getTime() < 2 * 60 * 1000) {
        showToast('error', 'O horário deve ser pelo menos 2 minutos no futuro.');
        return;
      }

      await reagendarAgendamento(reagendarModal.id, novaDataISO);
      showToast('success', 'Horário atualizado!');
      setReagendarModal(null);
      fetchAgendamentos(filtro);
    } catch {
      showToast('error', 'Erro ao reagendar');
    } finally {
      setSalvandoReagendar(false);
    }
  };

  return (
    <div className="space-y-6">
      <EnviosNav />

      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {FILTROS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            className={cn(
              'px-4 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 whitespace-nowrap border',
              filtro === f.key
                ? 'bg-surface-200/40 text-txt border-surface-300/20'
                : 'text-txt-dim hover:text-txt hover:bg-surface-200/20 border-transparent'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Filtros + Count */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[12px] text-txt-dim font-mono">
          {agendamentosFiltrados.length} agendamento{agendamentosFiltrados.length !== 1 ? 's' : ''}
          {filtroData && (
            <span className="text-white/30 ml-1">
              em {filtroData.split('-').reverse().join('/')}
            </span>
          )}
          {filtroHora !== null && (
            <span className="text-white/30 ml-1">
              às {String(filtroHora).padStart(2, '0')}:00
            </span>
          )}
          {filtroCanal && (
            <span className="text-white/30 ml-1">
              via {filtroCanal === 'whatsapp' ? 'WhatsApp' : 'Telegram'}
            </span>
          )}
        </p>

        <div className="flex items-center gap-2 flex-wrap">
        {/* Filtro de canal */}
        <div className="relative" ref={canalRef}>
          <button
            onClick={() => setCanalOpen(!canalOpen)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12px] font-medium transition-all duration-200"
            style={{
              background: filtroCanal ? 'rgba(var(--color-primary-rgb),0.1)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${filtroCanal ? 'rgba(var(--color-primary-rgb),0.25)' : 'rgba(255,255,255,0.06)'}`,
              color: filtroCanal ? 'var(--color-primary-light)' : 'rgba(255,255,255,0.5)',
            }}
          >
            <MessagesSquare className="w-3.5 h-3.5" />
            {filtroCanal ? (filtroCanal === 'whatsapp' ? 'WhatsApp' : 'Telegram') : 'Filtrar por canal'}
          </button>

          {filtroCanal && (
            <button
              onClick={(e) => { e.stopPropagation(); setFiltroCanal(null); }}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center transition-colors z-10"
              style={{ background: 'rgba(248,113,113,0.2)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171' }}
            >
              <X className="w-3 h-3" />
            </button>
          )}

          {/* Desktop dropdown (md+) */}
          {canalOpen && (
            <div
              className="hidden md:block absolute right-0 top-full mt-2 z-50 animate-fade-in"
              style={{
                background: 'rgba(16,16,28,0.97)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '14px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset',
                padding: '6px',
                minWidth: '200px',
              }}
            >
              {([
                { key: 'whatsapp' as const, label: 'WhatsApp', color: '#25d366', bg: 'rgba(37,211,102,0.1)', border: 'rgba(37,211,102,0.25)' },
                { key: 'telegram' as const, label: 'Telegram', color: '#29b6f6', bg: 'rgba(0,136,204,0.1)', border: 'rgba(0,136,204,0.25)' },
              ]).map((opt) => {
                const active = filtroCanal === opt.key;
                const IconComp = opt.key === 'whatsapp' ? MessagesSquare : Send;
                return (
                  <button
                    key={opt.key}
                    onClick={() => { setFiltroCanal(active ? null : opt.key); setCanalOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all"
                    style={{
                      background: active ? opt.bg : 'transparent',
                      border: `1px solid ${active ? opt.border : 'transparent'}`,
                      color: active ? opt.color : 'rgba(255,255,255,0.55)',
                    }}
                    onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#fff' } }}
                    onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)' } }}
                  >
                    <IconComp className="w-3.5 h-3.5" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Mobile bottom sheet */}
          {canalOpen && createPortal(
            <div className="md:hidden fixed inset-0 z-[100] flex items-end animate-fade-in">
              <div
                className="absolute inset-0 bg-black/60"
                style={{ backdropFilter: 'blur(4px)' }}
                onClick={() => setCanalOpen(false)}
              />
              <div
                ref={canalSheetRef}
                className="relative w-full rounded-t-3xl border-t border-white/10 animate-slide-up"
                style={{
                  background: 'rgba(22,27,34,0.98)',
                  maxHeight: '70vh',
                  boxShadow: '0 -20px 60px rgba(0,0,0,0.6)',
                }}
              >
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 rounded-full bg-white/15" />
                </div>
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                  <h4 className="text-[14px] font-semibold text-white font-display">Filtrar por canal</h4>
                  <button
                    onClick={() => setCanalOpen(false)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-3 space-y-1.5" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
                  {([
                    { key: 'whatsapp' as const, label: 'WhatsApp', color: '#25d366', bg: 'rgba(37,211,102,0.1)', border: 'rgba(37,211,102,0.25)' },
                    { key: 'telegram' as const, label: 'Telegram', color: '#29b6f6', bg: 'rgba(0,136,204,0.1)', border: 'rgba(0,136,204,0.25)' },
                  ]).map((opt) => {
                    const active = filtroCanal === opt.key;
                    const IconComp = opt.key === 'whatsapp' ? MessagesSquare : Send;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => { setFiltroCanal(active ? null : opt.key); setCanalOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-[13px] font-medium transition-all"
                        style={{
                          background: active ? opt.bg : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${active ? opt.border : 'rgba(255,255,255,0.05)'}`,
                          color: active ? opt.color : 'rgba(255,255,255,0.7)',
                        }}
                      >
                        <IconComp className="w-4 h-4" />
                        <span className="flex-1 text-left">{opt.label}</span>
                        {active && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{ background: opt.bg, color: opt.color }}>Ativo</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>,
            document.body
          )}
        </div>

        {/* Filtro de hora */}
        <div className="relative" ref={horaRef}>
          <button
            onClick={() => setHoraOpen(!horaOpen)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12px] font-medium transition-all duration-200"
            style={{
              background: filtroHora !== null ? 'rgba(var(--color-primary-rgb),0.1)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${filtroHora !== null ? 'rgba(var(--color-primary-rgb),0.25)' : 'rgba(255,255,255,0.06)'}`,
              color: filtroHora !== null ? 'var(--color-primary-light)' : 'rgba(255,255,255,0.5)',
            }}
          >
            <Clock className="w-3.5 h-3.5" />
            {filtroHora !== null ? `${String(filtroHora).padStart(2, '0')}:00` : 'Filtrar por horário'}
          </button>

          {filtroHora !== null && (
            <button
              onClick={(e) => { e.stopPropagation(); setFiltroHora(null); }}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center transition-colors z-10"
              style={{ background: 'rgba(248,113,113,0.2)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171' }}
            >
              <X className="w-3 h-3" />
            </button>
          )}

          {/* Desktop dropdown (md+) */}
          {horaOpen && (() => {
            const HoraGrid = () => (
              <div className="grid grid-cols-6 gap-1.5">
                {Array.from({ length: 24 }).map((_, h) => {
                  const isSelected = filtroHora === h;
                  const hasAgendamentos = horasComAgendamento.has(h);
                  return (
                    <button
                      key={h}
                      onClick={() => { setFiltroHora(isSelected ? null : h); setHoraOpen(false); }}
                      disabled={!hasAgendamentos && !isSelected}
                      className="aspect-square rounded-lg flex items-center justify-center text-[11px] font-medium font-mono transition-all duration-150 relative"
                      style={{
                        background: isSelected ? 'rgba(var(--color-primary-rgb),0.2)' : hasAgendamentos ? 'rgba(255,255,255,0.04)' : 'transparent',
                        border: isSelected
                          ? '1px solid rgba(var(--color-primary-rgb),0.4)'
                          : hasAgendamentos ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
                        color: isSelected
                          ? 'var(--color-primary-light)'
                          : hasAgendamentos ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)',
                        boxShadow: isSelected ? '0 0 10px rgba(var(--color-primary-rgb),0.15)' : 'none',
                        cursor: !hasAgendamentos && !isSelected ? 'not-allowed' : 'pointer',
                        opacity: !hasAgendamentos && !isSelected ? 0.4 : 1,
                      }}
                      onMouseEnter={(e) => { if (!isSelected && hasAgendamentos) { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff' } }}
                      onMouseLeave={(e) => { if (!isSelected && hasAgendamentos) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)' } }}
                    >
                      {String(h).padStart(2, '0')}
                      {hasAgendamentos && (
                        <span
                          className="absolute bottom-1 w-1 h-1 rounded-full"
                          style={{ background: isSelected ? 'var(--color-primary-light)' : 'var(--color-primary)' }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            );
            return (
              <>
                {/* Desktop */}
                <div
                  className="hidden md:block absolute right-0 top-full mt-2 z-50 animate-fade-in"
                  style={{
                    background: 'rgba(16,16,28,0.97)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '16px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset',
                    padding: '14px',
                    width: '300px',
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.45)' }}>
                      Horário do envio
                    </span>
                    <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>
                      {horasComAgendamento.size} horário{horasComAgendamento.size !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <HoraGrid />
                  {filtroHora !== null && (
                    <button
                      onClick={() => { setFiltroHora(null); setHoraOpen(false); }}
                      className="w-full mt-3 py-2 rounded-lg text-[11px] font-medium transition-colors"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                    >
                      Limpar filtro
                    </button>
                  )}
                </div>

                {/* Mobile bottom sheet */}
                {createPortal(
                  <div className="md:hidden fixed inset-0 z-[100] flex items-end animate-fade-in">
                    <div
                      className="absolute inset-0 bg-black/60"
                      style={{ backdropFilter: 'blur(4px)' }}
                      onClick={() => setHoraOpen(false)}
                    />
                    <div
                      ref={horaSheetRef}
                      className="relative w-full rounded-t-3xl border-t border-white/10 animate-slide-up"
                      style={{
                        background: 'rgba(22,27,34,0.98)',
                        maxHeight: '80vh',
                        boxShadow: '0 -20px 60px rgba(0,0,0,0.6)',
                      }}
                    >
                      <div className="flex justify-center pt-3 pb-1">
                        <div className="w-10 h-1 rounded-full bg-white/15" />
                      </div>
                      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                        <div>
                          <h4 className="text-[14px] font-semibold text-white font-display">Filtrar por horário</h4>
                          <p className="text-[10px] font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                            {horasComAgendamento.size} horário{horasComAgendamento.size !== 1 ? 's' : ''} disponível{horasComAgendamento.size !== 1 ? 'is' : ''}
                          </p>
                        </div>
                        <button
                          onClick={() => setHoraOpen(false)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 100px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
                        <HoraGrid />
                        {filtroHora !== null && (
                          <button
                            onClick={() => { setFiltroHora(null); setHoraOpen(false); }}
                            className="w-full mt-4 py-3 rounded-xl text-[12px] font-medium transition-colors"
                            style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}
                          >
                            Limpar filtro
                          </button>
                        )}
                      </div>
                    </div>
                  </div>,
                  document.body
                )}
              </>
            );
          })()}
        </div>

        {/* Filtro de data */}
        <div className="relative" ref={calRef}>
          <button
            onClick={() => { setCalendarOpen(!calendarOpen); if (!calendarOpen) { const d = filtroData ? new Date(filtroData) : new Date(); setCalendarMonth(d.getMonth()); setCalendarYear(d.getFullYear()); } }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12px] font-medium transition-all duration-200"
            style={{
              background: filtroData ? 'rgba(var(--color-primary-rgb),0.1)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${filtroData ? 'rgba(var(--color-primary-rgb),0.25)' : 'rgba(255,255,255,0.06)'}`,
              color: filtroData ? 'var(--color-primary-light)' : 'rgba(255,255,255,0.5)',
            }}
          >
            <Calendar className="w-3.5 h-3.5" />
            {filtroData ? filtroData.split('-').reverse().join('/') : 'Filtrar por data'}
          </button>

          {filtroData && (
            <button
              onClick={(e) => { e.stopPropagation(); setFiltroData(null); }}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center transition-colors z-10"
              style={{ background: 'rgba(248,113,113,0.2)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171' }}
            >
              <X className="w-3 h-3" />
            </button>
          )}

          {/* Calendario dropdown */}
          {calendarOpen && (() => {
            const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
            const firstDayOfWeek = new Date(calendarYear, calendarMonth, 1).getDay();
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

            // Dias que tem agendamentos (para highlight)
            const diasComAgendamento = new Set<number>();
            agendamentos.forEach((ag) => {
              const d = new Date(ag.data_envio);
              if (d.getMonth() === calendarMonth && d.getFullYear() === calendarYear) {
                diasComAgendamento.add(d.getDate());
              }
            });

            const CalendarNav = () => (
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => { if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(calendarYear - 1); } else setCalendarMonth(calendarMonth - 1); }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                  style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[13px] font-semibold text-white">
                  {monthNames[calendarMonth]} {calendarYear}
                </span>
                <button
                  onClick={() => { if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(calendarYear + 1); } else setCalendarMonth(calendarMonth + 1); }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                  style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            );

            const CalendarBody = () => (
              <>
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
                    <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-wider py-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} className="w-full aspect-square" />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isSelected = filtroData === dateStr;
                    const isToday = dateStr === todayStr;
                    const hasAgendamentos = diasComAgendamento.has(day);
                    return (
                      <button
                        key={day}
                        onClick={() => { setFiltroData(isSelected ? null : dateStr); setCalendarOpen(false); }}
                        className="w-full aspect-square rounded-lg flex flex-col items-center justify-center text-[12px] font-medium transition-all duration-150 relative"
                        style={{
                          background: isSelected ? 'rgba(var(--color-primary-rgb),0.2)' : isToday ? 'rgba(255,255,255,0.06)' : 'transparent',
                          border: isSelected ? '1px solid rgba(var(--color-primary-rgb),0.4)' : isToday ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
                          color: isSelected ? 'var(--color-primary-light)' : isToday ? '#fff' : hasAgendamentos ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)',
                          boxShadow: isSelected ? '0 0 10px rgba(var(--color-primary-rgb),0.15)' : 'none',
                        }}
                        onMouseEnter={(e) => { if (!isSelected) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff' } }}
                        onMouseLeave={(e) => { if (!isSelected) { e.currentTarget.style.background = isToday ? 'rgba(255,255,255,0.06)' : 'transparent'; e.currentTarget.style.color = isToday ? '#fff' : hasAgendamentos ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)' } }}
                      >
                        {day}
                        {hasAgendamentos && (
                          <span
                            className="absolute bottom-1 w-1 h-1 rounded-full"
                            style={{ background: isSelected ? 'var(--color-primary-light)' : 'var(--color-primary)' }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            );

            return (
              <>
                {/* Desktop dropdown */}
                <div
                  className="hidden md:block absolute right-0 top-full mt-2 z-50 animate-fade-in"
                  style={{
                    background: 'rgba(16,16,28,0.97)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '16px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset',
                    padding: '16px',
                    width: '300px',
                  }}
                >
                  <CalendarNav />
                  <CalendarBody />
                  {filtroData && (
                    <button
                      onClick={() => { setFiltroData(null); setCalendarOpen(false); }}
                      className="w-full mt-3 py-2 rounded-lg text-[11px] font-medium transition-colors"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                    >
                      Limpar filtro
                    </button>
                  )}
                </div>

                {/* Mobile bottom sheet */}
                {createPortal(
                  <div className="md:hidden fixed inset-0 z-[100] flex items-end animate-fade-in">
                    <div
                      className="absolute inset-0 bg-black/60"
                      style={{ backdropFilter: 'blur(4px)' }}
                      onClick={() => setCalendarOpen(false)}
                    />
                    <div
                      ref={calSheetRef}
                      className="relative w-full rounded-t-3xl border-t border-white/10 animate-slide-up"
                      style={{
                        background: 'rgba(22,27,34,0.98)',
                        maxHeight: '85vh',
                        boxShadow: '0 -20px 60px rgba(0,0,0,0.6)',
                      }}
                    >
                      <div className="flex justify-center pt-3 pb-1">
                        <div className="w-10 h-1 rounded-full bg-white/15" />
                      </div>
                      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                        <h4 className="text-[14px] font-semibold text-white font-display">Filtrar por data</h4>
                        <button
                          onClick={() => setCalendarOpen(false)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 100px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
                        <CalendarNav />
                        <CalendarBody />
                        {filtroData && (
                          <button
                            onClick={() => { setFiltroData(null); setCalendarOpen(false); }}
                            className="w-full mt-4 py-3 rounded-xl text-[12px] font-medium transition-colors"
                            style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}
                          >
                            Limpar filtro
                          </button>
                        )}
                      </div>
                    </div>
                  </div>,
                  document.body
                )}
              </>
            );
          })()}
        </div>
        </div>
      </div>

      {/* Loading */}
      {loadingAgendamentos ? (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : agendamentosFiltrados.length === 0 ? (
        <div className="card-dark p-12 flex flex-col items-center justify-center gap-3">
          <CalendarX2 className="w-10 h-10 text-txt-dim" />
          <div className="text-center">
            <p className="text-txt-muted text-[14px] font-medium">Nenhum agendamento</p>
            <p className="text-txt-dim text-[12px] mt-1">
              {filtroData || filtroHora !== null || filtroCanal
                ? `Nenhum agendamento${filtroData ? ` em ${filtroData.split('-').reverse().join('/')}` : ''}${filtroHora !== null ? ` às ${String(filtroHora).padStart(2, '0')}:00` : ''}${filtroCanal ? ` via ${filtroCanal === 'whatsapp' ? 'WhatsApp' : 'Telegram'}` : ''}.`
                : filtro !== 'todos'
                ? `Nenhum agendamento com status "${filtro}".`
                : 'Crie um novo agendamento na aba "Novo Agendamento".'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {agendamentosFiltrados.map((ag) => (
            <AgendamentoCard
              key={ag.id}
              agendamento={ag}
              onDetalhes={setDetalhesModal}
              onDuplicar={handleDuplicar}
              onCancelar={setCancelarModal}
              onEditar={handleEditar}
              onReagendar={handleOpenReagendar}
              onApagarEnvios={setApagarEnviosModal}
              precisaTrocarInstancia={precisaTrocarInstancia(ag)}
              onTrocarInstancia={handleOpenTrocaInstancia}
              onAlterarGrupos={handleOpenAlterarGrupos}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <AgendamentoDetalhesModal
        isOpen={!!detalhesModal}
        onClose={() => setDetalhesModal(null)}
        agendamento={detalhesModal}
      />

      <ConfirmCancelAgendamentoModal
        isOpen={!!cancelarModal}
        onClose={() => setCancelarModal(null)}
        onConfirm={handleCancelar}
        agendamento={cancelarModal}
        loading={cancelando}
      />

      <ConfirmarApagarEnviosModal
        isOpen={!!apagarEnviosModal}
        onClose={() => !apagandoEnvios && setApagarEnviosModal(null)}
        onConfirm={handleConfirmarApagarEnvios}
        agendamento={apagarEnviosModal}
        loading={apagandoEnvios}
      />

      <NovaMensagemModal
        isOpen={!!editarModal}
        onClose={() => setEditarModal(null)}
        onSave={handleSalvarEdicao}
        editando={editarModal}
        loading={salvandoEdicao}
        onAddExemplo={adicionarExemplo}
        showToast={showToast}
      />

      {/* Reagendar Modal */}
      {reagendarModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
          onClick={() => setReagendarModal(null)}
        >
          <div
            className="w-full max-w-sm animate-slide-up"
            style={{ background: 'rgba(20,20,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '28px', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(56,189,248,0.12)' }}>
                  <Clock className="w-4 h-4" style={{ color: '#38bdf8' }} />
                </div>
                <h3 className="text-[16px] font-semibold text-white font-display">Alterar horário</h3>
              </div>
              <button
                onClick={() => setReagendarModal(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[13px] mb-5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Mensagem: <span className="text-white font-medium">{reagendarModal.mensagem?.nome || '—'}</span>
            </p>

            {/* ── Custom Date Picker ──────────────────── */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.5px] mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>Data</label>
              {/* Display button */}
              <button
                type="button"
                onClick={() => {
                  if (!reagCalOpen && reagendarData) {
                    const [y, m] = reagendarData.split('-').map(Number);
                    setReagCalMonth(m - 1);
                    setReagCalYear(y);
                  }
                  setReagCalOpen((p) => !p);
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13px] font-mono font-medium transition-all duration-200"
                style={{
                  background: reagCalOpen ? 'rgba(var(--color-primary-rgb),0.08)' : 'rgba(255,255,255,0.04)',
                  border: reagCalOpen ? '1px solid rgba(var(--color-primary-rgb),0.3)' : '1px solid rgba(255,255,255,0.08)',
                  color: reagendarData ? '#fff' : 'rgba(255,255,255,0.3)',
                  boxShadow: reagCalOpen ? '0 0 0 3px rgba(var(--color-primary-rgb),0.06)' : 'none',
                }}
              >
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4" style={{ color: reagCalOpen ? 'var(--color-primary-light)' : 'rgba(255,255,255,0.35)' }} />
                  <span>{reagendarData ? reagendarData.split('-').reverse().join('/') : 'Selecionar data'}</span>
                </div>
                <ChevronLeft
                  className="w-3.5 h-3.5 transition-transform duration-200"
                  style={{ color: 'rgba(255,255,255,0.25)', transform: reagCalOpen ? 'rotate(-90deg)' : 'rotate(-90deg) rotate(180deg)' }}
                />
              </button>

              {/* Inline calendar */}
              {reagCalOpen && (() => {
                const daysInMonth = new Date(reagCalYear, reagCalMonth + 1, 0).getDate();
                const firstDayOfWeek = new Date(reagCalYear, reagCalMonth, 1).getDay();
                const today = new Date();
                const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
                return (
                  <div className="mt-2 rounded-xl overflow-hidden animate-fade-in" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', padding: '14px' }}>
                    {/* Nav */}
                    <div className="flex items-center justify-between mb-3">
                      <button
                        type="button"
                        onClick={() => { if (reagCalMonth === 0) { setReagCalMonth(11); setReagCalYear(reagCalYear - 1); } else setReagCalMonth(reagCalMonth - 1); }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                        style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[12px] font-semibold text-white">{MONTHS[reagCalMonth]} {reagCalYear}</span>
                      <button
                        type="button"
                        onClick={() => { if (reagCalMonth === 11) { setReagCalMonth(0); setReagCalYear(reagCalYear + 1); } else setReagCalMonth(reagCalMonth + 1); }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                        style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {/* Day headers */}
                    <div className="grid grid-cols-7 gap-1 mb-1">
                      {['D','S','T','Q','Q','S','S'].map((d, i) => (
                        <div key={i} className="text-center text-[9px] font-bold uppercase tracking-wider py-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>{d}</div>
                      ))}
                    </div>
                    {/* Days grid */}
                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e${i}`} />)}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const dateStr = `${reagCalYear}-${String(reagCalMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const isSelected = reagendarData === dateStr;
                        const isToday = dateStr === todayStr;
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => { setReagendarData(dateStr); setReagCalOpen(false); }}
                            className="aspect-square rounded-lg flex items-center justify-center text-[11px] font-medium transition-all duration-100"
                            style={{
                              background: isSelected ? 'rgba(var(--color-primary-rgb),0.25)' : isToday ? 'rgba(255,255,255,0.07)' : 'transparent',
                              border: isSelected ? '1px solid rgba(var(--color-primary-rgb),0.45)' : isToday ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
                              color: isSelected ? 'var(--color-primary-light)' : isToday ? '#fff' : 'rgba(255,255,255,0.7)',
                              boxShadow: isSelected ? '0 0 8px rgba(var(--color-primary-rgb),0.2)' : 'none',
                            }}
                            onMouseEnter={(e) => { if (!isSelected) { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; } }}
                            onMouseLeave={(e) => { if (!isSelected) { e.currentTarget.style.background = isToday ? 'rgba(255,255,255,0.07)' : 'transparent'; e.currentTarget.style.color = isToday ? '#fff' : 'rgba(255,255,255,0.7)'; } }}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* ── Custom Time Picker ──────────────────── */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.5px] mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>Horário</label>
              <ReagendarTimePicker value={reagendarHora} onChange={setReagendarHora} />
            </div>

            <div className="flex gap-3 mt-6" style={{ paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <button
                onClick={() => setReagendarModal(null)}
                className="flex-1 py-2.5 rounded-[10px] text-[13px] font-medium transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvarReagendar}
                disabled={salvandoReagendar || !reagendarData || !reagendarHora}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[10px] text-[13px] font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'rgba(var(--color-primary-rgb),0.2)', border: '1px solid rgba(var(--color-primary-rgb),0.3)', color: 'var(--color-primary-light)' }}
              >
                {salvandoReagendar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {trocaInstanciaModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
          onClick={() => setTrocaInstanciaModal(null)}
        >
          <div
            className="w-full max-w-sm animate-slide-up"
            style={{ background: 'rgba(20,20,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '28px', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(167,139,250,0.12)' }}>
                  <ArrowLeftRight className="w-4 h-4" style={{ color: '#a78bfa' }} />
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold text-white font-display">Trocar instância</h3>
                  <p className="text-[11px] text-white/30 mt-0.5">{trocaInstanciaModal.mensagem?.nome || 'Agendamento'}</p>
                </div>
              </div>
              <button
                onClick={() => setTrocaInstanciaModal(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Instancia atual */}
            <div className="rounded-xl px-3.5 py-2.5 mb-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <p className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-1">Instância atual</p>
              <div className="flex items-center gap-2">
                {(() => {
                  const inst = getInstanciaAgendamento(trocaInstanciaModal);
                  const connected = inst?.status_conexao === 'connected';
                  return (
                    <>
                      {connected ? <Wifi className="w-3 h-3 text-emerald-400" /> : <WifiOff className="w-3 h-3 text-red-400" />}
                      <span className="text-[13px] text-white/70 font-medium">{inst?.nome || trocaInstanciaModal.instancia}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${connected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {connected ? 'Conectada' : 'Desconectada'}
                      </span>
                    </>
                  );
                })()}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.5px] mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Nova instância</label>
              <div className="space-y-1.5">
                {instancias
                  .filter((i) => i.status_conexao === 'connected')
                  .map((i) => {
                    const isSelected = novaInstancia === i.instancia;
                    return (
                      <button
                        key={i.id}
                        onClick={() => setNovaInstancia(i.instancia)}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all duration-150"
                        style={{
                          background: isSelected ? 'rgba(167,139,250,0.08)' : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${isSelected ? 'rgba(167,139,250,0.3)' : 'rgba(255,255,255,0.04)'}`,
                        }}
                      >
                        <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium truncate" style={{ color: isSelected ? '#a78bfa' : 'rgba(255,255,255,0.7)' }}>{i.nome}</p>
                          <p className="text-[11px] text-white/30 font-mono">{i.numero}</p>
                        </div>
                        {isSelected && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa' }}>
                            Selecionada
                          </span>
                        )}
                      </button>
                    );
                  })}
                {instancias.filter((i) => i.status_conexao === 'connected').length === 0 && (
                  <p className="text-[12px] text-white/30 text-center py-4">Nenhuma instância conectada disponível</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6" style={{ paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <button
                onClick={() => setTrocaInstanciaModal(null)}
                className="flex-1 py-2.5 rounded-[10px] text-[13px] font-medium transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvarTrocaInstancia}
                disabled={salvandoTrocaInstancia || !novaInstancia}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[10px] text-[13px] font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'rgba(167,139,250,0.2)', border: '1px solid rgba(167,139,250,0.3)', color: '#a78bfa' }}
              >
                {salvandoTrocaInstancia ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeftRight className="w-4 h-4" />}
                Trocar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alterar Grupos Modal */}
      {alterarGruposModal && (() => {
        const totalOriginal = alterarGruposModal.grupos.length;
        const totalAtual = gruposEditaveis.length;
        const totalRemovidos = gruposRemovidos.length;
        const buscaLower = buscaGrupo.trim().toLowerCase();
        const gruposVisiveis = buscaLower
          ? gruposEditaveis.filter((g) => g.grupo_nome.toLowerCase().includes(buscaLower))
          : gruposEditaveis;
        const removidosVisiveis = buscaLower
          ? gruposRemovidos.filter((g) => g.grupo_nome.toLowerCase().includes(buscaLower))
          : gruposRemovidos;
        const houveAlteracao = totalRemovidos > 0;
        const canalAtual = alterarGruposModal.canal;
        const accent = canalAtual === 'telegram' ? '#29b6f6' : '#34d399';
        const accentRgb = canalAtual === 'telegram' ? '41,182,246' : '52,211,153';

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
            onClick={() => !salvandoGrupos && setAlterarGruposModal(null)}
          >
            <div
              className="w-full max-w-md animate-slide-up flex flex-col overflow-hidden"
              style={{
                background: 'rgba(20,20,30,0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '20px',
                boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
                maxHeight: 'min(86vh, 720px)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 pt-6 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `rgba(${accentRgb},0.12)`, border: `1px solid rgba(${accentRgb},0.2)` }}
                    >
                      <UsersRound className="w-4 h-4" style={{ color: accent }} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[16px] font-semibold text-white font-display leading-tight">Alterar grupos</h3>
                      <p className="text-[11px] mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {alterarGruposModal.mensagem?.nome ?? 'Mensagem'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => !salvandoGrupos && setAlterarGruposModal(null)}
                    disabled={salvandoGrupos}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0 disabled:opacity-40"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)' }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Counters */}
                <div className="flex items-center gap-2 mt-4 flex-wrap">
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                    style={{ background: `rgba(${accentRgb},0.08)`, border: `1px solid rgba(${accentRgb},0.18)` }}
                  >
                    <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: accent, opacity: 0.7 }}>Ativos</span>
                    <span className="text-[12px] font-mono font-bold tabular-nums" style={{ color: accent }}>
                      {totalAtual}
                    </span>
                  </div>
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'rgba(255,255,255,0.35)' }}>Total</span>
                    <span className="text-[12px] font-mono font-bold tabular-nums" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      {totalOriginal}
                    </span>
                  </div>
                  {totalRemovidos > 0 && (
                    <div
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                      style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.18)' }}
                    >
                      <Trash2 className="w-3 h-3" style={{ color: '#f87171' }} />
                      <span className="text-[12px] font-mono font-bold tabular-nums" style={{ color: '#f87171' }}>
                        -{totalRemovidos}
                      </span>
                    </div>
                  )}
                </div>

                {/* Busca */}
                {totalOriginal > 6 && (
                  <div className="relative mt-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.3)' }} />
                    <input
                      type="text"
                      value={buscaGrupo}
                      onChange={(e) => setBuscaGrupo(e.target.value)}
                      placeholder="Buscar grupo..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl text-[12px] outline-none transition-all"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        color: '#fff',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = `rgba(${accentRgb},0.3)`;
                        e.currentTarget.style.background = `rgba(${accentRgb},0.04)`;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                      }}
                    />
                    {buscaGrupo && (
                      <button
                        onClick={() => setBuscaGrupo('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center transition-colors"
                        style={{ color: 'rgba(255,255,255,0.4)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Lista de grupos */}
              <div
                className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5"
                style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
              >
                {gruposVisiveis.length === 0 && removidosVisiveis.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <UsersRound className="w-8 h-8" style={{ color: 'rgba(255,255,255,0.15)' }} />
                    <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {buscaLower ? 'Nenhum grupo encontrado' : 'Nenhum grupo configurado'}
                    </p>
                  </div>
                )}

                {gruposVisiveis.map((grupo, idx) => (
                  <div
                    key={grupo.grupo_id}
                    className="group/item flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-150"
                    style={{
                      background: 'rgba(255,255,255,0.025)',
                      border: '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-mono text-[10px] font-bold"
                      style={{
                        background: `rgba(${accentRgb},0.08)`,
                        border: `1px solid rgba(${accentRgb},0.15)`,
                        color: accent,
                      }}
                    >
                      {String(idx + 1).padStart(2, '0')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-medium text-white truncate leading-tight">
                        {grupo.grupo_nome || 'Sem nome'}
                      </p>
                      <p className="text-[10px] font-mono mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {grupo.grupo_id}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoverGrupo(grupo.grupo_id)}
                      disabled={salvandoGrupos}
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0 opacity-50 group-hover/item:opacity-100 disabled:opacity-30"
                      style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.12)', color: '#f87171' }}
                      onMouseEnter={(e) => { if (!salvandoGrupos) { e.currentTarget.style.background = 'rgba(248,113,113,0.15)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.3)'; } }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(248,113,113,0.06)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.12)'; }}
                      title="Remover grupo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {removidosVisiveis.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 pt-4 pb-1">
                      <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.05)' }} />
                      <span className="text-[9px] uppercase tracking-[0.15em] font-bold" style={{ color: 'rgba(248,113,113,0.6)' }}>
                        Removidos ({removidosVisiveis.length})
                      </span>
                      <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.05)' }} />
                    </div>
                    {removidosVisiveis.map((grupo) => (
                      <div
                        key={grupo.grupo_id}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                        style={{
                          background: 'rgba(248,113,113,0.04)',
                          border: '1px dashed rgba(248,113,113,0.18)',
                        }}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)' }}
                        >
                          <Trash2 className="w-3.5 h-3.5" style={{ color: '#f87171' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12.5px] font-medium truncate leading-tight line-through" style={{ color: 'rgba(255,255,255,0.45)' }}>
                            {grupo.grupo_nome || 'Sem nome'}
                          </p>
                          <p className="text-[10px] font-mono mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.2)' }}>
                            {grupo.grupo_id}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDesfazerRemocao(grupo.grupo_id)}
                          disabled={salvandoGrupos}
                          className="flex items-center gap-1.5 px-2.5 h-8 rounded-lg transition-all shrink-0 text-[11px] font-medium disabled:opacity-30"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
                          onMouseEnter={(e) => { if (!salvandoGrupos) { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; } }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
                          title="Desfazer remoção"
                        >
                          <Undo2 className="w-3 h-3" />
                          Desfazer
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Footer */}
              <div
                className="px-6 py-4 flex items-center gap-3"
                style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}
              >
                <button
                  onClick={() => setAlterarGruposModal(null)}
                  disabled={salvandoGrupos}
                  className="flex-1 py-2.5 rounded-[10px] text-[13px] font-medium transition-all duration-200 disabled:opacity-40"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSalvarGrupos}
                  disabled={salvandoGrupos || !houveAlteracao || gruposEditaveis.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[10px] text-[13px] font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: `rgba(${accentRgb},0.2)`,
                    border: `1px solid rgba(${accentRgb},0.35)`,
                    color: accent,
                    boxShadow: houveAlteracao && gruposEditaveis.length > 0 ? `0 0 16px rgba(${accentRgb},0.15)` : 'none',
                  }}
                >
                  {salvandoGrupos ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {salvandoGrupos ? 'Salvando...' : houveAlteracao ? `Salvar (${totalAtual})` : 'Sem alterações'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {toast && <Toast toast={toast} onClose={hideToast} />}
    </div>
  );
};

export default Agendados;
