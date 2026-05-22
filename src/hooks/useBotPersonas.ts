import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { WEBHOOKS, fetchWithTimeout } from '../config/webhooks';

// ─── Types ───

export interface BotPersona {
  id: string;
  nome: string;
  foto_url: string | null;
  idade: number | null;
  cidade: string | null;
  profissao: string | null;
  tom_voz: 'muito_informal' | 'casual' | 'neutro' | 'animado';
  girias: string[];
  emojis_favoritos: string[];
  exemplos_frases: string[];
  horario_inicio: string;
  horario_fim: string;
  msgs_por_dia_min: number;
  msgs_por_dia_max: number;
  chance_so_reagir: number;
  emojis_reacao: string[];
  warmup_dias: number;
  warmup_progressao: Record<string, number>;
  ausencia_habilitada: boolean;
  ausencia_frequencia_dias: number;
  ausencia_duracao_min: number;
  ausencia_duracao_max: number;
  blacklist_palavras: string[];
  blacklist_atitudes: string[];
  system_prompt_extra: string | null;
  template_origem_id: string | null;
  instancia_id: number | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  expert_id: string;
}

export interface BotPersonaTemplate {
  id: string;
  nome: string;
  nicho: string;
  descricao: string | null;
  config: Record<string, unknown>;
  ativo: boolean;
  created_at: string;
}

export type BotPersonaFormData = {
  nome: string;
  foto_url?: string | null;
  idade?: number | null;
  cidade?: string | null;
  profissao?: string | null;
  tom_voz: string;
  girias: string[];
  emojis_favoritos: string[];
  exemplos_frases: string[];
  horario_inicio: string;
  horario_fim: string;
  msgs_por_dia_min: number;
  msgs_por_dia_max: number;
  chance_so_reagir: number;
  emojis_reacao: string[];
  warmup_dias: number;
  warmup_progressao: Record<string, number>;
  ausencia_habilitada: boolean;
  ausencia_frequencia_dias: number;
  ausencia_duracao_min: number;
  ausencia_duracao_max: number;
  blacklist_palavras: string[];
  blacklist_atitudes: string[];
  system_prompt_extra?: string | null;
  template_origem_id?: string | null;
  instancia_id?: number | null;
  ativo?: boolean;
};

// ─── Defaults ───

export const PERSONA_DEFAULTS: BotPersonaFormData = {
  nome: '',
  foto_url: null,
  idade: null,
  cidade: null,
  profissao: null,
  tom_voz: 'casual',
  girias: [],
  emojis_favoritos: [],
  exemplos_frases: [],
  horario_inicio: '08:00',
  horario_fim: '23:00',
  msgs_por_dia_min: 3,
  msgs_por_dia_max: 10,
  chance_so_reagir: 40,
  emojis_reacao: ['🔥', '👏', '💰', '😂', '💪'],
  warmup_dias: 7,
  warmup_progressao: { semana1: 0.2, semana2: 0.5, semana3: 0.8, semana4: 1.0 },
  ausencia_habilitada: true,
  ausencia_frequencia_dias: 15,
  ausencia_duracao_min: 1,
  ausencia_duracao_max: 3,
  blacklist_palavras: [],
  blacklist_atitudes: [],
  system_prompt_extra: null,
  template_origem_id: null,
  ativo: true,
};

// ─── Hook ───

export function useBotPersonas() {
  const [personas, setPersonas] = useState<BotPersona[]>([]);
  const [templates, setTemplates] = useState<BotPersonaTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Listar personas ──
  const fetchPersonas = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const expertId = useAuthStore.getState().getActiveExpertId();
      let query = supabase
        .from('bot_personas')
        .select('*')
        .order('created_at', { ascending: false });
      if (expertId) query = query.eq('expert_id', expertId);

      const { data, error: fetchError } = await query;
      if (fetchError) throw new Error(fetchError.message);
      setPersonas((data as unknown as BotPersona[]) ?? []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar personas';
      console.error('Erro ao carregar personas:', err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPersonas();
  }, [fetchPersonas]);

  // ── Listar templates ──
  const fetchTemplates = useCallback(async () => {
    try {
      setLoadingTemplates(true);
      const { data, error: fetchError } = await supabase
        .from('bot_persona_templates')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (fetchError) throw new Error(fetchError.message);
      setTemplates((data as unknown as BotPersonaTemplate[]) ?? []);
    } catch (err: unknown) {
      console.error('Erro ao carregar templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  // ── Criar persona ──
  const criarPersona = useCallback(async (formData: BotPersonaFormData): Promise<BotPersona | null> => {
    try {
      const expertId = useAuthStore.getState().getActiveExpertId();
      if (!expertId) throw new Error('Expert não identificado');

      const payload = {
        ...formData,
        expert_id: expertId,
      };

      const { data, error } = await supabase
        .from('bot_personas')
        .insert(payload)
        .select()
        .single();

      if (error) throw new Error(error.message);

      const created = data as unknown as BotPersona;
      if (created) setPersonas((prev) => [created, ...prev]);
      return created;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar persona';
      console.error('Erro ao criar persona:', err);
      throw new Error(msg);
    }
  }, []);

  // ── Editar persona ──
  const editarPersona = useCallback(async (id: string, formData: Partial<BotPersonaFormData>): Promise<void> => {
    try {
      const { error } = await supabase
        .from('bot_personas')
        .update(formData)
        .eq('id', id);

      if (error) throw new Error(error.message);

      setPersonas((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, ...formData, updated_at: new Date().toISOString() } : p
        )
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar persona';
      console.error('Erro ao atualizar persona:', err);
      throw new Error(msg);
    }
  }, []);

  // ── Deletar persona ──
  const deletarPersona = useCallback(async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('bot_personas')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);

      setPersonas((prev) => prev.filter((p) => p.id !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir persona';
      console.error('Erro ao excluir persona:', err);
      throw new Error(msg);
    }
  }, []);

  // ── Criar de template ──
  const criarDeTemplate = useCallback(async (templateId: string): Promise<BotPersonaFormData> => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) throw new Error('Template não encontrado');

    const config = template.config as Record<string, unknown>;

    return {
      nome: template.nome,
      foto_url: null,
      idade: null,
      cidade: null,
      profissao: null,
      tom_voz: (config.tom_voz as string) || 'casual',
      girias: (config.girias as string[]) || [],
      emojis_favoritos: (config.emojis_favoritos as string[]) || [],
      exemplos_frases: (config.exemplos_frases as string[]) || [],
      horario_inicio: (config.horario_inicio as string) || '08:00',
      horario_fim: (config.horario_fim as string) || '23:00',
      msgs_por_dia_min: (config.msgs_por_dia_min as number) || 3,
      msgs_por_dia_max: (config.msgs_por_dia_max as number) || 10,
      chance_so_reagir: (config.chance_so_reagir as number) || 40,
      emojis_reacao: (config.emojis_reacao as string[]) || ['🔥', '👏', '💰', '😂', '💪'],
      warmup_dias: (config.warmup_dias as number) || 7,
      warmup_progressao: (config.warmup_progressao as Record<string, number>) || PERSONA_DEFAULTS.warmup_progressao,
      ausencia_habilitada: config.ausencia_habilitada !== false,
      ausencia_frequencia_dias: (config.ausencia_frequencia_dias as number) || 15,
      ausencia_duracao_min: (config.ausencia_duracao_min as number) || 1,
      ausencia_duracao_max: (config.ausencia_duracao_max as number) || 3,
      blacklist_palavras: (config.blacklist_palavras as string[]) || [],
      blacklist_atitudes: (config.blacklist_atitudes as string[]) || [],
      system_prompt_extra: null,
      template_origem_id: templateId,
      ativo: true,
    };
  }, [templates]);

  // ── Configurar perfil WhatsApp via n8n ──
  const configurarPerfilWpp = useCallback(async (instancia: string, token: string, nome: string, foto_url?: string): Promise<void> => {
    try {
      const response = await fetchWithTimeout(WEBHOOKS.BOT_CONFIGURAR_PERFIL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instancia, token, nome, foto_url: foto_url || '' }),
      });
      if (!response.ok) throw new Error('Falha ao configurar perfil WhatsApp');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao configurar perfil WhatsApp';
      throw new Error(msg);
    }
  }, []);

  // ── Duplicar persona ──
  const duplicarPersona = useCallback(async (persona: BotPersona): Promise<BotPersona | null> => {
    const formData: BotPersonaFormData = {
      nome: `Cópia de ${persona.nome}`,
      foto_url: persona.foto_url,
      idade: persona.idade,
      cidade: persona.cidade,
      profissao: persona.profissao,
      tom_voz: persona.tom_voz,
      girias: persona.girias,
      emojis_favoritos: persona.emojis_favoritos,
      exemplos_frases: persona.exemplos_frases,
      horario_inicio: persona.horario_inicio,
      horario_fim: persona.horario_fim,
      msgs_por_dia_min: persona.msgs_por_dia_min,
      msgs_por_dia_max: persona.msgs_por_dia_max,
      chance_so_reagir: persona.chance_so_reagir,
      emojis_reacao: persona.emojis_reacao,
      warmup_dias: persona.warmup_dias,
      warmup_progressao: persona.warmup_progressao,
      ausencia_habilitada: persona.ausencia_habilitada,
      ausencia_frequencia_dias: persona.ausencia_frequencia_dias,
      ausencia_duracao_min: persona.ausencia_duracao_min,
      ausencia_duracao_max: persona.ausencia_duracao_max,
      blacklist_palavras: persona.blacklist_palavras,
      blacklist_atitudes: persona.blacklist_atitudes,
      system_prompt_extra: persona.system_prompt_extra,
      template_origem_id: persona.template_origem_id,
      ativo: true,
    };
    return criarPersona(formData);
  }, [criarPersona]);

  return {
    personas,
    templates,
    loading,
    loadingTemplates,
    error,
    fetchPersonas,
    fetchTemplates,
    criarPersona,
    editarPersona,
    deletarPersona,
    criarDeTemplate,
    duplicarPersona,
    configurarPerfilWpp,
    refresh: () => fetchPersonas(true),
  };
}
