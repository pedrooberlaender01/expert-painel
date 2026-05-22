import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { WEBHOOKS, fetchWithTimeout } from '../config/webhooks';

// ─── Types ───

export type CategoriaConhecimento =
  | 'comportamento'
  | 'frases_hype'
  | 'frases_social_proof'
  | 'frases_engajamento'
  | 'frases_defesa'
  | 'frases_silencio'
  | 'contexto_expert';

export interface BotConhecimento {
  id: number;
  categoria: CategoriaConhecimento;
  content: string;
  metadata: Record<string, unknown> | null;
  expert_id: string;
}

// ─── Hook ───

export function useBotConhecimento() {
  const [items, setItems] = useState<BotConhecimento[]>([]);
  const [contadores, setContadores] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [loadingContadores, setLoadingContadores] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Contar por categoria ──
  const contarPorCategoria = useCallback(async () => {
    try {
      setLoadingContadores(true);
      const expertId = useAuthStore.getState().getActiveExpertId();

      let query = supabase
        .from('bot_conhecimento')
        .select('categoria');
      if (expertId) query = query.eq('expert_id', expertId);

      const { data, error: fetchError } = await query;
      if (fetchError) throw new Error(fetchError.message);

      const counts: Record<string, number> = {};
      ((data ?? []) as { categoria: string }[]).forEach((row) => {
        counts[row.categoria] = (counts[row.categoria] || 0) + 1;
      });
      setContadores(counts);
    } catch (err: unknown) {
      console.error('Erro ao contar conhecimento:', err);
    } finally {
      setLoadingContadores(false);
    }
  }, []);

  // ── Listar por categoria ──
  const listarPorCategoria = useCallback(async (categoria: CategoriaConhecimento) => {
    try {
      setLoading(true);
      setError(null);

      const expertId = useAuthStore.getState().getActiveExpertId();
      let query = supabase
        .from('bot_conhecimento')
        .select('id, categoria, content, metadata, expert_id')
        .eq('categoria', categoria)
        .order('id', { ascending: false });
      if (expertId) query = query.eq('expert_id', expertId);

      const { data, error: fetchError } = await query;
      if (fetchError) throw new Error(fetchError.message);

      setItems((data ?? []) as unknown as BotConhecimento[]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar conhecimento';
      console.error(msg, err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Gerar embedding via n8n (fire-and-forget) ──
  const gerarEmbedding = useCallback(async (content: string, categoria: string, expert_id: string, id?: number) => {
    try {
      await fetchWithTimeout(WEBHOOKS.BOT_ADICIONAR_CONHECIMENTO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, categoria, expert_id, id }),
      });
    } catch (err: unknown) {
      console.error('Erro ao gerar embedding:', err);
    }
  }, []);

  // ── Adicionar ──
  const adicionar = useCallback(async (content: string, categoria: CategoriaConhecimento): Promise<BotConhecimento | null> => {
    try {
      const expertId = useAuthStore.getState().getActiveExpertId();
      if (!expertId) throw new Error('Expert não identificado');

      const { data, error } = await supabase
        .from('bot_conhecimento')
        .insert({ content, categoria, expert_id: expertId })
        .select('id, categoria, content, metadata, expert_id')
        .single();

      if (error) throw new Error(error.message);

      const created = data as unknown as BotConhecimento;
      setItems((prev) => [created, ...prev]);
      setContadores((prev) => ({ ...prev, [categoria]: (prev[categoria] || 0) + 1 }));

      // Fire-and-forget: gerar embedding no n8n
      gerarEmbedding(content, categoria, expertId, created.id);

      return created;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao adicionar';
      throw new Error(msg);
    }
  }, [gerarEmbedding]);

  // ── Editar ──
  const editar = useCallback(async (id: number, content: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('bot_conhecimento')
        .update({ content })
        .eq('id', id);

      if (error) throw new Error(error.message);

      setItems((prev) => prev.map((item) => item.id === id ? { ...item, content } : item));

      // Fire-and-forget: atualizar embedding no n8n
      const item = items.find((i) => i.id === id);
      if (item) {
        gerarEmbedding(content, item.categoria, item.expert_id, id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao editar';
      throw new Error(msg);
    }
  }, [items, gerarEmbedding]);

  // ── Deletar ──
  const deletar = useCallback(async (id: number, categoria: CategoriaConhecimento): Promise<void> => {
    try {
      const { error } = await supabase
        .from('bot_conhecimento')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);

      setItems((prev) => prev.filter((item) => item.id !== id));
      setContadores((prev) => ({ ...prev, [categoria]: Math.max(0, (prev[categoria] || 0) - 1) }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir';
      throw new Error(msg);
    }
  }, []);

  return {
    items,
    contadores,
    loading,
    loadingContadores,
    error,
    contarPorCategoria,
    listarPorCategoria,
    adicionar,
    editar,
    deletar,
  };
}
