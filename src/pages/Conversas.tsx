import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../backend/client'
import { useAuthStore } from '../stores/authStore'
import { WEBHOOKS, fetchWithTimeout } from '../config/webhooks'
import { Search, Phone, X, Play, Pause, Volume2, VolumeX, MessageSquare, Mic, Image as ImageIcon, SlidersHorizontal, Check, Send, Loader2, ArrowLeft, Headset, HandHelping } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Conversa {
  id: string
  lead_id: string | null
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
  canal: string | null
  suporte_pendente: boolean
}

interface Mensagem {
  id: string
  lead_id: string | null
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
  canal: string | null
}

// Chave unica para agrupar conversas por (telefone, canal)
function conversaKey(telefone: string, canal: string | null): string {
  return `${telefone}|${canal || 'funil'}`
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  primeiro_audio_enviado:         { label: 'Aguardando Nome',      color: 'var(--color-primary-light)', bg: 'var(--color-primary-bg)',  border: 'var(--color-primary-bg)' },
  convite_enviado:                { label: 'Convite Enviado',      color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.12)',  border: 'rgba(56, 189, 248, 0.2)' },
  interessado:                    { label: 'Interessado',          color: 'var(--color-primary-light)', bg: 'var(--color-primary-bg)',  border: 'var(--color-primary-bg)' },
  aguardando_cadastro:            { label: 'Aguardando Cadastro',  color: '#facc3c', bg: 'rgba(250, 204, 60, 0.12)',  border: 'rgba(250, 204, 60, 0.2)' },
  link_enviado:                   { label: 'Link Enviado',         color: 'var(--color-primary-light)', bg: 'rgba(var(--color-primary-rgb), 0.12)',  border: 'rgba(var(--color-primary-rgb), 0.2)' },
  aguardando_confirmacao_entrada: { label: 'Aguard. Confirmação',  color: 'var(--color-primary-light)', bg: 'rgba(var(--color-primary-rgb), 0.12)',  border: 'rgba(var(--color-primary-rgb), 0.2)' },
  no_grupo:                       { label: 'No Grupo',             color: 'var(--color-primary-light)', bg: 'rgba(var(--color-primary-rgb), 0.12)',  border: 'rgba(var(--color-primary-rgb), 0.2)' },
  entrou_grupo:                   { label: 'No Grupo',             color: 'var(--color-primary-light)', bg: 'rgba(var(--color-primary-rgb), 0.12)',  border: 'rgba(var(--color-primary-rgb), 0.2)' },
  nao_interessado:                { label: 'Não Interessado',      color: '#71717A', bg: 'rgba(113, 113, 122, 0.12)', border: 'rgba(113, 113, 122, 0.2)' },
  sem_resposta:                   { label: 'Sem Resposta',         color: '#F87171', bg: 'rgba(248, 113, 113, 0.12)', border: 'rgba(248, 113, 113, 0.2)' },
  atendimento_manual:             { label: 'Atendimento Manual',   color: '#A1A1AA', bg: 'rgba(161, 161, 170, 0.12)', border: 'rgba(161, 161, 170, 0.2)' },
  lead_chegou:                    { label: 'Lead Chegou',          color: '#FACC15', bg: 'rgba(250, 204, 21, 0.12)',  border: 'rgba(250, 204, 21, 0.2)' },
}

// Instâncias agora são derivadas dinamicamente das conversas carregadas

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStatusCfg(status: string | null) {
  if (!status) return { label: 'Desconhecido', color: '#71717A', bg: 'rgba(113, 113, 122, 0.12)', border: 'rgba(113, 113, 122, 0.2)' }
  return STATUS_CONFIG[status] ?? { label: status, color: '#71717A', bg: 'rgba(113, 113, 122, 0.12)', border: 'rgba(113, 113, 122, 0.2)' }
}

function getInitial(nome: string | null, telefone: string): string {
  if (nome && nome.trim()) return nome.trim()[0].toUpperCase()
  return telefone[telefone.length - 1]
}

function getAvatarColor(telefone: string): string {
  const colors = [
    'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary) 100%)',
    'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)',
    'linear-gradient(135deg, #0284C7 0%, #38BDF8 100%)',
    'linear-gradient(135deg, var(--color-primary-hover) 0%, var(--color-primary-light) 100%)',
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

  const accentColor = enviada ? 'var(--color-primary-light)' : 'rgba(255,255,255,0.4)'
  const accentFaded = enviada ? 'rgba(var(--color-primary-rgb), 0.25)' : 'rgba(255, 255, 255, 0.12)'
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
        className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105"
        style={{
          background: enviada ? 'rgba(var(--color-primary-rgb), 0.2)' : 'rgba(255, 255, 255, 0.04)',
          border: enviada ? '1px solid rgba(var(--color-primary-rgb), 0.3)' : '1px solid rgba(255, 255, 255, 0.12)',
        }}
      >
        {playing
          ? <Pause size={13} style={{ color: enviada ? 'var(--color-primary-light)' : 'rgba(255,255,255,0.6)' }} />
          : <Play size={13} style={{ color: enviada ? 'var(--color-primary-light)' : 'rgba(255,255,255,0.6)', marginLeft: 1 }} />}
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
      <span className="text-[11px] flex-shrink-0 font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>
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
      style={{ background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}
    >
      <button
        className="absolute top-5 right-5 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
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

  const bubbleStyle: React.CSSProperties = enviada
    ? {
        background: 'rgba(var(--color-primary-rgb), 0.15)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(var(--color-primary-rgb), 0.2)',
        borderRadius: '16px 4px 16px 16px',
      }
    : {
        background: 'rgba(255, 255, 255, 0.04)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.04)',
        borderRadius: '4px 16px 16px 16px',
      }

  return (
    <div className={`flex ${enviada ? 'justify-end' : 'justify-start'} mb-1.5`}>
      <div className="max-w-[65%] px-3.5 py-2.5" style={bubbleStyle}>

        {msg.tipo === 'texto' && (
          <p className="text-white text-[13px] leading-[20px] whitespace-pre-wrap break-words">
            {msg.conteudo}
          </p>
        )}

        {msg.tipo === 'audio' && msg.audio_url && (
          <div>
            <AudioPlayer url={msg.audio_url} enviada={enviada} />
            {enviada && msg.conteudo && (
              <p className="text-[11px] mt-1.5 italic leading-[15px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
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
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {formatFullTime(msg.created_at)}
          </span>
          {enviada && <span className="text-[10px]" style={{ color: 'rgba(96,165,250,0.6)' }}>✓✓</span>}
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
  const isPendente = conversa.suporte_pendente

  return (
    <div
      onClick={onClick}
      className="cursor-pointer transition-all duration-200"
      style={{
        background: selected ? 'rgba(var(--color-primary-rgb), 0.08)' : isPendente ? 'rgba(251, 146, 60, 0.03)' : 'rgba(255, 255, 255, 0.02)',
        border: selected ? '1px solid rgba(var(--color-primary-rgb), 0.15)' : isPendente ? '1px solid rgba(251, 146, 60, 0.08)' : '1px solid transparent',
        borderLeft: selected ? '3px solid var(--color-primary)' : isPendente ? '3px solid rgba(251, 146, 60, 0.6)' : '3px solid transparent',
        borderRadius: '12px',
        padding: '12px 14px',
        margin: '0 8px 4px 8px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}
      onMouseEnter={(e) => {
        if (!selected) {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.04)'
          e.currentTarget.style.borderLeftColor = 'rgba(255, 255, 255, 0.04)'
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'
          e.currentTarget.style.borderColor = 'transparent'
          e.currentTarget.style.borderLeftColor = 'transparent'
        }
      }}
    >
      {/* Avatar */}
      <div
        className="flex-shrink-0 w-[42px] h-[42px] rounded-full flex items-center justify-center font-semibold text-white text-sm"
        style={{ background: avatarGradient, boxShadow: '0 0 0 2px rgba(255, 255, 255, 0.04)' }}
      >
        {initial}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-white text-[13px] truncate">
            {conversa.nome || conversa.telefone}
          </span>
          <span className="text-[11px] flex-shrink-0 ml-2 font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {formatTime(conversa.created_at)}
          </span>
        </div>

        <div className="flex items-center justify-between mt-0.5">
          <span className="truncate text-[12px]" style={{ maxWidth: '80%', color: 'rgba(255,255,255,0.4)' }}>
            {conversa.direcao === 'enviada' && <span style={{ color: 'var(--color-primary-light)' }}>Você: </span>}
            {previewIcon(conversa)}
            {previewMsg(conversa)}
          </span>
          {unread > 0 && (
            <span
              className="flex-shrink-0 rounded-full flex items-center justify-center font-semibold text-[10px] min-w-[18px] h-[18px] px-1 ml-1 text-white"
              style={{ background: 'rgba(var(--color-primary-rgb),0.9)' }}
            >
              {unread}
            </span>
          )}
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          {/* Badge de canal */}
          {conversa.canal === 'suporte' ? (
            <span
              className="rounded-md px-2 py-0.5 text-[10px] font-medium flex items-center gap-1"
              style={{
                background: 'rgba(52, 211, 153, 0.12)',
                color: '#34d399',
                border: '1px solid rgba(52, 211, 153, 0.2)',
              }}
            >
              <Headset size={10} />
              Suporte
            </span>
          ) : (
            <span
              className="rounded-md px-2 py-0.5 text-[10px] font-medium"
              style={{
                background: 'rgba(var(--color-primary-rgb), 0.08)',
                color: 'var(--color-primary-light)',
                border: '1px solid rgba(var(--color-primary-rgb), 0.15)',
              }}
            >
              Funil
            </span>
          )}
          <span
            className="rounded-md px-2 py-0.5 font-mono text-[10px] font-medium"
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              color: 'rgba(255, 255, 255, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.04)',
            }}
          >
            {conversa.instancia}
          </span>
          {conversa.status && (
            <span
              className="rounded-md px-2 py-0.5 text-[10px] font-medium"
              style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
            >
              {cfg.label}
            </span>
          )}
          {isPendente && (
            <span
              className="rounded-md px-2 py-0.5 text-[10px] font-semibold flex items-center gap-1.5"
              style={{
                background: 'rgba(251, 146, 60, 0.12)',
                color: '#fb923c',
                border: '1px solid rgba(251, 146, 60, 0.25)',
              }}
            >
              <HandHelping size={11} className="flex-shrink-0" style={{ animation: 'pulse 2s infinite' }} />
              Aguardando resposta manual
            </span>
          )}
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
  const [selectedCanal, setSelectedCanal] = useState<string | null>(null)
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
  const selectedKey = selectedTel ? conversaKey(selectedTel, selectedCanal) : null
  const conversaAtual = conversas.find(c => conversaKey(c.telefone, c.canal) === selectedKey)

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
      const res = await fetchWithTimeout(WEBHOOKS.ENVIO_SAAS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefone: conversaAtual.telefone,
          mensagem: texto,
          nome_lead: conversaAtual.nome || '',
          instancia: inst,
          token: dadosInst.token.trim(),
          owner: dadosInst.numero,
          lead_id: conversaAtual.lead_id || '',
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

  // Carregar lista de conversas (incluindo suporte sem lead_id)
  const fetchConversas = useCallback(async () => {
    const expertId = useAuthStore.getState().getActiveExpertId();
    // LEFT join para incluir mensagens de suporte que nao possuem lead_id
    let query = supabase
      .from('mensagens')
      .select('*, leads(nome, status, instancia_enviou)')
      .order('created_at', { ascending: false });
    if (expertId) query = query.eq('expert_id', expertId);
    const { data: raw } = await query;
    if (raw) {
      // dedup por (telefone, canal) manualmente
      const seen = new Set<string>()
      const deduped: Conversa[] = []
      for (const r of raw as Record<string, unknown>[]) {
        const leads = r.leads as Record<string, string> | null
        const tel = r.telefone as string
        const canal = (r.canal as string) || 'funil'
        const key = conversaKey(tel, canal)
        if (!seen.has(key)) {
          seen.add(key)
          deduped.push({
            ...(r as unknown as Conversa),
            nome: leads?.nome ?? null,
            status: leads?.status ?? null,
            instancia_enviou: leads?.instancia_enviou ?? null,
            canal,
            suporte_pendente: false,
          })
        }
      }
      // Buscar nomes e status pendente para conversas de suporte via suporte_conversas_log
      const suporteTels = deduped.filter(c => c.canal === 'suporte').map(c => c.telefone)
      if (suporteTels.length > 0) {
        let logQuery = supabase
          .from('suporte_conversas_log')
          .select('telefone, nome_contato, respondido_por')
          .in('telefone', suporteTels)
          .order('created_at', { ascending: false });
        if (expertId) logQuery = logQuery.eq('expert_id', expertId);
        const { data: logs } = await logQuery;
        if (logs && logs.length > 0) {
          // Pegar o registro mais recente por telefone (ja vem ordenado desc)
          const nomeMap = new Map<string, string>()
          const pendenteSet = new Set<string>()
          for (const l of logs as Array<{ telefone: string; nome_contato: string | null; respondido_por: string | null }>) {
            if (!nomeMap.has(l.telefone) && l.nome_contato) {
              nomeMap.set(l.telefone, l.nome_contato)
            }
            // Apenas o primeiro registro (mais recente) define o status pendente
            if (!pendenteSet.has(`_checked_${l.telefone}`)) {
              pendenteSet.add(`_checked_${l.telefone}`)
              if (l.respondido_por === 'nao_respondido') pendenteSet.add(l.telefone)
            }
          }
          for (const c of deduped) {
            if (c.canal === 'suporte') {
              if (!c.nome && nomeMap.has(c.telefone)) c.nome = nomeMap.get(c.telefone)!
              if (pendenteSet.has(c.telefone)) c.suporte_pendente = true
            }
          }
        }
      }

      setConversas(deduped)
    }
  }, [])

  useEffect(() => { fetchConversas() }, [fetchConversas])

  // Carregar mensagens da conversa selecionada
  useEffect(() => {
    if (!selectedTel) return
    setLoadingMsgs(true)
    const expertId = useAuthStore.getState().getActiveExpertId();
    const canalFiltro = selectedCanal || 'funil'
    let msgsQuery = supabase
      .from('mensagens')
      .select('*')
      .eq('telefone', selectedTel)
      .eq('canal', canalFiltro)
      .order('created_at', { ascending: true });
    if (expertId) msgsQuery = msgsQuery.eq('expert_id', expertId);
    msgsQuery.then(({ data }) => {
        setMensagens((data as unknown as Mensagem[]) ?? [])
        setLoadingMsgs(false)
        if (selectedKey) setUnreadMap(prev => ({ ...prev, [selectedKey]: 0 }))
      })
  }, [selectedTel, selectedCanal])

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
          // Se for da conversa aberta (mesmo telefone E mesmo canal), adicionar
          const novaKey = conversaKey(nova.telefone, nova.canal)
          if (nova.telefone === selectedTel && (nova.canal || 'funil') === (selectedCanal || 'funil')) {
            setMensagens(prev => [...prev, nova])
          } else {
            // Badge não lida
            setUnreadMap(prev => ({ ...prev, [novaKey]: (prev[novaKey] ?? 0) + 1 }))
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
    if (filtroInstancia && (c.instancia_enviou || c.instancia) !== filtroInstancia) return false
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
  const instanciasPresentes = [...new Set(conversas.map(c => c.instancia_enviou || c.instancia).filter(Boolean))].sort() as string[]

  return (
    <div className="flex h-screen overflow-hidden font-body animate-fade-in" style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #0d1117 40%, #0f0a1a 100%)' }}>

      {/* ── Painel Esquerdo ── */}
      <div
        className={`flex flex-col flex-shrink-0 overflow-hidden ${selectedTel ? 'hidden md:flex' : 'flex'} w-full md:w-[360px]`}
        style={{
          background: '#0c0c14',
          borderRight: '1px solid rgba(255, 255, 255, 0.04)',
        }}
      >

        {/* Header */}
        <div className="p-5 h-[73px] flex items-center relative z-[101]" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
          <div className="flex items-center justify-between w-full">
            <h1 className="font-bold text-white text-[18px] font-display">Conversas</h1>

            {/* Botão Filtro */}
            <div className="relative" ref={filtroRef}>
              <button
                onClick={() => setFiltroAberto(!filtroAberto)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[10px] text-[12px] font-medium transition-all duration-200"
                style={{
                  background: filtroAberto || activeFilterCount > 0 ? 'rgba(var(--color-primary-rgb), 0.12)' : 'rgba(255, 255, 255, 0.04)',
                  border: filtroAberto || activeFilterCount > 0 ? '1px solid rgba(var(--color-primary-rgb), 0.25)' : '1px solid rgba(255, 255, 255, 0.04)',
                  color: filtroAberto || activeFilterCount > 0 ? 'var(--color-primary-light)' : 'rgba(255, 255, 255, 0.5)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <SlidersHorizontal size={13} />
                Filtros
                {activeFilterCount > 0 && (
                  <span className="flex items-center justify-center w-4 h-4 rounded-full text-white text-[10px] font-semibold" style={{ background: 'rgba(var(--color-primary-rgb),0.9)' }}>
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Dropdown de Filtros */}
              {filtroAberto && (
                <div
                  className="absolute right-0 top-full mt-2 w-[260px] z-[100] animate-fade-in overflow-y-auto"
                  style={{
                    background: 'rgba(22, 27, 34, 0.97)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '14px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.06)',
                    backdropFilter: 'none',
                    WebkitBackdropFilter: 'none',
                    maxHeight: '70vh',
                  }}
                >

                  {/* Status */}
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.45)' }}>Status</span>
                      {filtroStatus && (
                        <button
                          onClick={() => setFiltroStatus(null)}
                          className="text-[10px] text-[var(--color-primary-light)] hover:text-[var(--color-primary-light)] transition-colors"
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
                            onClick={() => { setFiltroStatus(active ? null : s!); setFiltroAberto(false); }}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] transition-all duration-150 text-left"
                            style={{
                              background: active ? 'rgba(255,255,255,0.04)' : 'transparent',
                              color: active ? '#fff' : 'rgba(255,255,255,0.5)',
                            }}
                            onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                            onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
                          >
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ background: cfg.color }}
                            />
                            <span className="flex-1">{cfg.label}</span>
                            {active && <Check size={12} className="text-[var(--color-primary-light)] flex-shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div style={{ height: 1, background: 'rgba(255,255,255,0.04)' }} />

                  {/* Instância */}
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.45)' }}>Instância</span>
                      {filtroInstancia && (
                        <button
                          onClick={() => setFiltroInstancia(null)}
                          className="text-[10px] text-[var(--color-primary-light)] hover:text-[var(--color-primary-light)] transition-colors"
                        >
                          Limpar
                        </button>
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {instanciasPresentes.map(inst => {
                        const active = filtroInstancia === inst
                        return (
                          <button
                            key={inst}
                            onClick={() => { setFiltroInstancia(active ? null : inst); setFiltroAberto(false); }}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] font-mono transition-all duration-150 text-left"
                            style={{
                              background: active ? 'rgba(255,255,255,0.04)' : 'transparent',
                              color: active ? '#fff' : 'rgba(255,255,255,0.5)',
                            }}
                            onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                            onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
                          >
                            <span className="flex-1">{inst}</span>
                            {active && <Check size={12} className="text-[var(--color-primary-light)] flex-shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Limpar tudo */}
                  {activeFilterCount > 0 && (
                    <>
                      <div style={{ height: 1, background: 'rgba(255,255,255,0.04)' }} />
                      <div className="p-2">
                        <button
                          onClick={() => { setFiltroStatus(null); setFiltroInstancia(null); setFiltroAberto(false); }}
                          className="w-full py-1.5 rounded-lg text-[12px] transition-all duration-150"
                          style={{ color: 'rgba(255,255,255,0.5)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-primary-light)'; e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.06)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.background = 'transparent' }}
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

        </div>

        {/* Filtros ativos (badges) */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-1.5 px-5 py-2 flex-wrap" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            {filtroStatus && (() => {
              const cfg = getStatusCfg(filtroStatus)
              return (
                <button
                  onClick={() => setFiltroStatus(null)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-150 hover:opacity-80"
                  style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
                >
                  {cfg.label}
                  <X size={10} />
                </button>
              )
            })()}
            {filtroInstancia && (
              <button
                onClick={() => setFiltroInstancia(null)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium transition-all duration-150 hover:opacity-80"
                style={{ background: 'rgba(var(--color-primary-rgb),0.12)', color: 'var(--color-primary-light)', border: '1px solid rgba(var(--color-primary-rgb),0.2)' }}
              >
                {filtroInstancia}
                <X size={10} />
              </button>
            )}
          </div>
        )}

        {/* Busca (acima da lista) */}
        <div className="px-3 py-2.5">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.25)' }} />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por nome ou telefone"
              className="w-full text-[13px] text-white outline-none transition-all duration-200"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.04)',
                borderRadius: '12px',
                padding: '10px 16px 10px 40px',
              }}
              onFocus={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                e.currentTarget.style.borderColor = 'rgba(var(--color-primary-rgb),0.3)'
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(var(--color-primary-rgb),0.08)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {conversasFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <MessageSquare size={20} style={{ color: 'rgba(255,255,255,0.15)' }} />
              <span className="text-[13px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Nenhuma conversa encontrada</span>
            </div>
          ) : (
            conversasFiltradas.map(c => {
              const cKey = conversaKey(c.telefone, c.canal)
              return (
                <ConversaItem
                  key={cKey}
                  conversa={c}
                  selected={cKey === selectedKey}
                  unread={unreadMap[cKey] ?? 0}
                  onClick={() => { setSelectedTel(c.telefone); setSelectedCanal(c.canal || 'funil'); }}
                />
              )
            })
          )}
        </div>
      </div>

      {/* ── Painel Direito ── */}
      <div className={`flex flex-col flex-1 overflow-hidden ${!selectedTel ? 'hidden md:flex' : 'flex'}`} style={{ background: 'transparent' }}>
        {!selectedTel ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div
              className="w-[72px] h-[72px] rounded-full flex items-center justify-center"
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.04)',
              }}
            >
              <Phone size={28} style={{ color: 'rgba(255, 255, 255, 0.2)' }} />
            </div>
            <div className="text-center">
              <p className="text-[15px] font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Selecione uma conversa</p>
              <p className="text-[13px] mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>Escolha um contato para ver o histórico</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header do Chat */}
            {conversaAtual && (
              <div
                className="flex items-center gap-2 md:gap-3 px-3 md:px-5 h-[73px] flex-shrink-0"
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                }}
              >
                {/* Mobile back button */}
                <button
                  onClick={() => setSelectedTel(null)}
                  className="md:hidden p-1.5 rounded-lg shrink-0"
                  style={{ color: 'rgba(255,255,255,0.5)' }}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div
                  className="w-9 h-9 md:w-[42px] md:h-[42px] rounded-full flex items-center justify-center font-semibold text-white text-sm flex-shrink-0"
                  style={{ background: getAvatarColor(conversaAtual.telefone), boxShadow: '0 0 0 2px rgba(255, 255, 255, 0.04)' }}
                >
                  {getInitial(conversaAtual.nome, conversaAtual.telefone)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-[15px] truncate">
                      {conversaAtual.nome || (conversaAtual.canal === 'suporte' ? 'Contato' : 'Lead sem nome')}
                    </span>
                    {conversaAtual.status ? (() => {
                      const cfg = getStatusCfg(conversaAtual.status)
                      return (
                        <span
                          className="px-2 py-0.5 rounded-md flex-shrink-0 text-[10px] font-medium"
                          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
                        >
                          {cfg.label}
                        </span>
                      )
                    })() : conversaAtual.canal === 'suporte' ? (
                      <span
                        className="px-2 py-0.5 rounded-md flex-shrink-0 text-[10px] font-medium flex items-center gap-1"
                        style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}
                      >
                        <Headset size={10} />
                        Suporte
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {conversaAtual.telefone.replace(/^55/, '+55 ').replace(/(\d{2})(\d{5})(\d{4})/, '$1 $2-$3')}
                    </span>
                    <span
                      className="rounded-md px-2 py-0.5 font-mono text-[10px] font-medium"
                      style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        color: 'rgba(255, 255, 255, 0.5)',
                        border: '1px solid rgba(255, 255, 255, 0.04)',
                      }}
                    >
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[12px] transition-all duration-200"
                  style={{
                    background: muted ? 'rgba(255,255,255,0.04)' : 'rgba(var(--color-primary-rgb), 0.12)',
                    border: muted ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(var(--color-primary-rgb), 0.25)',
                    color: muted ? 'rgba(255,255,255,0.5)' : 'var(--color-primary-light)',
                    backdropFilter: 'blur(12px)',
                  }}
                  aria-label={muted ? 'Ativar som' : 'Silenciar som'}
                >
                  {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                  {muted ? 'Silenciado' : 'Som'}
                </button>
              </div>
            )}

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {loadingMsgs ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-6 h-6 border-2 border-t-[var(--color-primary)] rounded-full animate-spin" style={{ borderColor: 'rgba(var(--color-primary-rgb),0.2)', borderTopColor: 'var(--color-primary)' }} />
                    <span className="text-[13px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Carregando...</span>
                  </div>
                </div>
              ) : (
                <>
                  {grouped.map((item, i) => {
                    if (item.type === 'separator') {
                      return (
                        <div key={`sep-${i}`} className="flex items-center justify-center my-5">
                          <span
                            className="px-3.5 py-1 rounded-full text-[11px] font-medium"
                            style={{
                              background: 'rgba(255, 255, 255, 0.04)',
                              border: '1px solid rgba(255, 255, 255, 0.04)',
                              color: 'rgba(255, 255, 255, 0.4)',
                              backdropFilter: 'blur(8px)',
                            }}
                          >
                            {item.label}
                          </span>
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
            <div
              className="px-5 py-3 flex-shrink-0"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderTop: '1px solid rgba(255, 255, 255, 0.04)',
              }}
            >
              {envioErro && (
                <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg text-[12px]" style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}>
                  <span>Erro ao enviar mensagem</span>
                  <button onClick={() => setEnvioErro(null)} className="ml-auto hover:opacity-70"><X size={12} /></button>
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
                  className="flex-1 text-white text-[13px] resize-none outline-none transition-all duration-200 disabled:opacity-50"
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.04)',
                    borderRadius: '12px',
                    padding: '10px 16px',
                    minHeight: 44,
                    maxHeight: 120,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(var(--color-primary-rgb),0.3)'
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(var(--color-primary-rgb),0.08)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
                <button
                  onClick={handleEnviarMensagem}
                  disabled={!msgTexto.trim() || enviando}
                  className="flex-shrink-0 w-10 h-10 rounded-[10px] flex items-center justify-center transition-all duration-200"
                  style={{
                    background: msgTexto.trim() && !enviando ? 'rgba(var(--color-primary-rgb), 0.15)' : 'rgba(255,255,255,0.04)',
                    border: msgTexto.trim() && !enviando ? '1px solid rgba(var(--color-primary-rgb), 0.25)' : '1px solid rgba(255,255,255,0.04)',
                    color: msgTexto.trim() && !enviando ? 'var(--color-primary-light)' : 'rgba(255,255,255,0.25)',
                    cursor: !msgTexto.trim() || enviando ? 'not-allowed' : 'pointer',
                  }}
                >
                  {enviando ? <Loader2 size={18} className="animate-spin" /> : <Send size={16} style={{ marginLeft: 1 }} />}
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
