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

      <div className="relative bg-[#111114] border border-[#2a2a2e] rounded-xl w-full max-w-lg shadow-2xl animate-[slideUp_200ms_ease-out]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#1e1e22]">
          <h2 className="text-[15px] font-semibold text-white">Adicionar Exemplo</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-[#4b4b55] hover:text-white hover:bg-[#1a1a1e] rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Categoria */}
          <div>
            <label className="block text-[12px] font-medium text-[#9ca3af] mb-1.5">Categoria</label>
            <div className="relative" ref={catRef}>
              <button
                type="button"
                onClick={() => setCatOpen((v) => !v)}
                className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-[13px] text-white transition-all duration-200"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: catOpen ? '1px solid rgba(var(--color-primary-rgb), 0.4)' : '1px solid rgba(255,255,255,0.08)',
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
                    background: 'rgba(22, 27, 34, 0.97)',
                    border: '1px solid rgba(255,255,255,0.08)',
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
                          color: active ? 'var(--color-primary-light)' : 'rgba(255,255,255,0.65)',
                        }}
                        onMouseEnter={(e) => {
                          if (!active) {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                            e.currentTarget.style.color = '#fff';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!active) {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'rgba(255,255,255,0.65)';
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
            <label className="block text-[12px] font-medium text-[#9ca3af] mb-1.5">Conteudo da copy</label>
            <textarea
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              placeholder="Cole aqui uma copy real que o expert usou..."
              rows={6}
              className="w-full bg-[#0e0e10] text-white text-[12px] rounded-lg px-3 py-2.5 border border-[#2a2a2e] focus:border-accent/30 focus:outline-none placeholder-[#4b4b55] resize-none transition-colors"
            />
          </div>

          {/* Contexto */}
          <div>
            <label className="block text-[12px] font-medium text-[#9ca3af] mb-1.5">
              Contexto <span className="text-[#4b4b55]">(opcional)</span>
            </label>
            <input
              value={contexto}
              onChange={(e) => setContexto(e.target.value)}
              placeholder="Ex: Usada em live de domingo, teve bom engajamento"
              className="w-full bg-[#0e0e10] text-white text-[12px] rounded-lg px-3 py-2.5 border border-[#2a2a2e] focus:border-accent/30 focus:outline-none placeholder-[#4b4b55] transition-colors"
            />
          </div>

          {/* Qualidade */}
          <div>
            <label className="block text-[12px] font-medium text-[#9ca3af] mb-1.5">Qualidade</label>
            <QualidadeStars value={qualidade} onChange={setQualidade} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-[#1e1e22]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] font-medium text-[#9ca3af] bg-[#1a1a1e] hover:bg-[#252528] rounded-xl border border-[#2a2a2e] transition-all"
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
                : 'bg-[#1a1a1e] text-[#4b4b55] cursor-not-allowed'
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
