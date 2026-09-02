import React, { useState } from 'react';
import {
  MessageSquare,
  Mic,
  Image,
  Video,
  Users,
  UsersRound,
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
  AlertTriangle,
  ArrowLeftRight,
  Send,
  Trash2,
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
  enviando: { bg: 'bg-primary-bg', text: 'text-primary', label: 'Enviando' },
  enviado: { bg: 'bg-primary-bg', text: 'text-primary-light', label: 'Enviado' },
  erro: { bg: 'bg-red-500/10', text: 'text-red-500', label: 'Erro' },
  cancelado: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', label: 'Cancelado' },
};

// Icone WhatsApp (SVG inline — Lucide nao possui icone oficial)
const WhatsappIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.768.967-.941 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const CANAL_STYLES: Record<
  'whatsapp' | 'telegram',
  { bg: string; border: string; color: string; label: string; Icon: React.FC<{ className?: string }> }
> = {
  whatsapp: {
    bg: 'rgba(37, 211, 102, 0.1)',
    border: '1px solid rgba(37, 211, 102, 0.25)',
    color: '#25d366',
    label: 'WhatsApp',
    Icon: WhatsappIcon,
  },
  telegram: {
    bg: 'rgba(0, 136, 204, 0.1)',
    border: '1px solid rgba(0, 136, 204, 0.25)',
    color: '#29b6f6',
    label: 'Telegram',
    Icon: Send,
  },
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
  onApagarEnvios?: (agendamento: AgendamentoGrupo) => void;
  precisaTrocarInstancia?: boolean;
  onTrocarInstancia?: (agendamento: AgendamentoGrupo) => void;
  onAlterarGrupos?: (agendamento: AgendamentoGrupo) => void;
}

export const AgendamentoCard: React.FC<AgendamentoCardProps> = ({
  agendamento,
  onDetalhes,
  onDuplicar,
  onCancelar,
  onEditar,
  onReagendar,
  onApagarEnvios,
  precisaTrocarInstancia = false,
  onTrocarInstancia,
  onAlterarGrupos,
}) => {
  const [expanded, setExpanded] = useState(false);
  const msg = agendamento.mensagem;
  const tipo = msg?.tipo ?? 'texto';
  const TipoIcon = TIPO_ICON[tipo];
  const status = STATUS_STYLES[agendamento.status];
  const canal = CANAL_STYLES[agendamento.canal] ?? CANAL_STYLES.whatsapp;
  const CanalIcon = canal.Icon;
  const recorrencia = descricaoRecorrencia(agendamento);

  const sucessos =
    agendamento.resultado?.filter((r) => r.sucesso).length ?? 0;
  const totalResultado = agendamento.resultado?.length ?? 0;
  const showResultado =
    agendamento.status === 'enviado' && agendamento.resultado;

  const showDetalhes =
    agendamento.status === 'enviado' || agendamento.status === 'erro';
  const showCancelar = agendamento.status === 'pendente';

  // Botao "Apagar Enviados" so aparece quando status=enviado, ha pelo menos 1 item com message_id
  // e handler foi fornecido. Agendamentos antigos (sem message_id no resultado) ficam com botao oculto.
  const temMessageIdRastreavel =
    agendamento.status === 'enviado' &&
    (agendamento.resultado?.some(
      (r) => r.sucesso && (r as { message_id?: string }).message_id
    ) ?? false);

  // Detecta se TODAS mensagens rastreaveis ja foram apagadas (deleted_at preenchido em todas)
  const itensRastreaveis = agendamento.resultado?.filter(
    (r) => r.sucesso && (r as { message_id?: string }).message_id
  ) ?? [];
  const todasApagadas =
    temMessageIdRastreavel &&
    itensRastreaveis.length > 0 &&
    itensRastreaveis.every((r) => !!(r as { deleted_at?: string }).deleted_at);

  const showApagarEnvios = !!onApagarEnvios && temMessageIdRastreavel && !todasApagadas;

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
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide shrink-0"
              style={{ background: canal.bg, border: canal.border, color: canal.color }}
              title={canal.label}
            >
              <CanalIcon className="w-2.5 h-2.5" />
              {canal.label}
            </span>
            {agendamento.usar_fila && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide shrink-0"
                style={{
                  background: 'rgba(16,185,129,0.1)',
                  border: '1px solid rgba(16,185,129,0.3)',
                  color: '#34d399',
                }}
                title="Envio rotacionando entre instâncias ativas"
              >
                <Repeat className="w-2.5 h-2.5" />
                Fila Rotativa
              </span>
            )}
            {todasApagadas && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide shrink-0"
                style={{
                  background: 'rgba(244, 63, 94, 0.08)',
                  border: '1px solid rgba(244, 63, 94, 0.2)',
                  color: '#fb7185',
                }}
                title="Mensagens foram removidas dos grupos"
              >
                <Trash2 className="w-2.5 h-2.5" />
                Apagadas
              </span>
            )}
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

            <span className="whitespace-normal break-words">
              Via: {agendamento.usar_fila ? 'Fila rotativa' : agendamento.instancia}
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
                  style={{ background: 'rgba(var(--color-primary-rgb),0.1)', color: 'var(--color-primary-light)' }}
                >
                  <Megaphone className="w-2.5 h-2.5" />
                  @todos
                </span>
              </>
            )}
            {precisaTrocarInstancia && (
              <>
                <span className="text-surface-300/50">|</span>
                <span className="inline-flex items-center gap-1 text-red-400 font-medium">
                  <AlertTriangle className="w-3 h-3" />
                  Instância desconectada
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
              className="p-2 rounded-lg text-txt-dim hover:text-primary hover:bg-primary/5 transition-all"
              title="Ver detalhes"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          )}
          {showApagarEnvios && (
            <button
              onClick={() => onApagarEnvios!(agendamento)}
              className="p-2 rounded-lg text-txt-dim hover:text-red-400 hover:bg-red-500/5 transition-all"
              title="Apagar mensagens enviadas"
            >
              <Trash2 className="w-3.5 h-3.5" />
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
          {showCancelar && onAlterarGrupos && (
            <button
              onClick={() => onAlterarGrupos(agendamento)}
              className="p-2 rounded-lg text-txt-dim hover:text-emerald-400 hover:bg-emerald-500/5 transition-all"
              title="Alterar grupos"
            >
              <UsersRound className="w-3.5 h-3.5" />
            </button>
          )}
          {showCancelar && onTrocarInstancia && (
            <button
              onClick={() => onTrocarInstancia(agendamento)}
              className="p-2 rounded-lg transition-all"
              style={{
                color: precisaTrocarInstancia ? '#f87171' : 'var(--tw-text-opacity, rgb(var(--c-fg-rgb) / 0.35))',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#a78bfa'; e.currentTarget.style.background = 'rgba(167,139,250,0.08)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = precisaTrocarInstancia ? '#f87171' : 'rgb(var(--c-fg-rgb) / 0.35)'; e.currentTarget.style.background = 'transparent' }}
              title="Trocar instância"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
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
