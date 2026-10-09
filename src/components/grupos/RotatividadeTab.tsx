import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, Copy, Check, Trash2, RefreshCw, Shuffle, Search, AlertTriangle, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { WEBHOOKS, N8N_GEND, fetchWithTimeout } from '../../config/webhooks';

// Rotatividade: um link por rotação; cada clique manda o lead pro próximo grupo da lista (contador atômico na RPC proximo_grupo)

type ShowToast = (type: 'success' | 'error', message: string) => void;

interface Item {
  id: string;
  grupo_jid: string;
  grupo_nome: string | null;
  instancia: string | null; // null = link colado manualmente
  invite_link: string | null;
  ordem: number;
  ativo: boolean;
  cliques: number;
}

interface Rotacao {
  id: string;
  slug: string;
  nome: string;
  ativo: boolean;
  contador: number;
  alerta_numero: string | null;
  itens: Item[];
}

interface Instancia {
  id: number;
  nome: string;
  numero: string | null;
  instancia: string;
  token: string;
  status_conexao: string | null;
}

interface GrupoWpp {
  grupo_id: string;
  grupo_nome: string;
}

const LIMITE_ALERTA = 900;
const INPUT = 'w-full px-3 py-2.5 rounded-xl text-sm text-txt bg-glass border border-glass focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 placeholder-txt-dim';
const CARD = { background: 'var(--c-glass-2)', border: '1px solid var(--c-border)' };
const BTN_SOFT = { background: 'rgba(var(--color-primary-rgb),0.15)', border: '1px solid rgba(var(--color-primary-rgb),0.25)', color: 'var(--color-primary-light)' };

const linkPublico = (slug: string) => `${N8N_GEND}/grupo?r=${slug}`;
const LINK_CONVITE = /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]{10,}$/;

const gerarSlug = (txt: string) =>
  txt.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

async function buscarGruposWpp(inst: Instancia): Promise<GrupoWpp[]> {
  const res = await fetchWithTimeout(WEBHOOKS.BUSCAR_GRUPOS_AGENDAMENTO, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instancia: inst.instancia, token: inst.token }),
  });
  if (!res.ok) throw new Error(`status ${res.status}`);
  const data = await res.json();
  const lista: Record<string, string>[] = Array.isArray(data) ? data : Array.isArray(data?.grupos) ? data.grupos : [];
  return lista
    .map((g) => ({ grupo_id: g.grupo_id ?? g.id ?? g.jid, grupo_nome: g.grupo_nome ?? g.nome ?? g.subject ?? g.name ?? '' }))
    .filter((g) => !!g.grupo_id);
}

async function pegarConvites(token: string, jids: string[]): Promise<Record<string, string | null>> {
  const res = await fetchWithTimeout(WEBHOOKS.ROTACAO_GRUPOS_LINKS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, grupos: jids }),
  }, 120000);
  if (!res.ok) throw new Error(`status ${res.status}`);
  const data = await res.json();
  const mapa: Record<string, string | null> = {};
  for (const l of data?.links ?? []) mapa[l.grupo_jid] = l.invite_link ?? null;
  return mapa;
}

// ─── Confirmação de exclusão (modal do painel, no lugar do window.confirm) ───

interface Confirmacao {
  titulo: string;
  mensagem: string;
  acao: () => Promise<void>;
}

const ConfirmarModal: React.FC<{ confirmacao: Confirmacao; onClose: () => void }> = ({ confirmacao, onClose }) => {
  const [executando, setExecutando] = useState(false);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && !executando) onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [executando, onClose]);

  const confirmar = async () => {
    setExecutando(true);
    await confirmacao.acao();
    setExecutando(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70" onClick={() => !executando && onClose()} />
      <div className="relative w-full max-w-sm rounded-2xl animate-slide-up" style={{ background: 'var(--c-popup-bg)', border: '1px solid var(--c-border)' }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--c-border)' }}>
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5" style={{ color: '#f87171' }} />
            <h2 className="text-[15px] font-semibold text-txt font-display">{confirmacao.titulo}</h2>
          </div>
          <button onClick={onClose} disabled={executando} className="p-1.5 rounded-lg text-txt-dim" aria-label="Fechar">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="p-5 text-[13px] leading-relaxed" style={{ color: 'var(--c-t-50)' }}>{confirmacao.mensagem}</p>
        <div className="flex items-center justify-end gap-3 p-5" style={{ borderTop: '1px solid var(--c-border)' }}>
          <button
            onClick={onClose}
            disabled={executando}
            className="px-4 py-2 text-[13px] font-medium rounded-xl text-txt-dim"
            style={{ background: 'var(--c-glass)', border: '1px solid var(--c-border)' }}
          >
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={executando}
            autoFocus
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-white rounded-xl disabled:opacity-60"
            style={{ background: 'rgba(239,68,68,0.85)' }}
          >
            {executando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Card de uma rotação ───

interface CardProps {
  rotacao: Rotacao;
  instancias: Instancia[];
  expertId: string;
  showToast: ShowToast;
  onChange: () => void;
}

const RotacaoCard: React.FC<CardProps> = ({ rotacao, instancias, expertId, showToast, onChange }) => {
  const [copiado, setCopiado] = useState(false);
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);
  const [adicionando, setAdicionando] = useState(false);
  const [modo, setModo] = useState<'instancia' | 'manual'>('instancia');
  const [nomeManual, setNomeManual] = useState('');
  const [linkManual, setLinkManual] = useState('');
  const [instSel, setInstSel] = useState('');
  const [grupos, setGrupos] = useState<GrupoWpp[]>([]);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<'' | 'grupos' | 'salvar' | 'links'>('');

  const itens = [...rotacao.itens].sort((a, b) => a.ordem - b.ordem);
  const jaNaRotacao = new Set(itens.map((i) => i.grupo_jid));
  const temComInstancia = itens.some((i) => i.instancia);
  const proximaOrdem = itens.length ? Math.max(...itens.map((i) => i.ordem)) + 1 : 0;
  const ativosComLink = itens.filter((i) => i.ativo && i.invite_link).length;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(linkPublico(rotacao.slug));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      showToast('error', 'Não foi possível copiar');
    }
  };

  const toggleRotacao = async () => {
    const { error } = await supabase.from('rotacao_grupos').update({ ativo: !rotacao.ativo }).eq('id', rotacao.id);
    if (error) return showToast('error', 'Erro ao atualizar rotação');
    onChange();
  };

  const excluirRotacao = () => setConfirmacao({
    titulo: 'Excluir rotação?',
    mensagem: `A rotação "${rotacao.nome}" será excluída e o link para de funcionar. Esta ação não pode ser desfeita.`,
    acao: async () => {
      const { error } = await supabase.from('rotacao_grupos').delete().eq('id', rotacao.id);
      if (error) return showToast('error', 'Erro ao excluir');
      showToast('success', 'Rotação excluída');
      onChange();
    },
  });

  const toggleItem = async (item: Item) => {
    const { error } = await supabase.from('rotacao_grupos_itens').update({ ativo: !item.ativo }).eq('id', item.id);
    if (error) return showToast('error', 'Erro ao atualizar grupo');
    onChange();
  };

  const removerItem = (item: Item) => setConfirmacao({
    titulo: 'Remover grupo?',
    mensagem: `"${item.grupo_nome || item.grupo_jid}" sai da rotação e para de receber leads. A contagem de cliques dele é perdida.`,
    acao: async () => {
      const { error } = await supabase.from('rotacao_grupos_itens').delete().eq('id', item.id);
      if (error) return showToast('error', 'Erro ao remover grupo');
      showToast('success', 'Grupo removido');
      onChange();
    },
  });

  const carregarGrupos = async () => {
    const inst = instancias.find((i) => i.instancia === instSel);
    if (!inst) return;
    setLoading('grupos');
    try {
      setGrupos(await buscarGruposWpp(inst));
      setSelecionados(new Set());
    } catch {
      showToast('error', 'Erro ao buscar grupos — instância conectada?');
      setGrupos([]);
    } finally {
      setLoading('');
    }
  };

  const salvarGrupos = async () => {
    const inst = instancias.find((i) => i.instancia === instSel);
    if (!inst || selecionados.size === 0) return;
    setLoading('salvar');
    try {
      const jids = [...selecionados];
      const links = await pegarConvites(inst.token, jids);
      const base = proximaOrdem;
      const rows = jids.map((jid, idx) => ({
        rotacao_id: rotacao.id,
        expert_id: expertId,
        grupo_jid: jid,
        grupo_nome: grupos.find((g) => g.grupo_id === jid)?.grupo_nome ?? null,
        instancia: inst.instancia,
        invite_link: links[jid] ?? null,
        ordem: base + idx,
      }));
      const { error } = await supabase.from('rotacao_grupos_itens').upsert(rows, { onConflict: 'rotacao_id,grupo_jid' });
      if (error) throw error;
      const semLink = rows.filter((r) => !r.invite_link).length;
      showToast(semLink ? 'error' : 'success', semLink
        ? `${rows.length - semLink} adicionado(s); ${semLink} sem link de convite (a instância precisa ser admin do grupo)`
        : `${rows.length} grupo(s) adicionado(s)`);
      setAdicionando(false);
      setGrupos([]);
      onChange();
    } catch {
      showToast('error', 'Erro ao salvar grupos');
    } finally {
      setLoading('');
    }
  };

  // Grupo sem instância: grupo_jid recebe o próprio link (mantém unicidade por rotação)
  const salvarManual = async () => {
    const link = linkManual.trim().split('?')[0];
    if (!LINK_CONVITE.test(link)) return showToast('error', 'Link inválido — use o formato https://chat.whatsapp.com/XXXX');
    if (jaNaRotacao.has(link)) return showToast('error', 'Esse link já está na rotação');
    setLoading('salvar');
    const { error } = await supabase.from('rotacao_grupos_itens').insert({
      rotacao_id: rotacao.id,
      expert_id: expertId,
      grupo_jid: link,
      grupo_nome: nomeManual.trim() || null,
      instancia: null,
      invite_link: link,
      ordem: proximaOrdem,
    });
    setLoading('');
    if (error) return showToast('error', 'Erro ao adicionar link');
    showToast('success', 'Grupo adicionado');
    setNomeManual('');
    setLinkManual('');
    onChange();
  };

  // Recarrega links de convite (caso algum tenha sido revogado no WhatsApp). Links manuais ficam como estão.
  const atualizarLinks = async () => {
    setLoading('links');
    try {
      const porInstancia = new Map<string, Item[]>();
      for (const it of itens) {
        if (!it.instancia) continue;
        porInstancia.set(it.instancia, [...(porInstancia.get(it.instancia) ?? []), it]);
      }
      let falhas = 0;
      for (const [nomeInst, lista] of porInstancia) {
        const inst = instancias.find((i) => i.instancia === nomeInst);
        if (!inst) { falhas += lista.length; continue; }
        const links = await pegarConvites(inst.token, lista.map((i) => i.grupo_jid));
        await Promise.all(lista.map((it) => {
          if (!links[it.grupo_jid]) falhas++;
          return supabase.from('rotacao_grupos_itens').update({ invite_link: links[it.grupo_jid] ?? null }).eq('id', it.id);
        }));
      }
      showToast(falhas ? 'error' : 'success', falhas ? `${falhas} grupo(s) ficaram sem link` : 'Links atualizados');
      onChange();
    } catch {
      showToast('error', 'Erro ao atualizar links');
    } finally {
      setLoading('');
    }
  };

  return (
    <div className="rounded-2xl p-4 md:p-5 space-y-4" style={CARD}>
      {confirmacao && <ConfirmarModal confirmacao={confirmacao} onClose={() => setConfirmacao(null)} />}

      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-txt truncate">{rotacao.nome}</p>
          <p className="text-[12px] text-txt-dim">
            {rotacao.contador} clique{rotacao.contador !== 1 ? 's' : ''} · {ativosComLink} grupo{ativosComLink !== 1 ? 's' : ''} recebendo
            {rotacao.alerta_numero ? ` · alerta em ${LIMITE_ALERTA} p/ ${rotacao.alerta_numero}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleRotacao}
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium"
            style={rotacao.ativo
              ? { background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)', color: '#34d399' }
              : { background: 'var(--c-glass)', border: '1px solid var(--c-border)', color: 'var(--c-t-40)' }}
          >
            {rotacao.ativo ? 'Ativa' : 'Pausada'}
          </button>
          <button onClick={excluirRotacao} className="p-2 rounded-lg" style={{ color: '#f87171' }} title="Excluir rotação">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Link público */}
      <div className="flex items-center gap-2">
        <code className="flex-1 min-w-0 truncate px-3 py-2 rounded-xl text-[12px] text-txt-dim" style={{ background: 'var(--c-glass)', border: '1px solid var(--c-border)' }}>
          {linkPublico(rotacao.slug)}
        </code>
        <button onClick={copiar} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold shrink-0" style={BTN_SOFT}>
          {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copiado ? 'Copiado' : 'Copiar'}
        </button>
      </div>

      {/* Grupos da rotação */}
      {itens.length === 0 ? (
        <p className="text-[12px] text-txt-dim">Nenhum grupo ainda. Adicione pelo menos 1 para o link funcionar.</p>
      ) : (
        <div className="space-y-2">
          {itens.map((it, idx) => {
            const enchendo = it.cliques >= LIMITE_ALERTA;
            return (
              <div key={it.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: 'var(--c-glass)', border: '1px solid var(--c-border)', opacity: it.ativo ? 1 : 0.5 }}>
                <span className="text-[11px] tabular-nums text-txt-dim w-5 shrink-0">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-txt truncate">{it.grupo_nome || it.grupo_jid}</p>
                  <p className="text-[11px] text-txt-dim truncate">
                    {it.instancia ?? 'link manual'}
                    {!it.invite_link && <span style={{ color: '#f87171' }}> · sem link de convite</span>}
                  </p>
                </div>
                <span
                  className="flex items-center gap-1 text-[12px] font-semibold tabular-nums px-2 py-0.5 rounded-md shrink-0"
                  style={enchendo ? { background: 'rgba(250,204,60,0.12)', color: '#facc3c' } : { color: 'var(--c-t-50)' }}
                  title={enchendo ? 'Grupo enchendo — considere pausar e adicionar outro' : 'Direcionamentos'}
                >
                  {enchendo && <AlertTriangle className="w-3 h-3" />}
                  {it.cliques}
                </span>
                <button onClick={() => toggleItem(it)} className="text-[11px] px-2 py-1 rounded-md shrink-0" style={{ color: it.ativo ? '#34d399' : 'var(--c-t-40)', border: '1px solid var(--c-border)' }}>
                  {it.ativo ? 'Ativo' : 'Pausado'}
                </button>
                <button onClick={() => removerItem(it)} className="p-1 shrink-0" style={{ color: 'var(--c-t-35)' }} title="Remover">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Ações */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setAdicionando((v) => !v)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold" style={BTN_SOFT}>
          <Plus className="w-3.5 h-3.5" /> Adicionar grupos
        </button>
        {temComInstancia && (
          <button
            onClick={atualizarLinks}
            disabled={loading === 'links'}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium text-txt-dim"
            style={{ background: 'var(--c-glass)', border: '1px solid var(--c-border)' }}
          >
            {loading === 'links' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Atualizar links
          </button>
        )}
      </div>

      {/* Painel de adicionar grupos */}
      {adicionando && (
        <div className="space-y-3 p-3 rounded-xl" style={{ background: 'var(--c-glass)', border: '1px solid var(--c-border)' }}>
          <div className="inline-flex gap-1 p-[3px] rounded-lg" style={{ background: 'var(--c-glass-2)', border: '1px solid var(--c-border)' }}>
            {([['instancia', 'Pela instância'], ['manual', 'Colar link']] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setModo(k)}
                className="px-3 py-1.5 rounded-md text-[12px] font-medium"
                style={modo === k ? BTN_SOFT : { border: '1px solid transparent', color: 'var(--c-t-40)' }}
              >
                {label}
              </button>
            ))}
          </div>

          {modo === 'manual' ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <input className={INPUT} placeholder="Nome do grupo (opcional)" value={nomeManual} onChange={(e) => setNomeManual(e.target.value)} />
              <input className={INPUT} placeholder="https://chat.whatsapp.com/..." value={linkManual} onChange={(e) => setLinkManual(e.target.value)} />
              <button
                onClick={salvarManual}
                disabled={!linkManual.trim() || loading === 'salvar'}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-[12px] font-semibold shrink-0 disabled:opacity-40"
                style={{ background: 'var(--color-primary)', color: '#fff' }}
              >
                {loading === 'salvar' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Adicionar
              </button>
            </div>
          ) : instancias.length === 0 ? (
            <p className="text-[12px] text-txt-dim">Nenhuma instância cadastrada na Central WhatsApp para este expert.</p>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              <select value={instSel} onChange={(e) => setInstSel(e.target.value)} className={INPUT} style={{ background: 'var(--c-select-bg)' }}>
                <option value="">Selecione a instância (admin dos grupos)</option>
                {instancias.map((i) => (
                  <option key={i.id} value={i.instancia}>
                    {i.nome || i.instancia}{i.numero ? ` (${i.numero})` : ''}{i.status_conexao && i.status_conexao !== 'connected' ? ' — desconectada?' : ''}
                  </option>
                ))}
              </select>
              <button
                onClick={carregarGrupos}
                disabled={!instSel || loading === 'grupos'}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-[12px] font-semibold shrink-0 disabled:opacity-40"
                style={BTN_SOFT}
              >
                {loading === 'grupos' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                Buscar grupos
              </button>
            </div>
          )}

          {modo === 'instancia' && grupos.length > 0 && (
            <>
              <div className="max-h-72 overflow-y-auto space-y-1">
                {grupos.map((g) => {
                  const ja = jaNaRotacao.has(g.grupo_id);
                  return (
                    <label key={g.grupo_id} className="flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer text-[13px] text-txt" style={{ opacity: ja ? 0.4 : 1 }}>
                      <input
                        type="checkbox"
                        disabled={ja}
                        checked={selecionados.has(g.grupo_id)}
                        onChange={(e) => {
                          const s = new Set(selecionados);
                          if (e.target.checked) s.add(g.grupo_id); else s.delete(g.grupo_id);
                          setSelecionados(s);
                        }}
                      />
                      <span className="truncate">{g.grupo_nome || g.grupo_id}</span>
                      {ja && <span className="text-[11px] text-txt-dim shrink-0">já na rotação</span>}
                    </label>
                  );
                })}
              </div>
              <button
                onClick={salvarGrupos}
                disabled={selecionados.size === 0 || loading === 'salvar'}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold disabled:opacity-40"
                style={{ background: 'var(--color-primary)', color: '#fff' }}
              >
                {loading === 'salvar' && <Loader2 className="w-4 h-4 animate-spin" />}
                Adicionar {selecionados.size || ''} grupo{selecionados.size !== 1 ? 's' : ''}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Aba principal ───

export const RotatividadeTab: React.FC<{ showToast: ShowToast }> = ({ showToast }) => {
  const expertId = useAuthStore((s) => s.getActiveExpertId());
  const [rotacoes, setRotacoes] = useState<Rotacao[]>([]);
  const [instancias, setInstancias] = useState<Instancia[]>([]);
  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEditado, setSlugEditado] = useState(false);
  const [alerta, setAlerta] = useState('');
  const [criando, setCriando] = useState(false);

  const carregar = useCallback(async () => {
    if (!expertId) { setLoading(false); return; }
    const [rot, inst] = await Promise.all([
      supabase.from('rotacao_grupos').select('*, itens:rotacao_grupos_itens(*)').eq('expert_id', expertId).order('created_at', { ascending: false }),
      supabase.from('whatsapp_rotacao').select('id, nome, numero, instancia, token, status_conexao').eq('expert_id', expertId).order('nome'),
    ]);
    if (rot.error) showToast('error', 'Erro ao carregar rotações');
    setRotacoes((rot.data ?? []) as Rotacao[]);
    setInstancias((inst.data ?? []) as Instancia[]);
    setLoading(false);
  }, [expertId, showToast]);

  useEffect(() => { carregar(); }, [carregar]);

  const criar = async () => {
    if (!expertId) return;
    if (!/^[a-z0-9-]{3,60}$/.test(slug)) return showToast('error', 'Identificador do link: 3 a 60 letras minúsculas, números ou hífen');
    setCriando(true);
    const numero = alerta.replace(/\D/g, '');
    const { error } = await supabase.from('rotacao_grupos').insert({ expert_id: expertId, nome: nome.trim(), slug, alerta_numero: numero || null });
    setCriando(false);
    if (error) return showToast('error', error.code === '23505' ? 'Esse identificador de link já está em uso' : 'Erro ao criar rotação');
    showToast('success', 'Rotação criada');
    setNome(''); setSlug(''); setSlugEditado(false); setAlerta('');
    carregar();
  };

  if (!expertId) {
    return <p className="text-[13px] text-txt-dim py-10 text-center">Entre como um expert (impersonar) para configurar a rotatividade.</p>;
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-txt-dim animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Nova rotação */}
      <div className="rounded-2xl p-4 md:p-5 space-y-3" style={CARD}>
        <div className="flex items-center gap-2">
          <Shuffle className="w-4 h-4" style={{ color: 'var(--color-primary-light)' }} />
          <p className="text-[14px] font-semibold text-txt">Nova rotação</p>
        </div>
        <p className="text-[12px] text-txt-dim">Um link único que distribui os leads entre os grupos, um por vez, em ordem.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input
            className={INPUT}
            placeholder="Nome (ex: Lançamento Outubro)"
            value={nome}
            onChange={(e) => { setNome(e.target.value); if (!slugEditado) setSlug(gerarSlug(e.target.value)); }}
          />
          <input
            className={INPUT}
            placeholder="identificador-do-link"
            value={slug}
            onChange={(e) => { setSlugEditado(true); setSlug(gerarSlug(e.target.value)); }}
          />
          <input
            className={INPUT}
            type="text"
            inputMode="numeric"
            placeholder={`WhatsApp p/ alerta de ${LIMITE_ALERTA} (opcional)`}
            value={alerta}
            onChange={(e) => setAlerta(e.target.value)}
          />
        </div>
        {slug && <p className="text-[11px] text-txt-dim truncate">Link: {linkPublico(slug)}</p>}
        <button
          onClick={criar}
          disabled={!nome.trim() || !slug || criando}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold disabled:opacity-40"
          style={{ background: 'var(--color-primary)', color: '#fff' }}
        >
          {criando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Criar rotação
        </button>
      </div>

      {rotacoes.map((r) => (
        <RotacaoCard key={r.id} rotacao={r} instancias={instancias} expertId={expertId} showToast={showToast} onChange={carregar} />
      ))}
    </div>
  );
};
