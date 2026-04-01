import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../backend/client';
import { useVisibilityRefresh } from './useVisibilityRefresh';
import { useAuthStore } from '../stores/authStore';
import type { NotificacaoRow } from '../types/database';

// Notificação com dados do lead (via join)
export interface NotificacaoComLead extends NotificacaoRow {
  leads: { nome: string | null; telefone: string } | null;
}

interface UseNotificacoesReturn {
  notificacoes: NotificacaoComLead[];
  contadorNaoLidas: number;
  loading: boolean;
  error: string | null;
  marcarComoLida: (id: string) => Promise<void>;
  marcarTodasComoLidas: () => Promise<void>;
  refresh: () => void;
}

export function useNotificacoes(): UseNotificacoesReturn {
  const [notificacoes, setNotificacoes] = useState<NotificacaoComLead[]>([]);
  const [contadorNaoLidas, setContadorNaoLidas] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotificacoes = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const expertId = useAuthStore.getState().getActiveExpertId();
      let notifQuery = supabase
        .from('notificacoes')
        .select('*')
        .eq('lida', false)
        .order('created_at', { ascending: false })
        .limit(50);
      let countQuery = supabase
        .from('notificacoes')
        .select('*', { count: 'exact', head: true })
        .eq('lida', false);
      if (expertId) {
        notifQuery = notifQuery.eq('expert_id', expertId);
        countQuery = countQuery.eq('expert_id', expertId);
      }
      const [notifResult, countResult] = await Promise.all([notifQuery, countQuery]);

      if (notifResult.error) throw new Error(notifResult.error.message);
      if (countResult.error) throw new Error(countResult.error.message);

      // Buscar dados dos leads referenciados (sem FK, faz manualmente)
      const leadIds = (notifResult.data ?? [])
        .map((n: any) => n.lead_id)
        .filter(Boolean) as string[];

      let leadsMap: Record<string, { nome: string | null; telefone: string }> = {};
      if (leadIds.length > 0) {
        const { data: leadsData } = await supabase
          .from('leads')
          .select('id, nome, telefone')
          .in('id', leadIds);
        if (leadsData) {
          leadsMap = Object.fromEntries(leadsData.map((l: any) => [l.id, { nome: l.nome, telefone: l.telefone }]));
        }
      }

      const notificacoesComLead: NotificacaoComLead[] = (notifResult.data ?? []).map((n: any) => ({
        ...n,
        leads: n.lead_id ? leadsMap[n.lead_id] ?? null : null,
      }));

      setNotificacoes(notificacoesComLead);
      setContadorNaoLidas(countResult.count ?? 0);
    } catch (err: any) {
      console.error('Erro ao carregar notificações:', err);
      setError(err.message || 'Erro ao carregar notificações');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + refetch when session refreshes
  useEffect(() => {
    fetchNotificacoes();
  }, [fetchNotificacoes]);

  // Supabase Realtime — atualiza automaticamente ao inserir/atualizar notificações
  useEffect(() => {
    const channel = supabase
      .channel('notificacoes-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificacoes' },
        () => {
          fetchNotificacoes(false);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notificacoes' },
        () => {
          fetchNotificacoes(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotificacoes]);

  const marcarComoLida = useCallback(async (id: string) => {
    // Optimistic update
    setNotificacoes(prev => prev.filter(n => n.id !== id));
    setContadorNaoLidas(prev => Math.max(0, prev - 1));

    const { error } = await supabase
      .from('notificacoes')
      .update({ lida: true } as Record<string, unknown>)
      .eq('id', id);

    if (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      fetchNotificacoes(false);
    }
  }, [fetchNotificacoes]);

  const marcarTodasComoLidas = useCallback(async () => {
    // Optimistic update
    const prevNotificacoes = notificacoes;
    const prevContador = contadorNaoLidas;
    setNotificacoes([]);
    setContadorNaoLidas(0);

    const { error } = await supabase
      .from('notificacoes')
      .update({ lida: true } as Record<string, unknown>)
      .eq('lida', false);

    if (error) {
      console.error('Erro ao marcar todas como lidas:', error);
      setNotificacoes(prevNotificacoes);
      setContadorNaoLidas(prevContador);
    }
  }, [notificacoes, contadorNaoLidas]);

  useVisibilityRefresh(() => fetchNotificacoes(false));

  const refresh = useCallback(() => {
    fetchNotificacoes(true);
  }, [fetchNotificacoes]);

  return {
    notificacoes,
    contadorNaoLidas,
    loading,
    error,
    marcarComoLida,
    marcarTodasComoLidas,
    refresh,
  };
}
