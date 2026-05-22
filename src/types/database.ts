// ============================================================
// Tipos gerados a partir do schema do Supabase
// ============================================================

// --- Status do funil ---
export type StatusLead =
  | 'primeiro_audio_enviado'
  | 'convite_enviado'
  | 'interessado'
  | 'aguardando_cadastro'
  | 'link_enviado'
  | 'aguardando_confirmacao_entrada'
  | 'no_grupo'
  | 'entrou_grupo'
  | 'nao_interessado'
  | 'sem_resposta'
  | 'atendimento_manual'
  | 'lead_chegou';

// --- Status do assistente premium (manual) ---
export type StatusPremium =
  | 'primeiro_audio_enviado'
  | 'em_andamento'
  | 'encerrado';

export type TipoNotificacao = 'novo_lead' | 'interesse' | 'conversao' | 'saiu_grupo';

export type TipoTemplate = 'texto' | 'audio';

export type StatusEnvioMassa = 'em_andamento' | 'concluido' | 'cancelado' | 'erro';

export type StatusEnvioLead = 'enviado' | 'erro';

// --- Row types (o que vem do banco) ---

export interface LeadRow {
  id: string;
  expert_id: string;
  telefone: string;
  nome: string | null;
  origem: string;
  data_primeiro_contato: string | null;
  ultima_interacao: string | null;
  status: StatusLead;
  saudacao_enviada: string | null;
  resposta_comunidade: string | null;
  link_enviado_em: string | null;
  entrou_no_grupo: string | null;
  saiu_grupo: string | null;
  observacoes: string | null;
  id_grupo: string | null;
  nome_grupo: string | null;
  followup_enviado: string | null;
  followup_convite_enviado: string | null;
  followup_aguardando_cadastro: string | null;
  followup_saiu_grupo: string | null;
  pergunta_entrada_enviada: string | null;
  status_premium: StatusPremium | null;
  created_at: string;
  updated_at: string;
}

export interface LeadInsert {
  id?: string;
  expert_id?: string;  // Set by RLS/default in Phase 2
  telefone: string;
  nome?: string | null;
  origem?: string;
  data_primeiro_contato?: string | null;
  ultima_interacao?: string | null;
  status?: StatusLead;
  saudacao_enviada?: string | null;
  resposta_comunidade?: string | null;
  link_enviado_em?: string | null;
  entrou_no_grupo?: string | null;
  saiu_grupo?: string | null;
  observacoes?: string | null;
  id_grupo?: string | null;
  nome_grupo?: string | null;
  followup_enviado?: string | null;
  followup_convite_enviado?: string | null;
  followup_aguardando_cadastro?: string | null;
  followup_saiu_grupo?: string | null;
  pergunta_entrada_enviada?: string | null;
  status_premium?: StatusPremium | null;
}

export type LeadUpdate = Partial<LeadInsert>;

export interface NotificacaoRow {
  id: string;
  expert_id: string;
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string;
  lead_id: string | null;
  lida: boolean;
  created_at: string;
}

export interface TemplateMensagemRow {
  id: string;
  expert_id: string;
  nome: string;
  tipo: TipoTemplate;
  mensagem_com_nome: string;
  mensagem_sem_nome: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface EnvioMassaRow {
  id: string;
  data_envio: string;
  tipo: TipoTemplate;
  mensagem_com_nome: string;
  mensagem_sem_nome: string;
  status_selecionados: string[];
  periodo_inicio: string | null;
  periodo_fim: string | null;
  total_leads: number;
  leads_com_nome: number;
  leads_sem_nome: number;
  leads_enviados: number;
  leads_erro: number;
  intervalo_segundos: number;
  template_id: string | null;
  status: StatusEnvioMassa;
  created_at: string;
}

export interface EnvioMassaLeadRow {
  id: string;
  envio_id: string;
  lead_id: string;
  telefone: string;
  nome: string | null;
  status_envio: StatusEnvioLead;
  erro_mensagem: string | null;
  enviado_em: string | null;
}

export interface DashboardUserRow {
  id: string;
  user_id: string;
  email: string;
  nome: string;
  notificar_novos_leads: boolean;
  notificar_conversoes: boolean;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface MetricaDiariaRow {
  id: string;
  data: string;
  leads_total: number;
  responderam: number;
  interessados: number;
  no_grupo: number;
  leads_com_nome: number;
  link_enviado: number;
  nao_interessados: number;
  sem_resposta: number;
  saiu_grupo: number;
  created_at: string;
  updated_at: string;
}

export interface ConfiguracaoRow {
  id: string;
  expert_id: string;
  chave: string;
  valor: string;
  descricao: string | null;
  updated_at: string;
}

export interface MembrosGrupoRow {
  id: string;
  telefone: string;
  lead_id: string | null;
  grupo_id: string;
  grupo_nome: string | null;
  entrou_em: string | null;
  saiu_em: string | null;
  ativo: boolean;
  created_at: string;
}

export interface MensagemFunilRow {
  id: string;
  expert_id: string;
  secao: string;
  cenario: string;
  titulo: string;
  descricao: string;
  tipo_envio: string;
  mensagens: string[];
  variacoes: string[][] | null;
  tempo_espera_minutos: number | null;
  status_alvo: string | null;
  ordem: number;
  ativo: boolean;
  position_x: number | null;
  position_y: number | null;
  created_at: string;
  updated_at: string;
}

export interface WhatsappRotacaoRow {
  id: number;
  expert_id: string;
  nome: string;
  numero: string;
  ativo: boolean;
  ordem: number;
  instancia: string;
}

export interface WhatsappRotacaoMensagemRow {
  id: number;
  expert_id: string;
  mensagem: string;
  ativo: boolean;
  ordem: number;
}

// --- Views ---

export interface FunilStatusRow {
  status: StatusLead;
  total: number;
  percentual: number;
}

export interface MetricasHojeRow {
  leads_total: number;
  responderam: number;
  interessados: number;
  no_grupo: number;
  aguardando_resposta: number;
}

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  referencedRelation: string;
  referencedColumns: string[];
  isOneToOne?: boolean;
};

// --- Admin types ---

export interface AdminUserRow {
  id: string;
  email: string;
  nome: string;
  senha_hash: string;
  role: 'admin' | 'expert';
  expert_id: string | null;
  ativo: boolean;
  created_at: string;
  last_login: string | null;
}

// --- Multi-tenant types ---

export interface ExpertRow {
  id: string;
  nome: string;
  slug: string;
  cor_primaria: string;
  cor_secundaria: string;
  logo_url: string | null;
  nome_plataforma: string;
  nome_assistente: string;
  voice_id: string | null;
  voice_settings: Record<string, number> | null;
  secoes_habilitadas: Record<string, string | boolean> | null;
  plano_id: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExpertInsert {
  id?: string;
  nome: string;
  slug: string;
  cor_primaria?: string;
  cor_secundaria?: string;
  logo_url?: string | null;
  nome_plataforma?: string;
  nome_assistente?: string;
  voice_id?: string | null;
  voice_settings?: Record<string, number> | null;
  plano_id?: string | null;
  ativo?: boolean;
}

export type ExpertUpdate = Partial<ExpertInsert>;

export interface PlanoRow {
  id: string;
  nome: string;
  max_leads: number | null;
  max_instancias: number;
  max_envios_mes: number | null;
  features_permitidas: string[];
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlanoInsert {
  id?: string;
  nome: string;
  max_leads?: number | null;
  max_instancias?: number;
  max_envios_mes?: number | null;
  features_permitidas?: string[];
  ativo?: boolean;
}

export type PlanoUpdate = Partial<PlanoInsert>;

// --- Database type para o cliente tipado ---

export type Database = {
  public: {
    Tables: {
      leads: {
        Row: LeadRow;
        Insert: LeadInsert;
        Update: LeadUpdate;
        Relationships: Relationship[];
      };
      notificacoes: {
        Row: NotificacaoRow;
        Insert: Omit<NotificacaoRow, 'id' | 'created_at'>;
        Update: Partial<Omit<NotificacaoRow, 'id' | 'created_at'>>;
        Relationships: Relationship[];
      };
      templates_mensagem: {
        Row: TemplateMensagemRow;
        Insert: Omit<TemplateMensagemRow, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<TemplateMensagemRow, 'id' | 'created_at' | 'updated_at'>>;
        Relationships: Relationship[];
      };
      envios_massa: {
        Row: EnvioMassaRow;
        Insert: Omit<EnvioMassaRow, 'id' | 'created_at'>;
        Update: Partial<Omit<EnvioMassaRow, 'id' | 'created_at'>>;
        Relationships: Relationship[];
      };
      envios_massa_leads: {
        Row: EnvioMassaLeadRow;
        Insert: Omit<EnvioMassaLeadRow, 'id'>;
        Update: Partial<Omit<EnvioMassaLeadRow, 'id'>>;
        Relationships: Relationship[];
      };
      dashboard_users: {
        Row: DashboardUserRow;
        Insert: Omit<DashboardUserRow, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DashboardUserRow, 'id' | 'created_at' | 'updated_at'>>;
        Relationships: Relationship[];
      };
      metricas_diarias: {
        Row: MetricaDiariaRow;
        Insert: Omit<MetricaDiariaRow, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<MetricaDiariaRow, 'id' | 'created_at' | 'updated_at'>>;
        Relationships: Relationship[];
      };
      configuracoes: {
        Row: ConfiguracaoRow;
        Insert: Omit<ConfiguracaoRow, 'id' | 'updated_at'>;
        Update: Partial<Omit<ConfiguracaoRow, 'id' | 'updated_at'>>;
        Relationships: Relationship[];
      };
      membros_grupo: {
        Row: MembrosGrupoRow;
        Insert: Omit<MembrosGrupoRow, 'id' | 'created_at'>;
        Update: Partial<Omit<MembrosGrupoRow, 'id' | 'created_at'>>;
        Relationships: Relationship[];
      };
      mensagens_funil_v2: {
        Row: MensagemFunilRow;
        Insert: Omit<MensagemFunilRow, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<MensagemFunilRow, 'id' | 'created_at' | 'updated_at'>>;
        Relationships: Relationship[];
      };
      whatsapp_rotacao: {
        Row: WhatsappRotacaoRow;
        Insert: Omit<WhatsappRotacaoRow, 'id'>;
        Update: Partial<Omit<WhatsappRotacaoRow, 'id'>>;
        Relationships: Relationship[];
      };
      whatsapp_rotacao_mensagens: {
        Row: WhatsappRotacaoMensagemRow;
        Insert: Omit<WhatsappRotacaoMensagemRow, 'id'>;
        Update: Partial<Omit<WhatsappRotacaoMensagemRow, 'id'>>;
        Relationships: Relationship[];
      };
      experts: {
        Row: ExpertRow;
        Insert: ExpertInsert;
        Update: ExpertUpdate;
        Relationships: Relationship[];
      };
      planos: {
        Row: PlanoRow;
        Insert: PlanoInsert;
        Update: PlanoUpdate;
        Relationships: Relationship[];
      };
    };
    Views: {
      leads_aguardando: { Row: LeadRow; Relationships: Relationship[] };
      leads_hoje: { Row: LeadRow; Relationships: Relationship[] };
      funil_status: { Row: FunilStatusRow; Relationships: Relationship[] };
      metricas_hoje: { Row: MetricasHojeRow; Relationships: Relationship[] };
      notificacoes_nao_lidas: { Row: Omit<NotificacaoRow, 'titulo'>; Relationships: Relationship[] };
    };
    Functions: {
      get_metricas_periodo: {
        Args: Record<string, unknown>;
        Returns: unknown[];
      };
      get_metricas_dashboard: {
        Args: Record<string, unknown>;
        Returns: unknown[];
      };
      marcar_notificacoes_lidas: {
        Args: Record<string, unknown>;
        Returns: void;
      };
      buscar_leads_envio_massa: {
        Args: Record<string, unknown>;
        Returns: LeadRow[];
      };
      get_funil_status: {
        Args: Record<string, unknown>;
        Returns: FunilStatusRow[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
