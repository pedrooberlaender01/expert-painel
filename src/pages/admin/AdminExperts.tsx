import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Eye, Pause, Play, Trash2, Loader2, AlertCircle, Users } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { useAdminExperts } from '../../hooks/useAdminExperts';
import { useAuthStore } from '../../stores/authStore';
import type { AdminExpertListItem } from '../../types/admin';
import type { ExpertProfile } from '../../types/index';

export const AdminExperts: React.FC = () => {
  const navigate = useNavigate();
  const { experts, loading, error, refresh, toggleExpert, deleteExpert, getExpertDetail } = useAdminExperts();
  const startImpersonation = useAuthStore((s) => s.startImpersonation);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleToggle = async (expert: AdminExpertListItem) => {
    setTogglingId(expert.id);
    await toggleExpert(expert.id, !expert.ativo);
    setTogglingId(null);
  };

  const handleDelete = async (expert: AdminExpertListItem) => {
    if (confirmDeleteId !== expert.id) {
      setConfirmDeleteId(expert.id);
      return;
    }
    setDeletingId(expert.id);
    setConfirmDeleteId(null);
    await deleteExpert(expert.id);
    setDeletingId(null);
  };

  const handleImpersonate = async (expert: AdminExpertListItem) => {
    setImpersonatingId(expert.id);
    const { data } = await getExpertDetail(expert.id);
    if (data?.expert) {
      const profile: ExpertProfile = {
        id: data.expert.id,
        nome: data.expert.nome,
        slug: data.expert.slug,
        cor_primaria: data.expert.cor_primaria,
        cor_secundaria: data.expert.cor_secundaria,
        logo_url: data.expert.logo_url,
        favicon_url: data.expert.favicon_url,
        nome_plataforma: data.expert.nome_plataforma,
        nome_assistente: data.expert.nome_assistente,
        ativo: data.expert.ativo,
        plano: {
          id: data.expert.plano_id || '',
          nome: data.planos.find((p) => p.id === data.expert.plano_id)?.nome || '',
          max_leads: data.planos.find((p) => p.id === data.expert.plano_id)?.max_leads ?? null,
          max_instancias: data.planos.find((p) => p.id === data.expert.plano_id)?.max_instancias ?? null,
          max_envios_mes: data.planos.find((p) => p.id === data.expert.plano_id)?.max_envios_mes ?? null,
          features_permitidas: data.planos.find((p) => p.id === data.expert.plano_id)?.features_permitidas ?? null,
        },
      };
      startImpersonation(data.expert.id, profile);
      navigate('/dashboard');
    }
    setImpersonatingId(null);
  };

  // --- Loading state ---
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-primary-light animate-spin" />
      </div>
    );
  }

  // --- Error state ---
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-sm text-red-400">{error}</p>
        <button
          onClick={refresh}
          className="px-4 py-2 rounded-xl text-sm text-white/70 transition-all"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Experts"
        subtitle="Gerencie os experts da plataforma"
        onRefresh={refresh}
        rightContent={
          <button
            onClick={() => navigate('/admin/experts/new')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all"
            style={{ background: 'rgba(var(--color-primary-rgb),0.15)', border: '1px solid rgba(var(--color-primary-rgb),0.3)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.15)';
            }}
          >
            <Plus className="w-4 h-4" />
            Novo Expert
          </button>
        }
      />

      {experts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <Users className="w-10 h-10 text-white/20" />
          <p className="text-sm text-white/40">Nenhum expert cadastrado</p>
          <button
            onClick={() => navigate('/admin/experts/new')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-primary-light transition-all"
            style={{ background: 'rgba(var(--color-primary-rgb),0.08)', border: '1px solid rgba(var(--color-primary-rgb),0.2)' }}
          >
            <Plus className="w-4 h-4" />
            Criar primeiro expert
          </button>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-white/[0.4] font-medium">Expert</th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-white/[0.4] font-medium">Plano</th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-white/[0.4] font-medium">Status</th>
                  <th className="text-right px-4 py-3 text-[11px] uppercase tracking-wider text-white/[0.4] font-medium">Leads</th>
                  <th className="text-right px-4 py-3 text-[11px] uppercase tracking-wider text-white/[0.4] font-medium">Instancias</th>
                  <th className="text-right px-4 py-3 text-[11px] uppercase tracking-wider text-white/[0.4] font-medium">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {experts.map((expert) => (
                  <tr
                    key={expert.id}
                    className="transition-colors hover:bg-white/[0.02]"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    {/* Name with colored dot */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: expert.cor_primaria }}
                        />
                        <span className="text-sm text-white font-medium">{expert.nome}</span>
                      </div>
                    </td>

                    {/* Plan */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-white/60">{expert.plano_nome || '—'}</span>
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3">
                      {expert.ativo ? (
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Ativo
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                          Suspenso
                        </span>
                      )}
                    </td>

                    {/* Leads count */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-white/60 font-mono">{expert.leads_count.toLocaleString('pt-BR')}</span>
                    </td>

                    {/* Instances count */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-white/60 font-mono">{expert.instancias_count}</span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Edit */}
                        <button
                          onClick={() => navigate(`/admin/experts/${expert.id}/edit`)}
                          className="p-2 rounded-lg text-white/40 hover:text-primary-light hover:bg-primary-bg transition-all"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        {/* Impersonate */}
                        <button
                          onClick={() => handleImpersonate(expert)}
                          disabled={impersonatingId === expert.id}
                          className="p-2 rounded-lg text-white/40 hover:text-purple-400 hover:bg-purple-500/10 transition-all disabled:opacity-50"
                          title="Ver como expert"
                        >
                          {impersonatingId === expert.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>

                        {/* Toggle suspend/reactivate */}
                        <button
                          onClick={() => handleToggle(expert)}
                          disabled={togglingId === expert.id}
                          className={`p-2 rounded-lg transition-all disabled:opacity-50 ${
                            expert.ativo
                              ? 'text-white/40 hover:text-amber-400 hover:bg-amber-500/10'
                              : 'text-white/40 hover:text-emerald-400 hover:bg-emerald-500/10'
                          }`}
                          title={expert.ativo ? 'Suspender' : 'Reativar'}
                        >
                          {togglingId === expert.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : expert.ativo ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </button>

                        {/* Delete (apenas quando suspenso) */}
                        {!expert.ativo && (
                          <button
                            onClick={() => handleDelete(expert)}
                            onBlur={() => setConfirmDeleteId(null)}
                            disabled={deletingId === expert.id}
                            className={`p-2 rounded-lg transition-all disabled:opacity-50 ${
                              confirmDeleteId === expert.id
                                ? 'text-red-400 bg-red-500/15'
                                : 'text-white/40 hover:text-red-400 hover:bg-red-500/10'
                            }`}
                            title={confirmDeleteId === expert.id ? 'Clique novamente para confirmar' : 'Excluir expert'}
                          >
                            {deletingId === expert.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
