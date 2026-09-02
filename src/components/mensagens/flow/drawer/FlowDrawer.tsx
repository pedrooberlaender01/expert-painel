import { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

interface FlowDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  accentColor?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const FlowDrawer: React.FC<FlowDrawerProps> = ({
  open,
  onClose,
  title,
  subtitle,
  accentColor,
  children,
  footer,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Fechar com ESC
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, handleKeyDown]);

  // Focus no painel ao abrir
  useEffect(() => {
    if (open && panelRef.current) {
      const first = panelRef.current.querySelector<HTMLElement>(
        'button, input, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (first) first.focus();
    }
  }, [open]);

  // Bloquear scroll do body
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Overlay opaco — SEM backdrop-filter */}
      <div
        className="fixed inset-0 z-50"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />

      {/* Painel */}
      <div
        ref={panelRef}
        className="fixed right-0 top-0 h-full w-full sm:w-[420px] md:w-[460px] z-50 flex flex-col"
        style={{
          background: 'var(--c-popup-bg)',
          borderLeft: '1px solid var(--c-border-strong)',
          animation: 'flow-drawer-in 200ms ease-out forwards',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra de acento */}
        {accentColor && (
          <div className="h-[3px] shrink-0" style={{ background: accentColor }} />
        )}

        {/* Header sticky */}
        <div className="shrink-0 px-5 py-5 flex items-start justify-between">
          <div>
            {subtitle && (
              <span className="text-[10px] uppercase tracking-[0.08em] font-medium" style={{ color: 'var(--c-t-50)' }}>
                {subtitle}
              </span>
            )}
            <h2 className="text-[17px] font-medium text-txt mt-1 font-display">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors duration-150"
            style={{ color: 'var(--c-t-40)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--c-glass-hover)'; e.currentTarget.style.color = 'rgb(var(--c-fg-rgb))'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgb(var(--c-fg-rgb) / 0.4)'; }}
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Divider */}
        <div className="shrink-0" style={{ borderTop: '1px solid var(--c-border)' }} />

        {/* Body scrollavel */}
        <div className="flex-1 overflow-y-auto p-5" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgb(var(--c-fg-rgb) / 0.1) transparent' }}>
          {children}
        </div>

        {/* Footer sticky */}
        {footer && (
          <>
            <div className="shrink-0" style={{ borderTop: '1px solid var(--c-border)' }} />
            <div className="shrink-0 px-5 py-4 flex justify-end gap-2">
              {footer}
            </div>
          </>
        )}
      </div>

      {/* Animacao CSS inline (evita criar arquivo CSS separado) */}
      <style>{`
        @keyframes flow-drawer-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
};
