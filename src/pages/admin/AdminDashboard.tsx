import React, { useState, useMemo } from 'react';
import { Users, Send, UserCheck, Wifi, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { MetricCard } from '../../components/MetricCard';
import { useAdminDashboard } from '../../hooks/useAdminDashboard';
import type { ExpertBreakdownRow } from '../../types/admin';

type SortColumn = 'expert_nome' | 'leads' | 'envios' | 'instancias' | 'plano' | 'ativo';
type SortDirection = 'asc' | 'desc';

export const AdminDashboard: React.FC = () => {
  const { metrics, breakdown, loading, error, refresh } = useAdminDashboard();
  const [sortColumn, setSortColumn] = useState<SortColumn>('leads');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const sortedBreakdown = useMemo(() => {
    return [...breakdown].sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1;
      const valA = a[sortColumn];
      const valB = b[sortColumn];
      if (typeof valA === 'string' && typeof valB === 'string') {
        return dir * valA.localeCompare(valB);
      }
      if (typeof valA === 'boolean' && typeof valB === 'boolean') {
        return dir * (Number(valA) - Number(valB));
      }
      return dir * ((valA as number) - (valB as number));
    });
  }, [breakdown, sortColumn, sortDirection]);

  const SortIcon: React.FC<{ column: SortColumn }> = ({ column }) => {
    if (sortColumn !== column) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDirection === 'asc'
      ? <ArrowUp className="w-3 h-3 text-blue-400" />
      : <ArrowDown className="w-3 h-3 text-blue-400" />;
  };

  // --- Loading skeleton ---
  if (loading) {
    return (
      <div>
        <PageHeader title="Dashboard Global" subtitle="Metricas consolidadas de todos os experts" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card p-5 h-[160px] animate-pulse">
              <div className="h-4 w-24 rounded bg-white/[0.06] mb-4" />
              <div className="h-8 w-16 rounded bg-white/[0.06] mb-2" />
              <div className="h-3 w-32 rounded bg-white/[0.06]" />
            </div>
          ))}
        </div>
        <div className="glass-card p-6 animate-pulse">
          <div className="h-5 w-48 rounded bg-white/[0.06] mb-6" />
          {[1, 2, 3].map(i => (
            <div key={i} className="h-10 rounded bg-white/[0.06] mb-3" />
          ))}
        </div>
      </div>
    );
  }

  // --- Error state ---
  if (error) {
    return (
      <div>
        <PageHeader title="Dashboard Global" subtitle="Metricas consolidadas de todos os experts" />
        <div className="glass-card p-8 text-center">
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <button
            onClick={refresh}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)' }}
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Dashboard Global"
        subtitle="Metricas consolidadas de todos os experts"
        onRefresh={refresh}
        isRefreshing={loading}
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="Total de Leads"
          value={metrics?.total_leads ?? 0}
          icon={Users}
          color="emerald"
        />
        <MetricCard
          title="Envios do Mes"
          value={metrics?.envios_mes ?? 0}
          icon={Send}
          color="cyan"
        />
        <MetricCard
          title="Experts Ativos"
          value={`${metrics?.experts_ativos ?? 0}/${metrics?.experts_total ?? 0}`}
          icon={UserCheck}
          color="amber"
        />
        <MetricCard
          title="Instancias Conectadas"
          value={metrics?.instancias_conectadas ?? 0}
          icon={Wifi}
          color="rose"
        />
      </div>

      {/* Expert Breakdown Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-5 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <h2 className="text-[15px] font-semibold text-white font-display">Breakdown por Expert</h2>
          <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Performance individual de cada expert no mes
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                {([
                  { key: 'expert_nome' as SortColumn, label: 'Expert' },
                  { key: 'leads' as SortColumn, label: 'Leads' },
                  { key: 'envios' as SortColumn, label: 'Envios' },
                  { key: 'instancias' as SortColumn, label: 'Instancias' },
                  { key: 'plano' as SortColumn, label: 'Plano' },
                  { key: 'ativo' as SortColumn, label: 'Status' },
                ]).map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider cursor-pointer select-none transition-colors hover:text-blue-400"
                    style={{ color: 'rgba(255,255,255,0.45)' }}
                  >
                    <div className="flex items-center gap-1.5">
                      {col.label}
                      <SortIcon column={col.key} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Nenhum expert cadastrado
                  </td>
                </tr>
              ) : (
                sortedBreakdown.map((row) => (
                  <tr
                    key={row.expert_id}
                    className="transition-colors"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-medium text-white">{row.expert_nome}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>{row.leads}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>{row.envios}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>{row.instancias}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[12px] px-2.5 py-1 rounded-lg font-medium"
                        style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}>
                        {row.plano}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[12px] px-2.5 py-1 rounded-lg font-medium ${
                        row.ativo
                          ? 'text-emerald-400'
                          : 'text-red-400'
                      }`}
                        style={{
                          background: row.ativo ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)',
                          border: `1px solid ${row.ativo ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)'}`,
                        }}
                      >
                        {row.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
