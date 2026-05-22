import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Users, CreditCard, BarChart3, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { cn } from '../../utils/cn';

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isMobile?: boolean;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ collapsed, onToggle, isMobile }) => {
  const { signOut } = useAuthStore();
  const navigate = useNavigate();

  const navItems = [
    { icon: Users, label: 'Experts', path: '/admin/experts' },
    { icon: CreditCard, label: 'Planos', path: '/admin/planos' },
    { icon: BarChart3, label: 'Dashboard Global', path: '/admin' },
  ];

  return (
    <aside className={cn(
      "sidebar-glass h-screen flex flex-col transition-all duration-300 shrink-0 relative",
      isMobile ? "flex w-[260px]" : "hidden md:flex",
      !isMobile && (collapsed ? "w-[72px]" : "w-[260px]")
    )}>
      {/* Header - "Admin Master" branding */}
      <div className={cn("p-5 border-b border-white/[0.04] relative h-[73px] flex items-center", collapsed && "px-3")}>
        <div className={cn("flex items-center w-full", collapsed ? "justify-center" : "justify-between")}>
          <div className={cn("flex items-center gap-2.5", collapsed && "justify-center")}>
            <div
              className={cn("shrink-0 rounded-lg flex items-center justify-center font-bold text-white font-display transition-all duration-300", collapsed ? "w-10 h-10 text-sm" : "w-9 h-9 text-xs")}
              style={{ background: 'rgba(var(--color-primary-rgb),0.15)', border: '1px solid rgba(var(--color-primary-rgb),0.25)' }}
            >
              AM
            </div>
            {!collapsed && (
              <div>
                <h1 className="text-sm font-bold text-white tracking-tight font-display">Admin Master</h1>
                <p className="text-[11px] text-white/[0.45] font-mono tracking-wide uppercase">Painel</p>
              </div>
            )}
          </div>
          {/* Collapse toggle - same pattern as expert sidebar */}
          {!collapsed && (
            <button onClick={onToggle} className="p-1.5 text-white/[0.45] hover:text-white hover:bg-white/[0.04] rounded-lg transition-all duration-200" aria-label="Recolher sidebar">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}
          {collapsed && (
            <button onClick={onToggle} className="absolute -right-3 top-6 bg-white/[0.04] backdrop-blur-xl border border-white/[0.04] shadow-lg z-10 p-1.5 text-white/[0.45] hover:text-white hover:bg-white/[0.06] rounded-lg transition-all duration-200" aria-label="Expandir sidebar">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Nav items - same styling as expert sidebar */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto relative">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/admin'}
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
                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />}
                <item.icon className={cn("w-[18px] h-[18px] transition-all duration-200", !collapsed && "mr-3", isActive ? "text-primary-light opacity-90" : "opacity-50 group-hover:opacity-90")} />
                {!collapsed && <span>{item.label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout button */}
      <div className="p-3 border-t border-white/[0.04] relative">
        <button
          onClick={() => { signOut(); navigate('/login', { replace: true }); }}
          className={cn("flex items-center w-full px-3 py-2.5 rounded-xl text-[13px] font-medium text-white/[0.45] hover:bg-red-500/10 hover:text-red-400 transition-all duration-200", collapsed && "justify-center px-2")}
        >
          <LogOut className={cn("w-[18px] h-[18px]", !collapsed && "mr-3")} />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
};
