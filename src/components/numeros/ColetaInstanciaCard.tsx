import React, { useState, useEffect, useCallback } from 'react';
import {
  Pencil,
  Trash2,
  Smartphone,
  Server,
  Wifi,
  WifiOff,
  Loader2,
  RefreshCw,
  Clock,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import type { WhatsappRotacao } from '../../hooks/useWhatsappRotacao';
import { cn } from '../../utils/cn';

interface ColetaInstanciaCardProps {
  numero: WhatsappRotacao;
  onToggleAtivo: (id: number, ativo: boolean) => void;
  onEdit: (numero: WhatsappRotacao) => void;
  onDelete: (numero: WhatsappRotacao) => void;
  onReconectar: (id: number) => Promise<{ sucesso: boolean; pairing_code?: string; mensagem?: string }>;
}

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
  if (diffMin < 60) return `há ${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  const remainMin = diffMin % 60;
  if (diffH < 24) return `há ${diffH}h ${remainMin > 0 ? `${remainMin}min` : ''}`.trim();
  const diffD = Math.floor(diffH / 24);
  return `há ${diffD}d ${diffH % 24}h`;
}

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

const STATUS_CONFIG = {
  connected: {
    label: 'Conectado',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    ring: 'ring-emerald-500/25',
    dot: 'bg-emerald-400',
    icon: Wifi,
  },
  disconnected: {
    label: 'Desconectado',
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    ring: 'ring-red-500/25',
    dot: 'bg-red-400',
    icon: WifiOff,
  },
  connecting: {
    label: 'Aguardando pareamento',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    ring: 'ring-amber-500/25',
    dot: 'bg-amber-400',
    icon: Loader2,
  },
} as const;

export const ColetaInstanciaCard: React.FC<ColetaInstanciaCardProps> = ({
  numero,
  onToggleAtivo,
  onEdit,
  onDelete,
  onReconectar,
}) => {
  const [reconectando, setReconectando] = useState(false);
  const [localPairingCode, setLocalPairingCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pairingExpired, setPairingExpired] = useState(false);

  const status = numero.status_conexao || 'disconnected';
  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  const pairingCode = localPairingCode || numero.pairing_code;

  // Check if pairing code is expired every second
  useEffect(() => {
    const expiresAt = numero.pairing_code_expires_at;
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
  }, [numero.pairing_code_expires_at, pairingCode]);

  const handleReconectar = useCallback(async () => {
    setReconectando(true);
    setLocalPairingCode(null);
    try {
      const result = await onReconectar(numero.id);
      if (result.sucesso && result.pairing_code) {
        setLocalPairingCode(result.pairing_code);
        setPairingExpired(false);
      }
    } finally {
      setReconectando(false);
    }
  }, [numero.id, onReconectar]);

  const handleCopyCode = useCallback(async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }, []);

  useEffect(() => {
    if (numero.pairing_code) {
      setLocalPairingCode(null);
    }
  }, [numero.pairing_code]);

  return (
    <div className={cn(
      'card-dark p-5 transition-all duration-200 relative overflow-hidden',
      !numero.ativo && 'opacity-50'
    )}>
      {/* Status glow on the left edge */}
      <div className={cn(
        'absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full transition-colors duration-300',
        status === 'connected' && 'bg-emerald-500/40',
        status === 'disconnected' && 'bg-red-500/40',
        status === 'connecting' && 'bg-amber-500/60 animate-pulse',
      )} />

      {/* Header: nome + status badge + toggle */}
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn("flex items-center justify-center w-8 h-8 rounded-lg shrink-0", config.bg)}>
            <Smartphone className={cn("w-4 h-4", config.text)} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[14px] font-semibold text-txt font-display truncate">{numero.nome}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={cn(
                'inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold rounded-md ring-1',
                config.bg, config.text, config.ring,
              )}>
                <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', config.dot, status === 'connecting' && 'animate-pulse')} />
                {config.label}
              </span>
              {!numero.ativo && (
                <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-md bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20">
                  Desativado
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Toggle */}
        <button
          onClick={() => onToggleAtivo(numero.id, !numero.ativo)}
          className={cn(
            'relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 mt-1',
            numero.ativo ? 'bg-emerald-500' : 'bg-surface-300/40'
          )}
        >
          <span className={cn(
            'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200 shadow-sm',
            numero.ativo && 'translate-x-5'
          )} />
        </button>
      </div>

      {/* Info */}
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center gap-2 text-[13px]">
          <Smartphone className="w-3.5 h-3.5 text-txt-dim shrink-0" />
          <span className="text-txt-secondary font-mono">{formatNumero(numero.numero)}</span>
        </div>
        {numero.instancia && (
          <div className="flex items-center gap-2 text-[13px]">
            <Server className="w-3.5 h-3.5 text-txt-dim shrink-0" />
            <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-md bg-surface-200/40 text-txt-muted border border-surface-300/30">
              {numero.instancia}
            </span>
          </div>
        )}
      </div>

      {/* Connected info */}
      {status === 'connected' && numero.last_connected_at && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <StatusIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-[12px] text-emerald-400/90 font-medium">
            Conectado {formatTimeSince(numero.last_connected_at)}
          </span>
        </div>
      )}

      {/* Connecting state: Estado 1 — pairing code válido */}
      {status === 'connecting' && pairingCode && !pairingExpired && (
        <div className="mb-3 space-y-2.5">
          <div className="relative px-4 py-3.5 rounded-xl bg-surface-100/80 border border-surface-300/60 text-center">
            <p className="text-[10px] uppercase tracking-widest text-txt-muted font-semibold mb-2">Código de Pareamento</p>
            <p className="text-2xl font-mono font-bold text-txt tracking-[0.15em] select-all">
              {pairingCode}
            </p>
            <button
              onClick={() => handleCopyCode(pairingCode)}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium text-txt-muted hover:text-txt bg-surface-200/50 hover:bg-surface-200/80 rounded-lg transition-all"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copiado!' : 'Copiar código'}
            </button>
            {numero.pairing_code_expires_at && (
              <div className="mt-2.5 pt-2 border-t border-surface-300/40">
                <CountdownTimer expiresAt={numero.pairing_code_expires_at} />
              </div>
            )}
          </div>

          {/* QR Code menor (200px) */}
          <div className="flex justify-center">
            {numero.qr_code_base64 && numero.qr_code_base64.length > 0 ? (
              <img
                src={numero.qr_code_base64.startsWith('data:') ? numero.qr_code_base64 : `data:image/png;base64,${numero.qr_code_base64}`}
                alt="QR Code"
                className="max-w-[200px] rounded-lg border border-surface-300 bg-surface-100 p-2"
              />
            ) : (
              <div className="flex flex-col items-center justify-center w-[200px] h-[200px] rounded-lg border border-surface-300 bg-surface-100">
                <Loader2 className="w-5 h-5 text-txt-muted animate-spin mb-2" />
                <span className="text-[12px] text-txt-muted">QR Code carregando...</span>
              </div>
            )}
          </div>
          <p className="text-[11px] text-txt-muted text-center">Use o código acima ou escaneie o QR Code</p>
        </div>
      )}

      {/* Connecting state: Estado 2 — pairing code expirado ou inexistente */}
      {status === 'connecting' && pairingExpired && (
        <div className="mb-3 space-y-2.5">
          <div className="flex justify-center">
            {numero.qr_code_base64 && numero.qr_code_base64.length > 0 ? (
              <img
                src={numero.qr_code_base64.startsWith('data:') ? numero.qr_code_base64 : `data:image/png;base64,${numero.qr_code_base64}`}
                alt="QR Code"
                className="max-w-[280px] rounded-lg border border-surface-300 bg-surface-100 p-3"
              />
            ) : (
              <div className="flex flex-col items-center justify-center w-[280px] h-[280px] rounded-lg border border-surface-300 bg-surface-100">
                <Loader2 className="w-6 h-6 text-txt-muted animate-spin mb-2" />
                <span className="text-[12px] text-txt-muted">Aguardando QR Code...</span>
              </div>
            )}
          </div>
          <p className="text-[11px] text-txt-muted text-center leading-relaxed">
            Escaneie com WhatsApp → Dispositivos Vinculados → Vincular Dispositivo
          </p>
          <button
            onClick={handleReconectar}
            disabled={reconectando}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-semibold transition-all duration-200',
              'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
              'hover:bg-emerald-500/15 hover:border-emerald-500/30 hover:shadow-[0_0_20px_rgba(16,185,129,0.08)]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {reconectando ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            {reconectando ? 'Gerando código...' : 'Gerar novo código de pareamento'}
          </button>
        </div>
      )}

      {/* Local pairing code (from reconectar response) */}
      {status === 'disconnected' && localPairingCode && (
        <div className="mb-3">
          <div className="relative px-4 py-3.5 rounded-xl bg-surface-100/80 border border-surface-300/60 text-center">
            <p className="text-[10px] uppercase tracking-widest text-txt-muted font-semibold mb-2">Código de Pareamento</p>
            <p className="text-2xl font-mono font-bold text-txt tracking-[0.15em] select-all">
              {localPairingCode}
            </p>
            <button
              onClick={() => handleCopyCode(localPairingCode)}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium text-txt-muted hover:text-txt bg-surface-200/50 hover:bg-surface-200/80 rounded-lg transition-all"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copiado!' : 'Copiar código'}
            </button>
            <p className="text-[11px] text-txt-muted mt-2">
              Insira este código no WhatsApp do aparelho
            </p>
          </div>
        </div>
      )}

      {/* Disconnect info + reconnect button */}
      {status === 'disconnected' && !localPairingCode && (
        <div className="mb-3 space-y-2">
          {numero.last_disconnect_reason && (
            <div className="flex items-start gap-2 text-[11px] text-txt-muted">
              <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
              <span>{numero.last_disconnect_reason}</span>
            </div>
          )}
          <button
            onClick={handleReconectar}
            disabled={reconectando}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-semibold transition-all duration-200',
              'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
              'hover:bg-emerald-500/15 hover:border-emerald-500/30 hover:shadow-[0_0_20px_rgba(16,185,129,0.08)]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {reconectando ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            {reconectando ? 'Reconectando...' : 'Reconectar'}
          </button>
        </div>
      )}

      {/* Footer: actions only (no reorder, no toggle) */}
      <div className="flex items-center justify-end pt-3 border-t border-surface-300/15">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(numero)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-txt-secondary hover:text-txt bg-surface-200/30 hover:bg-surface-200/50 rounded-lg border border-surface-300/20 transition-all"
          >
            <Pencil className="w-3 h-3" />
            Editar
          </button>
          <button
            onClick={() => onDelete(numero)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg border border-rose-500/10 hover:border-rose-500/20 transition-all"
          >
            <Trash2 className="w-3 h-3" />
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
};
