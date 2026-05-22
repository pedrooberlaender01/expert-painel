// ─────────────────────────────────────────────
// Centralized webhook URL configuration
// AUTH-08 audit: No Minimax API keys in frontend (confirmed). Audio generation is server-side only (per D-10).
// ─────────────────────────────────────────────

export const N8N_GEND = 'https://n8n-gend.srv1431760.hstgr.cloud/webhook';
const N8N_EASYPANEL = 'https://n8n-n8n.04qisd.easypanel.host/webhook';

export const WEBHOOKS = {
  // n8n-gend (primary)
  ENVIO_SAAS: `${N8N_GEND}/envio-saas`,
  BUSCAR_GRUPOS: `${N8N_GEND}/buscar-grupos`,
  BUSCAR_GRUPOS_ABRIR_FECHAR: `${N8N_GEND}/buscar-grupos-abrir/fechar`,
  BUSCAR_GRUPOS_AGENDAMENTO: `${N8N_GEND}/buscar-grupos-agendamento`,
  CANCELAR_AGENDAMENTO: `${N8N_GEND}/cancelar-agendamento`,
  DELETAR_AGENDAMENTO_ENVIADO: `${N8N_GEND}/deletar-agendamento-enviado`,
  BLACKLIST_REMOVER: `${N8N_GEND}/blacklist-remover`,
  RELATORIO_GRUPO: `${N8N_GEND}/relatorio-grupo`,
  RANKING_TORNEIO: `${N8N_GEND}/ranking-torneio`,
  EXCLUIR_INSTANCIA: `${N8N_GEND}/excluir-instancia`,
  RECONECTAR: `${N8N_GEND}/reconectar`,
  CRIAR_INSTANCIA: `${N8N_GEND}/criar-instancia`,
  TORNEIO: `${N8N_GEND}/torneio`,
  SEGURANCA: `${N8N_GEND}/segurança`,
  GERAR_COPY: `${N8N_GEND}/gerar-copy`,
  ADICIONAR_EXEMPLO_COPY: `${N8N_GEND}/adicionar-exemplo-copy`,
  ASSISTENTE_WHATSAPP: `${N8N_GEND}/assistente-whatsapp`,
  BUSCAR_CANAIS_TELEGRAM: `${N8N_GEND}/buscar-canais-telegram`,
  RELATORIO_PREMIACOES: `${N8N_GEND}/relatorio-premiacoes`,

  // Bots de engajamento
  BOT_CONFIGURAR_PERFIL: `${N8N_GEND}/bot-configurar-perfil`,
  BOT_ADICIONAR_AO_GRUPO: `${N8N_GEND}/bot-adicionar-ao-grupo`,
  BOT_BUSCAR_GRUPOS: `${N8N_GEND}/bot-buscar-grupos`,
  BOT_ADICIONAR_CONHECIMENTO: `${N8N_GEND}/bot-adicionar-conhecimento`,
  BOT_CACHE_MENSAGEM: `${N8N_GEND}/bot-cache-mensagem`,
  BOT_CONFIGURAR_WEBHOOK: `${N8N_GEND}/bot-configurar-webhook`,

  // Suporte IA
  SUPORTE_GERAR_EMBEDDING: `${N8N_GEND}/suporte-embedding`,
  SUPORTE_WEBHOOK_URL: `${N8N_GEND}/f15a1dc5-23c2-47c4-9b57-d8a9a938ba69`,

  // n8n-easypanel (secondary)
  TESTE_MENSAGEM: `${N8N_EASYPANEL}/teste-mensagem`,
  DISPARO_MASSA: import.meta.env.VITE_N8N_WEBHOOK_URL || `${N8N_EASYPANEL}/disparo-massa`,
} as const;

/** @deprecated Phase 5 will move UAZAPI calls server-side. Do not use in new code. */
// TODO: Phase 5 — migrate to server-side RPC (WAPP-* requirements)
export const UAZAPI_BASE_URL = 'https://pedrooberlaender.uazapi.com';

// ─────────────────────────────────────────────
// Fetch helper with timeout (30s default)
// ─────────────────────────────────────────────

export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 30000
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}
