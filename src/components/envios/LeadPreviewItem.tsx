import React from 'react';
import { Phone } from 'lucide-react';
import { LeadBadge } from '../LeadBadge';
import { formatTelefone } from '../../utils/formatters';
import { cn } from '../../utils/cn';
import type { LeadEnvio } from '../../hooks/useEnvioMassa';

interface LeadPreviewItemProps {
  lead: LeadEnvio;
}

export const LeadPreviewItem: React.FC<LeadPreviewItemProps> = ({ lead }) => {
  const hasName = lead.tem_nome;
  const initial = hasName ? lead.nome!.charAt(0).toUpperCase() : '?';

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-200/20 transition-colors">
      {/* Avatar */}
      <div
        className={cn(
          'w-9 h-9 rounded-xl flex items-center justify-center text-[13px] font-bold shrink-0',
          hasName
            ? 'bg-primary/10 text-primary border border-primary/20'
            : 'bg-surface-200/40 text-txt-muted border border-surface-300/20'
        )}
      >
        {initial}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-[13px] font-medium truncate',
            hasName ? 'text-txt' : 'text-txt-muted italic'
          )}>
            {lead.nome || 'Sem nome'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Phone className="w-2.5 h-2.5 text-txt-dim" />
          <span className="text-[11px] text-txt-muted font-mono">{formatTelefone(lead.telefone)}</span>
        </div>
      </div>

      {/* Right side */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <LeadBadge status={lead.status} className="!text-[9px] !px-1.5 !py-0.5" />
      </div>
    </div>
  );
};
