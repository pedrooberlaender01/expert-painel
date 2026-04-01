import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Loader2, Save, GitBranch, Clock, ChevronDown, Plus, X, AlertTriangle, Trash2, MessageSquareText } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Toast } from '../components/Toast';
import { MensagemCard } from '../components/mensagens/MensagemCard';
import { GatilhoCard } from '../components/mensagens/GatilhoCard';
import { FollowupCard } from '../components/mensagens/FollowupCard';
import { useToast } from '../hooks/useToast';
import { useMensagensFunil, SECOES } from '../hooks/useMensagensFunil';
import type { MensagemFunil } from '../hooks/useMensagensFunil';
import { cn } from '../utils/cn';
import { getStatusLabel } from '../utils/formatters';
import { MensagensAbertura } from '../components/mensagens/MensagensAbertura';
import { useAuthStore } from '../stores/authStore';

const SECOES_COM_TEMPO = new Set(['followups', 'boas_vindas']);
const CENARIOS_EMPTY_ALLOWED = new Set(['outro']);
const CENARIOS_SEM_TOGGLE_TIPO = new Set([
  'cadastro_imagem_ok',
  'cadastro_pedir_print',
  'confirmacao_precisa_link',
]);

type TabKey = 'funil' | 'followups' | 'abertura';

const TABS: { key: TabKey; label: string; icon: typeof GitBranch; secoes: string[] }[] = [
  {
    key: 'funil',
    label: 'Etapas do Funil',
    icon: GitBranch,
    secoes: ['lead_chegou', 'primeiro_contato', 'convite', 'aguardando_cadastro', 'confirmacao_entrada'],
  },
  {
    key: 'followups',
    label: 'Follow-ups & Automáticas',
    icon: Clock,
    secoes: ['followups', 'boas_vindas'],
  },
  {
    key: 'abertura',
    label: 'Mensagens de Abertura',
    icon: MessageSquareText,
    secoes: [],
  },
];

const STATUS_OPTIONS = [
  'primeiro_audio_enviado',
  'convite_enviado',
  'interessado',
  'aguardando_cadastro',
  'link_enviado',
  'aguardando_confirmacao_entrada',
  'no_grupo',
  'entrou_grupo',
  'nao_interessado',
  'sem_resposta',
  'atendimento_manual',
] as const;

// Skeleton loader for cards
const SkeletonCard: React.FC = () => (
  <div className="card-dark p-5 animate-pulse">
    <div className="h-4 w-48 bg-surface-200/50 rounded mb-2" />
    <div className="h-3 w-64 bg-surface-200/30 rounded mb-4" />
    <div className="flex gap-2 mb-4">
      <div className="h-8 w-20 bg-surface-200/30 rounded-lg" />
      <div className="h-8 w-20 bg-surface-200/30 rounded-lg" />
    </div>
    <div className="h-20 bg-surface-200/20 rounded-xl mb-3" />
    <div className="h-20 bg-surface-200/20 rounded-xl" />
  </div>
);

export const Mensagens: React.FC = () => {
  const {
    data, loading, fetchData,
    salvarSecao, salvarCard,
    criarFollowup, excluirFollowup, reordenarFollowups, toggleAtivo,
  } = useMensagensFunil();
  const { toast, showToast, hideToast } = useToast();

  // Voice availability check (D-12: no voice_id = audio disabled)
  const { user, impersonatedExpert } = useAuthStore();
  const activeExpert = impersonatedExpert || user?.expert;
  const hasVoiceId = Boolean(activeExpert?.voice_id);

  // Local editable state
  const [editData, setEditData] = useState<Record<string, MensagemFunil>>({});
  const [modifiedIds, setModifiedIds] = useState<Set<string>>(new Set());
  const [savingSections, setSavingSections] = useState<Set<string>>(new Set());
  const [savingCards, setSavingCards] = useState<Set<string>>(new Set());

  // Tabs
  const [activeTab, setActiveTab] = useState<TabKey>('funil');

  // Seções do funil colapsáveis (começam minimizadas)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = useCallback((key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // Modal: Novo Follow-up
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    titulo: '',
    descricao: '',
    status_alvo: '',
    tempo_espera_minutos: 120,
    tipo_envio: 'texto',
  });
  const [creating, setCreating] = useState(false);

  // Modal: Confirmar exclusão
  const [deleteTarget, setDeleteTarget] = useState<MensagemFunil | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Initialize edit data when loaded
  useEffect(() => {
    if (data.length > 0) {
      const map: Record<string, MensagemFunil> = {};
      data.forEach((m) => {
        map[m.id] = {
          ...m,
          mensagens: [...m.mensagens],
          variacoes: m.variacoes ? m.variacoes.map(v => [...v]) : null,
        };
      });
      setEditData(map);
      setModifiedIds(new Set());
    }
  }, [data]);

  const updateMensagem = useCallback((id: string, updates: Partial<MensagemFunil>) => {
    setEditData((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...updates },
    }));
    setModifiedIds((prev) => new Set(prev).add(id));
  }, []);

  const getMensagensSecao = useCallback(
    (secao: string): MensagemFunil[] => {
      return Object.values(editData)
        .filter((m) => m.secao === secao)
        .sort((a, b) => a.ordem - b.ordem);
    },
    [editData]
  );

  const isSecaoModified = useCallback(
    (secao: string): boolean => {
      return Object.values(editData)
        .filter((m) => m.secao === secao)
        .some((m) => modifiedIds.has(m.id));
    },
    [editData, modifiedIds]
  );

  const handleSaveSection = async (secao: string) => {
    const mensagens = getMensagensSecao(secao);
    const modified = mensagens.filter((m) => modifiedIds.has(m.id));
    if (modified.length === 0) return;

    setSavingSections((prev) => new Set(prev).add(secao));

    try {
      const erro = await salvarSecao(modified);

      if (erro) {
        showToast('error', 'Erro ao salvar mensagens');
      } else {
        showToast('success', 'Mensagens salvas!');
        setModifiedIds((prev) => {
          const next = new Set(prev);
          modified.forEach((m) => next.delete(m.id));
          return next;
        });
      }
    } catch (err) {
      console.error('[handleSaveSection] Erro inesperado:', err);
      showToast('error', 'Erro ao salvar mensagens');
    } finally {
      setSavingSections((prev) => {
        const next = new Set(prev);
        next.delete(secao);
        return next;
      });
    }
  };

  // ─── Follow-up specific handlers ─────────────────────────────────────

  const handleSaveCard = async (id: string, isFollowup: boolean) => {
    const msg = editData[id];
    if (!msg) return;

    setSavingCards((prev) => new Set(prev).add(id));
    try {
      const erro = await salvarCard(msg, isFollowup);
      if (erro) {
        showToast('error', 'Erro ao salvar');
      } else {
        showToast('success', 'Salvo com sucesso!');
        setModifiedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    } catch {
      showToast('error', 'Erro ao salvar');
    } finally {
      setSavingCards((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleCreateFollowup = async () => {
    if (!createForm.titulo.trim()) {
      showToast('error', 'Informe o título do follow-up');
      return;
    }
    if (!createForm.status_alvo) {
      showToast('error', 'Selecione o status alvo');
      return;
    }

    setCreating(true);
    try {
      const erro = await criarFollowup(createForm);
      if (erro) {
        showToast('error', erro);
      } else {
        showToast('success', 'Follow-up criado!');
        setShowCreateModal(false);
        setCreateForm({ titulo: '', descricao: '', status_alvo: '', tempo_espera_minutos: 120, tipo_envio: 'texto' });
      }
    } catch {
      showToast('error', 'Erro ao criar follow-up');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteFollowup = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const erro = await excluirFollowup(deleteTarget.id, deleteTarget.cenario);
      if (erro) {
        showToast('error', erro);
      } else {
        showToast('success', 'Follow-up excluído');
        setDeleteTarget(null);
      }
    } catch {
      showToast('error', 'Erro ao excluir follow-up');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleAtivo = async (id: string, nextActive: boolean) => {
    const erro = await toggleAtivo(id, nextActive);
    if (erro) {
      showToast('error', 'Erro ao alterar status');
    } else {
      showToast('success', nextActive ? 'Follow-up ativado!' : 'Follow-up desativado!');
      // Sync local edit state
      setEditData((prev) => ({
        ...prev,
        [id]: { ...prev[id], ativo: nextActive },
      }));
      setModifiedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleMoveFollowup = async (index: number, direction: 'up' | 'down') => {
    const followups = getMensagensSecao('followups');
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= followups.length) return;

    const a = followups[index];
    const b = followups[targetIndex];

    const erro = await reordenarFollowups([
      { id: a.id, ordem: b.ordem },
      { id: b.id, ordem: a.ordem },
    ]);
    if (erro) {
      showToast('error', 'Erro ao reordenar');
    }
  };

  // ─── Computed ────────────────────────────────────────────────────────

  const secaoTitulos = useMemo(
    () => Object.fromEntries(SECOES.map((s) => [s.key, s.titulo])),
    []
  );

  const activeTabConfig = TABS.find((t) => t.key === activeTab)!;
  const visibleSecoes = useMemo(
    () => SECOES.filter((s) => activeTabConfig.secoes.includes(s.key)),
    [activeTabConfig]
  );

  const followups = useMemo(() => getMensagensSecao('followups'), [getMensagensSecao]);
  const boasVindas = useMemo(() => getMensagensSecao('boas_vindas'), [getMensagensSecao]);

  return (
    <div>
      <PageHeader
        title="Personalização de Mensagens"
        subtitle="Configure as mensagens enviadas em cada etapa do funil"
        onRefresh={fetchData}
        isRefreshing={loading}
      />

      {/* Tabs — Glass Pill */}
      <div
        className="flex flex-wrap md:inline-flex gap-1 p-1 rounded-[14px] w-full md:w-fit mb-8"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const activeStyle = tab.key === 'funil'
            ? { background: 'rgba(var(--color-primary-rgb),0.1)', border: '1px solid rgba(var(--color-primary-rgb),0.2)', color: 'var(--color-primary-light)' }
            : tab.key === 'abertura'
            ? { background: 'rgba(250,204,60,0.08)', border: '1px solid rgba(250,204,60,0.2)', color: '#facc3c' }
            : { background: 'var(--color-primary-bg)', border: '1px solid var(--color-primary-bg)', color: 'var(--color-primary-light)' };
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-3 rounded-[10px] text-[11px] sm:text-[13px] font-medium transition-all duration-250 whitespace-nowrap"
              style={isActive ? activeStyle : { background: 'transparent', border: '1px solid transparent', color: 'rgba(255,255,255,0.45)' }}
              onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' } }}
              onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; e.currentTarget.style.background = 'transparent' } }}
            >
              <tab.icon className="w-4 h-4" style={{ opacity: isActive ? 1 : 0.5 }} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Loading skeleton */}
      {loading && Object.keys(editData).length === 0 && (
        <div className="space-y-10">
          {[1, 2].map((i) => (
            <section key={i}>
              <div className="h-6 w-56 bg-surface-200/40 rounded mb-2 animate-pulse" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            </section>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
           ABA: ETAPAS DO FUNIL
         ══════════════════════════════════════════════════════════════════ */}
      {!loading && activeTab === 'funil' && (
        <div className="space-y-4">
          {visibleSecoes.map((secao) => {
            const mensagens = getMensagensSecao(secao.key);
            if (mensagens.length === 0) return null;

            const isSaving = savingSections.has(secao.key);
            const hasChanges = isSecaoModified(secao.key);
            const hasTempoEspera = SECOES_COM_TEMPO.has(secao.key);
            const isExpanded = expandedSections.has(secao.key);

            return (
              <section key={secao.key}>
                {/* Header clicável */}
                <button
                  onClick={() => toggleSection(secao.key)}
                  className="w-full flex items-center justify-between gap-3 px-6 py-5 transition-all duration-200 group"
                  style={{
                    background: isExpanded ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isExpanded ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)'}`,
                    borderRadius: '14px',
                    borderLeft: `4px solid rgba(var(--color-primary-rgb),${isExpanded ? '0.5' : '0.2'})`,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = isExpanded ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = isExpanded ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)' }}
                >
                  <div className="text-left">
                    <h2 className="text-[14px] font-semibold text-white font-display tracking-tight">
                      {secao.titulo}
                    </h2>
                    <p className="text-[12px] mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {mensagens.length} {mensagens.length === 1 ? 'mensagem' : 'mensagens'} configuradas
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {hasChanges && (
                      <span
                        className="px-2 py-0.5 text-[10px] font-semibold rounded-md"
                        style={{ background: 'rgba(250,204,60,0.12)', color: '#facc3c', border: '1px solid rgba(250,204,60,0.2)' }}
                      >
                        Alterado
                      </span>
                    )}
                    <ChevronDown
                      className={cn(
                        'w-5 h-5 transition-all duration-300',
                        isExpanded && 'rotate-180'
                      )}
                      style={{ color: 'rgba(255,255,255,0.3)' }}
                    />
                  </div>
                </button>

                {/* Conteúdo colapsável */}
                <div
                  className={cn(
                    'overflow-hidden transition-all duration-300 ease-in-out',
                    isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
                  )}
                >
                  <div className="pt-5">
                    {/* Gatilho card full-width (only for lead_chegou section) */}
                    {mensagens
                      .filter((msg) => msg.cenario === 'lead_chegou_gatilho')
                      .map((msg) => (
                        <GatilhoCard
                          key={msg.id}
                          mensagem={msg}
                          isModified={modifiedIds.has(msg.id)}
                          onUpdate={(updates) => updateMensagem(msg.id, updates)}
                        />
                      ))}

                    <div className={cn(
                      'grid grid-cols-1 lg:grid-cols-2 gap-4',
                      mensagens.some((m) => m.cenario === 'lead_chegou_gatilho') && 'mt-4'
                    )}>
                      {mensagens
                        .filter((msg) => msg.cenario !== 'lead_chegou_gatilho')
                        .map((msg) => (
                          <MensagemCard
                            key={msg.id}
                            mensagem={editData[msg.id] || msg}
                            isModified={modifiedIds.has(msg.id)}
                            telefoneTeste=""
                            hasTempoEspera={hasTempoEspera}
                            allowEmptyMessages={CENARIOS_EMPTY_ALLOWED.has(msg.cenario)}
                            showAtivoToggle={hasTempoEspera}
                            hideTypeToggle={CENARIOS_SEM_TOGGLE_TIPO.has(msg.cenario)}
                            voiceEnabled={hasVoiceId}
                            onUpdate={(updates) => updateMensagem(msg.id, updates)}
                            onShowToast={showToast}
                          />
                        ))}
                    </div>

                    {/* Save Section Button */}
                    <div className="flex justify-end mt-5">
                      <button
                        onClick={() => handleSaveSection(secao.key)}
                        disabled={isSaving || !hasChanges}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={hasChanges
                          ? { background: 'var(--color-primary-bg)', border: '1px solid var(--color-primary-bg)', color: 'var(--color-primary-light)' }
                          : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.25)' }
                        }
                        onMouseEnter={(e) => { if (hasChanges) { e.currentTarget.style.background = 'var(--color-primary-bg)'; e.currentTarget.style.boxShadow = '0 0 20px var(--color-primary-bg)' } }}
                        onMouseLeave={(e) => { if (hasChanges) { e.currentTarget.style.background = 'var(--color-primary-bg)'; e.currentTarget.style.boxShadow = 'none' } }}
                      >
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Salvar {secaoTitulos[secao.key]}
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
           ABA: FOLLOW-UPS & AUTOMÁTICAS
         ══════════════════════════════════════════════════════════════════ */}
      {!loading && activeTab === 'followups' && (
        <div className="space-y-10">

          {/* ── Seção: Follow-ups ── */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-[15px] font-bold text-txt font-display tracking-tight">
                  Follow-ups
                </h2>
                <p className="text-[11px] text-txt-dim font-mono mt-0.5">
                  Mensagens enviadas automaticamente quando o lead não responde
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 shrink-0"
                style={{ background: 'var(--color-primary-bg)', border: '1px solid var(--color-primary-bg)', color: 'var(--color-primary-light)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-primary-bg)'; e.currentTarget.style.boxShadow = '0 0 16px var(--color-primary-bg)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-primary-bg)'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <Plus className="w-3.5 h-3.5" />
                Novo Follow-up
              </button>
            </div>

            {followups.length === 0 ? (
              <div className="p-8 flex flex-col items-center justify-center gap-2 mt-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '16px' }}>
                <Clock className="w-8 h-8" style={{ color: 'rgba(255,255,255,0.15)' }} />
                <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.5)' }}>Nenhum follow-up configurado</p>
                <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Clique em "+ Novo Follow-up" para criar</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                {followups.map((msg, index) => (
                  <FollowupCard
                    key={msg.id}
                    mensagem={editData[msg.id] || msg}
                    variant="followup"
                    telefoneTeste=""
                    isModified={modifiedIds.has(msg.id)}
                    isSaving={savingCards.has(msg.id)}
                    isFirst={index === 0}
                    isLast={index === followups.length - 1}
                    onUpdate={(updates) => updateMensagem(msg.id, updates)}
                    onSave={() => handleSaveCard(msg.id, true)}
                    onToggleActive={(nextActive) => handleToggleAtivo(msg.id, nextActive)}
                    onDelete={() => setDeleteTarget(editData[msg.id] || msg)}
                    onMoveUp={() => handleMoveFollowup(index, 'up')}
                    onMoveDown={() => handleMoveFollowup(index, 'down')}
                    onShowToast={showToast}
                    voiceEnabled={hasVoiceId}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── Seção: Boas-vindas ── */}
          <section>
            <div className="mb-2">
              <h2 className="text-[15px] font-bold text-txt font-display tracking-tight">
                Boas-vindas no Grupo
              </h2>
              <p className="text-[11px] text-txt-dim font-mono mt-0.5">
                Mensagem enviada quando o lead entra no grupo da comunidade
              </p>
            </div>

            {boasVindas.length === 0 ? (
              <div className="p-8 flex flex-col items-center justify-center gap-2 mt-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '16px' }}>
                <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.5)' }}>Nenhuma mensagem de boas-vindas encontrada</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                {boasVindas.map((msg) => (
                  <FollowupCard
                    key={msg.id}
                    mensagem={editData[msg.id] || msg}
                    variant="boas_vindas"
                    telefoneTeste=""
                    isModified={modifiedIds.has(msg.id)}
                    isSaving={savingCards.has(msg.id)}
                    isFirst={true}
                    isLast={true}
                    onUpdate={(updates) => updateMensagem(msg.id, updates)}
                    onSave={() => handleSaveCard(msg.id, false)}
                    onToggleActive={(nextActive) => handleToggleAtivo(msg.id, nextActive)}
                    onShowToast={showToast}
                    voiceEnabled={hasVoiceId}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
           ABA: MENSAGENS DE ABERTURA
         ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'abertura' && (
        <MensagensAbertura showToast={showToast} />
      )}

      {/* ══════════════════════════════════════════════════════════════════
           MODAL: Criar Follow-up
         ══════════════════════════════════════════════════════════════════ */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="w-full max-w-md animate-slide-up"
            style={{ background: 'rgba(20,20,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '28px', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[16px] font-semibold text-white font-display">Novo Follow-up</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {[
                { label: 'Título *', value: createForm.titulo, key: 'titulo', placeholder: 'Ex: Não respondeu primeiro contato' },
                { label: 'Descrição', value: createForm.descricao, key: 'descricao', placeholder: 'Explicação curta do cenário' },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.5px] mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{field.label}</label>
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) => setCreateForm((p) => ({ ...p, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full text-white text-[13px] outline-none transition-all duration-200"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 14px' }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(var(--color-primary-rgb),0.3)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(var(--color-primary-rgb),0.08)' }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none' }}
                  />
                </div>
              ))}

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.5px] mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Status alvo *</label>
                <select
                  value={createForm.status_alvo}
                  onChange={(e) => setCreateForm((p) => ({ ...p, status_alvo: e.target.value }))}
                  className="w-full text-white text-[13px] outline-none cursor-pointer appearance-none transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 36px 10px 14px', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                >
                  <option value="" disabled>Selecione o status</option>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>{getStatusLabel(status)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.5px] mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Tempo de espera (minutos) *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={createForm.tempo_espera_minutos}
                  onChange={(e) => { const raw = e.target.value.replace(/\D/g, ''); setCreateForm((p) => ({ ...p, tempo_espera_minutos: raw === '' ? 0 : parseInt(raw, 10) })); }}
                  className="text-white text-[13px] text-center outline-none transition-all duration-200 w-32"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 14px' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(var(--color-primary-rgb),0.3)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(var(--color-primary-rgb),0.08)' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none' }}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.5px] mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Tipo de envio</label>
                <select
                  value={createForm.tipo_envio}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'audio' && !hasVoiceId) return;
                    setCreateForm((p) => ({ ...p, tipo_envio: val }));
                  }}
                  className="w-full text-white text-[13px] outline-none cursor-pointer appearance-none transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 36px 10px 14px', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                >
                  <option value="texto">Texto</option>
                  <option value="audio" disabled={!hasVoiceId}>Áudio{!hasVoiceId ? ' (indisponível)' : ''}</option>
                  <option value="imagem">Imagem</option>
                  <option value="video">Vídeo</option>
                </select>
                {!hasVoiceId && (
                  <p className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Audio indisponivel — configure voice_id no painel admin
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6" style={{ paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2.5 rounded-[10px] text-[13px] font-medium transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateFollowup}
                disabled={creating || !createForm.titulo.trim() || !createForm.status_alvo}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[10px] text-[13px] font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'var(--color-primary-bg)', border: '1px solid var(--color-primary-bg)', color: 'var(--color-primary-light)' }}
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Criar Follow-up
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
           MODAL: Confirmar Exclusão
         ══════════════════════════════════════════════════════════════════ */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-sm animate-slide-up"
            style={{ background: 'rgba(20,20,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '28px', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(248,113,113,0.12)' }}>
                <AlertTriangle className="w-5 h-5" style={{ color: '#f87171' }} />
              </div>
              <h3 className="text-[16px] font-semibold text-white font-display">Excluir follow-up</h3>
            </div>

            <p className="text-[13px] leading-relaxed mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Tem certeza que deseja excluir o follow-up{' '}
              <span className="font-semibold text-white">"{deleteTarget.titulo}"</span>?
              Esta ação não pode ser desfeita.
            </p>

            <div className="flex gap-3" style={{ paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-[10px] text-[13px] font-medium transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteFollowup}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[10px] text-[13px] font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171' }}
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast toast={toast} onClose={hideToast} />}
    </div>
  );
};
