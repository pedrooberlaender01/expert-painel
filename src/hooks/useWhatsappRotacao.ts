import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../backend/client';
import axios from 'axios';
import { WEBHOOKS } from '../config/webhooks';
import { useAuthStore } from '../stores/authStore';

export interface WhatsappRotacao {
  id: number;
  nome: string;
  numero: string;
  ativo: boolean;
  ordem: number;
  instancia: string;
  token: string;
  tipo: 'disparadora' | 'coleta_eventos' | 'torneio' | 'seguranca' | 'antihack' | 'bot';
  status_conexao: 'disconnected' | 'connecting' | 'connected';
  pairing_code: string | null;
  pairing_code_expires_at: string | null;
  qr_code_base64: string | null;
  last_connected_at: string | null;
  last_disconnected_at: string | null;
  last_disconnect_reason: string | null;
}

export interface WhatsappRotacaoMensagem {
  id: number;
  mensagem: string;
  ativo: boolean;
  ordem: number;
}

interface ReconectarResponse {
  sucesso: boolean;
  pairing_code?: string;
  nome?: string;
  numero?: string;
  mensagem?: string;
}

interface CriarInstanciaResponse {
  sucesso: boolean;
  pairing_code?: string;
  instancia_id?: string;
  mensagem?: string;
  expira_em?: string;
}

// Webhook URLs centralized in src/config/webhooks.ts

type SupabaseQueryResult = Promise<{ data: unknown; error: { message?: string } | null }>;

type FromLoose = {
  select: (columns?: string) => { order: (column: string, opts?: Record<string, unknown>) => SupabaseQueryResult };
  order: (column: string, opts?: Record<string, unknown>) => SupabaseQueryResult;
  update: (values: Record<string, unknown>) => { eq: (column: string, value: unknown) => SupabaseQueryResult };
  insert: (values: Record<string, unknown> | Record<string, unknown>[]) => SupabaseQueryResult;
  delete: () => { eq: (column: string, value: unknown) => SupabaseQueryResult };
};

export function useWhatsappRotacao() {
  const [numeros, setNumeros] = useState<WhatsappRotacao[]>([]);
  const [mensagens, setMensagens] = useState<WhatsappRotacaoMensagem[]>([]);
  const [loading, setLoading] = useState(true);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const fromLoose = (table: string) => supabase.from(table) as unknown as FromLoose;
  const errorMessage = (err: unknown, fallback: string) =>
    err instanceof Error && err.message ? err.message : fallback;

  const fetchData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);

      const expertId = useAuthStore.getState().getActiveExpertId();
      let numerosQuery = supabase.from('whatsapp_rotacao').select('*').order('ordem', { ascending: true });
      let mensagensQuery = supabase.from('whatsapp_rotacao_mensagens').select('*').order('ordem', { ascending: true });
      if (expertId) {
        numerosQuery = numerosQuery.eq('expert_id', expertId);
        mensagensQuery = mensagensQuery.eq('expert_id', expertId);
      }
      const [numerosRes, mensagensRes] = await Promise.all([numerosQuery, mensagensQuery]);

      if (numerosRes.error) throw numerosRes.error;
      if (mensagensRes.error) throw mensagensRes.error;

      setNumeros((numerosRes.data as WhatsappRotacao[]) || []);
      setMensagens((mensagensRes.data as WhatsappRotacaoMensagem[]) || []);
    } catch (err) {
      console.error('Erro ao buscar dados de rotação:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Supabase Realtime subscription
  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('whatsapp_rotacao_realtime')
      .on(
        'postgres_changes' as never,
        { event: 'UPDATE', schema: 'public', table: 'whatsapp_rotacao' },
        (payload: { new: WhatsappRotacao }) => {
          const updated = payload.new;
          setNumeros((prev) =>
            prev.map((n) => (n.id === updated.id ? { ...n, ...updated } : n))
          );
        }
      )
      .on(
        'postgres_changes' as never,
        { event: 'INSERT', schema: 'public', table: 'whatsapp_rotacao' },
        () => {
          fetchData(false);
        }
      )
      .on(
        'postgres_changes' as never,
        { event: 'DELETE', schema: 'public', table: 'whatsapp_rotacao' },
        () => {
          fetchData(false);
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [fetchData]);

  const toggleAtivo = useCallback(async (id: number, ativo: boolean): Promise<string | null> => {
    try {
      const { error } = await fromLoose('whatsapp_rotacao')
        .update({ ativo })
        .eq('id', id);
      if (error) throw error;
      setNumeros((prev) => prev.map((n) => (n.id === id ? { ...n, ativo } : n)));
      return null;
    } catch (err: unknown) {
      return errorMessage(err, 'Erro ao atualizar status');
    }
  }, []);

  const adicionarNumero = useCallback(async (data: Omit<WhatsappRotacao, 'id' | 'status_conexao' | 'pairing_code' | 'pairing_code_expires_at' | 'qr_code_base64' | 'last_connected_at' | 'last_disconnected_at' | 'last_disconnect_reason'>): Promise<string | null> => {
    try {
      const { error } = await fromLoose('whatsapp_rotacao')
        .insert(data as Record<string, unknown>);
      if (error) throw error;
      await fetchData(false);
      return null;
    } catch (err: unknown) {
      return errorMessage(err, 'Erro ao adicionar número');
    }
  }, [fetchData]);

  const editarNumero = useCallback(async (id: number, data: Pick<WhatsappRotacao, 'nome' | 'numero' | 'instancia' | 'ordem'>): Promise<string | null> => {
    try {
      const { error } = await fromLoose('whatsapp_rotacao')
        .update(data as Record<string, unknown>)
        .eq('id', id);
      if (error) throw error;
      await fetchData(false);
      return null;
    } catch (err: unknown) {
      return errorMessage(err, 'Erro ao editar número');
    }
  }, [fetchData]);

  const excluirNumero = useCallback(async (id: number, instancia?: WhatsappRotacao): Promise<string | null> => {
    try {
      const dados = instancia || numeros.find((n) => n.id === id);
      if (!dados) return 'Instância não encontrada';

      const expertId = useAuthStore.getState().getActiveExpertId();
      await axios.post(WEBHOOKS.EXCLUIR_INSTANCIA, {
        rotacao_id: dados.id,
        instancia: dados.instancia,
        token: dados.token,
        numero: dados.numero,
        nome: dados.nome,
        expert_id: expertId,
      });

      // Deletar do Supabase
      await fromLoose('whatsapp_rotacao').delete().eq('id', id);

      // Remover do estado local para sumir da tela
      setNumeros((prev) => prev.filter((n) => n.id !== id));
      return null;
    } catch (err: unknown) {
      return errorMessage(err, 'Erro ao excluir instância');
    }
  }, [numeros]);

  const trocarOrdem = useCallback(async (idA: number, idB: number): Promise<string | null> => {
    try {
      const a = numeros.find((n) => n.id === idA);
      const b = numeros.find((n) => n.id === idB);
      if (!a || !b) return 'Registros não encontrados';

      const [resA, resB] = await Promise.all([
        fromLoose('whatsapp_rotacao').update({ ordem: b.ordem }).eq('id', a.id),
        fromLoose('whatsapp_rotacao').update({ ordem: a.ordem }).eq('id', b.id),
      ]);

      if (resA.error) throw resA.error;
      if (resB.error) throw resB.error;

      // Atualizar local imediatamente
      setNumeros((prev) =>
        prev
          .map((n) => {
            if (n.id === a.id) return { ...n, ordem: b.ordem };
            if (n.id === b.id) return { ...n, ordem: a.ordem };
            return n;
          })
          .sort((x, y) => x.ordem - y.ordem)
      );

      return null;
    } catch (err: unknown) {
      return errorMessage(err, 'Erro ao reordenar');
    }
  }, [numeros]);

  // ── Reconectar instância via N8N webhook ──

  const reconectar = useCallback(async (rotacaoId: number): Promise<ReconectarResponse> => {
    try {
      const expertId = useAuthStore.getState().getActiveExpertId();
      const { data } = await axios.post<ReconectarResponse>(WEBHOOKS.RECONECTAR, {
        rotacao_id: rotacaoId,
        expert_id: expertId,
      });
      return data;
    } catch (err: unknown) {
      return { sucesso: false, mensagem: errorMessage(err, 'Erro ao reconectar instância') };
    }
  }, []);

  // ── Criar instância via N8N webhook ──

  const criarInstancia = useCallback(async (nome: string, numero: string, tipo: 'disparadora' | 'coleta_eventos' | 'torneio' | 'seguranca' | 'antihack' | 'bot' = 'disparadora'): Promise<CriarInstanciaResponse> => {
    try {
      const webhookUrl = tipo === 'torneio'
        ? WEBHOOKS.TORNEIO
        : (tipo === 'seguranca' || tipo === 'antihack')
        ? WEBHOOKS.SEGURANCA
        : WEBHOOKS.CRIAR_INSTANCIA;
      const expertId = useAuthStore.getState().getActiveExpertId();
      const body: Record<string, string | null> = { nome, numero, tipo, expert_id: expertId };
      if (tipo === 'torneio' || tipo === 'seguranca' || tipo === 'antihack') {
        body.EventType = 'connection';
      }
      const { data } = await axios.post<CriarInstanciaResponse>(webhookUrl, body);

      // Após criação bem-sucedida, garantir que o campo tipo esteja correto no Supabase
      if (data.sucesso) {
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
            .update({ tipo })
            .eq('id', (found.data[0] as { id: number }).id);
        }
      }

      return data;
    } catch (err: unknown) {
      return { sucesso: false, mensagem: errorMessage(err, 'Erro ao criar instância') };
    }
  }, []);

  // ── Mensagens de Abertura CRUD ──

  const toggleAtivoMensagem = useCallback(async (id: number, ativo: boolean): Promise<string | null> => {
    try {
      const { error } = await fromLoose('whatsapp_rotacao_mensagens')
        .update({ ativo })
        .eq('id', id);
      if (error) throw error;
      setMensagens((prev) => prev.map((m) => (m.id === id ? { ...m, ativo } : m)));
      return null;
    } catch (err: unknown) {
      return errorMessage(err, 'Erro ao atualizar status');
    }
  }, []);

  const adicionarMensagem = useCallback(async (data: Omit<WhatsappRotacaoMensagem, 'id'>): Promise<string | null> => {
    try {
      const { error } = await fromLoose('whatsapp_rotacao_mensagens')
        .insert(data as Record<string, unknown>);
      if (error) throw error;
      await fetchData(false);
      return null;
    } catch (err: unknown) {
      return errorMessage(err, 'Erro ao adicionar mensagem');
    }
  }, [fetchData]);

  const editarMensagem = useCallback(async (id: number, data: Pick<WhatsappRotacaoMensagem, 'mensagem' | 'ordem'>): Promise<string | null> => {
    try {
      const { error } = await fromLoose('whatsapp_rotacao_mensagens')
        .update({ mensagem: data.mensagem, ordem: data.ordem })
        .eq('id', id);
      if (error) throw error;
      await fetchData(false);
      return null;
    } catch (err: unknown) {
      console.error('[editarMensagem] Erro:', err);
      return errorMessage(err, 'Erro ao editar mensagem');
    }
  }, [fetchData]);

  const excluirMensagem = useCallback(async (id: number): Promise<string | null> => {
    try {
      const { error } = await fromLoose('whatsapp_rotacao_mensagens')
        .delete()
        .eq('id', id);
      if (error) throw error;

      const restantes = mensagens.filter((m) => m.id !== id).sort((a, b) => a.ordem - b.ordem);
      for (let i = 0; i < restantes.length; i++) {
        const novaOrdem = i + 1;
        if (restantes[i].ordem !== novaOrdem) {
          await fromLoose('whatsapp_rotacao_mensagens')
            .update({ ordem: novaOrdem })
            .eq('id', restantes[i].id);
        }
      }

      await fetchData(false);
      return null;
    } catch (err: unknown) {
      return errorMessage(err, 'Erro ao excluir mensagem');
    }
  }, [fetchData, mensagens]);

  const trocarOrdemMensagem = useCallback(async (idA: number, idB: number): Promise<string | null> => {
    try {
      const a = mensagens.find((m) => m.id === idA);
      const b = mensagens.find((m) => m.id === idB);
      if (!a || !b) return 'Registros não encontrados';

      const [resA, resB] = await Promise.all([
        fromLoose('whatsapp_rotacao_mensagens').update({ ordem: b.ordem }).eq('id', a.id),
        fromLoose('whatsapp_rotacao_mensagens').update({ ordem: a.ordem }).eq('id', b.id),
      ]);

      if (resA.error) throw resA.error;
      if (resB.error) throw resB.error;

      setMensagens((prev) =>
        prev
          .map((m) => {
            if (m.id === a.id) return { ...m, ordem: b.ordem };
            if (m.id === b.id) return { ...m, ordem: a.ordem };
            return m;
          })
          .sort((x, y) => x.ordem - y.ordem)
      );

      return null;
    } catch (err: unknown) {
      return errorMessage(err, 'Erro ao reordenar');
    }
  }, [mensagens]);

  const instanciasDisparadoras = useMemo(
    () => numeros.filter((n) => !n.tipo || n.tipo === 'disparadora'),
    [numeros]
  );

  const instanciasColeta = useMemo(
    () => numeros.filter((n) => n.tipo === 'coleta_eventos' || n.tipo === 'seguranca'),
    [numeros]
  );

  const instanciasTorneio = useMemo(
    () => numeros.filter((n) => n.tipo === 'torneio'),
    [numeros]
  );

  const instanciasSeguranca = useMemo(
    () => numeros.filter((n) => n.tipo === 'seguranca' || n.tipo === 'antihack'),
    [numeros]
  );

  const instanciasBot = useMemo(
    () => numeros.filter((n) => n.tipo === 'bot'),
    [numeros]
  );

  return {
    numeros,
    instanciasDisparadoras,
    instanciasColeta,
    instanciasTorneio,
    instanciasSeguranca,
    instanciasBot,
    mensagens,
    loading,
    fetchData,
    toggleAtivo,
    adicionarNumero,
    editarNumero,
    excluirNumero,
    trocarOrdem,
    reconectar,
    criarInstancia,
    toggleAtivoMensagem,
    adicionarMensagem,
    editarMensagem,
    excluirMensagem,
    trocarOrdemMensagem,
  };
}
