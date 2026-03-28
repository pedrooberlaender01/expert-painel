import React from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { cn } from '../../utils/cn';

type Canal = 'whatsapp' | 'telegram';

interface CanalSelectorProps {
  canal: Canal;
  onCanalChange: (canal: Canal) => void;
}

const CANAIS: { value: Canal; label: string; icon: React.ElementType; accent: string; glow: string }[] = [
  {
    value: 'whatsapp',
    label: 'WhatsApp',
    icon: MessageCircle,
    accent: 'primary',
    glow: 'var(--color-primary-bg)',
  },
  {
    value: 'telegram',
    label: 'Telegram',
    icon: Send,
    accent: 'sky',
    glow: 'rgba(56, 189, 248, 0.12)',
  },
];

export const CanalSelector: React.FC<CanalSelectorProps> = ({ canal, onCanalChange }) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      {CANAIS.map((c) => {
        const isActive = canal === c.value;
        const Icon = c.icon;

        return (
          <button
            key={c.value}
            onClick={() => onCanalChange(c.value)}
            className={cn(
              'relative flex items-center gap-3 px-5 py-3.5 rounded-2xl border transition-all duration-200 cursor-pointer group overflow-hidden',
              isActive && c.value === 'whatsapp' &&
                'bg-primary-bg border-primary-bg shadow-[0_0_20px_var(--color-primary-bg)]',
              isActive && c.value === 'telegram' &&
                'bg-sky-500/[0.06] border-sky-500/30 shadow-[0_0_20px_rgba(56,189,248,0.08)]',
              !isActive &&
                'bg-surface-50/30 border-surface-300/15 hover:border-surface-300/30 hover:bg-surface-50/50'
            )}
          >
            {/* Subtle glow behind icon when active */}
            {isActive && (
              <div
                className="absolute -left-2 top-1/2 -translate-y-1/2 w-16 h-16 rounded-full blur-2xl opacity-40 pointer-events-none"
                style={{ background: c.glow }}
              />
            )}

            <div
              className={cn(
                'relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200',
                isActive && c.value === 'whatsapp' && 'bg-primary-bg',
                isActive && c.value === 'telegram' && 'bg-sky-500/15',
                !isActive && 'bg-surface-200/30 group-hover:bg-surface-200/50'
              )}
            >
              <Icon
                className={cn(
                  'w-[18px] h-[18px] transition-colors duration-200',
                  isActive && c.value === 'whatsapp' && 'text-primary-light',
                  isActive && c.value === 'telegram' && 'text-sky-400',
                  !isActive && 'text-txt-dim group-hover:text-txt-muted'
                )}
              />
            </div>

            <div className="relative flex flex-col items-start">
              <span
                className={cn(
                  'text-[13px] font-semibold tracking-tight transition-colors duration-200',
                  isActive && c.value === 'whatsapp' && 'text-primary-light',
                  isActive && c.value === 'telegram' && 'text-sky-400',
                  !isActive && 'text-txt-muted group-hover:text-txt-secondary'
                )}
              >
                {c.label}
              </span>
              <span
                className={cn(
                  'text-[10px] font-medium transition-colors duration-200',
                  isActive ? 'text-txt-dim' : 'text-txt-dim/50'
                )}
              >
                {c.value === 'whatsapp' ? 'Grupos' : 'Canais & Grupos'}
              </span>
            </div>

            {/* Active indicator dot */}
            {isActive && (
              <div
                className={cn(
                  'ml-auto w-2 h-2 rounded-full',
                  c.value === 'whatsapp' ? 'bg-primary-light' : 'bg-sky-400'
                )}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
