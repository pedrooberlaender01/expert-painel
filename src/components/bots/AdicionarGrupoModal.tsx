import React, { useState, useRef, useEffect } from 'react';
import { X, Search, Loader2, Plus, ChevronDown, Check, Wifi, WifiOff, Users } from 'lucide-react';
import type { Instancia, GrupoWhatsApp } from '../../hooks/useBotGrupos';

interface AdicionarGrupoModalProps {
  instancias: Instancia[];
  onBuscarGrupos: (instancia: string, token: string) => Promise<GrupoWhatsApp[]>;
  onSave: (grupo_id: string, grupo_nome: string) => Promise<void>;
  onClose: () => void;
}

const inputClass = "w-full bg-glass-2 border border-glass text-txt rounded-lg py-2.5 px-3.5 text-[13px] placeholder-txt-dim focus:outline-none focus:border-[rgba(var(--color-primary-rgb),0.3)] focus:shadow-[0_0_0_3px_rgba(var(--color-primary-rgb),0.08)] transition-all";

// ─── Dropdown customizado para instância ──────────────────────────────
const InstanciaSelect: React.FC<{
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
          <span className="text-txt-dim">Selecione uma instância</span>
        )}
        <ChevronDown
          className="w-3.5 h-3.5 shrink-0 transition-transform duration-200"
          style={{ color: 'var(--c-t-30)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1.5 w-full rounded-xl overflow-hidden animate-fade-in"
          style={{
            background: 'var(--c-popup-bg)',
            border: '1px solid var(--c-border)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)',
          }}
        >
          <div
            className="overflow-y-auto py-1"
            style={{ maxHeight: '200px', scrollbarWidth: 'thin', scrollbarColor: 'rgb(var(--c-fg-rgb) / 0.1) transparent' }}
          >
            {instancias.length === 0 ? (
              <div className="px-3.5 py-3 text-[13px] text-txt-dim text-center">Nenhuma instância bot disponível</div>
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
                      color: isSelected ? 'var(--color-primary-light)' : 'rgb(var(--c-fg-rgb) / 0.7)',
                      background: isSelected ? 'rgba(var(--color-primary-rgb),0.08)' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'var(--c-glass)';
                        e.currentTarget.style.color = 'rgb(var(--c-fg-rgb))';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isSelected ? 'rgba(var(--color-primary-rgb),0.08)' : 'transparent';
                      e.currentTarget.style.color = isSelected ? 'var(--color-primary-light)' : 'rgb(var(--c-fg-rgb) / 0.7)';
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

// ─── Modal principal ──────────────────────────────────────────────────

export const AdicionarGrupoModal: React.FC<AdicionarGrupoModalProps> = ({ instancias, onBuscarGrupos, onSave, onClose }) => {
  const [instanciaId, setInstanciaId] = useState<number | null>(null);
  const [gruposWpp, setGruposWpp] = useState<GrupoWhatsApp[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [buscou, setBuscou] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modoManual, setModoManual] = useState(false);
  const [manualId, setManualId] = useState('');
  const [manualNome, setManualNome] = useState('');
  const [filtro, setFiltro] = useState('');

  const instSelecionada = instancias.find((i) => i.id === instanciaId);

  const handleBuscar = async () => {
    if (!instSelecionada) return;
    setBuscando(true);
    setBuscou(false);
    const result = await onBuscarGrupos(instSelecionada.instancia, instSelecionada.token);
    setGruposWpp(result);
    setBuscou(true);
    setBuscando(false);
  };

  const handleSelectGrupo = async (g: GrupoWhatsApp) => {
    setSaving(true);
    await onSave(g.jid, g.nome);
    setSaving(false);
  };

  const handleManualSave = async () => {
    if (!manualId.trim() || !manualNome.trim()) return;
    setSaving(true);
    await onSave(manualId.trim(), manualNome.trim());
    setSaving(false);
  };

  const handleInstanciaChange = (id: number | null) => {
    setInstanciaId(id);
    setBuscou(false);
    setGruposWpp([]);
  };

  const gruposFiltrados = filtro
    ? gruposWpp.filter((g) => g.nome.toLowerCase().includes(filtro.toLowerCase()))
    : gruposWpp;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} />
      <div
        className="relative w-full max-w-[500px] max-h-[80vh] flex flex-col rounded-2xl shadow-2xl animate-fade-in"
        style={{ background: 'var(--c-popup-bg)', border: '1px solid var(--c-border-strong)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--c-border)' }}>
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(var(--color-primary-rgb),0.1)' }}
            >
              <Users className="w-4 h-4" style={{ color: 'var(--color-primary-light)' }} />
            </div>
            <h2 className="text-[15px] font-bold text-txt">Adicionar Grupo</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-txt-dim hover:text-txt-secondary hover:bg-glass rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgb(var(--c-fg-rgb) / 0.1) transparent' }}>
          {!modoManual ? (
            <>
              {/* Selecionar instância */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-txt-dim font-medium mb-1.5">Instância Bot</label>
                <InstanciaSelect
                  instancias={instancias}
                  value={instanciaId}
                  onChange={handleInstanciaChange}
                />
              </div>

              {/* Botão buscar */}
              {instanciaId && (
                <button
                  onClick={handleBuscar}
                  disabled={buscando}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-[13px] font-medium rounded-xl transition-all disabled:opacity-50"
                  style={{ background: 'rgba(var(--color-primary-rgb),0.15)', border: '1px solid rgba(var(--color-primary-rgb),0.25)', color: 'var(--color-primary-light)' }}
                  onMouseEnter={(e) => { if (!buscando) { e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.25)' } }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.15)' }}
                >
                  {buscando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  {buscando ? 'Buscando...' : 'Buscar Grupos'}
                </button>
              )}

              {/* Lista de grupos */}
              {buscou && gruposWpp.length > 0 && (
                <div>
                  <div className="mb-2.5 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-txt-dim pointer-events-none" />
                    <input
                      type="text"
                      value={filtro}
                      onChange={(e) => setFiltro(e.target.value)}
                      placeholder="Filtrar grupos..."
                      className={inputClass}
                      style={{ paddingLeft: '32px' }}
                    />
                  </div>
                  <p className="text-[11px] text-txt-dim mb-2">{gruposFiltrados.length} grupo{gruposFiltrados.length !== 1 ? 's' : ''} encontrado{gruposFiltrados.length !== 1 ? 's' : ''}</p>
                  <div className="space-y-1.5 max-h-[280px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgb(var(--c-fg-rgb) / 0.1) transparent' }}>
                    {gruposFiltrados.map((g) => (
                      <button
                        key={g.jid}
                        onClick={() => handleSelectGrupo(g)}
                        disabled={saving}
                        className="w-full flex items-center justify-between p-3 rounded-xl text-left transition-all duration-150 disabled:opacity-50"
                        style={{ background: 'var(--c-glass-2)', border: '1px solid var(--c-border)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.06)'; e.currentTarget.style.borderColor = 'rgba(var(--color-primary-rgb),0.15)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--c-glass-2)'; e.currentTarget.style.borderColor = 'var(--c-border)' }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: 'var(--c-glass)' }}
                          >
                            <Users className="w-3.5 h-3.5 text-txt-dim" />
                          </div>
                          <span className="text-[13px] text-txt truncate">{g.nome}</span>
                        </div>
                        <Plus className="w-4 h-4 shrink-0" style={{ color: 'var(--color-primary-light)', opacity: 0.6 }} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {buscou && gruposWpp.length === 0 && (
                <div
                  className="flex flex-col items-center py-8 rounded-xl"
                  style={{ background: 'var(--c-glass-2)', border: '1px solid var(--c-border)' }}
                >
                  <Users className="w-6 h-6 text-txt-dim mb-2" />
                  <p className="text-[13px] text-txt-dim">Nenhum grupo encontrado</p>
                  <p className="text-[11px] text-txt-dim mt-0.5">Verifique se a instância está conectada</p>
                </div>
              )}

              {/* Link modo manual */}
              <button
                onClick={() => setModoManual(true)}
                className="text-[12px] text-txt-dim hover:text-txt-muted transition-colors"
                style={{ textDecoration: 'underline', textUnderlineOffset: '3px' }}
              >
                Adicionar manualmente (JID + nome)
              </button>
            </>
          ) : (
            <>
              {/* Modo manual */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-txt-dim font-medium mb-1.5">ID do Grupo (JID)</label>
                <input type="text" value={manualId} onChange={(e) => setManualId(e.target.value)} placeholder="5511999999999-1234567890@g.us" className={inputClass} />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-txt-dim font-medium mb-1.5">Nome do Grupo</label>
                <input type="text" value={manualNome} onChange={(e) => setManualNome(e.target.value)} placeholder="Grupo de Apostas" className={inputClass} />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setModoManual(false)}
                  className="flex-1 py-2.5 text-[13px] font-medium rounded-xl transition-all"
                  style={{ background: 'var(--c-glass)', border: '1px solid var(--c-border-strong)', color: 'var(--c-t-60)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--c-glass-hover)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--c-glass)' }}
                >
                  Voltar
                </button>
                <button
                  onClick={handleManualSave}
                  disabled={saving || !manualId.trim() || !manualNome.trim()}
                  className="flex-1 py-2.5 text-[13px] font-semibold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: 'var(--color-primary)', color: '#fff', boxShadow: '0 2px 12px rgba(var(--color-primary-rgb),0.2)' }}
                  onMouseEnter={(e) => { if (!saving) e.currentTarget.style.boxShadow = '0 4px 20px rgba(var(--color-primary-rgb),0.3)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(var(--color-primary-rgb),0.2)' }}
                >
                  {saving ? 'Salvando...' : 'Adicionar'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
