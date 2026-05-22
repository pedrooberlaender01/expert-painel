import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dados: { categoria: string; pergunta: string; content: string }) => Promise<void>;
  initialData?: { categoria?: string; pergunta?: string; content?: string };
  modo: 'criar' | 'editar';
}

const CATEGORIAS = [
  { value: 'geral', label: 'Geral' },
  { value: 'apostas', label: 'Apostas' },
  { value: 'infoproduto', label: 'Infoproduto' },
  { value: 'pagamento', label: 'Pagamento' },
  { value: 'acesso', label: 'Acesso' },
  { value: 'outro', label: 'Outro' },
];

export const NovaPerguntaModal: React.FC<Props> = ({ isOpen, onClose, onSave, initialData, modo }) => {
  const [categoria, setCategoria] = useState('geral');
  const [pergunta, setPergunta] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [catOpen, setCatOpen] = useState(false);

  useEffect(() => {
    if (isOpen && initialData) {
      setCategoria(initialData.categoria || 'geral');
      setPergunta(initialData.pergunta || '');
      setContent(initialData.content || '');
    } else if (isOpen) {
      setCategoria('geral');
      setPergunta('');
      setContent('');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const canSave = pergunta.trim() && content.trim();

  const handleSave = async () => {
    if (!canSave) return;
    try {
      setSaving(true);
      await onSave({ categoria, pergunta: pergunta.trim(), content: content.trim() });
      onClose();
    } catch {
      // Erro tratado pelo componente pai
    } finally {
      setSaving(false);
    }
  };

  const selectedCatLabel = CATEGORIAS.find((c) => c.value === categoria)?.label || 'Geral';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-2xl animate-slide-up"
        style={{
          background: 'rgba(22, 27, 34, 0.97)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-[15px] font-semibold text-white">
            {modo === 'criar' ? 'Nova Pergunta' : 'Editar Pergunta'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-all duration-200"
            style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Categoria */}
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Categoria
            </label>
            <div className="relative">
              <button
                onClick={() => setCatOpen(!catOpen)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13px] text-white transition-all duration-200"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: catOpen ? '1px solid rgba(var(--color-primary-rgb), 0.4)' : '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <span>{selectedCatLabel}</span>
                <svg className="w-4 h-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {catOpen && (
                <div
                  className="absolute bottom-full left-0 right-0 mb-1 rounded-xl overflow-hidden z-10"
                  style={{
                    background: 'rgba(22, 27, 34, 0.97)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}
                >
                  {CATEGORIAS.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => { setCategoria(cat.value); setCatOpen(false); }}
                      className="w-full text-left px-3.5 py-2 text-[13px] transition-all duration-150 hover:bg-white/[0.04]"
                      style={{ color: categoria === cat.value ? 'var(--color-primary-light)' : 'rgba(255,255,255,0.6)' }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pergunta */}
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Pergunta
            </label>
            <input
              type="text"
              value={pergunta}
              onChange={(e) => setPergunta(e.target.value)}
              placeholder="Ex: Como faco meu cadastro?"
              className="w-full px-3.5 py-2.5 rounded-xl text-[13px] text-white placeholder-white/30 outline-none transition-all duration-200 focus:ring-1"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            />
          </div>

          {/* Resposta */}
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Resposta
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escreva a resposta completa que o agente usara..."
              rows={4}
              className="w-full px-3.5 py-2.5 rounded-xl text-[13px] text-white placeholder-white/30 outline-none transition-all duration-200 focus:ring-1 resize-none"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200"
            style={{ color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all duration-200 disabled:opacity-40"
            style={{
              background: canSave ? 'var(--color-primary)' : 'rgba(255,255,255,0.08)',
            }}
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {modo === 'criar' ? 'Adicionar' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
};
