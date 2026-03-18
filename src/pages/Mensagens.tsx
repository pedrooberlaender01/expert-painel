import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Loader2, Save, Phone, GitBranch, Clock, ChevronDown, Plus, X, AlertTriangle, Trash2 } from 'lucide-react';
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

const SECOES_COM_TEMPO = new Set(['followups', 'boas_vindas']);
const CENARIOS_EMPTY_ALLOWED = new Set(['outro']);

type TabKey = 'funil' | 'followups';

const TABS: { key: TabKey; label: string; icon: typeof GitBranch; secoes: string[] }[] = [
  {
    key: 'funil',
    label: 'Etapas do Funil',
    icon: GitBranch,
    secoes: ['lead_chegou', 'primeiro_contato', 'convite', 'confirmacao_entrada'],
  },
  {
    key: 'followups',
    label: 'Follow-ups & Automáticas',
    icon: Clock,
    secoes: ['followups', 'boas_vindas'],
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

const formatPhone = (raw: string): string => {
  const d = raw.replace(/\D/g, '').slice(0, 13);
  if (!d) return '';
  if (d.length <= 2) return `+${d}`;
  if (d.length <= 4) return `+${d.slice(0, 2)} (${d.slice(2)}`;
  if (d.length <= 9) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4)}`;
  return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
};

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
    data, loading, telefoneTeste, fetchData,
    salvarTelefoneTeste, salvarSecao, salvarCard,
    criarFollowup, excluirFollowup, reordenarFollowups, toggleAtivo,
  } = useMensagensFunil();
  const { toast, showToast, hideToast } = useToast();

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

  // Phone input
  const [phoneInput, setPhoneInput] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);

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
        map[m.id] = { ...m, mensagens: [...m.mensagens] };
      });
      setEditData(map);
      setModifiedIds(new Set());
    }
  }, [data]);

  // Initialize phone from hook
  useEffect(() => {
    if (telefoneTeste) {
      setPhoneInput(formatPhone(telefoneTeste));
    }
  }, [telefoneTeste]);

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

  const handleSavePhone = async () => {
    const digits = phoneInput.replace(/\D/g, '');
    if (digits.length < 12) {
      showToast('error', 'Número incompleto. Use o formato +55 (XX) XXXXX-XXXX');
      return;
    }
    setSavingPhone(true);
    try {
      const erro = await salvarTelefoneTeste(digits);
      if (erro) {
        showToast('error', erro);
      } else {
        showToast('success', 'Telefone de teste salvo!');
      }
    } catch (err) {
      console.error('[handleSavePhone] Erro:', err);
      showToast('error', 'Erro ao salvar telefone');
    } finally {
      setSavingPhone(false);
    }
  };

  const handleSaveSection = async (secao: string) => {
    const mensagens = getMensagensSecao(secao);
    const modified = mensagens.filter((m) => modifiedIds.has(m.id));
    if (modified.length === 0) return;

    console.log('[handleSaveSection]', secao, 'modificados:', modified.length, modified.map((m) => m.cenario));
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

      {/* Telefone de teste */}
      <section className="card-dark p-5 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1">
            <label className="block text-[10px] font-mono font-semibold text-txt-muted mb-2 uppercase tracking-widest">
              Número de teste
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-dim" />
              <input
                type="text"
                value={phoneInput}
                onChange={(e) => setPhoneInput(formatPhone(e.target.value))}
                placeholder="+55 (00) 00000-0000"
                className="input-dark !pl-10"
              />
            </div>
            <p className="text-[10px] text-txt-dim mt-1.5">
              As mensagens de teste serão enviadas para este número
            </p>
          </div>
          <button
            onClick={handleSavePhone}
            disabled={savingPhone}
            className="btn-primary flex items-center gap-2 text-[12px] px-5 py-2.5 shrink-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none"
          >
            {savingPhone ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Salvar
          </button>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-surface-50 border border-surface-300/20 mb-8">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200',
              activeTab === tab.key
                ? 'bg-[#004AFF]/10 text-[#004AFF] border-glow shadow-sm'
                : 'text-txt-muted hover:text-txt hover:bg-surface-200/30'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
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
                  className="w-full flex items-center justify-between gap-3 px-6 py-5 rounded-xl border border-surface-300/15 bg-surface-50/50 hover:bg-surface-200/30 hover:border-surface-300/25 transition-all duration-200 group"
                >
                  <div className="text-left">
                    <h2 className="text-[15px] font-bold text-txt font-display tracking-tight">
                      {secao.titulo}
                    </h2>
                    <p className="text-[11px] text-txt-dim font-mono mt-1">
                      {mensagens.length} {mensagens.length === 1 ? 'mensagem' : 'mensagens'} configuradas
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {hasChanges && (
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20">
                        Alterado
                      </span>
                    )}
                    <ChevronDown
                      className={cn(
                        'w-5 h-5 text-txt-dim group-hover:text-txt-muted transition-all duration-300',
                        isExpanded && 'rotate-180'
                      )}
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
                            mensagem={msg}
                            isModified={modifiedIds.has(msg.id)}
                            telefoneTeste={telefoneTeste}
                            hasTempoEspera={hasTempoEspera}
                            allowEmptyMessages={CENARIOS_EMPTY_ALLOWED.has(msg.cenario)}
                            showAtivoToggle={hasTempoEspera}
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
                        className={cn(
                          'flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200',
                          hasChanges
                            ? 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/20'
                            : 'bg-surface-200/40 text-txt-dim cursor-not-allowed'
                        )}
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
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-semibold bg-emerald-500 text-white hover:bg-emerald-400 transition-all duration-200 shadow-lg shadow-emerald-500/20 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo Follow-up
              </button>
            </div>

            {followups.length === 0 ? (
              <div className="card-dark p-8 flex flex-col items-center justify-center gap-2 mt-4">
                <Clock className="w-8 h-8 text-txt-dim" />
                <p className="text-[13px] text-txt-muted">Nenhum follow-up configurado</p>
                <p className="text-[11px] text-txt-dim">Clique em "+ Novo Follow-up" para criar</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                {followups.map((msg, index) => (
                  <FollowupCard
                    key={msg.id}
                    mensagem={editData[msg.id] || msg}
                    variant="followup"
                    telefoneTeste={telefoneTeste}
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
              <div className="card-dark p-8 flex flex-col items-center justify-center gap-2 mt-4">
                <p className="text-[13px] text-txt-muted">Nenhuma mensagem de boas-vindas encontrada</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                {boasVindas.map((msg) => (
                  <FollowupCard
                    key={msg.id}
                    mensagem={editData[msg.id] || msg}
                    variant="boas_vindas"
                    telefoneTeste={telefoneTeste}
                    isModified={modifiedIds.has(msg.id)}
                    isSaving={savingCards.has(msg.id)}
                    isFirst={true}
                    isLast={true}
                    onUpdate={(updates) => updateMensagem(msg.id, updates)}
                    onSave={() => handleSaveCard(msg.id, false)}
                    onToggleActive={(nextActive) => handleToggleAtivo(msg.id, nextActive)}
                    onShowToast={showToast}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
           MODAL: Criar Follow-up
         ══════════════════════════════════════════════════════════════════ */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="card-dark-elevated w-full max-w-md p-6 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[16px] font-bold text-txt font-display">Novo Follow-up</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-txt-dim hover:text-txt hover:bg-surface-200/30 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Título */}
              <div>
                <label className="block text-[10px] font-mono font-semibold text-txt-muted mb-1.5 uppercase tracking-widest">
                  Título *
                </label>
                <input
                  type="text"
                  value={createForm.titulo}
                  onChange={(e) => setCreateForm((p) => ({ ...p, titulo: e.target.value }))}
                  placeholder="Ex: Não respondeu primeiro contato"
                  className="input-dark text-[13px]"
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-[10px] font-mono font-semibold text-txt-muted mb-1.5 uppercase tracking-widest">
                  Descrição
                </label>
                <input
                  type="text"
                  value={createForm.descricao}
                  onChange={(e) => setCreateForm((p) => ({ ...p, descricao: e.target.value }))}
                  placeholder="Explicação curta do cenário"
                  className="input-dark text-[13px]"
                />
              </div>

              {/* Status Alvo */}
              <div>
                <label className="block text-[10px] font-mono font-semibold text-txt-muted mb-1.5 uppercase tracking-widest">
                  Status alvo *
                </label>
                <select
                  value={createForm.status_alvo}
                  onChange={(e) => setCreateForm((p) => ({ ...p, status_alvo: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl text-[13px] text-txt bg-surface outline-none border border-surface-200 focus:border-[#004AFF]/30 transition-colors appearance-none cursor-pointer"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', background: 'rgba(20, 20, 22, 0.6)' }}
                >
                  <option value="" disabled>Selecione o status</option>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {getStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tempo de espera */}
              <div>
                <label className="block text-[10px] font-mono font-semibold text-txt-muted mb-1.5 uppercase tracking-widest">
                  Tempo de espera (minutos) *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={createForm.tempo_espera_minutos}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setCreateForm((p) => ({ ...p, tempo_espera_minutos: raw === '' ? 0 : parseInt(raw, 10) }));
                  }}
                  className="input-dark text-[13px] w-32 text-center"
                />
              </div>

              {/* Tipo envio */}
              <div>
                <label className="block text-[10px] font-mono font-semibold text-txt-muted mb-1.5 uppercase tracking-widest">
                  Tipo de envio
                </label>
                <select
                  value={createForm.tipo_envio}
                  onChange={(e) => setCreateForm((p) => ({ ...p, tipo_envio: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl text-[13px] text-txt bg-surface outline-none border border-surface-200 focus:border-[#004AFF]/30 transition-colors appearance-none cursor-pointer"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', background: 'rgba(20, 20, 22, 0.6)' }}
                >
                  <option value="texto">Texto</option>
                  <option value="audio">Áudio</option>
                  <option value="imagem">Imagem</option>
                  <option value="video">Vídeo</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-medium text-txt-muted border border-surface-200 hover:bg-surface-200/30 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateFollowup}
                disabled={creating || !createForm.titulo.trim() || !createForm.status_alvo}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold bg-emerald-500 text-white hover:bg-emerald-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="card-dark-elevated w-full max-w-sm p-6 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <h3 className="text-[15px] font-bold text-txt font-display">Excluir follow-up</h3>
            </div>

            <p className="text-[13px] text-txt-secondary leading-relaxed mb-6">
              Tem certeza que deseja excluir o follow-up{' '}
              <span className="font-semibold text-txt">"{deleteTarget.titulo}"</span>?
              Esta ação não pode ser desfeita.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-medium text-txt-muted border border-surface-200 hover:bg-surface-200/30 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteFollowup}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold bg-rose-500 text-white hover:bg-rose-400 transition-all disabled:opacity-50 shadow-lg shadow-rose-500/20"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
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
