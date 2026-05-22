import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Upload, X, Check, Copy, CheckCheck, LayoutDashboard, MessagesSquare, Bot, UsersRound, Send, Trophy, MessageSquare, Phone, Eye, EyeOff, RefreshCw, Trash2, AlertTriangle, Lock, Users, Ban, GitBranch, Clock, Shield, FileText, Radio, Headset, CalendarPlus, CalendarClock, FlaskConical, Sparkles } from 'lucide-react';
import { cn } from '../../utils/cn';
import { PageHeader } from '../../components/PageHeader';
import { useAdminExperts } from '../../hooks/useAdminExperts';
import type { ExpertFormData } from '../../types/admin';
import type { PlanoRow } from '../../types/database';
import type { ExpertDetail } from '../../hooks/useAdminExperts';
import { N8N_GEND } from '../../config/webhooks';

// --- Color palette ---
const COLOR_PALETTE = [
  '#10b981', 'var(--color-primary)', '#8b5cf6', '#f59e0b', '#ef4444',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#06b6d4',
];

const INPUT_CLASS = 'w-full px-3 py-2.5 rounded-xl text-sm text-white bg-white/[0.04] border border-white/[0.06] focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 placeholder-white/[0.25] transition-all';

const SECTION_KEYS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'conversas', label: 'Conversas', icon: MessagesSquare },
  { key: 'leads', label: 'Leads Assistente', icon: Bot },
  { key: 'grupos', label: 'Grupos', icon: UsersRound },
  { key: 'envios', label: 'Envios', icon: Send },
  { key: 'torneios', label: 'Torneios', icon: Trophy },
  { key: 'mensagens', label: 'Mensagens', icon: MessageSquare },
  { key: 'central_whatsapp', label: 'Central WhatsApp', icon: Phone },
  { key: 'premiacoes', label: 'Premiacoes', icon: Trophy },
  { key: 'suporte', label: 'Suporte', icon: Headset },
] as const;

const GRUPOS_SUB_KEYS = [
  { key: 'grupos_membros', label: 'Membros', icon: Users },
  { key: 'grupos_fechar_abrir', label: 'Fechar/Abrir Grupos', icon: Lock },
  { key: 'grupos_blacklist', label: 'Blacklist', icon: Ban },
  { key: 'grupos_bots', label: 'Bots de Engajamento', icon: Bot },
] as const;

const MODERACAO_SUB_KEYS = [
  { key: 'grupos_moderacao_grupos', label: 'Grupos Monitorados', icon: Shield },
  { key: 'grupos_moderacao_log', label: 'Log de Ações', icon: FileText },
  { key: 'grupos_moderacao_instancia', label: 'Instância', icon: Radio },
  { key: 'grupos_fechar_abrir', label: 'Fechar/Abrir', icon: Lock },
] as const;

const TORNEIOS_SUB_KEYS = [
  { key: 'torneios_instancia', label: 'Instância Torneio', icon: Trophy },
  { key: 'torneios_copy', label: 'Copy Torneio', icon: MessageSquare },
] as const;

const MENSAGENS_SUB_KEYS = [
  { key: 'mensagens_funil', label: 'Etapas do Funil', icon: GitBranch },
  { key: 'mensagens_followups', label: 'Follow-ups & Automáticas', icon: Clock },
  { key: 'mensagens_boas_vindas', label: 'Boas-vindas', icon: Users },
  { key: 'mensagens_abertura', label: 'Mensagens de Abertura', icon: MessageSquare },
] as const;

const ENVIOS_SUB_KEYS = [
  { key: 'envios_novo_agendamento', label: 'Novo Agendamento', icon: CalendarPlus },
  { key: 'envios_agendados', label: 'Agendados', icon: CalendarClock },
  { key: 'envios_simulador', label: 'Simular Mensagem', icon: FlaskConical },
  { key: 'envios_gerar_copy', label: 'Gerar Copy', icon: Sparkles },
] as const;

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
          className="w-28 px-2 py-1.5 rounded-lg text-xs text-white bg-white/[0.04] border border-white/[0.06] focus:border-primary/50 focus:outline-none placeholder-white/[0.25]"
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
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);
  const [planos, setPlanos] = useState<PlanoRow[]>([]);
  const [detail, setDetail] = useState<ExpertDetail | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Telegram bot state
  const [tgBotToken, setTgBotToken] = useState('');
  const [tgShowToken, setTgShowToken] = useState(false);
  const [tgBot, setTgBot] = useState<{ chat_id: string; nome: string; username: string; bot_token: string } | null>(null);
  const [tgCanais, setTgCanais] = useState<{ chat_id: string; nome: string; username: string; tipo: string }[]>([]);
  const [tgWebhookOk, setTgWebhookOk] = useState<boolean | null>(null);
  const [tgLoading, setTgLoading] = useState(false);
  const [tgLoadingWebhook, setTgLoadingWebhook] = useState(false);
  const [tgLoadingRemove, setTgLoadingRemove] = useState(false);
  const [tgConfirmRemove, setTgConfirmRemove] = useState(false);
  const [tgError, setTgError] = useState<string | null>(null);
  const [tgSuccess, setTgSuccess] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState<ExpertFormData>({
    nome: '',
    slug: '',
    cor_primaria: '#10b981',
    cor_secundaria: 'var(--color-primary)',
    logo_url: null,
    favicon_url: null,
    nome_plataforma: '',
    nome_assistente: 'Helena',
    voice_id: null,
    plano_id: null,
    ativo: true,
    secoes_habilitadas: null,
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
        favicon_url: data.expert.favicon_url,
        nome_plataforma: data.expert.nome_plataforma,
        nome_assistente: data.expert.nome_assistente,
        voice_id: data.expert.voice_id,
        plano_id: data.expert.plano_id,
        ativo: data.expert.ativo,
        secoes_habilitadas: data.expert.secoes_habilitadas || null,
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

  // ─── Telegram Bot Functions ───────────────────────────────────────────

  const loadTelegramBot = useCallback(async () => {
    if (!id) return;
    const { supabase } = await import('../../lib/supabase');

    // Busca bot
    const { data: botData } = await supabase
      .from('telegram_canais')
      .select('chat_id, nome, username, bot_token')
      .eq('expert_id', id)
      .eq('tipo', 'bot')
      .limit(1)
      .single();

    if (botData) {
      setTgBot(botData);
      // Verifica webhook
      try {
        const resp = await fetch(`https://api.telegram.org/bot${botData.bot_token}/getWebhookInfo`);
        const info = await resp.json();
        setTgWebhookOk(info.ok && info.result?.url?.includes(id));
      } catch {
        setTgWebhookOk(false);
      }
    }

    // Busca canais
    const { data: canaisData } = await supabase
      .from('telegram_canais')
      .select('chat_id, nome, username, tipo')
      .eq('expert_id', id)
      .neq('tipo', 'bot')
      .eq('ativo', true)
      .order('nome');

    if (canaisData) setTgCanais(canaisData);
  }, [id]);

  const handleConfigurarBot = async () => {
    if (!id || !tgBotToken.trim()) return;
    setTgError(null);
    setTgSuccess(null);
    setTgLoading(true);

    try {
      // 1. Validar token
      const meResp = await fetch(`https://api.telegram.org/bot${tgBotToken}/getMe`);
      const meData = await meResp.json();
      if (!meData.ok) {
        setTgError('Token inválido. Verifique e tente novamente.');
        return;
      }

      const botInfo = meData.result;

      // 2. Salvar no Supabase
      const { supabase } = await import('../../lib/supabase');
      const { error: dbError } = await supabase.from('telegram_canais').upsert(
        {
          chat_id: `bot_${botInfo.username}`,
          nome: botInfo.first_name,
          username: botInfo.username,
          tipo: 'bot',
          bot_token: tgBotToken,
          ativo: true,
          expert_id: id,
        },
        { onConflict: 'chat_id' }
      );
      if (dbError) {
        setTgError(`Erro ao salvar bot: ${dbError.message}`);
        return;
      }

      // 3. Registrar webhook
      const webhookUrl = `https://n8n-gend.srv1431760.hstgr.cloud/webhook/telegram-updates?expert_id=${id}`;
      const whResp = await fetch(`https://api.telegram.org/bot${tgBotToken}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl, allowed_updates: ['my_chat_member', 'chat_member'] }),
      });
      const whData = await whResp.json();

      if (whData.ok) {
        setTgSuccess('Bot configurado e webhook ativo!');
        setTgWebhookOk(true);
      } else {
        setTgSuccess('Bot salvo mas webhook falhou. Tente reconfigurar.');
        setTgWebhookOk(false);
      }

      setTgBot({ chat_id: `bot_${botInfo.username}`, nome: botInfo.first_name, username: botInfo.username, bot_token: tgBotToken });
      setTgBotToken('');
    } catch (err: unknown) {
      setTgError(err instanceof Error ? err.message : 'Erro ao configurar bot');
    } finally {
      setTgLoading(false);
    }
  };

  const handleReconfigurarWebhook = async () => {
    if (!id || !tgBot) return;
    setTgError(null);
    setTgSuccess(null);
    setTgLoadingWebhook(true);

    try {
      const webhookUrl = `https://n8n-gend.srv1431760.hstgr.cloud/webhook/telegram-updates?expert_id=${id}`;
      const resp = await fetch(`https://api.telegram.org/bot${tgBot.bot_token}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl, allowed_updates: ['my_chat_member', 'chat_member'] }),
      });
      const data = await resp.json();

      if (data.ok) {
        setTgSuccess('Webhook reconfigurado com sucesso!');
        setTgWebhookOk(true);
      } else {
        setTgError('Falha ao reconfigurar webhook');
        setTgWebhookOk(false);
      }
    } catch (err: unknown) {
      setTgError(err instanceof Error ? err.message : 'Erro ao reconfigurar webhook');
    } finally {
      setTgLoadingWebhook(false);
    }
  };

  const handleRemoverBot = async () => {
    if (!id || !tgBot) return;
    setTgError(null);
    setTgSuccess(null);
    setTgLoadingRemove(true);

    try {
      // Remove webhook
      try {
        await fetch(`https://api.telegram.org/bot${tgBot.bot_token}/deleteWebhook`);
      } catch {
        // Ignora erro no delete webhook
      }

      // Remove do banco
      const { supabase } = await import('../../lib/supabase');
      await supabase
        .from('telegram_canais')
        .delete()
        .eq('expert_id', id)
        .eq('tipo', 'bot');

      setTgBot(null);
      setTgWebhookOk(null);
      setTgConfirmRemove(false);
      setTgSuccess('Bot removido com sucesso');
    } catch (err: unknown) {
      setTgError(err instanceof Error ? err.message : 'Erro ao remover bot');
    } finally {
      setTgLoadingRemove(false);
    }
  };

  useEffect(() => {
    if (isEditing) {
      loadDetail();
      loadTelegramBot();
    } else {
      loadPlanos();
    }
  }, [isEditing, loadDetail, loadPlanos, loadTelegramBot]);

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

  const handleFaviconUpload = async (file: File) => {
    setUploadingFavicon(true);
    const { url, error } = await uploadLogo(file);
    if (error) {
      setErrorMsg(`Erro no upload: ${error}`);
    } else if (url) {
      setForm((prev) => ({ ...prev, favicon_url: url }));
    }
    setUploadingFavicon(false);
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
        <Loader2 className="w-6 h-6 text-primary-light animate-spin" />
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
            className="border-2 border-dashed border-white/[0.08] rounded-xl p-8 text-center cursor-pointer hover:border-primary/30 hover:bg-primary/[0.02] transition-all"
          >
            {uploadingLogo ? (
              <Loader2 className="w-6 h-6 text-primary-light animate-spin mx-auto" />
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

        {/* Section 3.5: Favicon */}
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Favicon</h3>
          <p className="text-[11px] text-white/35">Icone exibido na aba do navegador. Recomendado: imagem quadrada, 32x32 ou 64x64.</p>

          {form.favicon_url && (
            <div className="flex items-center gap-3">
              <img
                src={form.favicon_url}
                alt="Favicon"
                className="w-8 h-8 rounded object-cover border border-white/10"
              />
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, favicon_url: null }))}
                className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div
            onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file && file.type.startsWith('image/')) handleFaviconUpload(file); }}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => faviconInputRef.current?.click()}
            className="border-2 border-dashed border-white/[0.08] rounded-xl p-6 text-center cursor-pointer hover:border-primary/30 hover:bg-primary/[0.02] transition-all"
          >
            {uploadingFavicon ? (
              <Loader2 className="w-5 h-5 text-primary-light animate-spin mx-auto" />
            ) : (
              <>
                <Upload className="w-5 h-5 text-white/30 mx-auto mb-2" />
                <p className="text-xs text-white/40">Arraste ou clique para enviar</p>
              </>
            )}
          </div>
          <input
            ref={faviconInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFaviconUpload(file);
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

        {/* Section 4.5: Secoes do Painel */}
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Secoes do Painel</h3>
          <p className="text-xs text-white/30">Controle a visibilidade de cada secao: visivel, cadeado ou oculta</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {SECTION_KEYS.map(({ key, label, icon: Icon }) => {
              // Resolve estado: retrocompat com formato boolean antigo
              // Secoes opt-in (premiacoes, suporte) sao 'hidden' por default quando chave ausente
              // — espelha HIDDEN_BY_DEFAULT em src/hooks/useSectionGate.ts
              const HIDDEN_BY_DEFAULT_KEYS = new Set(['premiacoes', 'suporte']);
              const raw = form.secoes_habilitadas?.[key];
              const defaultState = HIDDEN_BY_DEFAULT_KEYS.has(key) ? 'hidden' : 'enabled';
              const state: 'enabled' | 'disabled' | 'hidden' =
                raw === 'enabled' || raw === true ? 'enabled'
                : raw === 'disabled' || raw === false ? 'disabled'
                : raw === 'hidden' ? 'hidden'
                : defaultState;

              // Ciclo: enabled → disabled → hidden → enabled
              const nextState = state === 'enabled' ? 'disabled' : state === 'disabled' ? 'hidden' : 'enabled';

              const stateConfig = {
                enabled: { border: 'rgba(var(--color-primary-rgb),0.3)', bg: 'rgba(var(--color-primary-rgb),0.06)', iconColor: 'var(--color-primary-light)', labelColor: '#fff', badge: 'Visivel', badgeBg: 'rgba(var(--color-primary-rgb),0.15)', badgeBorder: 'rgba(var(--color-primary-rgb),0.25)', badgeColor: 'var(--color-primary-light)' },
                disabled: { border: 'rgba(250,204,21,0.25)', bg: 'rgba(250,204,21,0.04)', iconColor: '#facc15', labelColor: 'rgba(255,255,255,0.5)', badge: 'Cadeado', badgeBg: 'rgba(250,204,21,0.1)', badgeBorder: 'rgba(250,204,21,0.2)', badgeColor: '#facc15' },
                hidden: { border: 'rgba(255,255,255,0.04)', bg: 'rgba(255,255,255,0.02)', iconColor: 'rgba(255,255,255,0.15)', labelColor: 'rgba(255,255,255,0.25)', badge: 'Oculta', badgeBg: 'rgba(255,255,255,0.04)', badgeBorder: 'rgba(255,255,255,0.06)', badgeColor: 'rgba(255,255,255,0.3)' },
              }[state];

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setForm((prev) => {
                      const current = prev.secoes_habilitadas || {
                        dashboard: 'enabled', conversas: 'enabled', leads: 'enabled', grupos: 'enabled',
                        envios: 'enabled', torneios: 'enabled', mensagens: 'enabled', central_whatsapp: 'enabled',
                        premiacoes: 'hidden', suporte: 'hidden',
                      };
                      return { ...prev, secoes_habilitadas: { ...current, [key]: nextState } };
                    });
                  }}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200"
                  style={{ borderColor: stateConfig.border, background: stateConfig.bg }}
                >
                  <div className="relative">
                    <Icon className="w-5 h-5" style={{ color: stateConfig.iconColor }} />
                    {state === 'disabled' && <Lock className="w-2.5 h-2.5 absolute -bottom-0.5 -right-1" style={{ color: '#facc15' }} />}
                    {state === 'hidden' && <EyeOff className="w-2.5 h-2.5 absolute -bottom-0.5 -right-1" style={{ color: 'rgba(255,255,255,0.25)' }} />}
                  </div>
                  <span className="text-[11px] font-medium text-center leading-tight" style={{ color: stateConfig.labelColor }}>{label}</span>
                  <span
                    className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md"
                    style={{ background: stateConfig.badgeBg, border: `1px solid ${stateConfig.badgeBorder}`, color: stateConfig.badgeColor }}
                  >
                    {stateConfig.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 4.6: Funcionalidades de Grupos */}
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Funcionalidades de Grupos</h3>
          <p className="text-xs text-white/30">Controle as funcionalidades disponíveis dentro da aba Grupos</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {GRUPOS_SUB_KEYS.map(({ key, label, icon: Icon }) => {
              const raw = form.secoes_habilitadas?.[key];
              const state: 'enabled' | 'disabled' | 'hidden' =
                raw === 'enabled' || raw === true || raw === undefined ? 'enabled'
                : raw === 'disabled' || raw === false ? 'disabled'
                : 'hidden';

              const nextState = state === 'enabled' ? 'disabled' : state === 'disabled' ? 'hidden' : 'enabled';

              const stateConfig = {
                enabled: { border: 'rgba(var(--color-primary-rgb),0.3)', bg: 'rgba(var(--color-primary-rgb),0.06)', iconColor: 'var(--color-primary-light)', labelColor: '#fff', badge: 'Visivel', badgeBg: 'rgba(var(--color-primary-rgb),0.15)', badgeBorder: 'rgba(var(--color-primary-rgb),0.25)', badgeColor: 'var(--color-primary-light)' },
                disabled: { border: 'rgba(250,204,21,0.25)', bg: 'rgba(250,204,21,0.04)', iconColor: '#facc15', labelColor: 'rgba(255,255,255,0.5)', badge: 'Cadeado', badgeBg: 'rgba(250,204,21,0.1)', badgeBorder: 'rgba(250,204,21,0.2)', badgeColor: '#facc15' },
                hidden: { border: 'rgba(255,255,255,0.04)', bg: 'rgba(255,255,255,0.02)', iconColor: 'rgba(255,255,255,0.15)', labelColor: 'rgba(255,255,255,0.25)', badge: 'Oculta', badgeBg: 'rgba(255,255,255,0.04)', badgeBorder: 'rgba(255,255,255,0.06)', badgeColor: 'rgba(255,255,255,0.3)' },
              }[state];

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setForm((prev) => {
                      const current = prev.secoes_habilitadas || {};
                      return { ...prev, secoes_habilitadas: { ...current, [key]: nextState } };
                    });
                  }}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200"
                  style={{ borderColor: stateConfig.border, background: stateConfig.bg }}
                >
                  <div className="relative">
                    <Icon className="w-5 h-5" style={{ color: stateConfig.iconColor }} />
                    {state === 'disabled' && <Lock className="w-2.5 h-2.5 absolute -bottom-0.5 -right-1" style={{ color: '#facc15' }} />}
                    {state === 'hidden' && <EyeOff className="w-2.5 h-2.5 absolute -bottom-0.5 -right-1" style={{ color: 'rgba(255,255,255,0.25)' }} />}
                  </div>
                  <span className="text-[11px] font-medium text-center leading-tight" style={{ color: stateConfig.labelColor }}>{label}</span>
                  <span
                    className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md"
                    style={{ background: stateConfig.badgeBg, border: `1px solid ${stateConfig.badgeBorder}`, color: stateConfig.badgeColor }}
                  >
                    {stateConfig.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 4.65: Funcionalidades de Moderação */}
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Abas de Moderação</h3>
          <p className="text-xs text-white/30">Controle as abas disponíveis dentro de Grupos → Moderação</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {MODERACAO_SUB_KEYS.map(({ key, label, icon: Icon }) => {
              const raw = form.secoes_habilitadas?.[key];
              const state: 'enabled' | 'disabled' | 'hidden' =
                raw === 'enabled' || raw === true || raw === undefined ? 'enabled'
                : raw === 'disabled' || raw === false ? 'disabled'
                : 'hidden';

              const nextState = state === 'enabled' ? 'disabled' : state === 'disabled' ? 'hidden' : 'enabled';

              const stateConfig = {
                enabled: { border: 'rgba(var(--color-primary-rgb),0.3)', bg: 'rgba(var(--color-primary-rgb),0.06)', iconColor: 'var(--color-primary-light)', labelColor: '#fff', badge: 'Visivel', badgeBg: 'rgba(var(--color-primary-rgb),0.15)', badgeBorder: 'rgba(var(--color-primary-rgb),0.25)', badgeColor: 'var(--color-primary-light)' },
                disabled: { border: 'rgba(250,204,21,0.25)', bg: 'rgba(250,204,21,0.04)', iconColor: '#facc15', labelColor: 'rgba(255,255,255,0.5)', badge: 'Cadeado', badgeBg: 'rgba(250,204,21,0.1)', badgeBorder: 'rgba(250,204,21,0.2)', badgeColor: '#facc15' },
                hidden: { border: 'rgba(255,255,255,0.04)', bg: 'rgba(255,255,255,0.02)', iconColor: 'rgba(255,255,255,0.15)', labelColor: 'rgba(255,255,255,0.25)', badge: 'Oculta', badgeBg: 'rgba(255,255,255,0.04)', badgeBorder: 'rgba(255,255,255,0.06)', badgeColor: 'rgba(255,255,255,0.3)' },
              }[state];

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setForm((prev) => {
                      const current = prev.secoes_habilitadas || {};
                      return { ...prev, secoes_habilitadas: { ...current, [key]: nextState } };
                    });
                  }}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200"
                  style={{ borderColor: stateConfig.border, background: stateConfig.bg }}
                >
                  <div className="relative">
                    <Icon className="w-5 h-5" style={{ color: stateConfig.iconColor }} />
                    {state === 'disabled' && <Lock className="w-2.5 h-2.5 absolute -bottom-0.5 -right-1" style={{ color: '#facc15' }} />}
                    {state === 'hidden' && <EyeOff className="w-2.5 h-2.5 absolute -bottom-0.5 -right-1" style={{ color: 'rgba(255,255,255,0.25)' }} />}
                  </div>
                  <span className="text-[11px] font-medium text-center leading-tight" style={{ color: stateConfig.labelColor }}>{label}</span>
                  <span
                    className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md"
                    style={{ background: stateConfig.badgeBg, border: `1px solid ${stateConfig.badgeBorder}`, color: stateConfig.badgeColor }}
                  >
                    {stateConfig.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 4.7: Funcionalidades de Torneios */}
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Funcionalidades de Torneios</h3>
          <p className="text-xs text-white/30">Controle as funcionalidades disponíveis dentro da aba Torneios</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TORNEIOS_SUB_KEYS.map(({ key, label, icon: Icon }) => {
              const raw = form.secoes_habilitadas?.[key];
              const state: 'enabled' | 'disabled' | 'hidden' =
                raw === 'enabled' || raw === true || raw === undefined ? 'enabled'
                : raw === 'disabled' || raw === false ? 'disabled'
                : 'hidden';

              const nextState = state === 'enabled' ? 'disabled' : state === 'disabled' ? 'hidden' : 'enabled';

              const stateConfig = {
                enabled: { border: 'rgba(var(--color-primary-rgb),0.3)', bg: 'rgba(var(--color-primary-rgb),0.06)', iconColor: 'var(--color-primary-light)', labelColor: '#fff', badge: 'Visivel', badgeBg: 'rgba(var(--color-primary-rgb),0.15)', badgeBorder: 'rgba(var(--color-primary-rgb),0.25)', badgeColor: 'var(--color-primary-light)' },
                disabled: { border: 'rgba(250,204,21,0.25)', bg: 'rgba(250,204,21,0.04)', iconColor: '#facc15', labelColor: 'rgba(255,255,255,0.5)', badge: 'Cadeado', badgeBg: 'rgba(250,204,21,0.1)', badgeBorder: 'rgba(250,204,21,0.2)', badgeColor: '#facc15' },
                hidden: { border: 'rgba(255,255,255,0.04)', bg: 'rgba(255,255,255,0.02)', iconColor: 'rgba(255,255,255,0.15)', labelColor: 'rgba(255,255,255,0.25)', badge: 'Oculta', badgeBg: 'rgba(255,255,255,0.04)', badgeBorder: 'rgba(255,255,255,0.06)', badgeColor: 'rgba(255,255,255,0.3)' },
              }[state];

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setForm((prev) => {
                      const current = prev.secoes_habilitadas || {};
                      return { ...prev, secoes_habilitadas: { ...current, [key]: nextState } };
                    });
                  }}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200"
                  style={{ borderColor: stateConfig.border, background: stateConfig.bg }}
                >
                  <div className="relative">
                    <Icon className="w-5 h-5" style={{ color: stateConfig.iconColor }} />
                    {state === 'disabled' && <Lock className="w-2.5 h-2.5 absolute -bottom-0.5 -right-1" style={{ color: '#facc15' }} />}
                    {state === 'hidden' && <EyeOff className="w-2.5 h-2.5 absolute -bottom-0.5 -right-1" style={{ color: 'rgba(255,255,255,0.25)' }} />}
                  </div>
                  <span className="text-[11px] font-medium text-center leading-tight" style={{ color: stateConfig.labelColor }}>{label}</span>
                  <span
                    className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md"
                    style={{ background: stateConfig.badgeBg, border: `1px solid ${stateConfig.badgeBorder}`, color: stateConfig.badgeColor }}
                  >
                    {stateConfig.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 4.8: Funcionalidades de Mensagens */}
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Funcionalidades de Mensagens</h3>
          <p className="text-xs text-white/30">Controle as abas disponíveis dentro da página Mensagens</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {MENSAGENS_SUB_KEYS.map(({ key, label, icon: Icon }) => {
              const raw = form.secoes_habilitadas?.[key];
              const state: 'enabled' | 'disabled' | 'hidden' =
                raw === 'enabled' || raw === true || raw === undefined ? 'enabled'
                : raw === 'disabled' || raw === false ? 'disabled'
                : 'hidden';

              const nextState = state === 'enabled' ? 'disabled' : state === 'disabled' ? 'hidden' : 'enabled';

              const stateConfig = {
                enabled: { border: 'rgba(var(--color-primary-rgb),0.3)', bg: 'rgba(var(--color-primary-rgb),0.06)', iconColor: 'var(--color-primary-light)', labelColor: '#fff', badge: 'Visivel', badgeBg: 'rgba(var(--color-primary-rgb),0.15)', badgeBorder: 'rgba(var(--color-primary-rgb),0.25)', badgeColor: 'var(--color-primary-light)' },
                disabled: { border: 'rgba(250,204,21,0.25)', bg: 'rgba(250,204,21,0.04)', iconColor: '#facc15', labelColor: 'rgba(255,255,255,0.5)', badge: 'Cadeado', badgeBg: 'rgba(250,204,21,0.1)', badgeBorder: 'rgba(250,204,21,0.2)', badgeColor: '#facc15' },
                hidden: { border: 'rgba(255,255,255,0.04)', bg: 'rgba(255,255,255,0.02)', iconColor: 'rgba(255,255,255,0.15)', labelColor: 'rgba(255,255,255,0.25)', badge: 'Oculta', badgeBg: 'rgba(255,255,255,0.04)', badgeBorder: 'rgba(255,255,255,0.06)', badgeColor: 'rgba(255,255,255,0.3)' },
              }[state];

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setForm((prev) => {
                      const current = prev.secoes_habilitadas || {};
                      return { ...prev, secoes_habilitadas: { ...current, [key]: nextState } };
                    });
                  }}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200"
                  style={{ borderColor: stateConfig.border, background: stateConfig.bg }}
                >
                  <div className="relative">
                    <Icon className="w-5 h-5" style={{ color: stateConfig.iconColor }} />
                    {state === 'disabled' && <Lock className="w-2.5 h-2.5 absolute -bottom-0.5 -right-1" style={{ color: '#facc15' }} />}
                    {state === 'hidden' && <EyeOff className="w-2.5 h-2.5 absolute -bottom-0.5 -right-1" style={{ color: 'rgba(255,255,255,0.25)' }} />}
                  </div>
                  <span className="text-[11px] font-medium text-center leading-tight" style={{ color: stateConfig.labelColor }}>{label}</span>
                  <span
                    className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md"
                    style={{ background: stateConfig.badgeBg, border: `1px solid ${stateConfig.badgeBorder}`, color: stateConfig.badgeColor }}
                  >
                    {stateConfig.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 4.9: Funcionalidades de Envios */}
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Funcionalidades de Envios</h3>
          <p className="text-xs text-white/30">Controle as abas disponíveis dentro da página Envios</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {ENVIOS_SUB_KEYS.map(({ key, label, icon: Icon }) => {
              const raw = form.secoes_habilitadas?.[key];
              const state: 'enabled' | 'disabled' | 'hidden' =
                raw === 'enabled' || raw === true || raw === undefined ? 'enabled'
                : raw === 'disabled' || raw === false ? 'disabled'
                : 'hidden';

              const nextState = state === 'enabled' ? 'disabled' : state === 'disabled' ? 'hidden' : 'enabled';

              const stateConfig = {
                enabled: { border: 'rgba(var(--color-primary-rgb),0.3)', bg: 'rgba(var(--color-primary-rgb),0.06)', iconColor: 'var(--color-primary-light)', labelColor: '#fff', badge: 'Visivel', badgeBg: 'rgba(var(--color-primary-rgb),0.15)', badgeBorder: 'rgba(var(--color-primary-rgb),0.25)', badgeColor: 'var(--color-primary-light)' },
                disabled: { border: 'rgba(250,204,21,0.25)', bg: 'rgba(250,204,21,0.04)', iconColor: '#facc15', labelColor: 'rgba(255,255,255,0.5)', badge: 'Cadeado', badgeBg: 'rgba(250,204,21,0.1)', badgeBorder: 'rgba(250,204,21,0.2)', badgeColor: '#facc15' },
                hidden: { border: 'rgba(255,255,255,0.04)', bg: 'rgba(255,255,255,0.02)', iconColor: 'rgba(255,255,255,0.15)', labelColor: 'rgba(255,255,255,0.25)', badge: 'Oculta', badgeBg: 'rgba(255,255,255,0.04)', badgeBorder: 'rgba(255,255,255,0.06)', badgeColor: 'rgba(255,255,255,0.3)' },
              }[state];

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setForm((prev) => {
                      const current = prev.secoes_habilitadas || {};
                      return { ...prev, secoes_habilitadas: { ...current, [key]: nextState } };
                    });
                  }}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200"
                  style={{ borderColor: stateConfig.border, background: stateConfig.bg }}
                >
                  <div className="relative">
                    <Icon className="w-5 h-5" style={{ color: stateConfig.iconColor }} />
                    {state === 'disabled' && <Lock className="w-2.5 h-2.5 absolute -bottom-0.5 -right-1" style={{ color: '#facc15' }} />}
                    {state === 'hidden' && <EyeOff className="w-2.5 h-2.5 absolute -bottom-0.5 -right-1" style={{ color: 'rgba(255,255,255,0.25)' }} />}
                  </div>
                  <span className="text-[11px] font-medium text-center leading-tight" style={{ color: stateConfig.labelColor }}>{label}</span>
                  <span
                    className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md"
                    style={{ background: stateConfig.badgeBg, border: `1px solid ${stateConfig.badgeBorder}`, color: stateConfig.badgeColor }}
                  >
                    {stateConfig.badge}
                  </span>
                </button>
              );
            })}
          </div>
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
              {isEditing && <span className="text-white/30 ml-1">(digite a nova senha e clique em Alterar)</span>}
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={form.senha || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, senha: e.target.value }))}
                required={!isEditing}
                placeholder={isEditing ? '••••••••' : 'Senha de acesso'}
                className={`${INPUT_CLASS} flex-1`}
              />
              {isEditing && id && (
                <button
                  type="button"
                  disabled={!form.senha || form.senha.length < 4 || changingPassword}
                  onClick={async () => {
                    if (!form.senha || form.senha.length < 4) return;
                    setChangingPassword(true);
                    try {
                      const { supabase: sb } = await import('../../lib/supabase');
                      const { data, error } = await sb.rpc('admin_change_password', {
                        p_expert_id: id,
                        p_nova_senha: form.senha,
                      });
                      const result = data as { success: boolean; error?: string } | null;
                      if (error) { setErrorMsg(error.message); }
                      else if (result?.success) {
                        setSuccessMsg('Senha alterada com sucesso!');
                        setForm((prev) => ({ ...prev, senha: '' }));
                      } else {
                        setErrorMsg(result?.error || 'Erro ao alterar senha');
                      }
                    } catch {
                      setErrorMsg('Erro ao alterar senha');
                    } finally {
                      setChangingPassword(false);
                    }
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed shrink-0 flex items-center gap-1.5"
                  style={{ background: 'rgba(var(--color-primary-rgb),0.15)', border: '1px solid rgba(var(--color-primary-rgb),0.25)', color: 'var(--color-primary-light)' }}
                >
                  {changingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Alterar
                </button>
              )}
            </div>
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

        {/* Section 8: Telegram (edit only) */}
        {isEditing && id && (
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(56,189,248,0.12)' }}>
                <Send className="w-3.5 h-3.5 text-sky-400" />
              </div>
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Telegram</h3>
            </div>

            {/* Feedback */}
            {tgError && (
              <div className="px-3 py-2.5 rounded-xl text-xs text-red-400 bg-red-500/10 border border-red-500/20">
                {tgError}
              </div>
            )}
            {tgSuccess && (
              <div className="px-3 py-2.5 rounded-xl text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                {tgSuccess}
              </div>
            )}

            {!tgBot ? (
              /* Estado: Sem bot */
              <div className="space-y-3">
                <p className="text-xs text-white/35">Crie um bot no @BotFather do Telegram e cole o token aqui</p>
                <div>
                  <label className="block text-xs text-white/50 mb-1.5">Token do Bot</label>
                  <div className="relative">
                    <input
                      type={tgShowToken ? 'text' : 'password'}
                      value={tgBotToken}
                      onChange={(e) => setTgBotToken(e.target.value)}
                      placeholder="Cole o token do BotFather aqui"
                      className={`${INPUT_CLASS} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setTgShowToken(!tgShowToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    >
                      {tgShowToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={tgLoading || !tgBotToken.trim()}
                  onClick={handleConfigurarBot}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.25)', color: '#38bdf8' }}
                >
                  {tgLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Configurar Bot
                </button>
              </div>
            ) : (
              /* Estado: Bot configurado */
              <div className="space-y-4">
                {/* Info do bot */}
                <div className="flex items-center justify-between px-3.5 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(56,189,248,0.1)' }}>
                      <Bot className="w-4.5 h-4.5 text-sky-400" />
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium">{tgBot.nome}</p>
                      <p className="text-xs text-white/40 font-mono">@{tgBot.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: tgWebhookOk === true ? '#10b981' : tgWebhookOk === false ? '#f59e0b' : '#6b7280' }}
                    />
                    <span className="text-[11px]" style={{ color: tgWebhookOk === true ? '#34d399' : tgWebhookOk === false ? '#fbbf24' : 'rgba(255,255,255,0.3)' }}>
                      {tgWebhookOk === true ? 'Webhook ativo' : tgWebhookOk === false ? 'Webhook inativo' : 'Verificando...'}
                    </span>
                  </div>
                </div>

                {/* Token mascarado */}
                <div>
                  <label className="block text-xs text-white/50 mb-1.5">Token</label>
                  <p className="text-xs text-white/30 font-mono px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    {'••••••••••••' + (tgBot.bot_token ? ':' + tgBot.bot_token.slice(-4) : '')}
                  </p>
                </div>

                {/* Acoes */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={tgLoadingWebhook}
                    onClick={handleReconfigurarWebhook}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all disabled:opacity-40"
                    style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', color: '#38bdf8' }}
                  >
                    {tgLoadingWebhook ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Reconfigurar Webhook
                  </button>
                  {!tgConfirmRemove ? (
                    <button
                      type="button"
                      onClick={() => setTgConfirmRemove(true)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-white/40 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remover Bot
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span className="text-xs text-red-300">Confirmar?</span>
                      <button
                        type="button"
                        disabled={tgLoadingRemove}
                        onClick={handleRemoverBot}
                        className="text-xs font-semibold text-red-400 hover:text-red-300 transition-colors disabled:opacity-40"
                      >
                        {tgLoadingRemove ? 'Removendo...' : 'Sim'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setTgConfirmRemove(false)}
                        className="text-xs text-white/40 hover:text-white/60 transition-colors"
                      >
                        Não
                      </button>
                    </div>
                  )}
                </div>

                {/* Lista de canais */}
                {tgCanais.length > 0 && (
                  <div>
                    <label className="block text-xs text-white/50 mb-2">Canais ({tgCanais.length})</label>
                    <div className="space-y-1.5">
                      {tgCanais.map((canal) => (
                        <div
                          key={canal.chat_id}
                          className="flex items-center justify-between px-3 py-2 rounded-xl"
                          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-sky-400" />
                            <span className="text-sm text-white/80">{canal.nome}</span>
                            {canal.username && <span className="text-xs text-white/30 font-mono">@{canal.username}</span>}
                          </div>
                          <span className="text-[10px] text-white/25 font-mono uppercase">{canal.tipo}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Form actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50"
            style={{ background: 'rgba(var(--color-primary-rgb),0.2)', border: '1px solid rgba(var(--color-primary-rgb),0.3)' }}
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
