import React, { useState, useMemo, useEffect } from 'react';
import { Search, RefreshCw, CheckSquare, Square, Loader2, Wifi, WifiOff, ChevronDown, Users, Send } from 'lucide-react';
import type { InstanciaDisparadora, GrupoWhatsApp } from '../../hooks/useAgendamentos';
import { cn } from '../../utils/cn';

interface GrupoSelectorProps {
  instancias: InstanciaDisparadora[];
  loadingInstancias: boolean;
  grupos: GrupoWhatsApp[];
  loadingGrupos: boolean;
  selectedInstancia: InstanciaDisparadora | null;
  selectedGrupos: GrupoWhatsApp[];
  onInstanciaChange: (instancia: InstanciaDisparadora) => void;
  onGruposChange: (grupos: GrupoWhatsApp[]) => void;
  onFetchGrupos: () => void;
  onAgendar: () => void;
  onLimpar: () => void;
  agendando: boolean;
  podeAgendar: boolean;
  canal: 'whatsapp' | 'telegram';
  canaisTelegram: GrupoWhatsApp[];
  loadingCanaisTelegram: boolean;
  onFetchCanaisTelegram: () => void;
}

export const GrupoSelector: React.FC<GrupoSelectorProps> = ({
  instancias,
  loadingInstancias,
  grupos,
  loadingGrupos,
  selectedInstancia,
  selectedGrupos,
  onInstanciaChange,
  onGruposChange,
  onFetchGrupos,
  onAgendar,
  onLimpar,
  agendando,
  podeAgendar,
  canal,
  canaisTelegram,
  loadingCanaisTelegram,
  onFetchCanaisTelegram,
}) => {
  const [busca, setBusca] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Auto-fetch canais Telegram when switching to telegram mode
  useEffect(() => {
    if (canal === 'telegram') {
      onFetchCanaisTelegram();
    }
  }, [canal, onFetchCanaisTelegram]);

  const isTelegram = canal === 'telegram';
  const listaAtiva = isTelegram ? canaisTelegram : grupos;
  const loadingLista = isTelegram ? loadingCanaisTelegram : loadingGrupos;
  const showList = isTelegram ? true : !!selectedInstancia;

  const gruposFiltrados = useMemo(
    () =>
      listaAtiva.filter((g) =>
        g.grupo_nome.toLowerCase().includes(busca.toLowerCase())
      ),
    [listaAtiva, busca]
  );

  const todosSelected =
    gruposFiltrados.length > 0 &&
    gruposFiltrados.every((g) =>
      selectedGrupos.some((s) => s.grupo_id === g.grupo_id)
    );

  const handleToggleAll = () => {
    if (todosSelected) {
      const filteredIds = new Set(gruposFiltrados.map((g) => g.grupo_id));
      onGruposChange(selectedGrupos.filter((s) => !filteredIds.has(s.grupo_id)));
    } else {
      const existingIds = new Set(selectedGrupos.map((s) => s.grupo_id));
      const novos = gruposFiltrados.filter((g) => !existingIds.has(g.grupo_id));
      onGruposChange([...selectedGrupos, ...novos]);
    }
  };

  const handleToggleGrupo = (grupo: GrupoWhatsApp) => {
    const exists = selectedGrupos.some((s) => s.grupo_id === grupo.grupo_id);
    if (exists) {
      onGruposChange(selectedGrupos.filter((s) => s.grupo_id !== grupo.grupo_id));
    } else {
      onGruposChange([...selectedGrupos, grupo]);
    }
  };

  const handleRefresh = () => {
    if (isTelegram) {
      onFetchCanaisTelegram();
    } else {
      onFetchGrupos();
    }
  };

  return (
    <div className="card-dark rounded-2xl overflow-hidden flex flex-col h-full">
      <div className="p-5 border-b border-surface-300/10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <span className={cn(
            'inline-flex items-center justify-center w-6 h-6 rounded-lg text-[11px] font-bold font-mono',
            isTelegram ? 'bg-sky-500/15 text-sky-400' : 'bg-primary-bg text-primary-light'
          )}>
            3
          </span>
          <h3 className="text-[14px] font-semibold text-txt font-display">
            {isTelegram ? 'Canais & Grupos' : 'Grupos'}
          </h3>
        </div>

        {/* WhatsApp: Instância dropdown */}
        {!isTelegram && (
          <div className="relative">
            <label className="block text-[12px] font-medium text-txt-muted mb-1.5">Instância</label>
            <button
              onClick={() => setDropdownOpen((p) => !p)}
              className="input-dark text-[13px] flex items-center justify-between w-full text-left"
            >
              {loadingInstancias ? (
                <span className="text-txt-dim flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Carregando...
                </span>
              ) : selectedInstancia ? (
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full shrink-0',
                      selectedInstancia.status_conexao === 'connected'
                        ? 'bg-primary-light'
                        : 'bg-rose-400'
                    )}
                  />
                  <span className="truncate">{selectedInstancia.nome}</span>
                </span>
              ) : (
                <span className="text-txt-dim">Selecione uma instância</span>
              )}
              <ChevronDown
                className={cn(
                  'w-3.5 h-3.5 text-txt-dim transition-transform shrink-0',
                  dropdownOpen && 'rotate-180'
                )}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute z-30 mt-1 w-full rounded-xl bg-surface-100 border border-surface-300/20 shadow-2xl overflow-hidden">
                {instancias.map((inst) => (
                  <button
                    key={inst.id}
                    onClick={() => {
                      onInstanciaChange(inst);
                      setDropdownOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left text-[12px] transition-all hover:bg-surface-200/40',
                      selectedInstancia?.id === inst.id && 'bg-primary-bg'
                    )}
                  >
                    {inst.status_conexao === 'connected' ? (
                      <Wifi className="w-3.5 h-3.5 text-primary-light shrink-0" />
                    ) : (
                      <WifiOff className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-txt-secondary font-medium truncate">{inst.nome}</p>
                      <p className="text-[10px] text-txt-dim font-mono">{inst.numero}</p>
                    </div>
                  </button>
                ))}
                {instancias.length === 0 && !loadingInstancias && (
                  <p className="px-4 py-3 text-[12px] text-txt-dim text-center">
                    Nenhuma instância disponível
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Telegram: Bot badge */}
        {isTelegram && (
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-sky-500/[0.06] border border-sky-500/15">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-sky-500/15">
              <Send className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div>
              <p className="text-[12px] font-medium text-sky-400">Bot Telegram</p>
              <p className="text-[10px] text-txt-dim font-mono">@blackbotroleta</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
              <span className="text-[10px] text-sky-400/70 font-medium">Ativo</span>
            </div>
          </div>
        )}
      </div>

      {/* Grupo/Canal list area */}
      {showList && (
        <>
          <div className="p-3 border-b border-surface-300/10">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-txt-dim pointer-events-none" />
                <input
                  type="text"
                  placeholder={isTelegram ? 'Buscar canal...' : 'Buscar grupo...'}
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="input-dark text-[13px] pl-9 py-2"
                />
              </div>
              <button
                onClick={handleRefresh}
                disabled={loadingLista}
                className={cn(
                  'p-2 rounded-lg transition-all border border-transparent',
                  isTelegram
                    ? 'text-txt-dim hover:text-sky-400 hover:bg-sky-500/5 hover:border-sky-500/10'
                    : 'text-txt-dim hover:text-primary-light hover:bg-primary-bg hover:border-primary-bg'
                )}
                title={isTelegram ? 'Recarregar canais' : 'Recarregar grupos'}
              >
                <RefreshCw className={cn('w-3.5 h-3.5', loadingLista && 'animate-spin')} />
              </button>
            </div>
          </div>

          {/* Select all */}
          {!loadingLista && listaAtiva.length > 0 && (
            <div className="px-4 py-2 border-b border-surface-300/10">
              <button
                onClick={handleToggleAll}
                className="flex items-center gap-2 text-[11px] font-medium text-txt-muted hover:text-txt transition-colors"
              >
                {todosSelected ? (
                  <CheckSquare className={cn('w-3.5 h-3.5', isTelegram ? 'text-sky-400' : 'text-primary-light')} />
                ) : (
                  <Square className="w-3.5 h-3.5" />
                )}
                Selecionar todos
              </button>
            </div>
          )}

          {/* Group/Channel list */}
          <div className="flex-1 overflow-y-auto min-h-0 max-h-[220px] p-2 space-y-0.5">
            {loadingLista ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 animate-pulse">
                  <div className="w-4 h-4 bg-surface-200/40 rounded" />
                  <div className="h-3.5 bg-surface-200/40 rounded flex-1 max-w-[160px]" />
                </div>
              ))
            ) : gruposFiltrados.length === 0 ? (
              <div className="text-center py-6">
                <Users className="w-5 h-5 text-txt-dim mx-auto mb-2" />
                <p className="text-[12px] text-txt-dim">
                  {busca
                    ? isTelegram ? 'Nenhum canal encontrado' : 'Nenhum grupo encontrado'
                    : isTelegram ? 'Nenhum canal disponível' : 'Nenhum grupo disponível'}
                </p>
              </div>
            ) : (
              gruposFiltrados.map((grupo) => {
                const isChecked = selectedGrupos.some(
                  (s) => s.grupo_id === grupo.grupo_id
                );
                return (
                  <button
                    key={grupo.grupo_id}
                    onClick={() => handleToggleGrupo(grupo)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-150',
                      isChecked
                        ? isTelegram ? 'bg-sky-500/5' : 'bg-primary-bg'
                        : 'hover:bg-surface-200/20'
                    )}
                  >
                    {isChecked ? (
                      <CheckSquare className={cn('w-4 h-4 shrink-0', isTelegram ? 'text-sky-400' : 'text-primary-light')} />
                    ) : (
                      <Square className="w-4 h-4 text-txt-dim shrink-0" />
                    )}
                    <span
                      className={cn(
                        'text-[12px] truncate',
                        isChecked ? 'text-txt-secondary font-medium' : 'text-txt-muted'
                      )}
                    >
                      {grupo.grupo_nome}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Counter */}
          {selectedGrupos.length > 0 && (
            <div className="px-4 py-2 border-t border-surface-300/10">
              <p className={cn(
                'text-[11px] font-medium font-mono',
                isTelegram ? 'text-sky-400' : 'text-primary-light'
              )}>
                {selectedGrupos.length} {isTelegram ? 'canal' : 'grupo'}{selectedGrupos.length !== 1 ? (isTelegram ? 'is' : 's') : ''} selecionado{selectedGrupos.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </>
      )}

      {/* Footer actions */}
      <div className="p-3 border-t border-surface-300/10 flex items-center gap-2">
        <button
          onClick={onLimpar}
          className="flex-1 px-3 py-2.5 text-[12px] font-medium text-txt-secondary bg-surface-200/30 hover:bg-surface-200/50 rounded-xl border border-surface-300/20 transition-all"
        >
          Limpar
        </button>
        <button
          onClick={onAgendar}
          disabled={!podeAgendar || agendando}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-[12px] font-semibold rounded-xl transition-all duration-200',
            podeAgendar && !agendando
              ? isTelegram
                ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-[0_2px_12px_rgba(56,189,248,0.2)] hover:shadow-[0_4px_20px_rgba(56,189,248,0.3)]'
                : 'bg-primary-hover hover:bg-primary text-white shadow-[0_2px_12px_var(--color-primary-bg)] hover:shadow-[0_4px_20px_var(--color-primary-bg)]'
              : 'bg-surface-200/30 text-txt-dim cursor-not-allowed'
          )}
        >
          {agendando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Agendar
        </button>
      </div>
    </div>
  );
};
