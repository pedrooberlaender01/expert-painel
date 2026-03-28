import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

interface LimitStatus {
  current: number;
  max: number | null;  // null = unlimited
  atLimit: boolean;
  percentage: number;  // 0-100, 0 if unlimited
}

interface PlanLimitsReturn {
  leads: LimitStatus;
  instancias: LimitStatus;
  envios: LimitStatus;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

function buildLimitStatus(current: number, max: number | null): LimitStatus {
  if (max === null) {
    return { current, max: null, atLimit: false, percentage: 0 };
  }
  return {
    current,
    max,
    atLimit: current >= max,
    percentage: max > 0 ? Math.min(Math.round((current / max) * 100), 100) : 0,
  };
}

export function usePlanLimits(): PlanLimitsReturn {
  const { user, impersonatedExpert } = useAuthStore();
  const expert = impersonatedExpert || user?.expert;
  const expertId = expert?.id || user?.expert_id;
  const plano = expert?.plano;

  const [leads, setLeads] = useState<LimitStatus>({ current: 0, max: null, atLimit: false, percentage: 0 });
  const [instancias, setInstancias] = useState<LimitStatus>({ current: 0, max: null, atLimit: false, percentage: 0 });
  const [envios, setEnvios] = useState<LimitStatus>({ current: 0, max: null, atLimit: false, percentage: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCounts = useCallback(async () => {
    if (!expertId || !plano) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get first day of current month for envios count
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [leadsRes, instanciasRes, enviosRes] = await Promise.allSettled([
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('expert_id', expertId),
        supabase.from('whatsapp_rotacao').select('id', { count: 'exact', head: true }).eq('expert_id', expertId).eq('ativo', true),
        supabase.from('mensagens').select('id', { count: 'exact', head: true }).eq('expert_id', expertId).eq('direcao', 'enviada').gte('created_at', firstOfMonth),
      ]);

      const leadsCount = leadsRes.status === 'fulfilled' ? (leadsRes.value.count ?? 0) : 0;
      const instanciasCount = instanciasRes.status === 'fulfilled' ? (instanciasRes.value.count ?? 0) : 0;
      const enviosCount = enviosRes.status === 'fulfilled' ? (enviosRes.value.count ?? 0) : 0;

      setLeads(buildLimitStatus(leadsCount, plano.max_leads));
      setInstancias(buildLimitStatus(instanciasCount, plano.max_instancias));
      setEnvios(buildLimitStatus(enviosCount, plano.max_envios_mes));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar limites';
      setError(msg);
      console.error('Erro ao carregar limites do plano:', err);
    } finally {
      setLoading(false);
    }
  }, [expertId, plano]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  return { leads, instancias, envios, loading, error, refresh: fetchCounts };
}
