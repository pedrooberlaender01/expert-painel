import React, { useState, useEffect } from 'react';
import {
  Brain,
  Flame,
  TrendingUp,
  MessageCircle,
  Shield,
  VolumeX,
  User,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  Check,
  BookOpen,
} from 'lucide-react';
import { useBotConhecimento } from '../../hooks/useBotConhecimento';
import type { CategoriaConhecimento, BotConhecimento } from '../../hooks/useBotConhecimento';

// ─── Categorias config ───

const CATEGORIAS: Array<{
  key: CategoriaConhecimento;
  label: string;
  icon: React.FC<{ className?: string }>;
  placeholder: string;
}> = [
  { key: 'comportamento', label: 'Comportamento', icon: Brain, placeholder: 'Ex: Sempre concorda com o expert, nunca questiona resultados' },
  { key: 'frases_hype', label: 'Hype', icon: Flame, placeholder: 'Ex: kkkk mais um green, essa roleta tá pagando demais' },
  { key: 'frases_social_proof', label: 'Social Proof', icon: TrendingUp, placeholder: 'Ex: entrei semana passada e já recuperei o investimento' },
  { key: 'frases_engajamento', label: 'Engajamento', icon: MessageCircle, placeholder: 'Ex: alguém vai na live hoje? qual horário?' },
  { key: 'frases_defesa', label: 'Defesa', icon: Shield, placeholder: 'Ex: eu duvidava também mas depois que vi os resultados mudei de ideia' },
  { key: 'frases_silencio', label: 'Silêncio', icon: VolumeX, placeholder: 'Ex: tá quieto aqui, cadê o pessoal? alguém jogando?' },
  { key: 'contexto_expert', label: 'Contexto Expert', icon: User, placeholder: 'Ex: O expert faz lives diárias às 21h, foco em roleta europeia' },
];

const inputClass = "w-full bg-glass-2 border border-glass text-txt rounded-lg py-2.5 px-3.5 text-[13px] placeholder-txt-dim focus:outline-none focus:border-[rgba(var(--color-primary-rgb),0.3)] focus:shadow-[0_0_0_3px_rgba(var(--color-primary-rgb),0.08)] transition-all resize-none";

// ─── Card de item ───

interface ItemCardProps {
  item: BotConhecimento;
  onEdit: (id: number, content: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

const ItemCard: React.FC<ItemCardProps> = ({ item, onEdit, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(item.content);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    if (!editText.trim()) return;
    setSaving(true);
    try {
      await onEdit(item.id, editText.trim());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(item.id);
    } finally {
      setDeleting(false);
    }
  };

  if (editing) {
    return (
      <div
        className="rounded-xl p-3"
        style={{ background: 'var(--c-glass)', border: '1px solid rgba(var(--color-primary-rgb),0.15)' }}
      >
        <textarea
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          className={inputClass}
          rows={3}
          autoFocus
        />
        <div className="flex items-center justify-end gap-2 mt-2">
          <button
            onClick={() => { setEditing(false); setEditText(item.content); }}
            className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium rounded-lg transition-colors text-txt-dim hover:text-txt-muted hover:bg-glass"
          >
            <X className="w-3 h-3" /> Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !editText.trim()}
            className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all disabled:opacity-40"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Salvar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group rounded-xl p-3 transition-all duration-150"
      style={{ background: 'var(--c-glass)', border: '1px solid var(--c-border)' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--c-border)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--c-border)' }}
    >
      <div className="flex items-start gap-2">
        <p
          className={`flex-1 text-[13px] text-txt-secondary leading-relaxed cursor-pointer ${!expanded ? 'line-clamp-2' : ''}`}
          onClick={() => setExpanded(!expanded)}
        >
          {item.content}
        </p>
        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => { setEditing(true); setEditText(item.content); }}
            className="p-1.5 rounded-lg text-txt-dim hover:text-txt-muted hover:bg-glass transition-colors"
            title="Editar"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1.5 rounded-lg text-red-400/40 hover:text-red-400 hover:bg-red-400/[0.04] transition-colors disabled:opacity-40"
            title="Excluir"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── ConhecimentoTab (principal) ───

interface ConhecimentoTabProps {
  showToast: (type: 'success' | 'error', message: string) => void;
}

export const ConhecimentoTab: React.FC<ConhecimentoTabProps> = ({ showToast }) => {
  const {
    items,
    contadores,
    loading,
    loadingContadores,
    contarPorCategoria,
    listarPorCategoria,
    adicionar,
    editar,
    deletar,
  } = useBotConhecimento();

  const [categoria, setCategoria] = useState<CategoriaConhecimento>('comportamento');
  const [showAdd, setShowAdd] = useState(false);
  const [addText, setAddText] = useState('');
  const [addSaving, setAddSaving] = useState(false);

  const catConfig = CATEGORIAS.find((c) => c.key === categoria)!;

  // Carregar contadores ao montar
  useEffect(() => {
    contarPorCategoria();
  }, [contarPorCategoria]);

  // Carregar items ao trocar categoria
  useEffect(() => {
    listarPorCategoria(categoria);
    setShowAdd(false);
    setAddText('');
  }, [categoria, listarPorCategoria]);

  const handleAdd = async () => {
    if (!addText.trim()) return;
    setAddSaving(true);
    try {
      await adicionar(addText.trim(), categoria);
      setAddText('');
      setShowAdd(false);
      showToast('success', 'Conhecimento adicionado');
    } catch {
      showToast('error', 'Erro ao adicionar');
    } finally {
      setAddSaving(false);
    }
  };

  const handleEdit = async (id: number, content: string) => {
    try {
      await editar(id, content);
      showToast('success', 'Conhecimento atualizado');
    } catch {
      showToast('error', 'Erro ao atualizar');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deletar(id, categoria);
      showToast('success', 'Conhecimento removido');
    } catch {
      showToast('error', 'Erro ao remover');
    }
  };

  return (
    <>
      {/* Pills de categorias */}
      <div className="overflow-x-auto -mx-1 px-1 pb-1">
        <div
          className="inline-flex gap-1 p-[3px] rounded-xl w-fit"
          style={{ background: 'var(--c-glass)', border: '1px solid var(--c-border)' }}
        >
          {CATEGORIAS.map((cat) => {
            const Icon = cat.icon;
            const count = contadores[cat.key] || 0;
            const active = categoria === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setCategoria(cat.key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 whitespace-nowrap"
                style={active
                  ? { background: 'rgba(var(--color-primary-rgb),0.1)', border: '1px solid rgba(var(--color-primary-rgb),0.2)', color: 'var(--color-primary-light)' }
                  : { background: 'transparent', border: '1px solid transparent', color: 'var(--c-t-40)' }
                }
                onMouseEnter={(e) => { if (!active) { e.currentTarget.style.color = 'rgb(var(--c-fg-rgb) / 0.6)'; e.currentTarget.style.background = 'var(--c-glass)' } }}
                onMouseLeave={(e) => { if (!active) { e.currentTarget.style.color = 'rgb(var(--c-fg-rgb) / 0.4)'; e.currentTarget.style.background = 'transparent' } }}
              >
                <Icon className="w-3 h-3" />
                {cat.label}
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={active
                    ? { background: 'rgba(var(--color-primary-rgb),0.15)', color: 'var(--color-primary-light)' }
                    : { background: 'var(--c-glass)', color: 'var(--c-t-30)' }
                  }
                >
                  {loadingContadores ? '·' : count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Header com botão adicionar */}
      <div className="flex items-center justify-between mt-3 mb-3">
        <p className="text-[12px] text-txt-dim">
          {catConfig.label} — {loading ? '...' : `${items.length} exemplo${items.length !== 1 ? 's' : ''}`}
        </p>
        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all"
            style={{ background: 'rgba(var(--color-primary-rgb),0.1)', border: '1px solid rgba(var(--color-primary-rgb),0.2)', color: 'var(--color-primary-light)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.2)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.1)' }}
          >
            <Plus className="w-3 h-3" /> Adicionar
          </button>
        )}
      </div>

      {/* Textarea adicionar (inline no topo) */}
      {showAdd && (
        <div
          className="rounded-xl p-3 mb-3"
          style={{ background: 'var(--c-glass)', border: '1px solid rgba(var(--color-primary-rgb),0.15)' }}
        >
          <textarea
            value={addText}
            onChange={(e) => setAddText(e.target.value)}
            placeholder={catConfig.placeholder}
            className={inputClass}
            rows={3}
            autoFocus
          />
          <div className="flex items-center justify-end gap-2 mt-2">
            <button
              onClick={() => { setShowAdd(false); setAddText(''); }}
              className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium rounded-lg transition-colors text-txt-dim hover:text-txt-muted hover:bg-glass"
            >
              <X className="w-3 h-3" /> Cancelar
            </button>
            <button
              onClick={handleAdd}
              disabled={addSaving || !addText.trim()}
              className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all disabled:opacity-40"
              style={{ background: 'var(--color-primary)', color: '#fff' }}
            >
              {addSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Salvar
            </button>
          </div>
        </div>
      )}

      {/* Conteúdo */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 text-txt-dim animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 rounded-2xl"
          style={{ background: 'var(--c-glass-2)', border: '1px solid var(--c-border)' }}
        >
          <BookOpen className="w-8 h-8 mb-3" style={{ color: 'var(--c-t-10)' }} />
          <p className="text-[13px] font-medium mb-1" style={{ color: 'var(--c-t-25)' }}>Nenhum exemplo cadastrado nesta categoria</p>
          <p className="text-[11px] mb-4" style={{ color: 'var(--c-t-12)' }}>Adicione frases e comportamentos para os bots usarem</p>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 text-[12px] font-semibold rounded-xl transition-all"
            style={{ background: 'rgba(var(--color-primary-rgb),0.15)', border: '1px solid rgba(var(--color-primary-rgb),0.25)', color: 'var(--color-primary-light)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.25)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.15)' }}
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </>
  );
};
