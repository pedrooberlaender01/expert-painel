import React, { useState, useEffect, useRef } from 'react';
import { X, MessageSquare, Mic, Image, Video, Upload, Loader2, File, Megaphone, BookPlus } from 'lucide-react';
import type { AgendamentoMensagem } from '../../hooks/useAgendamentos';
import { cn } from '../../utils/cn';
import { AdicionarExemploModal } from '../copy/AdicionarExemploModal';

const TIPOS = [
  { key: 'texto' as const, label: 'Texto', icon: MessageSquare },
  { key: 'audio' as const, label: 'Áudio', icon: Mic },
  { key: 'imagem' as const, label: 'Imagem', icon: Image },
  { key: 'video' as const, label: 'Vídeo', icon: Video },
];

const ACCEPT_MAP: Record<string, string> = {
  audio: 'audio/mpeg,audio/ogg,audio/mp4',
  imagem: 'image/jpeg,image/png,image/webp',
  video: 'video/mp4,video/3gpp',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface NovaMensagemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dados: { nome: string; tipo: string; conteudo?: string; file?: File; mencionar_todos?: boolean }) => Promise<void>;
  editando?: AgendamentoMensagem | null;
  loading: boolean;
  onAddExemplo?: (dados: { categoria: string; conteudo: string; contexto?: string; qualidade?: number }) => Promise<void>;
  showToast?: (type: 'success' | 'error', msg: string) => void;
}

export const NovaMensagemModal: React.FC<NovaMensagemModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editando,
  loading,
  onAddExemplo,
  showToast,
}) => {
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<AgendamentoMensagem['tipo']>('texto');
  const [conteudo, setConteudo] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [mencionarTodos, setMencionarTodos] = useState(false);
  const [showExemploModal, setShowExemploModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (editando) {
        setNome(editando.nome);
        setTipo(editando.tipo);
        setConteudo(editando.conteudo ?? '');
        setMencionarTodos(editando.mencionar_todos ?? false);
        setFile(null);
      } else {
        setNome('');
        setTipo('texto');
        setConteudo('');
        setMencionarTodos(false);
        setFile(null);
      }
    }
  }, [isOpen, editando]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  };

  const handleSubmit = async () => {
    if (!nome.trim()) return;
    await onSave({
      nome: nome.trim(),
      tipo,
      conteudo: conteudo.trim() || undefined,
      file: file ?? undefined,
      mencionar_todos: mencionarTodos,
    });
  };

  const isMediaTipo = tipo !== 'texto';
  const canSave = nome.trim() && (tipo === 'texto' ? conteudo.trim() : file || editando?.midia_url);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative card-dark-elevated w-full max-w-lg animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-300/20">
          <h2 className="text-[15px] font-semibold text-txt font-display">
            {editando ? 'Editar Mensagem' : 'Nova Mensagem'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-txt-muted hover:text-txt hover:bg-surface-200/40 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-[12px] font-medium text-txt-muted mb-1.5">
              Nome da mensagem
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Boas-vindas grupo VIP"
              className="input-dark text-[13px]"
            />
          </div>

          {/* Tipo selector */}
          <div>
            <label className="block text-[12px] font-medium text-txt-muted mb-1.5">Tipo</label>
            <div className="grid grid-cols-4 gap-1.5">
              {TIPOS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => {
                    setTipo(t.key);
                    setFile(null);
                  }}
                  className={cn(
                    'flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] font-medium transition-all duration-200 border',
                    tipo === t.key
                      ? 'bg-primary-bg text-primary-light border-primary-bg'
                      : 'bg-surface-200/20 text-txt-dim border-transparent hover:bg-surface-200/40 hover:text-txt-muted'
                  )}
                >
                  <t.icon className="w-4 h-4" />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conteúdo texto */}
          {tipo === 'texto' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12px] font-medium text-txt-muted">
                  Conteúdo
                </label>
                {onAddExemplo && conteudo.trim().length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowExemploModal(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all duration-200"
                    style={{
                      background: 'rgba(var(--color-primary-rgb), 0.08)',
                      border: '1px solid rgba(var(--color-primary-rgb), 0.18)',
                      color: 'var(--color-primary-light)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(var(--color-primary-rgb), 0.14)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(var(--color-primary-rgb), 0.08)'; }}
                    title="Salvar esta mensagem como exemplo para o Gerar Copy IA"
                  >
                    <BookPlus className="w-3 h-3" />
                    Adicionar à base de conhecimento
                  </button>
                )}
              </div>
              <textarea
                value={conteudo}
                onChange={(e) => setConteudo(e.target.value)}
                placeholder="Digite o texto da mensagem..."
                rows={4}
                className="input-dark text-[13px] resize-none"
              />
            </div>
          )}

          {/* Upload de mídia */}
          {isMediaTipo && (
            <>
              <div>
                <label className="block text-[12px] font-medium text-txt-muted mb-1.5">
                  Arquivo
                </label>
                {file ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-50/60 border border-surface-300/10">
                    <div className="w-9 h-9 rounded-lg bg-primary-bg flex items-center justify-center">
                      <File className="w-4 h-4 text-primary-light" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-txt-secondary font-medium truncate">
                        {file.name}
                      </p>
                      <p className="text-[10px] text-txt-dim">{formatFileSize(file.size)}</p>
                    </div>
                    <button
                      onClick={() => setFile(null)}
                      className="p-1 text-txt-dim hover:text-rose-400 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : editando?.midia_url ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-50/60 border border-surface-300/10">
                    <div className="w-9 h-9 rounded-lg bg-primary-bg flex items-center justify-center">
                      <File className="w-4 h-4 text-primary-light" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-txt-secondary font-medium">Arquivo atual</p>
                      <p className="text-[10px] text-txt-dim truncate">{editando.midia_url}</p>
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[11px] text-primary-light hover:text-primary-light font-medium transition-colors"
                    >
                      Trocar
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-surface-300/20 hover:border-primary-bg bg-surface-50/30 hover:bg-primary-bg cursor-pointer transition-all duration-200"
                  >
                    <Upload className="w-5 h-5 text-txt-dim" />
                    <p className="text-[12px] text-txt-dim">
                      Arraste ou clique para selecionar
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT_MAP[tipo]}
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Legenda (caption) */}
              <div>
                <label className="block text-[12px] font-medium text-txt-muted mb-1.5">
                  Legenda <span className="text-txt-dim">(opcional)</span>
                </label>
                <textarea
                  value={conteudo}
                  onChange={(e) => setConteudo(e.target.value)}
                  placeholder="Caption da mídia..."
                  rows={2}
                  className="input-dark text-[13px] resize-none"
                />
              </div>
            </>
          )}

          {/* Mencionar todos toggle */}
          <label
            className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200"
            style={{
              background: mencionarTodos ? 'var(--color-primary-bg)' : 'rgba(255,255,255,0.03)',
              border: mencionarTodos ? '1px solid var(--color-primary-bg)' : '1px solid rgba(255,255,255,0.04)',
            }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: mencionarTodos ? 'var(--color-primary-bg)' : 'rgba(255,255,255,0.04)' }}
            >
              <Megaphone className="w-4 h-4" style={{ color: mencionarTodos ? 'var(--color-primary-light)' : 'rgba(255,255,255,0.3)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[13px] font-medium block" style={{ color: mencionarTodos ? '#fff' : 'rgba(255,255,255,0.6)' }}>
                Mencionar todos (@everyone)
              </span>
              <span className="text-[11px] block mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Notifica todos os membros ao enviar
              </span>
            </div>
            <div
              className="relative w-[44px] h-[24px] rounded-full transition-all duration-300 shrink-0"
              style={{
                background: mencionarTodos ? 'var(--color-primary-bg)' : 'rgba(255,255,255,0.1)',
                border: mencionarTodos ? '1px solid var(--color-primary-bg)' : '1px solid rgba(255,255,255,0.15)',
              }}
              onClick={(e) => { e.preventDefault(); setMencionarTodos(!mencionarTodos); }}
            >
              <div
                className="absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white transition-transform duration-300"
                style={{
                  transform: mencionarTodos ? 'translateX(22px)' : 'translateX(2px)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }}
              />
            </div>
            <input
              type="checkbox"
              checked={mencionarTodos}
              onChange={() => setMencionarTodos(!mencionarTodos)}
              className="sr-only"
            />
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-surface-300/20">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] font-medium text-txt-secondary bg-surface-200/30 hover:bg-surface-200/50 rounded-xl border border-surface-300/20 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSave || loading}
            className={cn(
              'flex items-center gap-2 px-5 py-2 text-[13px] font-semibold rounded-xl transition-all duration-200',
              canSave && !loading
                ? 'bg-primary-hover hover:bg-primary text-white shadow-[0_2px_12px_var(--color-primary-bg)] hover:shadow-[0_4px_20px_var(--color-primary-bg)]'
                : 'bg-surface-200/30 text-txt-dim cursor-not-allowed'
            )}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {editando ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </div>

      {/* Modal secundario: Adicionar a Base de Conhecimento */}
      {onAddExemplo && (
        <AdicionarExemploModal
          isOpen={showExemploModal}
          onClose={() => setShowExemploModal(false)}
          onAdd={async (dados) => {
            try {
              await onAddExemplo(dados);
              showToast?.('success', 'Adicionado a base de conhecimento');
            } catch {
              showToast?.('error', 'Erro ao adicionar a base');
              throw new Error('Falha');
            }
          }}
          initialConteudo={conteudo}
        />
      )}
    </div>
  );
};
