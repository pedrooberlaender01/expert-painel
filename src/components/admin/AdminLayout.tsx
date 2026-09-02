import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { AdminSidebar } from './AdminSidebar';
import { ImpersonationBanner } from './ImpersonationBanner';
import { useAuthStore } from '../../stores/authStore';

export const AdminLayout: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { impersonatedExpertId } = useAuthStore();

  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  return (
    <div className="flex min-h-screen relative overflow-x-hidden" style={{ background: 'linear-gradient(135deg, rgb(var(--c-surface-rgb)) 0%, rgb(var(--c-surface-50-rgb)) 40%, rgb(var(--c-surface-rgb)) 100%)' }}>
      <AdminSidebar collapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed((prev) => !prev)} />

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 animate-fade-in" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setMobileMenuOpen(false)} />
          <div className="relative h-full w-[280px] animate-slide-in-right" style={{ background: 'var(--c-sidebar-bg)', borderRight: '1px solid var(--c-sidebar-border)' }}>
            <AdminSidebar collapsed={false} onToggle={() => setMobileMenuOpen(false)} isMobile />
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto h-screen min-w-0 relative z-10">
        {impersonatedExpertId && <ImpersonationBanner />}

        <div className="flex md:hidden items-center justify-between px-4 py-3 sticky top-0 z-30" style={{ background: 'rgb(var(--c-surface-rgb) / 0.95)', borderBottom: '1px solid var(--c-border)' }}>
          <button onClick={() => setMobileMenuOpen(true)} className="p-2 rounded-lg transition-all" style={{ color: 'var(--c-t-60)', background: 'var(--c-glass)', border: '1px solid var(--c-border)' }}>
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-[13px] font-semibold text-txt font-display">Admin Master</span>
          <div className="w-9" />
        </div>

        <div className={`h-full p-3 sm:p-4 md:p-6 lg:p-8 ${impersonatedExpertId ? 'pt-14' : ''}`}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};
