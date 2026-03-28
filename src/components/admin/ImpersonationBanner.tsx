import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, X } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

export const ImpersonationBanner: React.FC = () => {
  const { impersonatedExpert, stopImpersonation } = useAuthStore();
  const navigate = useNavigate();

  if (!impersonatedExpert) return null;

  const handleSair = () => {
    stopImpersonation();
    navigate('/admin/experts', { replace: true });
  };

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-3 px-4 py-2 text-white text-sm font-medium shadow-lg"
      style={{ background: impersonatedExpert.cor_primaria }}
    >
      <Eye className="w-4 h-4" />
      <span>Voce esta vendo como <strong>{impersonatedExpert.nome}</strong></span>
      <button
        onClick={handleSair}
        className="ml-2 flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all"
        style={{ background: 'rgba(0,0,0,0.25)' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.4)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.25)'; }}
      >
        <X className="w-3 h-3" />
        Sair
      </button>
    </div>
  );
};
