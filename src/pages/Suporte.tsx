import React, { useState } from 'react';
import { Headset, Settings, BookOpen, Smartphone } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Toast } from '../components/Toast';
import { ConfiguracaoAgente } from '../components/suporte/ConfiguracaoAgente';
import { BaseConhecimentoSuporte } from '../components/suporte/BaseConhecimentoSuporte';
import { InstanciaSuporte } from '../components/suporte/InstanciaSuporte';
import { useSuporte } from '../hooks/useSuporte';
import { useToast } from '../hooks/useToast';

type SuporteTab = 'configuracao' | 'conhecimento' | 'instancia';

export const Suporte: React.FC = () => {
  const [tab, setTab] = useState<SuporteTab>('configuracao');
  const { toast, showToast, hideToast } = useToast();

  const {
    config,
    loadingConfig,
    saveConfig,
    conhecimentos,
    loadingConhecimento,
    metricas,
    addConhecimento,
    updateConhecimento,
    deleteConhecimento,
    gerarEmbedding,
    uploadDocumento,
    instancias,
    loadingInstancias,
    criarInstancia,
    conectarInstancia,
    excluirInstancia,
    fetchConfig,
    fetchConhecimentos,
    fetchInstancias,
  } = useSuporte();

  const isRefreshing = loadingConfig || loadingConhecimento || loadingInstancias;

  const handleRefresh = () => {
    fetchConfig();
    fetchConhecimentos();
    fetchInstancias();
  };

  const tabs: { key: SuporteTab; label: string; icon: typeof Settings; activeStyle: React.CSSProperties }[] = [
    {
      key: 'configuracao',
      label: 'Configuracao',
      icon: Settings,
      activeStyle: { background: 'rgba(var(--color-primary-rgb),0.1)', border: '1px solid rgba(var(--color-primary-rgb),0.2)', color: 'var(--color-primary-light)' },
    },
    {
      key: 'conhecimento',
      label: 'Base de Conhecimento',
      icon: BookOpen,
      activeStyle: { background: 'rgba(250,204,21,0.1)', border: '1px solid rgba(250,204,21,0.25)', color: '#facc15' },
    },
    {
      key: 'instancia',
      label: 'Instancia',
      icon: Smartphone,
      activeStyle: { background: 'rgba(var(--color-primary-rgb),0.1)', border: '1px solid rgba(var(--color-primary-rgb),0.2)', color: 'var(--color-primary-light)' },
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Suporte"
        subtitle="Configure seu agente de atendimento inteligente via WhatsApp"
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        titleRight={
          <Headset className="w-5 h-5" style={{ color: 'var(--color-primary-light)', opacity: 0.7 }} />
        }
      />

      {/* Tab Selector */}
      <div
        className="flex flex-wrap md:inline-flex gap-1 p-1 rounded-[14px] w-full md:w-fit mb-6"
        style={{ background: 'var(--c-glass)', border: '1px solid var(--c-border)' }}
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-[10px] text-[13px] font-medium transition-all duration-250"
            style={tab === t.key
              ? t.activeStyle
              : { background: 'transparent', border: '1px solid transparent', color: 'var(--c-t-45)' }
            }
            onMouseEnter={(e) => { if (tab !== t.key) { e.currentTarget.style.color = 'rgb(var(--c-fg-rgb) / 0.65)'; e.currentTarget.style.background = 'var(--c-glass)'; } }}
            onMouseLeave={(e) => { if (tab !== t.key) { e.currentTarget.style.color = 'rgb(var(--c-fg-rgb) / 0.45)'; e.currentTarget.style.background = 'transparent'; } }}
          >
            <t.icon className="w-4 h-4" style={{ opacity: tab === t.key ? 1 : 0.45 }} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'configuracao' && (
        <ConfiguracaoAgente
          config={config}
          loading={loadingConfig}
          onSave={saveConfig}
          showToast={showToast}
        />
      )}

      {tab === 'conhecimento' && (
        <BaseConhecimentoSuporte
          conhecimentos={conhecimentos}
          loading={loadingConhecimento}
          metricas={metricas}
          onAdd={addConhecimento}
          onUpdate={updateConhecimento}
          onDelete={deleteConhecimento}
          onGerarEmbedding={gerarEmbedding}
          onUpload={uploadDocumento}
          showToast={showToast}
        />
      )}

      {tab === 'instancia' && (
        <InstanciaSuporte
          instancias={instancias}
          loading={loadingInstancias}
          onCriar={criarInstancia}
          onConectar={conectarInstancia}
          onExcluir={excluirInstancia}
          showToast={showToast}
        />
      )}

      {toast && <Toast toast={toast} onClose={hideToast} />}
    </div>
  );
};
