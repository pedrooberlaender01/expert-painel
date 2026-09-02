import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, ChevronDown, Check, Radio, Sun, UserPlus, AlertTriangle, MessageCircle, TrendingUp, Flame, Tag } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { QualidadeStars } from './QualidadeStars';
import { cn } from '../../utils/cn';

const CATEGORIAS: Array<{ key: string; label: string; icon: LucideIcon }> = [
  { key: 'live', label: 'Live', icon: Radio },
  { key: 'bom_dia', label: 'Bom dia', icon: Sun },
  { key: 'cadastro', label: 'Cadastro', icon: UserPlus },
  { key: 'aviso', label: 'Aviso', icon: AlertTriangle },
  { key: 'normal', label: 'Normal', icon: MessageCircle },
  { key: 'resultado', label: 'Resultado', icon: TrendingUp },
  { key: 'hype', label: 'Hype', icon: Flame },
  { key: 'promocao', label: 'Promocao', icon: Tag },
];

interface AdicionarExemploModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (dados: { categoria: string; conteudo: string; contexto?: string; qualidade?: number }) => Promise<void>;
  initialConteudo?: string;
}

export const AdicionarExemploModal: React.FC<AdicionarExemploModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  initialConteudo,
}) => {
  const [categoria, setCategoria] = useState('normal');
  const [conteudo, setConteudo] = useState('');
  const [contexto, setContexto] = useState('');
  const [qualidade, setQualidade] = useState(3);
  const [loading, setLoading] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const catRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCategoria('normal');
      setConteudo(initialConteudo ?? '');
      setContexto('');
      setQualidade(3);
      setCatOpen(false);
    }
  }, [isOpen, initialConteudo]);

  useEffect(() => {
    if (!catOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) {
        setCatOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [catOpen]);

  if (!isOpen) return null;

  const selectedCat = CATEGORIAS.find((c) => c.key === categoria) ?? CATEGORIAS[4];
  const SelectedIcon = selectedCat.icon;

  const canSave = conteudo.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setLoading(true);
    try {
      await onAdd({
        categoria,
        conteudo: conteudo.trim(),
        contexto: contexto.trim() || undefined,
        qualidade,
      });
      setConteudo('');
      setContexto('');
      setQualidade(3);
      setCategoria('normal');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-surface-50 border border-glass rounded-xl w-full max-w-lg shadow-2xl animate-[slideUp_200ms_ease-out]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-glass">
          <h2 className="text-[15px] font-semibold text-txt">Adicionar Exemplo</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-txt-dim hover:text-txt hover:bg-surface-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Categoria */}
          <div>
            <label className="block text-[12px] font-medium text-txt-muted mb-1.5">Categoria</label>
            <div className="relative" ref={catRef}>
              <button
                type="button"
                onClick={() => setCatOpen((v) => !v)}
                className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-[13px] text-txt transition-all duration-200"
                style={{
                  background: 'var(--c-glass)',
                  border: catOpen ? '1px solid rgba(var(--color-primary-rgb), 0.4)' : '1px solid var(--c-border)',
                  boxShadow: catOpen ? '0 0 0 3px rgba(var(--color-primary-rgb), 0.08)' : 'none',
                }}
              >
                <span className="flex items-center gap-2">
                  <SelectedIcon className="w-4 h-4" style={{ color: 'var(--color-primary-light)' }} />
                  {selectedCat.label}
                </span>
                <ChevronDown
                  className={cn('w-4 h-4 opacity-50 transition-transform duration-200', catOpen && 'rotate-180')}
                />
              </button>
              {catOpen && (
                <div
                  className="absolute top-full left-0 right-0 mt-1.5 rounded-xl overflow-hidden z-50 animate-fade-in"
                  style={{
                    background: 'var(--c-popup-bg)',
                    border: '1px solid var(--c-border)',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                    padding: '4px',
                  }}
                >
                  {CATEGORIAS.map((cat) => {
                    const active = categoria === cat.key;
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => { setCategoria(cat.key); setCatOpen(false); }}
                        className="w-full text-left px-2.5 py-2 rounded-lg text-[13px] transition-all duration-150 flex items-center justify-between gap-2"
                        style={{
                          background: active ? 'rgba(var(--color-primary-rgb), 0.12)' : 'transparent',
                          color: active ? 'var(--color-primary-light)' : 'rgb(var(--c-fg-rgb) / 0.65)',
                        }}
                        onMouseEnter={(e) => {
                          if (!active) {
                            e.currentTarget.style.background = 'var(--c-glass)';
                            e.currentTarget.style.color = 'rgb(var(--c-fg-rgb))';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!active) {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'rgb(var(--c-fg-rgb) / 0.65)';
                          }
                        }}
                      >
                        <span className="flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5" style={{ opacity: active ? 1 : 0.6 }} />
                          {cat.label}
                        </span>
                        {active && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Conteudo */}
          <div>
            <label className="block text-[12px] font-medium text-txt-muted mb-1.5">Conteudo da copy</label>
            <textarea
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              placeholder="Cole aqui uma copy real que o expert usou..."
              rows={6}
              className="w-full bg-surface text-txt text-[12px] rounded-lg px-3 py-2.5 border border-glass focus:border-accent/30 focus:outline-none placeholder-txt-dim resize-none transition-colors"
            />
          </div>

          {/* Contexto */}
          <div>
            <label className="block text-[12px] font-medium text-txt-muted mb-1.5">
              Contexto <span className="text-txt-dim">(opcional)</span>
            </label>
            <input
              value={contexto}
              onChange={(e) => setContexto(e.target.value)}
              placeholder="Ex: Usada em live de domingo, teve bom engajamento"
              className="w-full bg-surface text-txt text-[12px] rounded-lg px-3 py-2.5 border border-glass focus:border-accent/30 focus:outline-none placeholder-txt-dim transition-colors"
            />
          </div>

          {/* Qualidade */}
          <div>
            <label className="block text-[12px] font-medium text-txt-muted mb-1.5">Qualidade</label>
            <QualidadeStars value={qualidade} onChange={setQualidade} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-glass">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] font-medium text-txt-muted bg-surface-100 hover:bg-surface-200 rounded-xl border border-glass transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || loading}
            className={cn(
              'flex items-center gap-2 px-5 py-2 text-[13px] font-semibold rounded-xl transition-all duration-200',
              canSave && !loading
                ? 'bg-accent hover:brightness-110 text-white shadow-[0_2px_12px_rgba(0,74,255,0.2)]'
                : 'bg-surface-100 text-txt-dim cursor-not-allowed'
            )}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
};
