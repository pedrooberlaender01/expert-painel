import React, { useState } from 'react';
import {
  MessageSquare,
  Mic,
  Image,
  Video,
  Users,
  Repeat,
  Eye,
  Copy,
  X,
  Radio,
  ChevronDown,
  FileAudio,
  FileVideo,
  Pencil,
  Megaphone,
  Clock,
} from 'lucide-react';
import type { AgendamentoGrupo, AgendamentoMensagem } from '../../hooks/useAgendamentos';
import { cn } from '../../utils/cn';

const TIPO_ICON: Record<AgendamentoMensagem['tipo'], typeof MessageSquare> = {
  texto: MessageSquare,
  audio: Mic,
  imagem: Image,
  video: Video,
};

const STATUS_STYLES: Record<
  AgendamentoGrupo['status'],
  { bg: string; text: string; label: string }
> = {
  pendente: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', label: 'Pendente' },
  enviando: { bg: 'bg-blue-500/10', text: 'text-blue-500', label: 'Enviando' },
  enviado: { bg: 'bg-primary-bg', text: 'text-primary-light', label: 'Enviado' },
  erro: { bg: 'bg-red-500/10', text: 'text-red-500', label: 'Erro' },
  cancelado: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', label: 'Cancelado' },
};

const DIAS_LABEL = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function formatDataHora(iso: string): string {
  try {
    const d = new Date(iso);
    const dia = d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const hora = d.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${dia} às ${hora}`;
  } catch {
    return iso;
  }
}

function descricaoRecorrencia(agendamento: AgendamentoGrupo): string | null {
  if (!agendamento.recorrente || !agendamento.regra_recorrencia) return null;
  const regra = agendamento.regra_recorrencia;
  if (regra.tipo === 'diario') return 'Diário';
  if (regra.dias_semana.length > 0) {
    return regra.dias_semana.map((d) => DIAS_LABEL[d]).join('/');
  }
  if (regra.tipo === 'semanal') return 'Semanal';
  return 'Personalizado';
}

interface AgendamentoCardProps {
  agendamento: AgendamentoGrupo;
  onDetalhes: (agendamento: AgendamentoGrupo) => void;
  onDuplicar: (agendamento: AgendamentoGrupo) => void;
  onCancelar: (agendamento: AgendamentoGrupo) => void;
  onEditar?: (agendamento: AgendamentoGrupo) => void;
  onReagendar?: (agendamento: AgendamentoGrupo) => void;
}

export const AgendamentoCard: React.FC<AgendamentoCardProps> = ({
  agendamento,
  onDetalhes,
  onDuplicar,
  onCancelar,
  onEditar,
  onReagendar,
}) => {
  const [expanded, setExpanded] = useState(false);
  const msg = agendamento.mensagem;
  const tipo = msg?.tipo ?? 'texto';
  const TipoIcon = TIPO_ICON[tipo];
  const status = STATUS_STYLES[agendamento.status];
  const recorrencia = descricaoRecorrencia(agendamento);

  const sucessos =
    agendamento.resultado?.filter((r) => r.sucesso).length ?? 0;
  const totalResultado = agendamento.resultado?.length ?? 0;
  const showResultado =
    agendamento.status === 'enviado' && agendamento.resultado;

  const showDetalhes =
    agendamento.status === 'enviado' || agendamento.status === 'erro';
  const showCancelar = agendamento.status === 'pendente';

  return (
    <div className="group card-dark rounded-xl p-5 border border-surface-300/10 hover:border-surface-300/20 transition-all duration-200">
      <div className="flex items-start gap-4">
        {/* Type icon */}
        <div className="w-10 h-10 rounded-xl bg-surface-200/30 flex items-center justify-center shrink-0">
          <TipoIcon className="w-[18px] h-[18px] text-txt-muted" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Row 1: name + status */}
          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
            <h4 className="text-[13px] font-semibold text-txt font-display truncate">
              {agendamento.mensagem?.nome ?? 'Mensagem removida'}
            </h4>
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide shrink-0',
                status.bg,
                status.text,
                agendamento.status === 'enviando' && 'animate-pulse'
              )}
            >
              {agendamento.status === 'enviando' && (
                <Radio className="w-2.5 h-2.5" />
              )}
              {status.label}
            </span>
          </div>

          {/* Row 2: meta info */}
          <div className="flex items-center gap-3 flex-wrap text-[11px] text-txt-dim">
            <span className="font-mono">{formatDataHora(agendamento.data_envio)}</span>

            <span className="text-surface-300/50">|</span>

            <span className="inline-flex items-center gap-1">
              <Users className="w-3 h-3" />
              {agendamento.grupos.length} grupo{agendamento.grupos.length !== 1 ? 's' : ''}
            </span>

            <span className="text-surface-300/50">|</span>

            <span className="truncate max-w-[140px]">
              Via: {agendamento.instancia}
            </span>

            {recorrencia && (
              <>
                <span className="text-surface-300/50">|</span>
                <span className="inline-flex items-center gap-1 text-primary-light/80">
                  <Repeat className="w-3 h-3" />
                  {recorrencia}
                </span>
              </>
            )}

            {agendamento.mensagem?.mencionar_todos && (
              <>
                <span className="text-surface-300/50">|</span>
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium"
                  style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}
                >
                  <Megaphone className="w-2.5 h-2.5" />
                  @todos
                </span>
              </>
            )}
          </div>

          {/* Row 3: resultado summary */}
          {showResultado && (
            <p className="mt-2 text-[11px] font-medium text-primary-light/70">
              {sucessos}/{totalResultado} grupos com sucesso
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          {showDetalhes && (
            <button
              onClick={() => onDetalhes(agendamento)}
              className="p-2 rounded-lg text-txt-dim hover:text-[#004AFF] hover:bg-[#004AFF]/5 transition-all"
              title="Ver detalhes"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          )}
          {showCancelar && onReagendar && (
            <button
              onClick={() => onReagendar(agendamento)}
              className="p-2 rounded-lg text-txt-dim hover:text-sky-400 hover:bg-sky-500/5 transition-all"
              title="Alterar horário"
            >
              <Clock className="w-3.5 h-3.5" />
            </button>
          )}
          {showCancelar && onEditar && (
            <button
              onClick={() => onEditar(agendamento)}
              className="p-2 rounded-lg text-txt-dim hover:text-amber-400 hover:bg-amber-500/5 transition-all"
              title="Editar mensagem"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => onDuplicar(agendamento)}
            className="p-2 rounded-lg text-txt-dim hover:text-primary-light hover:bg-primary-bg transition-all"
            title="Duplicar"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          {showCancelar && (
            <button
              onClick={() => onCancelar(agendamento)}
              className="p-2 rounded-lg text-txt-dim hover:text-red-400 hover:bg-red-500/5 transition-all"
              title="Cancelar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setExpanded((p) => !p)}
            className="p-2 rounded-lg text-txt-dim hover:text-txt hover:bg-surface-200/30 transition-all"
            title="Ver preview"
          >
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-200', expanded && 'rotate-180')} />
          </button>
        </div>
      </div>

      {/* Preview */}
      {expanded && msg && (
        <div className="mt-4 pt-4 border-t border-surface-300/10">
          <p className="text-[10px] text-txt-dim uppercase tracking-wider font-mono mb-2">Preview</p>
          <div className="rounded-xl bg-surface-50/40 border border-surface-300/10 p-3">
            {tipo === 'texto' && (
              <p className="text-[12px] text-txt-secondary leading-relaxed whitespace-pre-wrap">
                {msg.conteudo || '(sem conteúdo)'}
              </p>
            )}
            {tipo === 'imagem' && msg.midia_url && (
              <div className="space-y-2">
                <img
                  src={msg.midia_url}
                  alt={msg.nome}
                  className="max-h-[200px] rounded-lg object-contain"
                />
                {msg.conteudo && (
                  <p className="text-[11px] text-txt-dim">{msg.conteudo}</p>
                )}
              </div>
            )}
            {tipo === 'audio' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary-bg flex items-center justify-center">
                    <FileAudio className="w-4 h-4 text-primary-light" />
                  </div>
                  <div>
                    <p className="text-[12px] text-txt-secondary">{msg.nome}</p>
                    <p className="text-[10px] text-txt-dim">Áudio</p>
                  </div>
                </div>
                {msg.midia_url && (
                  <audio controls className="w-full h-8 mt-1" style={{ filter: 'invert(1) hue-rotate(180deg) brightness(0.8)' }}>
                    <source src={msg.midia_url} type={msg.midia_mimetype || 'audio/mpeg'} />
                  </audio>
                )}
              </div>
            )}
            {tipo === 'video' && (
              <div className="space-y-2">
                {msg.midia_url ? (
                  <video
                    controls
                    className="max-h-[200px] rounded-lg w-full"
                    src={msg.midia_url}
                  />
                ) : (
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary-bg flex items-center justify-center">
                      <FileVideo className="w-4 h-4 text-primary-light" />
                    </div>
                    <p className="text-[12px] text-txt-secondary">{msg.nome}</p>
                  </div>
                )}
                {msg.conteudo && (
                  <p className="text-[11px] text-txt-dim">{msg.conteudo}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
