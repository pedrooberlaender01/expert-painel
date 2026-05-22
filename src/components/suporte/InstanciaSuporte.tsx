import React, { useState, useEffect, useCallback } from 'react';
import {
  Smartphone,
  Plus,
  Loader2,
  Wifi,
  WifiOff,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  X,
  Server,
  Clock,
  AlertCircle,
  Headset,
} from 'lucide-react';
import type { WhatsappRotacao } from '../../hooks/useWhatsappRotacao';
import { cn } from '../../utils/cn';

// ─── Helpers ───

function formatNumero(raw: string): string {
  const d = raw.replace(/\D/g, '');
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)} ${d.slice(2)}`;
  if (d.length <= 9) return `${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4)}`;
  return `${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 9)}-${d.slice(9)}`;
}

function formatTimeSince(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'agora mesmo';
  if (diffMin < 60) return `ha ${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  const remainMin = diffMin % 60;
  if (diffH < 24) return `ha ${diffH}h ${remainMin > 0 ? `${remainMin}min` : ''}`.trim();
  const diffD = Math.floor(diffH / 24);
  return `ha ${diffD}d ${diffH % 24}h`;
}

// ─── Status Config ───

const STATUS_CONFIG = {
  connected: {
    label: 'Conectado',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    ring: 'ring-emerald-500/25',
    dot: 'bg-emerald-400',
    icon: Wifi,
    barColor: 'bg-emerald-500/40',
  },
  disconnected: {
    label: 'Desconectado',
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    ring: 'ring-red-500/25',
    dot: 'bg-red-400',
    icon: WifiOff,
    barColor: 'bg-red-500/40',
  },
  connecting: {
    label: 'Aguardando pareamento',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    ring: 'ring-amber-500/25',
    dot: 'bg-amber-400',
    icon: Loader2,
    barColor: 'bg-amber-500/60 animate-pulse',
  },
} as const;

// ─── Countdown Timer ───

function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState('');
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = new Date().getTime();
      const expires = new Date(expiresAt).getTime();
      const diff = expires - now;
      if (diff <= 0) {
        setRemaining('Expirado');
        setExpired(true);
        return;
      }
      const min = Math.floor(diff / 60000);
      const sec = Math.floor((diff % 60000) / 1000);
      setRemaining(`${min}:${sec.toString().padStart(2, '0')}`);
      setExpired(false);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <span className={cn(
      'text-[12px] font-mono font-medium tabular-nums',
      expired ? 'text-red-400' : 'text-amber-400'
    )}>
      <Clock className="w-3 h-3 inline-block mr-1 -mt-px" />
      {remaining}
    </span>
  );
}

// ─── Instancia Card ───

function SuporteInstanciaCard({
  inst,
  onConectar,
  onExcluir,
  conectando,
  excluindo,
}: {
  inst: WhatsappRotacao;
  onConectar: (id: number) => void;
  onExcluir: (id: number) => void;
  conectando: boolean;
  excluindo: boolean;
}) {
  const status = inst.status_conexao || 'disconnected';
  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  const [localPairingCode, setLocalPairingCode] = useState<string | null>(null);
  const [pairingExpired, setPairingExpired] = useState(false);
  const [copied, setCopied] = useState(false);

  const pairingCode = localPairingCode || inst.pairing_code;

  // Verificar se pairing code expirou
  useEffect(() => {
    const expiresAt = inst.pairing_code_expires_at;
    if (!expiresAt || !pairingCode) {
      setPairingExpired(!pairingCode);
      return;
    }
    const check = () => {
      setPairingExpired(new Date().getTime() >= new Date(expiresAt).getTime());
    };
    check();
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }, [inst.pairing_code_expires_at, pairingCode]);

  // Limpar pairing code local quando realtime traz um novo
  useEffect(() => {
    if (inst.pairing_code) setLocalPairingCode(null);
  }, [inst.pairing_code]);

  const handleCopyCode = useCallback(async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback */ }
  }, []);

  return (
    <div className={cn('card-dark p-5 transition-all duration-200 relative overflow-hidden')}>
      {/* Barra de status lateral */}
      <div className={cn(
        'absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full transition-colors duration-300',
        config.barColor,
      )} />

      {/* Header: nome + status badge */}
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className={cn(
            'flex items-center justify-center w-8 h-8 rounded-lg text-[13px] font-bold shrink-0',
            config.bg, config.text,
          )}>
            <Headset className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-[14px] font-semibold text-txt font-display truncate">{inst.nome}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={cn(
                'inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold rounded-md ring-1',
                config.bg, config.text, config.ring,
              )}>
                <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', config.dot, status === 'connecting' && 'animate-pulse')} />
                {config.label}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/20">
                <Headset className="w-3 h-3" />
                Suporte
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center gap-2 text-[13px]">
          <Smartphone className="w-3.5 h-3.5 text-txt-dim shrink-0" />
          <span className="text-txt-secondary font-mono">{formatNumero(inst.numero)}</span>
        </div>
        <div className="flex items-center gap-2 text-[13px]">
          <Server className="w-3.5 h-3.5 text-txt-dim shrink-0" />
          <span className="text-txt-muted">{inst.instancia}</span>
        </div>
      </div>

      {/* Conectado: info de conexao */}
      {status === 'connected' && inst.last_connected_at && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <StatusIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-[12px] text-emerald-400/90 font-medium">
            Conectado {formatTimeSince(inst.last_connected_at)}
          </span>
        </div>
      )}

      {/* Connecting: pairing code valido */}
      {status === 'connecting' && pairingCode && !pairingExpired && (
        <div className="mb-3 space-y-2.5">
          <div className="relative px-4 py-3.5 rounded-xl bg-zinc-800/80 border border-zinc-700/60 text-center">
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold mb-2">Codigo de Pareamento</p>
            <p className="text-2xl font-mono font-bold text-white tracking-[0.15em] select-all">
              {pairingCode}
            </p>
            <button
              onClick={() => handleCopyCode(pairingCode)}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium text-zinc-400 hover:text-white bg-zinc-700/50 hover:bg-zinc-700/80 rounded-lg transition-all"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copiado!' : 'Copiar codigo'}
            </button>
            {inst.pairing_code_expires_at && (
              <div className="mt-2.5 pt-2 border-t border-zinc-700/40">
                <CountdownTimer expiresAt={inst.pairing_code_expires_at} />
              </div>
            )}
          </div>
          <p className="text-[11px] text-zinc-500 text-center">
            Insira este codigo no WhatsApp → Dispositivos Vinculados → Vincular Dispositivo
          </p>
        </div>
      )}

      {/* Connecting: pairing code expirado */}
      {status === 'connecting' && pairingExpired && (
        <div className="mb-3 space-y-2.5">
          <p className="text-[11px] text-zinc-500 text-center leading-relaxed">
            Escaneie com WhatsApp → Dispositivos Vinculados → Vincular Dispositivo
          </p>
          <button
            onClick={() => onConectar(inst.id)}
            disabled={conectando}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-semibold transition-all duration-200',
              'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
              'hover:bg-emerald-500/15 hover:border-emerald-500/30 hover:shadow-[0_0_20px_rgba(16,185,129,0.08)]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {conectando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {conectando ? 'Gerando codigo...' : 'Gerar novo codigo de pareamento'}
          </button>
        </div>
      )}

      {/* Disconnected: local pairing code */}
      {status === 'disconnected' && localPairingCode && (
        <div className="mb-3">
          <div className="relative px-4 py-3.5 rounded-xl bg-zinc-800/80 border border-zinc-700/60 text-center">
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold mb-2">Codigo de Pareamento</p>
            <p className="text-2xl font-mono font-bold text-white tracking-[0.15em] select-all">
              {localPairingCode}
            </p>
            <p className="text-[11px] text-zinc-500 mt-2">
              Insira este codigo no WhatsApp do aparelho
            </p>
          </div>
        </div>
      )}

      {/* Disconnected: botao reconectar */}
      {status === 'disconnected' && !localPairingCode && (
        <div className="mb-3 space-y-2">
          {inst.last_disconnect_reason && (
            <div className="flex items-start gap-2 text-[11px] text-zinc-500">
              <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
              <span>{inst.last_disconnect_reason}</span>
            </div>
          )}
          <button
            onClick={() => onConectar(inst.id)}
            disabled={conectando}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-semibold transition-all duration-200',
              'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
              'hover:bg-emerald-500/15 hover:border-emerald-500/30 hover:shadow-[0_0_20px_rgba(16,185,129,0.08)]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {conectando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {conectando ? 'Reconectando...' : 'Reconectar'}
          </button>
        </div>
      )}

      {/* Footer: excluir */}
      <div className="flex items-center justify-end pt-3 border-t border-surface-300/15">
        <button
          onClick={() => onExcluir(inst.id)}
          disabled={excluindo}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg border border-rose-500/10 hover:border-rose-500/20 transition-all disabled:opacity-50"
        >
          {excluindo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
          Excluir
        </button>
      </div>
    </div>
  );
}

// ─── Props ───

interface Props {
  instancias: WhatsappRotacao[];
  loading: boolean;
  onCriar: (nome: string, numero: string) => Promise<{ sucesso: boolean; pairing_code?: string; mensagem?: string; expira_em?: string }>;
  onConectar: (id: number) => Promise<{ sucesso: boolean; pairing_code?: string; mensagem?: string }>;
  onExcluir: (id: number) => Promise<string | null>;
  showToast: (type: 'success' | 'error', message: string) => void;
}

// ─── Skeleton ───

const SkeletonCard: React.FC = () => (
  <div className="card-dark p-5 animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-surface-200/50 rounded-lg" />
        <div className="h-4 w-32 bg-surface-200/50 rounded" />
      </div>
    </div>
    <div className="h-3 w-48 bg-surface-200/30 rounded mb-2" />
    <div className="h-3 w-36 bg-surface-200/20 rounded" />
  </div>
);

// ─── Main Component ───

export const InstanciaSuporte: React.FC<Props> = ({ instancias, loading, onCriar, onConectar, onExcluir, showToast }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [numero, setNumero] = useState('');
  const [criando, setCriando] = useState(false);
  const [resultado, setResultado] = useState<{ sucesso: boolean; pairing_code?: string; mensagem?: string; expira_em?: string } | null>(null);
  const [conectandoId, setConectandoId] = useState<number | null>(null);
  const [excluindoId, setExcluindoId] = useState<number | null>(null);

  const canSave = nome.trim().length > 0 && numero.trim().length > 0;

  const handleCriar = async () => {
    if (!canSave || criando) return;
    setCriando(true);
    try {
      const res = await onCriar(nome.trim(), numero.trim());
      setResultado(res);
      if (res.sucesso) {
        showToast('success', 'Instancia criada com sucesso');
      }
    } catch {
      setResultado({ sucesso: false, mensagem: 'Erro ao criar instancia' });
    } finally {
      setCriando(false);
    }
  };

  const handleConectar = async (id: number) => {
    setConectandoId(id);
    try {
      const res = await onConectar(id);
      if (!res.sucesso) {
        showToast('error', res.mensagem || 'Erro ao conectar');
      }
    } catch {
      showToast('error', 'Erro ao conectar instancia');
    } finally {
      setConectandoId(null);
    }
  };

  const handleExcluir = async (id: number) => {
    setExcluindoId(id);
    try {
      const erro = await onExcluir(id);
      if (erro) showToast('error', erro);
      else showToast('success', 'Instancia excluida');
    } catch {
      showToast('error', 'Erro ao excluir instancia');
    } finally {
      setExcluindoId(null);
    }
  };

  const fecharModal = () => {
    setModalOpen(false);
    setNome('');
    setNumero('');
    setResultado(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-txt font-display">Instancias de Suporte</h3>
          <p className="text-[12px] mt-0.5 text-txt-dim">
            Numeros WhatsApp dedicados ao atendimento via agente IA
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="btn-primary text-[13px] px-5 py-2.5 flex items-center gap-2"
        >
          <Plus className="w-3.5 h-3.5" />
          Nova Instancia
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="grid gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : instancias.length === 0 ? (
        <div className="card-dark p-12 text-center">
          <Smartphone className="w-10 h-10 mx-auto mb-3 text-txt-dim opacity-40" />
          <p className="text-[14px] font-medium text-txt-secondary">Nenhuma instancia de suporte</p>
          <p className="text-[12px] mt-1 text-txt-dim">
            Crie uma instancia para ativar o agente de suporte
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {instancias.map((inst) => (
            <SuporteInstanciaCard
              key={inst.id}
              inst={inst}
              onConectar={handleConectar}
              onExcluir={handleExcluir}
              conectando={conectandoId === inst.id}
              excluindo={excluindoId === inst.id}
            />
          ))}
        </div>
      )}

      {/* Modal Nova Instancia */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={fecharModal} />

          <div className="relative card-dark-elevated w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between p-5 border-b border-surface-300/20">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                  <Headset className="w-4 h-4 text-primary" />
                </div>
                <h2 className="text-[15px] font-semibold text-txt font-display">
                  Nova Instancia de Suporte
                </h2>
              </div>
              <button
                onClick={fecharModal}
                className="p-1.5 text-txt-muted hover:text-txt hover:bg-surface-200/40 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!resultado ? (
              <>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="text-[13px] font-medium text-txt mb-1.5 block">
                      Nome do aparelho
                    </label>
                    <input
                      type="text"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Ex: iPhone Suporte"
                      className="input-dark text-[13px]"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="text-[13px] font-medium text-txt mb-1.5 block">
                      Numero WhatsApp (com DDI)
                    </label>
                    <input
                      type="text"
                      value={numero}
                      onChange={(e) => setNumero(e.target.value)}
                      placeholder="5534999999999"
                      className="input-dark text-[13px]"
                    />
                    <p className="text-[11px] text-txt-dim mt-1.5">
                      Formato: codigo do pais + DDD + numero (sem espacos ou tracos)
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-5 border-t border-surface-300/20">
                  <button
                    onClick={fecharModal}
                    className="px-4 py-2 text-[13px] font-medium text-txt-secondary hover:text-txt bg-surface-200/30 hover:bg-surface-200/50 rounded-xl border border-surface-300/20 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCriar}
                    disabled={!canSave || criando}
                    className="btn-primary text-[13px] px-5 py-2 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none"
                  >
                    {criando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Criar Instancia
                  </button>
                </div>
              </>
            ) : (
              <div className="p-5">
                {resultado.sucesso ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-primary-light" />
                      <span className="text-[13px] font-semibold text-primary-light">
                        Instancia criada com sucesso!
                      </span>
                    </div>

                    {resultado.pairing_code && (
                      <div className="relative px-4 py-4 rounded-xl bg-zinc-800/80 border border-zinc-700/60 text-center">
                        <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold mb-2">
                          Codigo de Pareamento
                        </p>
                        <p className="text-2xl font-mono font-bold text-white tracking-[0.15em] select-all">
                          {resultado.pairing_code}
                        </p>
                        {resultado.expira_em && (
                          <p className="text-[11px] text-zinc-500 mt-2">
                            Expira em {resultado.expira_em}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/10">
                      <p className="text-[12px] text-primary/80 leading-relaxed">
                        Abra o WhatsApp no aparelho, va em <strong>Dispositivos Conectados</strong> e
                        selecione <strong>Conectar com numero de telefone</strong>. Insira o codigo acima.
                      </p>
                    </div>

                    {resultado.mensagem && (
                      <p className="text-[12px] text-txt-muted">{resultado.mensagem}</p>
                    )}

                    <button
                      onClick={fecharModal}
                      className="w-full px-4 py-2.5 text-[13px] font-medium text-txt-secondary hover:text-txt bg-surface-200/30 hover:bg-surface-200/50 rounded-xl border border-surface-300/20 transition-all"
                    >
                      Fechar
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-400" />
                      <span className="text-[13px] font-semibold text-red-400">Erro ao criar instancia</span>
                    </div>
                    <p className="text-[13px] text-txt-secondary">
                      {resultado.mensagem || 'Erro desconhecido. Tente novamente.'}
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setResultado(null)}
                        className="flex-1 px-4 py-2 text-[13px] font-medium text-primary bg-primary/10 hover:bg-primary/15 rounded-xl border border-primary/20 transition-all"
                      >
                        Tentar novamente
                      </button>
                      <button
                        onClick={fecharModal}
                        className="flex-1 px-4 py-2 text-[13px] font-medium text-txt-secondary hover:text-txt bg-surface-200/30 hover:bg-surface-200/50 rounded-xl border border-surface-300/20 transition-all"
                      >
                        Fechar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
