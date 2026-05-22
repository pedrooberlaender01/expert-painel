import { format, formatDistanceToNow, parseISO, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const formatTelefone = (telefone: string): string => {
  const cleaned = ('' + telefone).replace(/\D/g, '');
  const match = cleaned.match(/^(\d{2})(\d{2})(\d{5})(\d{4})$/);
  if (match) {
    return `+${match[1]} (${match[2]}) ${match[3]}-${match[4]}`;
  }
  // Fallback para formato brasileiro sem DDI se for curto
  const matchBR = cleaned.match(/^(\d{2})(\d{5})(\d{4})$/);
  if (matchBR) {
    return `(${matchBR[1]}) ${matchBR[2]}-${matchBR[3]}`;
  }
  return telefone;
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '-';
  return format(parseISO(dateString), 'dd/MM/yyyy', { locale: ptBR });
};

export const formatTime = (dateString: string): string => {
  if (!dateString) return '-';
  return format(parseISO(dateString), 'HH:mm', { locale: ptBR });
};

export const formatRelativeTime = (dateString: string): string => {
  if (!dateString) return '-';
  return formatDistanceToNow(parseISO(dateString), { addSuffix: true, locale: ptBR });
};

export const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    primeiro_audio_enviado: "Aguardando Nome",
    convite_enviado: "Convite Enviado",
    interessado: "Interessado",
    aguardando_cadastro: "Aguardando Cadastro",
    link_enviado: "Link Enviado",
    aguardando_confirmacao_entrada: "Aguardando Confirmação",
    no_grupo: "No Grupo ✓",
    entrou_grupo: "Entrou no Grupo",
    nao_interessado: "Não Interessado",
    sem_resposta: "Sem Resposta",
    atendimento_manual: "Atendimento Manual",
    lead_chegou: "Lead Chegou",
  };
  return labels[status] || status;
};

export const getStatusPremiumLabel = (status: string): string => {
  const labels: Record<string, string> = {
    primeiro_audio_enviado: "Primeiro Áudio Enviado",
    em_andamento: "Em Andamento",
    encerrado: "Encerrado",
  };
  return labels[status] || status;
};

export const formatTempoNoGrupo = (entrouNoGrupo: string): string => {
  const entrou = parseISO(entrouNoGrupo);
  const agora = new Date();

  const mins = differenceInMinutes(agora, entrou);
  if (mins < 60) return `${mins} min`;

  const horas = differenceInHours(agora, entrou);
  if (horas < 24) return `${horas}h`;

  const dias = differenceInDays(agora, entrou);
  if (dias < 30) return `${dias}d`;

  const meses = Math.floor(dias / 30);
  return `${meses} ${meses === 1 ? 'mês' : 'meses'}`;
};

export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    primeiro_audio_enviado: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    convite_enviado: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    interessado: "bg-primary-bg text-primary-light border-primary-bg",
    aguardando_cadastro: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    link_enviado: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    aguardando_confirmacao_entrada: "bg-primary-bg text-primary-light border-primary-bg",
    no_grupo: "bg-primary-bg text-primary-light border-primary-bg",
    entrou_grupo: "bg-primary-bg text-primary-light border-primary-bg",
    nao_interessado: "bg-surface-300/30 text-txt-muted border-surface-300/30",
    sem_resposta: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    atendimento_manual: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    // Premium status colors
    em_andamento: "bg-primary-bg text-primary-light border-primary-bg",
    encerrado: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  };
  return colors[status] || "bg-surface-300/20 text-txt-muted border-surface-300/20";
};
