import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { Zap } from 'lucide-react';

type GatilhoNodeData = {
  palavras?: string[];
};

export const GatilhoNode = memo(({ data, selected }: NodeProps & { data: GatilhoNodeData }) => {
  const palavras = data.palavras ?? [];

  // Preview inteligente: 1-3 completas, 4+ com "e mais N"
  let preview: string;
  if (palavras.length === 0) {
    preview = 'Nenhuma palavra configurada';
  } else if (palavras.length <= 3) {
    preview = palavras.join(' · ');
  } else {
    preview = `${palavras[0]} · ${palavras[1]} e mais ${palavras.length - 2}`;
  }

  return (
    <div
      className="w-[200px] rounded-xl px-3.5 py-3 cursor-grab active:cursor-grabbing transition-colors duration-150"
      style={{
        background: 'rgba(250, 204, 60, 0.08)',
        border: selected
          ? '2px solid rgba(250, 204, 60, 0.6)'
          : '1px solid rgba(250, 204, 60, 0.25)',
        boxShadow: selected
          ? '0 0 0 3px rgba(250, 204, 60, 0.12)'
          : 'none',
      }}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.borderColor = 'rgba(250, 204, 60, 0.4)'; }}
      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.borderColor = 'rgba(250, 204, 60, 0.25)'; }}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
          style={{ background: 'rgba(250, 204, 60, 0.2)' }}
        >
          <Zap className="w-3.5 h-3.5" style={{ color: '#facc3c' }} />
        </div>
        <span className="text-[10px] uppercase tracking-[0.08em] font-medium" style={{ color: '#facc3c' }}>
          Gatilho
        </span>
      </div>

      {/* Titulo */}
      <p className="text-[13px] font-medium text-txt mt-1.5">Palavras de ativação</p>

      {/* Preview */}
      <p className="text-[11px] mt-1" style={{ color: palavras.length === 0 ? 'rgb(var(--c-fg-rgb) / 0.3)' : 'rgb(var(--c-fg-rgb) / 0.5)' }}>
        {preview}
      </p>

      {/* Handle source */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: 6,
          height: 6,
          background: '#facc3c',
          border: 'none',
          right: -3,
        }}
      />
    </div>
  );
});

GatilhoNode.displayName = 'GatilhoNode';
