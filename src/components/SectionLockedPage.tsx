import React from 'react';
import {
  Lock,
  LayoutDashboard,
  MessagesSquare,
  Bot,
  UsersRound,
  Send,
  Trophy,
  MessageSquare,
  Phone,
  Gift,
  Headset,
  ArrowUpRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { SectionKey } from '../hooks/useSectionGate';

// Mapeamento de secoes com icone, titulo e descricao
const SECTION_INFO: Record<string, {
  icon: LucideIcon;
  titulo: string;
  descricao: string;
  recursos: string[];
}> = {
  dashboard: {
    icon: LayoutDashboard,
    titulo: 'Dashboard',
    descricao: 'Painel completo com metricas em tempo real do seu funil de vendas.',
    recursos: [
      'Metricas de leads captados e convertidos',
      'Graficos de desempenho por periodo',
      'Taxa de conversao do funil',
      'Resumo de disparos e follow-ups',
    ],
  },
  conversas: {
    icon: MessagesSquare,
    titulo: 'Conversas',
    descricao: 'Central de conversas com seus leads via WhatsApp em tempo real.',
    recursos: [
      'Historico completo de mensagens',
      'Conversas organizadas por lead',
      'Visualizacao de audios e midias',
      'Filtros por status e periodo',
    ],
  },
  leads: {
    icon: Bot,
    titulo: 'Leads Assistente',
    descricao: 'Gestao inteligente dos leads captados pelo assistente de IA.',
    recursos: [
      'Lista completa de leads com status',
      'Funil visual de conversao',
      'Detalhes e historico de cada lead',
      'Filtros avancados e busca',
    ],
  },
  grupos: {
    icon: UsersRound,
    titulo: 'Grupos',
    descricao: 'Gerenciamento completo dos seus grupos WhatsApp.',
    recursos: [
      'Moderacao automatica com IA',
      'Controle de membros e strikes',
      'Fechar e abrir grupos por horario',
      'Blacklist e bots de engajamento',
    ],
  },
  envios: {
    icon: Send,
    titulo: 'Envios',
    descricao: 'Central de disparos em massa e agendamento de mensagens.',
    recursos: [
      'Envio em massa para leads',
      'Agendamento de mensagens',
      'Templates personalizados',
      'Geracao de copy com IA',
      'Canais: WhatsApp e Telegram',
    ],
  },
  torneios: {
    icon: Trophy,
    titulo: 'Torneios',
    descricao: 'Sistema de torneios de apostas com ranking automatico.',
    recursos: [
      'Criacao e gestao de torneios',
      'Ranking automatico por greens',
      'Premiacoes por posicao',
      'Processamento de resultados via OCR',
    ],
  },
  mensagens: {
    icon: MessageSquare,
    titulo: 'Mensagens',
    descricao: 'Configuracao do funil conversacional e mensagens automaticas.',
    recursos: [
      'Etapas do funil de conversao',
      'Follow-ups automaticos',
      'Mensagens de boas-vindas',
      'Mensagens de abertura de grupo',
    ],
  },
  central_whatsapp: {
    icon: Phone,
    titulo: 'Central WhatsApp',
    descricao: 'Gestao das suas instancias e numeros de WhatsApp.',
    recursos: [
      'Instancias de disparo e coleta',
      'Status de conexao em tempo real',
      'Rotacao automatica de numeros',
      'QR Code para conexao',
    ],
  },
  premiacoes: {
    icon: Gift,
    titulo: 'Premiacoes',
    descricao: 'Sistema de premiacoes e recompensas para seus membros.',
    recursos: [
      'Configuracao de premios',
      'Gestao de recompensas',
      'Historico de premiacoes',
      'Integracao com torneios',
    ],
  },
  suporte: {
    icon: Headset,
    titulo: 'Suporte',
    descricao: 'Agente de atendimento inteligente via WhatsApp com base de conhecimento.',
    recursos: [
      'Agente IA com respostas automaticas',
      'Base de conhecimento com perguntas e respostas',
      'Upload de documentos para RAG',
      'Configuracao de temperatura e similaridade',
      'Instancia WhatsApp dedicada',
    ],
  },
};

interface SectionLockedPageProps {
  section: SectionKey;
}

export const SectionLockedPage: React.FC<SectionLockedPageProps> = ({ section }) => {
  const info = SECTION_INFO[section];

  // Fallback para secoes nao mapeadas
  if (!info) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <Lock className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-txt-dim text-sm">Secao indisponivel no seu plano atual.</p>
        </div>
      </div>
    );
  }

  const IconComponent = info.icon;

  return (
    <div className="flex-1 flex items-center justify-center p-6 md:p-8 relative overflow-hidden">
      {/* Particulas decorativas no fundo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[15%] left-[10%] w-[300px] h-[300px] rounded-full opacity-[0.03]"
          style={{ background: 'var(--color-primary)', filter: 'blur(120px)' }}
        />
        <div
          className="absolute bottom-[20%] right-[15%] w-[250px] h-[250px] rounded-full opacity-[0.025]"
          style={{ background: 'var(--color-primary)', filter: 'blur(100px)' }}
        />
      </div>

      {/* Card principal */}
      <div className="relative w-full max-w-[520px]">

        {/* Container do conteudo */}
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: 'var(--c-glass-2)',
            border: '1px solid var(--c-border)',
          }}
        >
          {/* Header com icone e cadeado */}
          <div
            className="relative px-8 pt-10 pb-8 text-center"
            style={{
              background: 'linear-gradient(180deg, rgba(var(--color-primary-rgb), 0.06) 0%, transparent 100%)',
            }}
          >
            {/* Icone da secao com cadeado */}
            <div className="relative inline-flex mb-6">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'rgba(var(--color-primary-rgb), 0.08)',
                  border: '1px solid rgba(var(--color-primary-rgb), 0.15)',
                }}
              >
                <IconComponent
                  className="w-9 h-9"
                  style={{ color: 'var(--color-primary)', opacity: 0.5 }}
                />
              </div>
              {/* Badge de cadeado */}
              <div
                className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl flex items-center justify-center shadow-lg"
                style={{
                  background: 'var(--c-popup-bg)',
                  border: '1px solid rgba(250, 204, 60, 0.3)',
                }}
              >
                <Lock className="w-3.5 h-3.5" style={{ color: '#facc3c' }} />
              </div>
            </div>

            {/* Titulo */}
            <h2 className="text-xl font-bold text-txt font-display tracking-tight mb-2">
              {info.titulo}
            </h2>

            {/* Descricao */}
            <p className="text-[13px] leading-relaxed max-w-[380px] mx-auto" style={{ color: 'var(--c-t-45)' }}>
              {info.descricao}
            </p>
          </div>

          {/* Divisor */}
          <div className="mx-8" style={{ borderTop: '1px solid var(--c-border)' }} />

          {/* Lista de recursos */}
          <div className="px-8 py-6">
            <p className="text-[11px] font-medium uppercase tracking-wider mb-4" style={{ color: 'var(--c-t-30)' }}>
              Recursos inclusos
            </p>
            <div className="space-y-3">
              {info.recursos.map((recurso, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: 'var(--color-primary)', opacity: 0.4 }}
                  />
                  <span className="text-[13px]" style={{ color: 'var(--c-t-35)' }}>
                    {recurso}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Divisor */}
          <div className="mx-8" style={{ borderTop: '1px solid var(--c-border)' }} />

          {/* Footer com mensagem */}
          <div className="px-8 py-6">
            <div
              className="flex items-start gap-3 p-4 rounded-xl"
              style={{
                background: 'rgba(250, 204, 60, 0.04)',
                border: '1px solid rgba(250, 204, 60, 0.08)',
              }}
            >
              <Lock className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'rgba(250, 204, 60, 0.6)' }} />
              <div>
                <p className="text-[13px] font-medium" style={{ color: 'rgba(250, 204, 60, 0.8)' }}>
                  Secao indisponivel no seu plano
                </p>
                <p className="text-[12px] mt-1 leading-relaxed" style={{ color: 'var(--c-t-35)' }}>
                  Entre em contato com o administrador para liberar o acesso a esta funcionalidade.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
