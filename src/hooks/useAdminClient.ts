import { useCallback } from 'react';
import { supabase } from '../lib/supabase';

// All admin operations use supabase.rpc() which calls SECURITY DEFINER functions
// These RPCs bypass RLS by design (admin sees all data)
export function useAdminClient() {
  const rpc = useCallback(async <T = unknown>(
    fnName: string,
    params?: Record<string, unknown>
  ): Promise<{ data: T | null; error: string | null }> => {
    try {
      const { data, error } = await supabase.rpc(fnName, params);
      if (error) return { data: null, error: error.message };
      return { data: data as T, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao executar operacao admin';
      return { data: null, error: message };
    }
  }, []);

  return { rpc };
}
