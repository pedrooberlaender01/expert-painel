import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useToast } from '../hooks/useToast';
import { Toast } from '../components/Toast';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { user, loading, signIn } = useAuthStore();
  const navigate = useNavigate();
  const { toast, showToast, hideToast } = useToast();

  // If already authenticated, redirect based on role
  if (!loading && user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/'} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await signIn(email, password);

    if (result.success) {
      const currentUser = useAuthStore.getState().user;
      if (currentUser?.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } else {
      const message = translateError(result.error || 'Erro ao fazer login');
      setError(message);
      showToast('error', message);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid-pattern bg-[size:60px_60px] opacity-30" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#004AFF]/[0.03] rounded-full blur-[120px]" />

      <div className="w-full max-w-[400px] relative animate-slide-up">
        <div className="flex flex-col items-center mb-10">
          <h1 className="text-2xl font-bold text-txt font-display tracking-tight">Dashboard Leads</h1>
          <p className="text-txt-muted mt-1 text-sm font-light">Allan Cabral</p>
        </div>

        {/* Form card */}
        <div className="card-dark p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-txt-secondary mb-2 uppercase tracking-wider">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-dark"
                placeholder="seu@email.com"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-txt-secondary mb-2 uppercase tracking-wider">Senha</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-dark"
                placeholder="••••••••"
                disabled={submitting}
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Entrar</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-txt-dim text-xs mt-6 font-mono">v1.0 — Leads Management System</p>
      </div>
      {toast && <Toast toast={toast} onClose={hideToast} />}
    </div>
  );
};

function translateError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'Email ou senha incorretos.';
  if (msg.includes('Email not confirmed')) return 'Confirme seu email antes de fazer login.';
  if (msg.includes('Too many requests')) return 'Muitas tentativas. Aguarde um momento.';
  return msg;
}
