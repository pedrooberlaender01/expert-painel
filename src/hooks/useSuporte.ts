import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { WEBHOOKS, fetchWithTimeout } from '../config/webhooks';
import axios from 'axios';
import type { SuporteAgenteConfig, SuporteConhecimento } from '../types/suporte';
import type { WhatsappRotacao } from './useWhatsappRotacao';

// ─── Tipos internos ───

interface CriarInstanciaResponse {
  sucesso: boolean;
  pairing_code?: string;
  instancia_id?: string;
  mensagem?: string;
  expira_em?: string;
}

// ─── Hook ───

export function useSuporte() {
  // Config do agente
  const [config, setConfig] = useState<SuporteAgenteConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Base de conhecimento
  const [conhecimentos, setConhecimentos] = useState<SuporteConhecimento[]>([]);
  const [loadingConhecimento, setLoadingConhecimento] = useState(true);

  // Instancias de suporte
  const [instancias, setInstancias] = useState<WhatsappRotacao[]>([]);
  const [loadingInstancias, setLoadingInstancias] = useState(true);

  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const getExpertId = () => useAuthStore.getState().getActiveExpertId();

  // ── Config do agente ──

  const fetchConfig = useCallback(async () => {
    try {
      setLoadingConfig(true);
      const expertId = getExpertId();
      let query = supabase
        .from('suporte_agente_config')
        .select('*');
      if (expertId) query = query.eq('expert_id', expertId);

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      setConfig((data as unknown as SuporteAgenteConfig) ?? null);
    } catch (err: unknown) {
      console.error('Erro ao buscar config do agente:', err);
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  const saveConfig = useCallback(async (dados: Partial<SuporteAgenteConfig>) => {
    try {
      const expertId = getExpertId();
      if (!expertId) throw new Error('Expert nao identificado');

      if (config?.id) {
        // UPDATE
        const { error } = await supabase
          .from('suporte_agente_config')
          .update({ ...dados, updated_at: new Date().toISOString() })
          .eq('id', config.id);
        if (error) throw error;
        setConfig((prev) => prev ? { ...prev, ...dados } : prev);
      } else {
        // INSERT
        const { data, error } = await supabase
          .from('suporte_agente_config')
          .insert({ ...dados, expert_id: expertId })
          .select('*')
          .single();
        if (error) throw error;
        setConfig(data as unknown as SuporteAgenteConfig);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar config';
      throw new Error(msg);
    }
  }, [config]);

  // ── Base de conhecimento ──

  const fetchConhecimentos = useCallback(async () => {
    try {
      setLoadingConhecimento(true);
      const expertId = getExpertId();
      let query = supabase
        .from('suporte_conhecimento')
        .select('*')
        .order('created_at', { ascending: false });
      if (expertId) query = query.eq('expert_id', expertId);

      const { data, error } = await query;
      if (error) throw error;
      setConhecimentos((data as unknown as SuporteConhecimento[]) ?? []);
    } catch (err: unknown) {
      console.error('Erro ao buscar conhecimentos:', err);
    } finally {
      setLoadingConhecimento(false);
    }
  }, []);

  const addConhecimento = useCallback(async (dados: {
    tipo: 'pergunta_resposta' | 'documento';
    categoria: string;
    pergunta?: string | null;
    content: string;
    nome_arquivo?: string | null;
    metadata?: Record<string, any>;
  }): Promise<SuporteConhecimento | null> => {
    try {
      const expertId = getExpertId();
      if (!expertId) throw new Error('Expert nao identificado');

      const { data, error } = await supabase
        .from('suporte_conhecimento')
        .insert({
          ...dados,
          expert_id: expertId,
        })
        .select('*')
        .single();
      if (error) throw error;

      const created = data as unknown as SuporteConhecimento;
      setConhecimentos((prev) => [created, ...prev]);
      return created;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao adicionar conhecimento';
      throw new Error(msg);
    }
  }, []);

  const updateConhecimento = useCallback(async (id: number, dados: Partial<SuporteConhecimento>) => {
    try {
      const { error } = await supabase
        .from('suporte_conhecimento')
        .update(dados)
        .eq('id', id);
      if (error) throw error;

      setConhecimentos((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...dados } : item))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar conhecimento';
      throw new Error(msg);
    }
  }, []);

  const deleteConhecimento = useCallback(async (id: number) => {
    try {
      const { error } = await supabase
        .from('suporte_conhecimento')
        .delete()
        .eq('id', id);
      if (error) throw error;

      setConhecimentos((prev) => prev.filter((item) => item.id !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir conhecimento';
      throw new Error(msg);
    }
  }, []);

  const gerarEmbedding = useCallback(async (id: number) => {
    try {
      const expertId = getExpertId();
      await fetchWithTimeout(WEBHOOKS.SUPORTE_GERAR_EMBEDDING, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, expert_id: expertId }),
      });
    } catch (err: unknown) {
      console.error('Erro ao gerar embedding:', err);
    }
  }, []);

  const uploadDocumento = useCallback(async (file: File): Promise<SuporteConhecimento | null> => {
    try {
      const texto = await file.text();
      if (!texto.trim()) throw new Error('Arquivo vazio');

      const created = await addConhecimento({
        tipo: 'documento',
        categoria: 'documento',
        content: texto,
        nome_arquivo: file.name,
        metadata: { tamanho: file.size, tipo_arquivo: file.type },
      });

      if (created) {
        await gerarEmbedding(created.id);
      }

      return created;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao fazer upload';
      throw new Error(msg);
    }
  }, [addConhecimento, gerarEmbedding]);

  // ── Instancias de suporte ──

  const fetchInstancias = useCallback(async () => {
    try {
      setLoadingInstancias(true);
      const expertId = getExpertId();
      let query = supabase
        .from('whatsapp_rotacao')
        .select('*')
        .eq('tipo', 'suporte')
        .order('ordem', { ascending: true });
      if (expertId) query = query.eq('expert_id', expertId);

      const { data, error } = await query;
      if (error) throw error;
      setInstancias((data as unknown as WhatsappRotacao[]) ?? []);
    } catch (err: unknown) {
      console.error('Erro ao buscar instancias de suporte:', err);
    } finally {
      setLoadingInstancias(false);
    }
  }, []);

  const criarInstancia = useCallback(async (nome: string, numero: string): Promise<CriarInstanciaResponse> => {
    try {
      const expertId = getExpertId();
      const { data } = await axios.post<CriarInstanciaResponse>(WEBHOOKS.CRIAR_INSTANCIA, {
        nome,
        numero,
        tipo: 'suporte',
        expert_id: expertId,
        webhook_url: WEBHOOKS.SUPORTE_WEBHOOK_URL,
      });

      if (data.sucesso) {
        // Garantir tipo correto no Supabase
        const found = await supabase
          .from('whatsapp_rotacao')
          .select('id')
          .eq('nome', nome)
          .eq('numero', numero)
          .order('id', { ascending: false })
          .limit(1);

        if (found.data && found.data.length > 0) {
          await supabase
            .from('whatsapp_rotacao')
            .update({ tipo: 'suporte' })
            .eq('id', (found.data[0] as { id: number }).id);
        }

        await fetchInstancias();
      }

      return data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar instancia';
      return { sucesso: false, mensagem: msg };
    }
  }, [fetchInstancias]);

  const conectarInstancia = useCallback(async (id: number): Promise<{ sucesso: boolean; pairing_code?: string; mensagem?: string }> => {
    try {
      const inst = instancias.find((i) => i.id === id);
      if (!inst) throw new Error('Instancia nao encontrada');

      const expertId = getExpertId();
      const { data } = await axios.post(WEBHOOKS.RECONECTAR, {
        instancia: inst.instancia,
        nome: inst.nome,
        numero: inst.numero,
        expert_id: expertId,
      });
      return data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao conectar instancia';
      return { sucesso: false, mensagem: msg };
    }
  }, [instancias]);

  const excluirInstancia = useCallback(async (id: number): Promise<string | null> => {
    try {
      const inst = instancias.find((i) => i.id === id);
      if (!inst) throw new Error('Instancia nao encontrada');

      const expertId = getExpertId();
      await axios.post(WEBHOOKS.EXCLUIR_INSTANCIA, {
        instancia: inst.instancia,
        expert_id: expertId,
      });

      setInstancias((prev) => prev.filter((i) => i.id !== id));
      return null;
    } catch (err: unknown) {
      return err instanceof Error ? err.message : 'Erro ao excluir instancia';
    }
  }, [instancias]);

  // ── Metricas rapidas ──

  const metricas = useMemo(() => {
    const totalPR = conhecimentos.filter((c) => c.tipo === 'pergunta_resposta').length;
    const totalDocs = conhecimentos.filter((c) => c.tipo === 'documento').length;
    const embeddingsPendentes = conhecimentos.filter((c) => c.embedding === null).length;
    return { totalPR, totalDocs, embeddingsPendentes };
  }, [conhecimentos]);

  // ── Realtime para instancias ──

  useEffect(() => {
    fetchConfig();
    fetchConhecimentos();
    fetchInstancias();

    const channel = supabase
      .channel('suporte_instancias_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_rotacao' },
        () => {
          fetchInstancias();
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [fetchConfig, fetchConhecimentos, fetchInstancias]);

  return {
    // Config
    config,
    loadingConfig,
    fetchConfig,
    saveConfig,

    // Conhecimento
    conhecimentos,
    loadingConhecimento,
    fetchConhecimentos,
    addConhecimento,
    updateConhecimento,
    deleteConhecimento,
    gerarEmbedding,
    uploadDocumento,

    // Instancias
    instancias,
    loadingInstancias,
    fetchInstancias,
    criarInstancia,
    conectarInstancia,
    excluirInstancia,

    // Metricas
    metricas,
  };
}
