import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User, ExpertProfile } from '../types/index';

interface AuthState {
  user: User | null;
  loading: boolean;
  loginAttempts: number;
  lockedUntil: number | null;
  // Impersonation state (session-only, not persisted)
  impersonatedExpertId: string | null;
  impersonatedExpert: ExpertProfile | null;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => void;
  initialize: () => void;
  isSessionExpired: () => boolean;
  isAdmin: () => boolean;
  getExpertId: () => string | null;
  startImpersonation: (expertId: string, expert: ExpertProfile) => void;
  stopImpersonation: () => void;
  getActiveExpertId: () => string | null;
}

const AUTH_KEY = 'dashboard-auth-user';
const AUTH_TIMESTAMP_KEY = 'dashboard-auth-timestamp';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

function getDelayMs(attempts: number): number {
  if (attempts >= 10) return 30000;
  if (attempts >= 5) return 5000;
  if (attempts >= 3) return 1000;
  return 0;
}

type AuthStoreSetter = (state: Partial<AuthState> | ((prev: AuthState) => Partial<AuthState>)) => void;

export const useAuthStore = create<AuthState>((set: AuthStoreSetter, get) => ({
  user: null,
  loading: true,
  loginAttempts: 0,
  lockedUntil: null,
  impersonatedExpertId: null,
  impersonatedExpert: null,

  signIn: async (email: string, password: string) => {
    const state = get();

    // Check brute force lockout
    if (state.lockedUntil && Date.now() < state.lockedUntil) {
      const remaining = Math.ceil((state.lockedUntil - Date.now()) / 1000);
      return { success: false, error: `Muitas tentativas. Aguarde ${remaining}s.` };
    }

    try {
      const { data, error } = await supabase.rpc('admin_login', {
        p_email: email,
        p_senha: password,
      });
      if (error) throw error;

      if (data?.success && data.user) {
        const user = data.user as User;
        localStorage.setItem(AUTH_KEY, JSON.stringify(user));
        localStorage.setItem(AUTH_TIMESTAMP_KEY, Date.now().toString());
        set({ user, loading: false, loginAttempts: 0, lockedUntil: null });
        return { success: true };
      }

      // Failed login — increment attempts and set delay
      const newAttempts = state.loginAttempts + 1;
      const delay = getDelayMs(newAttempts);
      set({
        loginAttempts: newAttempts,
        lockedUntil: delay > 0 ? Date.now() + delay : null,
      });

      return { success: false, error: data?.error || 'Erro ao fazer login' };
    } catch (err: unknown) {
      const newAttempts = state.loginAttempts + 1;
      const delay = getDelayMs(newAttempts);
      set({
        loginAttempts: newAttempts,
        lockedUntil: delay > 0 ? Date.now() + delay : null,
      });

      const message = err instanceof Error ? err.message : 'Erro ao fazer login';
      return { success: false, error: message };
    }
  },

  signOut: () => {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(AUTH_TIMESTAMP_KEY);
    set({ user: null, loading: false });
  },

  isSessionExpired: () => {
    const timestamp = localStorage.getItem(AUTH_TIMESTAMP_KEY);
    if (!timestamp) return true;
    return Date.now() - parseInt(timestamp, 10) > SESSION_DURATION_MS;
  },

  initialize: () => {
    const stored = localStorage.getItem(AUTH_KEY);
    if (stored) {
      try {
        // Check session expiration
        const timestamp = localStorage.getItem(AUTH_TIMESTAMP_KEY);
        if (!timestamp || Date.now() - parseInt(timestamp, 10) > SESSION_DURATION_MS) {
          localStorage.removeItem(AUTH_KEY);
          localStorage.removeItem(AUTH_TIMESTAMP_KEY);
          set({ user: null, loading: false });
          return;
        }

        const user = JSON.parse(stored) as User;
        set({ user, loading: false });

        // Refresh do perfil do expert em background para capturar mudancas feitas pelo admin
        if (user.role === 'expert' && user.expert_id) {
          supabase
            .from('experts')
            .select('secoes_habilitadas, cor_primaria, cor_secundaria, logo_url, favicon_url, nome_plataforma, nome_assistente, nome, ativo, planos(id, nome, max_leads, max_instancias, max_envios_mes, features_permitidas)')
            .eq('id', user.expert_id)
            .single()
            .then(({ data }) => {
              if (data && user.expert) {
                const planoData = data.planos as Record<string, unknown> | null;
                const updatedUser = {
                  ...user,
                  expert: {
                    ...user.expert,
                    secoes_habilitadas: data.secoes_habilitadas,
                    cor_primaria: data.cor_primaria,
                    cor_secundaria: data.cor_secundaria,
                    logo_url: data.logo_url,
                    favicon_url: data.favicon_url,
                    nome_plataforma: data.nome_plataforma,
                    nome_assistente: data.nome_assistente,
                    nome: data.nome,
                    ...(planoData ? { plano: planoData } : {}),
                  },
                };
                localStorage.setItem(AUTH_KEY, JSON.stringify(updatedUser));
                set({ user: updatedUser });
              }
            });
        }
      } catch {
        localStorage.removeItem(AUTH_KEY);
        localStorage.removeItem(AUTH_TIMESTAMP_KEY);
        set({ user: null, loading: false });
      }
    } else {
      set({ user: null, loading: false });
    }
  },

  isAdmin: () => get().user?.role === 'admin',

  getExpertId: () => get().user?.expert_id ?? null,

  startImpersonation: (expertId: string, expert: ExpertProfile) => {
    set({ impersonatedExpertId: expertId, impersonatedExpert: expert });
  },

  stopImpersonation: () => {
    set({ impersonatedExpertId: null, impersonatedExpert: null });
  },

  getActiveExpertId: () => get().impersonatedExpertId || get().getExpertId(),
}));
