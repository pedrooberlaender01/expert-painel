import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { AdminDashboardMetrics, ExpertBreakdownRow } from '../types/admin';

interface UseAdminDashboardReturn {
  metrics: AdminDashboardMetrics | null;
  breakdown: ExpertBreakdownRow[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useAdminDashboard(): UseAdminDashboardReturn {
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [breakdown, setBreakdown] = useState<ExpertBreakdownRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('admin_dashboard_metrics');
      if (rpcError) throw rpcError;
      const result = data as { metrics: AdminDashboardMetrics; breakdown: ExpertBreakdownRow[] };
      setMetrics(result.metrics);
      setBreakdown(result.breakdown);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar dashboard';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { metrics, breakdown, loading, error, refresh: fetchData };
}
