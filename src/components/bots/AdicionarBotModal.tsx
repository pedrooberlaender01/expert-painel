import React, { useState } from 'react';
import { X, Loader2, Bot, Wifi, WifiOff, Smartphone, Users, ChevronRight } from 'lucide-react';
import type { Instancia } from '../../hooks/useBotGrupos';
import { cn } from '../../utils/cn';

interface PersonaDisponivel {
  id: string;
  nome: string;
  foto_url: string | null;
}

interface AdicionarBotModalProps {
  grupoNome: string;
  personas: PersonaDisponivel[];
  instancias: Instancia[];
  loadingPersonas: boolean;
  onSave: (personaId: string, instanciaId: number, addToGroupData?: { adminInstanciaId: number; adminToken: string }) => Promise<void>;
  onClose: () => void;
}

function gerarCorDoNome(nome: string): string {
  let hash = 0;
  for (let i = 0; i < nome.length; i++) hash = nome.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 55%, 45%)`;
}

function formatNumero(raw: string): string {
  const d = raw.replace(/\D/g, '');
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)} ${d.slice(2)}`;
  if (d.length <= 9) return `${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4)}`;
  return `${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 9)}-${d.slice(9)}`;
}

export const AdicionarBotModal: React.FC<AdicionarBotModalProps> = ({ grupoNome, personas, instancias, loadingPersonas, onSave, onClose }) => {
  const [personaId, setPersonaId] = useState('');
  const [instanciaId, setInstanciaId] = useState<number | null>(null);
  const [addToGroup, setAddToGroup] = useState(false);
  const [adminInstanciaId, setAdminInstanciaId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const canSave = personaId && instanciaId !== null;
  const selectedPersona = personas.find((p) => p.id === personaId);
  const selectedInstancia = instancias.find((i) => i.id === instanciaId);

  const instanciasConectadas = instancias.filter((i) => i.status_conexao === 'connected');
  const instanciasDesconectadas = instancias.filter((i) => i.status_conexao !== 'connected');

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const adminInst = addToGroup && adminInstanciaId ? instancias.find((i) => i.id === adminInstanciaId) : null;
      const addData = adminInst ? { adminInstanciaId: adminInst.id, adminToken: adminInst.token } : undefined;
      await onSave(personaId, instanciaId!, addData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(12px)' }} />
      <div
        className="relative w-full max-w-[520px] max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
        style={{
          background: 'var(--c-popup-bg)',
          border: '1px solid var(--c-border)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset',
          animation: 'modalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: '1px solid var(--c-border)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(var(--color-primary-rgb),0.12)', border: '1px solid rgba(var(--color-primary-rgb),0.2)' }}
            >
              <Bot className="w-4.5 h-4.5" style={{ color: 'var(--color-primary-light)' }} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-txt">Adicionar Bot</h2>
              <p className="text-[11px] text-txt-dim mt-0.5 flex items-center gap-1">
                <Users className="w-3 h-3" />
                {grupoNome}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-txt-dim hover:text-txt-secondary hover:bg-glass-hover rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6" style={{ scrollbarGutter: 'stable' }}>

          {/* ─── Persona ─── */}
          <div>
            <label className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-txt-dim font-semibold mb-3">
              <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold"
                style={{ background: 'rgba(var(--color-primary-rgb),0.15)', color: 'var(--color-primary-light)' }}>1</span>
              Escolha a Persona
            </label>

            {loadingPersonas ? (
              <div className="flex items-center justify-center py-8 rounded-xl" style={{ background: 'var(--c-glass-2)', border: '1px solid var(--c-border)' }}>
                <Loader2 className="w-5 h-5 text-txt-dim animate-spin" />
                <span className="text-[13px] text-txt-dim ml-2">Carregando personas...</span>
              </div>
            ) : personas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 rounded-xl" style={{ background: 'var(--c-glass-2)', border: '1px solid var(--c-border)' }}>
                <Bot className="w-6 h-6 text-txt-dim mb-2" />
                <p className="text-[13px] text-txt-dim font-medium">Todas as personas já estão neste grupo</p>
                <p className="text-[11px] text-txt-dim mt-0.5">Crie novas personas na aba Personas</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {personas.map((p) => {
                  const isSelected = personaId === p.id;
                  const cor = gerarCorDoNome(p.nome);
                  return (
                    <button
                      key={p.id}
                      onClick={() => setPersonaId(isSelected ? '' : p.id)}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 group',
                        isSelected ? 'ring-1' : 'hover:bg-glass'
                      )}
                      style={{
                        background: isSelected ? 'rgba(var(--color-primary-rgb),0.08)' : 'var(--c-glass-2)',
                        border: `1px solid ${isSelected ? 'rgba(var(--color-primary-rgb),0.3)' : 'var(--c-border)'}`,
                        ...(isSelected ? { ringColor: 'rgba(var(--color-primary-rgb),0.15)' } : {}),
                      }}
                    >
                      {/* Avatar */}
                      {p.foto_url ? (
                        <img
                          src={p.foto_url}
                          alt={p.nome}
                          className="w-10 h-10 rounded-full object-cover shrink-0"
                          style={{
                            border: isSelected ? '2px solid var(--color-primary)' : '2px solid var(--c-border)',
                            boxShadow: isSelected ? '0 0 12px rgba(var(--color-primary-rgb),0.2)' : 'none',
                          }}
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white text-[13px] font-bold"
                          style={{
                            background: isSelected ? `${cor}dd` : `${cor}99`,
                            border: isSelected ? '2px solid var(--color-primary)' : '2px solid transparent',
                            boxShadow: isSelected ? '0 0 12px rgba(var(--color-primary-rgb),0.2)' : 'none',
                          }}
                        >
                          {p.nome.slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className={cn(
                          'text-[13px] font-semibold truncate transition-colors',
                          isSelected ? 'text-txt' : 'text-txt-secondary group-hover:text-txt-secondary'
                        )}>
                          {p.nome}
                        </p>
                        {isSelected && (
                          <p className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--color-primary-light)' }}>
                            Selecionada
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ─── Instancia WhatsApp ─── */}
          <div>
            <label className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-txt-dim font-semibold mb-3">
              <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold"
                style={{ background: 'rgba(var(--color-primary-rgb),0.15)', color: 'var(--color-primary-light)' }}>2</span>
              Instância WhatsApp
            </label>

            {instancias.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 rounded-xl" style={{ background: 'var(--c-glass-2)', border: '1px solid var(--c-border)' }}>
                <Smartphone className="w-6 h-6 text-txt-dim mb-2" />
                <p className="text-[13px] text-txt-dim font-medium">Nenhuma instância bot disponível</p>
                <p className="text-[11px] text-txt-dim mt-0.5">Crie instâncias bot na aba Instâncias</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {/* Conectadas primeiro */}
                {instanciasConectadas.length > 0 && (
                  <>
                    <p className="text-[10px] uppercase tracking-wider text-emerald-400/50 font-semibold mb-1.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
                      Conectadas ({instanciasConectadas.length})
                    </p>
                    {instanciasConectadas.map((inst) => {
                      const isSelected = instanciaId === inst.id;
                      return (
                        <button
                          key={inst.id}
                          onClick={() => setInstanciaId(isSelected ? null : inst.id)}
                          className={cn(
                            'w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 group'
                          )}
                          style={{
                            background: isSelected ? 'rgba(var(--color-primary-rgb),0.08)' : 'var(--c-glass-2)',
                            border: `1px solid ${isSelected ? 'rgba(var(--color-primary-rgb),0.3)' : 'var(--c-border)'}`,
                          }}
                        >
                          {/* Status indicator */}
                          <div className="relative shrink-0">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center"
                              style={{
                                background: isSelected ? 'rgba(var(--color-primary-rgb),0.15)' : 'rgba(16,185,129,0.1)',
                                border: `1px solid ${isSelected ? 'rgba(var(--color-primary-rgb),0.25)' : 'rgba(16,185,129,0.2)'}`,
                              }}
                            >
                              <Smartphone className="w-4 h-4" style={{ color: isSelected ? 'var(--color-primary-light)' : '#34d399' }} />
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[var(--c-popup-bg)]" />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              'text-[13px] font-semibold truncate transition-colors',
                              isSelected ? 'text-txt' : 'text-txt-secondary group-hover:text-txt-secondary'
                            )}>
                              {inst.nome || inst.instancia}
                            </p>
                            <p className="text-[11px] text-txt-dim font-mono truncate">
                              {inst.numero ? formatNumero(inst.numero) : 'Sem número'}
                            </p>
                          </div>

                          {/* Badge */}
                          <div className="shrink-0 flex items-center gap-2">
                            {isSelected ? (
                              <span
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                                style={{ background: 'rgba(var(--color-primary-rgb),0.15)', color: 'var(--color-primary-light)' }}
                              >
                                Selecionada
                              </span>
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-txt-dim group-hover:text-txt-dim transition-colors" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </>
                )}

                {/* Desconectadas */}
                {instanciasDesconectadas.length > 0 && (
                  <>
                    <p className="text-[10px] uppercase tracking-wider text-red-400/50 font-semibold mb-1.5 mt-3 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400/60" />
                      Desconectadas ({instanciasDesconectadas.length})
                    </p>
                    {instanciasDesconectadas.map((inst) => {
                      const isSelected = instanciaId === inst.id;
                      return (
                        <button
                          key={inst.id}
                          onClick={() => setInstanciaId(isSelected ? null : inst.id)}
                          className={cn(
                            'w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 group opacity-60 hover:opacity-80'
                          )}
                          style={{
                            background: isSelected ? 'rgba(248,113,113,0.06)' : 'var(--c-glass-2)',
                            border: `1px solid ${isSelected ? 'rgba(248,113,113,0.2)' : 'var(--c-border)'}`,
                          }}
                        >
                          <div className="relative shrink-0">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center"
                              style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)' }}
                            >
                              <Smartphone className="w-4 h-4 text-red-400/70" />
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-500 border-2 border-[var(--c-popup-bg)]" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              'text-[13px] font-medium truncate',
                              isSelected ? 'text-red-300/80' : 'text-txt-muted group-hover:text-txt-muted'
                            )}>
                              {inst.nome || inst.instancia}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <WifiOff className="w-2.5 h-2.5 text-red-400/40" />
                              <span className="text-[10px] text-red-400/50 font-medium">Desconectada</span>
                            </div>
                          </div>

                          {isSelected && (
                            <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-red-500/10 text-red-400/70">
                              Selecionada
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            )}
          </div>

          {/* ─── Adicionar ao grupo WhatsApp ─── */}
          <div
            className="rounded-xl p-3.5 transition-all duration-200"
            style={{
              background: addToGroup ? 'rgba(var(--color-primary-rgb),0.04)' : 'var(--c-glass-2)',
              border: `1px solid ${addToGroup ? 'rgba(var(--color-primary-rgb),0.15)' : 'var(--c-border)'}`,
            }}
          >
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <button
                type="button"
                onClick={() => setAddToGroup(!addToGroup)}
                className="w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-200 shrink-0"
                style={addToGroup
                  ? { background: 'var(--color-primary)', borderColor: 'var(--color-primary)', boxShadow: '0 0 8px rgba(var(--color-primary-rgb),0.3)' }
                  : { background: 'var(--c-glass)', borderColor: 'var(--c-border-strong)' }
                }
              >
                {addToGroup && (
                  <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
              <div>
                <span className="text-[13px] text-txt-muted font-medium">Adicionar número ao grupo automaticamente</span>
                <p className="text-[10px] text-txt-dim mt-0.5">O bot será adicionado ao grupo WhatsApp via UAZAPI</p>
              </div>
            </label>

            {/* Admin instância */}
            {addToGroup && (
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--c-border)' }}>
                <label className="block text-[11px] uppercase tracking-wider text-txt-dim font-semibold mb-2">
                  Instância Admin (vai adicionar o bot)
                </label>
                <div className="space-y-1.5">
                  {instancias.filter((i) => i.status_conexao === 'connected').map((inst) => {
                    const isSelected = adminInstanciaId === inst.id;
                    return (
                      <button
                        key={inst.id}
                        onClick={() => setAdminInstanciaId(isSelected ? null : inst.id)}
                        className="w-full flex items-center gap-2.5 p-2.5 rounded-lg text-left transition-all duration-200"
                        style={{
                          background: isSelected ? 'rgba(var(--color-primary-rgb),0.1)' : 'var(--c-glass-2)',
                          border: `1px solid ${isSelected ? 'rgba(var(--color-primary-rgb),0.25)' : 'var(--c-border)'}`,
                        }}
                      >
                        <div className="w-3 h-3 rounded-full shrink-0 flex items-center justify-center"
                          style={{
                            border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--c-border-strong)'}`,
                            background: isSelected ? 'var(--color-primary)' : 'transparent',
                          }}
                        >
                          {isSelected && <span className="w-1 h-1 rounded-full bg-white" />}
                        </div>
                        <Wifi className="w-3 h-3 text-emerald-400/60 shrink-0" />
                        <span className="text-[12px] text-txt-muted truncate font-medium">
                          {inst.nome || inst.instancia}
                        </span>
                        {inst.numero && (
                          <span className="text-[10px] text-txt-dim font-mono ml-auto shrink-0">
                            {formatNumero(inst.numero)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                  {instancias.filter((i) => i.status_conexao === 'connected').length === 0 && (
                    <p className="text-[11px] text-txt-dim text-center py-3">Nenhuma instância conectada disponível</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer com resumo */}
        <div className="shrink-0 px-6 py-4" style={{ borderTop: '1px solid var(--c-border)', background: 'rgba(0,0,0,0.15)' }}>
          {/* Resumo da selecao */}
          {(selectedPersona || selectedInstancia) && (
            <div className="flex items-center gap-3 mb-3 px-3 py-2 rounded-lg" style={{ background: 'var(--c-glass-2)', border: '1px solid var(--c-border)' }}>
              {selectedPersona && (
                <div className="flex items-center gap-1.5">
                  {selectedPersona.foto_url ? (
                    <img src={selectedPersona.foto_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white" style={{ background: gerarCorDoNome(selectedPersona.nome) }}>
                      {selectedPersona.nome.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="text-[11px] text-txt-muted font-medium">{selectedPersona.nome}</span>
                </div>
              )}
              {selectedPersona && selectedInstancia && (
                <ChevronRight className="w-3 h-3 text-txt-dim shrink-0" />
              )}
              {selectedInstancia && (
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    'w-2 h-2 rounded-full shrink-0',
                    selectedInstancia.status_conexao === 'connected' ? 'bg-emerald-400' : 'bg-red-400'
                  )} />
                  <span className="text-[11px] text-txt-muted font-medium">{selectedInstancia.nome || selectedInstancia.instancia}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-[13px] font-medium rounded-xl transition-all"
              style={{ background: 'var(--c-glass)', border: '1px solid var(--c-border)', color: 'var(--c-t-50)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--c-glass-hover)'; e.currentTarget.style.color = 'rgb(var(--c-fg-rgb) / 0.7)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--c-glass)'; e.currentTarget.style.color = 'rgb(var(--c-fg-rgb) / 0.5)' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave || saving}
              className="px-6 py-2.5 text-[13px] font-semibold rounded-xl transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
              style={{
                background: canSave ? 'var(--color-primary)' : 'var(--c-glass-hover)',
                color: canSave ? '#fff' : 'rgb(var(--c-fg-rgb) / 0.3)',
                boxShadow: canSave ? '0 4px 20px rgba(var(--color-primary-rgb),0.25)' : 'none',
              }}
              onMouseEnter={(e) => { if (canSave) e.currentTarget.style.boxShadow = '0 6px 28px rgba(var(--color-primary-rgb),0.35)' }}
              onMouseLeave={(e) => { if (canSave) e.currentTarget.style.boxShadow = '0 4px 20px rgba(var(--color-primary-rgb),0.25)' }}
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Adicionando...
                </>
              ) : (
                <>
                  <Bot className="w-3.5 h-3.5" />
                  Adicionar Bot
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};
