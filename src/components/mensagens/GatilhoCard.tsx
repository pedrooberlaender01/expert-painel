import React, { useState, useCallback } from 'react';
import { Crosshair, X, Plus } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { MensagemFunil } from '../../hooks/useMensagensFunil';

interface GatilhoCardProps {
  mensagem: MensagemFunil;
  isModified: boolean;
  onUpdate: (updates: Partial<MensagemFunil>) => void;
}

export const GatilhoCard: React.FC<GatilhoCardProps> = ({
  mensagem,
  isModified,
  onUpdate,
}) => {
  const [newWord, setNewWord] = useState('');

  const updateWord = useCallback((index: number, value: string) => {
    const updated = [...mensagem.mensagens];
    updated[index] = value;
    onUpdate({ mensagens: updated });
  }, [mensagem.mensagens, onUpdate]);

  const removeWord = useCallback((index: number) => {
    if (mensagem.mensagens.length <= 1) return;
    const updated = mensagem.mensagens.filter((_, i) => i !== index);
    onUpdate({ mensagens: updated });
  }, [mensagem.mensagens, onUpdate]);

  const addWord = useCallback(() => {
    const word = newWord.trim();
    if (!word) return;
    onUpdate({ mensagens: [...mensagem.mensagens, word] });
    setNewWord('');
  }, [newWord, mensagem.mensagens, onUpdate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addWord();
    }
  }, [addWord]);

  return (
    <div
      className={cn(
        'card-dark p-5 transition-all duration-300 w-full',
        isModified && 'border-primary/30'
      )}
      style={isModified ? { borderColor: 'rgba(0, 74, 255, 0.3)' } : undefined}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
          <Crosshair className="w-4 h-4 text-amber-400" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-txt font-display">{mensagem.titulo}</h3>
          <p className="text-[11px] text-txt-muted mt-0.5">
            Palavras que ativam a assistente quando o lead manda a primeira mensagem
          </p>
        </div>
      </div>

      {/* Trigger words — horizontal flex wrap */}
      <div className="flex flex-wrap items-center gap-2">
        {mensagem.mensagens.map((word, index) => (
          <div key={index} className="flex items-center gap-1.5 group">
            <span className="text-[10px] font-mono text-txt-dim shrink-0">
              {index + 1}.
            </span>
            <div className="relative flex items-center">
              <input
                type="text"
                value={word}
                onChange={(e) => updateWord(index, e.target.value)}
                placeholder="Palavra..."
                className="px-3.5 py-2 rounded-lg text-[13px] text-txt placeholder-txt-dim outline-none border border-[rgb(var(--c-fg-rgb)/0.12)] focus:border-primary/30 transition-all duration-200"
                style={{ background: '#1a1a1a', minWidth: '100px', width: `${Math.max(100, word.length * 9 + 32)}px` }}
              />
              {mensagem.mensagens.length > 1 && (
                <button
                  onClick={() => removeWord(index)}
                  className="ml-1 p-1 text-txt-dim hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all opacity-0 group-hover:opacity-100"
                  title="Remover palavra"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Add new word inline */}
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nova palavra..."
            className="px-3.5 py-2 rounded-lg text-[13px] text-txt placeholder-txt-dim outline-none border border-dashed border-[rgb(var(--c-fg-rgb)/0.12)] focus:border-primary/30 transition-all duration-200"
            style={{ background: '#1a1a1a', minWidth: '120px', width: '150px' }}
          />
          <button
            onClick={addWord}
            disabled={!newWord.trim()}
            className="flex items-center gap-1 text-[12px] font-medium text-primary-light hover:text-primary transition-colors px-3 py-2 rounded-lg border border-dashed border-primary-bg hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-primary-light disabled:hover:border-primary-bg shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
};
