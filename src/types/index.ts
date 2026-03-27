export type StatusLead =
  | "primeiro_audio_enviado"
  | "convite_enviado"
  | "interessado"
  | "aguardando_cadastro"
  | "link_enviado"
  | "aguardando_confirmacao_entrada"
  | "no_grupo"
  | "entrou_grupo"
  | "nao_interessado"
  | "sem_resposta"
  | "atendimento_manual"
  | "lead_chegou";

export type StatusPremium =
  | "primeiro_audio_enviado"
  | "em_andamento"
  | "encerrado";

export interface Lead {
  id: string;
  expert_id: string;
  telefone: string;
  nome: string | null;
  origem: string;
  data_primeiro_contato: string;
  status: StatusLead;
  ultima_interacao: string;
  saudacao_enviada: "bom_dia" | "boa_tarde" | "boa_noite";
  followup_enviado: string | null;
  resposta_comunidade: "sim" | "nao" | null;
  link_enviado_em: string | null;
  entrou_no_grupo: string | null;
  observacoes: string | null;
}

export interface Notificacao {
  id: string;
  tipo: "novo_lead" | "interesse" | "conversao" | "alerta";
  mensagem: string;
  data: string;
  lida: boolean;
}

export interface MetricaDiaria {
  data: string;
  leads_total: number;
  responderam: number;
  interessados: number;
  no_grupo: number;
}

export interface User {
  email: string;
  nome: string;
}
