import { useState, useCallback } from 'react';
import { supabase } from '../backend/client';
import { useAuthStore } from '../stores/authStore';
import { WEBHOOKS, fetchWithTimeout } from '../config/webhooks';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface AgendamentoMensagem {
  id: string;
  nome: string;
  tipo: 'texto' | 'audio' | 'imagem' | 'video';
  conteudo: string | null;
  midia_url: string | null;
  midia_mimetype: string | null;
  mencionar_todos: boolean;
  ativo: boolean;
  pasta_id: string | null;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface AgendamentoPasta {
  id: string;
  nome: string;
  cor: string | null;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface RegraRecorrencia {
  tipo: 'diario' | 'semanal' | 'personalizado';
  dias_semana: number[];
  horario: string;
  data_fim: string | null;
}

export interface AgendamentoGrupo {
  id: string;
  mensagem_id: string;
  mensagem?: AgendamentoMensagem;
  grupos: { grupo_id: string; grupo_nome: string }[];
  instancia: string;
  token: string;
  data_envio: string;
  recorrente: boolean;
  regra_recorrencia: RegraRecorrencia | null;
  agendamento_pai_id: string | null;
  status: 'pendente' | 'enviando' | 'enviado' | 'erro' | 'cancelado';
  resultado: { grupo_id: string; grupo_nome: string; sucesso: boolean; erro: string | null }[] | null;
  canal: 'whatsapp' | 'telegram';
  usar_fila: boolean;
  modo_teste: boolean;
  created_at: string;
}

export interface GrupoWhatsApp {
  grupo_id: string;
  grupo_nome: string;
}

export interface InstanciaDisparadora {
  id: number;
  nome: string;
  numero: string;
  instancia: string;
  token: string;
  status_conexao: string;
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

// Webhook URLs centralized in src/config/webhooks.ts
const BUCKET = 'midias-agendamentos';

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export function useAgendamentos() {
  // === State: Mensagens ===
  const [mensagens, setMensagens] = useState<AgendamentoMensagem[]>([]);
  const [loadingMensagens, setLoadingMensagens] = useState(false);

  // === State: Pastas ===
  const [pastas, setPastas] = useState<AgendamentoPasta[]>([]);
  const [loadingPastas, setLoadingPastas] = useState(false);

  // === State: Agendamentos ===
  const [agendamentos, setAgendamentos] = useState<AgendamentoGrupo[]>([]);
  const [loadingAgendamentos, setLoadingAgendamentos] = useState(false);

  // === State: Grupos ===
  const [grupos, setGrupos] = useState<GrupoWhatsApp[]>([]);
  const [loadingGrupos, setLoadingGrupos] = useState(false);

  // === State: Instâncias ===
  const [instancias, setInstancias] = useState<InstanciaDisparadora[]>([]);
  const [loadingInstancias, setLoadingInstancias] = useState(false);

  // === State: Canais Telegram ===
  const [canaisTelegram, setCanaisTelegram] = useState<GrupoWhatsApp[]>([]);
  const [loadingCanaisTelegram, setLoadingCanaisTelegram] = useState(false);
  const [telegramBot, setTelegramBot] = useState<{ nome: string; username: string } | null>(null);

  // ─────────────────────────────────────────
  // MENSAGENS (biblioteca)
  // ─────────────────────────────────────────

  const fetchMensagens = useCallback(async () => {
    try {
      setLoadingMensagens(true);
      const expertId = useAuthStore.getState().getActiveExpertId();

      let query = supabase
        .from('agendamentos_mensagens')
        .select('*')
        .eq('ativo', true)
        .order('ordem', { ascending: true })
        .order('created_at', { ascending: true });

      if (expertId) {
        query = query.eq('expert_id', expertId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setMensagens((data ?? []) as AgendamentoMensagem[]);
    } catch (err: unknown) {
      console.error('Erro ao buscar mensagens:', err);
    } finally {
      setLoadingMensagens(false);
    }
  }, []);

  const criarMensagem = useCallback(
    async (dados: {
      nome: string;
      tipo: 'texto' | 'audio' | 'imagem' | 'video';
      conteudo?: string;
      file?: File;
      mencionar_todos?: boolean;
      pasta_id?: string | null;
    }): Promise<AgendamentoMensagem | null> => {
      try {
        let midia_url: string | null = null;
        let midia_mimetype: string | null = null;

        // Upload de mídia se houver arquivo
        if (dados.file) {
          const ext = dados.file.name.split('.').pop() || 'bin';
          const path = `${crypto.randomUUID()}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(path, dados.file);

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from(BUCKET)
            .getPublicUrl(path);

          midia_url = urlData.publicUrl;
          midia_mimetype = dados.file.type;
        }

        const expertId = useAuthStore.getState().getActiveExpertId();
        if (!expertId) throw new Error('Expert não identificado');

        const { data, error } = await supabase
          .from('agendamentos_mensagens')
          .insert({
            expert_id: expertId,
            nome: dados.nome,
            tipo: dados.tipo,
            conteudo: dados.conteudo ?? null,
            midia_url,
            midia_mimetype,
            mencionar_todos: dados.mencionar_todos ?? false,
            pasta_id: dados.pasta_id ?? null,
          })
          .select()
          .single();

        if (error) throw error;

        const novaMensagem = data as AgendamentoMensagem;
        setMensagens((prev) => [novaMensagem, ...prev]);
        return novaMensagem;
      } catch (err: unknown) {
        console.error('Erro ao criar mensagem:', err);
        return null;
      }
    },
    []
  );

  const editarMensagem = useCallback(
    async (id: string, dados: Partial<AgendamentoMensagem>) => {
      try {
        const { error } = await supabase
          .from('agendamentos_mensagens')
          .update({ ...dados, updated_at: new Date().toISOString() })
          .eq('id', id);

        if (error) throw error;

        setMensagens((prev) =>
          prev.map((m) => (m.id === id ? { ...m, ...dados, updated_at: new Date().toISOString() } : m))
        );
      } catch (err: unknown) {
        console.error('Erro ao editar mensagem:', err);
      }
    },
    []
  );

  const excluirMensagem = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('agendamentos_mensagens')
        .update({ ativo: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setMensagens((prev) => prev.filter((m) => m.id !== id));
    } catch (err: unknown) {
      console.error('Erro ao excluir mensagem:', err);
    }
  }, []);

  const moverMensagemPasta = useCallback(
    async (mensagemId: string, pastaId: string | null) => {
      setMensagens((prev) =>
        prev.map((m) => (m.id === mensagemId ? { ...m, pasta_id: pastaId } : m))
      );
      try {
        const { error } = await supabase
          .from('agendamentos_mensagens')
          .update({ pasta_id: pastaId, updated_at: new Date().toISOString() })
          .eq('id', mensagemId);

        if (error) throw error;
      } catch (err: unknown) {
        console.error('Erro ao mover mensagem:', err);
        void fetchMensagens();
      }
    },
    [fetchMensagens]
  );

  const reordenarMensagens = useCallback(
    async (idsOrdenados: string[]) => {
      // Optimistic: reatribui ordem local
      setMensagens((prev) => {
        const ordenMap = new Map(idsOrdenados.map((id, i) => [id, i]));
        return [...prev]
          .map((m) => (ordenMap.has(m.id) ? { ...m, ordem: ordenMap.get(m.id)! } : m))
          .sort((a, b) => a.ordem - b.ordem || a.created_at.localeCompare(b.created_at));
      });
      try {
        await Promise.all(
          idsOrdenados.map((id, index) =>
            supabase
              .from('agendamentos_mensagens')
              .update({ ordem: index, updated_at: new Date().toISOString() })
              .eq('id', id)
          )
        );
      } catch (err: unknown) {
        console.error('Erro ao reordenar mensagens:', err);
        void fetchMensagens();
      }
    },
    [fetchMensagens]
  );

  // ─────────────────────────────────────────
  // PASTAS
  // ─────────────────────────────────────────

  const fetchPastas = useCallback(async () => {
    try {
      setLoadingPastas(true);
      const expertId = useAuthStore.getState().getActiveExpertId();

      let query = supabase
        .from('agendamentos_pastas')
        .select('*')
        .order('ordem', { ascending: true })
        .order('created_at', { ascending: true });

      if (expertId) {
        query = query.eq('expert_id', expertId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPastas((data ?? []) as AgendamentoPasta[]);
    } catch (err: unknown) {
      console.error('Erro ao buscar pastas:', err);
    } finally {
      setLoadingPastas(false);
    }
  }, []);

  const criarPasta = useCallback(
    async (nome: string, cor?: string | null): Promise<AgendamentoPasta | null> => {
      try {
        const expertId = useAuthStore.getState().getActiveExpertId();
        if (!expertId) throw new Error('Expert não identificado');

        const { data, error } = await supabase
          .from('agendamentos_pastas')
          .insert({ expert_id: expertId, nome: nome.trim(), cor: cor ?? null })
          .select()
          .single();

        if (error) throw error;

        const nova = data as AgendamentoPasta;
        setPastas((prev) => [...prev, nova]);
        return nova;
      } catch (err: unknown) {
        console.error('Erro ao criar pasta:', err);
        return null;
      }
    },
    []
  );

  const renomearPasta = useCallback(async (id: string, nome: string) => {
    try {
      const { error } = await supabase
        .from('agendamentos_pastas')
        .update({ nome: nome.trim(), updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setPastas((prev) => prev.map((p) => (p.id === id ? { ...p, nome: nome.trim() } : p)));
    } catch (err: unknown) {
      console.error('Erro ao renomear pasta:', err);
    }
  }, []);

  const excluirPasta = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('agendamentos_pastas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPastas((prev) => prev.filter((p) => p.id !== id));
      // ON DELETE SET NULL já limpou pasta_id no DB — refletir local
      setMensagens((prev) =>
        prev.map((m) => (m.pasta_id === id ? { ...m, pasta_id: null } : m))
      );
    } catch (err: unknown) {
      console.error('Erro ao excluir pasta:', err);
    }
  }, []);

  // ─────────────────────────────────────────
  // AGENDAMENTOS
  // ─────────────────────────────────────────

  const fetchAgendamentos = useCallback(
    async (filtro?: 'todos' | 'pendente' | 'enviado' | 'cancelado' | 'erro' | 'recorrente') => {
      try {
        setLoadingAgendamentos(true);

        const expertId = useAuthStore.getState().getActiveExpertId();

        // Paginacao manual para contornar limite padrao do PostgREST (1000)
        const PAGE_SIZE = 1000;
        let allRows: Record<string, unknown>[] = [];
        let from = 0;
        while (true) {
          let pageQuery = supabase
            .from('agendamentos_grupos')
            .select('*, agendamentos_mensagens(*)')
            .order('data_envio', { ascending: false })
            .range(from, from + PAGE_SIZE - 1);

          if (expertId) {
            pageQuery = pageQuery.eq('expert_id', expertId);
          }
          if (filtro === 'recorrente') {
            pageQuery = pageQuery.eq('recorrente', true);
          } else if (filtro === 'pendente') {
            pageQuery = pageQuery.eq('status', 'pendente').eq('recorrente', false);
          } else if (filtro && filtro !== 'todos') {
            pageQuery = pageQuery.eq('status', filtro);
          }

          const { data: pageData, error: pageError } = await pageQuery;
          if (pageError) throw pageError;

          const rows = (pageData as Record<string, unknown>[]) ?? [];
          allRows = allRows.concat(rows);

          if (rows.length < PAGE_SIZE) break;
          from += PAGE_SIZE;
        }

        const mapped: AgendamentoGrupo[] = allRows.map((row) => ({
          id: row.id as string,
          mensagem_id: row.mensagem_id as string,
          mensagem: (row.agendamentos_mensagens as AgendamentoMensagem) ?? undefined,
          grupos: row.grupos as { grupo_id: string; grupo_nome: string }[],
          instancia: row.instancia as string,
          token: row.token as string,
          data_envio: row.data_envio as string,
          recorrente: row.recorrente as boolean,
          regra_recorrencia: (row.regra_recorrencia as RegraRecorrencia) ?? null,
          agendamento_pai_id: (row.agendamento_pai_id as string) ?? null,
          status: row.status as AgendamentoGrupo['status'],
          resultado: (row.resultado as AgendamentoGrupo['resultado']) ?? null,
          canal: ((row.canal as AgendamentoGrupo['canal']) ?? 'whatsapp'),
          usar_fila: (row.usar_fila as boolean) ?? false,
          modo_teste: (row.modo_teste as boolean) ?? false,
          created_at: row.created_at as string,
        }));

        setAgendamentos(mapped);
      } catch (err: unknown) {
        console.error('Erro ao buscar agendamentos:', err);
      } finally {
        setLoadingAgendamentos(false);
      }
    },
    []
  );

  const criarAgendamento = useCallback(
    async (dados: {
      mensagem_id: string;
      grupos: { grupo_id: string; grupo_nome: string }[];
      instancia: string;
      token: string;
      data_envio: string;
      recorrente: boolean;
      regra_recorrencia?: RegraRecorrencia | null;
      canal?: 'whatsapp' | 'telegram';
      usar_fila?: boolean;
      modo_teste?: boolean;
    }) => {
      try {
        const expertId = useAuthStore.getState().getActiveExpertId();
        if (!expertId) throw new Error('Expert não identificado');
        const modoTeste = dados.modo_teste === true;
        const { data: inserted, error } = await supabase
          .from('agendamentos_grupos')
          .insert({
            expert_id: expertId,
            mensagem_id: dados.mensagem_id,
            grupos: dados.grupos,
            instancia: dados.instancia,
            token: dados.token,
            data_envio: dados.data_envio,
            recorrente: dados.recorrente,
            regra_recorrencia: dados.regra_recorrencia ?? null,
            canal: dados.canal ?? 'whatsapp',
            usar_fila: dados.usar_fila ?? false,
            modo_teste: modoTeste,
          })
          .select('id')
          .single();

        if (error) throw error;

        // Modo teste: agenda cron job one-shot via Supabase pg_cron
        if (modoTeste && inserted?.id) {
          const { error: rpcError } = await supabase.rpc('agendar_disparo_teste', {
            p_agendamento_id: inserted.id,
          });
          if (rpcError) {
            console.error('Erro ao agendar disparo teste (pg_cron):', rpcError);
            throw rpcError;
          }
        }

        await fetchAgendamentos();
      } catch (err: unknown) {
        console.error('Erro ao criar agendamento:', err);
        throw err;
      }
    },
    [fetchAgendamentos]
  );

  const cancelarAgendamento = useCallback(
    async (id: string) => {
      try {
        // Identifica se eh modo_teste pra fazer cleanup do pg_cron
        const alvo = agendamentos.find((a) => a.id === id);
        const modoTeste = alvo?.modo_teste === true;

        // Chama webhook n8n para cancelar (inclui recorrências pendentes)
        const response = await fetchWithTimeout(WEBHOOKS.CANCELAR_AGENDAMENTO, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agendamento_id: id }),
        });

        if (!response.ok) {
          throw new Error(`Webhook retornou status ${response.status}`);
        }

        // Cleanup defensivo do pg_cron job (modo teste)
        if (modoTeste) {
          const { error: rpcError } = await supabase.rpc('cancelar_disparo_teste', {
            p_agendamento_id: id,
          });
          if (rpcError) {
            console.warn('Cancelar disparo teste (pg_cron) falhou (nao critico):', rpcError);
          }
        }

        // Atualiza estado local
        setAgendamentos((prev) =>
          prev.map((a) =>
            a.id === id || a.agendamento_pai_id === id
              ? { ...a, status: 'cancelado' as const }
              : a
          )
        );
      } catch (err: unknown) {
        console.error('Erro ao cancelar agendamento:', err);
      }
    },
    [agendamentos]
  );

  const duplicarAgendamento = useCallback(
    async (id: string): Promise<AgendamentoGrupo | null> => {
      try {
        const original = agendamentos.find((a) => a.id === id);
        if (!original) throw new Error('Agendamento não encontrado');

        const expertId = useAuthStore.getState().getActiveExpertId();
        if (!expertId) throw new Error('Expert não identificado');
        const { data, error } = await supabase
          .from('agendamentos_grupos')
          .insert({
            expert_id: expertId,
            mensagem_id: original.mensagem_id,
            grupos: original.grupos,
            instancia: original.instancia,
            token: original.token,
            data_envio: new Date().toISOString(), // placeholder — user ajusta depois
            recorrente: original.recorrente,
            regra_recorrencia: original.regra_recorrencia,
            status: 'pendente',
            usar_fila: original.usar_fila,
          })
          .select('*, agendamentos_mensagens(*)')
          .single();

        if (error) throw error;

        const row = data as Record<string, unknown>;
        const duplicado: AgendamentoGrupo = {
          id: row.id as string,
          mensagem_id: row.mensagem_id as string,
          mensagem: (row.agendamentos_mensagens as AgendamentoMensagem) ?? undefined,
          grupos: row.grupos as { grupo_id: string; grupo_nome: string }[],
          instancia: row.instancia as string,
          token: row.token as string,
          data_envio: row.data_envio as string,
          recorrente: row.recorrente as boolean,
          regra_recorrencia: (row.regra_recorrencia as RegraRecorrencia) ?? null,
          agendamento_pai_id: null,
          status: 'pendente',
          resultado: null,
          canal: ((row.canal as AgendamentoGrupo['canal']) ?? 'whatsapp'),
          usar_fila: (row.usar_fila as boolean) ?? false,
          modo_teste: (row.modo_teste as boolean) ?? false,
          created_at: row.created_at as string,
        };

        setAgendamentos((prev) => [duplicado, ...prev]);
        return duplicado;
      } catch (err: unknown) {
        console.error('Erro ao duplicar agendamento:', err);
        return null;
      }
    },
    [agendamentos]
  );

  // ─────────────────────────────────────────
  // GRUPOS (via webhook n8n)
  // ─────────────────────────────────────────

  const fetchGruposDe = useCallback(
    async (instancia: string, token: string): Promise<GrupoWhatsApp[]> => {
      const response = await fetchWithTimeout(WEBHOOKS.BUSCAR_GRUPOS_AGENDAMENTO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instancia, token }),
      });

      if (!response.ok) {
        throw new Error(`Webhook retornou status ${response.status}`);
      }

      const data = await response.json();

      // Normaliza resposta — webhook pode retornar array direto ou { grupos: [...] }
      const lista: GrupoWhatsApp[] = Array.isArray(data)
        ? data.map((g: Record<string, string>) => ({
            grupo_id: g.grupo_id ?? g.id ?? g.jid,
            grupo_nome: g.grupo_nome ?? g.nome ?? g.subject ?? g.name ?? '',
          }))
        : Array.isArray(data?.grupos)
          ? data.grupos.map((g: Record<string, string>) => ({
              grupo_id: g.grupo_id ?? g.id ?? g.jid,
              grupo_nome: g.grupo_nome ?? g.nome ?? g.subject ?? g.name ?? '',
            }))
          : [];

      return lista.filter((g) => !!g.grupo_id);
    },
    []
  );

  const fetchGrupos = useCallback(
    async (instancia: string, token: string) => {
      try {
        setLoadingGrupos(true);
        const lista = await fetchGruposDe(instancia, token);
        setGrupos(lista);
      } catch (err: unknown) {
        console.error('Erro ao buscar grupos:', err);
        setGrupos([]);
      } finally {
        setLoadingGrupos(false);
      }
    },
    [fetchGruposDe]
  );

  // Busca grupos em comum entre todas as instancias conectadas+ativas (fila rotativa)
  const fetchGruposIntersecao = useCallback(
    async (instanciasFila: InstanciaDisparadora[]) => {
      try {
        setLoadingGrupos(true);

        const conectadas = instanciasFila.filter((i) => i.status_conexao === 'connected');
        if (conectadas.length === 0) {
          setGrupos([]);
          return;
        }

        const resultados = await Promise.all(
          conectadas.map((i) =>
            fetchGruposDe(i.instancia, i.token).catch((err) => {
              console.error(`Erro grupos instancia ${i.nome}:`, err);
              return null;
            })
          )
        );

        // Se alguma falhou, descartar para nao mostrar grupos enganosos
        const validas = resultados.filter((r): r is GrupoWhatsApp[] => r !== null);
        if (validas.length === 0) {
          setGrupos([]);
          return;
        }

        // Intersecao por grupo_id, mantendo nome da primeira ocorrencia
        const [primeira, ...resto] = validas;
        const idsComuns = new Set(primeira.map((g) => g.grupo_id));
        for (const lista of resto) {
          const idsLista = new Set(lista.map((g) => g.grupo_id));
          for (const id of idsComuns) {
            if (!idsLista.has(id)) idsComuns.delete(id);
          }
        }

        const intersecao = primeira.filter((g) => idsComuns.has(g.grupo_id));
        setGrupos(intersecao);
      } catch (err: unknown) {
        console.error('Erro ao buscar intersecao de grupos:', err);
        setGrupos([]);
      } finally {
        setLoadingGrupos(false);
      }
    },
    [fetchGruposDe]
  );

  // ─────────────────────────────────────────
  // INSTÂNCIAS DISPARADORAS
  // ─────────────────────────────────────────

  const fetchInstancias = useCallback(async () => {
    try {
      setLoadingInstancias(true);

      const expertId = useAuthStore.getState().getActiveExpertId();

      let query = supabase
        .from('whatsapp_rotacao')
        .select('id, nome, numero, instancia, token, status_conexao')
        .eq('tipo', 'disparadora')
        .eq('ativo', true)
        .order('nome', { ascending: true });

      if (expertId) {
        query = query.eq('expert_id', expertId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setInstancias((data ?? []) as InstanciaDisparadora[]);
    } catch (err: unknown) {
      console.error('Erro ao buscar instâncias:', err);
    } finally {
      setLoadingInstancias(false);
    }
  }, []);

  // ─────────────────────────────────────────
  // CANAIS TELEGRAM
  // ─────────────────────────────────────────

  const fetchCanaisTelegram = useCallback(async () => {
    try {
      setLoadingCanaisTelegram(true);

      const expertId = useAuthStore.getState().getActiveExpertId();

      if (!expertId) {
        setCanaisTelegram([]);
        setTelegramBot(null);
        return;
      }

      // Chama webhook n8n para buscar/atualizar canais Telegram
      try {
        const response = await fetchWithTimeout(WEBHOOKS.BUSCAR_CANAIS_TELEGRAM, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ expert_id: expertId }),
        });

        if (response.ok) {
          const result = await response.json();
          const gruposWebhook: GrupoWhatsApp[] = (result.grupos ?? []).map((g: { grupo_id: string; grupo_nome: string }) => ({
            grupo_id: g.grupo_id,
            grupo_nome: g.grupo_nome,
          }));

          if (gruposWebhook.length > 0) {
            setCanaisTelegram(gruposWebhook);
            return;
          }
        }
      } catch (webhookErr: unknown) {
        console.error('Webhook Telegram falhou, tentando Supabase:', webhookErr);
      }

      // Fallback: busca direto do Supabase
      const { data, error } = await supabase
        .from('telegram_canais')
        .select('chat_id, nome, username, tipo')
        .eq('ativo', true)
        .eq('expert_id', expertId)
        .order('nome');

      if (error) throw error;

      const bot = (data ?? []).find((c) => c.tipo === 'bot');
      setTelegramBot(bot ? { nome: bot.nome, username: bot.username ?? '' } : null);

      const canais: GrupoWhatsApp[] = (data ?? [])
        .filter((c) => c.tipo !== 'bot')
        .map((c) => ({
          grupo_id: c.chat_id,
          grupo_nome: c.nome,
        }));

      setCanaisTelegram(canais);
    } catch (err: unknown) {
      console.error('Erro ao buscar canais Telegram:', err);
      setCanaisTelegram([]);
    } finally {
      setLoadingCanaisTelegram(false);
    }
  }, []);

  const criarTelegramBot = useCallback(
    async (username: string, botToken: string): Promise<boolean> => {
      try {
        const expertId = useAuthStore.getState().getActiveExpertId();
        if (!expertId) throw new Error('Expert não identificado');

        const { error } = await supabase.from('telegram_canais').insert({
          expert_id: expertId,
          chat_id: `bot_${username.replace('@', '')}`,
          nome: `Bot @${username.replace('@', '')}`,
          username: username.replace('@', ''),
          tipo: 'bot',
          bot_token: botToken,
          ativo: true,
        });

        if (error) throw error;

        setTelegramBot({ nome: `Bot @${username.replace('@', '')}`, username: username.replace('@', '') });
        return true;
      } catch (err: unknown) {
        console.error('Erro ao criar bot Telegram:', err);
        return false;
      }
    },
    []
  );

  const reagendarAgendamento = useCallback(
    async (id: string, novaDataEnvio: string) => {
      try {
        const { error } = await supabase
          .from('agendamentos_grupos')
          .update({ data_envio: novaDataEnvio })
          .eq('id', id)
          .in('status', ['pendente']);

        if (error) throw error;

        setAgendamentos((prev) =>
          prev.map((a) => (a.id === id ? { ...a, data_envio: novaDataEnvio } : a))
        );
      } catch (err: unknown) {
        console.error('Erro ao reagendar:', err);
        throw err;
      }
    },
    []
  );

  const trocarInstanciaAgendamento = useCallback(
    async (id: string, instancia: string, token: string) => {
      try {
        const { error } = await supabase
          .from('agendamentos_grupos')
          .update({ instancia, token })
          .eq('id', id)
          .in('status', ['pendente']);

        if (error) throw error;

        setAgendamentos((prev) =>
          prev.map((a) => (a.id === id ? { ...a, instancia, token } : a))
        );
      } catch (err: unknown) {
        console.error('Erro ao trocar instância do agendamento:', err);
        throw err;
      }
    },
    []
  );

  const atualizarGruposAgendamento = useCallback(
    async (id: string, novosGrupos: { grupo_id: string; grupo_nome: string }[]) => {
      try {
        const { error } = await supabase
          .from('agendamentos_grupos')
          .update({ grupos: novosGrupos })
          .eq('id', id)
          .in('status', ['pendente']);

        if (error) throw error;

        setAgendamentos((prev) =>
          prev.map((a) => (a.id === id ? { ...a, grupos: novosGrupos } : a))
        );
      } catch (err: unknown) {
        console.error('Erro ao atualizar grupos do agendamento:', err);
        throw err;
      }
    },
    []
  );

  // ─────────────────────────────────────────
  // Return
  // ─────────────────────────────────────────

  return {
    // Mensagens
    mensagens,
    loadingMensagens,
    fetchMensagens,
    criarMensagem,
    editarMensagem,
    excluirMensagem,
    moverMensagemPasta,
    reordenarMensagens,

    // Pastas
    pastas,
    loadingPastas,
    fetchPastas,
    criarPasta,
    renomearPasta,
    excluirPasta,

    // Agendamentos
    agendamentos,
    loadingAgendamentos,
    fetchAgendamentos,
    criarAgendamento,
    cancelarAgendamento,
    duplicarAgendamento,
    reagendarAgendamento,
    trocarInstanciaAgendamento,
    atualizarGruposAgendamento,

    // Grupos
    grupos,
    loadingGrupos,
    fetchGrupos,
    fetchGruposIntersecao,

    // Instâncias
    instancias,
    loadingInstancias,
    fetchInstancias,

    // Canais Telegram
    canaisTelegram,
    loadingCanaisTelegram,
    fetchCanaisTelegram,
    telegramBot,
    criarTelegramBot,
  };
}
