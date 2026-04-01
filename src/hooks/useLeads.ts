import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../backend/client';
import { useVisibilityRefresh } from './useVisibilityRefresh';
import { useAuthStore } from '../stores/authStore';
import type { LeadRow } from '../types/database';

export type LeadFiltro =
  | 'all'
  | 'aguardando_nome'
  | 'aguardando_cadastro'
  | 'link_enviado'
  | 'no_grupo'
  | 'saiu_grupo';

interface UseLeadsParams {
  filtro?: LeadFiltro;
  busca?: string;
  pagina?: number;
  limite?: number;
}

interface UseLeadsReturn {
  leads: LeadRow[];
  total: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useLeads({
  filtro = 'all',
  busca = '',
  pagina = 1,
  limite = 10,
}: UseLeadsParams = {}): UseLeadsReturn {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++abortRef.current;

    try {
      setLoading(true);
      setError(null);

      const from = (pagina - 1) * limite;
      const to = from + limite - 1;

      // Build query
      const expertId = useAuthStore.getState().getActiveExpertId();
      let query = supabase
        .from('leads')
        .select('*', { count: 'exact' });

      // Filtro por expert
      if (expertId) query = query.eq('expert_id', expertId);

      // Apenas leads com data_primeiro_contato preenchida
      query = query.not('data_primeiro_contato', 'is', null);

      // Apply filter
      switch (filtro) {
        case 'aguardando_nome':
          query = query.eq('status', 'primeiro_audio_enviado');
          break;
        case 'aguardando_cadastro':
          query = query.eq('status', 'aguardando_cadastro');
          break;
        case 'link_enviado':
          query = query.eq('status', 'link_enviado');
          break;
        case 'no_grupo':
          query = query.not('entrou_no_grupo', 'is', null).is('saiu_grupo', null);
          break;
        case 'saiu_grupo':
          query = query.not('saiu_grupo', 'is', null);
          break;
        // 'all': no filter
      }

      // Search by nome or telefone
      if (busca.trim()) {
        const term = `%${busca.trim()}%`;
        query = query.or(`nome.ilike.${term},telefone.ilike.${term}`);
      }

      // Order and paginate
      query = query
        .order('data_primeiro_contato', { ascending: false })
        .range(from, to);

      const { data, error: queryError, count } = await query;

      // Ignore stale responses
      if (requestId !== abortRef.current) return;

      if (queryError) throw new Error(queryError.message);

      setLeads((data as LeadRow[]) ?? []);
      setTotal(count ?? 0);
    } catch (err: any) {
      if (requestId !== abortRef.current) return;
      console.error('Erro ao carregar leads:', err);
      setError(err.message || 'Erro ao carregar leads');
    } finally {
      if (requestId === abortRef.current) {
        setLoading(false);
      }
    }
  }, [filtro, busca, pagina, limite]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime: refresh when leads change
  useEffect(() => {
    const channel = supabase
      .channel('leads-table-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        () => { load(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [load]);

  // Refetch quando a aba volta ao foco ou rede reconecta
  useVisibilityRefresh(load);

  return { leads, total, loading, error, refetch: load };
}
