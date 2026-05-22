import { useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface Premiacao {
  id: string;
  instagram_username: string;
  id_conta: string;
  valor: number;
  foto_url: string | null;
  status: 'pendente' | 'recebido';
  data_lancamento: string;
  data_recebimento: string | null;
  observacoes: string | null;
  expert_id: string;
  created_at: string;
}

export interface PremiacaoFiltros {
  status: 'todos' | 'pendente' | 'recebido';
  busca: string;
  dataInicio: string;
  dataFim: string;
}

export interface BloqueioResult {
  bloqueado: boolean;
  data_recebimento: string | null;
  dias_restantes: number;
}

const BUCKET = 'premiacoes-fotos';

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export function usePremiacoes() {
  const [premiacoes, setPremiacoes] = useState<Premiacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const abortRef = useRef(0);

  const getExpertId = () => useAuthStore.getState().getActiveExpertId();

  // Buscar premiacoes com filtros
  const fetchPremiacoes = useCallback(async (filtros?: PremiacaoFiltros) => {
    const requestId = ++abortRef.current;
    try {
      setLoading(true);
      const expertId = getExpertId();

      let query = supabase
        .from('premiacoes')
        .select('*')
        .order('data_lancamento', { ascending: false });

      if (expertId) {
        query = query.eq('expert_id', expertId);
      }

      if (filtros?.status && filtros.status !== 'todos') {
        query = query.eq('status', filtros.status);
      }

      if (filtros?.busca) {
        query = query.or(`instagram_username.ilike.%${filtros.busca}%,id_conta.ilike.%${filtros.busca}%`);
      }

      if (filtros?.dataInicio) {
        query = query.gte('data_lancamento', `${filtros.dataInicio}T00:00:00`);
      }

      if (filtros?.dataFim) {
        query = query.lte('data_lancamento', `${filtros.dataFim}T23:59:59`);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (requestId !== abortRef.current) return;

      setPremiacoes((data ?? []) as Premiacao[]);
    } catch (err: unknown) {
      console.error('Erro ao buscar premiacoes:', err);
    } finally {
      if (requestId === abortRef.current) setLoading(false);
    }
  }, []);

  // Verificar bloqueio de 30 dias
  const verificarBloqueio = useCallback(async (idConta: string): Promise<BloqueioResult> => {
    try {
      const expertId = getExpertId();
      if (!expertId) return { bloqueado: false, data_recebimento: null, dias_restantes: 0 };

      const { data, error } = await supabase.rpc('verificar_bloqueio_premiacao', {
        p_expert_id: expertId,
        p_id_conta: idConta,
      });

      if (error) throw error;
      return data as BloqueioResult;
    } catch (err: unknown) {
      console.error('Erro ao verificar bloqueio:', err);
      return { bloqueado: false, data_recebimento: null, dias_restantes: 0 };
    }
  }, []);

  // Upload de foto para o bucket
  const uploadFoto = useCallback(async (file: File): Promise<string | null> => {
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      return urlData.publicUrl;
    } catch (err: unknown) {
      console.error('Erro ao fazer upload:', err);
      return null;
    }
  }, []);

  // Criar nova premiacao
  const criarPremiacao = useCallback(async (dados: {
    instagram_username: string;
    id_conta: string;
    valor: number;
    foto_url?: string | null;
    observacoes?: string | null;
  }): Promise<boolean> => {
    try {
      setSubmitting(true);
      const expertId = getExpertId();
      if (!expertId) throw new Error('Expert nao identificado');

      const { error } = await supabase.from('premiacoes').insert({
        expert_id: expertId,
        instagram_username: dados.instagram_username,
        id_conta: dados.id_conta,
        valor: dados.valor,
        foto_url: dados.foto_url ?? null,
        observacoes: dados.observacoes ?? null,
      });

      if (error) throw error;
      return true;
    } catch (err: unknown) {
      console.error('Erro ao criar premiacao:', err);
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  // Alternar status entre pendente e recebido
  const toggleStatus = useCallback(async (id: string): Promise<'pendente' | 'recebido' | null> => {
    try {
      const atual = premiacoes.find(p => p.id === id);
      if (!atual) return null;

      const novoStatus = atual.status === 'recebido' ? 'pendente' : 'recebido';
      const novaDataRecebimento = novoStatus === 'recebido' ? new Date().toISOString() : null;

      const { error } = await supabase
        .from('premiacoes')
        .update({
          status: novoStatus,
          data_recebimento: novaDataRecebimento,
        })
        .eq('id', id);

      if (error) throw error;

      setPremiacoes((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, status: novoStatus, data_recebimento: novaDataRecebimento }
            : p
        )
      );
      return novoStatus;
    } catch (err: unknown) {
      console.error('Erro ao alterar status:', err);
      return null;
    }
  }, [premiacoes]);

  return {
    premiacoes,
    loading,
    submitting,
    fetchPremiacoes,
    verificarBloqueio,
    uploadFoto,
    criarPremiacao,
    toggleStatus,
  };
}
