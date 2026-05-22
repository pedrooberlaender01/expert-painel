import React, { useState, useEffect, useRef } from 'react';
import { X, Smartphone, ChevronDown, Check, Wifi, WifiOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

interface ConfigWppModalProps {
  personaNome: string;
  personaFotoUrl: string | null;
  currentInstanciaId?: number | null;
  onClose: () => void;
  onSave: (data: { nome_wpp: string; foto_wpp: string; instancia_id: number | null; instancia_nome: string; token: string }) => void;
}

interface Instancia {
  id: number;
  nome: string;
  instancia: string;
  token: string;
  status_conexao: string;
}

const inputClass = "w-full bg-white/[0.02] border border-white/[0.04] text-white rounded-lg py-2.5 px-3.5 text-[13px] placeholder-[#4b5563] focus:outline-none focus:border-[rgba(var(--color-primary-rgb),0.3)] focus:shadow-[0_0_0_3px_rgba(var(--color-primary-rgb),0.08)] transition-all";

// ─── Dropdown customizado para selecao de instancia ───────────────────
const InstanciaDropdown: React.FC<{
  instancias: Instancia[];
  value: number | null;
  onChange: (id: number | null) => void;
}> = ({ instancias, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = instancias.find((i) => i.id === value);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {/* Botao trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`${inputClass} flex items-center justify-between gap-2 text-left cursor-pointer`}
        style={open ? {
          borderColor: 'rgba(var(--color-primary-rgb),0.3)',
          boxShadow: '0 0 0 3px rgba(var(--color-primary-rgb),0.08)',
        } : {}}
      >
        {selected ? (
          <span className="flex items-center gap-2 min-w-0">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                background: selected.status_conexao === 'connected' ? '#34d399' : '#f87171',
                boxShadow: selected.status_conexao === 'connected'
                  ? '0 0 6px rgba(52,211,153,0.4)'
                  : '0 0 6px rgba(248,113,113,0.4)',
              }}
            />
            <span className="truncate">{selected.nome || selected.instancia}</span>
          </span>
        ) : (
          <span className="text-white/30">Selecione uma instância</span>
        )}
        <ChevronDown
          className="w-3.5 h-3.5 shrink-0 transition-transform duration-200"
          style={{
            color: 'rgba(255,255,255,0.3)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {/* Lista dropdown */}
      {open && (
        <div
          className="absolute z-50 mt-1.5 w-full rounded-xl overflow-hidden animate-fade-in"
          style={{
            background: 'rgba(22,27,34,0.97)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)',
          }}
        >
          <div
            className="overflow-y-auto py-1"
            style={{ maxHeight: '220px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
          >
            {instancias.length === 0 ? (
              <div className="px-3.5 py-3 text-[13px] text-white/30 text-center">Nenhuma instância disponível</div>
            ) : (
              instancias.map((inst) => {
                const isSelected = inst.id === value;
                const isConnected = inst.status_conexao === 'connected';
                return (
                  <button
                    key={inst.id}
                    type="button"
                    onClick={() => { onChange(inst.id); setOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-left transition-colors duration-100"
                    style={{
                      color: isSelected ? 'var(--color-primary-light)' : 'rgba(255,255,255,0.7)',
                      background: isSelected ? 'rgba(var(--color-primary-rgb),0.08)' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                        e.currentTarget.style.color = '#fff';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isSelected ? 'rgba(var(--color-primary-rgb),0.08)' : 'transparent';
                      e.currentTarget.style.color = isSelected ? 'var(--color-primary-light)' : 'rgba(255,255,255,0.7)';
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{
                        background: isConnected ? '#34d399' : '#f87171',
                        boxShadow: isConnected
                          ? '0 0 6px rgba(52,211,153,0.4)'
                          : '0 0 6px rgba(248,113,113,0.4)',
                      }}
                    />
                    <span className="flex-1 truncate">{inst.nome || inst.instancia}</span>
                    {isConnected ? (
                      <Wifi className="w-3 h-3 shrink-0" style={{ color: 'rgba(52,211,153,0.5)' }} />
                    ) : (
                      <WifiOff className="w-3 h-3 shrink-0" style={{ color: 'rgba(248,113,113,0.4)' }} />
                    )}
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-primary-light)' }} />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const ConfigWppModal: React.FC<ConfigWppModalProps> = ({ personaNome, personaFotoUrl, currentInstanciaId, onClose, onSave }) => {
  const [nomeWpp, setNomeWpp] = useState(personaNome);
  const [fotoWpp, setFotoWpp] = useState(personaFotoUrl || '');
  const [instanciaId, setInstanciaId] = useState<number | null>(currentInstanciaId ?? null);
  const [instancias, setInstancias] = useState<Instancia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInstancias = async () => {
      const expertId = useAuthStore.getState().getActiveExpertId();
      let query = supabase.from('whatsapp_rotacao').select('id, nome, instancia, token, status_conexao').eq('ativo', true).eq('tipo', 'bot');
      if (expertId) query = query.eq('expert_id', expertId);
      const { data } = await query;
      setInstancias((data as unknown as Instancia[]) || []);
      setLoading(false);
    };
    fetchInstancias();
  }, []);

  const handleSave = () => {
    const inst = instancias.find((i) => i.id === instanciaId);
    onSave({
      nome_wpp: nomeWpp,
      foto_wpp: fotoWpp,
      instancia_id: instanciaId,
      instancia_nome: inst?.instancia || '',
      token: inst?.token || '',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} />
      <div
        className="relative w-full max-w-[420px] rounded-2xl shadow-2xl animate-fade-in"
        style={{ background: 'rgba(20,20,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-white/40" />
            <h2 className="text-[15px] font-bold text-white">Configurar Perfil WhatsApp</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-white/40 hover:text-white/70 hover:bg-white/[0.04] rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-white/40 font-medium mb-1.5">Nome no WhatsApp</label>
            <input type="text" value={nomeWpp} onChange={(e) => setNomeWpp(e.target.value)} className={inputClass} placeholder="Nome exibido no WhatsApp" />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-white/40 font-medium mb-1.5">Foto de perfil (URL)</label>
            <input type="url" value={fotoWpp} onChange={(e) => setFotoWpp(e.target.value)} className={inputClass} placeholder="https://..." />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-white/40 font-medium mb-1.5">Instância WhatsApp</label>
            {loading ? (
              <div className="text-[13px] text-white/30 py-2">Carregando instâncias...</div>
            ) : (
              <InstanciaDropdown
                instancias={instancias}
                value={instanciaId}
                onChange={setInstanciaId}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-[13px] font-medium rounded-xl transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 text-[13px] font-semibold rounded-xl transition-all"
            style={{ background: 'var(--color-primary)', color: '#fff', boxShadow: '0 2px 12px rgba(var(--color-primary-rgb),0.2)' }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(var(--color-primary-rgb),0.3)' }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(var(--color-primary-rgb),0.2)' }}
          >
            Aplicar no WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
};
