import React from 'react';
import { StatusLead } from '../types';
import { getStatusLabel } from '../utils/formatters';
import { cn } from '../utils/cn';

interface LeadBadgeProps {
  status: StatusLead;
  className?: string;
}

const statusColors: Record<StatusLead, string> = {
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
  atendimento_manual: "bg-zinc-500/10 text-txt-muted border-zinc-500/20",
  lead_chegou: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
};

export const LeadBadge: React.FC<LeadBadgeProps> = ({ status, className }) => {
  return (
    <span className={cn(
      "px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium border whitespace-nowrap tracking-wide",
      statusColors[status],
      className
    )}>
      {getStatusLabel(status)}
    </span>
  );
};
