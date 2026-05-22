import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, RefreshCw, CheckSquare, Square, Loader2, Wifi, WifiOff, ChevronDown, Users, Send, Plus, Bot, Key, AtSign, ArrowRight, Check, X, Repeat, Pin, FlaskConical } from 'lucide-react';
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
  onAgendarTeste?: () => void;
  onLimpar: () => void;
  agendando: boolean;
  podeAgendar: boolean;
  canal: 'whatsapp' | 'telegram';
  canaisTelegram: GrupoWhatsApp[];
  loadingCanaisTelegram: boolean;
  onFetchCanaisTelegram: () => void;
  telegramBot: { nome: string; username: string } | null;
  onCriarTelegramBot?: (username: string, botToken: string) => Promise<boolean>;
  usarFila: boolean;
  onUsarFilaChange: (valor: boolean) => void;
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
  onAgendarTeste,
  onLimpar,
  agendando,
  podeAgendar,
  canal,
  canaisTelegram,
  loadingCanaisTelegram,
  onFetchCanaisTelegram,
  telegramBot,
  onCriarTelegramBot,
  usarFila,
  onUsarFilaChange,
}) => {
  const [busca, setBusca] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showBotForm, setShowBotForm] = useState(false);
  const [botUsername, setBotUsername] = useState('');
  const [botToken, setBotToken] = useState('');
  const [salvandoBot, setSalvandoBot] = useState(false);
  const [botSalvo, setBotSalvo] = useState(false);

  // Auto-fetch canais Telegram when switching to telegram mode
  useEffect(() => {
    if (canal === 'telegram') {
      onFetchCanaisTelegram();
    }
  }, [canal, onFetchCanaisTelegram]);

  const isTelegram = canal === 'telegram';
  const listaAtiva = isTelegram ? canaisTelegram : grupos;
  const loadingLista = isTelegram ? loadingCanaisTelegram : loadingGrupos;
  const showList = isTelegram ? true : usarFila || !!selectedInstancia;

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
            isTelegram ? 'bg-sky-500/15 text-sky-400' : 'bg-emerald-500/15 text-emerald-400'
          )}>
            3
          </span>
          <h3 className="text-[14px] font-semibold text-txt font-display">
            {isTelegram ? 'Canais & Grupos' : 'Grupos'}
          </h3>
        </div>

        {/* WhatsApp: Modo (fixa vs fila) + Instância dropdown */}
        {!isTelegram && (
          <>
            {/* Toggle modo: Instância Fixa | Fila Rotativa */}
            <div className="mb-3">
              <label className="block text-[12px] font-medium text-txt-muted mb-1.5">Modo de Envio</label>
              <div
                className="grid grid-cols-2 gap-1 p-1 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <button
                  type="button"
                  onClick={() => onUsarFilaChange(false)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all duration-200',
                    !usarFila
                      ? 'bg-emerald-600 text-white shadow-[0_2px_10px_rgba(16,185,129,0.25)]'
                      : 'bg-transparent text-zinc-400 hover:bg-white/[0.04]'
                  )}
                >
                  <Pin className="w-3.5 h-3.5" />
                  Instância Fixa
                </button>
                <button
                  type="button"
                  onClick={() => onUsarFilaChange(true)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all duration-200',
                    usarFila
                      ? 'bg-emerald-600 text-white shadow-[0_2px_10px_rgba(16,185,129,0.25)]'
                      : 'bg-transparent text-zinc-400 hover:bg-white/[0.04]'
                  )}
                >
                  <Repeat className="w-3.5 h-3.5" />
                  Fila Rotativa
                </button>
              </div>
            </div>

            {/* Card informativo quando Fila Rotativa */}
            {usarFila && (
              <div
                className="flex items-start gap-3 p-3.5 rounded-xl"
                style={{
                  background: 'rgba(24,24,27,0.5)',
                  border: '1px solid rgba(16,185,129,0.2)',
                }}
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 shrink-0">
                  <Repeat className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-emerald-400">Sistema rotativo ativado</p>
                  <p className="text-[11px] text-txt-dim leading-relaxed mt-1">
                    A mensagem será enviada usando todas as instâncias ativas e conectadas do expert, alternando entre elas a cada envio. Quando todas forem usadas, o ciclo reinicia.
                  </p>
                </div>
              </div>
            )}

            {!usarFila && (
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
                        ? 'bg-emerald-400'
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

            {/* Desktop dropdown (md+) — absolute interno ao card */}
            {dropdownOpen && (
              <div className="hidden md:block absolute z-30 mt-1 w-full rounded-xl bg-surface-100 border border-surface-300/20 shadow-2xl overflow-hidden">
                {instancias.map((inst) => (
                  <button
                    key={inst.id}
                    onClick={() => {
                      onInstanciaChange(inst);
                      setDropdownOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left text-[12px] transition-all hover:bg-surface-200/40',
                      selectedInstancia?.id === inst.id && 'bg-emerald-500/10'
                    )}
                  >
                    {inst.status_conexao === 'connected' ? (
                      <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
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

            {/* Mobile bottom sheet (< md) — portal escapa overflow do card */}
            {dropdownOpen && createPortal(
              <div className="md:hidden fixed inset-0 z-[100] flex items-end animate-fade-in">
                {/* Backdrop */}
                <div
                  className="absolute inset-0 bg-black/60"
                  style={{ backdropFilter: 'blur(4px)' }}
                  onClick={() => setDropdownOpen(false)}
                />
                {/* Sheet */}
                <div
                  className="relative w-full rounded-t-3xl border-t border-surface-300/20 animate-slide-up"
                  style={{
                    background: 'rgba(22,27,34,0.98)',
                    maxHeight: '80vh',
                    boxShadow: '0 -20px 60px rgba(0,0,0,0.6)',
                  }}
                >
                  {/* Handle */}
                  <div className="flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-full bg-white/15" />
                  </div>
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-3 border-b border-surface-300/10">
                    <h4 className="text-[14px] font-semibold text-txt font-display">Selecione uma instância</h4>
                    <button
                      onClick={() => setDropdownOpen(false)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {/* List scrollavel */}
                  <div className="overflow-y-auto p-2" style={{ maxHeight: 'calc(80vh - 80px)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
                    {instancias.map((inst) => (
                      <button
                        key={inst.id}
                        onClick={() => {
                          onInstanciaChange(inst);
                          setDropdownOpen(false);
                        }}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left text-[13px] transition-all',
                          selectedInstancia?.id === inst.id
                            ? 'bg-emerald-500/10 border border-emerald-500/25'
                            : 'border border-transparent hover:bg-surface-200/40'
                        )}
                      >
                        {inst.status_conexao === 'connected' ? (
                          <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <WifiOff className="w-4 h-4 text-rose-400 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-txt-secondary font-medium truncate">{inst.nome}</p>
                          <p className="text-[11px] text-txt-dim font-mono">{inst.numero}</p>
                        </div>
                        {selectedInstancia?.id === inst.id && (
                          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                      </button>
                    ))}
                    {instancias.length === 0 && !loadingInstancias && (
                      <p className="px-4 py-8 text-[13px] text-txt-dim text-center">
                        Nenhuma instância disponível
                      </p>
                    )}
                  </div>
                </div>
              </div>,
              document.body
            )}
          </div>
            )}
          </>
        )}

        {/* Telegram: Bot badge ou formulário de criação */}
        {isTelegram && telegramBot && (
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-sky-500/[0.06] border border-sky-500/15">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-sky-500/15">
              <Send className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div>
              <p className="text-[12px] font-medium text-sky-400">Bot Telegram</p>
              <p className="text-[10px] text-txt-dim font-mono">@{telegramBot.username}</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
              <span className="text-[10px] text-sky-400/70 font-medium">Ativo</span>
            </div>
          </div>
        )}

        {isTelegram && !telegramBot && !showBotForm && (
          <button
            onClick={() => setShowBotForm(true)}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-dashed border-sky-500/25 bg-sky-500/[0.03] hover:bg-sky-500/[0.07] hover:border-sky-500/40 transition-all duration-200 group"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-500/10 group-hover:bg-sky-500/20 transition-colors duration-200">
              <Plus className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-left">
              <p className="text-[12px] font-semibold text-sky-400">Adicionar Bot</p>
              <p className="text-[10px] text-txt-dim">Configure seu bot do Telegram</p>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-sky-400/40 ml-auto group-hover:text-sky-400/70 group-hover:translate-x-0.5 transition-all duration-200" />
          </button>
        )}

        {isTelegram && !telegramBot && showBotForm && (
          <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.04] overflow-hidden">
            {/* Header do form */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-sky-500/10">
              <Bot className="w-4 h-4 text-sky-400" />
              <span className="text-[12px] font-semibold text-sky-400">Novo Bot Telegram</span>
            </div>

            <div className="p-4 space-y-3">
              {/* Username */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-medium text-txt-muted mb-1.5">
                  <AtSign className="w-3 h-3" />
                  Username do Bot
                </label>
                <input
                  type="text"
                  placeholder="meu_bot"
                  value={botUsername}
                  onChange={(e) => setBotUsername(e.target.value)}
                  className="input-dark text-[13px] w-full font-mono focus:!border-sky-500/40 focus:!shadow-[0_0_0_3px_rgba(56,189,248,0.08),0_0_20px_rgba(56,189,248,0.05)]"
                  disabled={salvandoBot}
                />
              </div>

              {/* Token */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-medium text-txt-muted mb-1.5">
                  <Key className="w-3 h-3" />
                  Bot Token
                </label>
                <input
                  type="text"
                  placeholder="123456:ABC-DEF..."
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  className="input-dark text-[13px] w-full font-mono focus:!border-sky-500/40 focus:!shadow-[0_0_0_3px_rgba(56,189,248,0.08),0_0_20px_rgba(56,189,248,0.05)]"
                  disabled={salvandoBot}
                />
              </div>

              {/* Ações */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => {
                    setShowBotForm(false);
                    setBotUsername('');
                    setBotToken('');
                  }}
                  disabled={salvandoBot}
                  className="flex-1 px-3 py-2 text-[11px] font-medium text-txt-secondary bg-surface-200/30 hover:bg-surface-200/50 rounded-lg border border-surface-300/20 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (!botUsername.trim() || !botToken.trim() || !onCriarTelegramBot) return;
                    setSalvandoBot(true);
                    const ok = await onCriarTelegramBot(botUsername.trim(), botToken.trim());
                    setSalvandoBot(false);
                    if (ok) {
                      setBotSalvo(true);
                      setTimeout(() => {
                        setShowBotForm(false);
                        setBotUsername('');
                        setBotToken('');
                        setBotSalvo(false);
                      }, 800);
                    }
                  }}
                  disabled={!botUsername.trim() || !botToken.trim() || salvandoBot}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-semibold rounded-lg transition-all duration-200',
                    botUsername.trim() && botToken.trim() && !salvandoBot
                      ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-[0_2px_12px_rgba(56,189,248,0.2)]'
                      : 'bg-surface-200/30 text-txt-dim cursor-not-allowed'
                  )}
                >
                  {salvandoBot ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : botSalvo ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    'Salvar'
                  )}
                </button>
              </div>
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
                    : 'text-txt-dim hover:text-emerald-400 hover:bg-emerald-500/5 hover:border-emerald-500/10'
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
                  <CheckSquare className={cn('w-3.5 h-3.5', isTelegram ? 'text-sky-400' : 'text-emerald-400')} />
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
                        ? isTelegram ? 'bg-sky-500/5' : 'bg-emerald-500/5'
                        : 'hover:bg-surface-200/20'
                    )}
                  >
                    {isChecked ? (
                      <CheckSquare className={cn('w-4 h-4 shrink-0', isTelegram ? 'text-sky-400' : 'text-emerald-400')} />
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
                isTelegram ? 'text-sky-400' : 'text-emerald-400'
              )}>
                {selectedGrupos.length} {isTelegram ? 'canal' : 'grupo'}{selectedGrupos.length !== 1 ? (isTelegram ? 'is' : 's') : ''} selecionado{selectedGrupos.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </>
      )}

      {/* Footer actions */}
      <div className="p-3 border-t border-surface-300/10 flex flex-col gap-2">
        <div className="flex items-center gap-2">
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
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_2px_12px_rgba(52,211,153,0.2)] hover:shadow-[0_4px_20px_rgba(52,211,153,0.3)]'
                : 'bg-surface-200/30 text-txt-dim cursor-not-allowed'
            )}
          >
            {agendando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Agendar
          </button>
        </div>
        {onAgendarTeste && (
          <button
            onClick={onAgendarTeste}
            disabled={!podeAgendar || agendando}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-3 py-2 text-[11px] font-semibold rounded-xl transition-all duration-200 border',
              podeAgendar && !agendando
                ? 'bg-amber-500/10 hover:bg-amber-500/15 text-amber-400 border-amber-500/25'
                : 'bg-surface-200/20 text-txt-dim border-surface-300/10 cursor-not-allowed'
            )}
            title="Agenda usando pg_cron (Supabase) ao invés do schedule N8N (fluxo de teste)"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            Agendar com Teste (pg_cron)
          </button>
        )}
      </div>
    </div>
  );
};
