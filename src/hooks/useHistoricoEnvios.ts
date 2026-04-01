import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../backend/client';
import { useAuthStore } from '../stores/authStore';
import type { EnvioMassaRow, EnvioMassaLeadRow } from '../types/database';

interface UseHistoricoEnviosReturn {
  envios: EnvioMassaRow[];
  loading: boolean;
  error: string | null;
  fetchDetalhes: (envioId: string) => Promise<EnvioMassaLeadRow[]>;
  refresh: () => void;
}

export function useHistoricoEnvios(): UseHistoricoEnviosReturn {
  const [envios, setEnvios] = useState<EnvioMassaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEnvios = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const expertId = useAuthStore.getState().getActiveExpertId();
      let query = supabase
        .from('envios_massa')
        .select('*')
        .order('data_envio', { ascending: false });
      if (expertId) query = query.eq('expert_id', expertId);
      const { data, error: fetchError } = await query;

      if (fetchError) throw new Error(fetchError.message);
      setEnvios((data as unknown as EnvioMassaRow[]) ?? []);
    } catch (err: any) {
      console.error('Erro ao carregar histórico:', err);
      setError(err.message || 'Erro ao carregar histórico');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEnvios();
  }, [fetchEnvios]);

  const fetchDetalhes = useCallback(async (envioId: string): Promise<EnvioMassaLeadRow[]> => {
    try {
      const { data, error } = await supabase
        .from('envios_massa_leads')
        .select('*')
        .eq('envio_id', envioId)
        .order('enviado_em', { ascending: true, nullsFirst: false });

      if (error) throw new Error(error.message);
      return (data as unknown as EnvioMassaLeadRow[]) ?? [];
    } catch (err: any) {
      console.error('Erro ao carregar detalhes do envio:', err);
      return [];
    }
  }, []);

  const refresh = useCallback(() => {
    fetchEnvios(true);
  }, [fetchEnvios]);

  return { envios, loading, error, fetchDetalhes, refresh };
}
