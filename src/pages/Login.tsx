import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Loader2, ArrowRight, Lock, Mail } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useToast } from '../hooks/useToast';
import { Toast } from '../components/Toast';

// Tamanho da logo em px e texto em px — ajuste manual aqui
const LOGO_SIZE = 100;
const BRAND_TEXT_SIZE = 22;

// Paleta fixa do login — nao usa CSS variables (sao expert-specific)
const P = {
  dark: '#021024',
  mid: '#022659',
  blue: '#5483B3',
  light: '#7DA0CA',
  ice: '#C1E8FF',
};

const CAPABILITIES = [
  { title: 'WhatsApp', desc: 'Automacao inteligente de conversas e funil completo' },
  { title: 'Leads', desc: 'Captacao, qualificacao e conversao automatizada' },
  { title: 'Torneios', desc: 'Competicoes com ranking, greens e premiacao' },
  { title: 'Moderacao', desc: 'IA que classifica e modera grupos em tempo real' },
  { title: 'Copy IA', desc: 'Geracao de textos persuasivos com sua voz' },
  { title: 'Agendamentos', desc: 'Disparos em massa com recorrencia e templates' },
];

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
    <div className="min-h-screen flex" style={{ backgroundColor: P.dark }}>
      <style>{`
        @keyframes lg-rise {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes lg-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes lg-drift {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(6px, -8px); }
          66% { transform: translate(-4px, 4px); }
        }
        @keyframes lg-dash-flow {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -32; }
        }
        @keyframes lg-dash-flow-reverse {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: 36; }
        }
        @keyframes lg-dot-pulse {
          0%, 100% { opacity: 0.2; r: 2; }
          50% { opacity: 0.7; r: 3.5; }
        }
        @keyframes lg-orb-breathe {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes lg-vline-shimmer {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        .lg-rise { animation: lg-rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .lg-fade { animation: lg-fade 1s ease-out both; }
        .lg-drift { animation: lg-drift 20s ease-in-out infinite; }
        .lg-d1 { animation-delay: 80ms; }
        .lg-d2 { animation-delay: 160ms; }
        .lg-d3 { animation-delay: 240ms; }
        .lg-d4 { animation-delay: 320ms; }
        .lg-d5 { animation-delay: 400ms; }
        .lg-d6 { animation-delay: 480ms; }
        .lg-d7 { animation-delay: 560ms; }

        .lg-input:focus {
          border-color: ${P.blue} !important;
          box-shadow: 0 0 0 3px ${P.blue}25, 0 0 20px ${P.blue}10;
        }
        .lg-input::placeholder { color: rgba(255,255,255,0.25); }
        .lg-input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 30px ${P.dark} inset !important;
          -webkit-text-fill-color: #fff !important;
        }

        .lg-cap-item {
          position: relative;
          padding-left: 20px;
        }
        .lg-cap-item::before {
          content: '';
          position: absolute;
          left: 0;
          top: 8px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: ${P.blue};
          box-shadow: 0 0 8px ${P.blue}60;
        }
      `}</style>

      {/* ============================== */}
      {/* PAINEL ESQUERDO — Marca + Valor */}
      {/* ============================== */}
      <div
        className="hidden lg:flex lg:w-[54%] xl:w-[56%] relative flex-col overflow-hidden"
        style={{
          background: `linear-gradient(165deg, ${P.mid} 0%, ${P.dark} 60%, #010c1e 100%)`,
        }}
      >
        {/* Pelicula escura sobre o background */}
        <div
          className="absolute inset-0 z-[1] pointer-events-none"
          style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}
        />
        {/* Textura geometrica sutil */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Grade de pontos */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.035]">
            <defs>
              <pattern id="dots" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="#C1E8FF" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>

          {/* Linhas geometricas SVG com dash-flow */}
          <svg
            className="absolute top-0 right-0 w-[600px] h-[600px] lg-drift"
            viewBox="0 0 600 600"
            fill="none"
          >
            <path
              d="M 500 0 L 500 200 Q 500 300 400 300 L 200 300"
              stroke={P.blue}
              strokeWidth="0.5"
              strokeDasharray="8 8"
              opacity="0.3"
              style={{ animation: 'lg-dash-flow 4s linear infinite' }}
            />
            <path
              d="M 600 100 L 300 100 Q 200 100 200 200 L 200 500"
              stroke={P.light}
              strokeWidth="0.5"
              strokeDasharray="12 6"
              opacity="0.18"
              style={{ animation: 'lg-dash-flow-reverse 5s linear infinite' }}
            />
            <path
              d="M 100 0 L 100 150 Q 100 250 200 250 L 450 250"
              stroke={P.blue}
              strokeWidth="0.3"
              strokeDasharray="6 10"
              opacity="0.12"
              style={{ animation: 'lg-dash-flow 7s linear infinite' }}
            />
            <path
              d="M 350 600 L 350 400 Q 350 350 400 350 L 600 350"
              stroke={P.light}
              strokeWidth="0.3"
              strokeDasharray="8 12"
              opacity="0.1"
              style={{ animation: 'lg-dash-flow-reverse 6s linear infinite' }}
            />
            {/* Dots nos cruzamentos — com pulse */}
            <circle cx="500" cy="200" r="2.5" fill={P.blue} style={{ animation: 'lg-dot-pulse 3s ease-in-out infinite' }} />
            <circle cx="200" cy="300" r="2.5" fill={P.light} style={{ animation: 'lg-dot-pulse 3s ease-in-out 1s infinite' }} />
            <circle cx="200" cy="200" r="2" fill={P.ice} style={{ animation: 'lg-dot-pulse 4s ease-in-out 0.5s infinite' }} />
            <circle cx="100" cy="150" r="2" fill={P.blue} style={{ animation: 'lg-dot-pulse 3.5s ease-in-out 2s infinite' }} />
            <circle cx="350" cy="400" r="2" fill={P.light} style={{ animation: 'lg-dot-pulse 4s ease-in-out 1.5s infinite' }} />
          </svg>

          {/* Orb de luz principal — breathing lento */}
          <div
            className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full"
            style={{
              background: `radial-gradient(circle at 40% 40%, ${P.blue}12 0%, transparent 65%)`,
              animation: 'lg-orb-breathe 8s ease-in-out infinite, lg-drift 20s ease-in-out infinite',
            }}
          />

          {/* Orb secundaria — drift mais lento */}
          <div
            className="absolute bottom-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full"
            style={{
              background: `radial-gradient(circle, ${P.mid}40 0%, transparent 70%)`,
              animation: 'lg-orb-breathe 10s ease-in-out 2s infinite, lg-drift 25s ease-in-out 3s infinite',
            }}
          />

          {/* Linha vertical acento — shimmer */}
          <div
            className="absolute top-0 right-[38%] w-px h-full"
            style={{
              background: `linear-gradient(to bottom, transparent 0%, ${P.blue}18 30%, ${P.blue}08 70%, transparent 100%)`,
              animation: 'lg-vline-shimmer 5s ease-in-out infinite',
            }}
          />
        </div>

        {/* Conteudo */}
        <div className="relative z-10 flex flex-col h-full p-10 xl:p-14">
          {/* Header — marca */}
          <div className="lg-rise flex items-center gap-3">
            <img
              src="/logo-agiliza.svg"
              alt="AgilizaExpert"
              style={{ height: LOGO_SIZE }}
            />
            <span
              className="font-semibold tracking-tight"
              style={{ color: P.light, fontFamily: 'Sora, sans-serif', fontSize: BRAND_TEXT_SIZE }}
            >
              AgilizaExpert
            </span>
          </div>

          {/* Hero — centro vertical */}
          <div className="flex-1 flex flex-col justify-center max-w-[540px]">
            {/* Eyebrow */}
            <div
              className="lg-rise lg-d1 flex items-center gap-2 mb-6"
            >
              <div className="h-px w-8" style={{ backgroundColor: P.blue }} />
              <span
                className="text-[11px] font-semibold uppercase tracking-[0.2em]"
                style={{ color: P.blue }}
              >
                Plataforma completa para iGaming
              </span>
            </div>

            {/* Headline */}
            <h1
              className="lg-rise lg-d2 text-[2.5rem] xl:text-[3.2rem] font-extrabold leading-[1.05] tracking-[-0.02em] mb-6"
              style={{ fontFamily: 'Sora, sans-serif', color: '#fff' }}
            >
              Sua operacao de
              <br />
              iGaming, no{' '}
              <span
                style={{
                  background: `linear-gradient(135deg, ${P.ice} 0%, ${P.light} 50%, ${P.blue} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                proximo nivel.
              </span>
            </h1>

            {/* Descricao */}
            <p
              className="lg-rise lg-d3 text-[15px] xl:text-base leading-relaxed max-w-[420px] mb-12"
              style={{ color: `${P.light}cc` }}
            >
              Gerencie de forma automatica toda sua operacao em um
              painel: WhatsApp, comunidade, torneios e IA.
            </p>

            {/* Capabilities — tipografia, sem icones genericos */}
            <div className="space-y-4">
              {CAPABILITIES.map((cap, i) => (
                <div
                  key={i}
                  className={`lg-rise lg-d${Math.min(i + 2, 7)} lg-cap-item`}
                  style={{ animationDelay: `${200 + i * 80}ms` }}
                >
                  <div className="flex items-baseline gap-2">
                    <span
                      className="text-[13px] font-bold uppercase tracking-wide"
                      style={{ color: P.ice }}
                    >
                      {cap.title}
                    </span>
                    <span
                      className="text-[13px]"
                      style={{ color: `${P.light}90` }}
                    >
                      — {cap.desc}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ============================== */}
      {/* PAINEL DIREITO — Login Form     */}
      {/* ============================== */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-6 sm:px-10 relative"
        style={{ backgroundColor: P.dark }}
      >
        {/* Glow sutil atras do form */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
            style={{
              background: `radial-gradient(circle, ${P.mid}30 0%, transparent 65%)`,
            }}
          />
        </div>

        {/* Mobile: branding compacto */}
        <div className="lg:hidden lg-rise mb-10 text-center">
          <div className="flex flex-col items-center gap-2 mb-3">
            <img
              src="/logo-agiliza.svg"
              alt="AgilizaExpert"
              style={{ height: LOGO_SIZE - 4 }}
            />
            <span
              className="font-bold tracking-tight"
              style={{ color: '#fff', fontFamily: 'Sora, sans-serif', fontSize: BRAND_TEXT_SIZE - 2 }}
            >
              AgilizaExpert
            </span>
          </div>
          <p className="text-sm" style={{ color: `${P.light}80` }}>
            Plataforma completa para experts de iGaming
          </p>
        </div>

        {/* Form card */}
        <div className="w-full max-w-[400px] relative z-10 lg-rise lg-d1">
          <div
            className="rounded-2xl p-8 sm:p-10 relative"
            style={{
              background: `linear-gradient(160deg, rgba(7, 30, 62, 0.85) 0%, rgba(3, 18, 42, 0.9) 100%)`,
              border: `1px solid rgba(84, 131, 179, 0.18)`,
              boxShadow: `0 8px 40px rgba(1, 8, 20, 0.6), 0 0 0 1px rgba(84, 131, 179, 0.06), 0 -1px 0 0 rgba(125, 160, 202, 0.08) inset`,
            }}
          >
            {/* Header */}
            <div className="mb-8">
              <h2
                className="text-[22px] font-bold tracking-tight mb-1.5"
                style={{ color: '#fff', fontFamily: 'Sora, sans-serif' }}
              >
                Acesse sua conta
              </h2>
              <p className="text-sm" style={{ color: `${P.light}70` }}>
                Entre com suas credenciais para continuar
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label
                  className="block text-[11px] font-semibold mb-2 uppercase tracking-[0.15em]"
                  style={{ color: `${P.light}90` }}
                >
                  Email
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[15px] h-[15px] pointer-events-none"
                    style={{ color: `${P.light}50` }}
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="lg-input w-full h-11 pl-10 pr-4 rounded-xl text-sm outline-none transition-all duration-200"
                    style={{
                      backgroundColor: 'rgba(1, 10, 26, 0.7)',
                      border: '1px solid rgba(84, 131, 179, 0.15)',
                      color: '#fff',
                    }}
                    placeholder="seu@email.com"
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Senha */}
              <div>
                <label
                  className="block text-[11px] font-semibold mb-2 uppercase tracking-[0.15em]"
                  style={{ color: `${P.light}90` }}
                >
                  Senha
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[15px] h-[15px] pointer-events-none"
                    style={{ color: `${P.light}50` }}
                  />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="lg-input w-full h-11 pl-10 pr-4 rounded-xl text-sm outline-none transition-all duration-200"
                    style={{
                      backgroundColor: 'rgba(1, 10, 26, 0.7)',
                      border: '1px solid rgba(84, 131, 179, 0.15)',
                      color: '#fff',
                    }}
                    placeholder="••••••••"
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Erro */}
              {error && (
                <div
                  className="rounded-xl px-4 py-3 lg-rise"
                  style={{
                    backgroundColor: 'rgba(239,68,68,0.06)',
                    border: '1px solid rgba(239,68,68,0.12)',
                  }}
                >
                  <p className="text-sm" style={{ color: '#f87171' }}>
                    {error}
                  </p>
                </div>
              )}

              {/* Botao — gradient verde premium, white-label via --color-primary */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 flex items-center justify-center gap-2.5 rounded-xl text-[15px] font-bold tracking-wide group disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)',
                  color: '#fff',
                  boxShadow: '0 4px 15px rgba(var(--color-primary-rgb), 0.35), 0 1px 3px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)',
                  letterSpacing: '0.04em',
                  textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 6px 24px rgba(var(--color-primary-rgb), 0.45), 0 2px 6px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.2)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(var(--color-primary-rgb), 0.35), 0 1px 3px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(0.98)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>Entrar</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5" strokeWidth={2.5} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <p
            className="text-center text-[11px] mt-6 font-mono lg-fade lg-d6"
            style={{ color: `${P.light}40` }}
          >
            v2.0 — AgilizaExpert
          </p>
        </div>
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
