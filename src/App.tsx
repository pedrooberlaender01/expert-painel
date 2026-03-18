import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
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
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuthStore } from './stores/authStore';

const ProtectedLayout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const location = useLocation();
  const isConversas = location.pathname === '/conversas';
  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar
        collapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed((prev) => !prev)}
      />
      <main className="flex-1 overflow-y-auto h-screen min-w-0">
        <div className={isConversas ? 'h-full' : 'h-full p-6 lg:p-8'}>
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

        <Route
          element={(
            <ProtectedRoute>
              <ProtectedLayout />
            </ProtectedRoute>
          )}
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/funil" element={<Funil />} />
          <Route path="/conversas" element={<Conversas />} />
          <Route path="/envios" element={<Envios />} />
          <Route path="/envios/simulador" element={<SimuladorEnvios />} />
          <Route path="/envios/historico" element={<HistoricoEnvios />} />
          <Route path="/envios/templates" element={<Templates />} />
          <Route path="/grupos" element={<Grupos />} />
          <Route path="/torneios" element={<Torneios />} />
          <Route path="/mensagens" element={<Mensagens />} />
          <Route path="/central-whatsapp" element={<CentralWhatsapp />} />
          <Route path="/notificacoes" element={<Notificacoes />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
