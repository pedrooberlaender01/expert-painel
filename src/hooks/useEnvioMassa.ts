import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '../backend/client';
import type { EnvioMassaLeadRow, EnvioMassaRow, StatusLead } from '../types/database';
import { EnvioProgresso, EnvioLog } from '../types/envios';
import { WEBHOOKS, fetchWithTimeout } from '../config/webhooks';
import { useAuthStore } from '../stores/authStore';

// Lead filtrado com flag tem_nome
export interface LeadEnvio {
  id: string;
  telefone: string;
  nome: string | null;
  status: StatusLead;
  tem_nome: boolean;
}

interface FetchLeadsParams {
  statusSelecionados: StatusLead[];
  periodoInicio?: string | null;
  periodoFim?: string | null;
}

interface IniciarEnvioParams {
  leads: LeadEnvio[];
  tipo: 'texto' | 'audio';
  mensagemComNome: string;
  mensagemSemNome: string;
  intervaloSegundos: number;
  statusSelecionados: StatusLead[];
  periodoInicio?: string | null;
  periodoFim?: string | null;
  templateId?: string | null;
}

const WEBHOOK_URL = WEBHOOKS.DISPARO_MASSA;

export function useEnvioMassa() {
  const [leads, setLeads] = useState<LeadEnvio[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [progresso, setProgresso] = useState<EnvioProgresso | null>(null);
  const [envioId, setEnvioId] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  // Buscar leads filtrados do Supabase
  const fetchLeads = useCallback(async (params: FetchLeadsParams) => {
    const { statusSelecionados, periodoInicio, periodoFim } = params;

    if (statusSelecionados.length === 0) {
      setLeads([]);
      return;
    }

    try {
      setLoadingLeads(true);

      let query = supabase
        .from('leads')
        .select('id, telefone, nome, status')
        .in('status', statusSelecionados)
        .order('data_primeiro_contato', { ascending: false });

      if (periodoInicio) {
        query = query.gte('data_primeiro_contato', `${periodoInicio}T00:00:00`);
      }
      if (periodoFim) {
        query = query.lte('data_primeiro_contato', `${periodoFim}T23:59:59`);
      }

      const { data, error } = await query;

      if (error) throw new Error(error.message);

      const mapped: LeadEnvio[] = (data ?? []).map((l) => ({
        id: l.id,
        telefone: l.telefone,
        nome: l.nome,
        status: l.status,
        tem_nome: !!l.nome && l.nome.trim() !== '',
      }));

      setLeads(mapped);
    } catch (err: any) {
      console.error('Erro ao buscar leads para envio:', err);
      setLeads([]);
    } finally {
      setLoadingLeads(false);
    }
  }, []);

  // Polling de progresso via envios_massa + envios_massa_leads
  const startPolling = useCallback((id: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    const poll = async () => {
      const [envioResult, leadsResult] = await Promise.all([
        supabase.from('envios_massa').select('*').eq('id', id).single(),
        supabase
          .from('envios_massa_leads')
          .select('*')
          .eq('envio_id', id)
          .order('enviado_em', { ascending: true, nullsFirst: false }),
      ]);

      if (envioResult.error || leadsResult.error) return;

      const envio = envioResult.data as unknown as EnvioMassaRow;
      const leadsData = (leadsResult.data as unknown as EnvioMassaLeadRow[]) ?? [];

      const enviados = leadsData.filter((l) => l.status_envio === 'enviado').length;
      const erros = leadsData.filter((l) => l.status_envio === 'erro').length;
      const processados = enviados + erros;
      const total = envio.total_leads;

      const log: EnvioLog[] = leadsData.map((l) => ({
        lead_id: l.lead_id,
        telefone: l.telefone,
        nome: l.nome,
        status:
          l.status_envio === 'enviado'
            ? 'sucesso' as const
            : l.status_envio === 'erro'
            ? 'erro' as const
            : 'aguardando' as const,
        erro_mensagem: l.erro_mensagem ?? undefined,
        timestamp: l.enviado_em
          ? new Date(l.enviado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          : undefined,
      }));

      // Determinar status do envio
      let status: EnvioProgresso['status'];
      if (envio.status === 'concluido' || envio.status === 'cancelado') {
        status = 'concluido';
      } else if (envio.status === 'erro') {
        status = 'erro';
      } else if (processados > 0) {
        status = 'enviando';
      } else {
        status = 'preparando';
      }

      // Lead atual sendo enviado (último não-finalizado)
      const pendentes = leadsData.filter(
        (l) => l.status_envio !== 'enviado' && l.status_envio !== 'erro'
      );
      const atual =
        status === 'enviando' && pendentes.length > 0
          ? { id: pendentes[0].lead_id, telefone: pendentes[0].telefone, nome: pendentes[0].nome }
          : null;

      setProgresso({ total, enviados, erros, atual, status, log });

      // Parar polling quando concluído
      if (envio.status === 'concluido' || envio.status === 'cancelado' || envio.status === 'erro') {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }
    };

    // Poll imediatamente e depois a cada 3s
    poll();
    pollingRef.current = setInterval(poll, 3000);
  }, []);

  // Iniciar envio: cria registro + chama webhook
  const iniciarEnvio = useCallback(
    async (params: IniciarEnvioParams) => {
      cancelledRef.current = false;

      // Pre-send limit check (PLAN-06 hard block)
      const expert = useAuthStore.getState().impersonatedExpert || useAuthStore.getState().user?.expert;
      if (expert?.plano?.max_envios_mes !== null && expert?.plano?.max_envios_mes !== undefined) {
        const now = new Date();
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const { count } = await supabase
          .from('mensagens')
          .select('id', { count: 'exact', head: true })
          .eq('expert_id', expert.id)
          .eq('direcao', 'enviada')
          .gte('created_at', firstOfMonth);

        if (count !== null && count >= expert.plano.max_envios_mes) {
          throw new Error(`Limite de ${expert.plano.max_envios_mes} envios/mes atingido`);
        }
      }

      const {
        leads: leadsParaEnviar,
        tipo,
        mensagemComNome,
        mensagemSemNome,
        intervaloSegundos,
        statusSelecionados,
        periodoInicio,
        periodoFim,
        templateId,
      } = params;

      const leadsComNome = leadsParaEnviar.filter((l) => l.tem_nome).length;
      const leadsSemNome = leadsParaEnviar.filter((l) => !l.tem_nome).length;

      // Progresso inicial
      const logInicial: EnvioLog[] = leadsParaEnviar.map((lead) => ({
        lead_id: lead.id,
        telefone: lead.telefone,
        nome: lead.nome,
        status: 'aguardando' as const,
      }));

      setProgresso({
        total: leadsParaEnviar.length,
        enviados: 0,
        erros: 0,
        atual: null,
        status: 'preparando',
        log: logInicial,
      });

      try {
        // 1. Criar registro em envios_massa
        const { data: envioData, error: envioError } = await supabase
          .from('envios_massa')
          .insert({
            data_envio: new Date().toISOString(),
            tipo,
            mensagem_com_nome: mensagemComNome,
            mensagem_sem_nome: mensagemSemNome,
            status_selecionados: statusSelecionados,
            periodo_inicio: periodoInicio || null,
            periodo_fim: periodoFim || null,
            total_leads: leadsParaEnviar.length,
            leads_com_nome: leadsComNome,
            leads_sem_nome: leadsSemNome,
            leads_enviados: 0,
            leads_erro: 0,
            intervalo_segundos: intervaloSegundos,
            template_id: templateId || null,
            status: 'em_andamento' as const,
          })
          .select()
          .single();

        if (envioError) throw new Error(envioError.message);
        const envio = envioData as unknown as EnvioMassaRow | null;
        if (!envio) throw new Error('Envio não encontrado');
        setEnvioId(envio.id);

        // 2. Inserir leads no envios_massa_leads
        const leadsInsert = leadsParaEnviar.map((lead) => ({
          envio_id: envio.id,
          lead_id: lead.id,
          telefone: lead.telefone,
          nome: lead.nome,
          status_envio: 'enviado' as const, // placeholder — n8n vai atualizar
          erro_mensagem: null,
          enviado_em: null,
        }));

        const { error: leadsInsertError } = await supabase
          .from('envios_massa_leads')
          .insert(leadsInsert);

        if (leadsInsertError) {
          console.error('Erro ao inserir leads do envio:', leadsInsertError);
        }

        // 3. Chamar webhook do n8n
        if (WEBHOOK_URL) {
          const webhookPayload = {
            envio_id: envio.id,
            tipo,
            mensagem_com_nome: mensagemComNome,
            mensagem_sem_nome: mensagemSemNome,
            intervalo_segundos: intervaloSegundos,
            leads: leadsParaEnviar.map((l) => ({
              id: l.id,
              telefone: l.telefone,
              nome: l.nome,
              tem_nome: l.tem_nome,
            })),
          };

          try {
            await fetchWithTimeout(WEBHOOK_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(webhookPayload),
            });
          } catch (webhookErr) {
            console.error('Erro ao chamar webhook n8n:', webhookErr);
            // Não falha o envio — n8n pode estar offline
          }
        }

        // 4. Iniciar polling de progresso
        startPolling(envio.id);
      } catch (err: any) {
        console.error('Erro ao iniciar envio:', err);
        setProgresso((prev) =>
          prev ? { ...prev, status: 'erro' } : null
        );
      }
    },
    [startPolling]
  );

  const cancelar = useCallback(async () => {
    cancelledRef.current = true;
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    // Atualizar status no banco
    if (envioId) {
      await supabase
        .from('envios_massa')
        .update({ status: 'cancelado' })
        .eq('id', envioId);
    }

    setProgresso((prev) => (prev ? { ...prev, status: 'concluido' } : null));
  }, [envioId]);

  const resetar = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setProgresso(null);
    setEnvioId(null);
    cancelledRef.current = false;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  return {
    leads,
    loadingLeads,
    fetchLeads,
    iniciarEnvio,
    progresso,
    cancelar,
    resetar,
  };
}
