import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { WEBHOOKS, fetchWithTimeout } from '../config/webhooks';

// ─── Types ───

export interface BotGrupoConfig {
  id: string;
  grupo_id: string;
  grupo_nome: string;
  ativo: boolean;
  silencio_minutos: number;
  silencio_frases: string[];
  delay_entre_bots_min: number;
  delay_entre_bots_max: number;
  triggers_ativos: {
    hype: boolean;
    social_proof: boolean;
    engajamento: boolean;
    defesa: boolean;
    pergunta_plantada: boolean;
  };
  contexto_grupo: string | null;
  chance_responder: number;
  cooldown_reativo_segundos: number;
  ultima_msg_bot_em: string | null;
  created_at: string;
  updated_at: string;
  expert_id: string;
  // Campo calculado via contagem
  bots_count: number;
}

export interface BotGrupoPersona {
  id: string;
  bot_grupo_config_id: string;
  bot_persona_id: string;
  instancia_id: number;
  status: 'pendente' | 'warmup' | 'ativo' | 'ausente' | 'pausado';
  warmup_inicio: string | null;
  ausencia_inicio: string | null;
  ausencia_fim: string | null;
  msgs_enviadas_hoje: number;
  ultima_msg_em: string | null;
  ativo: boolean;
  created_at: string;
  expert_id: string;
  // JOINs
  persona_nome: string;
  persona_foto_url: string | null;
  persona_msgs_por_dia_max: number;
  instancia_nome: string;
  instancia_numero: string;
}

export interface Instancia {
  id: number;
  nome: string;
  instancia: string;
  token: string;
  numero: string;
  status_conexao: string;
}

export interface GrupoWhatsApp {
  jid: string;
  nome: string;
}

export type BotGrupoFormData = {
  grupo_id: string;
  grupo_nome: string;
  ativo?: boolean;
  silencio_minutos?: number;
  silencio_frases?: string[];
  delay_entre_bots_min?: number;
  delay_entre_bots_max?: number;
  triggers_ativos?: BotGrupoConfig['triggers_ativos'];
  contexto_grupo?: string | null;
  chance_responder?: number;
  cooldown_reativo_segundos?: number;
};

// ─── Hook ───

export function useBotGrupos() {
  const [grupos, setGrupos] = useState<BotGrupoConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Listar grupos configurados ──
  const fetchGrupos = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const expertId = useAuthStore.getState().getActiveExpertId();
      let query = supabase
        .from('bot_grupo_config')
        .select('*')
        .order('created_at', { ascending: false });
      if (expertId) query = query.eq('expert_id', expertId);

      const { data, error: fetchError } = await query;
      if (fetchError) throw new Error(fetchError.message);

      const gruposRaw = (data ?? []) as unknown as BotGrupoConfig[];

      // Buscar contagem de bots por grupo
      if (gruposRaw.length > 0) {
        const ids = gruposRaw.map((g) => g.id);
        const { data: countData } = await supabase
          .from('bot_grupo_personas')
          .select('bot_grupo_config_id');

        const countMap: Record<string, number> = {};
        ((countData ?? []) as { bot_grupo_config_id: string }[]).forEach((row) => {
          if (ids.includes(row.bot_grupo_config_id)) {
            countMap[row.bot_grupo_config_id] = (countMap[row.bot_grupo_config_id] || 0) + 1;
          }
        });

        gruposRaw.forEach((g) => {
          g.bots_count = countMap[g.id] || 0;
        });
      }

      setGrupos(gruposRaw);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar grupos';
      console.error('Erro ao carregar grupos:', err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGrupos();
  }, [fetchGrupos]);

  // ── Criar grupo ──
  const criarGrupo = useCallback(async (data: BotGrupoFormData): Promise<BotGrupoConfig | null> => {
    try {
      const expertId = useAuthStore.getState().getActiveExpertId();
      if (!expertId) throw new Error('Expert não identificado');

      const payload = {
        grupo_id: data.grupo_id,
        grupo_nome: data.grupo_nome,
        expert_id: expertId,
        ativo: true,
      };

      const { data: created, error } = await supabase
        .from('bot_grupo_config')
        .insert(payload)
        .select()
        .single();

      if (error) throw new Error(error.message);

      const result = { ...(created as unknown as BotGrupoConfig), bots_count: 0 };
      setGrupos((prev) => [result, ...prev]);
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar grupo';
      throw new Error(msg);
    }
  }, []);

  // ── Editar grupo ──
  const editarGrupo = useCallback(async (id: string, data: Partial<BotGrupoFormData>): Promise<void> => {
    try {
      const { data: rows, error } = await supabase
        .from('bot_grupo_config')
        .update(data)
        .eq('id', id)
        .select();

      if (error) throw new Error(error.message);
      if (!rows || rows.length === 0) throw new Error('Nenhuma linha atualizada — verifique permissões');

      setGrupos((prev) =>
        prev.map((g) => g.id === id ? { ...g, ...data, updated_at: new Date().toISOString() } : g)
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar grupo';
      throw new Error(msg);
    }
  }, []);

  // ── Deletar grupo ──
  const deletarGrupo = useCallback(async (id: string): Promise<void> => {
    try {
      // Primeiro remove bot_grupo_personas vinculadas
      await supabase.from('bot_grupo_personas').delete().eq('bot_grupo_config_id', id);

      const { error } = await supabase
        .from('bot_grupo_config')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);

      setGrupos((prev) => prev.filter((g) => g.id !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir grupo';
      throw new Error(msg);
    }
  }, []);

  // ── Listar personas do grupo ──
  const listarPersonasDoGrupo = useCallback(async (botGrupoConfigId: string): Promise<BotGrupoPersona[]> => {
    try {
      const { data, error } = await supabase
        .from('bot_grupo_personas')
        .select(`
          id,
          bot_grupo_config_id,
          bot_persona_id,
          instancia_id,
          status,
          warmup_inicio,
          ausencia_inicio,
          ausencia_fim,
          msgs_enviadas_hoje,
          ultima_msg_em,
          ativo,
          created_at,
          expert_id,
          bot_personas (nome, foto_url, msgs_por_dia_max),
          whatsapp_rotacao (nome, numero)
        `)
        .eq('bot_grupo_config_id', botGrupoConfigId);

      if (error) throw new Error(error.message);

      return ((data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => {
        const persona = row.bot_personas as Record<string, unknown> | null;
        const instancia = row.whatsapp_rotacao as Record<string, unknown> | null;
        return {
          id: row.id as string,
          bot_grupo_config_id: row.bot_grupo_config_id as string,
          bot_persona_id: row.bot_persona_id as string,
          instancia_id: row.instancia_id as number,
          status: row.status as BotGrupoPersona['status'],
          warmup_inicio: row.warmup_inicio as string | null,
          ausencia_inicio: row.ausencia_inicio as string | null,
          ausencia_fim: row.ausencia_fim as string | null,
          msgs_enviadas_hoje: row.msgs_enviadas_hoje as number,
          ultima_msg_em: row.ultima_msg_em as string | null,
          ativo: row.ativo as boolean,
          created_at: row.created_at as string,
          expert_id: row.expert_id as string,
          persona_nome: (persona?.nome as string) || '—',
          persona_foto_url: (persona?.foto_url as string) || null,
          persona_msgs_por_dia_max: (persona?.msgs_por_dia_max as number) || 10,
          instancia_nome: (instancia?.nome as string) || '—',
          instancia_numero: (instancia?.numero as string) || '—',
        };
      });
    } catch (err: unknown) {
      console.error('Erro ao listar personas do grupo:', err);
      return [];
    }
  }, []);

  // ── Configurar webhook da instância bot (1 vez por instância) ──
  const configurarWebhookInstanciaBot = useCallback(async (instanciaId: number) => {
    try {
      // Verificar se já existe outro bot_grupo_personas com essa instância
      const expertId = useAuthStore.getState().getActiveExpertId();
      const { count } = await supabase
        .from('bot_grupo_personas')
        .select('*', { count: 'exact', head: true })
        .eq('instancia_id', instanciaId)
        .eq('expert_id', expertId || '');

      // Se count > 1, essa instância já foi usada antes — webhook já configurado
      if ((count ?? 0) > 1) return;

      // Buscar token da instância
      const { data: instancia } = await supabase
        .from('whatsapp_rotacao')
        .select('token')
        .eq('id', instanciaId)
        .single();

      if (!instancia?.token) return;

      // Configurar webhook via n8n (evita CORS com UAZAPI)
      const webhookUrl = WEBHOOKS.BOT_CACHE_MENSAGEM;
      await fetchWithTimeout(WEBHOOKS.BOT_CONFIGURAR_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: instancia.token, webhook_url: webhookUrl }),
      });
    } catch (err: unknown) {
      console.error('Erro ao configurar webhook do bot:', err);
      // Não bloqueia — webhook pode ser configurado manualmente depois
    }
  }, []);

  // ── Adicionar persona ao grupo ──
  const adicionarPersonaAoGrupo = useCallback(async (data: {
    bot_grupo_config_id: string;
    bot_persona_id: string;
    instancia_id: number;
  }): Promise<void> => {
    try {
      const expertId = useAuthStore.getState().getActiveExpertId();
      if (!expertId) throw new Error('Expert não identificado');

      const { error } = await supabase
        .from('bot_grupo_personas')
        .insert({
          ...data,
          expert_id: expertId,
          status: 'pendente',
          msgs_enviadas_hoje: 0,
          ativo: true,
        });

      if (error) throw new Error(error.message);

      // Atualiza contagem
      setGrupos((prev) =>
        prev.map((g) => g.id === data.bot_grupo_config_id ? { ...g, bots_count: g.bots_count + 1 } : g)
      );

      // Fire-and-forget: configurar webhook da instância (1 vez)
      configurarWebhookInstanciaBot(data.instancia_id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao adicionar bot';
      throw new Error(msg);
    }
  }, [configurarWebhookInstanciaBot]);

  // ── Remover persona do grupo ──
  const removerPersonaDoGrupo = useCallback(async (id: string, botGrupoConfigId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('bot_grupo_personas')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);

      setGrupos((prev) =>
        prev.map((g) => g.id === botGrupoConfigId ? { ...g, bots_count: Math.max(0, g.bots_count - 1) } : g)
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao remover bot';
      throw new Error(msg);
    }
  }, []);

  // ── Atualizar status de um bot (pausar/ativar) ──
  const atualizarStatusBot = useCallback(async (id: string, status: BotGrupoPersona['status']): Promise<void> => {
    try {
      const { error } = await supabase
        .from('bot_grupo_personas')
        .update({ status })
        .eq('id', id);

      if (error) throw new Error(error.message);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar status';
      throw new Error(msg);
    }
  }, []);

  // ── Listar instâncias do expert ──
  const listarInstancias = useCallback(async (): Promise<Instancia[]> => {
    try {
      const expertId = useAuthStore.getState().getActiveExpertId();
      let query = supabase
        .from('whatsapp_rotacao')
        .select('id, nome, instancia, token, numero, status_conexao')
        .eq('ativo', true)
        .eq('tipo', 'bot');
      if (expertId) query = query.eq('expert_id', expertId);

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Instancia[];
    } catch (err: unknown) {
      console.error('Erro ao listar instâncias:', err);
      return [];
    }
  }, []);

  // ── Listar personas disponíveis (não vinculadas a este grupo) ──
  const listarPersonasDisponiveis = useCallback(async (botGrupoConfigId: string): Promise<Array<{ id: string; nome: string; foto_url: string | null }>> => {
    try {
      const expertId = useAuthStore.getState().getActiveExpertId();

      // Buscar IDs já vinculados
      const { data: vinculados } = await supabase
        .from('bot_grupo_personas')
        .select('bot_persona_id')
        .eq('bot_grupo_config_id', botGrupoConfigId);

      const idsVinculados = ((vinculados ?? []) as { bot_persona_id: string }[]).map((v) => v.bot_persona_id);

      // Buscar todas as personas do expert
      let query = supabase
        .from('bot_personas')
        .select('id, nome, foto_url')
        .eq('ativo', true)
        .order('nome');
      if (expertId) query = query.eq('expert_id', expertId);

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      const todas = (data ?? []) as unknown as Array<{ id: string; nome: string; foto_url: string | null }>;
      return todas.filter((p) => !idsVinculados.includes(p.id));
    } catch (err: unknown) {
      console.error('Erro ao listar personas disponíveis:', err);
      return [];
    }
  }, []);

  // ── Buscar grupos WhatsApp via webhook bot ──
  const buscarGruposWhatsApp = useCallback(async (instancia: string, token: string): Promise<GrupoWhatsApp[]> => {
    try {
      const response = await fetchWithTimeout(WEBHOOKS.BOT_BUSCAR_GRUPOS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instancia, token }),
      }, 60000);

      const result = await response.json();
      const grupos = result.grupos || result || [];

      return (grupos as Array<{ grupo_id: string; grupo_nome: string }>).map((g) => ({
        jid: g.grupo_id,
        nome: g.grupo_nome,
      }));
    } catch (err: unknown) {
      console.error('Erro ao buscar grupos WhatsApp:', err);
      return [];
    }
  }, []);

  // ── Adicionar bot ao grupo WhatsApp via webhook ──
  const adicionarBotAoGrupoWpp = useCallback(async (grupo_id: string, numero_bot: string, token_admin: string): Promise<void> => {
    try {
      await fetchWithTimeout(WEBHOOKS.BOT_ADICIONAR_AO_GRUPO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grupo_id, numero_bot, token_admin }),
      });
    } catch (err: unknown) {
      console.error('Erro ao adicionar bot ao grupo WhatsApp:', err);
      // Não bloqueia — bot pode ser adicionado manualmente
    }
  }, []);

  return {
    grupos,
    loading,
    error,
    fetchGrupos,
    criarGrupo,
    editarGrupo,
    deletarGrupo,
    listarPersonasDoGrupo,
    adicionarPersonaAoGrupo,
    removerPersonaDoGrupo,
    atualizarStatusBot,
    listarInstancias,
    listarPersonasDisponiveis,
    buscarGruposWhatsApp,
    adicionarBotAoGrupoWpp,
    refresh: () => fetchGrupos(true),
  };
}
