import React, { useState, useEffect } from 'react';
import {
  Bot,
  Plus,
  Clock,
  MessageSquare,
  Pencil,
  Smartphone,
  Copy,
  Trash2,
  Loader2,
  Zap,
  FileText,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useBotPersonas } from '../../hooks/useBotPersonas';
import type { BotPersona, BotPersonaFormData, BotPersonaTemplate } from '../../hooks/useBotPersonas';
import { PersonaFormModal } from './PersonaFormModal';
import { ConfigWppModal } from './ConfigWppModal';

// ─── Helpers ───

const TOM_VOZ_LABELS: Record<string, string> = {
  muito_informal: 'Muito Informal',
  casual: 'Casual',
  neutro: 'Neutro',
  animado: 'Animado',
};

function gerarCorDoNome(nome: string): string {
  let hash = 0;
  for (let i = 0; i < nome.length; i++) {
    hash = nome.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 45%)`;
}

function getIniciais(nome: string): string {
  return nome.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

// ─── PersonaCard ───

interface PersonaCardProps {
  persona: BotPersona;
  onEdit: () => void;
  onConfigWpp: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const PersonaCard: React.FC<PersonaCardProps> = ({ persona, onEdit, onConfigWpp, onDuplicate, onDelete }) => {
  const cor = gerarCorDoNome(persona.nome);

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-200"
      style={{ background: 'var(--c-glass)', border: '1px solid var(--c-border)' }}
      onMouseEnter={(e) => { e.currentTarget.style.border = '1px solid var(--c-border)' }}
      onMouseLeave={(e) => { e.currentTarget.style.border = '1px solid var(--c-border)' }}
    >
      <div className="p-4">
        {/* Header — avatar + nome + badge */}
        <div className="flex items-start gap-3 mb-3">
          {persona.foto_url ? (
            <img src={persona.foto_url} alt={persona.nome} className="w-10 h-10 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white text-[13px] font-bold" style={{ background: cor }}>
              {getIniciais(persona.nome)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-semibold text-txt truncate">{persona.nome}</h3>
              <span
                className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full"
                style={persona.ativo
                  ? { background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }
                  : { background: 'var(--c-glass)', color: 'var(--c-t-40)', border: '1px solid var(--c-border)' }
                }
              >
                {persona.ativo ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            {/* Info linha */}
            <p className="text-[12px] text-txt-dim mt-0.5 truncate">
              {[persona.idade && `${persona.idade} anos`, persona.cidade, TOM_VOZ_LABELS[persona.tom_voz]].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>

        {/* Detalhes */}
        <div className="space-y-1.5 mb-3">
          <div className="flex items-center gap-2 text-[12px] text-txt-muted">
            <Clock className="w-3.5 h-3.5 text-txt-dim" />
            <span>{persona.horario_inicio.slice(0, 5)} – {persona.horario_fim.slice(0, 5)}</span>
          </div>
          <div className="flex items-center gap-2 text-[12px] text-txt-muted">
            <MessageSquare className="w-3.5 h-3.5 text-txt-dim" />
            <span>{persona.msgs_por_dia_min}–{persona.msgs_por_dia_max} msgs/dia</span>
          </div>
          <div className="flex items-center gap-2 text-[12px] text-txt-muted">
            <Bot className="w-3.5 h-3.5 text-txt-dim" />
            <span>{persona.chance_so_reagir}% só reage</span>
          </div>
          {persona.warmup_dias > 0 && (
            <div className="flex items-center gap-2 text-[12px]" style={{ color: 'rgba(250,204,60,0.7)' }}>
              <Zap className="w-3.5 h-3.5" style={{ color: 'rgba(250,204,60,0.5)' }} />
              <span>Warmup {persona.warmup_dias} dias</span>
            </div>
          )}
        </div>

        {/* Emojis preview */}
        {persona.emojis_favoritos.length > 0 && (
          <div className="flex items-center gap-1 mb-3">
            {persona.emojis_favoritos.slice(0, 6).map((e, i) => (
              <span key={i} className="text-[14px]">{e}</span>
            ))}
            {persona.emojis_favoritos.length > 6 && (
              <span className="text-[11px] text-txt-dim">+{persona.emojis_favoritos.length - 6}</span>
            )}
          </div>
        )}
      </div>

      {/* Ações */}
      <div className="flex items-center" style={{ borderTop: '1px solid var(--c-border)' }}>
        <button onClick={onEdit} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium text-txt-dim hover:text-txt-secondary hover:bg-glass transition-colors" title="Editar">
          <Pencil className="w-3.5 h-3.5" /> Editar
        </button>
        <div className="w-px h-5" style={{ background: 'var(--c-glass-hover)' }} />
        <button onClick={onConfigWpp} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium text-txt-dim hover:text-txt-secondary hover:bg-glass transition-colors" title="Configurar WhatsApp">
          <Smartphone className="w-3.5 h-3.5" /> WPP
        </button>
        <div className="w-px h-5" style={{ background: 'var(--c-glass-hover)' }} />
        <button onClick={onDuplicate} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium text-txt-dim hover:text-txt-secondary hover:bg-glass transition-colors" title="Duplicar">
          <Copy className="w-3.5 h-3.5" /> Duplicar
        </button>
        <div className="w-px h-5" style={{ background: 'var(--c-glass-hover)' }} />
        <button onClick={onDelete} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium text-red-400/60 hover:text-red-400 hover:bg-red-400/[0.04] transition-colors" title="Excluir">
          <Trash2 className="w-3.5 h-3.5" /> Excluir
        </button>
      </div>
    </div>
  );
};

// ─── Modal Escolher Origem ───

interface ChooseOriginModalProps {
  templates: BotPersonaTemplate[];
  loadingTemplates: boolean;
  onFromScratch: () => void;
  onFromTemplate: (template: BotPersonaTemplate) => void;
  onClose: () => void;
  onLoadTemplates: () => void;
}

const ChooseOriginModal: React.FC<ChooseOriginModalProps> = ({ templates, loadingTemplates, onFromScratch, onFromTemplate, onClose, onLoadTemplates }) => {
  useEffect(() => {
    onLoadTemplates();
  }, [onLoadTemplates]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} />
      <div
        className="relative w-full max-w-[440px] rounded-2xl shadow-2xl animate-fade-in"
        style={{ background: 'var(--c-popup-bg)', border: '1px solid var(--c-border-strong)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--c-border)' }}>
          <h2 className="text-[15px] font-bold text-txt">Criar Persona</h2>
          <button onClick={onClose} className="p-1.5 text-txt-dim hover:text-txt-secondary hover:bg-glass rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {/* Do zero */}
          <button
            onClick={onFromScratch}
            className="w-full flex items-center gap-3 p-4 rounded-xl text-left transition-all"
            style={{ background: 'var(--c-glass-2)', border: '1px solid var(--c-border)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.06)'; e.currentTarget.style.borderColor = 'rgba(var(--color-primary-rgb),0.15)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--c-glass-2)'; e.currentTarget.style.borderColor = 'var(--c-border)' }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(var(--color-primary-rgb),0.1)' }}>
              <Plus className="w-5 h-5" style={{ color: 'var(--color-primary-light)' }} />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-txt">Criar do zero</p>
              <p className="text-[11px] text-txt-dim">Configure todos os campos manualmente</p>
            </div>
          </button>

          {/* Templates */}
          <div>
            <p className="text-[11px] uppercase tracking-wider text-txt-dim font-medium mb-2 px-1">Usar template</p>
            {loadingTemplates ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 text-txt-dim animate-spin" />
              </div>
            ) : templates.length === 0 ? (
              <p className="text-[12px] text-txt-dim text-center py-4">Nenhum template disponível</p>
            ) : (
              <div className="space-y-2">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onFromTemplate(t)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                    style={{ background: 'var(--c-glass-2)', border: '1px solid var(--c-border)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.06)'; e.currentTarget.style.borderColor = 'rgba(var(--color-primary-rgb),0.15)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--c-glass-2)'; e.currentTarget.style.borderColor = 'var(--c-border)' }}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(250,204,60,0.08)' }}>
                      <FileText className="w-4 h-4" style={{ color: 'rgba(250,204,60,0.6)' }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-txt truncate">{t.nome}</p>
                      {t.descricao && <p className="text-[11px] text-txt-dim truncate">{t.descricao}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Modal Confirmar Exclusão ───

interface ConfirmDeleteModalProps {
  personaNome: string;
  onConfirm: () => void;
  onClose: () => void;
  deleting: boolean;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({ personaNome, onConfirm, onClose, deleting }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} />
    <div
      className="relative w-full max-w-[400px] rounded-2xl shadow-2xl animate-fade-in"
      style={{ background: 'var(--c-popup-bg)', border: '1px solid var(--c-border-strong)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-6 text-center">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(248,113,113,0.1)' }}>
          <Trash2 className="w-6 h-6 text-red-400" />
        </div>
        <h3 className="text-[15px] font-bold text-txt mb-2">Excluir persona</h3>
        <p className="text-[13px] text-txt-muted">
          A persona <span className="text-txt font-medium">{personaNome}</span> será removida permanentemente. Esta ação não pode ser desfeita.
        </p>
      </div>
      <div className="flex items-center gap-3 px-6 pb-6">
        <button
          onClick={onClose}
          disabled={deleting}
          className="flex-1 px-4 py-2.5 text-[13px] font-medium rounded-xl transition-all"
          style={{ background: 'var(--c-glass)', border: '1px solid var(--c-border-strong)', color: 'var(--c-t-60)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--c-glass-hover)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--c-glass)' }}
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          disabled={deleting}
          className="flex-1 px-4 py-2.5 text-[13px] font-semibold rounded-xl transition-all disabled:opacity-50"
          style={{ background: '#ef4444', color: '#fff' }}
          onMouseEnter={(e) => { if (!deleting) e.currentTarget.style.background = '#dc2626' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#ef4444' }}
        >
          {deleting ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null}
          Excluir
        </button>
      </div>
    </div>
  </div>
);

// ─── PersonasTab (principal) ───

interface PersonasTabProps {
  showToast: (type: 'success' | 'error', message: string) => void;
}

export const PersonasTab: React.FC<PersonasTabProps> = ({ showToast }) => {
  const {
    personas,
    templates,
    loading,
    loadingTemplates,
    fetchTemplates,
    criarPersona,
    editarPersona,
    deletarPersona,
    criarDeTemplate,
    duplicarPersona,
    configurarPerfilWpp,
  } = useBotPersonas();

  // ── State modais ──
  const [showOriginModal, setShowOriginModal] = useState(false);
  const [formModal, setFormModal] = useState<{ mode: 'create' | 'edit'; initial?: Partial<BotPersonaFormData>; editId?: string } | null>(null);
  const [configWppPersona, setConfigWppPersona] = useState<BotPersona | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BotPersona | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Handlers ──
  const handleFromScratch = () => {
    setShowOriginModal(false);
    setFormModal({ mode: 'create' });
  };

  const handleFromTemplate = async (template: BotPersonaTemplate) => {
    try {
      const data = await criarDeTemplate(template.id);
      setShowOriginModal(false);
      setFormModal({ mode: 'create', initial: data });
    } catch (err: unknown) {
      showToast('error', 'Erro ao carregar template');
    }
  };

  const handleSavePersona = async (data: BotPersonaFormData) => {
    setSaving(true);
    try {
      if (formModal?.mode === 'edit' && formModal.editId) {
        await editarPersona(formModal.editId, data);
        showToast('success', 'Persona atualizada');
      } else {
        await criarPersona(data);
        showToast('success', 'Persona criada');
      }
      setFormModal(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar';
      showToast('error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (persona: BotPersona) => {
    setFormModal({
      mode: 'edit',
      editId: persona.id,
      initial: {
        nome: persona.nome,
        foto_url: persona.foto_url,
        idade: persona.idade,
        cidade: persona.cidade,
        profissao: persona.profissao,
        tom_voz: persona.tom_voz,
        girias: persona.girias,
        emojis_favoritos: persona.emojis_favoritos,
        exemplos_frases: persona.exemplos_frases,
        horario_inicio: persona.horario_inicio,
        horario_fim: persona.horario_fim,
        msgs_por_dia_min: persona.msgs_por_dia_min,
        msgs_por_dia_max: persona.msgs_por_dia_max,
        chance_so_reagir: persona.chance_so_reagir,
        emojis_reacao: persona.emojis_reacao,
        warmup_dias: persona.warmup_dias,
        warmup_progressao: persona.warmup_progressao,
        ausencia_habilitada: persona.ausencia_habilitada,
        ausencia_frequencia_dias: persona.ausencia_frequencia_dias,
        ausencia_duracao_min: persona.ausencia_duracao_min,
        ausencia_duracao_max: persona.ausencia_duracao_max,
        blacklist_palavras: persona.blacklist_palavras,
        blacklist_atitudes: persona.blacklist_atitudes,
        system_prompt_extra: persona.system_prompt_extra,
        template_origem_id: persona.template_origem_id,
        ativo: persona.ativo,
      },
    });
  };

  const handleDuplicate = async (persona: BotPersona) => {
    try {
      await duplicarPersona(persona);
      showToast('success', `Persona duplicada: Cópia de ${persona.nome}`);
    } catch (err: unknown) {
      showToast('error', 'Erro ao duplicar persona');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletarPersona(deleteTarget.id);
      showToast('success', 'Persona excluída');
      setDeleteTarget(null);
    } catch (err: unknown) {
      showToast('error', 'Erro ao excluir persona');
    } finally {
      setDeleting(false);
    }
  };

  const handleConfigWppSave = async (data: { nome_wpp: string; foto_wpp: string; instancia_id: number | null; instancia_nome: string; token: string }) => {
    if (!data.instancia_nome || !data.token) {
      showToast('error', 'Selecione uma instância conectada');
      return;
    }
    try {
      await configurarPerfilWpp(data.instancia_nome, data.token, data.nome_wpp, data.foto_wpp || undefined);
      // Salvar vinculo da instancia + nome/foto atualizados na persona
      if (configWppPersona) {
        const updates: Record<string, unknown> = {};
        if (data.instancia_id) updates.instancia_id = data.instancia_id;
        if (data.nome_wpp && data.nome_wpp !== configWppPersona.nome) updates.nome = data.nome_wpp;
        if (data.foto_wpp && data.foto_wpp !== (configWppPersona.foto_url || '')) updates.foto_url = data.foto_wpp;
        if (Object.keys(updates).length > 0) {
          await editarPersona(configWppPersona.id, updates as any);
        }
        // Atualizar instancia_id em bot_grupo_personas (vinculos persona→grupo)
        if (data.instancia_id) {
          await supabase
            .from('bot_grupo_personas')
            .update({ instancia_id: data.instancia_id })
            .eq('bot_persona_id', configWppPersona.id);
        }
      }
      showToast('success', 'Perfil WhatsApp configurado com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao configurar perfil';
      showToast('error', msg);
    }
    setConfigWppPersona(null);
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-txt-dim animate-spin" />
      </div>
    );
  }

  // ── Estado vazio ──
  if (personas.length === 0) {
    return (
      <>
        <div
          className="flex flex-col items-center justify-center py-20 rounded-2xl"
          style={{ background: 'var(--c-glass-2)', border: '1px solid var(--c-border)' }}
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--c-glass)', border: '1px solid var(--c-border)' }}>
            <Bot className="w-7 h-7" style={{ color: 'var(--c-t-15)' }} />
          </div>
          <p className="text-[15px] font-medium mb-1" style={{ color: 'var(--c-t-30)' }}>Nenhuma persona criada</p>
          <p className="text-[12px] mb-5" style={{ color: 'var(--c-t-15)' }}>Crie personas para seus bots de engajamento</p>
          <button
            onClick={() => setShowOriginModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold rounded-xl transition-all"
            style={{ background: 'var(--color-primary)', color: '#fff', boxShadow: '0 2px 12px rgba(var(--color-primary-rgb),0.2)' }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(var(--color-primary-rgb),0.3)' }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(var(--color-primary-rgb),0.2)' }}
          >
            <Plus className="w-4 h-4" />
            Criar Persona
          </button>
        </div>

        {showOriginModal && (
          <ChooseOriginModal
            templates={templates}
            loadingTemplates={loadingTemplates}
            onFromScratch={handleFromScratch}
            onFromTemplate={handleFromTemplate}
            onClose={() => setShowOriginModal(false)}
            onLoadTemplates={fetchTemplates}
          />
        )}
        {formModal && (
          <PersonaFormModal
            title={formModal.mode === 'edit' ? 'Editar Persona' : 'Nova Persona'}
            initial={formModal.initial}
            onSave={handleSavePersona}
            onClose={() => setFormModal(null)}
            saving={saving}
          />
        )}
      </>
    );
  }

  // ── Lista ──
  return (
    <>
      {/* Header com botão criar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] text-txt-dim">{personas.length} persona{personas.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setShowOriginModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-[12px] font-semibold rounded-xl transition-all"
          style={{ background: 'rgba(var(--color-primary-rgb),0.15)', border: '1px solid rgba(var(--color-primary-rgb),0.25)', color: 'var(--color-primary-light)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.25)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.15)' }}
        >
          <Plus className="w-3.5 h-3.5" />
          Criar Persona
        </button>
      </div>

      {/* Grid de cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {personas.map((persona) => (
          <PersonaCard
            key={persona.id}
            persona={persona}
            onEdit={() => handleEdit(persona)}
            onConfigWpp={() => setConfigWppPersona(persona)}
            onDuplicate={() => handleDuplicate(persona)}
            onDelete={() => setDeleteTarget(persona)}
          />
        ))}
      </div>

      {/* Modais */}
      {showOriginModal && (
        <ChooseOriginModal
          templates={templates}
          loadingTemplates={loadingTemplates}
          onFromScratch={handleFromScratch}
          onFromTemplate={handleFromTemplate}
          onClose={() => setShowOriginModal(false)}
          onLoadTemplates={fetchTemplates}
        />
      )}
      {formModal && (
        <PersonaFormModal
          title={formModal.mode === 'edit' ? 'Editar Persona' : 'Nova Persona'}
          initial={formModal.initial}
          onSave={handleSavePersona}
          onClose={() => setFormModal(null)}
          saving={saving}
        />
      )}
      {configWppPersona && (
        <ConfigWppModal
          personaNome={configWppPersona.nome}
          personaFotoUrl={configWppPersona.foto_url}
          currentInstanciaId={configWppPersona.instancia_id}
          onClose={() => setConfigWppPersona(null)}
          onSave={handleConfigWppSave}
        />
      )}
      {deleteTarget && (
        <ConfirmDeleteModal
          personaNome={deleteTarget.nome}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}
    </>
  );
};
