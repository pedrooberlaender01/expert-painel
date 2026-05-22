import React, { useState } from 'react';
import { Users, UserCheck, UserX } from 'lucide-react';
import { LeadPreviewItem } from './LeadPreviewItem';
import { cn } from '../../utils/cn';
import type { LeadEnvio } from '../../hooks/useEnvioMassa';

interface LeadPreviewListProps {
  leads: LeadEnvio[];
  loading?: boolean;
}

type TabFilter = 'todos' | 'com_nome' | 'sem_nome';

export const LeadPreviewList: React.FC<LeadPreviewListProps> = ({ leads, loading }) => {
  const [tab, setTab] = useState<TabFilter>('todos');

  const comNome = leads.filter((l) => l.tem_nome);
  const semNome = leads.filter((l) => !l.tem_nome);

  const filteredLeads = tab === 'com_nome' ? comNome : tab === 'sem_nome' ? semNome : leads;
  const displayLeads = filteredLeads.slice(0, 50);
  const remaining = filteredLeads.length - 50;

  const tabs = [
    { key: 'todos' as const, label: 'Todos', count: leads.length, icon: Users },
    { key: 'com_nome' as const, label: 'Com nome', count: comNome.length, icon: UserCheck },
    { key: 'sem_nome' as const, label: 'Sem nome', count: semNome.length, icon: UserX },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface-50/80 rounded-xl mb-3">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[12px] font-medium transition-all duration-200',
              tab === t.key
                ? 'bg-surface-200/60 text-txt shadow-sm'
                : 'text-txt-muted hover:text-txt-secondary'
            )}
          >
            <t.icon className="w-3 h-3" />
            {t.label}
            <span className={cn(
              'text-[10px] font-mono px-1.5 py-0.5 rounded-md',
              tab === t.key ? 'bg-primary/15 text-primary' : 'bg-surface-300/20 text-txt-dim'
            )}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-0.5 min-h-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-accent rounded-full animate-spin mb-3" />
            <p className="text-[13px] text-txt-muted">Buscando leads...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="w-10 h-10 text-txt-dim mb-3" />
            <p className="text-[13px] text-txt-muted">Nenhum lead encontrado</p>
            <p className="text-[11px] text-txt-dim mt-1">com os filtros selecionados</p>
          </div>
        ) : (
          <>
            {displayLeads.map((lead) => (
              <LeadPreviewItem key={lead.id} lead={lead} />
            ))}
            {remaining > 0 && (
              <div className="text-center py-3 text-[12px] text-txt-muted">
                e mais <span className="text-primary font-medium">{remaining}</span> leads...
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
