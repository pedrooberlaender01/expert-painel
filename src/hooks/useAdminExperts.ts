import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { AdminExpertListItem, ExpertFormData } from '../types/admin';
import type { ExpertRow, PlanoRow } from '../types/database';

// Instance data returned by admin_get_expert RPC (safe subset, no tokens)
interface ExpertInstance {
  id: number;
  nome: string;
  numero: string;
  instancia: string;
  ativo: boolean;
}

export interface ExpertDetail {
  expert: ExpertRow;
  planos: PlanoRow[];
  instancias: ExpertInstance[];
  credentials: { email: string } | null;
}

interface UseAdminExpertsReturn {
  experts: AdminExpertListItem[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  toggleExpert: (expertId: string, ativo: boolean) => Promise<{ success: boolean; error?: string }>;
  deleteExpert: (expertId: string) => Promise<{ success: boolean; error?: string }>;
  createExpert: (data: ExpertFormData) => Promise<{ success: boolean; error?: string; expert_id?: string }>;
  updateExpert: (expertId: string, data: ExpertFormData) => Promise<{ success: boolean; error?: string }>;
  getExpertDetail: (expertId: string) => Promise<{ data: ExpertDetail | null; error: string | null }>;
  uploadLogo: (file: File) => Promise<{ url: string | null; error: string | null }>;
}

export function useAdminExperts(): UseAdminExpertsReturn {
  const [experts, setExperts] = useState<AdminExpertListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExperts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('admin_list_experts');
      if (rpcError) throw rpcError;
      setExperts((data as AdminExpertListItem[]) || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar experts';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchExperts(); }, [fetchExperts]);

  const toggleExpert = useCallback(async (expertId: string, ativo: boolean) => {
    const { data, error: rpcError } = await supabase.rpc('admin_toggle_expert', {
      p_expert_id: expertId, p_ativo: ativo,
    });
    if (rpcError) return { success: false, error: rpcError.message };
    const result = data as { success: boolean; error?: string };
    if (result.success) fetchExperts();
    return result;
  }, [fetchExperts]);

  const deleteExpert = useCallback(async (expertId: string) => {
    const { data, error: rpcError } = await supabase.rpc('admin_delete_expert', {
      p_expert_id: expertId,
    });
    if (rpcError) return { success: false, error: rpcError.message };
    const result = data as { success: boolean; error?: string };
    if (result.success) fetchExperts();
    return result;
  }, [fetchExperts]);

  const createExpert = useCallback(async (formData: ExpertFormData) => {
    const { data, error: rpcError } = await supabase.rpc('admin_create_expert', {
      p_nome: formData.nome,
      p_slug: formData.slug,
      p_cor_primaria: formData.cor_primaria,
      p_cor_secundaria: formData.cor_secundaria,
      p_logo_url: formData.logo_url,
      p_favicon_url: formData.favicon_url,
      p_nome_plataforma: formData.nome_plataforma,
      p_nome_assistente: formData.nome_assistente,
      p_voice_id: formData.voice_id,
      p_plano_id: formData.plano_id,
      p_secoes_habilitadas: formData.secoes_habilitadas,
      p_email: formData.email || '',
      p_senha: formData.senha || '',
    });
    if (rpcError) return { success: false, error: rpcError.message };
    const result = data as { success: boolean; error?: string; expert_id?: string };
    if (result.success) fetchExperts();
    return result;
  }, [fetchExperts]);

  const updateExpert = useCallback(async (expertId: string, formData: ExpertFormData) => {
    const { data, error: rpcError } = await supabase.rpc('admin_update_expert', {
      p_expert_id: expertId,
      p_nome: formData.nome,
      p_slug: formData.slug,
      p_cor_primaria: formData.cor_primaria,
      p_cor_secundaria: formData.cor_secundaria,
      p_logo_url: formData.logo_url,
      p_favicon_url: formData.favicon_url,
      p_nome_plataforma: formData.nome_plataforma,
      p_nome_assistente: formData.nome_assistente,
      p_voice_id: formData.voice_id,
      p_plano_id: formData.plano_id,
      p_ativo: formData.ativo,
      p_secoes_habilitadas: formData.secoes_habilitadas,
    });
    if (rpcError) return { success: false, error: rpcError.message };
    const result = data as { success: boolean; error?: string };
    if (result.success) fetchExperts();
    return result;
  }, [fetchExperts]);

  const getExpertDetail = useCallback(async (expertId: string) => {
    const { data, error: rpcError } = await supabase.rpc('admin_get_expert', { p_expert_id: expertId });
    if (rpcError) return { data: null, error: rpcError.message };
    return { data: data as ExpertDetail, error: null };
  }, []);

  const uploadLogo = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('expert-logos')
      .upload(fileName, file, { cacheControl: '3600', upsert: false });
    if (uploadError) return { url: null, error: uploadError.message };
    const { data: urlData } = supabase.storage.from('expert-logos').getPublicUrl(fileName);
    return { url: urlData.publicUrl, error: null };
  }, []);

  return {
    experts,
    loading,
    error,
    refresh: fetchExperts,
    toggleExpert,
    deleteExpert,
    createExpert,
    updateExpert,
    getExpertDetail,
    uploadLogo,
  };
}
