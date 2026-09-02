import { useReactFlow } from '@xyflow/react';
import { Plus, Minus, Maximize2 } from 'lucide-react';

const btnClass = 'w-8 h-8 flex items-center justify-center rounded-md transition-colors duration-150';

export const FlowControls: React.FC = () => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div
      className="absolute bottom-4 right-4 flex flex-col gap-1 p-1 rounded-lg z-10"
      style={{
        background: 'rgb(var(--c-surface-50-rgb) / 0.9)',
        border: '1px solid var(--c-border-strong)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      <button
        onClick={() => zoomIn({ duration: 200 })}
        className={btnClass}
        title="Aumentar zoom"
        style={{ color: 'var(--c-t-60)' }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'rgb(var(--c-fg-rgb))'; e.currentTarget.style.background = 'var(--c-glass-hover)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'rgb(var(--c-fg-rgb) / 0.6)'; e.currentTarget.style.background = 'transparent'; }}
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => zoomOut({ duration: 200 })}
        className={btnClass}
        title="Diminuir zoom"
        style={{ color: 'var(--c-t-60)' }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'rgb(var(--c-fg-rgb))'; e.currentTarget.style.background = 'var(--c-glass-hover)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'rgb(var(--c-fg-rgb) / 0.6)'; e.currentTarget.style.background = 'transparent'; }}
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <div style={{ height: 1, background: 'rgb(var(--c-fg-rgb) / 0.06)', margin: '0 4px' }} />
      <button
        onClick={() => fitView({ padding: 0.2, duration: 300 })}
        className={btnClass}
        title="Enquadrar fluxo"
        style={{ color: 'var(--c-t-60)' }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'rgb(var(--c-fg-rgb))'; e.currentTarget.style.background = 'var(--c-glass-hover)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'rgb(var(--c-fg-rgb) / 0.6)'; e.currentTarget.style.background = 'transparent'; }}
      >
        <Maximize2 className="w-[13px] h-[13px]" />
      </button>
    </div>
  );
};
