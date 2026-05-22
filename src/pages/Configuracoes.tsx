import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Upload, X, Image, Info } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Toast } from '../components/Toast';
import { useAuthStore } from '../stores/authStore';
import { useConfiguracoes } from '../hooks/useConfiguracoes';
import { useToast } from '../hooks/useToast';
import { supabase } from '../lib/supabase';

export const Configuracoes: React.FC = () => {
  const { user, impersonatedExpert } = useAuthStore();
  const { saving, salvarPreferencias, alterarSenha } = useConfiguracoes();

  // Editable state initialized from user
  const [nome, setNome] = useState('');
  const [notificarNovosLeads, setNotificarNovosLeads] = useState(true);
  const [notificarConversoes, setNotificarConversoes] = useState(true);

  // Password
  const [showSenha, setShowSenha] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');

  // Logo
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const expert = impersonatedExpert || user?.expert;
  const currentLogo = expert?.logo_url || null;

  // Toast
  const { toast, showToast, hideToast } = useToast();

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('error', 'Selecione uma imagem (PNG, JPG, SVG ou WebP)'); return; }
    if (file.size > 5 * 1024 * 1024) { showToast('error', 'Imagem muito grande (máximo 5MB)'); return; }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleLogoUpload = async () => {
    if (!logoFile || !expert) return;
    setUploadingLogo(true);
    try {
      const ext = logoFile.name.split('.').pop() || 'png';
      const fileName = `${expert.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('expert-logos')
        .upload(fileName, logoFile, { cacheControl: '3600', upsert: false });
      if (uploadError) throw new Error(uploadError.message);

      const { data: urlData } = supabase.storage.from('expert-logos').getPublicUrl(fileName);
      const novaUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from('experts')
        .update({ logo_url: novaUrl })
        .eq('id', expert.id);
      if (updateError) throw new Error(updateError.message);

      // Atualizar authStore para refletir imediatamente na sidebar
      const authState = useAuthStore.getState();
      if (authState.impersonatedExpert) {
        useAuthStore.setState({ impersonatedExpert: { ...authState.impersonatedExpert, logo_url: novaUrl } });
      } else if (authState.user?.expert) {
        useAuthStore.setState({ user: { ...authState.user, expert: { ...authState.user.expert, logo_url: novaUrl } } });
      }

      showToast('success', 'Logo atualizada com sucesso!');
      setShowLogoModal(false);
      setLogoFile(null);
      setLogoPreview(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao enviar imagem';
      showToast('error', msg);
    } finally {
      setUploadingLogo(false);
    }
  };

  // Init from user data
  useEffect(() => {
    if (user) {
      setNome(user.nome || '');
      setNotificarNovosLeads(user.notificar_novos_leads);
      setNotificarConversoes(user.notificar_conversoes);
    }
  }, [user]);

  const handleSalvar = async () => {
    const erro = await salvarPreferencias({
      nome: nome.trim(),
      notificar_novos_leads: notificarNovosLeads,
      notificar_conversoes: notificarConversoes,
    });

    if (erro) {
      showToast('error', erro);
    } else {
      showToast('success', 'Preferencias salvas com sucesso!');
    }
  };

  const handleAlterarSenha = async () => {
    if (novaSenha !== confirmarSenha) {
      showToast('error', 'As senhas não coincidem');
      return;
    }

    const erro = await alterarSenha(novaSenha);

    if (erro) {
      showToast('error', erro);
    } else {
      showToast('success', 'Solicitação enviada! O admin irá aprovar a alteração.');
      setNovaSenha('');
      setConfirmarSenha('');
      setShowSenha(false);
    }
  };


  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader title="Configuracoes" />

      <div className="space-y-5">
        {/* Profile */}
        <section className="card-dark p-6">
          <h2 className="text-sm font-semibold text-txt font-display mb-5">Perfil</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono font-semibold text-txt-muted mb-2 uppercase tracking-widest">Nome</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="input-dark"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono font-semibold text-txt-muted mb-2 uppercase tracking-widest">Email</label>
              <input
                type="text"
                value={user?.email || ''}
                readOnly
                className="input-dark !bg-surface-200/30 !text-txt-muted cursor-not-allowed"
              />
            </div>

            {/* Password */}
            {!showSenha ? (
              <button
                onClick={() => setShowSenha(true)}
                className="text-xs font-medium transition-colors"
                style={{ color: 'var(--color-primary-light)' }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7' }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
              >
                Alterar senha
              </button>
            ) : (
              <div className="space-y-3 pt-2 border-t border-surface-300/15">
                <div>
                  <label className="block text-[10px] font-mono font-semibold text-txt-muted mb-2 uppercase tracking-widest">Nova senha</label>
                  <input
                    type="password"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    placeholder="Minimo 6 caracteres"
                    className="input-dark"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono font-semibold text-txt-muted mb-2 uppercase tracking-widest">Confirmar senha</label>
                  <input
                    type="password"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="input-dark"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAlterarSenha}
                    disabled={saving || novaSenha.length < 6}
                    className="btn-primary text-[12px] px-4 py-2 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    Alterar senha
                  </button>
                  <button
                    onClick={() => { setShowSenha(false); setNovaSenha(''); setConfirmarSenha(''); }}
                    className="text-[12px] text-txt-muted hover:text-txt px-3 py-2 rounded-xl hover:bg-surface-200/30 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Logo da Sidebar */}
        {expert && (
          <section className="card-dark p-6">
            <h2 className="text-sm font-semibold text-txt font-display mb-5">Logo da Sidebar</h2>
            <div className="flex items-start gap-5">
              {/* Preview atual */}
              <div
                className="w-16 h-16 rounded-2xl shrink-0 flex items-center justify-center overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {(logoPreview || currentLogo) ? (
                  <img src={logoPreview || currentLogo!} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <Image className="w-6 h-6 text-white/15" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                {!showLogoModal ? (
                  <button
                    onClick={() => setShowLogoModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200"
                    style={{ background: 'rgba(var(--color-primary-rgb),0.1)', border: '1px solid rgba(var(--color-primary-rgb),0.2)', color: 'var(--color-primary-light)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.18)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.1)' }}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Trocar Logo
                  </button>
                ) : (
                  <div className="space-y-3">
                    {/* Input de arquivo */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      onChange={handleLogoSelect}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex flex-col items-center gap-2 py-5 rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer"
                      style={{ borderColor: 'rgba(var(--color-primary-rgb),0.2)', background: 'rgba(var(--color-primary-rgb),0.03)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(var(--color-primary-rgb),0.4)'; e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.06)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(var(--color-primary-rgb),0.2)'; e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.03)' }}
                    >
                      <Upload className="w-5 h-5" style={{ color: 'var(--color-primary-light)', opacity: 0.6 }} />
                      <span className="text-[12px] text-white/40">
                        {logoFile ? logoFile.name : 'Clique para selecionar uma imagem'}
                      </span>
                    </button>

                    {/* Dicas */}
                    <div className="flex items-start gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <Info className="w-3.5 h-3.5 text-white/25 shrink-0 mt-0.5" />
                      <div className="text-[10px] text-white/30 leading-relaxed space-y-0.5">
                        <p>Dimensão recomendada: <strong className="text-white/50">128x128px</strong> ou <strong className="text-white/50">256x256px</strong></p>
                        <p>Formatos: PNG, JPG, SVG ou WebP</p>
                        <p>Tamanho máximo: 5MB</p>
                        <p>Fundo transparente funciona melhor na sidebar</p>
                      </div>
                    </div>

                    {/* Botões */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleLogoUpload}
                        disabled={!logoFile || uploadingLogo}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                        style={{ background: 'var(--color-primary)', color: '#fff', boxShadow: '0 2px 12px rgba(var(--color-primary-rgb),0.2)' }}
                      >
                        {uploadingLogo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        {uploadingLogo ? 'Enviando...' : 'Salvar Logo'}
                      </button>
                      <button
                        onClick={() => { setShowLogoModal(false); setLogoFile(null); setLogoPreview(null); }}
                        className="text-[12px] text-txt-muted hover:text-txt px-3 py-2 rounded-xl hover:bg-surface-200/30 transition-all"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Notifications */}
        <section className="card-dark p-6">
          <h2 className="text-sm font-semibold text-txt font-display mb-5">Preferencias de Notificacao</h2>
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-txt">Novos Leads</p>
                <p className="text-[11px] text-txt-dim mt-0.5">Receber alerta quando alguem entrar pelo Instagram</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={notificarNovosLeads}
                onClick={() => setNotificarNovosLeads(!notificarNovosLeads)}
                className="relative w-10 h-5 rounded-full transition-colors duration-200 shrink-0"
                style={{ background: notificarNovosLeads ? 'rgba(var(--color-primary-rgb),0.3)' : 'rgba(255,255,255,0.08)' }}
              >
                <span
                  className="absolute top-[2px] left-[2px] w-4 h-4 rounded-full transition-all duration-200"
                  style={{ background: notificarNovosLeads ? 'var(--color-primary)' : 'rgba(255,255,255,0.35)', transform: notificarNovosLeads ? 'translateX(20px)' : 'translateX(0)' }}
                />
              </button>
            </div>
            <div className="h-px bg-surface-300/15" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-txt">Conversoes</p>
                <p className="text-[11px] text-txt-dim mt-0.5">Notificar quando alguem entrar no grupo</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={notificarConversoes}
                onClick={() => setNotificarConversoes(!notificarConversoes)}
                className="relative w-10 h-5 rounded-full transition-colors duration-200 shrink-0"
                style={{ background: notificarConversoes ? 'rgba(var(--color-primary-rgb),0.3)' : 'rgba(255,255,255,0.08)' }}
              >
                <span
                  className="absolute top-[2px] left-[2px] w-4 h-4 rounded-full transition-all duration-200"
                  style={{ background: notificarConversoes ? 'var(--color-primary)' : 'rgba(255,255,255,0.35)', transform: notificarConversoes ? 'translateX(20px)' : 'translateX(0)' }}
                />
              </button>
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            onClick={handleSalvar}
            disabled={saving}
            className="btn-primary flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar Alteracoes
          </button>
        </div>
      </div>

      {toast && <Toast toast={toast} onClose={hideToast} />}
    </div>
  );
};
