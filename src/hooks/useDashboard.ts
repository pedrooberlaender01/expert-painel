import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../backend/client';
import { useVisibilityRefresh } from './useVisibilityRefresh';
import { useAuthStore } from '../stores/authStore';
import type { LeadRow } from '../types/database';

// --- Types ---

export interface DashboardMetricas {
  leads_hoje: number;
  leads_ontem: number;
  taxa_conversao: number;
  aguardando_resposta: number;
  total_leads: number;
  total_no_grupo: number;
}

export interface MetricaPeriodo {
  data: string;
  data_formatada: string;
  leads_total: number;
  interessados: number;
  no_grupo: number;
}

interface UseDashboardReturn {
  metricas: DashboardMetricas | null;
  chartData: MetricaPeriodo[];
  leadsPeriodo: LeadRow[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

// --- Fetch helpers ---

type MetricasDashboardRow = {
  leads_hoje: number;
  leads_ontem: number;
  taxa_conversao: number;
  aguardando_resposta: number;
  total_leads: number;
  total_no_grupo: number;
};

async function fetchMetricasDashboard(): Promise<DashboardMetricas> {
  const { data, error } = await supabase.rpc('get_metricas_dashboard') as unknown as {
    data: MetricasDashboardRow | MetricasDashboardRow[] | null;
    error: unknown;
  };

  if (error) {
    const message = typeof error === 'object' && error && 'message' in error
      ? String((error as { message: unknown }).message)
      : 'Erro ao carregar métricas';
    throw new Error(message);
  }

  // RPC can return array or single object depending on how it's defined
  const row = (Array.isArray(data) ? data[0] : data) ?? ({} as Partial<MetricasDashboardRow>);
  return {
    leads_hoje: row?.leads_hoje ?? 0,
    leads_ontem: row?.leads_ontem ?? 0,
    taxa_conversao: row?.taxa_conversao ?? 0,
    aguardando_resposta: row?.aguardando_resposta ?? 0,
    total_leads: row?.total_leads ?? 0,
    total_no_grupo: row?.total_no_grupo ?? 0,
  };
}

function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Normaliza timestamp do Postgres ("2026-02-25 18:07:15.193+00") para formato ISO valido
function parseTimestamp(ts: string): Date {
  return new Date(ts.replace(' ', 'T'));
}

// Converte inicio/fim do dia LOCAL para UTC ISO (respeita fuso horario do usuario)
function localStartOfDayUTC(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toISOString();
}

function localEndOfDayUTC(dateStr: string): string {
  return new Date(`${dateStr}T23:59:59.999`).toISOString();
}

async function fetchMetricasPeriodo(dias: number): Promise<MetricaPeriodo[]> {
  const hoje = new Date();
  const inicio = new Date();
  inicio.setDate(hoje.getDate() - (dias - 1));

  const inicioStr = formatLocalDate(inicio);
  const hojeStr = formatLocalDate(hoje);

  // Busca apenas leads com data_primeiro_contato preenchida no periodo
  // Usa limites convertidos para UTC para respeitar o fuso do usuario
  const expertId = useAuthStore.getState().getActiveExpertId();
  let query = supabase
    .from('leads')
    .select('data_primeiro_contato, resposta_comunidade, entrou_no_grupo')
    .not('data_primeiro_contato', 'is', null)
    .gte('data_primeiro_contato', localStartOfDayUTC(inicioStr))
    .lte('data_primeiro_contato', localEndOfDayUTC(hojeStr));
  if (expertId) query = query.eq('expert_id', expertId);
  const { data, error } = await query;

  if (error) throw new Error(error.message);
  if (!data) return [];

  // Inicializa todos os dias do periodo com zeros
  const grouped: Record<string, { total: number; interessados: number; no_grupo: number }> = {};
  for (let i = 0; i < dias; i++) {
    const d = new Date();
    d.setDate(hoje.getDate() - (dias - 1 - i));
    grouped[formatLocalDate(d)] = { total: 0, interessados: 0, no_grupo: 0 };
  }

  // Agrupa leads por data local
  for (const lead of data as any[]) {
    if (!lead.data_primeiro_contato) continue;
    const dateKey = formatLocalDate(parseTimestamp(lead.data_primeiro_contato));
    if (!grouped[dateKey]) continue;

    grouped[dateKey].total += 1;

    // Interessado = resposta_comunidade preenchida com "sim"
    if (lead.resposta_comunidade === 'sim') {
      grouped[dateKey].interessados += 1;
    }

    // No grupo = entrou_no_grupo preenchido (tem data)
    if (lead.entrou_no_grupo) {
      grouped[dateKey].no_grupo += 1;
    }
  }

  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateStr, counts]) => ({
      data: dateStr,
      data_formatada: '',
      leads_total: counts.total,
      interessados: counts.interessados,
      no_grupo: counts.no_grupo,
    }));
}

async function fetchLeadsPeriodo(inicio: string, fim: string): Promise<LeadRow[]> {
  const expertId = useAuthStore.getState().getActiveExpertId();
  let query = supabase
    .from('leads')
    .select('*')
    .not('data_primeiro_contato', 'is', null)
    .gte('data_primeiro_contato', localStartOfDayUTC(inicio))
    .lte('data_primeiro_contato', localEndOfDayUTC(fim))
    .order('data_primeiro_contato', { ascending: false });
  if (expertId) query = query.eq('expert_id', expertId);
  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return (data as unknown as LeadRow[]) ?? [];
}

// --- Hook ---

const AUTO_REFRESH_MS = 30_000;

export function useDashboard(
  dias: number = 7,
  kpiInicio: string = formatLocalDate(new Date()),
  kpiFim: string = formatLocalDate(new Date()),
): UseDashboardReturn {
  const [metricas, setMetricas] = useState<DashboardMetricas | null>(null);
  const [chartData, setChartData] = useState<MetricaPeriodo[]>([]);
  const [leadsPeriodo, setLeadsPeriodo] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const deriveMetricas = useCallback((rows: LeadRow[]): DashboardMetricas => {
    const totalLeads = rows.length;
    const leadsNoGrupo = rows.filter(l => !!l.entrou_no_grupo).length;
    const leadsWaiting = rows.filter(l => l.status === 'sem_resposta').length;
    const taxa = totalLeads > 0 ? Math.round((leadsNoGrupo / totalLeads) * 100) : 0;
    return {
      leads_hoje: totalLeads,
      leads_ontem: 0,
      taxa_conversao: taxa,
      aguardando_resposta: leadsWaiting,
      total_leads: totalLeads,
      total_no_grupo: leadsNoGrupo,
    };
  }, []);

  const errorToMessage = useCallback((err: unknown) => {
    if (typeof err === 'object' && err && 'message' in err) {
      return String((err as { message: unknown }).message);
    }
    return 'Erro ao carregar dados';
  }, []);

  const load = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout ao carregar dados')), 25000);
      });

      const [metRes, chartRes, leadsRes] = await Promise.race([
        Promise.allSettled([
          fetchMetricasDashboard(),
          fetchMetricasPeriodo(dias),
          fetchLeadsPeriodo(kpiInicio, kpiFim),
        ]),
        timeoutPromise,
      ]);

      if (metRes.status === 'fulfilled') {
        setMetricas(metRes.value);
      }
      if (chartRes.status === 'fulfilled') {
        setChartData(chartRes.value);
      }
      if (leadsRes.status === 'fulfilled') {
        setLeadsPeriodo(leadsRes.value);
        if (metRes.status === 'rejected') {
          setMetricas(deriveMetricas(leadsRes.value));
        }
      }

      const firstError = [metRes, chartRes, leadsRes].find(r => r.status === 'rejected') as
        | PromiseRejectedResult
        | undefined;
      if (firstError) {
        const message = errorToMessage(firstError.reason);
        setError(message);
        console.error('Erro ao carregar dashboard:', message);
      }
    } catch (err: any) {
      console.error('Erro ao carregar dashboard:', err);
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [deriveMetricas, dias, errorToMessage, kpiInicio, kpiFim]);

  // Initial load + reload when 'dias' changes or session refreshes
  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresh every 30 seconds (silent, no loading spinner)
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      load(false);
    }, AUTO_REFRESH_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [load]);

  // Realtime: refresh when leads change
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-leads-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        () => { load(false); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [load]);

  // Refetch quando a aba volta ao foco ou rede reconecta
  useVisibilityRefresh(() => load(false));

  const refresh = useCallback(() => {
    load(true);
  }, [load]);

  return { metricas, chartData, leadsPeriodo, loading, error, refresh };
}
