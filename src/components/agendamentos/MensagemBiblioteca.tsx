import React, { useState, useMemo } from 'react';
import { Search, MessageSquare, Mic, Image, Video, Pencil, Plus, FileVideo, Megaphone } from 'lucide-react';
import type { AgendamentoMensagem } from '../../hooks/useAgendamentos';
import { cn } from '../../utils/cn';
import { AudioPlayer } from './AudioPlayer';

const TIPO_ICON: Record<AgendamentoMensagem['tipo'], typeof MessageSquare> = {
  texto: MessageSquare,
  audio: Mic,
  imagem: Image,
  video: Video,
};

const TIPO_LABEL: Record<AgendamentoMensagem['tipo'], string> = {
  texto: 'Texto',
  audio: 'Áudio',
  imagem: 'Imagem',
  video: 'Vídeo',
};

interface MensagemBibliotecaProps {
  mensagens: AgendamentoMensagem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNovaMensagem: () => void;
  onEditarMensagem: (mensagem: AgendamentoMensagem) => void;
  loading: boolean;
  canal?: 'whatsapp' | 'telegram';
}

export const MensagemBiblioteca: React.FC<MensagemBibliotecaProps> = ({
  mensagens,
  selectedId,
  onSelect,
  onNovaMensagem,
  onEditarMensagem,
  loading,
  canal = 'whatsapp',
}) => {
  const isTelegram = canal === 'telegram';
  const [busca, setBusca] = useState('');

  const filtradas = useMemo(
    () =>
      mensagens.filter((m) =>
        m.nome.toLowerCase().includes(busca.toLowerCase())
      ),
    [mensagens, busca]
  );

  const selecionada = mensagens.find((m) => m.id === selectedId) ?? null;

  return (
    <div className="card-dark rounded-2xl overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-5 border-b border-surface-300/10">
        <div className="flex items-center gap-3 mb-4">
          <span className={cn(
            'inline-flex items-center justify-center w-6 h-6 rounded-lg text-[11px] font-bold font-mono',
            isTelegram ? 'bg-sky-500/15 text-sky-400' : 'bg-primary-bg text-primary-light'
          )}>
            1
          </span>
          <h3 className="text-[14px] font-semibold text-txt font-display">Mensagem</h3>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-txt-dim pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar mensagem..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="input-dark text-[13px] pl-9 py-2"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto min-h-0 max-h-[240px] p-2 space-y-1">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-pulse">
              <div className="w-8 h-8 bg-surface-200/40 rounded-lg shrink-0" />
              <div className="flex-1">
                <div className="h-3.5 bg-surface-200/40 rounded w-24 mb-1" />
                <div className="h-3 bg-surface-200/30 rounded w-16" />
              </div>
            </div>
          ))
        ) : filtradas.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[12px] text-txt-dim">
              {busca ? 'Nenhuma mensagem encontrada' : 'Nenhuma mensagem cadastrada'}
            </p>
          </div>
        ) : (
          filtradas.map((msg) => {
            const Icon = TIPO_ICON[msg.tipo];
            const isSelected = selectedId === msg.id;
            return (
              <button
                key={msg.id}
                onClick={() => onSelect(msg.id)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-left group',
                  isSelected
                    ? isTelegram ? 'bg-sky-500/10 border border-sky-500/25' : 'bg-primary-bg border border-primary-bg'
                    : 'hover:bg-surface-200/30 border border-transparent'
                )}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                    isSelected
                      ? isTelegram ? 'bg-sky-500/20 text-sky-400' : 'bg-primary-bg text-primary-light'
                      : 'bg-surface-200/40 text-txt-dim group-hover:text-txt-muted'
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-[13px] font-medium truncate',
                      isSelected ? (isTelegram ? 'text-sky-300' : 'text-primary-light') : 'text-txt-secondary'
                    )}
                  >
                    {msg.nome}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-[11px] text-txt-dim">{TIPO_LABEL[msg.tipo]}</p>
                    {msg.mencionar_todos && (
                      <span
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium"
                        style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}
                      >
                        <Megaphone className="w-2.5 h-2.5" />
                        @todos
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditarMensagem(msg);
                  }}
                  className="p-1.5 rounded-lg text-txt-dim hover:text-txt hover:bg-surface-200/50 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </button>
            );
          })
        )}
      </div>

      {/* Preview */}
      {selecionada && (
        <div className="border-t border-surface-300/10 p-4">
          <p className="text-[11px] text-txt-dim uppercase tracking-wider font-mono mb-2">Preview</p>
          <div className="rounded-xl bg-surface-50/60 border border-surface-300/10 p-3 max-h-[260px] overflow-y-auto">
            {selecionada.tipo === 'texto' && (
              <p className="text-[12px] text-txt-secondary leading-relaxed whitespace-pre-wrap">
                {selecionada.conteudo || '(sem conteúdo)'}
              </p>
            )}
            {selecionada.tipo === 'imagem' && selecionada.midia_url && (
              <div className="space-y-2">
                <img
                  src={selecionada.midia_url}
                  alt={selecionada.nome}
                  className="w-full rounded-lg object-contain"
                />
                {selecionada.conteudo && (
                  <p className="text-[11px] text-txt-dim">{selecionada.conteudo}</p>
                )}
              </div>
            )}
            {selecionada.tipo === 'audio' && (
              selecionada.midia_url ? (
                <AudioPlayer src={selecionada.midia_url} nome={selecionada.nome} canal={canal} />
              ) : (
                <p className="text-[12px] text-txt-dim italic">Áudio sem arquivo</p>
              )
            )}
            {selecionada.tipo === 'video' && (
              selecionada.midia_url ? (
                <div className="space-y-2">
                  <video
                    src={selecionada.midia_url}
                    controls
                    className="w-full rounded-lg object-contain bg-black/30"
                  />
                  {selecionada.conteudo && (
                    <p className="text-[11px] text-txt-dim">{selecionada.conteudo}</p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', isTelegram ? 'bg-sky-500/10' : 'bg-primary-bg')}>
                    <FileVideo className={cn('w-4 h-4', isTelegram ? 'text-sky-400' : 'text-primary-light')} />
                  </div>
                  <div>
                    <p className="text-[12px] text-txt-secondary">{selecionada.nome}</p>
                    <p className="text-[10px] text-txt-dim">Vídeo sem arquivo</p>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* New Message Button */}
      <div className="p-3 border-t border-surface-300/10">
        <button
          onClick={onNovaMensagem}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-semibold transition-all duration-200 border',
            isTelegram
              ? 'bg-sky-500/10 text-sky-400 border-sky-500/20 hover:bg-sky-500/15 hover:border-sky-500/30 hover:shadow-[0_0_20px_rgba(56,189,248,0.08)]'
              : 'bg-primary-bg text-primary-light border-primary-bg hover:bg-primary-bg hover:border-primary-bg hover:shadow-[0_0_20px_var(--color-primary-bg)]'
          )}
        >
          <Plus className="w-3.5 h-3.5" />
          Nova mensagem
        </button>
      </div>
    </div>
  );
};
