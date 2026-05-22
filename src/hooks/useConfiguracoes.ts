import { useState, useCallback } from 'react';
import { supabase } from '../backend/client';
import { useAuthStore } from '../stores/authStore';

interface PreferenciasUpdate {
  nome: string;
  notificar_novos_leads: boolean;
  notificar_conversoes: boolean;
}

interface UseConfiguracoesReturn {
  saving: boolean;
  salvarPreferencias: (data: PreferenciasUpdate) => Promise<string | null>;
  alterarSenha: (novaSenha: string) => Promise<string | null>;
}

export function useConfiguracoes(): UseConfiguracoesReturn {
  const { user } = useAuthStore();
  const [saving, setSaving] = useState(false);

  const salvarPreferencias = useCallback(async (data: PreferenciasUpdate): Promise<string | null> => {
    if (!user) return 'Usuário não autenticado';

    try {
      setSaving(true);

      const { error } = await supabase
        .from('dashboard_users')
        .update({
          nome: data.nome,
          notificar_novos_leads: data.notificar_novos_leads,
          notificar_conversoes: data.notificar_conversoes,
        } as Record<string, unknown>)
        .eq('id', user.id);

      if (error) throw new Error(error.message);

      return null;
    } catch (err: any) {
      console.error('Erro ao salvar preferências:', err);
      return err.message || 'Erro ao salvar preferências';
    } finally {
      setSaving(false);
    }
  }, [user]);

  const alterarSenha = useCallback(async (novaSenha: string): Promise<string | null> => {
    if (novaSenha.length < 6) return 'A senha deve ter pelo menos 6 caracteres';
    if (!user) return 'Usuário não autenticado';

    try {
      setSaving(true);

      const { data, error } = await supabase.rpc('solicitar_alteracao_senha', {
        p_admin_user_id: user.id,
        p_nova_senha: novaSenha,
      });
      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (!result.success) return result.error || 'Erro ao solicitar alteração';

      // Retornar null = sucesso (sem erro)
      return null;
    } catch (err: any) {
      console.error('Erro ao solicitar alteração de senha:', err);
      return err.message || 'Erro ao solicitar alteração';
    } finally {
      setSaving(false);
    }
  }, [user]);

  return { saving, salvarPreferencias, alterarSenha };
}
