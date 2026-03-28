import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Loader2, FlaskConical, ChevronDown, Check, Wifi, WifiOff } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { EnviosNav } from '../components/envios/EnviosNav';
import { Toast } from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { supabase } from '../backend/client';
import { WEBHOOKS, UAZAPI_BASE_URL, fetchWithTimeout } from '../config/webhooks';

interface Instancia {
  id: number;
  nome: string;
  instancia: string;
  token: string;
  tipo: string;
  status_conexao: string;
  numero: string;
}

// ─── Instance Selector ───────────────────────────────────────────────────────

const InstanciaSelector: React.FC<{
  value: string;
  instancias: Instancia[];
  loading: boolean;
  onChange: (token: string) => void;
}> = ({ value, instancias, loading, onChange }) => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const selected = instancias.find(i => i.token === value);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node)) return;
      if (dropRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const dropWidth = rect.width;
      setPos({ top: rect.bottom + 8, left: rect.left, width: dropWidth });
    }
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen(!open)}
        type="button"
        className="w-full relative flex items-center gap-3 text-[13px] font-medium transition-all duration-150 text-left"
        style={{
          background: open ? 'rgba(59,130,246,0.06)' : 'rgba(255,255,255,0.04)',
          border: open ? '1px solid rgba(59,130,246,0.25)' : '1px solid rgba(255,255,255,0.04)',
          color: selected ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.3)',
          borderRadius: '12px',
          padding: '12px 40px 12px 16px',
        }}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'rgba(255,255,255,0.3)' }} />
        ) : selected ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: selected.status_conexao === 'connected' ? 'var(--color-primary-light)' : '#f87171' }}
            />
            <span className="truncate">{selected.nome}</span>
            {selected.numero && (
              <span className="text-[11px] font-mono shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {selected.numero}
              </span>
            )}
          </div>
        ) : (
          'Selecionar instância...'
        )}
        <ChevronDown
          className="w-3.5 h-3.5 absolute right-3 transition-transform duration-200"
          style={{ color: open ? '#60a5fa' : 'rgba(255,255,255,0.3)', transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>
      {open && ReactDOM.createPortal(
        <div
          ref={dropRef}
          className="fixed overflow-y-auto animate-fade-in"
          style={{
            top: pos.top,
            left: pos.left,
            width: pos.width,
            maxHeight: '280px',
            zIndex: 9999,
            background: 'rgba(22, 27, 34, 0.97)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '14px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.06)',
          }}
        >
          <div className="p-1.5">
            {instancias.length === 0 ? (
              <div className="px-3 py-4 text-center text-[12px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Nenhuma instância disparadora encontrada
              </div>
            ) : (
              instancias.map(inst => {
                const active = inst.token === value;
                const connected = inst.status_conexao === 'connected';
                return (
                  <button
                    key={inst.id}
                    onClick={() => { onChange(inst.token); setOpen(false); }}
                    className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-[12px] transition-all duration-150 text-left gap-2"
                    style={{
                      background: active ? 'rgba(59,130,246,0.1)' : 'transparent',
                      color: active ? '#60a5fa' : 'rgba(255,255,255,0.6)',
                    }}
                    onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#fff'; } }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = active ? 'rgba(59,130,246,0.1)' : 'transparent'; e.currentTarget.style.color = active ? '#60a5fa' : 'rgba(255,255,255,0.6)'; }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {connected
                        ? <Wifi className="w-3 h-3 shrink-0" style={{ color: 'var(--color-primary-light)' }} />
                        : <WifiOff className="w-3 h-3 shrink-0" style={{ color: 'rgba(255,255,255,0.2)' }} />
                      }
                      <span className="truncate font-medium">{inst.nome}</span>
                      {inst.numero && (
                        <span className="text-[10px] font-mono shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }}>
                          {inst.numero}
                        </span>
                      )}
                    </div>
                    {active && <Check size={12} className="text-[#60a5fa] flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

// ─── Page Component ──────────────────────────────────────────────────────────

export const SimuladorEnvios: React.FC = () => {
  const [simTelefone, setSimTelefone] = useState('');
  const [simNome, setSimNome] = useState('');
  const [simToken, setSimToken] = useState('');
  const [simMensagem, setSimMensagem] = useState('');
  const [simEnviando, setSimEnviando] = useState(false);
  const [instancias, setInstancias] = useState<Instancia[]>([]);
  const [loadingInstancias, setLoadingInstancias] = useState(true);
  const { toast, showToast, hideToast } = useToast();

  const fetchInstancias = useCallback(async () => {
    setLoadingInstancias(true);
    const { data, error } = await supabase
      .from('whatsapp_rotacao')
      .select('id, nome, instancia, token, tipo, status_conexao, numero')
      .eq('ativo', true)
      .order('ordem');
    if (!error && data) setInstancias(data as Instancia[]);
    setLoadingInstancias(false);
  }, []);

  useEffect(() => { fetchInstancias(); }, [fetchInstancias]);

  const handleSimular = async () => {
    const telefoneNumeros = simTelefone.replace(/\D/g, '');
    if (telefoneNumeros.length < 12) {
      showToast('error', 'Telefone deve ter no mínimo 12 dígitos (DDI+DDD+número)');
      return;
    }
    if (!simToken.trim()) {
      showToast('error', 'Selecione uma instância');
      return;
    }
    if (!simMensagem.trim()) {
      showToast('error', 'A mensagem é obrigatória');
      return;
    }

    const instanciaSelecionada = instancias.find(i => i.token === simToken);
    if (!instanciaSelecionada) {
      showToast('error', 'Instância não encontrada');
      return;
    }

    setSimEnviando(true);
    try {
      const now = Date.now();
      const nomeLead = simNome.trim() || 'Lead Teste';
      const mensagem = simMensagem.trim();
      const telefone = telefoneNumeros;
      const messageId = [...Array(24)].map(() => Math.floor(Math.random() * 16).toString(16).toUpperCase()).join('');

      const payload = {
        BaseUrl: UAZAPI_BASE_URL,
        EventType: 'messages',
        chat: {
          chatbot_agentResetMemoryAt: 0,
          chatbot_disableUntil: 0,
          chatbot_lastTriggerAt: 0,
          chatbot_lastTrigger_id: '',
          id: '',
          image: '',
          imagePreview: '',
          lead_assignedAttendant_id: '',
          lead_email: '',
          lead_fullName: '',
          lead_isTicketOpen: false,
          lead_kanbanOrder: 0,
          lead_name: '',
          lead_notes: '',
          lead_personalid: '',
          lead_status: '',
          lead_tags: [],
          name: nomeLead,
          owner: instanciaSelecionada.numero,
          phone: telefone,
          wa_archived: false,
          wa_chatid: `${telefone}@s.whatsapp.net`,
          wa_chatlid: '',
          wa_contactName: '',
          wa_ephemeralExpiration: 0,
          wa_fastid: `${instanciaSelecionada.numero}:${telefone}`,
          wa_isBlocked: false,
          wa_isGroup: false,
          wa_isGroup_admin: false,
          wa_isGroup_announce: false,
          wa_isGroup_community: false,
          wa_isGroup_member: false,
          wa_isPinned: false,
          wa_label: [],
          wa_lastMessageSender: `${telefone}@s.whatsapp.net`,
          wa_lastMessageTextVote: mensagem,
          wa_lastMessageType: 'ExtendedTextMessage',
          wa_lastMsgTimestamp: now,
          wa_muteEndTime: 0,
          wa_name: nomeLead,
          wa_unreadCount: 1,
        },
        chatSource: 'updated',
        instanceName: instanciaSelecionada.instancia,
        message: {
          buttonOrListid: '',
          chatid: `${telefone}@s.whatsapp.net`,
          chatlid: '',
          content: {
            text: mensagem,
            contextInfo: {},
          },
          convertOptions: '',
          edited: '',
          fromMe: false,
          groupName: '',
          id: `${instanciaSelecionada.numero}:${messageId}`,
          isGroup: false,
          mediaType: '',
          messageTimestamp: now,
          messageType: 'ExtendedTextMessage',
          messageid: messageId,
          owner: instanciaSelecionada.numero,
          quoted: '',
          reaction: '',
          sender: `${telefone}@s.whatsapp.net`,
          senderName: nomeLead,
          sender_lid: '',
          sender_pn: `${telefone}@s.whatsapp.net`,
          source: 'android',
          status: '',
          text: mensagem,
          track_id: '',
          track_source: '',
          type: 'text',
          vote: '',
          wasSentByApi: false,
        },
        owner: instanciaSelecionada.numero,
        token: instanciaSelecionada.token,
      };

      const res = await fetchWithTimeout(WEBHOOKS.ASSISTENTE_WHATSAPP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await res.text();
        showToast('error', `Erro ao simular: ${msg}`);
        setSimEnviando(false);
        return;
      }

      showToast('success', 'Mensagem simulada enviada com sucesso');
      setSimMensagem('');
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao simular mensagem');
    } finally {
      setSimEnviando(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Envios em Massa" subtitle="Dispare mensagens para grupos de leads" />
      <EnviosNav />

      <section className="card-dark p-6">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-txt font-display flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-primary-light" />
            Simulador de Mensagem
          </h2>
          <p className="text-[11px] text-txt-dim mt-1">Simule uma mensagem como se tivesse vindo pelo WhatsApp</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-mono font-semibold text-txt-muted mb-2 uppercase tracking-widest">Telefone do Lead *</label>
            <input
              type="text"
              value={simTelefone}
              onChange={(e) => setSimTelefone(e.target.value.replace(/\D/g, ''))}
              placeholder="5511999999999"
              className="input-dark"
              maxLength={15}
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono font-semibold text-txt-muted mb-2 uppercase tracking-widest">Nome do Lead (pushName)</label>
            <input
              type="text"
              value={simNome}
              onChange={(e) => setSimNome(e.target.value)}
              placeholder="Nome que aparece no WhatsApp"
              className="input-dark"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono font-semibold text-txt-muted mb-2 uppercase tracking-widest">Instância *</label>
            <InstanciaSelector
              value={simToken}
              instancias={instancias}
              loading={loadingInstancias}
              onChange={setSimToken}
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono font-semibold text-txt-muted mb-2 uppercase tracking-widest">Mensagem *</label>
            <textarea
              value={simMensagem}
              onChange={(e) => setSimMensagem(e.target.value)}
              placeholder="Digite a mensagem que o lead enviaria..."
              rows={3}
              className="input-dark resize-none"
            />
          </div>
          <button
            onClick={handleSimular}
            disabled={simEnviando}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: simEnviando ? 'var(--color-primary-hover)' : 'var(--color-primary)' }}
            onMouseEnter={(e) => { if (!simEnviando) e.currentTarget.style.background = 'var(--color-primary-hover)'; }}
            onMouseLeave={(e) => { if (!simEnviando) e.currentTarget.style.background = 'var(--color-primary)'; }}
          >
            {simEnviando ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FlaskConical className="w-4 h-4" />
            )}
            {simEnviando ? 'Enviando...' : 'Simular Mensagem'}
          </button>
        </div>
      </section>

      {toast && <Toast toast={toast} onClose={hideToast} />}
    </div>
  );
};
