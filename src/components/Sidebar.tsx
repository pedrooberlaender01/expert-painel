import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Bot, UsersRound, Send, Trophy, MessageSquare, MessagesSquare, Phone, Settings, LogOut, ChevronLeft, ChevronRight, Lock, Gift, Headset } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useFeatureGates, PATH_FEATURE_MAP } from '../hooks/useFeatureGate';
import type { FeatureKey } from '../hooks/useFeatureGate';
import { useSectionGates, SECTION_PATH_MAP } from '../hooks/useSectionGate';
import type { SectionKey } from '../hooks/useSectionGate';
import { cn } from '../utils/cn';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isMobile?: boolean;
}

interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
  featureKey?: FeatureKey;
  sectionKey?: SectionKey;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle, isMobile }) => {
  const { user, impersonatedExpert, signOut } = useAuthStore();
  const navigate = useNavigate();
  const expert = impersonatedExpert || user?.expert;

  const featureGates = useFeatureGates(['torneio', 'copy_ia', 'moderacao', 'voz_clonada']);

  const sectionGates = useSectionGates(['dashboard', 'conversas', 'leads', 'grupos', 'envios', 'torneios', 'mensagens', 'central_whatsapp', 'premiacoes', 'suporte', 'envios_novo_agendamento', 'envios_agendados', 'envios_simulador', 'envios_gerar_copy']);

  // Resolve o path padrao do Envios escolhendo a primeira sub-aba nao oculta
  const enviosPath = (() => {
    const candidates: Array<{ key: 'envios_novo_agendamento' | 'envios_agendados' | 'envios_simulador' | 'envios_gerar_copy'; path: string }> = [
      { key: 'envios_novo_agendamento', path: '/envios/agendamentos' },
      { key: 'envios_agendados', path: '/envios/agendados' },
      { key: 'envios_simulador', path: '/envios/simulador' },
      { key: 'envios_gerar_copy', path: '/envios/gerar-copy' },
    ];
    const firstVisible = candidates.find((c) => sectionGates[c.key] !== 'hidden');
    return firstVisible?.path || '/envios/agendamentos';
  })();

  const navItems: NavItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', sectionKey: 'dashboard' },
    { icon: MessagesSquare, label: 'Conversas', path: '/conversas', sectionKey: 'conversas' },
    { icon: Bot, label: 'Leads Assistente', path: '/leads', sectionKey: 'leads' },
    { icon: UsersRound, label: 'Grupos', path: '/grupos', sectionKey: 'grupos' },
    { icon: Send, label: 'Envios', path: enviosPath, sectionKey: 'envios' },
    { icon: Trophy, label: 'Torneios', path: '/torneios', featureKey: 'torneio', sectionKey: 'torneios' },
    { icon: MessageSquare, label: 'Mensagens', path: '/mensagens', sectionKey: 'mensagens' },
    { icon: Phone, label: 'Central WhatsApp', path: '/central-whatsapp', sectionKey: 'central_whatsapp' },
    { icon: Gift, label: 'Premiacoes', path: '/premiacoes', sectionKey: 'premiacoes' },
    { icon: Headset, label: 'Suporte', path: '/suporte', sectionKey: 'suporte' },
    { icon: Settings, label: 'Configuracoes', path: '/configuracoes' },
  ];

  return (
    <aside className={cn(
      "sidebar-glass h-screen flex flex-col transition-all duration-300 shrink-0 relative",
      isMobile ? "flex w-full" : "hidden md:flex",
      !isMobile && (collapsed ? "w-[72px]" : "w-[260px]")
    )}>
      <div className={cn("p-5 border-b border-white/[0.04] relative h-[73px] flex items-center", collapsed && "px-3")}>
        <div className={cn("flex items-center w-full", collapsed ? "justify-center" : "justify-between")}>
          <div className={cn("flex items-center gap-2.5", collapsed && "justify-center")}>
            {expert?.logo_url ? (
              <img
                src={expert.logo_url}
                alt={expert.nome}
                className={cn("shrink-0 rounded-lg object-cover transition-all duration-300", collapsed ? "w-10 h-10" : "w-9 h-9")}
              />
            ) : (
              <div
                className={cn("shrink-0 rounded-lg flex items-center justify-center text-white font-bold font-display transition-all duration-300", collapsed ? "w-10 h-10 text-sm" : "w-9 h-9 text-xs")}
                style={{ background: 'var(--color-primary)' }}
              >
                {(expert?.nome || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
            )}
            {!collapsed && (
              <div>
                <h1 className="text-sm font-bold text-white tracking-tight font-display">
                  {expert?.nome || user?.nome || ''}
                </h1>
                <p className="text-[11px] text-white/[0.45] font-mono tracking-wide uppercase">
                  {expert?.nome_plataforma || 'Dashboard'}
                </p>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={onToggle}
              className="p-1.5 text-white/[0.45] hover:text-white hover:bg-white/[0.04] rounded-lg transition-all duration-200"
              aria-label="Recolher sidebar"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}
          {collapsed && (
            <button
              onClick={onToggle}
              className="absolute -right-3 top-6 bg-white/[0.04] backdrop-blur-xl border border-white/[0.04] shadow-lg z-10 p-1.5 text-white/[0.45] hover:text-white hover:bg-white/[0.06] rounded-lg transition-all duration-200"
              aria-label="Expandir sidebar"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto relative">
        {navItems.map((item) => {
          // Gating de secao (D-09) — prioridade sobre gating de feature
          const sectionKey = item.sectionKey || SECTION_PATH_MAP[item.path];
          const sectionState = sectionKey ? sectionGates[sectionKey] : 'enabled';

          // Hidden: nao renderiza nada
          if (sectionState === 'hidden') return null;

          // Disabled (cadeado): clicavel, navega para tela de secao bloqueada
          if (sectionState === 'disabled') {
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => cn(
                  "flex items-center px-3 py-2.5 text-[13px] font-medium relative group transition-all duration-200",
                  collapsed && "justify-center px-2",
                  isActive
                    ? "text-white/[0.25] bg-white/[0.02] rounded-r-lg rounded-l-none"
                    : "text-white/[0.15] hover:bg-white/[0.02] hover:text-white/[0.2] rounded-xl"
                )}
                title="Secao indisponivel no seu plano"
              >
                <item.icon className={cn("w-[18px] h-[18px] opacity-20", !collapsed && "mr-3")} />
                {!collapsed && (
                  <>
                    <span>{item.label}</span>
                    <Lock className="w-3 h-3 ml-auto" style={{ color: 'rgba(250, 204, 60, 0.4)' }} />
                  </>
                )}
              </NavLink>
            );
          }

          // Feature gate so aplica se secoes_habilitadas NAO tem configuracao explicita
          // Se o admin definiu 'enabled' em secoes_habilitadas, feature gate nao bloqueia
          const featureKey = item.featureKey || PATH_FEATURE_MAP[item.path];
          const gate = featureKey ? featureGates[featureKey] : null;
          const sectionExplicitlyEnabled = sectionKey && sectionGates[sectionKey] === 'enabled';
          const isGated = gate && !gate.hasFeature && !sectionExplicitlyEnabled;

          if (isGated) {
            return (
              <div
                key={item.path}
                className={cn(
                  "flex items-center px-3 py-2.5 text-[13px] font-medium relative cursor-not-allowed group",
                  collapsed && "justify-center px-2",
                  "text-white/[0.2]"
                )}
                title={`Disponivel no plano ${gate.requiredPlan}`}
              >
                <item.icon className={cn("w-[18px] h-[18px] opacity-30", !collapsed && "mr-3")} />
                {!collapsed && (
                  <>
                    <span>{item.label}</span>
                    <Lock className="w-3 h-3 ml-auto opacity-40" />
                  </>
                )}
                <div
                  className="absolute left-full ml-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
                  style={{ background: 'rgba(22, 27, 34, 0.97)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                >
                  Disponivel no plano {gate.requiredPlan}
                </div>
              </div>
            );
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                "flex items-center px-3 py-2.5 text-[13px] font-medium transition-all duration-200 group relative",
                collapsed && "justify-center px-2",
                isActive
                  ? "bg-primary-bg text-primary-light rounded-r-lg rounded-l-none"
                  : "text-white/[0.45] hover:bg-white/[0.04] hover:text-white/[0.7] rounded-xl"
              )}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
                  )}
                  <item.icon className={cn(
                    "w-[18px] h-[18px] transition-all duration-200",
                    !collapsed && "mr-3",
                    isActive ? "text-primary-light opacity-90" : "opacity-50 group-hover:opacity-90"
                  )} />
                  {!collapsed && <span>{item.label}</span>}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/[0.04] relative">
        <button
          onClick={() => {
            signOut();
            navigate('/login', { replace: true });
          }}
          className={cn(
            "flex items-center w-full px-3 py-2.5 rounded-xl text-[13px] font-medium text-white/[0.45] hover:bg-red-500/10 hover:text-red-400 transition-all duration-200",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut className={cn("w-[18px] h-[18px]", !collapsed && "mr-3")} />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
};
