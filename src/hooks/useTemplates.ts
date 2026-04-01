import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../backend/client';
import { useAuthStore } from '../stores/authStore';
import type { TemplateMensagemRow } from '../types/database';

export type TemplateData = {
  nome: string;
  tipo: 'texto' | 'audio';
  mensagem_com_nome: string;
  mensagem_sem_nome: string;
};

interface UseTemplatesReturn {
  templates: TemplateMensagemRow[];
  loading: boolean;
  error: string | null;
  criar: (data: TemplateData) => Promise<TemplateMensagemRow | null>;
  atualizar: (id: string, data: TemplateData) => Promise<void>;
  excluir: (id: string) => Promise<void>;
  refresh: () => void;
}

export function useTemplates(): UseTemplatesReturn {
  const [templates, setTemplates] = useState<TemplateMensagemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const expertId = useAuthStore.getState().getActiveExpertId();
      let query = supabase
        .from('templates_mensagem')
        .select('*')
        .eq('ativo', true)
        .order('created_at', { ascending: false });
      if (expertId) query = query.eq('expert_id', expertId);
      const { data, error: fetchError } = await query;

      if (fetchError) throw new Error(fetchError.message);
      setTemplates((data as unknown as TemplateMensagemRow[]) ?? []);
    } catch (err: any) {
      console.error('Erro ao carregar templates:', err);
      setError(err.message || 'Erro ao carregar templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const criar = useCallback(async (data: TemplateData): Promise<TemplateMensagemRow | null> => {
    try {
      const expertId = useAuthStore.getState().getActiveExpertId();
      if (!expertId) throw new Error('Expert não identificado');
      const payload: Omit<TemplateMensagemRow, 'id' | 'created_at' | 'updated_at'> = {
        expert_id: expertId,
        nome: data.nome,
        tipo: data.tipo,
        mensagem_com_nome: data.mensagem_com_nome,
        mensagem_sem_nome: data.mensagem_sem_nome,
        ativo: true,
      };
      const { data: created, error } = await supabase
        .from('templates_mensagem')
        .insert(payload)
        .select()
        .single();

      if (error) throw new Error(error.message);

      const createdRow = created as unknown as TemplateMensagemRow | null;
      if (createdRow) {
        setTemplates((prev) => [createdRow, ...prev]);
      }
      return createdRow;
    } catch (err: any) {
      console.error('Erro ao criar template:', err);
      return null;
    }
  }, []);

  const atualizar = useCallback(async (id: string, data: TemplateData) => {
    try {
      const payload: Partial<Omit<TemplateMensagemRow, 'id' | 'created_at' | 'updated_at'>> = {
        nome: data.nome,
        tipo: data.tipo,
        mensagem_com_nome: data.mensagem_com_nome,
        mensagem_sem_nome: data.mensagem_sem_nome,
      };
      const { error } = await supabase
        .from('templates_mensagem')
        .update(payload)
        .eq('id', id);

      if (error) throw new Error(error.message);

      setTemplates((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, ...data, updated_at: new Date().toISOString() }
            : t
        )
      );
    } catch (err: any) {
      console.error('Erro ao atualizar template:', err);
    }
  }, []);

  const excluir = useCallback(async (id: string) => {
    // Soft delete — marca como inativo
    try {
      const { error } = await supabase
        .from('templates_mensagem')
        .update({ ativo: false } as Record<string, unknown>)
        .eq('id', id);

      if (error) throw new Error(error.message);

      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      console.error('Erro ao excluir template:', err);
    }
  }, []);

  const refresh = useCallback(() => {
    fetchTemplates(true);
  }, [fetchTemplates]);

  return { templates, loading, error, criar, atualizar, excluir, refresh };
}
