import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Loader2, FileText, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { QualidadeStars } from './QualidadeStars';
import { AdicionarExemploModal } from './AdicionarExemploModal';
import { cn } from '../../utils/cn';
import type { ExemploCopy } from '../../hooks/useGerarCopy';

const CATEGORIAS = [
  { key: '', label: 'Todos' },
  { key: 'live', label: 'Live' },
  { key: 'bom_dia', label: 'Bom dia' },
  { key: 'cadastro', label: 'Cadastro' },
  { key: 'aviso', label: 'Aviso' },
  { key: 'normal', label: 'Normal' },
  { key: 'resultado', label: 'Resultado' },
  { key: 'hype', label: 'Hype' },
  { key: 'promocao', label: 'Promocao' },
];

const CAT_COLORS: Record<string, { bg: string; text: string }> = {
  live: { bg: 'bg-red-500/10', text: 'text-red-400' },
  bom_dia: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  cadastro: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
  aviso: { bg: 'bg-orange-500/10', text: 'text-orange-400' },
  normal: { bg: 'bg-zinc-500/10', text: 'text-zinc-400' },
  resultado: { bg: 'bg-primary-bg', text: 'text-primary-light' },
  hype: { bg: 'bg-pink-500/10', text: 'text-pink-400' },
  promocao: { bg: 'bg-purple-500/10', text: 'text-purple-400' },
};

interface BaseConhecimentoProps {
  exemplos: ExemploCopy[];
  loading: boolean;
  onFetch: (categoria?: string) => Promise<void>;
  onAdd: (dados: { categoria: string; conteudo: string; contexto?: string; qualidade?: number }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  showToast: (type: 'success' | 'error', msg: string) => void;
}

export const BaseConhecimento: React.FC<BaseConhecimentoProps> = ({
  exemplos,
  loading,
  onFetch,
  onAdd,
  onDelete,
  showToast,
}) => {
  const [filtro, setFiltro] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 4;

  useEffect(() => {
    setPage(1);
    onFetch(filtro || undefined);
  }, [filtro, onFetch]);

  const handleAdd = async (dados: { categoria: string; conteudo: string; contexto?: string; qualidade?: number }) => {
    await onAdd(dados);
    showToast('success', 'Exemplo adicionado! O embedding sera gerado em instantes.');
    await onFetch(filtro || undefined);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await onDelete(id);
      showToast('success', 'Exemplo excluido');
    } catch {
      showToast('error', 'Erro ao excluir exemplo');
    } finally {
      setDeleting(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Count per category
  const counts = exemplos.reduce<Record<string, number>>((acc, ex) => {
    const cat = ex.metadata?.categoria || 'normal';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const extractContent = (content: string): string => {
    const idx = content.indexOf(':');
    return idx > -1 ? content.slice(idx + 1).trim() : content;
  };

  const totalPages = Math.max(1, Math.ceil(exemplos.length / ITEMS_PER_PAGE));
  const paginatedExemplos = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return exemplos.slice(start, start + ITEMS_PER_PAGE);
  }, [exemplos, page]);

  return (
    <div className="space-y-5">
      {/* Filter pills + add button */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIAS.map(({ key, label }) => {
            const count = key ? (counts[key] || 0) : exemplos.length;
            return (
              <button
                key={key}
                onClick={() => setFiltro(key)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all duration-200',
                  filtro === key
                    ? 'bg-accent-dim text-accent-bright border-accent/25'
                    : 'bg-transparent text-[#6b7280] border-[#1e1e22] hover:text-[#9ca3af] hover:border-[#2a2a2e]'
                )}
              >
                {label}
                {count > 0 && (
                  <span className={cn(
                    'text-[9px] px-1.5 py-0.5 rounded-full font-bold',
                    filtro === key ? 'bg-accent/20 text-accent-bright' : 'bg-[#1a1a1e] text-[#4b4b55]'
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-accent hover:brightness-110 text-white text-[12px] font-medium rounded-xl transition-all shadow-[0_2px_10px_rgba(0,74,255,0.2)] shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Adicionar Exemplo
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 text-accent animate-spin" />
        </div>
      ) : exemplos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#111114] border border-[#1e1e22] flex items-center justify-center mb-4">
            <FileText className="w-6 h-6 text-[#2a2a2e]" />
          </div>
          <p className="text-[#9ca3af] text-sm font-medium mb-1">Nenhum exemplo cadastrado</p>
          <p className="text-[#4b4b55] text-xs max-w-xs leading-relaxed">
            Adicione exemplos de copys reais para melhorar a qualidade das copys geradas.
          </p>
        </div>
      ) : (
        <>
        <div className="space-y-2">
          {paginatedExemplos.map((ex) => {
            const cat = ex.metadata?.categoria || 'normal';
            const colors = CAT_COLORS[cat] || CAT_COLORS.normal;
            const content = extractContent(ex.content);
            const isLong = content.length > 200;
            const isExpanded = expanded.has(ex.id);

            return (
              <div
                key={ex.id}
                className="bg-[#111114] border border-[#1e1e22] rounded-xl p-4 hover:border-[#2a2a2e] transition-all group"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide', colors.bg, colors.text)}>
                      {cat}
                    </span>
                    {ex.metadata?.qualidade && (
                      <QualidadeStars value={ex.metadata.qualidade} size="sm" readonly />
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(ex.id)}
                    disabled={deleting === ex.id}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-[#4b4b55] hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-all"
                  >
                    {deleting === ex.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <p className="text-[12px] text-[#d1d5db] leading-relaxed whitespace-pre-line">
                  {isLong && !isExpanded ? content.slice(0, 200) + '...' : content}
                </p>

                {isLong && (
                  <button
                    onClick={() => toggleExpand(ex.id)}
                    className="flex items-center gap-1 mt-1.5 text-[10px] text-accent-bright/60 hover:text-accent-bright transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {isExpanded ? 'ver menos' : 'ver mais'}
                  </button>
                )}

                {ex.metadata?.contexto && (
                  <p className="mt-2 text-[11px] text-[#4b4b55] italic">
                    {ex.metadata.contexto}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-[#1e1e22] flex items-center justify-between">
            <span className="text-[11px] text-[#6b7280] font-mono">
              {`${(page - 1) * ITEMS_PER_PAGE + 1}-${Math.min(page * ITEMS_PER_PAGE, exemplos.length)} de ${exemplos.length}`}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="p-1.5 border border-[#1e1e22] rounded-lg hover:bg-[#1a1a1e] hover:border-[#2a2a2e] disabled:opacity-30 disabled:cursor-not-allowed transition-all text-[#6b7280] hover:text-[#9ca3af]"
                title="Primeira página"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-1.5 border border-[#1e1e22] rounded-lg hover:bg-[#1a1a1e] hover:border-[#2a2a2e] disabled:opacity-30 disabled:cursor-not-allowed transition-all text-[#6b7280] hover:text-[#9ca3af]"
                title="Página anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`min-w-[32px] h-[32px] flex items-center justify-center rounded-lg text-[11px] font-mono font-medium transition-all duration-150 ${
                    p === page
                      ? 'bg-[#3b82f6]/15 text-[#3b82f6] border border-[#3b82f6]/30'
                      : 'border border-[#1e1e22] text-[#6b7280] hover:bg-[#1a1a1e] hover:border-[#2a2a2e] hover:text-[#9ca3af]'
                  }`}
                >
                  {p}
                </button>
              ))}

              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-1.5 border border-[#1e1e22] rounded-lg hover:bg-[#1a1a1e] hover:border-[#2a2a2e] disabled:opacity-30 disabled:cursor-not-allowed transition-all text-[#6b7280] hover:text-[#9ca3af]"
                title="Próxima página"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="p-1.5 border border-[#1e1e22] rounded-lg hover:bg-[#1a1a1e] hover:border-[#2a2a2e] disabled:opacity-30 disabled:cursor-not-allowed transition-all text-[#6b7280] hover:text-[#9ca3af]"
                title="Última página"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
        </>
      )}

      <AdicionarExemploModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onAdd={handleAdd}
      />
    </div>
  );
};
