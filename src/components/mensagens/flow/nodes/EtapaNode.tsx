import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { cn } from '../../../../utils/cn';

type EtapaNodeData = {
  numero: number;
  titulo: string;
  subtitulo: string;
  ativo?: boolean;
};

export const EtapaNode = memo(({ data, selected }: NodeProps & { data: EtapaNodeData }) => {
  const ativo = data.ativo !== false;

  return (
    <div
      className={cn(
        'w-[200px] rounded-xl px-3.5 py-3 relative cursor-grab active:cursor-grabbing border transition-colors duration-150',
        'flow-etapa-bg',
        selected ? 'flow-etapa-border-selected flow-etapa-ring-selected border-2' : 'flow-etapa-border border hover:flow-etapa-border-hover',
      )}
    >
      {/* Badge selecionado */}
      {selected && (
        <span className="absolute -top-2.5 right-2 text-[9px] font-semibold text-white px-1.5 py-0.5 rounded-sm flow-etapa-badge">
          SELECIONADO
        </span>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0 text-[11px] font-medium text-white flow-etapa-circle">
            {data.numero}
          </div>
          <span className="text-[10px] uppercase tracking-[0.08em] font-medium flow-etapa-label">
            Etapa
          </span>
        </div>
        {ativo && (
          <span className="w-1.5 h-1.5 rounded-full shrink-0 flow-etapa-dot" />
        )}
      </div>

      {/* Titulo */}
      <p className="text-[13px] font-medium text-white mt-1.5">{data.titulo}</p>

      {/* Subtitulo */}
      <p className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
        {data.subtitulo}
      </p>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="flow-etapa-handle"
        style={{ width: 6, height: 6, border: 'none', left: -3 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="flow-etapa-handle"
        style={{ width: 6, height: 6, border: 'none', right: -3 }}
      />
    </div>
  );
});

EtapaNode.displayName = 'EtapaNode';
