import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Volume2, FileText, Trash2, Plus, Play, Loader2, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { WEBHOOKS, fetchWithTimeout } from '../../config/webhooks';
import type { MensagemFunil } from '../../hooks/useMensagensFunil';

interface MensagemCardProps {
  mensagem: MensagemFunil;
  isModified: boolean;
  telefoneTeste: string;
  hasTempoEspera: boolean;
  allowEmptyMessages: boolean;
  showAtivoToggle: boolean;
  hideTypeToggle?: boolean;
  voiceEnabled?: boolean;
  onUpdate: (updates: Partial<MensagemFunil>) => void;
  onShowToast: (type: 'success' | 'error', message: string) => void;
}

export const MensagemCard: React.FC<MensagemCardProps> = ({
  mensagem,
  isModified,
  telefoneTeste,
  hasTempoEspera,
  allowEmptyMessages,
  showAtivoToggle,
  hideTypeToggle,
  voiceEnabled = true,
  onUpdate,
  onShowToast,
}) => {
  const [testing, setTesting] = useState(false);
  const [activeVariation, setActiveVariation] = useState(0);
  const textareaRefs = useRef<Map<number, HTMLTextAreaElement>>(new Map());

  // Compute effective variations
  const variacoes: string[][] = useMemo(() => {
    if (mensagem.variacoes && mensagem.variacoes.length > 0) {
      return mensagem.variacoes;
    }
    return [mensagem.mensagens];
  }, [mensagem.variacoes, mensagem.mensagens]);

  const currentMessages = variacoes[activeVariation] ?? variacoes[0] ?? [''];

  // Clamp activeVariation
  useEffect(() => {
    if (activeVariation >= variacoes.length) {
      setActiveVariation(Math.max(0, variacoes.length - 1));
    }
  }, [variacoes.length, activeVariation]);

  const autoResize = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, []);

  useEffect(() => {
    textareaRefs.current.forEach((el) => autoResize(el));
  }, [currentMessages, autoResize, activeVariation]);

  const setTextareaRef = useCallback((index: number, el: HTMLTextAreaElement | null) => {
    if (el) {
      textareaRefs.current.set(index, el);
      autoResize(el);
    } else {
      textareaRefs.current.delete(index);
    }
  }, [autoResize]);

  // Variation helpers
  const updateVariacoes = useCallback((newVariacoes: string[][]) => {
    onUpdate({
      variacoes: newVariacoes,
      mensagens: newVariacoes[0] ?? [''],
    });
  }, [onUpdate]);

  const updateMessage = (index: number, value: string) => {
    const newVar = variacoes.map(v => [...v]);
    const newMsgs = [...currentMessages];
    newMsgs[index] = value;
    newVar[activeVariation] = newMsgs;
    updateVariacoes(newVar);
  };

  const removeMessage = (index: number) => {
    const newVar = variacoes.map(v => [...v]);
    newVar[activeVariation] = currentMessages.filter((_, i) => i !== index);
    updateVariacoes(newVar);
  };

  const addMessage = () => {
    const newVar = variacoes.map(v => [...v]);
    newVar[activeVariation] = [...currentMessages, ''];
    updateVariacoes(newVar);
  };

  const addVariation = () => {
    const newVar = [...variacoes.map(v => [...v]), ['']];
    updateVariacoes(newVar);
    setActiveVariation(newVar.length - 1);
  };

  const removeVariation = (index: number) => {
    if (variacoes.length <= 1) return;
    const newVar = variacoes.filter((_, i) => i !== index);
    updateVariacoes(newVar);
    if (activeVariation >= newVar.length) {
      setActiveVariation(newVar.length - 1);
    }
  };

  const insertVariable = (index: number, variable: string) => {
    const textarea = textareaRefs.current.get(index);
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = currentMessages[index];
    const newText = text.substring(0, start) + variable + text.substring(end);

    const newVar = variacoes.map(v => [...v]);
    const newMsgs = [...currentMessages];
    newMsgs[index] = newText;
    newVar[activeVariation] = newMsgs;
    updateVariacoes(newVar);

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
          mensagens: currentMessages,
          nome_teste: 'João',
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
    return currentMessages
      .filter((m) => m.trim())
      .map((msg, i) => {
        const preview = msg
          .replace(/\{\{nome\}\}/g, 'João')
          .replace(/\(inhale\)/g, '...');
        return (
          <div
            key={i}
            className="max-w-[85%] ml-auto text-white text-[13px] px-3.5 py-2 rounded-xl rounded-tr-sm leading-relaxed"
            style={{ background: 'linear-gradient(135deg, var(--color-primary-bg), var(--color-primary-bg))', border: '1px solid var(--color-primary-bg)' }}
          >
            {preview}
          </div>
        );
      });
  };

  const canDelete = allowEmptyMessages || currentMessages.length > 1;
  const disabled = showAtivoToggle && !mensagem.ativo;

  return (
    <div
      className={cn(
        'p-5 transition-all duration-300',
        disabled && 'opacity-50'
      )}
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: isModified && !disabled ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(255,255,255,0.04)',
        borderRadius: '16px',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white font-display">{mensagem.titulo}</h3>
            {disabled && (
              <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded" style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}>
                Desativado
              </span>
            )}
          </div>
          <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{mensagem.descricao}</p>
        </div>

        {showAtivoToggle && (
          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={mensagem.ativo}
              onChange={() => onUpdate({ ativo: !mensagem.ativo })}
            />
            <div
              className="w-[44px] h-[24px] rounded-full transition-all duration-300 relative"
              style={{
                background: mensagem.ativo ? 'var(--color-primary-bg)' : 'rgba(255,255,255,0.1)',
                border: mensagem.ativo ? '1px solid var(--color-primary-bg)' : '1px solid rgba(255,255,255,0.15)',
              }}
            >
              <div
                className="absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white transition-transform duration-300"
                style={{ transform: mensagem.ativo ? 'translateX(22px)' : 'translateX(2px)', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
              />
            </div>
          </label>
        )}
      </div>

      {/* Toggle Tipo Envio */}
      {!hideTypeToggle && (
        <div className="flex gap-2 mb-4">
          {[
            { key: 'audio', label: 'Áudio', icon: Volume2 },
            { key: 'texto', label: 'Texto', icon: FileText },
          ].map(({ key, label, icon: Icon }) => {
            const isAudioDisabled = key === 'audio' && !voiceEnabled;
            return (
              <button
                key={key}
                onClick={() => { if (!isAudioDisabled) onUpdate({ tipo_envio: key }); }}
                disabled={disabled || isAudioDisabled}
                title={isAudioDisabled ? 'Audio indisponivel — configure voice_id no painel admin' : undefined}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-200"
                style={mensagem.tipo_envio === key
                  ? { background: 'var(--color-primary-bg)', border: '1px solid var(--color-primary-bg)', color: 'var(--color-primary-light)' }
                  : isAudioDisabled
                    ? { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.2)', cursor: 'not-allowed' }
                    : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)' }
                }
              >
                <Icon className="w-3.5 h-3.5" />
                {label}{isAudioDisabled ? ' (indisponivel)' : ''}
              </button>
            );
          })}
        </div>
      )}

      {/* Variation Tabs */}
      {!disabled && (
        <div className="flex items-center gap-1.5 mb-4 flex-wrap">
          {variacoes.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveVariation(idx)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-200"
              style={activeVariation === idx
                ? { background: 'var(--color-primary-bg)', border: '1px solid var(--color-primary-bg)', color: 'var(--color-primary-light)' }
                : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)' }
              }
            >
              Variação {idx + 1}
              {variacoes.length > 1 && activeVariation === idx && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeVariation(idx); }}
                  className="ml-1 transition-colors"
                  style={{ color: 'rgba(248,113,113,0.6)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(248,113,113,0.6)' }}
                  title="Remover variação"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </button>
          ))}
          <button
            onClick={addVariation}
            className="px-2 py-1.5 rounded-lg text-[12px] transition-all duration-200"
            style={{ color: 'var(--color-primary-bg)', border: '1px dashed var(--color-primary-bg)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-primary-light)'; e.currentTarget.style.borderColor = 'var(--color-primary-bg)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-primary-bg)'; e.currentTarget.style.borderColor = 'var(--color-primary-bg)' }}
            title="Nova variação"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Tempo de Espera */}
      {hasTempoEspera && (
        <div className="flex items-center gap-2 mb-4">
          <label className="text-[11px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
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
            className="w-20 px-3 py-1.5 rounded-lg text-[13px] text-white outline-none text-center transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)' }}
          />
          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>minutos</span>
        </div>
      )}

      {/* Mensagens (current variation) */}
      <div className="space-y-3 mb-4">
        {currentMessages.map((msg, index) => (
          <div key={`${activeVariation}-${index}`} className="relative group">
            <textarea
              ref={(el) => setTextareaRef(index, el)}
              id={`textarea-${mensagem.cenario}-${activeVariation}-${index}`}
              value={msg}
              disabled={disabled}
              onChange={(e) => {
                updateMessage(index, e.target.value);
                autoResize(e.target);
              }}
              placeholder="Digite a mensagem..."
              className="w-full px-4 py-3 rounded-xl text-[13px] text-white outline-none transition-all duration-200 resize-none leading-relaxed"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.04)',
                minHeight: '80px',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)' }}
            />

            {!disabled && (
              <div className="flex items-center justify-between mt-1.5">
                <div className="flex items-center gap-1.5">
                  {['{{nome}}', '(inhale)'].map((v) => (
                    <button
                      key={v}
                      onClick={() => insertVariable(index, v)}
                      className="px-2 py-0.5 text-[10px] font-mono rounded-md transition-colors"
                      style={{ background: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}
                    >
                      {v}
                    </button>
                  ))}
                </div>

                {canDelete && (
                  <button
                    onClick={() => removeMessage(index)}
                    className="p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(248,113,113,0.08)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'transparent' }}
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
          className="flex items-center gap-1.5 text-[12px] font-medium transition-all mb-5 px-3 py-2 rounded-lg w-full justify-center"
          style={{ color: 'var(--color-primary-bg)', border: '1px dashed var(--color-primary-bg)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-primary-light)'; e.currentTarget.style.borderColor = 'var(--color-primary-bg)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-primary-bg)'; e.currentTarget.style.borderColor = 'var(--color-primary-bg)' }}
        >
          <Plus className="w-3.5 h-3.5" />
          Adicionar mensagem
        </button>
      )}

      {/* Preview */}
      {currentMessages.some((m) => m.trim()) && (
        <div className="rounded-xl p-4 mb-4 space-y-2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-[10px] font-mono uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Preview {variacoes.length > 1 ? `(Variação ${activeVariation + 1})` : ''}
          </p>
          {renderPreview()}
        </div>
      )}

      {/* Test Button */}
      <button
        onClick={handleTest}
        disabled={disabled || testing || !currentMessages.some((m) => m.trim())}
        className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-[12px] font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.04)' }}
        onMouseEnter={(e) => { if (!disabled && !testing) { e.currentTarget.style.color = '#60a5fa'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)'; e.currentTarget.style.background = 'rgba(59,130,246,0.04)' } }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.background = 'transparent' }}
      >
        {testing ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Testando...
          </>
        ) : (
          <>
            <Play className="w-3.5 h-3.5" />
            Testar Mensagem
          </>
        )}
      </button>
    </div>
  );
};
