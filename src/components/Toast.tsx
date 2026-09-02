import React from 'react';
import { Check, X } from 'lucide-react';
import type { ToastData } from '../hooks/useToast';
import { cn } from '../utils/cn';

interface ToastProps {
  toast: ToastData;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  return (
    <div className={cn(
      'fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border animate-slide-up',
      toast.type === 'success'
        ? 'bg-primary/10 border-primary/20 text-primary'
        : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
    )} style={{
      background: toast.type === 'success'
        ? 'linear-gradient(145deg, rgba(0, 74, 255, 0.12) 0%, rgba(0, 74, 255, 0.06) 100%)'
        : 'linear-gradient(145deg, rgba(244, 63, 94, 0.12) 0%, rgba(244, 63, 94, 0.06) 100%)',
      backdropFilter: 'blur(20px)',
    }}>
      {toast.type === 'success'
        ? <Check className="w-4 h-4 shrink-0" />
        : <X className="w-4 h-4 shrink-0" />
      }
      <span className="text-[13px] font-medium">{toast.message}</span>
      <button
        onClick={onClose}
        className="p-1 hover:bg-glass-hover rounded-lg transition-colors ml-2"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};
