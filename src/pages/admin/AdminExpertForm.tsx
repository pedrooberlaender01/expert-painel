import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Upload, X, Check, Copy, CheckCheck } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { useAdminExperts } from '../../hooks/useAdminExperts';
import type { ExpertFormData } from '../../types/admin';
import type { PlanoRow } from '../../types/database';
import type { ExpertDetail } from '../../hooks/useAdminExperts';
import { N8N_GEND } from '../../config/webhooks';

// --- Color palette ---
const COLOR_PALETTE = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#06b6d4',
];

const INPUT_CLASS = 'w-full px-3 py-2.5 rounded-xl text-sm text-white bg-white/[0.04] border border-white/[0.06] focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30 placeholder-white/[0.25] transition-all';

// --- Color Picker Component ---
interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ label, value, onChange }) => {
  const [customHex, setCustomHex] = useState('');

  const handleCustomChange = (hex: string) => {
    setCustomHex(hex);
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
      onChange(hex);
    }
  };

  return (
    <div>
      <label className="block text-xs text-white/50 mb-2">{label}</label>
      <div className="flex items-center gap-2 flex-wrap">
        {COLOR_PALETTE.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => { onChange(color); setCustomHex(''); }}
            className="w-8 h-8 rounded-full cursor-pointer border-2 transition-all flex-shrink-0"
            style={{
              background: color,
              borderColor: value === color ? 'white' : 'transparent',
              boxShadow: value === color ? `0 0 0 2px ${color}40` : 'none',
            }}
          />
        ))}
        {/* Live preview */}
        <div
          className="w-8 h-8 rounded-full border border-white/10 flex-shrink-0"
          style={{ background: value }}
        />
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs text-white/30">#</span>
        <input
          type="text"
          value={customHex ? customHex.replace('#', '') : value.replace('#', '')}
          onChange={(e) => handleCustomChange(`#${e.target.value.replace('#', '')}`)}
          placeholder="hex"
          maxLength={7}
          className="w-28 px-2 py-1.5 rounded-lg text-xs text-white bg-white/[0.04] border border-white/[0.06] focus:border-blue-500/50 focus:outline-none placeholder-white/[0.25]"
        />
      </div>
    </div>
  );
};

// --- Main Form Component ---
export const AdminExpertForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const { createExpert, updateExpert, getExpertDetail, uploadLogo } = useAdminExperts();

  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [planos, setPlanos] = useState<PlanoRow[]>([]);
  const [detail, setDetail] = useState<ExpertDetail | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState<ExpertFormData>({
    nome: '',
    slug: '',
    cor_primaria: '#10b981',
    cor_secundaria: '#3b82f6',
    logo_url: null,
    nome_plataforma: '',
    nome_assistente: 'Helena',
    voice_id: null,
    plano_id: null,
    ativo: true,
    email: '',
    senha: '',
  });

  // Auto-generate slug from nome
  const updateNome = (nome: string) => {
    const slug = nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setForm((prev) => ({
      ...prev,
      nome,
      slug,
      nome_plataforma: prev.nome_plataforma || nome,
    }));
  };

  // Load expert detail when editing
  const loadDetail = useCallback(async () => {
    if (!id) return;
    setLoadingDetail(true);
    const { data, error } = await getExpertDetail(id);
    if (error) {
      setErrorMsg(error);
      setLoadingDetail(false);
      return;
    }
    if (data) {
      setDetail(data);
      setPlanos(data.planos);
      setForm({
        nome: data.expert.nome,
        slug: data.expert.slug,
        cor_primaria: data.expert.cor_primaria,
        cor_secundaria: data.expert.cor_secundaria,
        logo_url: data.expert.logo_url,
        nome_plataforma: data.expert.nome_plataforma,
        nome_assistente: data.expert.nome_assistente,
        voice_id: data.expert.voice_id,
        plano_id: data.expert.plano_id,
        ativo: data.expert.ativo,
        email: data.credentials?.email || '',
        senha: '',
      });
    }
    setLoadingDetail(false);
  }, [id, getExpertDetail]);

  // Load planos for create mode
  const loadPlanos = useCallback(async () => {
    if (id) return; // planos loaded via getExpertDetail in edit mode
    // For create mode, fetch planos via a dummy expert detail or separate call
    // Since we need planos list, use getExpertDetail with any existing expert
    // Actually, we need another approach. Let's just fetch planos via admin_get_expert
    // For now, use a simple supabase query
    const { supabase } = await import('../../lib/supabase');
    const { data } = await supabase.from('planos').select('*').eq('ativo', true).order('nome');
    if (data) setPlanos(data as PlanoRow[]);
  }, [id]);

  useEffect(() => {
    if (isEditing) {
      loadDetail();
    } else {
      loadPlanos();
    }
  }, [isEditing, loadDetail, loadPlanos]);

  // Handle logo upload
  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true);
    const { url, error } = await uploadLogo(file);
    if (error) {
      setErrorMsg(`Erro no upload: ${error}`);
    } else if (url) {
      setForm((prev) => ({ ...prev, logo_url: url }));
    }
    setUploadingLogo(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleLogoUpload(file);
    }
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);

    if (isEditing && id) {
      const result = await updateExpert(id, form);
      if (result.success) {
        setSuccessMsg('Expert atualizado com sucesso');
        setTimeout(() => navigate('/admin/experts'), 1000);
      } else {
        setErrorMsg(result.error || 'Erro ao atualizar expert');
      }
    } else {
      if (!form.email || !form.senha) {
        setErrorMsg('Email e senha sao obrigatorios para criar um expert');
        setSubmitting(false);
        return;
      }
      const result = await createExpert(form);
      if (result.success) {
        setSuccessMsg('Expert criado com sucesso');
        setTimeout(() => navigate('/admin/experts'), 1000);
      } else {
        setErrorMsg(result.error || 'Erro ao criar expert');
      }
    }
    setSubmitting(false);
  };

  if (loadingDetail) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
      </div>
    );
  }

  const selectedPlano = planos.find((p) => p.id === form.plano_id);

  return (
    <div>
      <PageHeader
        title={isEditing ? 'Editar Expert' : 'Novo Expert'}
        subtitle={isEditing ? `Editando ${form.nome}` : 'Preencha os dados para criar um novo expert'}
      />

      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
        {/* Feedback messages */}
        {errorMsg && (
          <div className="px-4 py-3 rounded-xl text-sm text-red-400 bg-red-500/10 border border-red-500/20">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="px-4 py-3 rounded-xl text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
            <Check className="w-4 h-4" />
            {successMsg}
          </div>
        )}

        {/* Section 1: Dados Basicos */}
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Dados Basicos</h3>

          <div>
            <label className="block text-xs text-white/50 mb-1.5">Nome *</label>
            <input
              type="text"
              value={form.nome}
              onChange={(e) => updateNome(e.target.value)}
              required
              placeholder="Nome do expert"
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1.5">Slug</label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
              placeholder="slug-do-expert"
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1.5">Nome da Plataforma</label>
            <input
              type="text"
              value={form.nome_plataforma}
              onChange={(e) => setForm((prev) => ({ ...prev, nome_plataforma: e.target.value }))}
              placeholder="Nome exibido no sidebar"
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1.5">Nome da Assistente</label>
            <input
              type="text"
              value={form.nome_assistente}
              onChange={(e) => setForm((prev) => ({ ...prev, nome_assistente: e.target.value }))}
              placeholder="Helena"
              className={INPUT_CLASS}
            />
          </div>
        </div>

        {/* Section 2: Cores */}
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Cores</h3>
          <ColorPicker
            label="Cor Primaria"
            value={form.cor_primaria}
            onChange={(color) => setForm((prev) => ({ ...prev, cor_primaria: color }))}
          />
          <ColorPicker
            label="Cor Secundaria"
            value={form.cor_secundaria}
            onChange={(color) => setForm((prev) => ({ ...prev, cor_secundaria: color }))}
          />
        </div>

        {/* Section 3: Logo */}
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Logo</h3>

          {form.logo_url && (
            <div className="flex items-center gap-3">
              <img
                src={form.logo_url}
                alt="Logo"
                className="w-16 h-16 rounded-xl object-cover border border-white/10"
              />
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, logo_url: null }))}
                className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-white/[0.08] rounded-xl p-8 text-center cursor-pointer hover:border-blue-500/30 hover:bg-blue-500/[0.02] transition-all"
          >
            {uploadingLogo ? (
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin mx-auto" />
            ) : (
              <>
                <Upload className="w-6 h-6 text-white/30 mx-auto mb-2" />
                <p className="text-xs text-white/40">Arraste uma imagem ou clique para selecionar</p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleLogoUpload(file);
            }}
          />
        </div>

        {/* Section 4: Plano */}
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Plano</h3>
          <select
            value={form.plano_id || ''}
            onChange={(e) => setForm((prev) => ({ ...prev, plano_id: e.target.value || null }))}
            className={INPUT_CLASS}
          >
            <option value="">Sem plano</option>
            {planos.map((plano) => (
              <option key={plano.id} value={plano.id}>{plano.nome}</option>
            ))}
          </select>
          {selectedPlano && (
            <div className="text-xs text-white/40 space-y-1 mt-2 pl-1">
              <p>Max Leads: {selectedPlano.max_leads ?? 'Ilimitado'}</p>
              <p>Max Instancias: {selectedPlano.max_instancias}</p>
              <p>Max Envios/Mes: {selectedPlano.max_envios_mes ?? 'Ilimitado'}</p>
              <p>Features: {selectedPlano.features_permitidas.join(', ') || 'Nenhuma'}</p>
            </div>
          )}
        </div>

        {/* Section 5: Credenciais de Acesso */}
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Credenciais de Acesso</h3>
          <p className="text-xs text-white/30">Estas credenciais permitem ao expert acessar o painel</p>

          <div>
            <label className="block text-xs text-white/50 mb-1.5">Email {!isEditing && '*'}</label>
            <input
              type="email"
              value={form.email || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              required={!isEditing}
              disabled={isEditing}
              placeholder="expert@email.com"
              className={`${INPUT_CLASS} ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1.5">
              Senha {!isEditing && '*'}
              {isEditing && <span className="text-white/30 ml-1">(deixe vazio para manter a atual)</span>}
            </label>
            <input
              type="password"
              value={form.senha || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, senha: e.target.value }))}
              required={!isEditing}
              placeholder={isEditing ? '••••••••' : 'Senha de acesso'}
              className={INPUT_CLASS}
            />
          </div>
        </div>

        {/* Section 6: Instancias UAZAPI (edit only) */}
        {isEditing && detail && (
          <div className="glass-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Instancias UAZAPI</h3>
            {detail.instancias.length === 0 ? (
              <p className="text-xs text-white/30">Nenhuma instancia atribuida a este expert</p>
            ) : (
              <div className="space-y-2">
                {detail.instancias.map((inst) => (
                  <div
                    key={inst.id}
                    className="flex items-center justify-between px-3 py-2 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: inst.ativo ? '#10b981' : '#ef4444' }}
                      />
                      <span className="text-sm text-white/80">{inst.nome}</span>
                      <span className="text-xs text-white/30 font-mono">{inst.numero}</span>
                    </div>
                    <span className="text-xs text-white/30 font-mono">{inst.instancia}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Section 6b: Links de Trafego (edit only) */}
        {isEditing && id && (
          <div className="glass-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Links de Trafego</h3>
            <p className="text-xs text-white/30">URLs para campanhas de trafego. Cada link direciona leads para as instancias deste expert.</p>

            {[
              { label: 'Link Instagram', path: 'whatsapp-rotacao' },
              { label: 'Link Facebook', path: 'whatsapp-rotacao-facebook' },
            ].map(({ label, path }) => {
              const url = `${N8N_GEND}/${path}?expert_id=${id}`;
              const isCopied = copiedLink === path;
              return (
                <div key={path}>
                  <label className="block text-xs text-white/50 mb-1.5">{label}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={url}
                      className={`${INPUT_CLASS} opacity-70 cursor-default flex-1`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(url);
                        setCopiedLink(path);
                        setTimeout(() => setCopiedLink(null), 2000);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs text-white/60 hover:text-white/90 transition-all flex-shrink-0"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      {isCopied ? (
                        <><CheckCheck className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400">Copiado</span></>
                      ) : (
                        <><Copy className="w-3.5 h-3.5" /><span>Copiar</span></>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Section 7: Voice */}
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Voice</h3>
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Voice ID</label>
            <input
              type="text"
              value={form.voice_id || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, voice_id: e.target.value || null }))}
              placeholder="ID da voz no Minimax"
              className={INPUT_CLASS}
            />
            <p className="text-xs text-white/25 mt-1.5">ID da voz no Minimax. Configuracao manual para MVP.</p>
          </div>
        </div>

        {/* Form actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50"
            style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)' }}
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEditing ? 'Salvar Alteracoes' : 'Criar Expert'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/experts')}
            className="px-6 py-2.5 rounded-xl text-sm text-white/60 transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};
