import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

// ─── Types ───

export interface BotMetrica {
  persona_id: string;
  persona_nome: string;
  grupo_id: string;
  grupo_nome: string;
  total_mensagens: number;
  total_reacoes: number;
  media_por_dia: number;
}

export interface BotMensagemLog {
  id: string;
  tipo_acao: string;
  tipo_trigger: string;
  conteudo: string;
  created_at: string;
}

export interface BotAlerta {
  id: string;
  grupo_id: string;
  autor_nome: string;
  conteudo: string;
  created_at: string;
}

// ─── Hook ───

export function useBotMetricas() {
  const [metricas, setMetricas] = useState<BotMetrica[]>([]);
  const [alertas, setAlertas] = useState<BotAlerta[]>([]);
  const [totalBots, setTotalBots] = useState(0);
  const [totalGrupos, setTotalGrupos] = useState(0);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<7 | 15 | 30>(7);

  // ── Buscar métricas via RPC ──
  const buscarMetricas = useCallback(async (dias: number) => {
    try {
      const expertId = useAuthStore.getState().getActiveExpertId();
      if (!expertId) return;

      const { data, error } = await supabase.rpc('bot_metricas', {
        p_expert_id: expertId,
        p_dias: dias,
      });

      if (error) {
        console.error('Erro ao buscar métricas dos bots:', error);
        setMetricas([]);
        return;
      }

      setMetricas((data ?? []) as unknown as BotMetrica[]);
    } catch (err: unknown) {
      console.error('Erro ao buscar métricas:', err);
      setMetricas([]);
    }
  }, []);

  // ── Buscar alertas de suspeita ──
  const buscarAlertas = useCallback(async () => {
    try {
      const expertId = useAuthStore.getState().getActiveExpertId();
      if (!expertId) return;

      const { data, error } = await supabase
        .from('bot_grupo_mensagens_cache')
        .select('id, grupo_id, autor_nome, conteudo, created_at')
        .eq('expert_id', expertId)
        .eq('is_bot', false)
        .or('conteudo.ilike.%bot%,conteudo.ilike.%fake%,conteudo.ilike.%robô%,conteudo.ilike.%robo%,conteudo.ilike.%automatizado%')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Erro ao buscar alertas:', error);
        setAlertas([]);
        return;
      }

      setAlertas((data ?? []) as unknown as BotAlerta[]);
    } catch (err: unknown) {
      console.error('Erro ao buscar alertas:', err);
      setAlertas([]);
    }
  }, []);

  // ── Contar bots ativos ──
  const contarBots = useCallback(async () => {
    try {
      const expertId = useAuthStore.getState().getActiveExpertId();
      if (!expertId) return;

      const { count, error } = await supabase
        .from('bot_grupo_personas')
        .select('*', { count: 'exact', head: true })
        .eq('expert_id', expertId)
        .eq('status', 'ativo');

      if (error) {
        console.error('Erro ao contar bots:', error);
        return;
      }

      setTotalBots(count ?? 0);
    } catch (err: unknown) {
      console.error('Erro ao contar bots:', err);
    }
  }, []);

  // ── Contar grupos com bots ──
  const contarGrupos = useCallback(async () => {
    try {
      const expertId = useAuthStore.getState().getActiveExpertId();
      if (!expertId) return;

      const { data, error } = await supabase
        .from('bot_grupo_personas')
        .select('bot_grupo_config_id')
        .eq('expert_id', expertId)
        .eq('ativo', true);

      if (error) {
        console.error('Erro ao contar grupos:', error);
        return;
      }

      const uniqueGroups = new Set((data ?? []).map((r: { bot_grupo_config_id: string }) => r.bot_grupo_config_id));
      setTotalGrupos(uniqueGroups.size);
    } catch (err: unknown) {
      console.error('Erro ao contar grupos:', err);
    }
  }, []);

  // ── Buscar mensagens de uma persona num grupo ──
  const buscarMensagensPersona = useCallback(async (personaId: string, grupoId: string, dias: number): Promise<BotMensagemLog[]> => {
    try {
      const expertId = useAuthStore.getState().getActiveExpertId();
      if (!expertId) return [];

      const desde = new Date();
      desde.setDate(desde.getDate() - dias);

      const { data, error } = await supabase
        .from('bot_mensagens_log')
        .select('id, tipo_acao, tipo_trigger, conteudo, created_at')
        .eq('bot_persona_id', personaId)
        .eq('grupo_id', grupoId)
        .eq('expert_id', expertId)
        .gte('created_at', desde.toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Erro ao buscar mensagens da persona:', error);
        return [];
      }

      return (data ?? []) as unknown as BotMensagemLog[];
    } catch (err: unknown) {
      console.error('Erro ao buscar mensagens:', err);
      return [];
    }
  }, []);

  // ── Carregar tudo ──
  const carregarTudo = useCallback(async (dias: number) => {
    setLoading(true);
    await Promise.all([
      buscarMetricas(dias),
      buscarAlertas(),
      contarBots(),
      contarGrupos(),
    ]);
    setLoading(false);
  }, [buscarMetricas, buscarAlertas, contarBots, contarGrupos]);

  // ── Trocar período ──
  const trocarPeriodo = useCallback(async (dias: 7 | 15 | 30) => {
    setPeriodo(dias);
    setLoading(true);
    await buscarMetricas(dias);
    setLoading(false);
  }, [buscarMetricas]);

  return {
    metricas,
    alertas,
    totalBots,
    totalGrupos,
    loading,
    periodo,
    carregarTudo,
    trocarPeriodo,
    buscarMensagensPersona,
  };
}
