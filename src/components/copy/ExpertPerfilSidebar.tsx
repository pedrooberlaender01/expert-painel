import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  User,
  Loader2,
  Save,
} from 'lucide-react';
import { TagInput } from './TagInput';
import { cn } from '../../utils/cn';
import type { ExpertPerfil } from '../../hooks/useGerarCopy';

const TOM_OPTIONS: { key: ExpertPerfil['tom_voz']; label: string }[] = [
  { key: 'muito_informal', label: 'Informal' },
  { key: 'jovem', label: 'Jovem' },
  { key: 'neutro', label: 'Neutro' },
  { key: 'profissional', label: 'Profissional' },
  { key: 'formal', label: 'Formal' },
];

interface ExpertPerfilSidebarProps {
  perfil: ExpertPerfil | null;
  loading: boolean;
  onSave: (dados: Partial<ExpertPerfil>) => Promise<void>;
  showToast: (type: 'success' | 'error', msg: string) => void;
  onCollapse?: () => void;
  forceExpanded?: boolean;
}

export const ExpertPerfilSidebar: React.FC<ExpertPerfilSidebarProps> = ({
  perfil,
  loading,
  onSave,
  showToast,
  onCollapse,
  forceExpanded,
}) => {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('expert-sidebar-collapsed') === 'true'; } catch { return false; }
  });
  const [saving, setSaving] = useState(false);

  // Form state
  const [nomeExpert, setNomeExpert] = useState('');
  const [nicho, setNicho] = useState('');
  const [tomVoz, setTomVoz] = useState<ExpertPerfil['tom_voz']>('neutro');
  const [palavrasFrequentes, setPalavrasFrequentes] = useState<string[]>([]);
  const [palavrasProibidas, setPalavrasProibidas] = useState<string[]>([]);
  const [emojisFrequentes, setEmojisFrequentes] = useState<string[]>([]);
  const [contextoExtra, setContextoExtra] = useState('');
  const [exemplosCopys, setExemplosCopys] = useState('');

  useEffect(() => {
    if (perfil) {
      setNomeExpert(perfil.nome_expert || '');
      setNicho(perfil.nicho || '');
      setTomVoz(perfil.tom_voz || 'neutro');
      setPalavrasFrequentes(perfil.palavras_frequentes || []);
      setPalavrasProibidas(perfil.palavras_proibidas || []);
      setEmojisFrequentes(perfil.emojis_frequentes || []);
      setContextoExtra(perfil.contexto_extra || '');
      setExemplosCopys(perfil.exemplos_copys || '');
    }
  }, [perfil]);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem('expert-sidebar-collapsed', String(next)); } catch { /* noop */ }
    if (next && onCollapse) onCollapse();
  };

  const handleSave = async () => {
    if (!nomeExpert.trim()) {
      showToast('error', 'Nome do expert e obrigatorio');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        nome_expert: nomeExpert.trim(),
        nicho: nicho.trim() || null,
        tom_voz: tomVoz,
        palavras_frequentes: palavrasFrequentes,
        palavras_proibidas: palavrasProibidas,
        emojis_frequentes: emojisFrequentes,
        contexto_extra: contextoExtra.trim() || null,
        exemplos_copys: exemplosCopys.trim() || null,
      });
      showToast('success', 'Perfil salvo com sucesso!');
    } catch {
      showToast('error', 'Erro ao salvar perfil');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    padding: '10px 14px',
    color: '#fff',
    fontSize: '13px',
    width: '100%',
    outline: 'none',
    transition: 'all 0.2s ease',
  };

  const focusInput = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)';
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.08)';
    e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
  };
  const blurInput = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
    e.currentTarget.style.boxShadow = 'none';
    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
  };

  // Collapsed state — hidden on mobile, thin bar on desktop (skip if forceExpanded)
  if (collapsed && !forceExpanded) {
    return (
      <div
        className="hidden lg:flex flex-col items-center py-4 px-2 w-[52px] shrink-0 h-full"
        style={{ background: '#0c0c14', borderRight: '1px solid rgba(255,255,255,0.04)' }}
      >
        <button
          onClick={toggleCollapse}
          className="p-2 rounded-lg transition-all mb-4"
          style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="w-8 h-8 rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(59,130,246,0.12)' }}>
          <span className="text-[11px] font-bold" style={{ color: '#60a5fa' }}>
            {(nomeExpert || 'E').charAt(0).toUpperCase()}
          </span>
        </div>
        <p className="text-[9px] text-center leading-tight" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', color: 'rgba(255,255,255,0.3)' }}>
          {nomeExpert || 'Expert'}
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col w-full lg:w-[480px] shrink-0 overflow-hidden h-full"
      style={{ background: '#0c0c14', borderRight: '1px solid rgba(255,255,255,0.04)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 h-[42px]"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      >
        <h3 className="text-[16px] font-bold text-white font-display tracking-tight">Perfil do Expert</h3>
        <div className="flex items-center gap-2">
          {/* Mobile: close button (calls onCollapse to hide panel) */}
          <button
            onClick={() => { if (onCollapse) onCollapse(); }}
            className="p-1.5 rounded-lg transition-all flex lg:hidden"
            style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)' }}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          {/* Desktop: collapse button */}
          <button
            onClick={toggleCollapse}
            className="p-1.5 rounded-lg transition-all hidden lg:flex"
            style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Form — scrollable */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.04) transparent' }}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(59,130,246,0.2)', borderTopColor: '#3b82f6' }} />
          </div>
        ) : (
          <>
            {/* Nome */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.8px] mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Nome</label>
              <input
                value={nomeExpert}
                onChange={(e) => setNomeExpert(e.target.value)}
                placeholder="Ex: Allan Cabral"
                style={inputStyle}
                onFocus={focusInput}
                onBlur={blurInput}
              />
            </div>

            {/* Nicho */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.8px] mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Nicho</label>
              <input
                value={nicho}
                onChange={(e) => setNicho(e.target.value)}
                placeholder="Ex: Cassino, Apostas esportivas"
                style={inputStyle}
                onFocus={focusInput}
                onBlur={blurInput}
              />
            </div>

            {/* Tom de voz */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.8px] mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Tom de voz</label>
              <div className="flex gap-1 flex-wrap">
                {TOM_OPTIONS.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTomVoz(key)}
                    className="px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-200"
                    style={tomVoz === key
                      ? { background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa' }
                      : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.45)' }
                    }
                    onMouseEnter={(e) => { if (tomVoz !== key) { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' } }}
                    onMouseLeave={(e) => { if (tomVoz !== key) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)' } }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Palavras frequentes */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.8px] mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Palavras frequentes</label>
              <TagInput
                tags={palavrasFrequentes}
                onChange={setPalavrasFrequentes}
                placeholder="Digite e pressione Enter"
                variant="accent"
              />
            </div>

            {/* Palavras proibidas */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.8px] mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Palavras proibidas</label>
              <TagInput
                tags={palavrasProibidas}
                onChange={setPalavrasProibidas}
                placeholder="Palavras que nao pode usar"
                variant="danger"
              />
            </div>

            {/* Emojis frequentes */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.8px] mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Emojis frequentes</label>
              <TagInput
                tags={emojisFrequentes}
                onChange={setEmojisFrequentes}
                placeholder="Cole um emoji"
                variant="emoji"
              />
            </div>

            {/* Contexto extra */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.8px] mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Contexto extra</label>
              <textarea
                value={contextoExtra}
                onChange={(e) => setContextoExtra(e.target.value)}
                placeholder="Ex: Sempre menciona a live das 21h, fala em terceira pessoa..."
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' as const, minHeight: '80px' }}
                onFocus={focusInput}
                onBlur={blurInput}
              />
            </div>

            {/* Exemplos de copys */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.8px] mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Exemplos de copys</label>
              <textarea
                value={exemplosCopys}
                onChange={(e) => setExemplosCopys(e.target.value)}
                placeholder="Cole aqui 3-5 copys reais que o expert ja usou..."
                rows={5}
                style={{ ...inputStyle, resize: 'vertical' as const, minHeight: '100px' }}
                onFocus={focusInput}
                onBlur={blurInput}
              />
            </div>
          </>
        )}
      </div>

      {/* Save button — sticky */}
      <div className="px-5 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: saving || loading ? 'rgba(255,255,255,0.04)' : 'var(--color-primary-bg)',
            border: saving || loading ? '1px solid rgba(255,255,255,0.04)' : '1px solid var(--color-primary-bg)',
            color: saving || loading ? 'rgba(255,255,255,0.35)' : 'var(--color-primary-light)',
          }}
          onMouseEnter={(e) => { if (!saving && !loading) { e.currentTarget.style.background = 'var(--color-primary-bg)'; e.currentTarget.style.boxShadow = '0 0 20px var(--color-primary-bg)' } }}
          onMouseLeave={(e) => { e.currentTarget.style.background = saving || loading ? 'rgba(255,255,255,0.04)' : 'var(--color-primary-bg)'; e.currentTarget.style.boxShadow = 'none' }}
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {saving ? 'Salvando...' : 'Salvar Perfil'}
        </button>
      </div>
    </div>
  );
};
