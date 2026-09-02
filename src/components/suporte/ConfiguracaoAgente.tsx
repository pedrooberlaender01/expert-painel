import React, { useState, useEffect } from 'react';
import { Settings, Zap, Brain, Loader2, Save, Timer, Sparkles } from 'lucide-react';
import type { SuporteAgenteConfig } from '../../types/suporte';

interface Props {
  config: SuporteAgenteConfig | null;
  loading: boolean;
  onSave: (dados: Partial<SuporteAgenteConfig>) => Promise<void>;
  showToast: (type: 'success' | 'error', message: string) => void;
}

export const ConfiguracaoAgente: React.FC<Props> = ({ config, loading, onSave, showToast }) => {
  const [form, setForm] = useState({
    nome_agente: '',
    ativo: true,
    prompt_sistema: '',
    mensagem_boas_vindas: '',
    mensagem_nao_sabe: 'Desculpe, nao consegui encontrar uma resposta para sua pergunta. Vou encaminhar para um atendente.',
    delay_digitacao_min: 1000,
    delay_digitacao_max: 3000,
    debounce_segundos: 8,
    similaridade_minima: 0.75,
    temperatura: 0.3,
    contexto_max_mensagens: 10,
    modelo_llm: 'gpt-4o-mini',
    max_tokens: 500,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setForm({
        nome_agente: config.nome_agente || '',
        ativo: config.ativo,
        prompt_sistema: config.prompt_sistema || '',
        mensagem_boas_vindas: config.mensagem_boas_vindas || '',
        mensagem_nao_sabe: config.mensagem_nao_sabe || '',
        delay_digitacao_min: config.delay_digitacao_min,
        delay_digitacao_max: config.delay_digitacao_max,
        debounce_segundos: config.debounce_segundos ?? 8,
        similaridade_minima: config.similaridade_minima,
        temperatura: config.temperatura,
        contexto_max_mensagens: config.contexto_max_mensagens,
        modelo_llm: config.modelo_llm || 'gpt-4o-mini',
        max_tokens: config.max_tokens || 500,
      });
    }
  }, [config]);

  const handleSave = async () => {
    if (!form.nome_agente.trim()) {
      showToast('error', 'Nome do agente e obrigatorio');
      return;
    }
    try {
      setSaving(true);
      await onSave(form);
      showToast('success', 'Configuracao salva com sucesso');
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-primary-light)' }} />
      </div>
    );
  }

  // Helpers para porcentagem dos sliders
  const delayPct = (val: number) => ((val - 500) / (5000 - 500)) * 100;
  const ragPct = ((form.similaridade_minima - 0.5) / (0.95 - 0.5)) * 100;
  const tempPct = ((form.temperatura - 0.1) / (1.0 - 0.1)) * 100;
  const debouncePct = ((form.debounce_segundos - 3) / (20 - 3)) * 100;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Card: Identidade do Agente */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <Settings className="w-[18px] h-[18px]" style={{ color: 'var(--color-primary-light)' }} />
          <h3 className="text-[15px] font-semibold text-txt">Identidade do Agente</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--c-t-50)' }}>
              Nome do agente
            </label>
            <input
              type="text"
              value={form.nome_agente}
              onChange={(e) => setForm((prev) => ({ ...prev, nome_agente: e.target.value }))}
              placeholder="Ex: Assistente de Suporte"
              className="w-full px-3.5 py-2.5 rounded-xl text-[13px] text-txt placeholder-txt-dim outline-none transition-all duration-200 focus:ring-1"
              style={{
                background: 'var(--c-glass)',
                border: '1px solid var(--c-border)',
              }}
            />
          </div>

          {/* Toggle ativo */}
          <div className="flex items-center justify-between py-1">
            <div>
              <span className="text-[13px] text-txt font-medium">Agente ativo</span>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--c-t-35)' }}>
                Quando desativado, o agente ignora todas as mensagens recebidas
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <span
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: form.ativo ? '#34d399' : 'rgba(248,113,113,0.6)' }}
              >
                {form.ativo ? 'Ativo' : 'Inativo'}
              </span>
              <button
                onClick={() => setForm((prev) => ({ ...prev, ativo: !prev.ativo }))}
                className="relative w-11 h-6 rounded-full transition-all duration-200"
                style={{
                  background: form.ativo ? 'rgba(var(--color-primary-rgb), 0.4)' : 'var(--c-glass-hover)',
                  border: form.ativo ? '1px solid rgba(var(--color-primary-rgb), 0.6)' : '1px solid var(--c-border-strong)',
                }}
              >
                <div
                  className="absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200"
                  style={{
                    left: form.ativo ? '22px' : '2px',
                    background: form.ativo ? 'var(--color-primary)' : 'rgb(var(--c-fg-rgb) / 0.3)',
                  }}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Card: Comportamento */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <Brain className="w-[18px] h-[18px]" style={{ color: 'var(--color-primary-light)' }} />
          <h3 className="text-[15px] font-semibold text-txt">Comportamento</h3>
        </div>

        <div className="space-y-5">
          {/* Prompt do sistema com counter */}
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--c-t-50)' }}>
              Prompt do sistema
            </label>
            <div className="relative">
              <textarea
                value={form.prompt_sistema}
                onChange={(e) => setForm((prev) => ({ ...prev, prompt_sistema: e.target.value }))}
                placeholder="Voce e um assistente de suporte especializado em... Responda de forma educada e objetiva. Use a base de conhecimento para fundamentar suas respostas."
                rows={5}
                className="w-full px-3.5 py-2.5 pb-7 rounded-xl text-[13px] text-txt placeholder-txt-dim outline-none transition-all duration-200 focus:ring-1 resize-none"
                style={{
                  background: 'var(--c-glass)',
                  border: '1px solid var(--c-border)',
                }}
              />
              <span
                className="absolute bottom-2.5 right-3.5 text-[10px] font-mono pointer-events-none"
                style={{ color: 'var(--c-t-20)' }}
              >
                {form.prompt_sistema.length} caracteres
              </span>
            </div>
          </div>

          {/* Divisor */}
          <div className="h-px" style={{ background: 'var(--c-glass-hover)' }} />

          {/* Mensagem de boas-vindas com preview */}
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--c-t-50)' }}>
              Mensagem de boas-vindas
            </label>
            <textarea
              value={form.mensagem_boas_vindas}
              onChange={(e) => setForm((prev) => ({ ...prev, mensagem_boas_vindas: e.target.value }))}
              placeholder="Ola! Sou o assistente de suporte. Como posso te ajudar?"
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl text-[13px] text-txt placeholder-txt-dim outline-none transition-all duration-200 focus:ring-1 resize-none"
              style={{
                background: 'var(--c-glass)',
                border: '1px solid var(--c-border)',
              }}
            />
            {form.mensagem_boas_vindas && (
              <div className="mt-2.5 flex justify-end">
                <div
                  className="relative px-3 py-2 rounded-xl rounded-br-sm text-[11px] leading-relaxed max-w-[85%]"
                  style={{
                    background: 'rgba(var(--color-primary-rgb), 0.1)',
                    border: '1px solid rgba(var(--color-primary-rgb), 0.06)',
                    color: 'var(--c-t-60)',
                  }}
                >
                  {form.mensagem_boas_vindas}
                  <span className="block text-right text-[9px] mt-1 opacity-40">Preview</span>
                </div>
              </div>
            )}
          </div>

          {/* Mensagem quando nao sabe com preview */}
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--c-t-50)' }}>
              Mensagem quando nao sabe responder
            </label>
            <textarea
              value={form.mensagem_nao_sabe}
              onChange={(e) => setForm((prev) => ({ ...prev, mensagem_nao_sabe: e.target.value }))}
              placeholder="Desculpe, nao consegui encontrar uma resposta..."
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl text-[13px] text-txt placeholder-txt-dim outline-none transition-all duration-200 focus:ring-1 resize-none"
              style={{
                background: 'var(--c-glass)',
                border: '1px solid var(--c-border)',
              }}
            />
            {form.mensagem_nao_sabe && (
              <div className="mt-2.5 flex justify-end">
                <div
                  className="relative px-3 py-2 rounded-xl rounded-br-sm text-[11px] leading-relaxed max-w-[85%]"
                  style={{
                    background: 'rgba(248,113,113,0.07)',
                    border: '1px solid rgba(248,113,113,0.05)',
                    color: 'var(--c-t-60)',
                  }}
                >
                  {form.mensagem_nao_sabe}
                  <span className="block text-right text-[9px] mt-1 opacity-40">Preview</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card: Configuracoes Tecnicas */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <Zap className="w-[18px] h-[18px]" style={{ color: '#facc3c' }} />
          <h3 className="text-[15px] font-semibold text-txt">Configuracoes Tecnicas</h3>
        </div>

        {/* Bloco: Debounce */}
        <div
          className="rounded-xl p-4 mb-5"
          style={{ background: 'var(--c-glass-2)', border: '1px solid var(--c-border)' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Timer className="w-3.5 h-3.5" style={{ color: '#34d399' }} />
            <p className="text-[12px] text-txt-muted font-semibold tracking-wide">Tempo de espera (debounce)</p>
          </div>
          <p className="text-[10px] mb-4 leading-relaxed" style={{ color: 'var(--c-t-25)' }}>
            Segundos que o agente aguarda antes de responder. Se o cliente mandar varias mensagens seguidas, elas sao combinadas em uma so.
          </p>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] text-txt-dim">Tempo de espera para juntar mensagens</label>
              <span
                className="text-[12px] font-bold font-mono tabular-nums"
                style={{
                  color: form.debounce_segundos <= 6 ? '#60a5fa'
                    : form.debounce_segundos <= 12 ? '#34d399'
                    : '#facc3c',
                }}
              >
                {form.debounce_segundos}s
              </span>
            </div>
            <div className="relative h-8 flex items-center">
              <div className="absolute inset-x-0 h-[6px] rounded-full overflow-hidden" style={{ background: 'var(--c-glass)' }}>
                <div
                  className="h-full rounded-full transition-all duration-150"
                  style={{
                    width: `${debouncePct}%`,
                    background: 'linear-gradient(90deg, rgba(96,165,250,0.7), rgba(52,211,153,0.7), rgba(250,204,60,0.7))',
                  }}
                />
              </div>
              <input
                type="range"
                min={3}
                max={20}
                step={1}
                value={form.debounce_segundos}
                onChange={(e) => setForm((prev) => ({ ...prev, debounce_segundos: Number(e.target.value) }))}
                className="reactivity-slider absolute inset-x-0 w-full h-8 cursor-pointer appearance-none bg-transparent z-10"
                style={{ margin: 0 }}
              />
            </div>
            <div className="flex justify-between mt-1.5 px-0.5">
              <span className="text-[9px] font-medium" style={{ color: 'rgba(96,165,250,0.5)' }}>Rapido</span>
              <span className="text-[9px] font-medium" style={{ color: 'rgba(250,204,60,0.5)' }}>Paciente</span>
            </div>
          </div>
        </div>

        {/* Bloco: Delay de Digitacao */}
        <div
          className="rounded-xl p-4 mb-5"
          style={{ background: 'var(--c-glass-2)', border: '1px solid var(--c-border)' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Timer className="w-3.5 h-3.5" style={{ color: '#60a5fa' }} />
            <p className="text-[12px] text-txt-muted font-semibold tracking-wide">Delay de Digitacao</p>
          </div>
          <p className="text-[10px] mb-4 leading-relaxed" style={{ color: 'var(--c-t-25)' }}>
            Simula tempo de digitacao antes de enviar a resposta
          </p>

          <div className="grid grid-cols-2 gap-5">
            {/* Delay Min */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] text-txt-dim">Minimo</label>
                <span
                  className="text-[12px] font-bold font-mono tabular-nums"
                  style={{
                    color: form.delay_digitacao_min <= 1500 ? '#60a5fa'
                      : form.delay_digitacao_min <= 3000 ? '#fbbf24'
                      : '#fb923c',
                  }}
                >
                  {(form.delay_digitacao_min / 1000).toFixed(1)}s
                </span>
              </div>
              <div className="relative h-8 flex items-center">
                <div className="absolute inset-x-0 h-[6px] rounded-full overflow-hidden" style={{ background: 'var(--c-glass)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-150"
                    style={{
                      width: `${delayPct(form.delay_digitacao_min)}%`,
                      background: 'linear-gradient(90deg, rgba(96,165,250,0.7), rgba(251,191,36,0.7))',
                    }}
                  />
                </div>
                <input
                  type="range"
                  min={500}
                  max={5000}
                  step={100}
                  value={form.delay_digitacao_min}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setForm((prev) => ({
                      ...prev,
                      delay_digitacao_min: val,
                      delay_digitacao_max: Math.max(val, prev.delay_digitacao_max),
                    }));
                  }}
                  className="reactivity-slider absolute inset-x-0 w-full h-8 cursor-pointer appearance-none bg-transparent z-10"
                  style={{ margin: 0 }}
                />
              </div>
              <div className="flex justify-between mt-1.5 px-0.5">
                <span className="text-[9px] font-medium" style={{ color: 'rgba(96,165,250,0.5)' }}>Rapido</span>
                <span className="text-[9px] font-medium" style={{ color: 'rgba(251,191,36,0.5)' }}>Lento</span>
              </div>
            </div>

            {/* Delay Max */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] text-txt-dim">Maximo</label>
                <span
                  className="text-[12px] font-bold font-mono tabular-nums"
                  style={{
                    color: form.delay_digitacao_max <= 1500 ? '#60a5fa'
                      : form.delay_digitacao_max <= 3000 ? '#fbbf24'
                      : '#fb923c',
                  }}
                >
                  {(form.delay_digitacao_max / 1000).toFixed(1)}s
                </span>
              </div>
              <div className="relative h-8 flex items-center">
                <div className="absolute inset-x-0 h-[6px] rounded-full overflow-hidden" style={{ background: 'var(--c-glass)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-150"
                    style={{
                      width: `${delayPct(form.delay_digitacao_max)}%`,
                      background: 'linear-gradient(90deg, rgba(96,165,250,0.7), rgba(251,191,36,0.7))',
                    }}
                  />
                </div>
                <input
                  type="range"
                  min={500}
                  max={5000}
                  step={100}
                  value={form.delay_digitacao_max}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setForm((prev) => ({
                      ...prev,
                      delay_digitacao_max: val,
                      delay_digitacao_min: Math.min(val, prev.delay_digitacao_min),
                    }));
                  }}
                  className="reactivity-slider absolute inset-x-0 w-full h-8 cursor-pointer appearance-none bg-transparent z-10"
                  style={{ margin: 0 }}
                />
              </div>
              <div className="flex justify-between mt-1.5 px-0.5">
                <span className="text-[9px] font-medium" style={{ color: 'rgba(96,165,250,0.5)' }}>Rapido</span>
                <span className="text-[9px] font-medium" style={{ color: 'rgba(251,191,36,0.5)' }}>Lento</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bloco: Inteligencia Artificial */}
        <div
          className="rounded-xl p-4"
          style={{ background: 'var(--c-glass-2)', border: '1px solid var(--c-border)' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-3.5 h-3.5" style={{ color: '#a78bfa' }} />
            <p className="text-[12px] text-txt-muted font-semibold tracking-wide">Inteligencia Artificial</p>
          </div>
          <p className="text-[10px] mb-5 leading-relaxed" style={{ color: 'var(--c-t-25)' }}>
            Ajuste a precisao e criatividade das respostas do agente
          </p>

          {/* Similaridade minima RAG */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] text-txt-dim">Similaridade minima RAG</label>
              <span
                className="text-[12px] font-bold font-mono tabular-nums"
                style={{
                  color: form.similaridade_minima >= 0.8 ? '#34d399'
                    : form.similaridade_minima >= 0.65 ? '#fbbf24'
                    : '#fb923c',
                }}
              >
                {form.similaridade_minima.toFixed(2)}
              </span>
            </div>
            <div className="relative h-8 flex items-center">
              <div className="absolute inset-x-0 h-[6px] rounded-full overflow-hidden" style={{ background: 'var(--c-glass)' }}>
                <div
                  className="h-full rounded-full transition-all duration-150"
                  style={{
                    width: `${ragPct}%`,
                    background: 'linear-gradient(90deg, rgba(251,191,36,0.7), rgba(52,211,153,0.7))',
                  }}
                />
              </div>
              <input
                type="range"
                min={0.5}
                max={0.95}
                step={0.05}
                value={form.similaridade_minima}
                onChange={(e) => setForm((prev) => ({ ...prev, similaridade_minima: Number(e.target.value) }))}
                className="reactivity-slider absolute inset-x-0 w-full h-8 cursor-pointer appearance-none bg-transparent z-10"
                style={{ margin: 0 }}
              />
            </div>
            <div className="flex justify-between mt-1.5 px-0.5">
              <span className="text-[9px] font-medium" style={{ color: 'rgba(251,191,36,0.5)' }}>Mais flexivel</span>
              <span className="text-[9px] font-medium" style={{ color: 'rgba(52,211,153,0.5)' }}>Mais preciso</span>
            </div>
            <p className="text-[10px] mt-2 leading-relaxed" style={{ color: 'var(--c-t-20)' }}>
              Quao similar a pergunta deve ser para usar a base de conhecimento
            </p>
          </div>

          {/* Divisor */}
          <div className="h-px mb-5" style={{ background: 'var(--c-glass-hover)' }} />

          {/* Temperatura */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] text-txt-dim">Temperatura</label>
              <span
                className="text-[12px] font-bold font-mono tabular-nums"
                style={{
                  color: form.temperatura <= 0.3 ? '#60a5fa'
                    : form.temperatura <= 0.6 ? '#a78bfa'
                    : '#c084fc',
                }}
              >
                {form.temperatura.toFixed(1)}
                <span className="text-[10px] font-medium ml-1 opacity-60">
                  {form.temperatura <= 0.2 ? '— Preciso'
                    : form.temperatura <= 0.4 ? '— Factual'
                    : form.temperatura <= 0.7 ? '— Equilibrado'
                    : '— Criativo'}
                </span>
              </span>
            </div>
            <div className="relative h-8 flex items-center">
              <div className="absolute inset-x-0 h-[6px] rounded-full overflow-hidden" style={{ background: 'var(--c-glass)' }}>
                <div
                  className="h-full rounded-full transition-all duration-150"
                  style={{
                    width: `${tempPct}%`,
                    background: 'linear-gradient(90deg, rgba(96,165,250,0.7), rgba(167,139,250,0.7))',
                  }}
                />
              </div>
              {/* Marcadores de referencia */}
              <div className="absolute inset-x-0 h-[6px] flex items-center pointer-events-none">
                {[0.3, 0.5, 0.7].map((mark) => (
                  <div
                    key={mark}
                    className="absolute w-px h-3 rounded-full"
                    style={{
                      left: `${((mark - 0.1) / (1.0 - 0.1)) * 100}%`,
                      background: 'var(--c-glass-hover)',
                    }}
                  />
                ))}
              </div>
              <input
                type="range"
                min={0.1}
                max={1.0}
                step={0.1}
                value={form.temperatura}
                onChange={(e) => setForm((prev) => ({ ...prev, temperatura: Number(e.target.value) }))}
                className="reactivity-slider absolute inset-x-0 w-full h-8 cursor-pointer appearance-none bg-transparent z-10"
                style={{ margin: 0 }}
              />
            </div>
            <div className="flex justify-between mt-1.5 px-0.5">
              <span className="text-[9px] font-medium" style={{ color: 'rgba(96,165,250,0.5)' }}>Mais objetivo</span>
              <span className="text-[9px] font-medium" style={{ color: 'rgba(167,139,250,0.5)' }}>Mais criativo</span>
            </div>
            <p className="text-[10px] mt-2 leading-relaxed" style={{ color: 'var(--c-t-20)' }}>
              Valores baixos geram respostas mais previsiveis e factuais
            </p>
          </div>

          {/* Divisor */}
          <div className="h-px mb-5" style={{ background: 'var(--c-glass-hover)' }} />

          {/* Contexto maximo */}
          <div>
            <label className="block text-[11px] text-txt-dim mb-1">Ultimas mensagens para contexto</label>
            <p className="text-[10px] mb-2.5 leading-relaxed" style={{ color: 'var(--c-t-20)' }}>
              Quantas mensagens anteriores o agente considera ao responder
            </p>
            <input
              type="number"
              min={1}
              max={30}
              value={form.contexto_max_mensagens}
              onChange={(e) => setForm((prev) => ({ ...prev, contexto_max_mensagens: Math.min(30, Math.max(1, Number(e.target.value))) }))}
              className="w-32 px-3.5 py-2.5 rounded-xl text-[13px] text-txt outline-none transition-all duration-200 focus:ring-1"
              style={{
                background: 'var(--c-glass)',
                border: '1px solid var(--c-border)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Botao Salvar */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-6 py-3 rounded-xl text-[13px] font-semibold text-white transition-all duration-200 disabled:opacity-50"
        style={{
          background: 'var(--color-primary)',
          boxShadow: '0 0 20px rgba(var(--color-primary-rgb), 0.3)',
        }}
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Salvar Configuracao
      </button>
    </div>
  );
};
