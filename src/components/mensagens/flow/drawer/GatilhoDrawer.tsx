import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { FlowDrawer } from './FlowDrawer';
import { Info, X, Loader2, Plus } from 'lucide-react';
import { useMensagensFunil } from '../../../../hooks/useMensagensFunil';
import { supabase } from '../../../../backend/client';
import { useAuthStore } from '../../../../stores/authStore';
import { useToast } from '../../../../hooks/useToast';
import { Toast } from '../../../Toast';

interface GatilhoDrawerProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const GatilhoDrawer: React.FC<GatilhoDrawerProps> = ({ open, onClose, onSaved }) => {
  const { data } = useMensagensFunil();
  const { toast, showToast, hideToast } = useToast();

  // Identificar o registro do gatilho
  const gatilhoRecord = useMemo(
    () => data.find((m) => m.secao === 'lead_chegou' && m.cenario === 'lead_chegou_gatilho'),
    [data]
  );

  const [palavras, setPalavras] = useState<string[]>([]);
  const [original, setOriginal] = useState<string[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sincronizar quando o registro muda ou drawer abre
  useEffect(() => {
    if (open && gatilhoRecord) {
      const p = gatilhoRecord.mensagens || [];
      setPalavras([...p]);
      setOriginal([...p]);
      setInputVal('');
    }
  }, [open, gatilhoRecord]);

  const hasChanges = useMemo(() => {
    if (palavras.length !== original.length) return true;
    return palavras.some((p, i) => p !== original[i]);
  }, [palavras, original]);

  const addPalavras = useCallback((raw: string) => {
    // Aceita virgula como separador
    const novas = raw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .filter((s) => !palavras.some((p) => p.toLowerCase() === s.toLowerCase()));
    if (novas.length > 0) {
      setPalavras((prev) => [...prev, ...novas]);
    }
    setInputVal('');
  }, [palavras]);

  const removePalavra = useCallback((idx: number) => {
    setPalavras((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        if (inputVal.trim()) addPalavras(inputVal);
      }
    },
    [inputVal, addPalavras]
  );

  const handleSave = async () => {
    if (!gatilhoRecord || !hasChanges) return;
    setSaving(true);
    try {
      const expertId = useAuthStore.getState().getActiveExpertId();
      const { error } = await supabase
        .from('mensagens_funil_v2')
        .update({ mensagens: palavras, updated_at: new Date().toISOString() })
        .eq('id', gatilhoRecord.id)
        .eq('expert_id', expertId);
      if (error) throw error;
      setOriginal([...palavras]);
      showToast('success', 'Palavras atualizadas com sucesso');
      onSaved?.();
    } catch (err: any) {
      console.error('[GatilhoDrawer] Erro ao salvar:', err);
      showToast('error', 'Não foi possível salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  // Preview: simula mensagem com a primeira palavra em destaque
  const previewWord = palavras[0] || '';

  return (
    <>
      <FlowDrawer
        open={open}
        onClose={onClose}
        title="Gatilho de Ativação"
        subtitle="Configuração"
        accentColor="#facc3c"
        footer={
          <>
            <button
              onClick={onClose}
              className="px-4 py-2 text-[13px] font-medium rounded-xl transition-colors duration-150"
              style={{ color: 'rgba(255,255,255,0.5)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="flex items-center gap-2 px-5 py-2 text-[13px] font-semibold rounded-xl transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: hasChanges ? 'rgba(250,204,60,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${hasChanges ? 'rgba(250,204,60,0.3)' : 'rgba(255,255,255,0.06)'}`,
                color: hasChanges ? '#facc3c' : 'rgba(255,255,255,0.25)',
              }}
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </>
        }
      >
        <div className="space-y-6">
          {/* Callout informativo */}
          <div
            className="flex gap-3 p-3.5 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }} />
            <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Quando o lead envia uma mensagem contendo uma destas palavras, a assistente é ativada automaticamente. Use palavras relacionadas às origens dos seus links (redes, campanhas, anúncios).
            </p>
          </div>

          {/* Lista de palavras */}
          <div>
            <p className="text-[13px] font-medium mb-3" style={{ color: 'rgba(255,255,255,0.9)' }}>
              Palavras de ativação
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {palavras.length === 0 && (
                <span className="text-[12px] italic" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Nenhuma palavra configurada
                </span>
              )}
              {palavras.map((palavra, idx) => (
                <span
                  key={`${palavra}-${idx}`}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px]"
                  style={{
                    background: 'rgba(250,204,60,0.08)',
                    border: '1px solid rgba(250,204,60,0.25)',
                    color: '#facc3c',
                  }}
                >
                  {palavra}
                  <button
                    onClick={() => removePalavra(idx)}
                    className="transition-colors duration-150"
                    style={{ color: 'rgba(250,204,60,0.5)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(250,204,60,0.5)'; }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            {/* Input para adicionar */}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nova palavra..."
                className="flex-1 px-3 py-1.5 rounded-lg text-[13px] text-white outline-none transition-colors duration-150"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(250,204,60,0.4)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              />
              <button
                onClick={() => { if (inputVal.trim()) addPalavras(inputVal); }}
                disabled={!inputVal.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-lg transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ color: '#facc3c' }}
                onMouseEnter={(e) => { if (inputVal.trim()) e.currentTarget.style.background = 'rgba(250,204,60,0.08)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar
              </button>
            </div>
          </div>

          {/* Preview */}
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Como o lead vê
            </p>
            <div
              className="p-3 rounded-lg text-[12px] leading-relaxed"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {previewWord ? (
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>
                  Oi, vim pelo <strong style={{ color: '#facc3c' }}>{previewWord}</strong>!
                </span>
              ) : (
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Adicione pelo menos uma palavra para ver o preview
                </span>
              )}
            </div>
          </div>
        </div>
      </FlowDrawer>
      {toast && <Toast toast={toast} onClose={hideToast} />}
    </>
  );
};
