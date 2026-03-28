import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { PlanoRow } from '../types/database';

interface UseAdminPlanosReturn {
  planos: PlanoRow[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  updatePlano: (planoId: string, data: Partial<PlanoRow>) => Promise<{ success: boolean; error?: string }>;
  createPlano: (data: { nome: string; max_leads: number | null; max_instancias: number; max_envios_mes: number | null; features_permitidas: string[] }) => Promise<{ success: boolean; error?: string }>;
}

export function useAdminPlanos(): UseAdminPlanosReturn {
  const [planos, setPlanos] = useState<PlanoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlanos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('admin_list_planos');
      if (rpcError) throw rpcError;
      setPlanos((data as PlanoRow[]) || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlanos(); }, [fetchPlanos]);

  const updatePlano = useCallback(async (planoId: string, data: Partial<PlanoRow>) => {
    const { data: result, error: rpcError } = await supabase.rpc('admin_update_plano', {
      p_plano_id: planoId,
      p_nome: data.nome ?? null,
      p_max_leads: data.max_leads ?? null,
      p_max_instancias: data.max_instancias ?? null,
      p_max_envios_mes: data.max_envios_mes ?? null,
      p_features_permitidas: data.features_permitidas ?? null,
      p_ativo: data.ativo ?? null,
    });
    if (rpcError) return { success: false, error: rpcError.message };
    const res = result as { success: boolean; error?: string };
    if (res.success) fetchPlanos();
    return res;
  }, [fetchPlanos]);

  const createPlano = useCallback(async (data: { nome: string; max_leads: number | null; max_instancias: number; max_envios_mes: number | null; features_permitidas: string[] }) => {
    const { data: result, error: rpcError } = await supabase.rpc('admin_create_plano', {
      p_nome: data.nome,
      p_max_leads: data.max_leads,
      p_max_instancias: data.max_instancias,
      p_max_envios_mes: data.max_envios_mes,
      p_features_permitidas: data.features_permitidas,
    });
    if (rpcError) return { success: false, error: rpcError.message };
    const res = result as { success: boolean; error?: string };
    if (res.success) fetchPlanos();
    return res;
  }, [fetchPlanos]);

  return { planos, loading, error, refresh: fetchPlanos, updatePlano, createPlano };
}
