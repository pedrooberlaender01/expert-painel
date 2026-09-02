import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Plus,
  ChevronDown,
  ChevronUp,
  Loader2,
  Trash2,
  Pause,
  Play,
  Bot,
  Save,
  Zap,
} from 'lucide-react';
import { useBotGrupos } from '../../hooks/useBotGrupos';
import type { BotGrupoConfig, BotGrupoPersona, Instancia } from '../../hooks/useBotGrupos';
import { AdicionarGrupoModal } from './AdicionarGrupoModal';
import { AdicionarBotModal } from './AdicionarBotModal';

// ─── Helpers ───

const STATUS_STYLES: Record<string, { bg: string; border: string; color: string; label: string }> = {
  pendente: { bg: 'var(--c-glass)', border: '1px solid var(--c-border)', color: 'var(--c-t-40)', label: 'Pendente' },
  warmup: { bg: 'rgba(250,204,60,0.08)', border: '1px solid rgba(250,204,60,0.2)', color: '#facc3c', label: 'Warmup' },
  ativo: { bg: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399', label: 'Ativo' },
  ausente: { bg: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)', color: '#fb923c', label: 'Ausente' },
  pausado: { bg: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171', label: 'Pausado' },
};

function gerarCorDoNome(nome: string): string {
  let hash = 0;
  for (let i = 0; i < nome.length; i++) hash = nome.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 55%, 45%)`;
}

const inputClass = "w-full bg-glass-2 border border-glass text-txt rounded-lg py-2.5 px-3.5 text-[13px] placeholder-txt-dim focus:outline-none focus:border-[rgba(var(--color-primary-rgb),0.3)] focus:shadow-[0_0_0_3px_rgba(var(--color-primary-rgb),0.08)] transition-all";

// ─── Toggle component ───

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; size?: 'sm' | 'md' }> = ({ checked, onChange, size = 'md' }) => {
  const isSm = size === 'sm';
  const trackW = isSm ? 36 : 42;
  const trackH = isSm ? 20 : 24;
  const thumbSize = isSm ? 14 : 16;
  const thumbOn = trackW - thumbSize - 3;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative inline-flex shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:outline-none"
      style={{
        width: trackW,
        height: trackH,
        background: checked
          ? 'rgba(var(--color-primary-rgb),0.5)'
          : 'var(--c-glass-hover)',
        boxShadow: checked
          ? '0 0 8px rgba(var(--color-primary-rgb),0.15), inset 0 1px 2px rgba(0,0,0,0.1)'
          : 'inset 0 1px 2px rgba(0,0,0,0.2)',
      }}
    >
      <span
        className="pointer-events-none block rounded-full transition-all duration-200"
        style={{
          width: thumbSize,
          height: thumbSize,
          background: checked ? '#fff' : 'rgb(var(--c-fg-rgb) / 0.35)',
          transform: checked ? `translateX(${thumbOn}px)` : 'translateX(3px)',
          boxShadow: checked
            ? '0 1px 3px rgba(0,0,0,0.3), 0 0 4px rgba(var(--color-primary-rgb),0.2)'
            : '0 1px 2px rgba(0,0,0,0.3)',
        }}
      />
    </button>
  );
};

// ─── GrupoCard expandível ───

interface GrupoCardProps {
  grupo: BotGrupoConfig;
  showToast: (type: 'success' | 'error', message: string) => void;
  hookFns: ReturnType<typeof useBotGrupos>;
  instancias: Instancia[];
}

const GrupoCard: React.FC<GrupoCardProps> = ({ grupo, showToast, hookFns, instancias }) => {
  const [expanded, setExpanded] = useState(false);
  const [bots, setBots] = useState<BotGrupoPersona[]>([]);
  const [loadingBots, setLoadingBots] = useState(false);
  const [showAddBot, setShowAddBot] = useState(false);
  const [personasDisp, setPersonasDisp] = useState<Array<{ id: string; nome: string; foto_url: string | null }>>([]);
  const [loadingPersonas, setLoadingPersonas] = useState(false);

  // Config local (campos numéricos aceitam '' durante digitação)
  const [localConfig, setLocalConfig] = useState({
    triggers_ativos: { ...grupo.triggers_ativos },
    silencio_minutos: grupo.silencio_minutos as number | '',
    silencio_frases: grupo.silencio_frases,
    delay_entre_bots_min: grupo.delay_entre_bots_min as number | '',
    delay_entre_bots_max: grupo.delay_entre_bots_max as number | '',
    contexto_grupo: grupo.contexto_grupo || '',
    chance_responder: (grupo.chance_responder ?? 40) as number,
    cooldown_reativo_segundos: (grupo.cooldown_reativo_segundos ?? 300) as number | '',
  });

  // Normaliza campo numérico no blur (aplica default se vazio)
  const handleNumBlur = (field: string, fallback: number) => {
    setLocalConfig((prev) => {
      const val = (prev as Record<string, unknown>)[field];
      if (val === '' || val === undefined || val === null) return { ...prev, [field]: fallback };
      return prev;
    });
  };
  const [savingConfig, setSavingConfig] = useState(false);

  // Carregar bots ao expandir
  useEffect(() => {
    if (expanded && bots.length === 0) {
      setLoadingBots(true);
      hookFns.listarPersonasDoGrupo(grupo.id).then((data) => {
        setBots(data);
        setLoadingBots(false);
      });
    }
  }, [expanded, grupo.id]);

  const handleToggleAtivo = async () => {
    try {
      await hookFns.editarGrupo(grupo.id, { ativo: !grupo.ativo });
      showToast('success', grupo.ativo ? 'Grupo desativado' : 'Grupo ativado');
    } catch {
      showToast('error', 'Erro ao alterar status');
    }
  };

  const handleDeleteGrupo = async () => {
    try {
      await hookFns.deletarGrupo(grupo.id);
      showToast('success', 'Grupo removido');
    } catch {
      showToast('error', 'Erro ao remover grupo');
    }
  };

  const handleOpenAddBot = async () => {
    setLoadingPersonas(true);
    const disp = await hookFns.listarPersonasDisponiveis(grupo.id);
    setPersonasDisp(disp);
    setLoadingPersonas(false);
    setShowAddBot(true);
  };

  const handleAddBot = async (personaId: string, instanciaId: number, addToGroupData?: { adminInstanciaId: number; adminToken: string }) => {
    try {
      await hookFns.adicionarPersonaAoGrupo({
        bot_grupo_config_id: grupo.id,
        bot_persona_id: personaId,
        instancia_id: instanciaId,
      });

      // Se marcou "adicionar ao grupo", chamar webhook UAZAPI
      if (addToGroupData) {
        const instBot = instancias.find((i) => i.id === instanciaId);
        if (instBot?.numero) {
          await hookFns.adicionarBotAoGrupoWpp(grupo.grupo_id, instBot.numero, addToGroupData.adminToken);
        }
      }

      // Recarregar bots
      const updated = await hookFns.listarPersonasDoGrupo(grupo.id);
      setBots(updated);
      setShowAddBot(false);
      showToast('success', 'Bot adicionado ao grupo');
    } catch {
      showToast('error', 'Erro ao adicionar bot');
    }
  };

  const handleRemoveBot = async (botId: string) => {
    try {
      await hookFns.removerPersonaDoGrupo(botId, grupo.id);
      setBots((prev) => prev.filter((b) => b.id !== botId));
      showToast('success', 'Bot removido do grupo');
    } catch {
      showToast('error', 'Erro ao remover bot');
    }
  };

  const handleToggleBotStatus = async (bot: BotGrupoPersona) => {
    const newStatus = bot.status === 'pausado' ? 'ativo' : 'pausado';
    try {
      await hookFns.atualizarStatusBot(bot.id, newStatus);
      setBots((prev) => prev.map((b) => b.id === bot.id ? { ...b, status: newStatus } : b));
      showToast('success', newStatus === 'pausado' ? 'Bot pausado' : 'Bot ativado');
    } catch {
      showToast('error', 'Erro ao alterar status');
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      // Garantir que campos numéricos são números antes de salvar
      const silencio = Number(localConfig.silencio_minutos) || 30;
      const delayMin = Number(localConfig.delay_entre_bots_min) || 60;
      const delayMax = Number(localConfig.delay_entre_bots_max) || 300;
      const cooldown = Number(localConfig.cooldown_reativo_segundos) || 300;

      await hookFns.editarGrupo(grupo.id, {
        triggers_ativos: localConfig.triggers_ativos,
        silencio_minutos: silencio,
        silencio_frases: localConfig.silencio_frases,
        delay_entre_bots_min: delayMin,
        delay_entre_bots_max: delayMax,
        contexto_grupo: localConfig.contexto_grupo || null,
        chance_responder: localConfig.chance_responder,
        cooldown_reativo_segundos: cooldown,
      });
      showToast('success', 'Configurações salvas');
    } catch {
      showToast('error', 'Erro ao salvar configurações');
    } finally {
      setSavingConfig(false);
    }
  };

  const triggerLabels: Array<{ key: keyof typeof localConfig.triggers_ativos; label: string }> = [
    { key: 'hype', label: 'Hype' },
    { key: 'social_proof', label: 'Social Proof' },
    { key: 'engajamento', label: 'Engajamento' },
    { key: 'defesa', label: 'Defesa' },
    { key: 'pergunta_plantada', label: 'Pergunta Plantada' },
  ];

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-200"
      style={{ background: 'var(--c-glass)', border: '1px solid var(--c-border)' }}
    >
      {/* Header — sempre visível */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <h3 className="text-[14px] font-semibold text-txt truncate">{grupo.grupo_nome}</h3>
          <span
            className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(var(--color-primary-rgb),0.08)', color: 'var(--color-primary-light)', border: '1px solid rgba(var(--color-primary-rgb),0.15)' }}
          >
            {grupo.bots_count} bot{grupo.bots_count !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          <Toggle checked={grupo.ativo} onChange={handleToggleAtivo} size="sm" />
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-txt-dim shrink-0" />
          : <ChevronDown className="w-4 h-4 text-txt-dim shrink-0" />
        }
      </div>

      {/* Conteúdo expandido */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--c-border)' }}>
          {/* ─── Seção: Bots no Grupo ─── */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] uppercase tracking-wider text-txt-dim font-medium">Bots no Grupo</p>
              <button
                onClick={handleOpenAddBot}
                className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all"
                style={{ background: 'rgba(var(--color-primary-rgb),0.1)', border: '1px solid rgba(var(--color-primary-rgb),0.2)', color: 'var(--color-primary-light)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.2)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.1)' }}
              >
                <Plus className="w-3 h-3" /> Adicionar Bot
              </button>
            </div>

            {loadingBots ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 text-txt-dim animate-spin" />
              </div>
            ) : bots.length === 0 ? (
              <p className="text-[12px] text-txt-dim text-center py-4">Nenhum bot neste grupo</p>
            ) : (
              <div className="space-y-2">
                {bots.map((bot) => {
                  const statusStyle = STATUS_STYLES[bot.status] || STATUS_STYLES.pendente;
                  return (
                    <div
                      key={bot.id}
                      className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: 'var(--c-glass-2)', border: '1px solid var(--c-border)' }}
                    >
                      {/* Avatar */}
                      {bot.persona_foto_url ? (
                        <img src={bot.persona_foto_url} alt={bot.persona_nome} className="w-8 h-8 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-[11px] font-bold" style={{ background: gerarCorDoNome(bot.persona_nome) }}>
                          {bot.persona_nome.slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium text-txt truncate">{bot.persona_nome}</span>
                          <span
                            className="shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                            style={{ background: statusStyle.bg, border: statusStyle.border, color: statusStyle.color }}
                          >
                            {statusStyle.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-txt-dim truncate">
                          {bot.instancia_nome} · {bot.instancia_numero} · Msgs hoje: {bot.msgs_enviadas_hoje}/{bot.persona_msgs_por_dia_max}
                        </p>
                      </div>

                      {/* Ações */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleToggleBotStatus(bot)}
                          className="p-1.5 rounded-lg text-txt-dim hover:text-txt-muted hover:bg-glass transition-colors"
                          title={bot.status === 'pausado' ? 'Ativar' : 'Pausar'}
                        >
                          {bot.status === 'pausado' ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleRemoveBot(bot.id)}
                          className="p-1.5 rounded-lg text-red-400/40 hover:text-red-400 hover:bg-red-400/[0.04] transition-colors"
                          title="Remover"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ─── Seção: Configurações ─── */}
          <div className="px-4 py-3" style={{ borderTop: '1px solid var(--c-border)' }}>
            <p className="text-[11px] uppercase tracking-wider text-txt-dim font-medium mb-3">Configurações</p>

            {/* Triggers */}
            <div className="mb-4">
              <p className="text-[12px] text-txt-muted font-medium mb-2">Triggers</p>
              <div className="space-y-2">
                {triggerLabels.map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-[12px] text-txt-muted">{label}</span>
                    <Toggle
                      checked={localConfig.triggers_ativos[key]}
                      onChange={(v) => setLocalConfig((prev) => ({ ...prev, triggers_ativos: { ...prev.triggers_ativos, [key]: v } }))}
                      size="sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Silêncio */}
            <div className="mb-4">
              <p className="text-[12px] text-txt-muted font-medium mb-2">Detecção de Silêncio</p>
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] text-txt-dim mb-1">Minutos de silêncio para ativar</label>
                  <input
                    type="number"
                    value={localConfig.silencio_minutos}
                    onChange={(e) => setLocalConfig((prev) => ({ ...prev, silencio_minutos: e.target.value === '' ? '' : parseInt(e.target.value) }))}
                    onBlur={() => handleNumBlur('silencio_minutos', 30)}
                    className={inputClass}
                    min={1}
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-txt-dim mb-1">Frases para quebrar silêncio (1 por linha)</label>
                  <textarea
                    value={(localConfig.silencio_frases || []).join('\n')}
                    onChange={(e) => setLocalConfig((prev) => ({ ...prev, silencio_frases: e.target.value.split('\n').filter(Boolean) }))}
                    className={`${inputClass} resize-none`}
                    rows={3}
                    placeholder="E aí galera, sumiram?&#10;Tá muito silêncio aqui..."
                  />
                </div>
              </div>
            </div>

            {/* Delays */}
            <div className="mb-4">
              <p className="text-[12px] text-txt-muted font-medium mb-2">Delays entre bots</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-txt-dim mb-1">Mínimo (seg)</label>
                  <input
                    type="number"
                    value={localConfig.delay_entre_bots_min}
                    onChange={(e) => setLocalConfig((prev) => ({ ...prev, delay_entre_bots_min: e.target.value === '' ? '' : parseInt(e.target.value) }))}
                    onBlur={() => handleNumBlur('delay_entre_bots_min', 60)}
                    className={inputClass}
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-txt-dim mb-1">Máximo (seg)</label>
                  <input
                    type="number"
                    value={localConfig.delay_entre_bots_max}
                    onChange={(e) => setLocalConfig((prev) => ({ ...prev, delay_entre_bots_max: e.target.value === '' ? '' : parseInt(e.target.value) }))}
                    onBlur={() => handleNumBlur('delay_entre_bots_max', 300)}
                    className={inputClass}
                    min={0}
                  />
                </div>
              </div>
            </div>

            {/* ─── Reatividade ─── */}
            <div className="mb-5 rounded-xl p-4" style={{ background: 'var(--c-glass-2)', border: '1px solid var(--c-border)' }}>
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-3.5 h-3.5" style={{ color: 'var(--color-primary-light)' }} />
                <p className="text-[12px] text-txt-muted font-semibold tracking-wide">Reatividade</p>
              </div>

              {/* Chance de Responder — Slider */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[11px] text-txt-dim">Chance de responder</label>
                  <span className="text-[12px] font-bold tabular-nums" style={{
                    color: localConfig.chance_responder <= 30 ? '#60a5fa'
                      : localConfig.chance_responder <= 60 ? '#34d399'
                      : localConfig.chance_responder <= 80 ? '#fbbf24'
                      : '#f87171',
                  }}>
                    {localConfig.chance_responder}%
                    <span className="text-[10px] font-medium ml-1 opacity-60">
                      {localConfig.chance_responder <= 15 ? '— Silencioso'
                        : localConfig.chance_responder <= 30 ? '— Calmo'
                        : localConfig.chance_responder <= 60 ? '— Padrão'
                        : localConfig.chance_responder <= 80 ? '— Reativo'
                        : '— Muito Reativo'}
                    </span>
                  </span>
                </div>

                {/* Slider track + thumb */}
                <div className="relative h-8 flex items-center">
                  {/* Track background (segmentos de cor) */}
                  <div className="absolute inset-x-0 h-[6px] rounded-full overflow-hidden" style={{ background: 'var(--c-glass)' }}>
                    <div className="h-full rounded-full transition-all duration-150" style={{
                      width: `${localConfig.chance_responder}%`,
                      background: localConfig.chance_responder <= 30
                        ? 'linear-gradient(90deg, rgba(96,165,250,0.4), rgba(96,165,250,0.7))'
                        : localConfig.chance_responder <= 60
                        ? 'linear-gradient(90deg, rgba(96,165,250,0.5), rgba(52,211,153,0.7))'
                        : localConfig.chance_responder <= 80
                        ? 'linear-gradient(90deg, rgba(96,165,250,0.4), rgba(52,211,153,0.5), rgba(251,191,36,0.7))'
                        : 'linear-gradient(90deg, rgba(96,165,250,0.3), rgba(52,211,153,0.4), rgba(251,191,36,0.5), rgba(248,113,113,0.8))',
                      boxShadow: localConfig.chance_responder > 80
                        ? '0 0 12px rgba(248,113,113,0.2)'
                        : localConfig.chance_responder > 60
                        ? '0 0 8px rgba(251,191,36,0.15)'
                        : 'none',
                    }} />
                  </div>

                  {/* Marcadores de referencia */}
                  <div className="absolute inset-x-0 h-[6px] flex items-center pointer-events-none">
                    {[30, 60, 80].map((mark) => (
                      <div
                        key={mark}
                        className="absolute w-px h-3 rounded-full"
                        style={{
                          left: `${mark}%`,
                          background: 'var(--c-glass-hover)',
                        }}
                      />
                    ))}
                  </div>

                  {/* Input range invisivel sobre tudo (captura interacao) */}
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={localConfig.chance_responder}
                    onChange={(e) => setLocalConfig((prev) => ({ ...prev, chance_responder: parseInt(e.target.value) }))}
                    className="reactivity-slider absolute inset-x-0 w-full h-8 cursor-pointer appearance-none bg-transparent z-10"
                    style={{ margin: 0 }}
                  />
                </div>

                {/* Legenda de faixas */}
                <div className="flex justify-between mt-1.5 px-0.5">
                  <span className="text-[9px] text-blue-400/40 font-medium">Calmo</span>
                  <span className="text-[9px] text-emerald-400/40 font-medium">Padrão</span>
                  <span className="text-[9px] text-amber-400/40 font-medium">Reativo</span>
                  <span className="text-[9px] text-red-400/40 font-medium">Intenso</span>
                </div>

                <p className="text-[10px] text-txt-dim mt-2 leading-relaxed">
                  Porcentagem de chance do bot responder quando alguém manda mensagem no grupo
                </p>
              </div>

              {/* Cooldown entre Respostas */}
              <div>
                <label className="block text-[11px] text-txt-dim mb-2">Intervalo mínimo entre respostas</label>
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      value={localConfig.cooldown_reativo_segundos}
                      onChange={(e) => setLocalConfig((prev) => ({ ...prev, cooldown_reativo_segundos: e.target.value === '' ? '' : parseInt(e.target.value) }))}
                      onBlur={() => handleNumBlur('cooldown_reativo_segundos', 300)}
                      className={inputClass}
                      style={{ paddingRight: '70px' }}
                      min={0}
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] text-txt-dim font-medium pointer-events-none">
                      segundos
                    </span>
                  </div>
                </div>

                {/* Preset pills */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: '1min', value: 60 },
                    { label: '2min', value: 120 },
                    { label: '5min', value: 300 },
                    { label: '10min', value: 600 },
                  ].map((preset) => {
                    const isActive = localConfig.cooldown_reativo_segundos === preset.value;
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setLocalConfig((prev) => ({ ...prev, cooldown_reativo_segundos: preset.value }))}
                        className="px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all duration-150"
                        style={{
                          background: isActive ? 'rgba(var(--color-primary-rgb),0.15)' : 'var(--c-glass)',
                          border: `1px solid ${isActive ? 'rgba(var(--color-primary-rgb),0.3)' : 'var(--c-border)'}`,
                          color: isActive ? 'var(--color-primary-light)' : 'rgb(var(--c-fg-rgb) / 0.35)',
                          boxShadow: isActive ? '0 0 8px rgba(var(--color-primary-rgb),0.1)' : 'none',
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.background = 'var(--c-glass-hover)';
                            e.currentTarget.style.color = 'rgb(var(--c-fg-rgb) / 0.6)';
                            e.currentTarget.style.borderColor = 'var(--c-border-strong)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.background = 'var(--c-glass)';
                            e.currentTarget.style.color = 'rgb(var(--c-fg-rgb) / 0.35)';
                            e.currentTarget.style.borderColor = 'var(--c-border)';
                          }
                        }}
                      >
                        {preset.label}
                        <span className="ml-1 opacity-50">({preset.value}s)</span>
                      </button>
                    );
                  })}
                </div>

                <p className="text-[10px] text-txt-dim mt-2 leading-relaxed">
                  Tempo mínimo entre respostas reativas do bot
                </p>
              </div>
            </div>

            {/* Contexto */}
            <div className="mb-4">
              <p className="text-[12px] text-txt-muted font-medium mb-2">Contexto do grupo</p>
              <textarea
                value={localConfig.contexto_grupo}
                onChange={(e) => setLocalConfig((prev) => ({ ...prev, contexto_grupo: e.target.value }))}
                className={`${inputClass} resize-none`}
                rows={2}
                placeholder="Descreva o contexto deste grupo..."
              />
            </div>

            {/* Botão salvar */}
            <button
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="flex items-center gap-2 px-4 py-2 text-[12px] font-semibold rounded-xl transition-all disabled:opacity-50"
              style={{ background: 'var(--color-primary)', color: '#fff', boxShadow: '0 2px 12px rgba(var(--color-primary-rgb),0.2)' }}
            >
              {savingConfig ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Salvar Configurações
            </button>
          </div>

          {/* Botão remover grupo */}
          <div className="px-4 py-3 flex justify-end" style={{ borderTop: '1px solid var(--c-border)' }}>
            <button
              onClick={handleDeleteGrupo}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all"
              style={{ color: 'rgba(248,113,113,0.6)', background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.1)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(248,113,113,0.1)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(248,113,113,0.6)'; e.currentTarget.style.background = 'rgba(248,113,113,0.05)' }}
            >
              <Trash2 className="w-3 h-3" /> Remover Grupo
            </button>
          </div>
        </div>
      )}

      {/* Modais */}
      {showAddBot && (
        <AdicionarBotModal
          grupoNome={grupo.grupo_nome}
          personas={personasDisp}
          instancias={instancias}
          loadingPersonas={loadingPersonas}
          onSave={handleAddBot}
          onClose={() => setShowAddBot(false)}
        />
      )}
    </div>
  );
};

// ─── GruposAtivosTab (principal) ───

interface GruposAtivosTabProps {
  showToast: (type: 'success' | 'error', message: string) => void;
}

export const GruposAtivosTab: React.FC<GruposAtivosTabProps> = ({ showToast }) => {
  const hookFns = useBotGrupos();
  const { grupos, loading } = hookFns;

  const [showAddGrupo, setShowAddGrupo] = useState(false);
  const [instancias, setInstancias] = useState<Instancia[]>([]);
  const [instanciasLoaded, setInstanciasLoaded] = useState(false);

  // Carregar instâncias uma vez
  const loadInstancias = useCallback(async () => {
    if (instanciasLoaded) return;
    const data = await hookFns.listarInstancias();
    setInstancias(data);
    setInstanciasLoaded(true);
  }, [instanciasLoaded, hookFns.listarInstancias]);

  const handleOpenAddGrupo = async () => {
    await loadInstancias();
    setShowAddGrupo(true);
  };

  const handleAddGrupo = async (grupoId: string, grupoNome: string) => {
    try {
      await hookFns.criarGrupo({ grupo_id: grupoId, grupo_nome: grupoNome });
      showToast('success', 'Grupo adicionado');
      setShowAddGrupo(false);
    } catch {
      showToast('error', 'Erro ao adicionar grupo');
    }
  };

  // Carregar instâncias quando necessário para os cards
  useEffect(() => {
    if (grupos.length > 0 && !instanciasLoaded) {
      loadInstancias();
    }
  }, [grupos.length, instanciasLoaded, loadInstancias]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-txt-dim animate-spin" />
      </div>
    );
  }

  // ── Estado vazio ──
  if (grupos.length === 0) {
    return (
      <>
        <div
          className="flex flex-col items-center justify-center py-20 rounded-2xl"
          style={{ background: 'var(--c-glass-2)', border: '1px solid var(--c-border)' }}
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--c-glass)', border: '1px solid var(--c-border)' }}>
            <Users className="w-7 h-7" style={{ color: 'var(--c-t-15)' }} />
          </div>
          <p className="text-[15px] font-medium mb-1" style={{ color: 'var(--c-t-30)' }}>Nenhum grupo configurado</p>
          <p className="text-[12px] mb-5" style={{ color: 'var(--c-t-15)' }}>Adicione grupos para os bots atuarem</p>
          <button
            onClick={handleOpenAddGrupo}
            className="flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold rounded-xl transition-all"
            style={{ background: 'var(--color-primary)', color: '#fff', boxShadow: '0 2px 12px rgba(var(--color-primary-rgb),0.2)' }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(var(--color-primary-rgb),0.3)' }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(var(--color-primary-rgb),0.2)' }}
          >
            <Plus className="w-4 h-4" />
            Adicionar Grupo
          </button>
        </div>

        {showAddGrupo && (
          <AdicionarGrupoModal
            instancias={instancias}
            onBuscarGrupos={hookFns.buscarGruposWhatsApp}
            onSave={handleAddGrupo}
            onClose={() => setShowAddGrupo(false)}
          />
        )}
      </>
    );
  }

  // ── Lista ──
  return (
    <>
      {/* Header com botão */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] text-txt-dim">{grupos.length} grupo{grupos.length !== 1 ? 's' : ''} configurado{grupos.length !== 1 ? 's' : ''}</p>
        <button
          onClick={handleOpenAddGrupo}
          className="flex items-center gap-2 px-4 py-2 text-[12px] font-semibold rounded-xl transition-all"
          style={{ background: 'rgba(var(--color-primary-rgb),0.15)', border: '1px solid rgba(var(--color-primary-rgb),0.25)', color: 'var(--color-primary-light)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.25)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.15)' }}
        >
          <Plus className="w-3.5 h-3.5" />
          Adicionar Grupo
        </button>
      </div>

      {/* Cards em lista vertical */}
      <div className="space-y-3">
        {grupos.map((grupo) => (
          <GrupoCard
            key={grupo.id}
            grupo={grupo}
            showToast={showToast}
            hookFns={hookFns}
            instancias={instancias}
          />
        ))}
      </div>

      {/* Modal adicionar grupo */}
      {showAddGrupo && (
        <AdicionarGrupoModal
          instancias={instancias}
          onBuscarGrupos={hookFns.buscarGruposWhatsApp}
          onSave={handleAddGrupo}
          onClose={() => setShowAddGrupo(false)}
        />
      )}
    </>
  );
};
