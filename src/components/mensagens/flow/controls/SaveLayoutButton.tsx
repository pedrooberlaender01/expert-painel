import { Save, Loader2, Undo2 } from 'lucide-react';

interface SaveLayoutButtonProps {
  visible: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

export const SaveLayoutButton: React.FC<SaveLayoutButtonProps> = ({ visible, saving, onSave, onDiscard }) => {
  return (
    <div
      className="absolute top-4 right-4 z-10 flex items-center gap-2"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-8px)',
        transition: 'opacity 200ms ease, transform 200ms ease',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <button
        onClick={onDiscard}
        disabled={saving}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors duration-150 disabled:opacity-40"
        style={{ color: 'var(--c-t-50)' }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'rgb(var(--c-fg-rgb) / 0.8)'; e.currentTarget.style.background = 'var(--c-glass-hover)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'rgb(var(--c-fg-rgb) / 0.5)'; e.currentTarget.style.background = 'transparent'; }}
        title="Descartar alterações de posição"
      >
        <Undo2 className="w-3 h-3" />
        Descartar
      </button>
      <button
        onClick={onSave}
        disabled={saving}
        className="flow-drawer-save-ready flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors duration-150 disabled:opacity-60"
        style={{
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
      >
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
        {saving ? 'Salvando...' : 'Salvar layout'}
      </button>
    </div>
  );
};
