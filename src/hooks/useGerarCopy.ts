import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { WEBHOOKS, fetchWithTimeout } from '../config/webhooks';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface ExpertPerfil {
  id: string;
  nome_expert: string;
  nicho: string | null;
  tom_voz: 'muito_informal' | 'jovem' | 'neutro' | 'profissional' | 'formal';
  palavras_frequentes: string[];
  palavras_proibidas: string[];
  emojis_frequentes: string[];
  contexto_extra: string | null;
  exemplos_copys: string | null;
  tipos_copy: string[];
  created_at: string;
  updated_at: string;
}

export interface ExemploCopy {
  id: string;
  content: string;
  metadata: {
    categoria: string;
    contexto: string;
    qualidade: number;
  };
}

export interface GerarCopyRequest {
  perfil: ExpertPerfil;
  tipo_copy: string;
  tamanho: 'curta' | 'media' | 'grande';
  descricao: string;
  opcoes: {
    incluir_cta: boolean;
    usar_urgencia: boolean;
    mencionar_comunidade: boolean;
    incluir_link: boolean;
    link: string;
  };
}

// Webhook URLs centralized in src/config/webhooks.ts

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export function useGerarCopy() {
  // === PERFIL ===
  const [perfil, setPerfil] = useState<ExpertPerfil | null>(null);
  const [loadingPerfil, setLoadingPerfil] = useState(false);

  // === COPY ===
  const [copysGeradas, setCopysGeradas] = useState<string[]>([]);
  const [loadingCopy, setLoadingCopy] = useState(false);

  // === EXEMPLOS ===
  const [exemplos, setExemplos] = useState<ExemploCopy[]>([]);
  const [loadingExemplos, setLoadingExemplos] = useState(false);

  // ─── Perfil do Expert ───

  const fetchPerfil = useCallback(async () => {
    try {
      setLoadingPerfil(true);
      const expertId = useAuthStore.getState().getActiveExpertId();

      let query = supabase
        .from('expert_perfil')
        .select('*');

      if (expertId) {
        query = query.eq('expert_id', expertId);
      }

      const { data, error } = await query.limit(1).single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) setPerfil(data as ExpertPerfil);
    } catch (err) {
      console.error('Erro ao buscar perfil:', err);
    } finally {
      setLoadingPerfil(false);
    }
  }, []);

  const salvarPerfil = useCallback(async (dados: Partial<ExpertPerfil>) => {
    try {
      setLoadingPerfil(true);
      const now = new Date().toISOString();

      if (perfil?.id) {
        const { data, error } = await supabase
          .from('expert_perfil')
          .update({ ...dados, updated_at: now })
          .eq('id', perfil.id)
          .select()
          .single();
        if (error) throw error;
        setPerfil(data as ExpertPerfil);
      } else {
        const expertId = useAuthStore.getState().getActiveExpertId();
        if (!expertId) throw new Error('Expert não identificado');
        const { data, error } = await supabase
          .from('expert_perfil')
          .insert({ ...dados, expert_id: expertId, created_at: now, updated_at: now })
          .select()
          .single();
        if (error) throw error;
        setPerfil(data as ExpertPerfil);
      }
    } catch (err) {
      console.error('Erro ao salvar perfil:', err);
      throw err;
    } finally {
      setLoadingPerfil(false);
    }
  }, [perfil]);

  // ─── Gerar Copy ───

  const gerarCopy = useCallback(async (request: GerarCopyRequest) => {
    try {
      setLoadingCopy(true);
      setCopysGeradas([]);

      const res = await fetchWithTimeout(WEBHOOKS.GERAR_COPY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!res.ok) throw new Error(`Status ${res.status}`);
      const result = await res.json();

      if (result.success && Array.isArray(result.copys)) {
        setCopysGeradas(result.copys);
      } else if (Array.isArray(result)) {
        setCopysGeradas(result);
      } else {
        throw new Error('Resposta inválida do servidor');
      }
    } catch (err) {
      console.error('Erro ao gerar copy:', err);
      throw err;
    } finally {
      setLoadingCopy(false);
    }
  }, []);

  // ─── Base de Conhecimento (RAG) ───

  const fetchExemplos = useCallback(async (categoria?: string) => {
    try {
      setLoadingExemplos(true);
      const expertId = useAuthStore.getState().getActiveExpertId();

      let query = supabase.from('documents').select('id, content, metadata');

      if (expertId) {
        query = query.eq('expert_id', expertId);
      }
      if (categoria) {
        query = query.filter('metadata->>categoria', 'eq', categoria);
      }

      const { data, error } = await query.order('id', { ascending: false });
      if (error) throw error;
      setExemplos((data as ExemploCopy[]) || []);
    } catch (err) {
      console.error('Erro ao buscar exemplos:', err);
    } finally {
      setLoadingExemplos(false);
    }
  }, []);

  const adicionarExemplo = useCallback(
    async (dados: { categoria: string; conteudo: string; contexto?: string; qualidade?: number }) => {
      try {
        const res = await fetchWithTimeout(WEBHOOKS.ADICIONAR_EXEMPLO_COPY, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dados),
        });
        if (!res.ok) throw new Error(`Status ${res.status}`);
      } catch (err) {
        console.error('Erro ao adicionar exemplo:', err);
        throw err;
      }
    },
    []
  );

  const excluirExemplo = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('documents').delete().eq('id', id);
      if (error) throw error;
      setExemplos((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error('Erro ao excluir exemplo:', err);
      throw err;
    }
  }, []);

  // ─── Salvar na Biblioteca ───

  const salvarNaBiblioteca = useCallback(async (nome: string, conteudo: string) => {
    const expertId = useAuthStore.getState().getActiveExpertId();
    if (!expertId) throw new Error('Expert nao identificado');
    const { error } = await supabase
      .from('agendamentos_mensagens')
      .insert({ nome, tipo: 'texto', conteudo, expert_id: expertId });
    if (error) throw error;
  }, []);

  return {
    // Perfil
    perfil,
    loadingPerfil,
    fetchPerfil,
    salvarPerfil,

    // Copy
    copysGeradas,
    loadingCopy,
    gerarCopy,

    // Exemplos
    exemplos,
    loadingExemplos,
    fetchExemplos,
    adicionarExemplo,
    excluirExemplo,

    // Biblioteca
    salvarNaBiblioteca,
  };
}
