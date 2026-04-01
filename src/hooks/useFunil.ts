import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../backend/client';
import { useVisibilityRefresh } from './useVisibilityRefresh';
import { useAuthStore } from '../stores/authStore';
import type { LeadRow, StatusLead } from '../types/database';

export interface FunilColumn {
  status: StatusLead;
  leads: LeadRow[];
  quantidade: number;
  percentual: number;
}

interface UseFunilReturn {
  columns: Record<string, FunilColumn>;
  totalLeads: number;
  loading: boolean;
  error: string | null;
  lastUpdated: Date;
  refresh: () => void;
}

const FUNIL_STATUSES: StatusLead[] = [
  'primeiro_audio_enviado',
  'convite_enviado',
  'aguardando_cadastro',
  'link_enviado',
  'aguardando_confirmacao_entrada',
  'entrou_grupo',
  'sem_resposta',
  'atendimento_manual',
];

const AUTO_REFRESH_MS = 30_000;

export function useFunil(): UseFunilReturn {
  const [columns, setColumns] = useState<Record<string, FunilColumn>>({});
  const [totalLeads, setTotalLeads] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      // Fetch all leads for the funnel statuses in a single query
      const expertId = useAuthStore.getState().getActiveExpertId();
      let query = supabase
        .from('leads')
        .select('id, telefone, nome, status, ultima_interacao, observacoes')
        .in('status', FUNIL_STATUSES)
        .not('data_primeiro_contato', 'is', null)
        .order('ultima_interacao', { ascending: false });
      if (expertId) query = query.eq('expert_id', expertId);
      const { data, error: queryError } = await query;

      if (queryError) throw new Error(queryError.message);

      const allLeads = (data as LeadRow[]) ?? [];
      const total = allLeads.length;

      // Group by status
      const grouped: Record<string, FunilColumn> = {};
      for (const status of FUNIL_STATUSES) {
        const statusLeads = allLeads.filter(l => l.status === status);
        grouped[status] = {
          status,
          leads: statusLeads,
          quantidade: statusLeads.length,
          percentual: total > 0 ? Math.round((statusLeads.length / total) * 100) : 0,
        };
      }

      setColumns(grouped);
      setTotalLeads(total);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Erro ao carregar funil:', err);
      setError(err.message || 'Erro ao carregar funil');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresh
  useEffect(() => {
    intervalRef.current = setInterval(() => load(false), AUTO_REFRESH_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [load]);

  // Realtime: refresh when leads change
  useEffect(() => {
    const channel = supabase
      .channel('funil-leads-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        () => { load(false); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [load]);

  useVisibilityRefresh(() => load(false));

  const refresh = useCallback(() => load(true), [load]);

  return { columns, totalLeads, loading, error, lastUpdated, refresh };
}
