import React, { useState } from 'react';
import { X, Loader2, Smartphone, Plus } from 'lucide-react';

interface NovaInstanciaModalProps {
  onCriarInstancia: (nome: string, numero: string) => Promise<{
    sucesso: boolean;
    pairing_code?: string;
    mensagem?: string;
    expira_em?: string;
  }>;
  onClose: () => void;
}

export const NovaInstanciaModal: React.FC<NovaInstanciaModalProps> = ({
  onCriarInstancia,
  onClose,
}) => {
  const [nome, setNome] = useState('');
  const [tel, setTel] = useState('');
  const [saving, setSaving] = useState(false);
  const [resultado, setResultado] = useState<{
    sucesso: boolean;
    pairing_code?: string;
    mensagem?: string;
    expira_em?: string;
  } | null>(null);

  const canSave = nome.trim().length > 0 && tel.trim().length > 0;

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const result = await onCriarInstancia(nome.trim(), tel.trim());
      setResultado(result);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative card-dark-elevated w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-surface-300/20">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#004AFF]/10">
              <Smartphone className="w-4 h-4 text-[#004AFF]" />
            </div>
            <h2 className="text-[15px] font-semibold text-txt font-display">
              Nova Instância
            </h2>
          </div>
          <button
            onClick={onClose}
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
                  placeholder="Ex: iPhone 8 - Branco"
                  className="input-dark text-[13px]"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[13px] font-medium text-txt mb-1.5 block">
                  Número WhatsApp (com DDI)
                </label>
                <input
                  type="text"
                  value={tel}
                  onChange={(e) => setTel(e.target.value)}
                  placeholder="5534999999999"
                  className="input-dark text-[13px]"
                />
                <p className="text-[11px] text-txt-dim mt-1.5">
                  Formato: código do país + DDD + número (sem espaços ou traços)
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-5 border-t border-surface-300/20">
              <button
                onClick={onClose}
                className="px-4 py-2 text-[13px] font-medium text-txt-secondary hover:text-txt bg-surface-200/30 hover:bg-surface-200/50 rounded-xl border border-surface-300/20 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!canSave || saving}
                className="btn-primary text-[13px] px-5 py-2 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                Criar Instância
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
                    Instância criada com sucesso!
                  </span>
                </div>

                {resultado.pairing_code && (
                  <div className="relative px-4 py-4 rounded-xl bg-zinc-800/80 border border-zinc-700/60 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold mb-2">
                      Código de Pareamento
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

                <div className="px-3 py-2.5 rounded-lg bg-[#004AFF]/5 border border-[#004AFF]/10">
                  <p className="text-[12px] text-[#004AFF]/80 leading-relaxed">
                    Abra o WhatsApp no aparelho, vá em <strong>Dispositivos Conectados</strong> e
                    selecione <strong>Conectar com número de telefone</strong>. Insira o código acima.
                  </p>
                </div>

                {resultado.mensagem && (
                  <p className="text-[12px] text-txt-muted">{resultado.mensagem}</p>
                )}

                <button
                  onClick={onClose}
                  className="w-full px-4 py-2.5 text-[13px] font-medium text-txt-secondary hover:text-txt bg-surface-200/30 hover:bg-surface-200/50 rounded-xl border border-surface-300/20 transition-all"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="text-[13px] font-semibold text-red-400">Erro ao criar instância</span>
                </div>
                <p className="text-[13px] text-txt-secondary">
                  {resultado.mensagem || 'Erro desconhecido. Tente novamente.'}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setResultado(null)}
                    className="flex-1 px-4 py-2 text-[13px] font-medium text-[#004AFF] bg-[#004AFF]/10 hover:bg-[#004AFF]/15 rounded-xl border border-[#004AFF]/20 transition-all"
                  >
                    Tentar novamente
                  </button>
                  <button
                    onClick={onClose}
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
  );
};
