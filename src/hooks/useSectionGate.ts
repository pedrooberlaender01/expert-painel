import { useAuthStore } from '../stores/authStore';
import { Navigate } from 'react-router-dom';
import React from 'react';

// Chaves de secao correspondendo ao JSONB secoes_habilitadas
export type SectionKey = 'dashboard' | 'conversas' | 'leads' | 'grupos' | 'envios' | 'torneios' | 'mensagens' | 'central_whatsapp';

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
};

// Verifica se uma secao esta habilitada para o expert atual
export function useSectionGate(section: SectionKey): boolean {
  const { user, impersonatedExpert } = useAuthStore();
  const expert = impersonatedExpert || user?.expert;

  // Sem expert = sem gating (admin sem impersonation ve tudo)
  if (!expert) return true;

  // null secoes_habilitadas = todas habilitadas (D-02)
  if (!expert.secoes_habilitadas) return true;

  // Verificacao explicita — default true se chave ausente
  return expert.secoes_habilitadas[section] !== false;
}

// Verifica multiplas secoes de uma vez (para Sidebar)
export function useSectionGates(sections: SectionKey[]): Record<SectionKey, boolean> {
  const { user, impersonatedExpert } = useAuthStore();
  const expert = impersonatedExpert || user?.expert;

  const result = {} as Record<SectionKey, boolean>;

  for (const section of sections) {
    if (!expert || !expert.secoes_habilitadas) {
      result[section] = true;
      continue;
    }
    result[section] = expert.secoes_habilitadas[section] !== false;
  }

  return result;
}

// Componente guard de rota — envolve elementos de rota, redireciona para /dashboard se secao desabilitada
// D-10: redirecionamento silencioso, sem mensagem de erro
interface SectionGuardProps {
  section: SectionKey;
  children: React.ReactNode;
}

export function SectionGuard({ section, children }: SectionGuardProps) {
  const enabled = useSectionGate(section);
  if (!enabled) return React.createElement(Navigate, { to: '/dashboard', replace: true });
  return React.createElement(React.Fragment, null, children);
}
