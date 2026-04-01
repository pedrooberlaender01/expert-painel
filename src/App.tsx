import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Leads } from './pages/Leads';
import { Funil } from './pages/Funil';
import { Notificacoes } from './pages/Notificacoes';
import { Configuracoes } from './pages/Configuracoes';
import { Envios } from './pages/Envios';
import { HistoricoEnvios } from './pages/HistoricoEnvios';
import { Templates } from './pages/Templates';
import { Mensagens } from './pages/Mensagens';
import { CentralWhatsapp } from './pages/CentralWhatsapp';
import Conversas from './pages/Conversas';
import { SimuladorEnvios } from './pages/SimuladorEnvios';
import { Torneios } from './pages/Torneios';
import { Grupos } from './pages/Grupos';
import Agendamentos from './pages/Agendamentos';
import Agendados from './pages/Agendados';
import GerarCopy from './pages/GerarCopy';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminExperts } from './pages/admin/AdminExperts';
import { AdminExpertForm } from './pages/admin/AdminExpertForm';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminPlanos } from './pages/admin/AdminPlanos';
import { useAuthStore } from './stores/authStore';
import { SectionGuard } from './hooks/useSectionGate';

const ProtectedLayout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isConversas = location.pathname === '/conversas';
  const isGerarCopy = location.pathname === '/envios/gerar-copy';
  const { user, impersonatedExpert } = useAuthStore();

  // Apply expert brand colors dynamically via CSS variables
  useEffect(() => {
    const expert = impersonatedExpert || user?.expert;
    if (expert) {
      const root = document.documentElement;
      root.style.setProperty('--color-primary', expert.cor_primaria);
      root.style.setProperty('--color-primary-hover', expert.cor_secundaria);
      // Generate bg variant: parse hex to rgba with 0.12 opacity
      const hex = expert.cor_primaria.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      root.style.setProperty('--color-primary-rgb', `${r}, ${g}, ${b}`);
      root.style.setProperty('--color-primary-bg', `rgba(${r}, ${g}, ${b}, 0.12)`);
      root.style.setProperty('--color-primary-light', expert.cor_secundaria);
    }
    return () => {
      // Reset to defaults on cleanup (e.g., signOut)
      const root = document.documentElement;
      root.style.setProperty('--color-primary', '#10b981');
      root.style.setProperty('--color-primary-hover', '#059669');
      root.style.setProperty('--color-primary-rgb', '16, 185, 129');
      root.style.setProperty('--color-primary-bg', 'rgba(16, 185, 129, 0.12)');
      root.style.setProperty('--color-primary-light', '#34d399');
    };
  }, [user?.expert, impersonatedExpert]);

  const expertName = impersonatedExpert?.nome || user?.expert?.nome || user?.nome || '';

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen relative overflow-x-hidden" style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #0d1117 40%, #0f0a1a 100%)' }}>
      {/* Desktop sidebar */}
      <Sidebar
        collapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 animate-fade-in"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => setMobileMenuOpen(false)}
          />
          <div
            className="relative h-full w-[280px] animate-slide-in-right"
            style={{ background: '#0c0c14', borderRight: '1px solid rgba(255,255,255,0.04)' }}
          >
            <Sidebar
              collapsed={false}
              onToggle={() => setMobileMenuOpen(false)}
              isMobile
            />
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto h-screen min-w-0 relative z-10">
        {/* Mobile top bar — always visible on mobile */}
        <div className="flex md:hidden items-center justify-between px-4 py-3 sticky top-0 z-30" style={{ background: 'rgba(10,10,15,0.95)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-lg transition-all"
            style={{ color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)' }}
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-[13px] font-semibold text-white font-display">{expertName}</span>
          <div className="w-9" /> {/* spacer */}
        </div>

        <div className={isConversas || isGerarCopy ? 'h-full' : 'h-full p-3 sm:p-4 md:p-6 lg:p-8'}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

function App() {
  useEffect(() => {
    useAuthStore.getState().initialize();
  }, []);

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Admin routes with dedicated AdminLayout */}
        <Route path="/admin" element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="experts" element={<AdminExperts />} />
          <Route path="experts/new" element={<AdminExpertForm />} />
          <Route path="experts/:id/edit" element={<AdminExpertForm />} />
          <Route path="planos" element={<AdminPlanos />} />
        </Route>

        <Route
          element={(
            <ProtectedRoute>
              <ProtectedLayout />
            </ProtectedRoute>
          )}
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<SectionGuard section="dashboard"><Dashboard /></SectionGuard>} />
          <Route path="/leads" element={<SectionGuard section="leads"><Leads /></SectionGuard>} />
          <Route path="/funil" element={<SectionGuard section="leads"><Funil /></SectionGuard>} />
          <Route path="/conversas" element={<SectionGuard section="conversas"><Conversas /></SectionGuard>} />
          <Route path="/envios" element={<SectionGuard section="envios"><Envios /></SectionGuard>} />
          <Route path="/envios/simulador" element={<SectionGuard section="envios"><SimuladorEnvios /></SectionGuard>} />
          <Route path="/envios/historico" element={<SectionGuard section="envios"><HistoricoEnvios /></SectionGuard>} />
          <Route path="/envios/templates" element={<SectionGuard section="envios"><Templates /></SectionGuard>} />
          <Route path="/envios/agendamentos" element={<SectionGuard section="envios"><Agendamentos /></SectionGuard>} />
          <Route path="/envios/agendados" element={<SectionGuard section="envios"><Agendados /></SectionGuard>} />
          <Route path="/envios/gerar-copy" element={<SectionGuard section="envios"><GerarCopy /></SectionGuard>} />
          <Route path="/grupos" element={<SectionGuard section="grupos"><Grupos /></SectionGuard>} />
          <Route path="/torneios" element={<SectionGuard section="torneios"><Torneios /></SectionGuard>} />
          <Route path="/mensagens" element={<SectionGuard section="mensagens"><Mensagens /></SectionGuard>} />
          <Route path="/central-whatsapp" element={<SectionGuard section="central_whatsapp"><CentralWhatsapp /></SectionGuard>} />
          <Route path="/notificacoes" element={<Notificacoes />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
