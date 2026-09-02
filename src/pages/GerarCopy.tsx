import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  Loader2,
  RefreshCw,
  BookOpen,
  Wand2,
  User,
  BrainCircuit,
} from 'lucide-react';
import { EnviosNav } from '../components/envios/EnviosNav';
import { Toast } from '../components/Toast';
import { ExpertPerfilSidebar } from '../components/copy/ExpertPerfilSidebar';
import { TipoCopySelector } from '../components/copy/TipoCopySelector';
import { TamanhoSelector } from '../components/copy/TamanhoSelector';
import { OpcoesExtras } from '../components/copy/OpcoesExtras';
import { CopyResultCard } from '../components/copy/CopyResultCard';
import { BaseConhecimento } from '../components/copy/BaseConhecimento';
import { useGerarCopy } from '../hooks/useGerarCopy';
import { useToast } from '../hooks/useToast';

type SubTab = 'gerador' | 'base';

const GerarCopy: React.FC = () => {
  const { toast, showToast, hideToast } = useToast();
  const {
    perfil,
    loadingPerfil,
    fetchPerfil,
    salvarPerfil,
    copysGeradas,
    loadingCopy,
    gerarCopy,
    exemplos,
    loadingExemplos,
    fetchExemplos,
    adicionarExemplo,
    excluirExemplo,
    salvarNaBiblioteca,
  } = useGerarCopy();

  const [subTab, setSubTab] = useState<SubTab>('gerador');
  const [mobileExpertOpen, setMobileExpertOpen] = useState(false);

  // Generator state
  const [tipoCopy, setTipoCopy] = useState('');
  const [tamanho, setTamanho] = useState<'curta' | 'media' | 'grande'>('media');
  const [descricao, setDescricao] = useState('');
  const [opcoes, setOpcoes] = useState({
    incluir_cta: false,
    usar_urgencia: false,
    mencionar_comunidade: false,
    incluir_link: false,
    link: '',
  });

  const resultRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchPerfil();
  }, [fetchPerfil]);

  // Auto-resize textarea
  const handleDescricaoChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescricao(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  const canGenerate = !!perfil && !!tipoCopy && descricao.trim().length > 0;

  const handleGerar = async () => {
    if (!canGenerate || !perfil) return;
    try {
      await gerarCopy({
        perfil,
        tipo_copy: tipoCopy,
        tamanho,
        descricao: descricao.trim(),
        opcoes,
      });
      // Scroll to results
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch {
      showToast('error', 'Erro ao gerar copy. Tente novamente.');
    }
  };

  const handleSaveToBiblioteca = async (nome: string, conteudo: string) => {
    try {
      await salvarNaBiblioteca(nome, conteudo);
      showToast('success', 'Salvo na biblioteca de mensagens!');
    } catch {
      showToast('error', 'Erro ao salvar na biblioteca');
    }
  };

  const stableFetchExemplos = useCallback((cat?: string) => fetchExemplos(cat), [fetchExemplos]);

  return (
    <div className="h-full flex flex-col overflow-y-auto lg:overflow-hidden">
      <div className="p-4 sm:p-6 lg:p-8 pb-0 sm:pb-0 lg:pb-0">
        <EnviosNav />
      </div>

      <div className="flex flex-col lg:flex-row gap-0 flex-1 min-h-0 mt-6">
        {/* Sidebar — hidden on mobile unless toggled */}
        <div className={mobileExpertOpen ? 'block lg:flex self-stretch' : 'hidden lg:flex self-stretch'}>
          <ExpertPerfilSidebar
            perfil={perfil}
            loading={loadingPerfil}
            onSave={salvarPerfil}
            showToast={showToast}
            onCollapse={() => setMobileExpertOpen(false)}
            forceExpanded={mobileExpertOpen}
          />
        </div>

        {/* Main area */}
        <div className="flex-1 min-w-0 min-h-0 overflow-y-auto">
          {/* Mobile: button to open expert panel */}
          {!mobileExpertOpen && (
            <button
              onClick={() => setMobileExpertOpen(true)}
              className="flex lg:hidden items-center gap-2 mx-4 mt-2 mb-2 px-4 py-2.5 rounded-xl text-[13px] font-medium w-[calc(100%-2rem)] transition-all"
              style={{ background: 'var(--c-glass)', border: '1px solid var(--c-border)', color: 'var(--c-t-50)' }}
            >
              <User className="w-4 h-4" />
              Perfil do Expert
              <span className="ml-auto text-[11px]" style={{ color: 'var(--c-t-25)' }}>Toque para abrir</span>
            </button>
          )}

          {/* Sub-tabs — underline style */}
          <div
            className="flex items-end gap-6 px-6 h-[42px]"
            style={{ borderBottom: '1px solid var(--c-border)', background: 'var(--c-glass-2)' }}
          >
            {([
              { key: 'gerador' as SubTab, label: 'Gerador', icon: Wand2 },
              { key: 'base' as SubTab, label: 'Base de Conhecimento', icon: BookOpen },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSubTab(tab.key)}
                className="relative flex items-center gap-2 pb-3 text-[13px] font-medium transition-all duration-200"
                style={{ color: subTab === tab.key ? 'rgb(var(--c-fg-rgb))' : 'rgb(var(--c-fg-rgb) / 0.4)' }}
                onMouseEnter={(e) => { if (subTab !== tab.key) e.currentTarget.style.color = 'rgb(var(--c-fg-rgb) / 0.6)' }}
                onMouseLeave={(e) => { if (subTab !== tab.key) e.currentTarget.style.color = 'rgb(var(--c-fg-rgb) / 0.4)' }}
              >
                <tab.icon className="w-3.5 h-3.5" style={{ color: subTab === tab.key ? 'var(--color-primary-light)' : 'inherit' }} />
                {tab.label}
                {subTab === tab.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full" style={{ background: 'var(--color-primary-light)' }} />
                )}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* ─── GERADOR ─── */}
            {subTab === 'gerador' && (
              <div className="space-y-8 max-w-3xl mx-auto">
                {/* Tipo de Copy */}
                <section>
                  <div className="flex items-baseline gap-2 mb-3">
                    <h3 className="text-[15px] font-semibold text-txt">Tipo de Copy</h3>
                    <span className="text-[12px]" style={{ color: 'var(--c-t-35)' }}>Selecione a categoria</span>
                  </div>
                  <TipoCopySelector selected={tipoCopy} onChange={setTipoCopy} />
                </section>

                {/* Tamanho */}
                <section>
                  <div className="flex items-baseline gap-2 mb-3">
                    <h3 className="text-[15px] font-semibold text-txt">Tamanho</h3>
                    <span className="text-[12px]" style={{ color: 'var(--c-t-35)' }}>Quantidade de linhas</span>
                  </div>
                  <TamanhoSelector selected={tamanho} onChange={setTamanho} />
                </section>

                {/* Descrição */}
                <section>
                  <h3 className="text-[15px] font-semibold text-txt mb-3">O que voce quer comunicar?</h3>
                  <textarea
                    ref={textareaRef}
                    value={descricao}
                    onChange={handleDescricaoChange}
                    placeholder="Descreva o que voce quer na copy... Ex: Avisar que hoje as 21h tem live especial com multiplicador exclusivo"
                    rows={3}
                    className="w-full text-txt text-[14px] outline-none resize-none transition-all duration-200 leading-relaxed"
                    style={{
                      background: 'var(--c-glass)',
                      border: '1px solid var(--c-border-strong)',
                      borderRadius: '14px',
                      padding: '16px',
                      minHeight: '120px',
                      maxHeight: '160px',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.background = 'var(--c-glass)';
                      e.currentTarget.style.borderColor = 'rgba(var(--color-primary-rgb),0.3)';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(var(--color-primary-rgb),0.08)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.background = 'var(--c-glass)';
                      e.currentTarget.style.borderColor = 'var(--c-border-strong)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </section>

                {/* Opções extras */}
                <section>
                  <h3 className="text-[15px] font-semibold text-txt mb-3">Opcoes extras</h3>
                  <OpcoesExtras opcoes={opcoes} onChange={setOpcoes} />
                </section>

                {/* Botão Gerar */}
                <div className="relative pt-2">
                  <button
                    onClick={handleGerar}
                    disabled={!canGenerate || loadingCopy}
                    className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-[14px] font-semibold transition-all duration-200 relative overflow-hidden disabled:cursor-not-allowed"
                    style={canGenerate && !loadingCopy
                      ? {
                          background: 'var(--color-primary)',
                          border: '1px solid rgba(96,165,250,0.3)',
                          color: '#ffffff',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.2), 0 4px 16px rgba(var(--color-primary-rgb),0.25)',
                        }
                      : {
                          background: 'var(--c-glass)',
                          border: '1px solid var(--c-border)',
                          color: 'var(--c-t-25)',
                        }
                    }
                    onMouseEnter={(e) => {
                      if (canGenerate && !loadingCopy) {
                        e.currentTarget.style.background = '#4b8ef7';
                        e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.2), 0 6px 20px rgba(var(--color-primary-rgb),0.35)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (canGenerate && !loadingCopy) {
                        e.currentTarget.style.background = 'var(--color-primary)';
                        e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.2), 0 4px 16px rgba(var(--color-primary-rgb),0.25)';
                      }
                    }}
                    title={!perfil ? 'Salve o perfil do expert primeiro' : undefined}
                  >
                    {loadingCopy ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="animate-pulse">Gerando copys...</span>
                      </>
                    ) : (
                      <>
                        Gerar Copy com IA
                      </>
                    )}

                    {/* Shimmer effect while loading */}
                    {loadingCopy && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_1.5s_infinite]" />
                    )}
                  </button>

                  {!perfil && !loadingPerfil && (
                    <p className="text-[11px] text-center mt-2" style={{ color: 'rgba(250,204,60,0.7)' }}>
                      Salve o perfil do expert na sidebar para habilitar
                    </p>
                  )}
                </div>

                {/* Resultados */}
                {copysGeradas.length > 0 && (
                  <div ref={resultRef} className="space-y-3 pt-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, rgba(var(--color-primary-rgb),0.2), transparent)' }} />
                      <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(var(--color-primary-rgb),0.6)' }}>Resultados</span>
                      <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, rgba(var(--color-primary-rgb),0.2), transparent)' }} />
                    </div>

                    {copysGeradas.map((copy, i) => (
                      <div
                        key={i}
                        className="animate-[slideUp_300ms_ease-out_both]"
                        style={{ animationDelay: `${i * 100}ms` }}
                      >
                        <CopyResultCard
                          index={i}
                          copy={copy}
                          onSave={handleSaveToBiblioteca}
                          onCopied={() => showToast('success', 'Copiado!')}
                        />
                      </div>
                    ))}

                    {/* Regenerar */}
                    <button
                      onClick={handleGerar}
                      disabled={loadingCopy}
                      className="w-full flex items-center justify-center gap-2 py-2.5 text-[12px] font-medium rounded-xl transition-all duration-200"
                      style={{
                        background: 'var(--c-glass)',
                        border: '1px solid var(--c-border)',
                        color: 'var(--c-t-50)',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-primary-light)'; e.currentTarget.style.borderColor = 'rgba(var(--color-primary-rgb),0.2)'; e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.06)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'rgb(var(--c-fg-rgb) / 0.5)'; e.currentTarget.style.borderColor = 'var(--c-border)'; e.currentTarget.style.background = 'var(--c-glass)' }}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingCopy ? 'animate-spin' : ''}`} />
                      Regenerar
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ─── BASE DE CONHECIMENTO ─── */}
            {subTab === 'base' && (
              <BaseConhecimento
                exemplos={exemplos}
                loading={loadingExemplos}
                onFetch={stableFetchExemplos}
                onAdd={adicionarExemplo}
                onDelete={excluirExemplo}
                showToast={showToast}
              />
            )}
          </div>
        </div>
      </div>

      {toast && <Toast toast={toast} onClose={hideToast} />}
    </div>
  );
};

export default GerarCopy;
