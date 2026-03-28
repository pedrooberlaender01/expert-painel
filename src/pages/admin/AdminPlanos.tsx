import React, { useState } from 'react';
import { Plus, Pencil, Check, X, Save } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { useAdminPlanos } from '../../hooks/useAdminPlanos';
import type { PlanoRow } from '../../types/database';

const KNOWN_FEATURES = ['agendamento', 'torneio', 'copy_ia', 'moderacao', 'voz_clonada'];

const INPUT_CLASS = 'w-full px-2 py-1.5 rounded-lg text-sm text-white bg-white/[0.06] border border-white/[0.08] focus:border-blue-500/50 focus:outline-none transition-all';

interface EditData {
  nome: string;
  max_leads: number | null;
  max_instancias: number;
  max_envios_mes: number | null;
  features_permitidas: string[];
  ativo: boolean;
}

export const AdminPlanos: React.FC = () => {
  const { planos, loading, error, refresh, updatePlano, createPlano } = useAdminPlanos();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<EditData>({
    nome: '',
    max_leads: null,
    max_instancias: 2,
    max_envios_mes: null,
    features_permitidas: ['agendamento'],
    ativo: true,
  });
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const startEdit = (plano: PlanoRow) => {
    setEditingId(plano.id);
    setIsNew(false);
    setEditData({
      nome: plano.nome,
      max_leads: plano.max_leads,
      max_instancias: plano.max_instancias,
      max_envios_mes: plano.max_envios_mes,
      features_permitidas: plano.features_permitidas || [],
      ativo: plano.ativo,
    });
  };

  const startNew = () => {
    setEditingId('__new__');
    setIsNew(true);
    setEditData({
      nome: '',
      max_leads: 500,
      max_instancias: 2,
      max_envios_mes: 1000,
      features_permitidas: ['agendamento'],
      ativo: true,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsNew(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isNew) {
        const res = await createPlano({
          nome: editData.nome,
          max_leads: editData.max_leads,
          max_instancias: editData.max_instancias,
          max_envios_mes: editData.max_envios_mes,
          features_permitidas: editData.features_permitidas,
        });
        if (!res.success) {
          console.error('Erro ao criar plano:', res.error);
        }
      } else if (editingId) {
        const res = await updatePlano(editingId, {
          nome: editData.nome,
          max_leads: editData.max_leads,
          max_instancias: editData.max_instancias,
          max_envios_mes: editData.max_envios_mes,
          features_permitidas: editData.features_permitidas,
          ativo: editData.ativo,
        });
        if (!res.success) {
          console.error('Erro ao atualizar plano:', res.error);
        }
      }
    } finally {
      setSaving(false);
      setEditingId(null);
      setIsNew(false);
    }
  };

  const toggleFeature = (feature: string) => {
    setEditData(prev => ({
      ...prev,
      features_permitidas: prev.features_permitidas.includes(feature)
        ? prev.features_permitidas.filter(f => f !== feature)
        : [...prev.features_permitidas, feature],
    }));
  };

  const parseNumberOrNull = (value: string): number | null => {
    if (value === '' || value === null) return null;
    const num = parseInt(value, 10);
    return isNaN(num) ? null : num;
  };

  // --- Loading ---
  if (loading) {
    return (
      <div>
        <PageHeader title="Planos" subtitle="Gerencie os planos e limites dos experts" />
        <div className="glass-card p-6 animate-pulse">
          <div className="h-5 w-32 rounded bg-white/[0.06] mb-6" />
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 rounded bg-white/[0.06] mb-3" />
          ))}
        </div>
      </div>
    );
  }

  // --- Error ---
  if (error) {
    return (
      <div>
        <PageHeader title="Planos" subtitle="Gerencie os planos e limites dos experts" />
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

  // Build display rows
  const displayRows: (PlanoRow | null)[] = isNew ? [null, ...planos] : planos;

  return (
    <div>
      <PageHeader
        title="Planos"
        subtitle="Gerencie os planos e limites dos experts"
        onRefresh={refresh}
        isRefreshing={loading}
        rightContent={
          !isNew && !editingId ? (
            <button
              onClick={startNew}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all"
              style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.2)'; }}
            >
              <Plus className="w-4 h-4" />
              Novo Plano
            </button>
          ) : undefined
        }
      />

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                {['Nome', 'Max Leads', 'Max Instancias', 'Max Envios/Mes', 'Features', 'Status', 'Acoes'].map(col => (
                  <th
                    key={col}
                    className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: 'rgba(255,255,255,0.45)' }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayRows.map((plano, idx) => {
                const isEditingThis = plano ? editingId === plano.id : isNew;

                // --- Edit row ---
                if (isEditingThis) {
                  return (
                    <tr
                      key={plano?.id || '__new__'}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        background: 'rgba(59,130,246,0.04)',
                      }}
                    >
                      <td className="px-5 py-3">
                        <input
                          type="text"
                          value={editData.nome}
                          onChange={e => setEditData(prev => ({ ...prev, nome: e.target.value }))}
                          className={INPUT_CLASS}
                          placeholder="Nome do plano"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <input
                          type="number"
                          min={0}
                          value={editData.max_leads === null ? '' : editData.max_leads}
                          onChange={e => setEditData(prev => ({ ...prev, max_leads: parseNumberOrNull(e.target.value) }))}
                          className={INPUT_CLASS}
                          placeholder="Ilimitado"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <input
                          type="number"
                          min={1}
                          value={editData.max_instancias}
                          onChange={e => setEditData(prev => ({ ...prev, max_instancias: parseInt(e.target.value, 10) || 1 }))}
                          className={INPUT_CLASS}
                        />
                      </td>
                      <td className="px-5 py-3">
                        <input
                          type="number"
                          min={0}
                          value={editData.max_envios_mes === null ? '' : editData.max_envios_mes}
                          onChange={e => setEditData(prev => ({ ...prev, max_envios_mes: parseNumberOrNull(e.target.value) }))}
                          className={INPUT_CLASS}
                          placeholder="Ilimitado"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {KNOWN_FEATURES.map(f => (
                            <button
                              key={f}
                              onClick={() => toggleFeature(f)}
                              className="text-[11px] px-2 py-1 rounded-md font-medium transition-all"
                              style={{
                                background: editData.features_permitidas.includes(f) ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)',
                                border: `1px solid ${editData.features_permitidas.includes(f) ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.06)'}`,
                                color: editData.features_permitidas.includes(f) ? '#60a5fa' : 'rgba(255,255,255,0.4)',
                              }}
                            >
                              {f}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => setEditData(prev => ({ ...prev, ativo: !prev.ativo }))}
                          className="text-[12px] px-2.5 py-1 rounded-lg font-medium transition-all"
                          style={{
                            background: editData.ativo ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)',
                            border: `1px solid ${editData.ativo ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)'}`,
                            color: editData.ativo ? '#34d399' : '#fb7185',
                          }}
                        >
                          {editData.ativo ? 'Ativo' : 'Inativo'}
                        </button>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleSave}
                            disabled={saving || !editData.nome.trim()}
                            className="p-1.5 rounded-lg transition-all disabled:opacity-40"
                            style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}
                            title="Salvar"
                          >
                            {saving ? <Save className="w-4 h-4 text-emerald-400 animate-spin" /> : <Check className="w-4 h-4 text-emerald-400" />}
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1.5 rounded-lg transition-all"
                            style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)' }}
                            title="Cancelar"
                          >
                            <X className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                // --- Display row ---
                if (!plano) return null;
                return (
                  <tr
                    key={plano.id}
                    className="transition-colors"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-medium text-white">{plano.nome}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      {plano.max_leads === null ? (
                        <span className="text-sm text-emerald-400 font-medium">Ilimitado</span>
                      ) : (
                        <span className="text-sm text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>{plano.max_leads.toLocaleString('pt-BR')}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>{plano.max_instancias}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      {plano.max_envios_mes === null ? (
                        <span className="text-sm text-emerald-400 font-medium">Ilimitado</span>
                      ) : (
                        <span className="text-sm text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>{plano.max_envios_mes.toLocaleString('pt-BR')}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {(plano.features_permitidas || []).map(f => (
                          <span
                            key={f}
                            className="text-[11px] px-2 py-0.5 rounded-md font-medium"
                            style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className="text-[12px] px-2.5 py-1 rounded-lg font-medium"
                        style={{
                          background: plano.ativo ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)',
                          border: `1px solid ${plano.ativo ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)'}`,
                          color: plano.ativo ? '#34d399' : '#fb7185',
                        }}
                      >
                        {plano.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => startEdit(plano)}
                        disabled={!!editingId}
                        className="p-1.5 rounded-lg transition-all disabled:opacity-30"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                        onMouseEnter={e => { if (!editingId) { e.currentTarget.style.background = 'rgba(59,130,246,0.15)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)'; } }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.5)' }} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {planos.length === 0 && !isNew && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Nenhum plano cadastrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
