import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Loader2, Save, Plus, Trash2, ChevronUp, ChevronDown, Instagram, Megaphone, Copy, Check } from 'lucide-react';
import { supabase } from '../../backend/client';
import { useAuthStore } from '../../stores/authStore';
import { N8N_GEND } from '../../config/webhooks';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MensagemAbertura {
  id: number;
  mensagem: string;
  ativo: boolean;
  ordem: number;
  origem: string;
}

interface LocalMsg {
  id: number | null; // null = new
  mensagem: string;
  ativo: boolean;
  ordem: number;
  origem: string;
  _deleted?: boolean;
  _tempId?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const MensagensAbertura: React.FC<{
  showToast: (type: 'success' | 'error', msg: string) => void;
}> = ({ showToast }) => {
  const getActiveExpertId = useAuthStore((s) => s.getActiveExpertId);
  const [msgs, setMsgs] = useState<LocalMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const newInputRef = useRef<HTMLInputElement | null>(null);
  const pendingFocusRef = useRef<string | null>(null);

  // ─── Fetch ──────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const expertId = getActiveExpertId();
    let query = supabase
      .from('whatsapp_rotacao_mensagens')
      .select('*')
      .order('ordem');
    if (expertId) query = query.eq('expert_id', expertId);
    const { data, error } = await query;

    if (error) {
      showToast('error', 'Erro ao carregar mensagens de abertura');
      console.error(error);
    } else {
      setMsgs((data || []).map((m: MensagemAbertura) => ({ ...m, _deleted: false })));
      setDirty(false);
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Focus newly added input
  useEffect(() => {
    if (pendingFocusRef.current && newInputRef.current) {
      newInputRef.current.focus();
      pendingFocusRef.current = null;
    }
  });

  // ─── Helpers ────────────────────────────────────────────────────────────

  const getByOrigem = useCallback((origem: string) => {
    return msgs
      .filter(m => m.origem === origem && !m._deleted)
      .sort((a, b) => a.ordem - b.ordem);
  }, [msgs]);

  const updateMsg = useCallback((id: number | null, tempId: string | undefined, updates: Partial<LocalMsg>) => {
    setMsgs(prev => prev.map(m => {
      if (id !== null && m.id === id) return { ...m, ...updates };
      if (id === null && m._tempId && m._tempId === tempId) return { ...m, ...updates };
      return m;
    }));
    setDirty(true);
  }, []);

  const addMsg = useCallback((origem: string) => {
    const existing = msgs.filter(m => m.origem === origem && !m._deleted);
    const maxOrdem = existing.length > 0 ? Math.max(...existing.map(m => m.ordem)) : 0;
    const tempId = `new_${Date.now()}_${Math.random()}`;
    setMsgs(prev => [...prev, {
      id: null,
      mensagem: '',
      ativo: true,
      ordem: maxOrdem + 1,
      origem,
      _deleted: false,
      _tempId: tempId,
    }]);
    pendingFocusRef.current = tempId;
    setDirty(true);
  }, [msgs]);

  const deleteMsg = useCallback((id: number | null, tempId: string | undefined, origem: string) => {
    const active = msgs.filter(m => m.origem === origem && !m._deleted);
    if (active.length <= 1) {
      showToast('error', 'Necessario manter pelo menos 1 mensagem por origem');
      return;
    }
    if (id !== null) {
      setMsgs(prev => prev.map(m => m.id === id ? { ...m, _deleted: true } : m));
    } else {
      setMsgs(prev => prev.filter(m => !(m.id === null && m._tempId === tempId)));
    }
    setDirty(true);
  }, [msgs, showToast]);

  const moveMsg = useCallback((origem: string, index: number, direction: 'up' | 'down') => {
    const sorted = msgs
      .filter(m => m.origem === origem && !m._deleted)
      .sort((a, b) => a.ordem - b.ordem);
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;

    const a = sorted[index];
    const b = sorted[targetIdx];
    const aOrdem = a.ordem;
    const bOrdem = b.ordem;

    setMsgs(prev => prev.map(m => {
      const key = m.id !== null ? m.id : m._tempId;
      const aKey = a.id !== null ? a.id : a._tempId;
      const bKey = b.id !== null ? b.id : b._tempId;
      if (key === aKey) return { ...m, ordem: bOrdem };
      if (key === bKey) return { ...m, ordem: aOrdem };
      return m;
    }));
    setDirty(true);
  }, [msgs]);

  // ─── Save ───────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    try {
      // Deletions
      const toDelete = msgs.filter(m => m._deleted && m.id !== null);
      for (const m of toDelete) {
        const { error } = await supabase.from('whatsapp_rotacao_mensagens').delete().eq('id', m.id!);
        if (error) throw error;
      }

      // Inserts
      const expertId = getActiveExpertId();
      if (!expertId) throw new Error('Expert não identificado');
      const toInsert = msgs.filter(m => !m._deleted && m.id === null);
      for (const m of toInsert) {
        const { error } = await supabase.from('whatsapp_rotacao_mensagens').insert({
          expert_id: expertId,
          mensagem: m.mensagem,
          ativo: m.ativo,
          ordem: m.ordem,
          origem: m.origem,
        });
        if (error) throw error;
      }

      // Updates
      const toUpdate = msgs.filter(m => !m._deleted && m.id !== null);
      for (const m of toUpdate) {
        const { error } = await supabase.from('whatsapp_rotacao_mensagens')
          .update({ mensagem: m.mensagem, ativo: m.ativo, ordem: m.ordem })
          .eq('id', m.id!);
        if (error) throw error;
      }

      showToast('success', 'Mensagens de abertura salvas com sucesso');
      await fetchAll();
    } catch (err) {
      console.error(err);
      showToast('error', 'Erro ao salvar mensagens');
    } finally {
      setSaving(false);
    }
  };

  // ─── Rotation Preview ──────────────────────────────────────────────────

  const RotationPreview: React.FC<{ items: LocalMsg[] }> = ({ items }) => {
    const active = items.filter(m => m.ativo && m.mensagem.trim());
    if (active.length === 0) return null;

    const previewCount = Math.min(active.length + 1, 6);

    return (
      <div
        className="mt-4 rounded-xl overflow-hidden"
        style={{ background: 'var(--c-glass-2)', border: '1px solid var(--c-border)' }}
      >
        <div className="px-4 py-2.5" style={{ borderBottom: '1px solid var(--c-border)' }}>
          <span className="text-[10px] font-semibold uppercase tracking-[0.8px]" style={{ color: 'var(--c-t-30)' }}>
            Preview da rotacao
          </span>
        </div>
        <div className="px-4 py-3 space-y-1.5">
          {Array.from({ length: previewCount }).map((_, i) => {
            const msg = active[i % active.length];
            const isRepeat = i >= active.length;
            return (
              <div key={i} className="flex items-baseline gap-2.5">
                <span className="text-[11px] font-mono shrink-0" style={{ color: 'var(--c-t-20)', minWidth: '52px' }}>
                  Lead {i + 1} →
                </span>
                <span
                  className="text-[12px] leading-relaxed"
                  style={{ color: isRepeat ? 'rgb(var(--c-fg-rgb) / 0.25)' : 'rgb(var(--c-fg-rgb) / 0.55)' }}
                >
                  "{msg.mensagem}"
                  {isRepeat && (
                    <span className="text-[10px] ml-1.5" style={{ color: 'var(--c-t-15)' }}>(volta ao inicio)</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── Origin Section ────────────────────────────────────────────────────

  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const OriginSection: React.FC<{
    origem: string;
    label: string;
    description: string;
    icon: React.ReactNode;
    accentColor: string;
    accentBg: string;
    accentBorder: string;
    linkPath: string;
  }> = ({ origem, label, description, icon, accentColor, accentBg, accentBorder, linkPath }) => {
    const items = getByOrigem(origem);
    const expertId = getActiveExpertId();
    const linkUrl = expertId ? `${N8N_GEND}/${linkPath}?expert_id=${expertId}` : '';
    const isCopied = copiedLink === linkPath;

    return (
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--c-glass)', border: '1px solid var(--c-border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-4" style={{ borderBottom: '1px solid var(--c-border)' }}>
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: accentBg, border: `1px solid ${accentBorder}` }}
            >
              {icon}
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-txt font-display tracking-tight">{label}</h3>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--c-t-35)' }}>{description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {linkUrl && (
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(linkUrl);
                  setCopiedLink(linkPath);
                  setTimeout(() => setCopiedLink(null), 2000);
                }}
                className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg transition-all duration-200"
                style={{ color: isCopied ? '#34d399' : accentColor, background: isCopied ? 'rgba(52,211,153,0.08)' : accentBg, border: `1px solid ${isCopied ? 'rgba(52,211,153,0.2)' : accentBorder}` }}
                title={linkUrl}
              >
                {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {isCopied ? 'Copiado!' : 'Copiar link'}
              </button>
            )}
            <span
              className="text-[11px] font-mono px-2.5 py-1 rounded-lg"
              style={{ background: 'var(--c-glass)', color: 'var(--c-t-40)' }}
            >
              {items.length} {items.length === 1 ? 'mensagem' : 'mensagens'}
            </span>
          </div>
        </div>

        {/* Messages list */}
        <div className="px-3 sm:px-5 py-4 space-y-2">
          {items.length === 0 ? (
            <div className="py-8 flex flex-col items-center gap-2">
              <p className="text-[13px]" style={{ color: 'var(--c-t-40)' }}>Nenhuma mensagem configurada</p>
              <button
                onClick={() => addMsg(origem)}
                className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg transition-all duration-200"
                style={{ color: accentColor, background: accentBg, border: `1px solid ${accentBorder}` }}
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar primeira mensagem
              </button>
            </div>
          ) : (
            <>
              {items.map((msg, index) => {
                const identifier = msg.id !== null ? `id-${msg.id}` : msg._tempId!;
                const isNew = msg.id === null;
                return (
                  <div
                    key={identifier}
                    className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 group rounded-xl px-3 sm:px-3.5 py-2.5 transition-all duration-200"
                    style={{ background: 'var(--c-glass-2)', border: '1px solid var(--c-border)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--c-glass)'; e.currentTarget.style.borderColor = 'var(--c-border)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--c-glass-2)'; e.currentTarget.style.borderColor = 'var(--c-border)' }}
                  >
                    {/* Order number */}
                    <span className="text-[11px] font-mono w-5 text-center shrink-0" style={{ color: 'var(--c-t-25)' }}>
                      {index + 1}.
                    </span>

                    {/* Move buttons */}
                    <div className="hidden sm:flex flex-col gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <button
                        onClick={() => moveMsg(origem, index, 'up')}
                        disabled={index === 0}
                        className="p-0.5 rounded transition-all disabled:opacity-20"
                        style={{ color: 'var(--c-t-30)' }}
                        onMouseEnter={(e) => { if (index > 0) e.currentTarget.style.color = 'rgb(var(--c-fg-rgb) / 0.7)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'rgb(var(--c-fg-rgb) / 0.3)' }}
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => moveMsg(origem, index, 'down')}
                        disabled={index === items.length - 1}
                        className="p-0.5 rounded transition-all disabled:opacity-20"
                        style={{ color: 'var(--c-t-30)' }}
                        onMouseEnter={(e) => { if (index < items.length - 1) e.currentTarget.style.color = 'rgb(var(--c-fg-rgb) / 0.7)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'rgb(var(--c-fg-rgb) / 0.3)' }}
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Input */}
                    <input
                      ref={isNew && msg._tempId === pendingFocusRef.current ? newInputRef : undefined}
                      type="text"
                      value={msg.mensagem}
                      onChange={(e) => updateMsg(msg.id, msg._tempId, { mensagem: e.target.value })}
                      placeholder="Digite a mensagem..."
                      className="flex-1 min-w-0 text-[13px] text-txt outline-none bg-transparent placeholder-txt-dim"
                    />

                    {/* Toggle ativo */}
                    <button
                      onClick={() => updateMsg(msg.id, msg._tempId, { ativo: !msg.ativo })}
                      className="flex items-center gap-1.5 shrink-0 px-2 py-1 rounded-lg text-[10px] font-medium uppercase tracking-wide transition-all duration-200"
                      style={msg.ativo
                        ? { background: 'var(--color-primary-bg)', color: 'var(--color-primary-light)', border: '1px solid var(--color-primary-bg)' }
                        : { background: 'var(--c-glass)', color: 'var(--c-t-30)', border: '1px solid var(--c-border)' }
                      }
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: msg.ativo ? 'var(--color-primary-light)' : 'rgb(var(--c-fg-rgb) / 0.2)' }}
                      />
                      {msg.ativo ? 'Ativa' : 'Inativa'}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => deleteMsg(msg.id, msg._tempId, origem)}
                      className="p-1.5 rounded-lg sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-150"
                      style={{ color: 'var(--c-t-25)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(248,113,113,0.08)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'rgb(var(--c-fg-rgb) / 0.25)'; e.currentTarget.style.background = 'transparent' }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}

              {/* Add button */}
              <button
                onClick={() => addMsg(origem)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-medium transition-all duration-200"
                style={{ border: `1px dashed ${accentBorder}`, color: accentColor, background: accentBg }}
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar mensagem
              </button>

              {/* Preview */}
              <RotationPreview items={items} />
            </>
          )}
        </div>
      </div>
    );
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--c-t-30)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Description */}
      <p className="text-[13px] leading-relaxed" style={{ color: 'var(--c-t-45)' }}>
        Mensagens pre-preenchidas quando o lead clica no link do trafego. O sistema alterna automaticamente entre as mensagens (round-robin).
      </p>

      {/* Instagram */}
      <OriginSection
        origem="instagram"
        label="Instagram"
        description="Mensagens de abertura para leads vindos do Instagram"
        icon={<Instagram className="w-4.5 h-4.5" style={{ color: '#E1306C' }} />}
        accentColor="#E1306C"
        accentBg="rgba(225,48,108,0.08)"
        accentBorder="rgba(225,48,108,0.18)"
        linkPath="whatsapp-rotacao"
      />

      {/* Facebook */}
      <OriginSection
        origem="facebook"
        label="Facebook"
        description="Mensagens de abertura para leads vindos do Facebook"
        icon={<Megaphone className="w-4.5 h-4.5" style={{ color: '#60a5fa' }} />}
        accentColor="#60a5fa"
        accentBg="rgba(96,165,250,0.08)"
        accentBorder="rgba(96,165,250,0.18)"
        linkPath="whatsapp-rotacao-facebook"
      />

      {/* Save button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          style={dirty
            ? { background: 'var(--color-primary-bg)', border: '1px solid var(--color-primary-bg)', color: 'var(--color-primary-light)' }
            : { background: 'var(--c-glass)', border: '1px solid var(--c-border)', color: 'var(--c-t-25)' }
          }
          onMouseEnter={(e) => { if (dirty) { e.currentTarget.style.background = 'var(--color-primary-bg)'; e.currentTarget.style.boxShadow = '0 0 20px var(--color-primary-bg)' } }}
          onMouseLeave={(e) => { if (dirty) { e.currentTarget.style.background = 'var(--color-primary-bg)'; e.currentTarget.style.boxShadow = 'none' } }}
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Salvar Mensagens de Abertura
        </button>
      </div>
    </div>
  );
};
