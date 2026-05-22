import { useAuthStore } from '../stores/authStore';
import { Navigate } from 'react-router-dom';
import React from 'react';
import type { SectionState } from '../types';
import { SectionLockedPage } from '../components/SectionLockedPage';

// Chaves de secao correspondendo ao JSONB secoes_habilitadas
export type SectionKey = 'dashboard' | 'conversas' | 'leads' | 'grupos' | 'envios' | 'torneios' | 'mensagens' | 'central_whatsapp' | 'premiacoes' | 'suporte' | 'grupos_membros' | 'grupos_fechar_abrir' | 'grupos_blacklist' | 'grupos_bots' | 'grupos_moderacao_grupos' | 'grupos_moderacao_log' | 'grupos_moderacao_instancia' | 'torneios_instancia' | 'torneios_copy' | 'mensagens_funil' | 'mensagens_followups' | 'mensagens_abertura' | 'mensagens_boas_vindas' | 'envios_novo_agendamento' | 'envios_agendados' | 'envios_simulador' | 'envios_gerar_copy';

// Mapeia rotas para chaves de secao (inclui sub-rotas)
// /notificacoes e /configuracoes NAO sao mapeadas — sempre acessiveis (D-11)
export const SECTION_PATH_MAP: Record<string, SectionKey> = {
  '/dashboard': 'dashboard',
  '/conversas': 'conversas',
  '/leads': 'leads',
  '/funil': 'leads',
  '/grupos': 'grupos',
  '/envios': 'envios',
  '/envios/simulador': 'envios',
  '/envios/historico': 'envios',
  '/envios/templates': 'envios',
  '/envios/agendamentos': 'envios',
  '/envios/agendados': 'envios',
  '/envios/gerar-copy': 'envios',
  '/torneios': 'torneios',
  '/mensagens': 'mensagens',
  '/central-whatsapp': 'central_whatsapp',
  '/premiacoes': 'premiacoes',
  '/suporte': 'suporte',
};

// Secoes que sao 'hidden' por default quando a chave nao existe no JSONB
// (secoes opt-in — precisam ser explicitamente habilitadas)
const HIDDEN_BY_DEFAULT: Set<SectionKey> = new Set(['premiacoes', 'suporte']);

// Resolve o estado de uma secao a partir do JSONB secoes_habilitadas
// Retrocompatibilidade:
//   null => 'enabled' (sem gating, exceto secoes opt-in)
//   true / 'enabled' => 'enabled'
//   false / 'disabled' => 'disabled'
//   'hidden' => 'hidden'
//   chave ausente => 'enabled' (ou 'hidden' para secoes opt-in)
function resolveState(secoes: Record<string, string | boolean> | null, section: SectionKey): SectionState {
  const defaultState: SectionState = HIDDEN_BY_DEFAULT.has(section) ? 'hidden' : 'enabled';

  if (!secoes) return defaultState;

  const val = secoes[section];

  // Chave ausente => default
  if (val === undefined) return defaultState;

  // Formato novo (string)
  if (val === 'enabled' || val === 'disabled' || val === 'hidden') return val;

  // Formato antigo (boolean): true = enabled, false = disabled
  if (val === true) return 'enabled';
  if (val === false) return 'disabled';

  return defaultState;
}

// Verifica estado de uma secao para o expert atual
export function useSectionGate(section: SectionKey): SectionState {
  const { user, impersonatedExpert } = useAuthStore();
  const expert = impersonatedExpert || user?.expert;

  // Sem expert = sem gating (admin sem impersonation ve tudo)
  if (!expert) return 'enabled';

  return resolveState(expert.secoes_habilitadas, section);
}

// Verifica multiplas secoes de uma vez (para Sidebar)
export function useSectionGates(sections: SectionKey[]): Record<SectionKey, SectionState> {
  const { user, impersonatedExpert } = useAuthStore();
  const expert = impersonatedExpert || user?.expert;

  const result = {} as Record<SectionKey, SectionState>;

  for (const section of sections) {
    if (!expert) {
      result[section] = 'enabled';
      continue;
    }
    result[section] = resolveState(expert.secoes_habilitadas, section);
  }

  return result;
}

// Componente guard de rota
// hidden: redireciona silenciosamente para /dashboard
// disabled (cadeado): mostra tela de secao bloqueada com mensagem
interface SectionGuardProps {
  section: SectionKey;
  children: React.ReactNode;
}

export function SectionGuard({ section, children }: SectionGuardProps) {
  const state = useSectionGate(section);
  if (state === 'hidden') return React.createElement(Navigate, { to: '/dashboard', replace: true });
  if (state === 'disabled') return React.createElement(SectionLockedPage, { section });
  return React.createElement(React.Fragment, null, children);
}
