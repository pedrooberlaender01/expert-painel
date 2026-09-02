import React, { useState, useMemo, useRef } from 'react';
import {
  MessageCircleQuestion,
  FileText,
  Cpu,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Upload,
  Lightbulb,
  Check,
  Trophy,
  GraduationCap,
  HelpCircle,
} from 'lucide-react';
import { MetricCard } from '../MetricCard';
import { NovaPerguntaModal } from './NovaPerguntaModal';
import { SUGESTOES_SUPORTE } from '../../data/sugestoes-suporte';
import type { SuporteConhecimento } from '../../types/suporte';

interface Props {
  conhecimentos: SuporteConhecimento[];
  loading: boolean;
  metricas: { totalPR: number; totalDocs: number; embeddingsPendentes: number };
  onAdd: (dados: { tipo: 'pergunta_resposta' | 'documento'; categoria: string; pergunta?: string | null; content: string }) => Promise<SuporteConhecimento | null>;
  onUpdate: (id: number, dados: Partial<SuporteConhecimento>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onGerarEmbedding: (id: number) => Promise<void>;
  onUpload: (file: File) => Promise<SuporteConhecimento | null>;
  showToast: (type: 'success' | 'error', message: string) => void;
}

// Cores por categoria para badges nos cards de P&R
const CATEGORIA_CORES: Record<string, { bg: string; border: string; color: string }> = {
  apostas: { bg: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399' },
  infoproduto: { bg: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', color: '#3b82f6' },
  geral: { bg: 'var(--c-glass)', border: '1px solid var(--c-border)', color: 'var(--c-t-40)' },
  pagamento: { bg: 'rgba(250,204,60,0.08)', border: '1px solid rgba(250,204,60,0.2)', color: '#facc3c' },
  acesso: { bg: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)', color: '#a855f7' },
  outro: { bg: 'var(--c-glass)', border: '1px solid var(--c-border)', color: 'var(--c-t-40)' },
};

const CATEGORIA_SUGESTOES = [
  { key: 'apostas', label: 'Apostas', icon: Trophy },
  { key: 'infoproduto', label: 'Infoprodutos', icon: GraduationCap },
  { key: 'geral', label: 'Geral', icon: HelpCircle },
];

export const BaseConhecimentoSuporte: React.FC<Props> = ({
  conhecimentos, loading, metricas, onAdd, onUpdate, onDelete, onGerarEmbedding, onUpload, showToast,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<SuporteConhecimento | null>(null);
  const [excluindo, setExcluindo] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [categoriaSugestao, setCategoriaSugestao] = useState('apostas');
  const [initialData, setInitialData] = useState<{ categoria?: string; pergunta?: string; content?: string } | undefined>();
  const fileRef = useRef<HTMLInputElement>(null);

  const perguntas = useMemo(() => conhecimentos.filter((c) => c.tipo === 'pergunta_resposta'), [conhecimentos]);
  const documentos = useMemo(() => conhecimentos.filter((c) => c.tipo === 'documento'), [conhecimentos]);

  // Perguntas ja adicionadas (para marcar sugestoes usadas)
  const perguntasExistentes = useMemo(() => new Set(perguntas.map((p) => p.pergunta?.toLowerCase())), [perguntas]);

  const sugestoesFiltradas = useMemo(
    () => SUGESTOES_SUPORTE.filter((s) => s.categoria === categoriaSugestao),
    [categoriaSugestao]
  );

  const handleSaveModal = async (dados: { categoria: string; pergunta: string; content: string }) => {
    try {
      if (editando) {
        await onUpdate(editando.id, { categoria: dados.categoria, pergunta: dados.pergunta, content: dados.content });
        await onGerarEmbedding(editando.id);
        showToast('success', 'Pergunta atualizada');
      } else {
        const created = await onAdd({ tipo: 'pergunta_resposta', ...dados });
        if (created) await onGerarEmbedding(created.id);
        showToast('success', 'Pergunta adicionada');
      }
      setEditando(null);
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Erro ao salvar');
      throw err;
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setExcluindo(id);
      await onDelete(id);
      showToast('success', 'Item excluido');
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Erro ao excluir');
    } finally {
      setExcluindo(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'txt', 'docx'].includes(ext || '')) {
      showToast('error', 'Formato nao suportado. Use PDF, TXT ou DOCX.');
      return;
    }

    try {
      setUploading(true);
      await onUpload(file);
      showToast('success', `Documento "${file.name}" adicionado`);
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Erro no upload');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const abrirModalSugestao = (pergunta: string, categoria: string) => {
    setEditando(null);
    setInitialData({ categoria, pergunta, content: '' });
    setModalOpen(true);
  };

  const abrirModalNovo = () => {
    setEditando(null);
    setInitialData(undefined);
    setModalOpen(true);
  };

  const abrirModalEditar = (item: SuporteConhecimento) => {
    setEditando(item);
    setInitialData({ categoria: item.categoria, pergunta: item.pergunta || '', content: item.content });
    setModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-primary-light)' }} />
      </div>
    );
  }

  const catCores = (cat: string) => CATEGORIA_CORES[cat] || CATEGORIA_CORES.outro;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Metricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Perguntas & Respostas"
          value={metricas.totalPR}
          icon={MessageCircleQuestion}
          color="green"
        />
        <MetricCard
          title="Documentos"
          value={metricas.totalDocs}
          icon={FileText}
          color="primary"
        />
        <div className={metricas.embeddingsPendentes > 0 ? 'glow-pulse-amber' : ''}>
          <MetricCard
            title="Embeddings Pendentes"
            value={metricas.embeddingsPendentes}
            icon={Cpu}
            color={metricas.embeddingsPendentes > 0 ? 'amber' : 'green'}
          />
        </div>
      </div>

      {/* Conteudo em 2 colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna: Perguntas e Respostas */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-semibold text-txt flex items-center gap-2">
              <MessageCircleQuestion className="w-4 h-4" style={{ color: '#10b981' }} />
              Perguntas e Respostas
            </h3>
            <button
              onClick={abrirModalNovo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-200"
              style={{
                background: 'rgba(var(--color-primary-rgb), 0.08)',
                border: '1px solid rgba(var(--color-primary-rgb), 0.15)',
                color: 'var(--color-primary-light)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(var(--color-primary-rgb), 0.15)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(var(--color-primary-rgb), 0.08)'; }}
            >
              <Plus className="w-3.5 h-3.5" />
              Nova Pergunta
            </button>
          </div>

          {perguntas.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <MessageCircleQuestion className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--c-t-12)' }} />
              <p className="text-[13px]" style={{ color: 'var(--c-t-40)' }}>Nenhuma pergunta cadastrada</p>
              <p className="text-[11px] mt-1" style={{ color: 'var(--c-t-25)' }}>Use as sugestoes abaixo ou adicione manualmente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {perguntas.map((item) => {
                const cores = catCores(item.categoria);
                return (
                  <div
                    key={item.id}
                    className="glass-card p-4 group transition-all duration-200"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(var(--color-primary-rgb), 0.15)';
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '';
                      e.currentTarget.style.boxShadow = '';
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Badge de categoria + indicador embedding */}
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider"
                            style={{ background: cores.bg, border: cores.border, color: cores.color }}
                          >
                            {item.categoria}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-[7px] h-[7px] rounded-full flex-shrink-0"
                              style={{
                                background: item.embedding ? '#34d399' : '#facc3c',
                                boxShadow: item.embedding ? '0 0 6px rgba(52,211,153,0.4)' : '0 0 6px rgba(250,204,60,0.4)',
                                animation: item.embedding ? 'none' : 'pulse 2s infinite',
                              }}
                            />
                            <span className="text-[9px]" style={{ color: item.embedding ? 'rgba(52,211,153,0.5)' : 'rgba(250,204,60,0.5)' }}>
                              {item.embedding ? 'Indexado' : 'Pendente'}
                            </span>
                          </div>
                        </div>
                        {/* Pergunta */}
                        <p className="text-[13px] font-semibold text-txt mb-1.5 leading-snug">{item.pergunta}</p>
                        {/* Resposta truncada */}
                        <p
                          className="text-[12px] leading-relaxed line-clamp-2"
                          style={{ color: 'var(--c-t-45)' }}
                        >
                          {item.content}
                        </p>
                      </div>
                      {/* Acoes hover */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0 pt-0.5">
                        <button
                          onClick={() => abrirModalEditar(item)}
                          className="p-1.5 rounded-lg transition-all duration-200 hover:bg-glass-hover"
                          style={{ color: 'var(--c-t-35)' }}
                          title="Editar"
                          onMouseEnter={(e) => { e.currentTarget.style.color = 'rgb(var(--c-fg-rgb) / 0.7)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgb(var(--c-fg-rgb) / 0.35)'; }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={excluindo === item.id}
                          className="p-1.5 rounded-lg transition-all duration-200 hover:bg-red-500/10"
                          style={{ color: 'rgba(248, 113, 113, 0.5)' }}
                          title="Excluir"
                          onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(248, 113, 113, 0.5)'; }}
                        >
                          {excluindo === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Coluna: Documentos */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-semibold text-txt flex items-center gap-2">
              <FileText className="w-4 h-4" style={{ color: '#3b82f6' }} />
              Documentos
            </h3>
          </div>

          {/* Area de upload */}
          <div
            className="glass-card p-6 text-center cursor-pointer transition-all duration-200 mb-4"
            onClick={() => fileRef.current?.click()}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(var(--color-primary-rgb), 0.15)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '';
              e.currentTarget.style.boxShadow = '';
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.txt,.docx"
              onChange={handleFileUpload}
              className="hidden"
            />
            {uploading ? (
              <Loader2 className="w-6 h-6 mx-auto animate-spin" style={{ color: 'var(--color-primary-light)' }} />
            ) : (
              <>
                <Upload className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--c-t-20)' }} />
                <p className="text-[13px] font-medium" style={{ color: 'var(--c-t-40)' }}>
                  Clique para fazer upload
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--c-t-25)' }}>
                  PDF, TXT ou DOCX
                </p>
              </>
            )}
          </div>

          {documentos.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <FileText className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--c-t-12)' }} />
              <p className="text-[13px]" style={{ color: 'var(--c-t-40)' }}>Nenhum documento</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documentos.map((doc) => (
                <div
                  key={doc.id}
                  className="glass-card p-4 group transition-all duration-200"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(var(--color-primary-rgb), 0.15)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '';
                    e.currentTarget.style.boxShadow = '';
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.12)' }}
                      >
                        <FileText className="w-4 h-4" style={{ color: '#3b82f6' }} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-medium text-txt truncate">{doc.nome_arquivo || 'Documento'}</p>
                          {/* Indicador embedding */}
                          <div className="flex items-center gap-1">
                            <div
                              className="w-[6px] h-[6px] rounded-full flex-shrink-0"
                              style={{
                                background: doc.embedding ? '#34d399' : '#facc3c',
                                boxShadow: doc.embedding ? '0 0 6px rgba(52,211,153,0.4)' : '0 0 6px rgba(250,204,60,0.4)',
                                animation: doc.embedding ? 'none' : 'pulse 2s infinite',
                              }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] font-mono" style={{ color: 'var(--c-t-30)' }}>
                            {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                          </span>
                          {doc.metadata?.tamanho && (
                            <span className="text-[11px] font-mono" style={{ color: 'var(--c-t-30)' }}>
                              {(doc.metadata.tamanho / 1024).toFixed(0)} KB
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      disabled={excluindo === doc.id}
                      className="p-1.5 rounded-lg transition-all duration-200 hover:bg-red-500/10 opacity-0 group-hover:opacity-100"
                      style={{ color: 'rgba(248, 113, 113, 0.5)' }}
                      title="Excluir"
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(248, 113, 113, 0.5)'; }}
                    >
                      {excluindo === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sugestoes de perguntas — secao separada com divisor */}
      <div>
        {/* Divisor visual */}
        <div className="flex items-center gap-3 mb-5">
          <div className="h-px flex-1" style={{ background: 'var(--c-glass-hover)' }} />
          <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--c-t-20)' }}>
            Sugestoes
          </span>
          <div className="h-px flex-1" style={{ background: 'var(--c-glass-hover)' }} />
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <Lightbulb className="w-[18px] h-[18px]" style={{ color: '#facc3c' }} />
            <h3 className="text-[15px] font-semibold text-txt">Sugestoes de perguntas frequentes</h3>
          </div>

          {/* Tabs de categoria — proeminentes com icones */}
          <div className="flex items-center gap-2 mb-5">
            {CATEGORIA_SUGESTOES.map((cat) => {
              const Icon = cat.icon;
              const active = categoriaSugestao === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setCategoriaSugestao(cat.key)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200"
                  style={active
                    ? {
                      background: 'rgba(var(--color-primary-rgb), 0.12)',
                      border: '1px solid rgba(var(--color-primary-rgb), 0.25)',
                      color: 'var(--color-primary-light)',
                      boxShadow: '0 0 8px rgba(var(--color-primary-rgb), 0.08)',
                    }
                    : {
                      background: 'transparent',
                      border: '1px solid var(--c-border)',
                      color: 'var(--c-t-40)',
                    }
                  }
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.color = 'rgb(var(--c-fg-rgb) / 0.65)';
                      e.currentTarget.style.background = 'var(--c-glass)';
                      e.currentTarget.style.borderColor = 'var(--c-border-strong)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.color = 'rgb(var(--c-fg-rgb) / 0.4)';
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = 'var(--c-border)';
                    }
                  }}
                >
                  <Icon className="w-4 h-4" style={{ opacity: active ? 1 : 0.5 }} />
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Separador sutil entre tabs e chips */}
          <div className="h-px mb-4" style={{ background: 'var(--c-glass)' }} />

          {/* Grid de sugestoes — chips com estilo diferenciado */}
          <div className="flex flex-wrap gap-2">
            {sugestoesFiltradas.map((sugestao) => {
              const jaUsada = perguntasExistentes.has(sugestao.pergunta.toLowerCase());
              return (
                <button
                  key={sugestao.pergunta}
                  onClick={() => !jaUsada && abrirModalSugestao(sugestao.pergunta, sugestao.categoria)}
                  disabled={jaUsada}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all duration-200"
                  style={jaUsada
                    ? {
                      background: 'rgba(52, 211, 153, 0.04)',
                      border: '1px solid rgba(52, 211, 153, 0.12)',
                      color: 'rgba(52, 211, 153, 0.4)',
                      opacity: 0.6,
                      cursor: 'default',
                    }
                    : {
                      background: 'var(--c-glass-2)',
                      border: '1px dashed var(--c-border-strong)',
                      color: 'var(--c-t-50)',
                      cursor: 'pointer',
                    }
                  }
                  onMouseEnter={(e) => {
                    if (!jaUsada) {
                      e.currentTarget.style.borderColor = 'rgba(var(--color-primary-rgb), 0.3)';
                      e.currentTarget.style.borderStyle = 'solid';
                      e.currentTarget.style.background = 'rgba(var(--color-primary-rgb), 0.06)';
                      e.currentTarget.style.color = 'var(--color-primary-light)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!jaUsada) {
                      e.currentTarget.style.borderColor = 'var(--c-border-strong)';
                      e.currentTarget.style.borderStyle = 'dashed';
                      e.currentTarget.style.background = 'var(--c-glass-2)';
                      e.currentTarget.style.color = 'rgb(var(--c-fg-rgb) / 0.5)';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  {jaUsada && <Check className="w-3 h-3" />}
                  {sugestao.pergunta}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal */}
      <NovaPerguntaModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditando(null); setInitialData(undefined); }}
        onSave={handleSaveModal}
        initialData={initialData}
        modo={editando ? 'editar' : 'criar'}
      />
    </div>
  );
};
