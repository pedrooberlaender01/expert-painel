import React, { useState, useMemo, useCallback } from 'react';
import { Smartphone, Wifi, WifiOff, Plus } from 'lucide-react';
import { useWhatsappRotacao } from '../../hooks/useWhatsappRotacao';
import type { WhatsappRotacao } from '../../hooks/useWhatsappRotacao';
import { InstanciaCard } from '../numeros/InstanciaCard';
import { NovaInstanciaModal } from '../numeros/NovaInstanciaModal';
import { ConfirmDeleteNumeroModal } from '../numeros/ConfirmDeleteNumeroModal';
import { NumeroFormModal } from '../numeros/NumeroFormModal';

interface BotInstanciaTabProps {
  showToast: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const BotInstanciaTab: React.FC<BotInstanciaTabProps> = ({ showToast }) => {
  const {
    instanciasBot,
    loading,
    fetchData,
    toggleAtivo,
    editarNumero,
    excluirNumero,
    trocarOrdem,
    reconectar,
    criarInstancia,
  } = useWhatsappRotacao();

  const [novaModal, setNovaModal] = useState(false);
  const [editModal, setEditModal] = useState<{ open: boolean; numero: WhatsappRotacao | null }>({ open: false, numero: null });
  const [deleteModal, setDeleteModal] = useState<WhatsappRotacao | null>(null);

  const conectados = useMemo(() => instanciasBot.filter((n) => n.status_conexao === 'connected').length, [instanciasBot]);
  const desconectados = useMemo(() => instanciasBot.filter((n) => n.status_conexao === 'disconnected' || !n.status_conexao).length, [instanciasBot]);

  const handleToggleAtivo = useCallback(async (id: number, ativo: boolean) => {
    const erro = await toggleAtivo(id, ativo);
    if (erro) showToast('error', erro);
    else showToast('success', ativo ? 'Instância ativada!' : 'Instância desativada!');
  }, [toggleAtivo, showToast]);

  const handleCriarInstancia = useCallback(async (nome: string, numero: string) => {
    const result = await criarInstancia(nome, numero, 'bot');
    if (result.sucesso) {
      showToast('success', 'Instância bot criada! Aguardando pareamento...');
      fetchData(false);
    }
    return result;
  }, [criarInstancia, showToast, fetchData]);

  const handleSaveNumero = useCallback(async (data: { nome: string; numero: string; instancia: string; ordem: number }) => {
    if (editModal.numero) {
      const erro = await editarNumero(editModal.numero.id, data);
      if (erro) { showToast('error', erro); return; }
      showToast('success', 'Instância atualizada!');
    }
    setEditModal({ open: false, numero: null });
  }, [editModal.numero, editarNumero, showToast]);

  const handleDeleteNumero = useCallback(async () => {
    if (!deleteModal) return;
    const erro = await excluirNumero(deleteModal.id, deleteModal);
    if (erro) { showToast('error', erro); return; }
    showToast('success', 'Instância excluída!');
    setDeleteModal(null);
  }, [deleteModal, excluirNumero, showToast]);

  const handleReconectar = useCallback(async (id: number) => {
    const result = await reconectar(id);
    if (result.sucesso) {
      showToast('success', result.mensagem || 'Reconexão iniciada!');
    } else {
      showToast('error', result.mensagem || 'Erro ao reconectar');
    }
    return result;
  }, [reconectar, showToast]);

  const handleMoveUp = useCallback(async (numero: WhatsappRotacao) => {
    const idx = instanciasBot.findIndex((n) => n.id === numero.id);
    if (idx <= 0) return;
    const erro = await trocarOrdem(numero.id, instanciasBot[idx - 1].id);
    if (erro) showToast('error', erro);
  }, [instanciasBot, trocarOrdem, showToast]);

  const handleMoveDown = useCallback(async (numero: WhatsappRotacao) => {
    const idx = instanciasBot.findIndex((n) => n.id === numero.id);
    if (idx < 0 || idx >= instanciasBot.length - 1) return;
    const erro = await trocarOrdem(numero.id, instanciasBot[idx + 1].id);
    if (erro) showToast('error', erro);
  }, [instanciasBot, trocarOrdem, showToast]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-white/[0.03] border border-white/[0.04] rounded-2xl p-4 h-[56px] animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white/[0.03] border border-white/[0.04] rounded-2xl p-5 h-[200px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Status summary */}
      <div
        className="flex items-center gap-5 flex-wrap px-5 py-3"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-primary-bg)' }}>
            <Wifi className="w-4 h-4" style={{ color: 'var(--color-primary-light)' }} />
          </div>
          <p className="text-[14px] font-semibold">
            <span style={{ color: 'var(--color-primary-light)' }}>{conectados}</span>
            <span className="text-[12px] ml-1" style={{ color: 'rgba(255,255,255,0.4)' }}>conectado{conectados !== 1 ? 's' : ''}</span>
          </p>
        </div>
        <div className="w-px h-6" style={{ background: 'rgba(255,255,255,0.04)' }} />
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(248,113,113,0.12)' }}>
            <WifiOff className="w-4 h-4" style={{ color: '#f87171' }} />
          </div>
          <p className="text-[14px] font-semibold">
            <span style={{ color: '#f87171' }}>{desconectados}</span>
            <span className="text-[12px] ml-1" style={{ color: 'rgba(255,255,255,0.4)' }}>desconectado{desconectados !== 1 ? 's' : ''}</span>
          </p>
        </div>
        <div className="w-px h-6" style={{ background: 'rgba(255,255,255,0.04)' }} />
        <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
          <span className="font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>{instanciasBot.length}</span> instância{instanciasBot.length !== 1 ? 's' : ''} no total
        </p>
      </div>

      <p className="text-[13px] max-w-[800px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
        Instâncias dedicadas aos bots de engajamento. Cada bot precisa de um número WhatsApp conectado para enviar e receber mensagens nos grupos.
      </p>

      {/* Lista de instâncias */}
      {instanciasBot.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {instanciasBot.map((numero, idx) => (
            <InstanciaCard
              key={numero.id}
              numero={numero}
              isFirst={idx === 0}
              isLast={idx === instanciasBot.length - 1}
              onToggleAtivo={handleToggleAtivo}
              onEdit={(n) => setEditModal({ open: true, numero: n })}
              onDelete={(n) => setDeleteModal(n)}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              onReconectar={handleReconectar}
            />
          ))}
        </div>
      ) : (
        /* Estado vazio */
        <div
          className="flex flex-col items-center justify-center py-16 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'rgba(var(--color-primary-rgb),0.08)', border: '1px solid rgba(var(--color-primary-rgb),0.15)' }}
          >
            <Smartphone className="w-6 h-6" style={{ color: 'var(--color-primary-light)' }} />
          </div>
          <p className="text-[14px] font-semibold text-white/60 mb-1">Nenhuma instância bot conectada</p>
          <p className="text-[12px] text-white/30 mb-5">Crie uma instância para conectar um número WhatsApp aos bots</p>
          <button
            onClick={() => setNovaModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold rounded-xl transition-all"
            style={{ background: 'var(--color-primary)', color: '#fff', boxShadow: '0 2px 12px rgba(var(--color-primary-rgb),0.2)' }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(var(--color-primary-rgb),0.3)' }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(var(--color-primary-rgb),0.2)' }}
          >
            <Plus className="w-4 h-4" />
            Nova Instância Bot
          </button>
        </div>
      )}

      {/* Botão de adicionar (quando já tem instâncias) */}
      {instanciasBot.length > 0 && (
        <button
          onClick={() => setNovaModal(true)}
          className="w-full flex items-center justify-center gap-2 py-5 text-[14px] font-medium transition-all duration-300"
          style={{ border: '2px dashed rgba(var(--color-primary-rgb),0.2)', borderRadius: '14px', color: 'rgba(var(--color-primary-rgb),0.6)', background: 'transparent' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(var(--color-primary-rgb),0.4)'; e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.04)'; e.currentTarget.style.color = 'var(--color-primary-light)' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(var(--color-primary-rgb),0.2)'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(var(--color-primary-rgb),0.6)' }}
        >
          <Plus className="w-4 h-4" />
          Nova Instância Bot
        </button>
      )}

      {/* Modais */}
      {novaModal && (
        <NovaInstanciaModal
          onCriarInstancia={handleCriarInstancia}
          onClose={() => setNovaModal(false)}
        />
      )}
      {editModal.open && editModal.numero && (
        <NumeroFormModal
          numero={editModal.numero}
          proximaOrdem={editModal.numero.ordem}
          onSave={handleSaveNumero}
          onClose={() => setEditModal({ open: false, numero: null })}
        />
      )}
      {deleteModal && (
        <ConfirmDeleteNumeroModal
          nome={deleteModal.nome}
          onConfirm={handleDeleteNumero}
          onClose={() => setDeleteModal(null)}
        />
      )}
    </div>
  );
};
