import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { WEBHOOKS, fetchWithTimeout } from '../config/webhooks';

export interface RegrasAtivas {
  links_spam: boolean;
  palavroes: boolean;
  adulto: boolean;
  propaganda: boolean;
  captacao_leads: boolean;
  religiao: boolean;
  politica: boolean;
}

export interface ModeracaoGrupo {
  id: string;
  grupo_id: string;
  grupo_nome: string;
  regras_ativas: RegrasAtivas;
  links_permitidos: string[];
  casas_permitidas: string[];
  perfis_permitidos: string[];
  contexto_extra: string | null;
  mensagem_aviso: string;
  mensagem_expulsao: string;
  strikes_para_expulsao: number;
  enviar_aviso: boolean;
  bloquear_internacionais: boolean;
  numero_notificacao: string;
  mensagem_hack: string;
  ativo: boolean;
  instancia: string;
  token_instancia: string;
  created_at: string;
}

export interface ModeracaoLog {
  id: string;
  grupo_id: string;
  grupo_nome: string;
  telefone_autor: string;
  nome_autor: string;
  message_id: string;
  tipo_violacao: string;
  conteudo_original: string;
  acao_tomada: string;
  strike_numero: number;
  detalhes_ia: string;
  created_at: string;
}

export interface InstanciaColeta {
  id: number;
  nome: string;
  numero: string;
  instancia: string;
  token: string;
}

export interface LogFilters {
  grupo_id: string;
  tipo_violacao: string;
  acao: string;
  data_inicio: string;
  data_fim: string;
  busca: string;
}

// UAZAPI_BASE_URL centralized in src/config/webhooks.ts
const LOGS_PER_PAGE = 20;

function getHojeInicioUTC(): string {
  const now = new Date();
  const spFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const spDate = spFormatter.format(now);
  const midnightSP = new Date(`${spDate}T00:00:00-03:00`);
  return midnightSP.toISOString();
}

export const EMPTY_LOG_FILTERS: LogFilters = {
  grupo_id: '',
  tipo_violacao: '',
  acao: '',
  data_inicio: '',
  data_fim: '',
  busca: '',
};

export function useModeracao() {
  const [grupos, setGrupos] = useState<ModeracaoGrupo[]>([]);
  const [acoesHoje, setAcoesHoje] = useState(0);
  const [loading, setLoading] = useState(true);

  // Log state — server-side paginated
  const [logs, setLogs] = useState<ModeracaoLog[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [logFilters, setLogFilters] = useState<LogFilters>(EMPTY_LOG_FILTERS);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Track if a new log arrived via realtime for animation
  const [newLogId, setNewLogId] = useState<string | null>(null);
  const newLogTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Grupos ───

  const fetchGrupos = useCallback(async () => {
    const expertId = useAuthStore.getState().getActiveExpertId();

    let query = supabase
      .from('moderacao_grupos')
      .select('*')
      .order('created_at', { ascending: false });

    if (expertId) {
      query = query.eq('expert_id', expertId);
    }

    const { data, error } = await query;
    if (!error && data) {
      setGrupos(data.map((g: Record<string, unknown>) => ({
        ...g,
        links_permitidos: (g.links_permitidos as string[]) || [],
        casas_permitidas: (g.casas_permitidas as string[]) || [],
        perfis_permitidos: (g.perfis_permitidos as string[]) || [],
        regras_ativas: (g.regras_ativas as RegrasAtivas) || {
          links_spam: true, palavroes: true, adulto: true, propaganda: true, captacao_leads: true,
        },
      })) as ModeracaoGrupo[]);
    }
  }, []);

  // ─── Ações Hoje ───

  const fetchAcoesHoje = useCallback(async () => {
    const hojeInicio = getHojeInicioUTC();
    const expertId = useAuthStore.getState().getActiveExpertId();

    let query = supabase
      .from('moderacao_log')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', hojeInicio);

    if (expertId) {
      query = query.eq('expert_id', expertId);
    }

    const { count, error } = await query;
    if (!error) setAcoesHoje(count || 0);
  }, []);

  // ─── Logs (server-side filtered + paginated) ───

  const fetchLogs = useCallback(async (page?: number, filters?: LogFilters) => {
    const p = page ?? logsPage;
    const f = filters ?? logFilters;
    const offset = (p - 1) * LOGS_PER_PAGE;

    setLoadingLogs(true);

    const expertId = useAuthStore.getState().getActiveExpertId();

    let query = supabase
      .from('moderacao_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + LOGS_PER_PAGE - 1);

    if (expertId) query = query.eq('expert_id', expertId);
    if (f.grupo_id) query = query.eq('grupo_id', f.grupo_id);
    if (f.tipo_violacao) query = query.eq('tipo_violacao', f.tipo_violacao);
    if (f.acao === 'aviso') query = query.like('acao_tomada', 'aviso_%');
    if (f.acao === 'expulsao') query = query.eq('acao_tomada', 'expulsao');
    if (f.data_inicio) query = query.gte('created_at', new Date(`${f.data_inicio}T00:00:00-03:00`).toISOString());
    if (f.data_fim) query = query.lte('created_at', new Date(`${f.data_fim}T23:59:59-03:00`).toISOString());
    if (f.busca) {
      // Sanitize search input: remove PostgREST special chars that could manipulate the filter
      const sanitized = f.busca.replace(/[,.()"\\]/g, '');
      if (sanitized) {
        query = query.or(`nome_autor.ilike.%${sanitized}%,telefone_autor.ilike.%${sanitized}%`);
      }
    }

    const { data, count, error } = await query;

    if (!error) {
      setLogs((data as ModeracaoLog[]) || []);
      setLogsTotal(count || 0);
    }
    setLoadingLogs(false);
  }, [logsPage, logFilters]);

  const setLogsPageAndFetch = useCallback((page: number) => {
    setLogsPage(page);
    fetchLogs(page);
  }, [fetchLogs]);

  const setLogFiltersAndFetch = useCallback((filters: LogFilters) => {
    setLogFilters(filters);
    setLogsPage(1);
    fetchLogs(1, filters);
  }, [fetchLogs]);

  // ─── Initial load ───

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchGrupos(), fetchAcoesHoje(), fetchLogs(1, EMPTY_LOG_FILTERS)]);
    setLoading(false);
  }, [fetchGrupos, fetchAcoesHoje, fetchLogs]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ─── Realtime ───

  useEffect(() => {
    const channel = supabase
      .channel('moderacao_log_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'moderacao_log' },
        (payload) => {
          // Always update "Ações Hoje"
          fetchAcoesHoje();

          // If on page 1 with no conflicting filters, prepend the new log
          const hasFilters = logFilters.grupo_id || logFilters.tipo_violacao ||
            logFilters.acao || logFilters.data_inicio || logFilters.data_fim || logFilters.busca;

          if (logsPage === 1 && !hasFilters) {
            const newLog = payload.new as ModeracaoLog;
            setLogs(prev => {
              const updated = [newLog, ...prev];
              // Keep max LOGS_PER_PAGE items
              if (updated.length > LOGS_PER_PAGE) updated.pop();
              return updated;
            });
            setLogsTotal(prev => prev + 1);

            // Track new log for animation
            setNewLogId(newLog.id);
            if (newLogTimerRef.current) clearTimeout(newLogTimerRef.current);
            newLogTimerRef.current = setTimeout(() => setNewLogId(null), 2000);
          } else {
            // Just refetch to be safe
            fetchLogs();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (newLogTimerRef.current) clearTimeout(newLogTimerRef.current);
    };
  }, [fetchAcoesHoje, fetchLogs, logsPage, logFilters]);

  // ─── CRUD ───

  const updateGrupo = async (id: string, campos: Partial<ModeracaoGrupo>): Promise<string | null> => {
    const { error } = await supabase
      .from('moderacao_grupos')
      .update(campos)
      .eq('id', id);
    if (error) return error.message;
    await fetchGrupos();
    return null;
  };

  const deleteGrupo = async (id: string): Promise<string | null> => {
    const { error } = await supabase
      .from('moderacao_grupos')
      .delete()
      .eq('id', id);
    if (error) return error.message;
    await fetchGrupos();
    return null;
  };

  const insertGrupo = async (grupo: {
    grupo_id: string;
    grupo_nome: string;
    instancia: string;
    token_instancia: string;
    mensagem_aviso: string;
    mensagem_expulsao: string;
  }): Promise<string | null> => {
    const { error } = await supabase
      .from('moderacao_grupos')
      .insert({
        ...grupo,
        regras_ativas: {
          links_spam: true,
          palavroes: true,
          adulto: true,
          propaganda: true,
          captacao_leads: true,
          religiao: true,
          politica: true,
        },
      });
    if (error) return error.message;
    await fetchGrupos();
    return null;
  };

  const fetchInstanciasColeta = async (): Promise<InstanciaColeta[]> => {
    const expertId = useAuthStore.getState().getActiveExpertId();

    let query = supabase
      .from('whatsapp_rotacao')
      .select('id, nome, numero, instancia, token')
      .eq('tipo', 'seguranca')
      .eq('ativo', true)
      .order('ordem');

    if (expertId) {
      query = query.eq('expert_id', expertId);
    }

    const { data } = await query;
    return (data as InstanciaColeta[]) || [];
  };

  const fetchGruposWhatsapp = async (instancia: string, token: string): Promise<{ sucesso: boolean; mensagem?: string; total?: number }> => {
    try {
      const res = await fetchWithTimeout(WEBHOOKS.BUSCAR_GRUPOS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instancia, token, expert_id: useAuthStore.getState().getActiveExpertId() }),
      }, 60000);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      return { sucesso: data.sucesso ?? false, mensagem: data.mensagem, total: data.total };
    } catch {
      return { sucesso: false };
    }
  };

  return {
    grupos,
    logs,
    logsTotal,
    logsPage,
    logFilters,
    acoesHoje,
    loading,
    loadingLogs,
    newLogId,
    setLogsPageAndFetch,
    setLogFiltersAndFetch,
    updateGrupo,
    deleteGrupo,
    insertGrupo,
    fetchInstanciasColeta,
    fetchGruposWhatsapp,
    refetch: fetchAll,
  };
}
