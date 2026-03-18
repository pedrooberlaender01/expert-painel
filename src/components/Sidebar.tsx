import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, UsersRound, Activity, Send, Trophy, MessageSquare, MessagesSquare, Phone, Settings, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { cn } from '../utils/cn';
import LogoA from '../assets/Assinatura-A.svg';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const { signOut } = useAuthStore();
  const navigate = useNavigate();

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: MessagesSquare, label: 'Conversas', path: '/conversas' },
    { icon: Users, label: 'Leads Assistente', path: '/leads' },
    { icon: UsersRound, label: 'Grupos', path: '/grupos' },
    { icon: Activity, label: 'Monitoramento', path: '/funil' },
    { icon: Send, label: 'Envios', path: '/envios' },
    { icon: Trophy, label: 'Torneios', path: '/torneios' },
    { icon: MessageSquare, label: 'Mensagens', path: '/mensagens' },
    { icon: Phone, label: 'Central WhatsApp', path: '/central-whatsapp' },
    { icon: Settings, label: 'Configuracoes', path: '/configuracoes' },
  ];

  return (
    <aside className={cn(
      "bg-surface-50 border-r border-surface-300/20 h-screen flex flex-col hidden md:flex transition-all duration-300 shrink-0 relative",
      collapsed ? "w-[72px]" : "w-[260px]"
    )}>
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#004AFF]/[0.02] to-transparent pointer-events-none" />

      <div className={cn("p-5 border-b border-surface-300/20 relative h-[73px] flex items-center", collapsed && "px-3")}>
        <div className={cn("flex items-center w-full", collapsed ? "justify-center" : "justify-between")}>
          <div className={cn("flex items-center gap-2.5", collapsed && "justify-center")}>
            <img src={LogoA} alt="Logo" className={cn("shrink-0 transition-all duration-300", collapsed ? "w-10 h-10" : "w-9 h-9")} />
            {!collapsed && (
              <div>
                <h1 className="text-sm font-bold text-txt tracking-tight font-display">Allan Cabral</h1>
                <p className="text-[11px] text-[#A8A8B3] font-mono tracking-wide uppercase">Automações</p>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={onToggle}
              className="p-1.5 text-[#A8A8B3] hover:text-txt hover:bg-surface-200/50 rounded-lg transition-all duration-200"
              aria-label="Recolher sidebar"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}
          {collapsed && (
            <button
              onClick={onToggle}
              className="absolute -right-3 top-6 bg-surface-50 border border-surface-300/30 shadow-lg z-10 p-1.5 text-[#A8A8B3] hover:text-txt hover:bg-surface-200/50 rounded-lg transition-all duration-200"
              aria-label="Expandir sidebar"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto relative">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 group relative",
              collapsed && "justify-center px-2",
              isActive
                ? "bg-[#004AFF]/10 text-[#004AFF] border border-[#004AFF]/15 shadow-[inset_0_0_20px_rgba(0,74,255,0.03)]"
                : "text-[#D4D4DB] hover:bg-surface-200/40 hover:text-txt"
            )}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#004AFF] rounded-r-full" />
                )}
                <item.icon className={cn(
                  "w-[18px] h-[18px] transition-colors duration-200",
                  !collapsed && "mr-3",
                  isActive ? "text-[#004AFF]" : "text-[#A8A8B3] group-hover:text-[#D4D4DB]"
                )} />
                {!collapsed && <span>{item.label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-surface-300/20 relative">
        <button
          onClick={() => {
            signOut();
            navigate('/login', { replace: true });
          }}
          className={cn(
            "flex items-center w-full px-3 py-2.5 rounded-xl text-[13px] font-medium text-[#A8A8B3] hover:bg-red-500/10 hover:text-red-400 transition-all duration-200",
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
