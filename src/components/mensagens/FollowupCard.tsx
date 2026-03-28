import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, FileText, Image, Video, Trash2, Plus, Play, Loader2, Save, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';
import { WEBHOOKS, fetchWithTimeout } from '../../config/webhooks';
import { getStatusLabel } from '../../utils/formatters';
import type { MensagemFunil } from '../../hooks/useMensagensFunil';

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

const TIPO_ENVIO_OPTIONS = [
  { key: 'texto', label: 'Texto', icon: FileText },
  { key: 'audio', label: 'Áudio', icon: Volume2 },
  { key: 'imagem', label: 'Imagem', icon: Image },
  { key: 'video', label: 'Vídeo', icon: Video },
] as const;

interface FollowupCardProps {
  mensagem: MensagemFunil;
  variant: 'followup' | 'boas_vindas';
  telefoneTeste: string;
  isModified: boolean;
  isSaving: boolean;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (updates: Partial<MensagemFunil>) => void;
  onSave: () => void;
  onToggleActive?: (nextActive: boolean) => void;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onShowToast: (type: 'success' | 'error', message: string) => void;
}

export const FollowupCard: React.FC<FollowupCardProps> = ({
  mensagem,
  variant,
  telefoneTeste,
  isModified,
  isSaving,
  isFirst,
  isLast,
  onUpdate,
  onSave,
  onToggleActive,
  onDelete,
  onMoveUp,
  onMoveDown,
  onShowToast,
}) => {
  const [testing, setTesting] = useState(false);
  const textareaRefs = useRef<Map<number, HTMLTextAreaElement>>(new Map());

  const isFollowup = variant === 'followup';
  const disabled = !mensagem.ativo;

  const autoResize = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, []);

  useEffect(() => {
    textareaRefs.current.forEach((el) => autoResize(el));
  }, [mensagem.mensagens, autoResize]);

  const setTextareaRef = useCallback((index: number, el: HTMLTextAreaElement | null) => {
    if (el) {
      textareaRefs.current.set(index, el);
      autoResize(el);
    } else {
      textareaRefs.current.delete(index);
    }
  }, [autoResize]);

  const updateMessage = (index: number, value: string) => {
    const newMensagens = [...mensagem.mensagens];
    newMensagens[index] = value;
    onUpdate({ mensagens: newMensagens });
  };

  const removeMessage = (index: number) => {
    const newMensagens = mensagem.mensagens.filter((_, i) => i !== index);
    onUpdate({ mensagens: newMensagens });
  };

  const addMessage = () => {
    onUpdate({ mensagens: [...mensagem.mensagens, ''] });
  };

  const insertVariable = (index: number, variable: string) => {
    const textarea = textareaRefs.current.get(index);
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = mensagem.mensagens[index];
    const newText = text.substring(0, start) + variable + text.substring(end);

    const newMensagens = [...mensagem.mensagens];
    newMensagens[index] = newText;
    onUpdate({ mensagens: newMensagens });

    requestAnimationFrame(() => {
      textarea.selectionStart = textarea.selectionEnd = start + variable.length;
      textarea.focus();
    });
  };

  const handleTest = async () => {
    if (!telefoneTeste) {
      onShowToast('error', 'Configure o número de teste no topo da página');
      return;
    }

    setTesting(true);
    try {
      const res = await fetchWithTimeout(WEBHOOKS.TESTE_MENSAGEM, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cenario: mensagem.cenario,
          tipo_envio: mensagem.tipo_envio,
          mensagens: mensagem.mensagens,
          nome_teste: 'Teste',
          telefone_teste: telefoneTeste.replace(/\D/g, ''),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onShowToast('success', 'Mensagem de teste enviada!');
    } catch {
      onShowToast('error', 'Erro ao enviar teste');
    } finally {
      setTesting(false);
    }
  };

  const renderPreview = () => {
    return mensagem.mensagens
      .filter((m) => m.trim())
      .map((msg, i) => {
        const preview = msg
          .replace(/\{\{nome\}\}/g, 'Teste')
          .replace(/\(inhale\)/g, '...');
        return (
          <div
            key={i}
            className="max-w-[85%] ml-auto bg-[#005c4b] text-white text-[13px] px-3.5 py-2 rounded-xl rounded-tr-sm leading-relaxed"
          >
            {preview}
          </div>
        );
      });
  };

  const canDeleteMessage = mensagem.mensagens.length > 1;

  return (
    <div
      className={cn(
        'card-dark p-5 transition-all duration-300',
        isModified && 'border-[#004AFF]/30',
        disabled && 'opacity-50'
      )}
      style={isModified && !disabled ? { borderColor: 'rgba(0, 74, 255, 0.3)' } : undefined}
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {isFollowup ? (
              <input
                type="text"
                value={mensagem.titulo}
                disabled={disabled}
                onChange={(e) => onUpdate({ titulo: e.target.value })}
                className={cn(
                  'text-sm font-semibold text-txt font-display bg-transparent outline-none border-b border-transparent focus:border-[#004AFF]/30 transition-colors w-full max-w-[280px]',
                  disabled && 'cursor-not-allowed'
                )}
                placeholder="Título do follow-up"
              />
            ) : (
              <h3 className="text-sm font-semibold text-txt font-display">{mensagem.titulo}</h3>
            )}
            {disabled && (
              <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-rose-500/15 text-rose-400 border border-rose-500/20">
                Desativado
              </span>
            )}
          </div>
          {isFollowup ? (
            <input
              type="text"
              value={mensagem.descricao || ''}
              disabled={disabled}
              onChange={(e) => onUpdate({ descricao: e.target.value })}
              className={cn(
                'text-[11px] text-txt-muted mt-0.5 bg-transparent outline-none border-b border-transparent focus:border-[#004AFF]/20 transition-colors w-full',
                disabled && 'cursor-not-allowed'
              )}
              placeholder="Descrição do cenário"
            />
          ) : (
            <p className="text-[11px] text-txt-muted mt-0.5">{mensagem.descricao}</p>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Reorder buttons (followup only) */}
          {isFollowup && (
            <>
              <button
                onClick={onMoveUp}
                disabled={isFirst || disabled}
                className="p-1 rounded-md text-txt-dim hover:text-txt-muted hover:bg-surface-200/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                title="Mover para cima"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onMoveDown}
                disabled={isLast || disabled}
                className="p-1 rounded-md text-txt-dim hover:text-txt-muted hover:bg-surface-200/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                title="Mover para baixo"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {/* Delete button (followup only) */}
          {isFollowup && onDelete && (
            <button
              onClick={onDelete}
              disabled={disabled}
              className="p-1.5 rounded-md text-txt-dim hover:text-rose-400 hover:bg-rose-500/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              title="Excluir follow-up"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Toggle ativo */}
          <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-1">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={mensagem.ativo}
              onChange={() => {
                const nextActive = !mensagem.ativo;
                onUpdate({ ativo: nextActive });
                onToggleActive?.(nextActive);
              }}
            />
            <div className="w-9 h-5 rounded-full transition-colors duration-200 bg-[#374151] peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
          </label>
        </div>
      </div>

      {/* ── Status Alvo (followup only) ── */}
      {isFollowup && (
        <div className="mb-4">
          <label className="block text-[10px] font-mono font-semibold text-txt-muted mb-1.5 uppercase tracking-widest">
            Status alvo
          </label>
          <select
            value={mensagem.status_alvo || ''}
            disabled={disabled}
            onChange={(e) => onUpdate({ status_alvo: e.target.value })}
            className={cn(
              'w-full px-3 py-2 rounded-xl text-[13px] text-txt bg-surface outline-none border border-surface-200 focus:border-[#004AFF]/30 transition-colors appearance-none cursor-pointer',
              disabled && 'cursor-not-allowed opacity-60'
            )}
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
          >
            <option value="" disabled>Selecione o status</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {getStatusLabel(status)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ── Tempo de Espera ── */}
      <div className="flex items-center gap-2 mb-4">
        <label className="text-[11px] text-txt-muted font-mono uppercase tracking-wider">
          Tempo de espera:
        </label>
        <input
          type="text"
          inputMode="numeric"
          disabled={disabled}
          value={mensagem.tempo_espera_minutos ?? ''}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, '');
            onUpdate({ tempo_espera_minutos: raw === '' ? null : parseInt(raw, 10) });
          }}
          className={cn(
            'w-20 px-3 py-1.5 rounded-lg text-[13px] text-txt bg-surface outline-none border border-surface-200 focus:border-[#004AFF]/30 transition-colors text-center',
            disabled && 'cursor-not-allowed'
          )}
        />
        <span className="text-[11px] text-txt-muted">minutos após última interação</span>
      </div>

      {/* ── Toggle Tipo Envio (4 opções) ── */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {TIPO_ENVIO_OPTIONS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onUpdate({ tipo_envio: key })}
            disabled={disabled}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-200 border',
              mensagem.tipo_envio === key
                ? 'bg-primary text-white border-primary'
                : 'bg-surface-50 text-txt-muted border-surface-200 hover:border-surface-300',
              disabled && 'pointer-events-none'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Mensagens ── */}
      <div className="space-y-3 mb-4">
        {mensagem.mensagens.map((msg, index) => (
          <div key={index} className="relative group">
            <textarea
              ref={(el) => setTextareaRef(index, el)}
              id={`textarea-${mensagem.cenario}-${index}`}
              value={msg}
              disabled={disabled}
              onChange={(e) => {
                updateMessage(index, e.target.value);
                autoResize(e.target);
              }}
              placeholder="Digite a mensagem..."
              className={cn(
                'w-full px-4 py-3 rounded-xl text-[13px] text-txt placeholder-txt-dim bg-surface outline-none border border-surface-200 focus:border-[#004AFF]/30 transition-all duration-200 resize-none leading-relaxed',
                disabled && 'cursor-not-allowed'
              )}
              style={{ minHeight: '80px' }}
            />

            {/* Variable buttons + delete */}
            {!disabled && (
              <div className="flex items-center justify-between mt-1.5">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => insertVariable(index, '{{nome}}')}
                    className="px-2 py-0.5 text-[10px] font-mono rounded-md bg-[#004AFF]/10 text-[#004AFF] hover:bg-[#004AFF]/20 transition-colors border border-[#004AFF]/20"
                  >
                    {'{{nome}}'}
                  </button>
                  {mensagem.tipo_envio === 'audio' && (
                    <button
                      onClick={() => insertVariable(index, '(inhale)')}
                      className="px-2 py-0.5 text-[10px] font-mono rounded-md bg-[#004AFF]/10 text-[#004AFF] hover:bg-[#004AFF]/20 transition-colors border border-[#004AFF]/20"
                    >
                      (inhale)
                    </button>
                  )}
                </div>

                {canDeleteMessage && (
                  <button
                    onClick={() => removeMessage(index)}
                    className="p-1.5 text-txt-dim hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    title="Remover mensagem"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Message */}
      {!disabled && (
        <button
          onClick={addMessage}
          className="flex items-center gap-1.5 text-[12px] font-medium text-primary-light hover:text-primary transition-colors mb-5 px-3 py-2 rounded-lg border border-dashed border-primary-bg hover:border-primary w-full justify-center"
        >
          <Plus className="w-3.5 h-3.5" />
          Adicionar mensagem
        </button>
      )}

      {/* Preview */}
      {mensagem.mensagens.some((m) => m.trim()) && (
        <div className="bg-[#111111] rounded-xl p-4 mb-4 space-y-2">
          <p className="text-[10px] font-mono text-txt-dim uppercase tracking-wider mb-3">
            Preview
          </p>
          {renderPreview()}
        </div>
      )}

      {/* ── Footer: Test + Save ── */}
      <div className="flex gap-2">
        {/* Test Button */}
        <button
          onClick={handleTest}
          disabled={disabled || testing || !mensagem.mensagens.some((m) => m.trim())}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[12px] font-medium transition-all duration-200 border',
            'text-txt-secondary border-surface-200 hover:border-[#004AFF]/30 hover:text-[#004AFF] hover:bg-[#004AFF]/5',
            'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-surface-200 disabled:hover:text-txt-secondary disabled:hover:bg-transparent'
          )}
        >
          {testing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Testando...
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              Testar
            </>
          )}
        </button>

        {/* Save Button */}
        <button
          onClick={onSave}
          disabled={disabled || isSaving || !isModified}
          className={cn(
            'flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-[12px] font-semibold transition-all duration-200',
            isModified && !disabled
              ? 'bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary-bg'
              : 'bg-surface-200/40 text-txt-dim cursor-not-allowed'
          )}
        >
          {isSaving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          Salvar
        </button>
      </div>
    </div>
  );
};
