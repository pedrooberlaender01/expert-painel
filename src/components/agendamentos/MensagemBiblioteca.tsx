import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  MessageSquare,
  Mic,
  Image,
  Video,
  Pencil,
  Plus,
  FileVideo,
  Megaphone,
  Trash2,
  Check,
  X as XIcon,
  Folder,
  FolderOpen,
  FolderPlus,
  ChevronLeft,
  GripVertical,
  FolderInput,
  FolderMinus,
} from 'lucide-react';
import type { AgendamentoMensagem, AgendamentoPasta } from '../../hooks/useAgendamentos';
import { cn } from '../../utils/cn';
import { AudioPlayer } from './AudioPlayer';

const TIPO_ICON: Record<AgendamentoMensagem['tipo'], typeof MessageSquare> = {
  texto: MessageSquare,
  audio: Mic,
  imagem: Image,
  video: Video,
};

const TIPO_LABEL: Record<AgendamentoMensagem['tipo'], string> = {
  texto: 'Texto',
  audio: 'Áudio',
  imagem: 'Imagem',
  video: 'Vídeo',
};

const DRAG_MSG_MIME = 'application/x-agendamento-msg-id';
const SCROLL_ZONE = 44;
const SCROLL_SPEED = 5;

interface MensagemBibliotecaProps {
  mensagens: AgendamentoMensagem[];
  pastas: AgendamentoPasta[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNovaMensagem: (pastaId: string | null) => void;
  onEditarMensagem: (mensagem: AgendamentoMensagem) => void;
  onExcluirMensagem?: (mensagem: AgendamentoMensagem) => Promise<void> | void;
  onCriarPasta: (nome: string) => Promise<AgendamentoPasta | null>;
  onRenomearPasta: (id: string, nome: string) => Promise<void> | void;
  onExcluirPasta: (id: string) => Promise<void> | void;
  onMoverMensagem: (mensagemId: string, pastaId: string | null) => Promise<void> | void;
  onReordenarMensagens: (idsOrdenados: string[]) => Promise<void> | void;
  loading: boolean;
  canal?: 'whatsapp' | 'telegram';
}

export const MensagemBiblioteca: React.FC<MensagemBibliotecaProps> = ({
  mensagens,
  pastas,
  selectedId,
  onSelect,
  onNovaMensagem,
  onEditarMensagem,
  onExcluirMensagem,
  onCriarPasta,
  onRenomearPasta,
  onExcluirPasta,
  onMoverMensagem,
  onReordenarMensagens,
  loading,
  canal = 'whatsapp',
}) => {
  const isTelegram = canal === 'telegram';

  // ─── UI State ───────────────────────────────────────────────────
  const [busca, setBusca] = useState('');
  const [currentPastaId, setCurrentPastaId] = useState<string | null>(null);
  const [criandoPasta, setCriandoPasta] = useState(false);
  const [novaPastaNome, setNovaPastaNome] = useState('');
  const [renomeandoPastaId, setRenomeandoPastaId] = useState<string | null>(null);
  const [renomeandoValor, setRenomeandoValor] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [confirmDeletePastaId, setConfirmDeletePastaId] = useState<string | null>(null);

  // ─── Drag (folder drop) ─────────────────────────────────────────
  const [dragOverPasta, setDragOverPasta] = useState<string | 'root' | null>(null);

  // ─── Drag (reorder) ─────────────────────────────────────────────
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverMsgId, setDragOverMsgId] = useState<string | null>(null);
  const [dragOverMsgPos, setDragOverMsgPos] = useState<'above' | 'below'>('below');

  // ─── Folder menu (per message) ───────────────────────────────────
  const [folderMenuMsgId, setFolderMenuMsgId] = useState<string | null>(null);
  const [folderMenuRect, setFolderMenuRect] = useState<{ top: number; left: number } | null>(null);
  const folderMenuRef = useRef<HTMLDivElement>(null);

  // ─── Refs ────────────────────────────────────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const novaPastaInputRef = useRef<HTMLInputElement>(null);
  const renomearInputRef = useRef<HTMLInputElement>(null);

  // ─── Derived ─────────────────────────────────────────────────────
  const pastaAtual = useMemo(
    () => (currentPastaId ? (pastas.find((p) => p.id === currentPastaId) ?? null) : null),
    [pastas, currentPastaId]
  );

  const contadorPorPasta = useMemo(() => {
    const map = new Map<string | null, number>();
    mensagens.forEach((m) => {
      const k = m.pasta_id ?? null;
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return map;
  }, [mensagens]);

  const queryAtiva = busca.trim().toLowerCase();

  const mensagensFiltradas = useMemo(() => {
    return mensagens.filter((m) => {
      if (queryAtiva) return m.nome.toLowerCase().includes(queryAtiva);
      return (m.pasta_id ?? null) === currentPastaId;
    });
  }, [mensagens, queryAtiva, currentPastaId]);

  const mostrarPastas = currentPastaId === null && !queryAtiva;
  const podeReordenar = !queryAtiva;

  const selecionada = mensagens.find((m) => m.id === selectedId) ?? null;

  // ─── Auto-focus ──────────────────────────────────────────────────
  useEffect(() => {
    if (criandoPasta) novaPastaInputRef.current?.focus();
  }, [criandoPasta]);

  useEffect(() => {
    if (renomeandoPastaId) renomearInputRef.current?.focus();
  }, [renomeandoPastaId]);

  // ─── Auto-reset confirms ─────────────────────────────────────────
  useEffect(() => {
    if (!confirmDeleteId) return;
    const t = setTimeout(() => setConfirmDeleteId(null), 4000);
    return () => clearTimeout(t);
  }, [confirmDeleteId]);

  useEffect(() => {
    if (!confirmDeletePastaId) return;
    const t = setTimeout(() => setConfirmDeletePastaId(null), 4000);
    return () => clearTimeout(t);
  }, [confirmDeletePastaId]);

  // ─── Close folder menu on outside click ──────────────────────────
  useEffect(() => {
    if (!folderMenuMsgId) return;
    const handler = (e: MouseEvent) => {
      if (folderMenuRef.current && !folderMenuRef.current.contains(e.target as Node)) {
        setFolderMenuMsgId(null);
        setFolderMenuRect(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [folderMenuMsgId]);

  // ─── Auto-scroll helpers ─────────────────────────────────────────
  const stopAutoScroll = useCallback(() => {
    if (scrollIntervalRef.current !== null) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  }, []);

  const startAutoScroll = useCallback(
    (dir: 'up' | 'down') => {
      if (scrollIntervalRef.current !== null) return;
      scrollIntervalRef.current = setInterval(() => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollTop += dir === 'down' ? SCROLL_SPEED : -SCROLL_SPEED;
      }, 16);
    },
    []
  );

  const handleScrollZoneCheck = useCallback(
    (clientY: number) => {
      const el = scrollRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const y = clientY - rect.top;
      if (y < SCROLL_ZONE) {
        stopAutoScroll();
        startAutoScroll('up');
      } else if (y > rect.height - SCROLL_ZONE) {
        stopAutoScroll();
        startAutoScroll('down');
      } else {
        stopAutoScroll();
      }
    },
    [startAutoScroll, stopAutoScroll]
  );

  // ─── Drag: folder drop handlers ──────────────────────────────────
  const handleDragOverPasta = (e: React.DragEvent, pastaId: string | 'root') => {
    if (!e.dataTransfer.types.includes(DRAG_MSG_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverPasta(pastaId);
    setDragOverMsgId(null);
    handleScrollZoneCheck(e.clientY);
  };

  const handleDropPasta = (e: React.DragEvent, pastaId: string | null) => {
    e.preventDefault();
    const msgId = e.dataTransfer.getData(DRAG_MSG_MIME);
    setDragOverPasta(null);
    setDraggingId(null);
    stopAutoScroll();
    if (!msgId) return;
    const msg = mensagens.find((m) => m.id === msgId);
    if (!msg || (msg.pasta_id ?? null) === pastaId) return;
    void onMoverMensagem(msgId, pastaId);
  };

  // ─── Drag: message reorder handlers ──────────────────────────────
  const handleDragStartMsg = (e: React.DragEvent, msgId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(DRAG_MSG_MIME, msgId);
    setDraggingId(msgId);
  };

  const handleDragEndMsg = () => {
    setDraggingId(null);
    setDragOverMsgId(null);
    setDragOverPasta(null);
    stopAutoScroll();
  };

  const handleDragOverMsg = (e: React.DragEvent, targetId: string) => {
    if (!e.dataTransfer.types.includes(DRAG_MSG_MIME)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverPasta(null);

    // Determine above/below by mouse Y vs element midpoint
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    setDragOverMsgPos(e.clientY < mid ? 'above' : 'below');
    setDragOverMsgId(targetId);
    handleScrollZoneCheck(e.clientY);
  };

  const handleDropMsg = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const srcId = e.dataTransfer.getData(DRAG_MSG_MIME);
    setDragOverMsgId(null);
    stopAutoScroll();
    if (!srcId || srcId === targetId) return;

    // Only reorder — folder-drop is handled separately on folder cards
    const src = mensagens.find((m) => m.id === srcId);
    const tgt = mensagens.find((m) => m.id === targetId);
    if (!src || !tgt) return;

    // If src is being dragged onto a different context (different pasta), skip reorder
    if ((src.pasta_id ?? null) !== (tgt.pasta_id ?? null)) {
      // Treat as folder move: move src to tgt's pasta
      void onMoverMensagem(srcId, tgt.pasta_id ?? null);
      return;
    }

    // Reorder within context
    const contextIds = mensagensFiltradas.map((m) => m.id);
    const srcIdx = contextIds.indexOf(srcId);
    const tgtIdx = contextIds.indexOf(targetId);
    if (srcIdx < 0 || tgtIdx < 0) return;

    const newOrder = [...contextIds];
    newOrder.splice(srcIdx, 1);
    const insertAt = dragOverMsgPos === 'above' ? tgtIdx : tgtIdx + (srcIdx < tgtIdx ? 0 : 1);
    newOrder.splice(insertAt > newOrder.length ? newOrder.length : insertAt, 0, srcId);

    setDraggingId(null);
    void onReordenarMensagens(newOrder);
  };

  // ─── Folder menu ─────────────────────────────────────────────────
  const openFolderMenu = (e: React.MouseEvent, msgId: string) => {
    e.stopPropagation();
    if (folderMenuMsgId === msgId) {
      setFolderMenuMsgId(null);
      setFolderMenuRect(null);
      return;
    }
    const btn = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setFolderMenuMsgId(msgId);
    // Position: below button, aligned left, with viewport clamp
    const top = btn.bottom + 4;
    const left = Math.min(btn.left, window.innerWidth - 192);
    setFolderMenuRect({ top, left });
  };

  // ─── Pasta actions ────────────────────────────────────────────────
  const handleCriarPasta = async () => {
    const nome = novaPastaNome.trim();
    if (!nome) { setCriandoPasta(false); setNovaPastaNome(''); return; }
    const pasta = await onCriarPasta(nome);
    setCriandoPasta(false);
    setNovaPastaNome('');
    if (pasta) setCurrentPastaId(pasta.id);
  };

  const handleRenomearPasta = async (id: string) => {
    const nome = renomeandoValor.trim();
    if (nome) await onRenomearPasta(id, nome);
    setRenomeandoPastaId(null);
    setRenomeandoValor('');
  };

  // ─── Render helpers ───────────────────────────────────────────────
  const accentBg = isTelegram ? 'bg-sky-500/10 text-sky-400' : 'bg-emerald-500/10 text-emerald-400';
  const accentBgActive = isTelegram ? 'bg-sky-500/20 text-sky-400' : 'bg-emerald-500/20 text-emerald-400';
  const accentBorder = isTelegram ? 'border-sky-500/25' : 'border-emerald-500/25';
  const accentDropBg = isTelegram ? 'bg-sky-500/15 border-sky-500/40' : 'bg-emerald-500/15 border-emerald-500/40';
  const accentDropShadow = isTelegram
    ? 'shadow-[0_0_24px_rgba(56,189,248,0.12)]'
    : 'shadow-[0_0_24px_rgba(52,211,153,0.12)]';
  const accentLine = isTelegram ? 'bg-sky-400' : 'bg-emerald-400';

  return (
    <>
      <div className="card-dark rounded-2xl overflow-hidden flex flex-col h-full">
        {/* ── Header ────────────────────────────────────── */}
        <div className="p-5 border-b border-surface-300/10">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className={cn('inline-flex items-center justify-center w-6 h-6 rounded-lg text-[11px] font-bold font-mono shrink-0', isTelegram ? 'bg-sky-500/15 text-sky-400' : 'bg-emerald-500/15 text-emerald-400')}>
                1
              </span>
              {pastaAtual ? (
                <button
                  type="button"
                  onClick={() => setCurrentPastaId(null)}
                  onDragOver={(e) => handleDragOverPasta(e, 'root')}
                  onDragLeave={() => setDragOverPasta((p) => (p === 'root' ? null : p))}
                  onDrop={(e) => handleDropPasta(e, null)}
                  className={cn(
                    'group flex items-center gap-1.5 min-w-0 rounded-lg px-2 py-0.5 -mx-2 -my-0.5 transition-colors',
                    dragOverPasta === 'root' ? cn(accentDropBg, accentDropShadow) : 'hover:bg-surface-200/30'
                  )}
                  title="Voltar (solte aqui para tirar da pasta)"
                >
                  <ChevronLeft className="w-3.5 h-3.5 text-txt-dim group-hover:text-txt-secondary shrink-0" />
                  <FolderOpen className={cn('w-3.5 h-3.5 shrink-0', isTelegram ? 'text-sky-400' : 'text-emerald-400')} />
                  <h3 className="text-[14px] font-semibold text-txt font-display truncate">{pastaAtual.nome}</h3>
                </button>
              ) : (
                <h3 className="text-[14px] font-semibold text-txt font-display">Mensagem</h3>
              )}
            </div>
            {!pastaAtual && (
              <button
                type="button"
                onClick={() => { setCriandoPasta(true); setNovaPastaNome(''); }}
                className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium border transition-all shrink-0', isTelegram ? 'text-sky-400 border-sky-500/20 hover:bg-sky-500/10 hover:border-sky-500/30' : 'text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10 hover:border-emerald-500/30')}
                title="Criar pasta"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                Nova pasta
              </button>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-txt-dim pointer-events-none" />
            <input
              type="text"
              placeholder={pastaAtual ? `Buscar em ${pastaAtual.nome}...` : 'Buscar mensagem...'}
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="input-dark text-[13px] pl-9 py-2"
            />
          </div>
        </div>

        {/* ── List ──────────────────────────────────────── */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto min-h-0 max-h-[320px] p-2 space-y-0.5"
          onDragLeave={(e) => {
            // Only stop scroll when leaving the scroll container entirely
            if (!scrollRef.current?.contains(e.relatedTarget as Node)) stopAutoScroll();
          }}
        >
          {/* Input nova pasta */}
          {criandoPasta && mostrarPastas && (
            <div className={cn('flex items-center gap-2 p-2.5 rounded-xl border mb-1', isTelegram ? 'bg-sky-500/5 border-sky-500/25' : 'bg-emerald-500/5 border-emerald-500/25')}>
              <FolderPlus className={cn('w-4 h-4 shrink-0', isTelegram ? 'text-sky-400' : 'text-emerald-400')} />
              <input
                ref={novaPastaInputRef}
                type="text"
                value={novaPastaNome}
                onChange={(e) => setNovaPastaNome(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCriarPasta();
                  if (e.key === 'Escape') { setCriandoPasta(false); setNovaPastaNome(''); }
                }}
                placeholder="Nome da pasta"
                maxLength={48}
                className="flex-1 bg-transparent border-0 outline-none text-[13px] text-txt placeholder:text-txt-dim"
              />
              <button onClick={handleCriarPasta} className={cn('p-1.5 rounded-lg transition-colors', isTelegram ? 'text-sky-400 hover:bg-sky-500/15' : 'text-emerald-400 hover:bg-emerald-500/15')} title="Criar">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => { setCriandoPasta(false); setNovaPastaNome(''); }} className="p-1.5 rounded-lg text-txt-dim hover:text-txt hover:bg-surface-200/50 transition-colors" title="Cancelar">
                <XIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Pastas */}
          {mostrarPastas && pastas.map((pasta) => {
            const count = contadorPorPasta.get(pasta.id) ?? 0;
            const isDropTarget = dragOverPasta === pasta.id;
            const isRenaming = renomeandoPastaId === pasta.id;
            const isConfirmDel = confirmDeletePastaId === pasta.id;
            return (
              <div
                key={pasta.id}
                onDragOver={(e) => handleDragOverPasta(e, pasta.id)}
                onDragLeave={() => setDragOverPasta((p) => (p === pasta.id ? null : p))}
                onDrop={(e) => handleDropPasta(e, pasta.id)}
                className={cn(
                  'group flex items-center gap-3 p-3 rounded-xl border transition-all duration-150 cursor-pointer',
                  isDropTarget ? cn(accentDropBg, 'scale-[1.01]', accentDropShadow) : 'border-transparent hover:bg-surface-200/30 hover:border-surface-300/15'
                )}
                onClick={() => { if (!isRenaming && !isConfirmDel) { setCurrentPastaId(pasta.id); setBusca(''); } }}
              >
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors', isDropTarget ? accentBgActive : accentBg)}>
                  {isDropTarget ? <FolderOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  {isRenaming ? (
                    <input
                      ref={renomearInputRef}
                      type="text"
                      value={renomeandoValor}
                      onChange={(e) => setRenomeandoValor(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenomearPasta(pasta.id);
                        if (e.key === 'Escape') { setRenomeandoPastaId(null); setRenomeandoValor(''); }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      maxLength={48}
                      className="w-full bg-surface-50/70 border border-surface-300/20 rounded-md px-2 py-1 text-[13px] text-txt outline-none focus:border-surface-300/40"
                    />
                  ) : (
                    <p className="text-[13px] font-medium text-txt-secondary truncate">{pasta.nome}</p>
                  )}
                  <p className="text-[11px] text-txt-dim">{count === 0 ? 'Vazia' : `${count} mensage${count === 1 ? 'm' : 'ns'}`}</p>
                </div>
                <div className={cn('flex items-center gap-0.5 shrink-0 transition-opacity', isRenaming || isConfirmDel ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')} onClick={(e) => e.stopPropagation()}>
                  {isRenaming ? (
                    <>
                      <button onClick={() => handleRenomearPasta(pasta.id)} className={cn('p-1.5 rounded-lg transition-colors', isTelegram ? 'text-sky-400 hover:bg-sky-500/15' : 'text-emerald-400 hover:bg-emerald-500/15')} title="Salvar"><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={() => { setRenomeandoPastaId(null); setRenomeandoValor(''); }} className="p-1.5 rounded-lg text-txt-dim hover:text-txt hover:bg-surface-200/50 transition-colors" title="Cancelar"><XIcon className="w-3.5 h-3.5" /></button>
                    </>
                  ) : isConfirmDel ? (
                    <>
                      <button onClick={async () => { await onExcluirPasta(pasta.id); setConfirmDeletePastaId(null); }} className="p-1.5 rounded-lg text-rose-400 bg-rose-500/15 hover:bg-rose-500/25 transition-all" title="Confirmar"><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setConfirmDeletePastaId(null)} className="p-1.5 rounded-lg text-txt-dim hover:text-txt hover:bg-surface-200/50 transition-colors" title="Cancelar"><XIcon className="w-3.5 h-3.5" /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setRenomeandoPastaId(pasta.id); setRenomeandoValor(pasta.nome); }} className="p-1.5 rounded-lg text-txt-dim hover:text-txt hover:bg-surface-200/50 transition-colors" title="Renomear"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setConfirmDeletePastaId(pasta.id)} className="p-1.5 rounded-lg text-txt-dim hover:text-rose-400 hover:bg-rose-500/10 transition-colors" title="Excluir pasta"><Trash2 className="w-3.5 h-3.5" /></button>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {/* Separador */}
          {mostrarPastas && pastas.length > 0 && mensagensFiltradas.length > 0 && (
            <div className="flex items-center gap-2 px-3 pt-3 pb-2">
              <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-txt-dim">Sem pasta</span>
              <div className="flex-1 h-px bg-surface-300/10" />
            </div>
          )}

          {/* Mensagens */}
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-pulse">
                <div className="w-8 h-8 bg-surface-200/40 rounded-lg shrink-0" />
                <div className="flex-1"><div className="h-3.5 bg-surface-200/40 rounded w-24 mb-1" /><div className="h-3 bg-surface-200/30 rounded w-16" /></div>
              </div>
            ))
          ) : mensagensFiltradas.length === 0 && !mostrarPastas ? (
            <div className="text-center py-10">
              <p className="text-[12px] text-txt-dim">
                {queryAtiva ? 'Nenhuma mensagem encontrada' : pastaAtual ? 'Pasta vazia — arraste mensagens para cá' : 'Nenhuma mensagem cadastrada'}
              </p>
            </div>
          ) : mensagensFiltradas.length === 0 && mostrarPastas && pastas.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-[12px] text-txt-dim">Nenhuma mensagem cadastrada</p>
            </div>
          ) : (
            mensagensFiltradas.map((msg) => {
              const Icon = TIPO_ICON[msg.tipo];
              const isSelected = selectedId === msg.id;
              const isDragging = draggingId === msg.id;
              const isDropAbove = dragOverMsgId === msg.id && dragOverMsgPos === 'above';
              const isDropBelow = dragOverMsgId === msg.id && dragOverMsgPos === 'below';

              return (
                <div
                  key={msg.id}
                  className="relative"
                  draggable={podeReordenar}
                  onDragStart={(e) => handleDragStartMsg(e, msg.id)}
                  onDragEnd={handleDragEndMsg}
                  onDragOver={(e) => handleDragOverMsg(e, msg.id)}
                  onDragLeave={() => setDragOverMsgId((p) => (p === msg.id ? null : p))}
                  onDrop={(e) => handleDropMsg(e, msg.id)}
                >
                  {/* Drop indicator above */}
                  {isDropAbove && (
                    <div className={cn('absolute -top-px left-3 right-3 h-0.5 rounded-full z-10 pointer-events-none', accentLine)} />
                  )}

                  <button
                    onClick={() => onSelect(msg.id)}
                    className={cn(
                      'w-full flex items-center gap-2 p-3 rounded-xl transition-all duration-150 text-left group',
                      isSelected ? cn('border', isTelegram ? 'bg-sky-500/10 border-sky-500/25' : 'bg-emerald-500/10 border-emerald-500/25') : 'hover:bg-surface-200/30 border border-transparent',
                      isDragging && 'opacity-35 scale-[0.99]',
                    )}
                  >
                    {/* Drag handle */}
                    {podeReordenar && (
                      <GripVertical className="w-3 h-3.5 text-txt-dim/40 opacity-0 group-hover:opacity-100 shrink-0 cursor-grab active:cursor-grabbing transition-opacity" />
                    )}

                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors', isSelected ? accentBgActive : 'bg-surface-200/40 text-txt-dim group-hover:text-txt-muted')}>
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={cn('text-[13px] font-medium truncate', isSelected ? (isTelegram ? 'text-sky-300' : 'text-emerald-300') : 'text-txt-secondary')}>
                        {msg.nome}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <p className="text-[11px] text-txt-dim">{TIPO_LABEL[msg.tipo]}</p>
                        {msg.mencionar_todos && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium" style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399' }}>
                            <Megaphone className="w-2.5 h-2.5" />@todos
                          </span>
                        )}
                        {queryAtiva && msg.pasta_id && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-surface-200/50 text-txt-dim">
                            <Folder className="w-2.5 h-2.5" />
                            {pastas.find((p) => p.id === msg.pasta_id)?.nome ?? 'pasta'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions (hidden until hover) */}
                    <div
                      className={cn('flex items-center gap-0.5 shrink-0 transition-all duration-150', confirmDeleteId === msg.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {confirmDeleteId === msg.id ? (
                        <>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!onExcluirMensagem || excluindoId) return;
                              try { setExcluindoId(msg.id); await onExcluirMensagem(msg); setConfirmDeleteId(null); }
                              finally { setExcluindoId(null); }
                            }}
                            disabled={excluindoId === msg.id}
                            className="p-1.5 rounded-lg text-rose-400 bg-rose-500/15 hover:bg-rose-500/25 transition-all disabled:opacity-60"
                            title="Confirmar exclusão"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }} className="p-1.5 rounded-lg text-txt-dim hover:text-txt hover:bg-surface-200/50 transition-all" title="Cancelar">
                            <XIcon className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          {/* Mover para pasta */}
                          <button
                            onClick={(e) => openFolderMenu(e, msg.id)}
                            className={cn(
                              'p-1.5 rounded-lg transition-all',
                              folderMenuMsgId === msg.id
                                ? isTelegram ? 'text-sky-400 bg-sky-500/15' : 'text-emerald-400 bg-emerald-500/15'
                                : 'text-txt-dim hover:text-txt hover:bg-surface-200/50'
                            )}
                            title="Mover para pasta"
                          >
                            <FolderInput className="w-3.5 h-3.5" />
                          </button>
                          {/* Editar */}
                          <button
                            onClick={(e) => { e.stopPropagation(); onEditarMensagem(msg); }}
                            className="p-1.5 rounded-lg text-txt-dim hover:text-txt hover:bg-surface-200/50 transition-all"
                            title="Editar"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {/* Excluir */}
                          {onExcluirMensagem && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(msg.id); }}
                              className="p-1.5 rounded-lg text-txt-dim hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                              title="Excluir mensagem"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </button>

                  {/* Drop indicator below */}
                  {isDropBelow && (
                    <div className={cn('absolute -bottom-px left-3 right-3 h-0.5 rounded-full z-10 pointer-events-none', accentLine)} />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ── Preview ───────────────────────────────────── */}
        {selecionada && (
          <div className="border-t border-surface-300/10 p-4">
            <p className="text-[11px] text-txt-dim uppercase tracking-wider font-mono mb-2">Preview</p>
            <div className="rounded-xl bg-surface-50/60 border border-surface-300/10 p-3 max-h-[260px] overflow-y-auto">
              {selecionada.tipo === 'texto' && (
                <p className="text-[12px] text-txt-secondary leading-relaxed whitespace-pre-wrap">{selecionada.conteudo || '(sem conteúdo)'}</p>
              )}
              {selecionada.tipo === 'imagem' && selecionada.midia_url && (
                <div className="space-y-2">
                  <img src={selecionada.midia_url} alt={selecionada.nome} className="w-full rounded-lg object-contain" />
                  {selecionada.conteudo && <p className="text-[11px] text-txt-dim">{selecionada.conteudo}</p>}
                </div>
              )}
              {selecionada.tipo === 'audio' && (
                selecionada.midia_url
                  ? <AudioPlayer src={selecionada.midia_url} nome={selecionada.nome} canal={canal} />
                  : <p className="text-[12px] text-txt-dim italic">Áudio sem arquivo</p>
              )}
              {selecionada.tipo === 'video' && (
                selecionada.midia_url ? (
                  <div className="space-y-2">
                    <video src={selecionada.midia_url} controls className="w-full rounded-lg object-contain bg-black/30" />
                    {selecionada.conteudo && <p className="text-[11px] text-txt-dim">{selecionada.conteudo}</p>}
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', isTelegram ? 'bg-sky-500/10' : 'bg-emerald-500/10')}>
                      <FileVideo className={cn('w-4 h-4', isTelegram ? 'text-sky-400' : 'text-emerald-400')} />
                    </div>
                    <div>
                      <p className="text-[12px] text-txt-secondary">{selecionada.nome}</p>
                      <p className="text-[10px] text-txt-dim">Vídeo sem arquivo</p>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* ── Nova Mensagem ─────────────────────────────── */}
        <div className="p-3 border-t border-surface-300/10">
          <button
            onClick={() => onNovaMensagem(currentPastaId)}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-semibold transition-all duration-200 border',
              isTelegram
                ? 'bg-sky-500/10 text-sky-400 border-sky-500/20 hover:bg-sky-500/15 hover:border-sky-500/30 hover:shadow-[0_0_20px_rgba(56,189,248,0.08)]'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15 hover:border-emerald-500/30 hover:shadow-[0_0_20px_rgba(52,211,153,0.08)]'
            )}
          >
            <Plus className="w-3.5 h-3.5" />
            Nova mensagem
          </button>
        </div>
      </div>

      {/* ── Folder Menu (fixed portal) ────────────────── */}
      {folderMenuMsgId && folderMenuRect && (
        <div
          ref={folderMenuRef}
          className="fixed z-[9999] w-48 rounded-xl overflow-hidden border border-surface-300/15 shadow-2xl"
          style={{
            top: folderMenuRect.top,
            left: folderMenuRect.left,
            background: 'var(--c-popup-bg)',
          }}
        >
          <div className="px-3 py-2 border-b border-surface-300/10">
            <p className="text-[10px] font-mono uppercase tracking-widest text-txt-dim">Mover para</p>
          </div>

          {/* Opção: sem pasta (raiz) */}
          {(() => {
            const msg = mensagens.find((m) => m.id === folderMenuMsgId);
            const jaSemPasta = !msg?.pasta_id;
            return (
              <button
                onClick={() => {
                  if (folderMenuMsgId && !jaSemPasta) void onMoverMensagem(folderMenuMsgId, null);
                  setFolderMenuMsgId(null);
                  setFolderMenuRect(null);
                }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-left transition-colors',
                  jaSemPasta
                    ? 'text-txt-dim cursor-default'
                    : 'text-txt-secondary hover:bg-surface-200/30 hover:text-txt'
                )}
              >
                <FolderMinus className="w-3.5 h-3.5 shrink-0 text-txt-dim" />
                <span className="truncate">Sem pasta</span>
                {jaSemPasta && <Check className="w-3 h-3 ml-auto shrink-0 text-txt-dim" />}
              </button>
            );
          })()}

          {/* Pastas */}
          {pastas.length === 0 ? (
            <p className="px-3 py-2.5 text-[11px] text-txt-dim italic">Nenhuma pasta criada</p>
          ) : (
            pastas.map((pasta) => {
              const msg = mensagens.find((m) => m.id === folderMenuMsgId);
              const ativa = msg?.pasta_id === pasta.id;
              return (
                <button
                  key={pasta.id}
                  onClick={() => {
                    if (folderMenuMsgId && !ativa) void onMoverMensagem(folderMenuMsgId, pasta.id);
                    setFolderMenuMsgId(null);
                    setFolderMenuRect(null);
                  }}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-left transition-colors',
                    ativa
                      ? 'text-txt-dim cursor-default'
                      : 'text-txt-secondary hover:bg-surface-200/30 hover:text-txt'
                  )}
                >
                  <Folder className={cn('w-3.5 h-3.5 shrink-0', isTelegram ? 'text-sky-400/70' : 'text-emerald-400/70')} />
                  <span className="truncate flex-1">{pasta.nome}</span>
                  {ativa && <Check className="w-3 h-3 ml-auto shrink-0 text-txt-dim" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </>
  );
};
