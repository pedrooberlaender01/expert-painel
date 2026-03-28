import type { ExpertRow, PlanoRow } from './database';

// Expert list item with joined plan and aggregated counts
export interface AdminExpertListItem {
  id: string;
  nome: string;
  slug: string;
  cor_primaria: string;
  ativo: boolean;
  plano_nome: string | null;
  leads_count: number;
  instancias_count: number;
}

// Form data for expert create/edit
export interface ExpertFormData {
  nome: string;
  slug: string;
  cor_primaria: string;
  cor_secundaria: string;
  logo_url: string | null;
  nome_plataforma: string;
  nome_assistente: string;
  voice_id: string | null;
  plano_id: string | null;
  ativo: boolean;
  // Credentials (only on create, optional on edit)
  email?: string;
  senha?: string;
}

// Dashboard global metrics
export interface AdminDashboardMetrics {
  total_leads: number;
  envios_mes: number;
  experts_ativos: number;
  experts_total: number;
  instancias_conectadas: number;
}

// Expert breakdown row for dashboard table
export interface ExpertBreakdownRow {
  expert_id: string;
  expert_nome: string;
  leads: number;
  envios: number;
  instancias: number;
  plano: string;
  ativo: boolean;
}

export type { ExpertRow, PlanoRow };
