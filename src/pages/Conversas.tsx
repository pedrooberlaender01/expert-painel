import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../backend/client'
import { Search, Phone, X, Play, Pause, Volume2, VolumeX, MessageSquare, Mic, Image as ImageIcon, SlidersHorizontal, Check, Send, Loader2 } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Conversa {
  id: string
  lead_id: string
  telefone: string
  direcao: 'recebida' | 'enviada'
  tipo: 'texto' | 'audio' | 'imagem'
  conteudo: string | null
  audio_url: string | null
  midia_url: string | null
  instancia: string
  messageid_whatsapp: string
  status_funil_snapshot: string
  created_at: string
  nome: string | null
  status: string | null
  instancia_enviou: string | null
}

interface Mensagem {
  id: string
  lead_id: string
  telefone: string
  direcao: 'recebida' | 'enviada'
  tipo: 'texto' | 'audio' | 'imagem'
  conteudo: string | null
  audio_url: string | null
  midia_url: string | null
  instancia: string
  messageid_whatsapp: string
  status_funil_snapshot: string
  created_at: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  primeiro_audio_enviado:         { label: 'Aguardando Nome',      color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' },
  convite_enviado:                { label: 'Convite Enviado',      color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.1)' },
  interessado:                    { label: 'Interessado',          color: '#34D399', bg: 'rgba(52, 211, 153, 0.1)' },
  aguardando_cadastro:            { label: 'Aguardando Cadastro',  color: '#FB923C', bg: 'rgba(251, 146, 60, 0.1)' },
  link_enviado:                   { label: 'Link Enviado',         color: '#A78BFA', bg: 'rgba(167, 139, 250, 0.1)' },
  aguardando_confirmacao_entrada: { label: 'Aguard. Confirmação',  color: '#3370FF', bg: 'rgba(51, 112, 255, 0.1)' },
  no_grupo:                       { label: 'No Grupo',             color: '#34D399', bg: 'rgba(52, 211, 153, 0.1)' },
  entrou_grupo:                   { label: 'No Grupo',             color: '#34D399', bg: 'rgba(52, 211, 153, 0.1)' },
  nao_interessado:                { label: 'Não Interessado',      color: '#71717A', bg: 'rgba(113, 113, 122, 0.1)' },
  sem_resposta:                   { label: 'Sem Resposta',         color: '#F87171', bg: 'rgba(248, 113, 113, 0.1)' },
  atendimento_manual:             { label: 'Atendimento Manual',   color: '#A1A1AA', bg: 'rgba(161, 161, 170, 0.1)' },
}

const INSTANCIAS = ['allan-1', 'allan-2', 'allan-3', 'allan-4', 'allan-5']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStatusCfg(status: string | null) {
  if (!status) return { label: 'Desconhecido', color: '#71717A', bg: 'rgba(113, 113, 122, 0.1)' }
  return STATUS_CONFIG[status] ?? { label: status, color: '#71717A', bg: 'rgba(113, 113, 122, 0.1)' }
}

function getInitial(nome: string | null, telefone: string): string {
  if (nome && nome.trim()) return nome.trim()[0].toUpperCase()
  return telefone[telefone.length - 1]
}

function getAvatarColor(telefone: string): string {
  const colors = [
    'linear-gradient(135deg, #0040E0 0%, #004AFF 100%)',
    'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)',
    'linear-gradient(135deg, #0284C7 0%, #38BDF8 100%)',
    'linear-gradient(135deg, #059669 0%, #34D399 100%)',
    'linear-gradient(135deg, #B45309 0%, #F59E0B 100%)',
    'linear-gradient(135deg, #BE185D 0%, #F472B6 100%)',
    'linear-gradient(135deg, #4338CA 0%, #818CF8 100%)',
  ]
  let hash = 0
  for (const c of telefone) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff
  return colors[Math.abs(hash) % colors.length]
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()
  if (isToday) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (isYesterday) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function formatFullTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatDateSeparator(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === now.toDateString()) return 'Hoje'
  if (d.toDateString() === yesterday.toDateString()) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function previewMsg(msg: Conversa): string {
  if (msg.tipo === 'audio') return 'Áudio'
  if (msg.tipo === 'imagem') return 'Imagem'
  return msg.conteudo?.slice(0, 42) ?? ''
}

function previewIcon(msg: Conversa) {
  if (msg.tipo === 'audio') return <Mic size={11} className="inline mr-1 opacity-60" />
  if (msg.tipo === 'imagem') return <ImageIcon size={11} className="inline mr-1 opacity-60" />
  return null
}

function groupByDate(msgs: Mensagem[]): Array<{ type: 'separator'; label: string } | { type: 'message'; data: Mensagem }> {
  const result: Array<{ type: 'separator'; label: string } | { type: 'message'; data: Mensagem }> = []
  let lastDate = ''
  for (const m of msgs) {
    const d = new Date(m.created_at).toDateString()
    if (d !== lastDate) {
      result.push({ type: 'separator', label: formatDateSeparator(m.created_at) })
      lastDate = d
    }
    result.push({ type: 'message', data: m })
  }
  return result
}

// ─── AudioPlayer ─────────────────────────────────────────────────────────────

function AudioPlayer({ url, enviada }: { url: string; enviada: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  const toggle = () => {
    if (!audioRef.current) return
    if (playing) { audioRef.current.pause(); setPlaying(false) }
    else { audioRef.current.play(); setPlaying(true) }
  }

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    const onTime = () => setProgress(a.currentTime / (a.duration || 1))
    const onLoad = () => setDuration(a.duration)
    const onEnd = () => { setPlaying(false); setProgress(0) }
    a.addEventListener('timeupdate', onTime)
    a.addEventListener('loadedmetadata', onLoad)
    a.addEventListener('ended', onEnd)
    return () => { a.removeEventListener('timeupdate', onTime); a.removeEventListener('loadedmetadata', onLoad); a.removeEventListener('ended', onEnd) }
  }, [])

  const accentColor = enviada ? '#004AFF' : '#71717A'
  const accentFaded = enviada ? 'rgba(0, 74, 255, 0.25)' : 'rgba(113, 113, 122, 0.25)'
  const barCount = 24
  const bars = Array.from({ length: barCount }, (_, i) => {
    const filled = i / barCount <= progress
    const h = 4 + Math.sin(i * 0.8) * 8 + Math.sin(i * 1.7) * 5
    return { height: Math.max(4, Math.abs(h)), filled }
  })

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  return (
    <div className="flex items-center gap-2.5" style={{ minWidth: 180 }}>
      <audio ref={audioRef} src={url} preload="metadata" />
      <button
        onClick={toggle}
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105"
        style={{ background: accentColor }}
      >
        {playing
          ? <Pause size={12} color="#fff" />
          : <Play size={12} color="#fff" style={{ marginLeft: 1 }} />}
      </button>
      <div className="flex items-center gap-[2px] flex-1">
        {bars.map((b, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-100"
            style={{
              width: 2.5,
              height: b.height,
              background: b.filled ? accentColor : accentFaded,
            }}
          />
        ))}
      </div>
      <span className="text-[11px] text-txt-muted flex-shrink-0 font-mono">
        {playing ? fmt(audioRef.current?.currentTime ?? 0) : fmt(duration)}
      </span>
    </div>
  )
}

// ─── ImageLightbox ────────────────────────────────────────────────────────────

function ImageLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
      style={{ background: 'rgba(0, 0, 0, 0.9)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <button
        className="absolute top-5 right-5 w-9 h-9 rounded-xl flex items-center justify-center bg-surface-100 border border-glass-border text-txt-secondary hover:text-txt hover:border-[#004AFF]/30 transition-all duration-200"
        onClick={onClose}
      >
        <X size={16} />
      </button>
      <img
        src={url}
        alt="Imagem"
        className="max-w-[90vw] max-h-[90vh] rounded-xl object-contain animate-slide-up"
        onClick={e => e.stopPropagation()}
      />
    </div>
  )
}

// ─── MensagemBubble ───────────────────────────────────────────────────────────

function MensagemBubble({ msg, onImageClick }: { msg: Mensagem; onImageClick: (url: string) => void }) {
  const enviada = msg.direcao === 'enviada'

  const bubbleClasses = enviada
    ? 'bg-[#004AFF]/15 border border-[#004AFF]/10'
    : 'bg-surface-100 border border-glass-border'

  const bubbleRadius = enviada
    ? 'rounded-2xl rounded-tr-sm'
    : 'rounded-2xl rounded-tl-sm'

  return (
    <div className={`flex ${enviada ? 'justify-end' : 'justify-start'} mb-1.5`}>
      <div className={`${bubbleClasses} ${bubbleRadius} max-w-[72%] px-3.5 py-2.5`}>

        {msg.tipo === 'texto' && (
          <p className="text-txt text-[14px] leading-[21px] whitespace-pre-wrap break-words">
            {msg.conteudo}
          </p>
        )}

        {msg.tipo === 'audio' && msg.audio_url && (
          <div>
            <AudioPlayer url={msg.audio_url} enviada={enviada} />
            {enviada && msg.conteudo && (
              <p className="text-txt-dim text-[11px] mt-1.5 italic leading-[15px]">
                {msg.conteudo}
              </p>
            )}
          </div>
        )}

        {msg.tipo === 'imagem' && msg.midia_url && (
          <img
            src={msg.midia_url}
            alt="Imagem"
            className="rounded-lg cursor-pointer object-cover hover:opacity-90 transition-opacity"
            style={{ maxWidth: 240, maxHeight: 240, display: 'block' }}
            onClick={() => onImageClick(msg.midia_url!)}
          />
        )}

        <div className={`flex items-center gap-1.5 mt-1 ${enviada ? 'justify-end' : 'justify-start'}`}>
          <span className="text-[11px] text-txt-dim">
            {formatFullTime(msg.created_at)}
          </span>
          {enviada && <span className="text-[11px] text-[#004AFF]/60">✓✓</span>}
        </div>
      </div>
    </div>
  )
}

// ─── ConversaItem ─────────────────────────────────────────────────────────────

function ConversaItem({
  conversa,
  selected,
  unread,
  onClick,
}: {
  conversa: Conversa
  selected: boolean
  unread: number
  onClick: () => void
}) {
  const cfg = getStatusCfg(conversa.status)
  const avatarGradient = getAvatarColor(conversa.telefone)
  const initial = getInitial(conversa.nome, conversa.telefone)

  return (
    <div
      onClick={onClick}
      className={`
        flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-200
        border-l-2
        ${selected
          ? 'bg-[#004AFF]/[0.06] border-l-accent'
          : 'border-l-transparent hover:bg-glass-hover'
        }
      `}
    >
      {/* Avatar */}
      <div
        className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white text-sm shadow-sm"
        style={{ background: avatarGradient }}
      >
        {initial}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-medium text-txt text-[13.5px] truncate">
            {conversa.nome || conversa.telefone}
          </span>
          <span className="text-[11px] text-txt-dim flex-shrink-0 ml-2">
            {formatTime(conversa.created_at)}
          </span>
        </div>

        <div className="flex items-center justify-between mt-0.5">
          <span className="truncate text-[12px] text-txt-muted" style={{ maxWidth: '80%' }}>
            {conversa.direcao === 'enviada' && <span className="text-[#004AFF]">Você: </span>}
            {previewIcon(conversa)}
            {previewMsg(conversa)}
          </span>
          {unread > 0 && (
            <span className="flex-shrink-0 rounded-full flex items-center justify-center font-semibold text-[10px] min-w-[18px] h-[18px] px-1 ml-1 bg-[#004AFF] text-surface">
              {unread}
            </span>
          )}
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <span className="rounded px-1.5 py-0.5 font-mono text-[10px] bg-surface-200/60 text-txt-muted border border-glass-border">
            {conversa.instancia}
          </span>
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-medium border"
            style={{ background: cfg.bg, color: cfg.color, borderColor: `${cfg.color}20` }}
          >
            {cfg.label}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Conversas() {
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [selectedTel, setSelectedTel] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string | null>(null)
  const [filtroInstancia, setFiltroInstancia] = useState<string | null>(null)
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({})
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [muted, setMuted] = useState(() => {
    try {
      return localStorage.getItem('conversas-muted') === '1'
    } catch {
      return false
    }
  })

  // Dados da conversa selecionada (precisa estar antes do bloco de envio)
  const conversaAtual = conversas.find(c => c.telefone === selectedTel)

  // ─── Envio de mensagens ───
  const [msgTexto, setMsgTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [envioErro, setEnvioErro] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [instanciaCache, setInstanciaCache] = useState<Record<string, { token: string; numero: string }>>({})

  // Buscar dados da instância (token + numero) quando seleciona conversa
  useEffect(() => {
    if (!conversaAtual?.instancia) return
    const inst = conversaAtual.instancia
    if (instanciaCache[inst]) return
    supabase
      .from('whatsapp_rotacao')
      .select('numero, token, instancia')
      .eq('instancia', inst)
      .single()
      .then(({ data }) => {
        if (data) {
          setInstanciaCache(prev => ({ ...prev, [inst]: { token: (data as any).token, numero: (data as any).numero } }))
        }
      })
  }, [conversaAtual?.instancia, instanciaCache])

  const handleEnviarMensagem = useCallback(async () => {
    const texto = msgTexto.trim()
    if (!texto || !conversaAtual || enviando) return

    const inst = conversaAtual.instancia
    const dadosInst = instanciaCache[inst]
    if (!dadosInst) {
      setEnvioErro('Dados da instância não encontrados. Tente novamente.')
      return
    }

    setEnviando(true)
    setEnvioErro(null)

    try {
      // Enviar para webhook do n8n (ele envia via Uazapi e salva no banco)
      const res = await fetch('https://n8n-gend.srv1431760.hstgr.cloud/webhook/envio-saas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefone: conversaAtual.telefone,
          mensagem: texto,
          nome_lead: conversaAtual.nome || '',
          instancia: inst,
          token: dadosInst.token.trim(),
          owner: dadosInst.numero,
          lead_id: conversaAtual.lead_id,
          status_lead: conversaAtual.status || '',
          message_id: Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('').toUpperCase(),
        }),
      })

      if (!res.ok) throw new Error('Falha ao enviar mensagem')

      // Limpar textarea após sucesso
      setMsgTexto('')
      if (textareaRef.current) {
        textareaRef.current.style.height = '44px'
      }
    } catch (err: any) {
      console.error('[Envio] Erro:', err)
      setEnvioErro(err.message || 'Erro ao enviar mensagem')
    } finally {
      setEnviando(false)
    }
  }, [msgTexto, conversaAtual, enviando, instanciaCache])

  // Auto-resize textarea
  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMsgTexto(e.target.value)
    const el = e.target
    el.style.height = '44px'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [])

  // Enter envia, Shift+Enter quebra linha
  const handleTextareaKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEnviarMensagem()
    }
  }, [handleEnviarMensagem])

  // Som de notificação (beep simples gerado por Web Audio API)
  useEffect(() => {
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = 880; gain.gain.value = 0
      osc.start(); osc.stop(0)
      ctx.close()
    } catch {
      return;
    }
  }, [])

  const playNotif = useCallback(() => {
    if (muted) return
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sine'; osc.frequency.value = 880
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3)
    } catch {
      return;
    }
  }, [muted])

  // Carregar lista de conversas
  const fetchConversas = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_lista_conversas') as { data: Conversa[] | null; error: unknown }
    if (error || !data) {
      // fallback: query direta
      const { data: raw } = await supabase
        .from('mensagens')
        .select('*, leads!inner(nome, status, instancia_enviou)')
        .order('created_at', { ascending: false })
      if (raw) {
        // dedup por telefone manualmente
        const seen = new Set<string>()
        const deduped: Conversa[] = []
        for (const r of raw as Record<string, unknown>[]) {
          const leads = r.leads as Record<string, string> | null
          const tel = r.telefone as string
          if (!seen.has(tel)) {
            seen.add(tel)
            deduped.push({
              ...(r as unknown as Conversa),
              nome: leads?.nome ?? null,
              status: leads?.status ?? null,
              instancia_enviou: leads?.instancia_enviou ?? null,
            })
          }
        }
        setConversas(deduped)
      }
      return
    }
    setConversas(data)
  }, [])

  useEffect(() => { fetchConversas() }, [fetchConversas])

  // Carregar mensagens da conversa selecionada
  useEffect(() => {
    if (!selectedTel) return
    setLoadingMsgs(true)
    supabase
      .from('mensagens')
      .select('*')
      .eq('telefone', selectedTel)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setMensagens((data as unknown as Mensagem[]) ?? [])
        setLoadingMsgs(false)
        setUnreadMap(prev => ({ ...prev, [selectedTel]: 0 }))
      })
  }, [selectedTel])

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('mensagens-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensagens' },
        (payload) => {
          const nova = payload.new as Mensagem
          // Atualizar lista de conversas
          fetchConversas()
          // Se for da conversa aberta, adicionar
          if (nova.telefone === selectedTel) {
            setMensagens(prev => [...prev, nova])
          } else {
            // Badge não lida
            setUnreadMap(prev => ({ ...prev, [nova.telefone]: (prev[nova.telefone] ?? 0) + 1 }))
            playNotif()
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selectedTel, fetchConversas, playNotif])

  // Filtrar lista
  const conversasFiltradas = conversas.filter(c => {
    if (busca) {
      const b = busca.toLowerCase()
      if (!c.nome?.toLowerCase().includes(b) && !c.telefone.includes(b)) return false
    }
    if (filtroStatus && c.status !== filtroStatus) return false
    if (filtroInstancia && c.instancia !== filtroInstancia) return false
    return true
  })

  const [filtroAberto, setFiltroAberto] = useState(false)
  const filtroRef = useRef<HTMLDivElement>(null)
  const activeFilterCount = (filtroStatus ? 1 : 0) + (filtroInstancia ? 1 : 0)

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filtroRef.current && !filtroRef.current.contains(e.target as Node)) {
        setFiltroAberto(false)
      }
    }
    if (filtroAberto) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [filtroAberto])

  const grouped = groupByDate(mensagens)
  const statusesPresentes = [...new Set(conversas.map(c => c.status).filter(Boolean))]

  return (
    <div className="flex h-screen overflow-hidden bg-surface font-body animate-fade-in">

      {/* ── Painel Esquerdo ── */}
      <div className="flex flex-col flex-shrink-0 overflow-hidden w-[360px] border-r border-glass-border bg-surface-50/50">

        {/* Header */}
        <div className="p-5 border-b border-glass-border h-[73px] flex items-center">
          <div className="flex items-center justify-between w-full">
            <h1 className="font-semibold text-txt text-lg font-display">Conversas</h1>

            {/* Botão Filtro */}
            <div className="relative" ref={filtroRef}>
              <button
                onClick={() => setFiltroAberto(!filtroAberto)}
                className={`
                  flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[12px] font-medium transition-all duration-200 border
                  ${filtroAberto || activeFilterCount > 0
                    ? 'bg-[#004AFF]/10 text-[#004AFF] border-[#004AFF]/25'
                    : 'bg-surface-100 text-txt-muted border-glass-border hover:border-surface-300/40 hover:text-txt-secondary'
                  }
                `}
              >
                <SlidersHorizontal size={13} />
                Filtros
                {activeFilterCount > 0 && (
                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[#004AFF] text-surface text-[10px] font-semibold">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Dropdown de Filtros */}
              {filtroAberto && (
                <div className="absolute right-0 top-full mt-2 w-[260px] rounded-xl bg-surface-100 border border-glass-border shadow-xl shadow-black/30 z-50 animate-fade-in overflow-hidden">

                  {/* Status */}
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold text-txt-secondary uppercase tracking-wider">Status</span>
                      {filtroStatus && (
                        <button
                          onClick={() => setFiltroStatus(null)}
                          className="text-[10px] text-[#004AFF] hover:text-[#004AFF]-bright transition-colors"
                        >
                          Limpar
                        </button>
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {statusesPresentes.map(s => {
                        const cfg = getStatusCfg(s)
                        const active = filtroStatus === s
                        return (
                          <button
                            key={s}
                            onClick={() => setFiltroStatus(active ? null : s!)}
                            className={`
                              flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] transition-all duration-150 text-left
                              ${active
                                ? 'bg-glass-hover text-txt'
                                : 'text-txt-muted hover:bg-glass-hover hover:text-txt-secondary'
                              }
                            `}
                          >
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ background: cfg.color }}
                            />
                            <span className="flex-1">{cfg.label}</span>
                            {active && <Check size={12} className="text-[#004AFF] flex-shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="h-px bg-glass-border" />

                  {/* Instância */}
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold text-txt-secondary uppercase tracking-wider">Instância</span>
                      {filtroInstancia && (
                        <button
                          onClick={() => setFiltroInstancia(null)}
                          className="text-[10px] text-[#004AFF] hover:text-[#004AFF]-bright transition-colors"
                        >
                          Limpar
                        </button>
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {INSTANCIAS.map(inst => {
                        const active = filtroInstancia === inst
                        return (
                          <button
                            key={inst}
                            onClick={() => setFiltroInstancia(active ? null : inst)}
                            className={`
                              flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] font-mono transition-all duration-150 text-left
                              ${active
                                ? 'bg-glass-hover text-txt'
                                : 'text-txt-muted hover:bg-glass-hover hover:text-txt-secondary'
                              }
                            `}
                          >
                            <span className="flex-1">{inst}</span>
                            {active && <Check size={12} className="text-[#004AFF] flex-shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Limpar tudo */}
                  {activeFilterCount > 0 && (
                    <>
                      <div className="h-px bg-glass-border" />
                      <div className="p-2">
                        <button
                          onClick={() => { setFiltroStatus(null); setFiltroInstancia(null) }}
                          className="w-full py-1.5 rounded-lg text-[12px] text-txt-muted hover:text-[#004AFF] hover:bg-[#004AFF]/5 transition-all duration-150"
                        >
                          Limpar todos os filtros
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Filtros ativos (badges) */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
              {filtroStatus && (() => {
                const cfg = getStatusCfg(filtroStatus)
                return (
                  <button
                    onClick={() => setFiltroStatus(null)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border transition-all duration-150 hover:opacity-80"
                    style={{ background: cfg.bg, color: cfg.color, borderColor: `${cfg.color}20` }}
                  >
                    {cfg.label}
                    <X size={10} />
                  </button>
                )
              })()}
              {filtroInstancia && (
                <button
                  onClick={() => setFiltroInstancia(null)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium border bg-[#004AFF]/10 text-[#004AFF] border-[#004AFF]/20 transition-all duration-150 hover:opacity-80"
                >
                  {filtroInstancia}
                  <X size={10} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Busca (acima da lista) */}
        <div className="px-3 py-2.5">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-dim" />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por nome ou telefone"
              className="input-dark w-full !pl-9 !pr-3 !py-2 !rounded-xl text-[13px]"
            />
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {conversasFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <MessageSquare size={20} className="text-txt-dim" />
              <span className="text-txt-dim text-[13px]">Nenhuma conversa encontrada</span>
            </div>
          ) : (
            conversasFiltradas.map(c => (
              <ConversaItem
                key={c.telefone}
                conversa={c}
                selected={c.telefone === selectedTel}
                unread={unreadMap[c.telefone] ?? 0}
                onClick={() => setSelectedTel(c.telefone)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Painel Direito ── */}
      <div className="flex flex-col flex-1 overflow-hidden bg-surface">
        {!selectedTel ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-surface-100 border border-glass-border">
              <Phone size={24} className="text-txt-dim" />
            </div>
            <div className="text-center">
              <p className="text-txt-secondary text-[14px]">Selecione uma conversa</p>
              <p className="text-txt-dim text-[12px] mt-1">Escolha um contato para ver o histórico</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header do Chat */}
            {conversaAtual && (
              <div className="flex items-center gap-3 px-5 h-[73px] flex-shrink-0 border-b border-glass-border bg-surface-50/80 backdrop-blur-sm">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white text-sm flex-shrink-0 shadow-sm"
                  style={{ background: getAvatarColor(conversaAtual.telefone) }}
                >
                  {getInitial(conversaAtual.nome, conversaAtual.telefone)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-txt text-[15px] truncate">
                      {conversaAtual.nome || 'Lead sem nome'}
                    </span>
                    {(() => {
                      const cfg = getStatusCfg(conversaAtual.status)
                      return (
                        <span
                          className="px-2 py-0.5 rounded-md flex-shrink-0 text-[11px] font-medium border"
                          style={{ background: cfg.bg, color: cfg.color, borderColor: `${cfg.color}20` }}
                        >
                          {cfg.label}
                        </span>
                      )
                    })()}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-txt-muted text-[12px]">
                      {conversaAtual.telefone.replace(/^55/, '+55 ').replace(/(\d{2})(\d{5})(\d{4})/, '$1 $2-$3')}
                    </span>
                    <span className="rounded px-1.5 py-0.5 font-mono text-[10px] bg-surface-200/60 text-txt-muted border border-glass-border">
                      {conversaAtual.instancia}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const next = !muted
                    setMuted(next)
                    try {
                      localStorage.setItem('conversas-muted', next ? '1' : '0')
                    } catch {
                      return
                    }
                  }}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] transition-all duration-200 border
                    ${muted
                      ? 'bg-surface-100 text-txt-muted border-glass-border hover:border-surface-300/40'
                      : 'bg-[#004AFF]/10 text-[#004AFF] border-[#004AFF]/20 hover:bg-[#004AFF]/15'
                    }
                  `}
                  aria-label={muted ? 'Ativar som' : 'Silenciar som'}
                >
                  {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                  {muted ? 'Silenciado' : 'Som'}
                </button>
              </div>
            )}

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto px-4 py-3 bg-surface">
              {loadingMsgs ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-6 h-6 border-2 border-[#004AFF]/30 border-t-accent rounded-full animate-spin" />
                    <span className="text-txt-dim text-[13px]">Carregando...</span>
                  </div>
                </div>
              ) : (
                <>
                  {grouped.map((item, i) => {
                    if (item.type === 'separator') {
                      return (
                        <div key={`sep-${i}`} className="flex items-center gap-3 my-5">
                          <div className="flex-1 h-px bg-glass-border" />
                          <span className="px-3 py-1 rounded-lg bg-surface-100 border border-glass-border text-txt-dim text-[11px] font-medium">
                            {item.label}
                          </span>
                          <div className="flex-1 h-px bg-glass-border" />
                        </div>
                      )
                    }
                    return (
                      <MensagemBubble
                        key={item.data.id}
                        msg={item.data}
                        onImageClick={setLightboxUrl}
                      />
                    )
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Campo de envio */}
            <div className="px-4 py-3 flex-shrink-0 border-t border-[#1a1a1a] bg-[#111111]">
              {envioErro && (
                <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[12px]">
                  <span>Erro ao enviar mensagem</span>
                  <button onClick={() => setEnvioErro(null)} className="ml-auto hover:text-red-300"><X size={12} /></button>
                </div>
              )}
              <div className="flex items-end gap-3">
                <textarea
                  ref={textareaRef}
                  value={msgTexto}
                  onChange={handleTextareaChange}
                  onKeyDown={handleTextareaKeyDown}
                  disabled={enviando}
                  placeholder="Digite uma mensagem..."
                  rows={1}
                  className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-xl px-4 py-3 text-[14px] resize-none focus:outline-none focus:border-[#004AFF]/40 transition-colors duration-200 placeholder:text-txt-dim disabled:opacity-50"
                  style={{ minHeight: 44, maxHeight: 120 }}
                />
                <button
                  onClick={handleEnviarMensagem}
                  disabled={!msgTexto.trim() || enviando}
                  className={`
                    flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200
                    ${msgTexto.trim() && !enviando
                      ? 'bg-[#004AFF] text-white hover:bg-[#004AFF]/90 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                      : 'bg-surface-200 text-txt-dim cursor-not-allowed'
                    }
                  `}
                >
                  {enviando ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} style={{ marginLeft: 1 }} />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Lightbox */}
      {lightboxUrl && <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </div>
  )
}
