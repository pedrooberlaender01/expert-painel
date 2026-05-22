import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { BookmarkPlus, Loader2, X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface SalvarBibliotecaPopoverProps {
  onSave: (nome: string) => Promise<void>;
}

export const SalvarBibliotecaPopover: React.FC<SalvarBibliotecaPopoverProps> = ({ onSave }) => {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [saving, setSaving] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const updatePos = useCallback(() => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.top - 8, left: rect.left });
    }
  }, []);

  useEffect(() => {
    if (open) {
      updatePos();
      inputRef.current?.focus();
    }
  }, [open, updatePos]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSave = async () => {
    if (!nome.trim()) return;
    setSaving(true);
    try {
      await onSave(nome.trim());
      setNome('');
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-[#6b7280] hover:text-accent-bright hover:bg-accent-dim rounded-lg border border-[#1e1e22] hover:border-accent/20 transition-all"
      >
        <BookmarkPlus className="w-3.5 h-3.5" />
        Salvar
      </button>

      {open && ReactDOM.createPortal(
        <div
          ref={ref}
          className="fixed w-72 bg-[#111114] border border-[#2a2a2e] rounded-xl p-3.5 shadow-2xl z-[9999] animate-[slideUp_150ms_ease-out]"
          style={{ top: pos.top, left: pos.left, transform: 'translateY(-100%)' }}
        >
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[12px] font-medium text-[#9ca3af]">Salvar na biblioteca</p>
            <button onClick={() => setOpen(false)} className="p-1 text-[#4b4b55] hover:text-[#9ca3af] transition-colors">
              <X className="w-3 h-3" />
            </button>
          </div>
          <input
            ref={inputRef}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="Nome da mensagem..."
            className="w-full bg-[#0e0e10] text-white text-[12px] rounded-lg px-3 py-2 mb-2.5 border border-[#2a2a2e] focus:border-accent/30 focus:outline-none placeholder-[#4b4b55] transition-colors"
          />
          <button
            onClick={handleSave}
            disabled={!nome.trim() || saving}
            className={cn(
              'w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-medium transition-all',
              nome.trim() && !saving
                ? 'bg-accent text-white hover:brightness-110'
                : 'bg-[#1a1a1e] text-[#4b4b55] cursor-not-allowed'
            )}
          >
            {saving && <Loader2 className="w-3 h-3 animate-spin" />}
            Salvar
          </button>
        </div>,
        document.body
      )}
    </>
  );
};
