import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { FlowDrawer } from './FlowDrawer';
import { Mic, MessageSquare, Clock, Target, Trash2, Plus, Loader2 } from 'lucide-react';
import { useMensagensFunil } from '../../../../hooks/useMensagensFunil';
import type { MensagemFunil } from '../../../../hooks/useMensagensFunil';
import { supabase } from '../../../../backend/client';
import { useAuthStore } from '../../../../stores/authStore';
import { useToast } from '../../../../hooks/useToast';
import { Toast } from '../../../Toast';

// Cenarios que nao devem aparecer no drawer de etapa (ja editados pelo GatilhoDrawer)
const CENARIOS_OCULTOS_NO_DRAWER_ETAPA = ['lead_chegou_gatilho'];

// Placeholders disponiveis para insercao no texto
const PLACEHOLDERS = [
  '{{nome}}',
  '{{wa_name}}',
  '{{lead_name}}',
  '{{lead_fullName}}',
  '{{lead_email}}',
];

// Valores dummy para preview
const PLACEHOLDER_VALUES: Record<string, string> = {
  '{{nome}}': 'João',
  '{{wa_name}}': 'João Silva',
  '{{lead_name}}': 'João',
  '{{lead_fullName}}': 'João Silva',
  '{{lead_email}}': 'joao@email.com',
};

function formatCenarioLabel(cenario: string): string {
  return cenario.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function replaceAll(text: string, map: Record<string, string>): string {
  let result = text;
  for (const [k, v] of Object.entries(map)) {
    result = result.split(k).join(v);
  }
  return result;
}

interface EtapaDrawerProps {
  open: boolean;
  onClose: () => void;
  secao: string;
  numero: number;
  titulo: string;
  onSaved?: () => void;
}

export const EtapaDrawer: React.FC<EtapaDrawerProps> = ({ open, onClose, secao, numero, titulo, onSaved }) => {
  const { data, fetchData } = useMensagensFunil();
  const { toast, showToast, hideToast } = useToast();

  // Cenarios da secao (excluindo os ocultos)
  const cenarios = useMemo(() => {
    return data
      .filter((m) => m.secao === secao && !CENARIOS_OCULTOS_NO_DRAWER_ETAPA.includes(m.cenario))
      .sort((a, b) => a.ordem - b.ordem || a.cenario.localeCompare(b.cenario));
  }, [data, secao]);

  // Estado: cenario ativo
  const [cenarioAtivoId, setCenarioAtivoId] = useState<string | null>(null);

  // Reset ao trocar de secao
  useEffect(() => {
    setCenarioAtivoId(null);
  }, [secao]);

  // Selecionar primeiro cenario
  useEffect(() => {
    if (!cenarioAtivoId && cenarios.length > 0) {
      setCenarioAtivoId(cenarios[0].id);
    }
  }, [cenarios, cenarioAtivoId]);

  // Estado local editavel do cenario ativo
  const cenarioOriginal = useMemo(
    () => cenarios.find((c) => c.id === cenarioAtivoId) ?? null,
    [cenarios, cenarioAtivoId]
  );

  const [editado, setEditado] = useState<MensagemFunil | null>(null);
  const [variacaoIdx, setVariacaoIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sincronizar estado local quando cenario ativo muda
  useEffect(() => {
    if (cenarioOriginal) {
      setEditado(JSON.parse(JSON.stringify(cenarioOriginal)));
      setVariacaoIdx(0);
    } else {
      setEditado(null);
    }
  }, [cenarioOriginal]);

  // Variacoes efetivas (variacoes ou [mensagens] se vazio)
  const variacoes: string[][] = useMemo(() => {
    if (!editado) return [['']];
    if (editado.variacoes && editado.variacoes.length > 0) return editado.variacoes;
    return [editado.mensagens.length > 0 ? editado.mensagens : ['']];
  }, [editado]);

  // Texto da variacao ativa (concatenado com \n pra editar como bloco)
  const textoAtivo = useMemo(() => {
    const v = variacoes[variacaoIdx] ?? variacoes[0] ?? [''];
    return v.join('\n');
  }, [variacoes, variacaoIdx]);

  // Clamp variacao idx
  useEffect(() => {
    if (variacaoIdx >= variacoes.length) setVariacaoIdx(Math.max(0, variacoes.length - 1));
  }, [variacoes.length, variacaoIdx]);

  // Diff detection
  const isDirty = useMemo(() => {
    if (!cenarioOriginal || !editado) return false;
    return JSON.stringify({
      tipo_envio: cenarioOriginal.tipo_envio,
      mensagens: cenarioOriginal.mensagens,
      variacoes: cenarioOriginal.variacoes,
      ativo: cenarioOriginal.ativo,
    }) !== JSON.stringify({
      tipo_envio: editado.tipo_envio,
      mensagens: editado.mensagens,
      variacoes: editado.variacoes,
      ativo: editado.ativo,
    });
  }, [cenarioOriginal, editado]);

  // ── Handlers ──

  const updateTexto = useCallback((novoTexto: string) => {
    if (!editado) return;
    const linhas = novoTexto.split('\n');
    const novasVariacoes = [...variacoes];
    novasVariacoes[variacaoIdx] = linhas;
    // Sincronizar mensagens com v1
    const novasMensagens = variacaoIdx === 0 ? linhas : editado.mensagens;
    setEditado({ ...editado, variacoes: novasVariacoes, mensagens: novasMensagens });
  }, [editado, variacoes, variacaoIdx]);

  const addVariacao = useCallback(() => {
    if (!editado) return;
    const novasVariacoes = [...variacoes, ['']];
    setEditado({ ...editado, variacoes: novasVariacoes });
    setVariacaoIdx(novasVariacoes.length - 1);
  }, [editado, variacoes]);

  const removeVariacao = useCallback((idx: number) => {
    if (!editado || idx === 0 || variacoes.length <= 1) return;
    const novasVariacoes = variacoes.filter((_, i) => i !== idx);
    setEditado({ ...editado, variacoes: novasVariacoes });
    setVariacaoIdx(Math.min(variacaoIdx, novasVariacoes.length - 1));
  }, [editado, variacoes, variacaoIdx]);

  const toggleTipoEnvio = useCallback((tipo: 'texto' | 'audio') => {
    if (!editado) return;
    setEditado({ ...editado, tipo_envio: tipo });
  }, [editado]);

  const toggleAtivo = useCallback(() => {
    if (!editado) return;
    setEditado({ ...editado, ativo: !editado.ativo });
  }, [editado]);

  const insertPlaceholder = useCallback((placeholder: string) => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const antes = textoAtivo.substring(0, start);
    const depois = textoAtivo.substring(end);
    updateTexto(antes + placeholder + depois);
    // Reposicionar cursor apos inserir
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + placeholder.length;
      el.setSelectionRange(pos, pos);
    });
  }, [textoAtivo, updateTexto]);

  // Troca de tab com alteracoes pendentes
  const handleTabClick = useCallback((id: string) => {
    if (id === cenarioAtivoId) return;
    if (isDirty) {
      if (!window.confirm('Você tem alterações não salvas. Continuar sem salvar?')) return;
    }
    setCenarioAtivoId(id);
  }, [cenarioAtivoId, isDirty]);

  // Fechar com verificacao
  const handleClose = useCallback(() => {
    if (isDirty) {
      if (!window.confirm('Você tem alterações não salvas. Deseja sair mesmo assim?')) return;
    }
    onClose();
  }, [isDirty, onClose]);

  // Salvar
  const handleSave = async () => {
    if (!editado || !isDirty) return;
    setSaving(true);
    try {
      const expertId = useAuthStore.getState().getActiveExpertId();
      const { error } = await supabase
        .from('mensagens_funil_v2')
        .update({
          tipo_envio: editado.tipo_envio,
          mensagens: editado.mensagens,
          variacoes: editado.variacoes,
          ativo: editado.ativo,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editado.id)
        .eq('expert_id', expertId);
      if (error) throw error;
      showToast('success', 'Cenário atualizado');
      await fetchData();
      onSaved?.();
    } catch (err: any) {
      console.error('[EtapaDrawer] Erro ao salvar:', err);
      showToast('error', 'Não foi possível salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [textoAtivo, variacaoIdx]);

  // Preview
  const previewTexto = useMemo(() => {
    if (!textoAtivo.trim()) return '';
    return replaceAll(textoAtivo, PLACEHOLDER_VALUES);
  }, [textoAtivo]);

  return (
    <>
      <FlowDrawer
        open={open}
        onClose={handleClose}
        title={titulo}
        subtitle={`Etapa ${numero}`}
        accentColor="#10b981"
        footer={
          <>
            <button
              onClick={handleClose}
              className="px-4 py-2 text-[13px] font-medium rounded-xl transition-colors duration-150"
              style={{ color: 'var(--c-t-50)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--c-glass-hover)'; e.currentTarget.style.color = 'rgb(var(--c-fg-rgb))'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgb(var(--c-fg-rgb) / 0.5)'; }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!isDirty || saving}
              className={`flex items-center gap-2 px-5 py-2 text-[13px] font-semibold rounded-xl transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed border ${isDirty ? 'flow-drawer-save-ready' : ''}`}
              style={isDirty ? {} : { background: 'var(--c-glass)', borderColor: 'var(--c-border)', color: 'var(--c-t-25)' }}
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </>
        }
      >
        {cenarios.length === 0 ? (
          <p className="text-[13px] italic" style={{ color: 'var(--c-t-40)' }}>
            Nenhum cenário encontrado nesta seção.
          </p>
        ) : (
          <div className="space-y-0">
            {/* ── Zona A: Tabs de cenarios ── */}
            {cenarios.length > 1 && (
              <div
                className="sticky top-0 z-10 pb-4 -mx-5 px-5 mb-4"
                style={{ background: 'var(--c-popup-bg)', borderBottom: '1px solid var(--c-border)' }}
              >
                <div
                  className="flex gap-1 p-1 rounded-lg overflow-x-auto"
                  style={{ background: 'var(--c-glass)', scrollbarWidth: 'thin', scrollbarColor: 'rgb(var(--c-fg-rgb) / 0.1) transparent' }}
                  role="tablist"
                >
                  {cenarios.map((c) => {
                    const isActive = c.id === cenarioAtivoId;
                    return (
                      <button
                        key={c.id}
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => handleTabClick(c.id)}
                        className={`shrink-0 px-3 py-1.5 rounded-md text-[12px] text-center transition-colors duration-150 whitespace-nowrap ${isActive ? 'flow-drawer-tab-active font-medium' : ''}`}
                        style={isActive ? {} : { color: 'var(--c-t-60)' }}
                        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = 'rgb(var(--c-fg-rgb) / 0.8)'; }}
                        onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = 'rgb(var(--c-fg-rgb) / 0.6)'; }}
                      >
                        {c.titulo || formatCenarioLabel(c.cenario)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {editado && (
              <div className="space-y-5" role="tabpanel" tabIndex={0}>
                {/* ── Zona B: Info do cenario ── */}
                <div>
                  <h3 className="text-[14px] font-medium text-txt">{editado.titulo || formatCenarioLabel(editado.cenario)}</h3>
                  {editado.descricao && (
                    <p className="text-[12px] mt-0.5 leading-relaxed" style={{ color: 'var(--c-t-50)' }}>
                      {editado.descricao}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-2.5">
                    {editado.tempo_espera_minutos != null && editado.tempo_espera_minutos > 0 && (
                      <span
                        className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px]"
                        style={{ background: 'var(--c-glass-hover)', border: '1px solid var(--c-border-strong)', color: 'var(--c-t-60)' }}
                      >
                        <Clock className="w-2.5 h-2.5" />
                        {editado.tempo_espera_minutos} min
                      </span>
                    )}
                    {editado.status_alvo && (
                      <span
                        className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px]"
                        style={{ background: 'var(--c-glass-hover)', border: '1px solid var(--c-border-strong)', color: 'var(--c-t-60)' }}
                      >
                        <Target className="w-2.5 h-2.5" />
                        {editado.status_alvo}
                      </span>
                    )}
                    {/* Toggle ativo */}
                    <button
                      onClick={toggleAtivo}
                      className="flex items-center gap-1.5 ml-auto"
                      role="switch"
                      aria-checked={editado.ativo}
                    >
                      <span className="text-[11px]" style={{ color: 'var(--c-t-50)' }}>
                        {editado.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                      <div
                        className={`relative w-8 h-[18px] rounded-full transition-colors duration-150 ${editado.ativo ? 'flow-drawer-toggle-on' : ''}`}
                        style={editado.ativo ? {} : { background: 'rgb(var(--c-fg-rgb) / 0.1)' }}
                      >
                        <div
                          className={`absolute top-[2px] w-[14px] h-[14px] rounded-full transition-transform duration-150 ${editado.ativo ? 'flow-drawer-toggle-dot-on' : ''}`}
                          style={{
                            background: editado.ativo ? undefined : 'rgb(var(--c-fg-rgb) / 0.3)',
                            transform: editado.ativo ? 'translateX(16px)' : 'translateX(2px)',
                          }}
                        />
                      </div>
                    </button>
                  </div>
                </div>

                {/* ── Zona C: Toggle tipo_envio ── */}
                <div className="flex gap-1.5" role="radiogroup" aria-label="Tipo de envio">
                  {([
                    { tipo: 'audio' as const, icon: Mic, label: 'Áudio' },
                    { tipo: 'texto' as const, icon: MessageSquare, label: 'Texto' },
                  ]).map(({ tipo, icon: Icon, label }) => {
                    const isActive = editado.tipo_envio === tipo;
                    return (
                      <button
                        key={tipo}
                        role="radio"
                        aria-checked={isActive}
                        onClick={() => toggleTipoEnvio(tipo)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] transition-colors duration-150 border ${isActive ? 'flow-drawer-tipo-active' : ''}`}
                        style={isActive ? {} : { background: 'var(--c-glass)', borderColor: 'var(--c-border-strong)', color: 'var(--c-t-60)' }}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* ── Zona D: Variacoes ── */}
                <div>
                  <p className="text-[11px] uppercase tracking-[0.08em] mb-2" style={{ color: 'var(--c-t-40)' }}>
                    Variações
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {variacoes.map((_, i) => {
                      const isActive = i === variacaoIdx;
                      return (
                        <button
                          key={i}
                          role="button"
                          aria-pressed={isActive}
                          onClick={() => setVariacaoIdx(i)}
                          className={`px-2.5 py-1 rounded-md text-[11px] transition-colors duration-150 border ${isActive ? 'flow-drawer-var-active' : ''}`}
                          style={isActive ? {} : { background: 'var(--c-glass)', borderColor: 'var(--c-border-strong)', color: 'var(--c-t-50)' }}
                        >
                          v{i + 1}
                        </button>
                      );
                    })}
                    <button
                      onClick={addVariacao}
                      className="flex items-center gap-1 px-2 py-1 text-[11px] rounded-md transition-colors duration-150"
                      style={{ color: 'var(--c-t-40)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#10b981'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'rgb(var(--c-fg-rgb) / 0.4)'; }}
                    >
                      <Plus className="w-3 h-3" />
                      Nova
                    </button>
                    {variacaoIdx > 0 && variacoes.length > 1 && (
                      <button
                        onClick={() => removeVariacao(variacaoIdx)}
                        className="p-1 rounded-md transition-colors duration-150 ml-auto"
                        style={{ color: 'var(--c-t-30)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(248,113,113,0.1)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'rgb(var(--c-fg-rgb) / 0.3)'; e.currentTarget.style.background = 'transparent'; }}
                        title="Remover variação"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Zona E: Editor ── */}
                <div>
                  {editado.tipo_envio === 'audio' && (
                    <p className="text-[11px] mb-2" style={{ color: 'var(--c-t-40)' }}>
                      Este texto será convertido em áudio com a voz clonada do expert (MiniMax)
                    </p>
                  )}
                  <textarea
                    ref={textareaRef}
                    value={textoAtivo}
                    onChange={(e) => updateTexto(e.target.value)}
                    aria-label="Mensagem do cenário"
                    className="w-full rounded-lg p-3 text-[13px] text-txt leading-relaxed resize-none outline-none transition-colors duration-150 flow-drawer-focus-border"
                    style={{
                      background: 'var(--c-glass)',
                      border: '1px solid var(--c-border-strong)',
                      minHeight: '120px',
                      maxHeight: '320px',
                    }}
                    placeholder="Escreva a mensagem..."
                  />
                </div>

                {/* ── Zona F: Placeholders ── */}
                <div>
                  <p className="text-[10px] uppercase tracking-[0.08em] mb-2" style={{ color: 'var(--c-t-40)' }}>
                    Placeholders disponíveis
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {PLACEHOLDERS.map((ph) => (
                      <button
                        key={ph}
                        onClick={() => insertPlaceholder(ph)}
                        className="px-2 py-0.5 rounded-md text-[11px] font-mono transition-colors duration-150"
                        style={{
                          background: 'rgba(139,92,246,0.1)',
                          border: '1px solid rgba(139,92,246,0.25)',
                          color: '#a78bfa',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(139,92,246,0.18)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(139,92,246,0.1)'; }}
                      >
                        {ph}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Zona G: Preview ── */}
                <div>
                  <p className="text-[10px] uppercase tracking-[0.08em] mb-2" style={{ color: 'var(--c-t-40)' }}>
                    Preview
                  </p>
                  <div
                    className="p-3 rounded-lg text-[12px] leading-relaxed whitespace-pre-wrap"
                    style={{ background: 'var(--c-glass-2)', border: '1px solid var(--c-border)' }}
                  >
                    {previewTexto ? (
                      <span style={{ color: 'var(--c-t-70)' }}>{previewTexto}</span>
                    ) : (
                      <span className="italic" style={{ color: 'var(--c-t-30)' }}>
                        Escreva uma mensagem para ver o preview
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </FlowDrawer>
      {toast && <Toast toast={toast} onClose={hideToast} />}
    </>
  );
};
