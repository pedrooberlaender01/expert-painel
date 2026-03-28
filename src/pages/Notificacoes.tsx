import React from 'react';
import { PageHeader } from '../components/PageHeader';
import { formatRelativeTime } from '../utils/formatters';
import { Bell, UserPlus, Heart, CheckCircle, LogOut } from 'lucide-react';
import { cn } from '../utils/cn';
import { useNotificacoes, type NotificacaoComLead } from '../hooks/useNotificacoes';
import type { TipoNotificacao } from '../types/database';

const getIcon = (tipo: TipoNotificacao) => {
  switch (tipo) {
    case 'novo_lead': return UserPlus;
    case 'interesse': return Heart;
    case 'conversao': return CheckCircle;
    case 'saiu_grupo': return LogOut;
    default: return Bell;
  }
};

const getColor = (tipo: TipoNotificacao) => {
  switch (tipo) {
    case 'novo_lead': return "bg-sky-500/10 text-sky-400 border-sky-500/20";
    case 'interesse': return "bg-primary-bg text-primary-light border-primary-bg";
    case 'conversao': return "bg-primary-bg text-primary-light border-primary-bg";
    case 'saiu_grupo': return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    default: return "bg-surface-300/20 text-txt-muted border-surface-300/20";
  }
};

interface NotificacoesListProps {
  notificacoes: NotificacaoComLead[];
  loading?: boolean;
  onMarcarComoLida?: (id: string) => void;
}

export const NotificacoesList: React.FC<NotificacoesListProps> = ({
  notificacoes,
  loading,
  onMarcarComoLida,
}) => {
  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="w-5 h-5 border-2 border-[#004AFF]/30 border-t-accent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-txt-muted mt-3">Carregando notificacoes...</p>
      </div>
    );
  }

  if (notificacoes.length === 0) {
    return (
      <div className="p-8 text-center">
        <Bell className="w-8 h-8 text-txt-dim mx-auto mb-2" />
        <p className="text-sm text-txt-muted">Nenhuma notificacao pendente</p>
        <p className="text-[11px] text-txt-dim mt-1">Voce esta em dia!</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-surface-300/10">
      {notificacoes.map((notif) => {
        const Icon = getIcon(notif.tipo);
        return (
          <div
            key={notif.id}
            onClick={() => onMarcarComoLida?.(notif.id)}
            className={cn(
              "px-5 py-4 flex gap-4 hover:bg-surface-200/20 transition-all duration-200 cursor-pointer",
              !notif.lida && "bg-[#004AFF]/[0.02]"
            )}
          >
            <div className={cn("p-2 rounded-xl h-fit border", getColor(notif.tipo))}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm text-txt-secondary leading-relaxed", !notif.lida && "font-semibold text-txt")}>
                {notif.mensagem}
              </p>
              <p className="text-[11px] text-txt-dim mt-1 font-mono">
                {formatRelativeTime(notif.created_at)}
              </p>
            </div>
            {!notif.lida && (
              <div className="w-2 h-2 bg-[#004AFF] rounded-full mt-2 shrink-0 animate-glow-pulse" />
            )}
          </div>
        );
      })}
    </div>
  );
};

export const Notificacoes: React.FC = () => {
  const { notificacoes, loading, marcarComoLida, marcarTodasComoLidas } = useNotificacoes();

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Notificacoes"
        rightContent={
          <button
            onClick={marcarTodasComoLidas}
            disabled={notificacoes.length === 0}
            className="text-xs text-[#004AFF] hover:text-blue-300 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Marcar todas como lidas
          </button>
        }
      />

      <div className="card-dark overflow-hidden">
        <NotificacoesList
          notificacoes={notificacoes}
          loading={loading}
          onMarcarComoLida={marcarComoLida}
        />
      </div>
    </div>
  );
};
