import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../backend/client';
import type { ConfiguracaoRow, MensagemFunilRow } from '../types/database';

export type MensagemFunil = MensagemFunilRow;

export interface SecaoConfig {
  key: string;
  titulo: string;
}

export const SECOES: SecaoConfig[] = [
  { key: 'lead_chegou', titulo: 'Chegada do Lead' },
  { key: 'primeiro_contato', titulo: 'Primeiro Contato (Coleta de Nome)' },
  { key: 'convite', titulo: 'Convite Comunidade' },
  { key: 'confirmacao_entrada', titulo: 'Confirmação de Entrada' },
  { key: 'followups', titulo: 'Follow-ups Automáticos' },
  { key: 'boas_vindas', titulo: 'Boas-vindas Grupo' },
];

export function useMensagensFunil() {
  const [data, setData] = useState<MensagemFunil[]>([]);
  const [loading, setLoading] = useState(true);
  const [telefoneTeste, setTelefoneTeste] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const [followupsRes, boasVindasRes, outrasRes] = await Promise.all([
        supabase
          .from('mensagens_funil_v2')
          .select('*')
          .eq('secao', 'followups')
          .order('ordem', { ascending: true }),
        supabase
          .from('mensagens_funil_v2')
          .select('*')
          .eq('secao', 'boas_vindas')
          .order('ordem', { ascending: true }),
        supabase
          .from('mensagens_funil_v2')
          .select('*')
          .not('secao', 'in', '(followups,boas_vindas)')
          .order('ordem', { ascending: true }),
      ]);

      console.log('[mensagens_funil_v2] followups:', followupsRes);
      console.log('[mensagens_funil_v2] boas_vindas:', boasVindasRes);
      console.log('[mensagens_funil_v2] outras secoes:', outrasRes);

      if (followupsRes.error) throw followupsRes.error;
      if (boasVindasRes.error) throw boasVindasRes.error;
      if (outrasRes.error) throw outrasRes.error;

      const normalizeMensagens = (raw: unknown): string[] => {
        if (Array.isArray(raw)) return raw.map((v) => String(v));
        if (typeof raw === 'string') {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed.map((v) => String(v));
            return raw ? [raw] : [];
          } catch {
            return raw ? [raw] : [];
          }
        }
        return [];
      };

      const normalizeRow = (row: MensagemFunilRow): MensagemFunil => ({
        ...row,
        mensagens: normalizeMensagens(row.mensagens),
      });

      const merged = [
        ...(followupsRes.data ?? []).map((r) => normalizeRow(r as MensagemFunilRow)),
        ...(boasVindasRes.data ?? []).map((r) => normalizeRow(r as MensagemFunilRow)),
        ...(outrasRes.data ?? []).map((r) => normalizeRow(r as MensagemFunilRow)),
      ];

      setData(merged);
    } catch (err) {
      console.error('Erro ao buscar mensagens:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTelefoneTeste = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('configuracoes')
        .select('valor')
        .eq('chave', 'telefone_teste')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        const config = data as unknown as { valor?: string };
        if (config.valor) setTelefoneTeste(config.valor);
      }
    } catch (err) {
      console.error('Erro ao buscar telefone teste:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchTelefoneTeste();
  }, [fetchData, fetchTelefoneTeste]);

  const salvarTelefoneTeste = useCallback(async (telefone: string): Promise<string | null> => {
    try {
      const payload: Omit<ConfiguracaoRow, 'id' | 'updated_at'> = {
        chave: 'telefone_teste',
        valor: telefone,
        descricao: 'Número para testes de mensagem',
      };
      const { error } = await supabase
        .from('configuracoes')
        .upsert(payload, { onConflict: 'chave' });

      if (error) throw error;
      setTelefoneTeste(telefone);
      return null;
    } catch (err: any) {
      return err.message || 'Erro ao salvar telefone';
    }
  }, []);

  const salvarSecao = useCallback(async (mensagens: MensagemFunil[]): Promise<string | null> => {
    try {
      for (const msg of mensagens) {
        const payload = {
          tipo_envio: msg.tipo_envio,
          mensagens: msg.mensagens,
          tempo_espera_minutos: msg.tempo_espera_minutos,
          ativo: msg.ativo,
        };
        console.log('[salvarSecao] Salvando', msg.cenario, 'id:', msg.id, 'payload:', payload);

        const { error } = await supabase
          .from('mensagens_funil_v2')
          .update(payload)
          .eq('id', msg.id);

        if (error) {
          console.error('[salvarSecao] Erro Supabase:', error);
          throw error;
        }
        console.log('[salvarSecao] Salvo com sucesso:', msg.cenario);
      }
      return null;
    } catch (err: any) {
      console.error('[salvarSecao] Erro geral:', err);
      return err.message || 'Erro ao salvar mensagens';
    }
  }, []);

  // ─── Operações para Follow-ups ───────────────────────────────────────────

  const salvarCard = useCallback(async (msg: MensagemFunil, isFollowup: boolean): Promise<string | null> => {
    try {
      const payload: Record<string, unknown> = {
        tipo_envio: msg.tipo_envio,
        mensagens: msg.mensagens,
        tempo_espera_minutos: msg.tempo_espera_minutos,
        ativo: msg.ativo,
        updated_at: new Date().toISOString(),
      };

      if (isFollowup) {
        payload.titulo = msg.titulo;
        payload.descricao = msg.descricao;
        payload.status_alvo = msg.status_alvo;
      }

      console.log('[salvarCard] Salvando', msg.cenario, 'id:', msg.id, 'payload:', payload);

      const { error } = await supabase
        .from('mensagens_funil_v2')
        .update(payload)
        .eq('id', msg.id);

      if (error) throw error;

      console.log('[salvarCard] Salvo com sucesso:', msg.cenario);
      await fetchData();
      return null;
    } catch (err: any) {
      console.error('[salvarCard] Erro:', err);
      return err.message || 'Erro ao salvar';
    }
  }, [fetchData]);

  const criarFollowup = useCallback(async (dados: {
    titulo: string;
    descricao: string;
    status_alvo: string;
    tempo_espera_minutos: number;
    tipo_envio: string;
  }): Promise<string | null> => {
    try {
      // Contar follow-ups existentes para definir ordem
      const existentes = data.filter(m => m.secao === 'followups');
      const novaOrdem = existentes.length + 1;

      const payload = {
        secao: 'followups',
        cenario: `${dados.status_alvo}_${Date.now()}`,
        titulo: dados.titulo,
        descricao: dados.descricao || '',
        tipo_envio: dados.tipo_envio,
        mensagens: [''],
        tempo_espera_minutos: dados.tempo_espera_minutos,
        status_alvo: dados.status_alvo,
        ordem: novaOrdem,
        ativo: true,
      };

      console.log('[criarFollowup] Criando:', payload);

      const { error } = await supabase
        .from('mensagens_funil_v2')
        .insert(payload);

      if (error) throw error;

      await fetchData();
      return null;
    } catch (err: any) {
      console.error('[criarFollowup] Erro:', err);
      return err.message || 'Erro ao criar follow-up';
    }
  }, [data, fetchData]);

  const excluirFollowup = useCallback(async (id: string, cenario: string): Promise<string | null> => {
    try {
      console.log('[excluirFollowup] Excluindo:', id, cenario);

      // Deletar registros de followups_enviados
      const { error: errEnviados } = await supabase
        .from('followups_enviados')
        .delete()
        .eq('cenario', cenario);

      if (errEnviados) {
        console.warn('[excluirFollowup] Erro ao limpar followups_enviados:', errEnviados);
      }

      // Deletar o follow-up
      const { error } = await supabase
        .from('mensagens_funil_v2')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchData();
      return null;
    } catch (err: any) {
      console.error('[excluirFollowup] Erro:', err);
      return err.message || 'Erro ao excluir follow-up';
    }
  }, [fetchData]);

  const toggleAtivo = useCallback(async (id: string, ativo: boolean): Promise<string | null> => {
    try {
      console.log('[toggleAtivo] id:', id, 'ativo:', ativo);
      const { error } = await supabase
        .from('mensagens_funil_v2')
        .update({ ativo, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setData((prev) => prev.map((m) => (m.id === id ? { ...m, ativo } : m)));
      return null;
    } catch (err: any) {
      console.error('[toggleAtivo] Erro:', err);
      return err.message || 'Erro ao alterar status';
    }
  }, []);

  const reordenarFollowups = useCallback(async (
    items: { id: string; ordem: number }[]
  ): Promise<string | null> => {
    try {
      for (const item of items) {
        const { error } = await supabase
          .from('mensagens_funil_v2')
          .update({ ordem: item.ordem })
          .eq('id', item.id);

        if (error) throw error;
      }
      await fetchData();
      return null;
    } catch (err: any) {
      console.error('[reordenarFollowups] Erro:', err);
      return err.message || 'Erro ao reordenar';
    }
  }, [fetchData]);

  return {
    data,
    loading,
    telefoneTeste,
    fetchData,
    salvarTelefoneTeste,
    salvarSecao,
    salvarCard,
    criarFollowup,
    excluirFollowup,
    reordenarFollowups,
    toggleAtivo,
  };
}
