import React, { useState } from 'react';
import { Phone, MessageCircle, Plus } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Toast } from '../components/Toast';
import { NumeroCard } from '../components/numeros/NumeroCard';
import { NumeroFormModal } from '../components/numeros/NumeroFormModal';
import { ConfirmDeleteNumeroModal } from '../components/numeros/ConfirmDeleteNumeroModal';
import { MensagemAberturaCard } from '../components/numeros/MensagemAberturaCard';
import { MensagemAberturaFormModal } from '../components/numeros/MensagemAberturaFormModal';
import { useWhatsappRotacao } from '../hooks/useWhatsappRotacao';
import type { WhatsappRotacao, WhatsappRotacaoMensagem } from '../hooks/useWhatsappRotacao';
import { useToast } from '../hooks/useToast';
import { cn } from '../utils/cn';

type TabKey = 'numeros' | 'mensagens';

const TABS: { key: TabKey; label: string; icon: typeof Phone }[] = [
  { key: 'numeros', label: 'Números WhatsApp', icon: Phone },
  { key: 'mensagens', label: 'Mensagens de Abertura', icon: MessageCircle },
];

const SkeletonCard: React.FC = () => (
  <div className="card-dark p-5 animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-surface-200/50 rounded-lg" />
        <div className="h-4 w-32 bg-surface-200/50 rounded" />
      </div>
      <div className="w-11 h-6 bg-surface-200/30 rounded-full" />
    </div>
    <div className="h-3 w-48 bg-surface-200/30 rounded mb-2" />
    <div className="h-3 w-36 bg-surface-200/20 rounded" />
  </div>
);

export const Numeros: React.FC = () => {
  const {
    numeros,
    mensagens,
    loading,
    fetchData,
    toggleAtivo,
    adicionarNumero,
    editarNumero,
    excluirNumero,
    trocarOrdem,
    toggleAtivoMensagem,
    adicionarMensagem,
    editarMensagem,
    excluirMensagem,
    trocarOrdemMensagem,
  } = useWhatsappRotacao();
  const { toast, showToast, hideToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>('numeros');

  // Números modal state
  const [numFormModal, setNumFormModal] = useState<{ open: boolean; numero: WhatsappRotacao | null }>({ open: false, numero: null });
  const [numDeleteModal, setNumDeleteModal] = useState<WhatsappRotacao | null>(null);

  // Mensagens modal state
  const [msgFormModal, setMsgFormModal] = useState<{ open: boolean; mensagem: WhatsappRotacaoMensagem | null }>({ open: false, mensagem: null });
  const [msgDeleteModal, setMsgDeleteModal] = useState<WhatsappRotacaoMensagem | null>(null);

  // ── Números handlers ──

  const numerosAtivos = numeros.filter((n) => n.ativo).length;

  const handleToggleAtivo = async (id: number, ativo: boolean) => {
    const erro = await toggleAtivo(id, ativo);
    if (erro) {
      showToast('error', erro);
    } else {
      showToast('success', ativo ? 'Número ativado!' : 'Número desativado!');
    }
  };

  const handleSaveNumero = async (data: { nome: string; numero: string; instancia: string; ordem: number }) => {
    if (numFormModal.numero) {
      const erro = await editarNumero(numFormModal.numero.id, data);
      if (erro) { showToast('error', erro); return; }
      showToast('success', 'Número atualizado!');
    } else {
      const erro = await adicionarNumero({ ...data, ativo: true });
      if (erro) { showToast('error', erro); return; }
      showToast('success', 'Número adicionado!');
    }
    setNumFormModal({ open: false, numero: null });
  };

  const handleDeleteNumero = async () => {
    if (!numDeleteModal) return;
    const erro = await excluirNumero(numDeleteModal.id);
    if (erro) { showToast('error', erro); return; }
    showToast('success', 'Número excluído!');
    setNumDeleteModal(null);
  };

  const handleMoveUpNumero = async (numero: WhatsappRotacao) => {
    const idx = numeros.findIndex((n) => n.id === numero.id);
    if (idx <= 0) return;
    const erro = await trocarOrdem(numero.id, numeros[idx - 1].id);
    if (erro) showToast('error', erro);
  };

  const handleMoveDownNumero = async (numero: WhatsappRotacao) => {
    const idx = numeros.findIndex((n) => n.id === numero.id);
    if (idx < 0 || idx >= numeros.length - 1) return;
    const erro = await trocarOrdem(numero.id, numeros[idx + 1].id);
    if (erro) showToast('error', erro);
  };

  const proximaOrdemNumero = numeros.length > 0 ? Math.max(...numeros.map((n) => n.ordem)) + 1 : 1;

  // ── Mensagens handlers ──

  const mensagensAtivas = mensagens.filter((m) => m.ativo).length;

  const handleToggleAtivoMsg = async (id: number, ativo: boolean) => {
    const erro = await toggleAtivoMensagem(id, ativo);
    if (erro) {
      showToast('error', erro);
    } else {
      showToast('success', ativo ? 'Mensagem ativada!' : 'Mensagem desativada!');
    }
  };

  const handleSaveMensagem = async (data: { mensagem: string; ordem: number }) => {
    if (msgFormModal.mensagem) {
      const erro = await editarMensagem(msgFormModal.mensagem.id, data);
      if (erro) { showToast('error', erro); return; }
      showToast('success', 'Mensagem atualizada!');
    } else {
      const erro = await adicionarMensagem({ ...data, ativo: true });
      if (erro) { showToast('error', erro); return; }
      showToast('success', 'Mensagem adicionada!');
    }
    setMsgFormModal({ open: false, mensagem: null });
  };

  const handleDeleteMensagem = async () => {
    if (!msgDeleteModal) return;
    const erro = await excluirMensagem(msgDeleteModal.id);
    if (erro) { showToast('error', erro); return; }
    showToast('success', 'Mensagem excluída!');
    setMsgDeleteModal(null);
  };

  const handleMoveUpMsg = async (msg: WhatsappRotacaoMensagem) => {
    const idx = mensagens.findIndex((m) => m.id === msg.id);
    if (idx <= 0) return;
    const erro = await trocarOrdemMensagem(msg.id, mensagens[idx - 1].id);
    if (erro) showToast('error', erro);
  };

  const handleMoveDownMsg = async (msg: WhatsappRotacaoMensagem) => {
    const idx = mensagens.findIndex((m) => m.id === msg.id);
    if (idx < 0 || idx >= mensagens.length - 1) return;
    const erro = await trocarOrdemMensagem(msg.id, mensagens[idx + 1].id);
    if (erro) showToast('error', erro);
  };

  const proximaOrdemMsg = mensagens.length > 0 ? Math.max(...mensagens.map((m) => m.ordem)) + 1 : 1;

  return (
    <div>
      <PageHeader
        title="Gerenciamento de Números"
        subtitle="Configure o rodízio de números e mensagens de abertura"
        onRefresh={fetchData}
        isRefreshing={loading}
      />

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-surface-50 border border-surface-300/20 mb-8">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200',
              activeTab === tab.key
                ? 'bg-primary/10 text-primary border-glow shadow-sm'
                : 'text-txt-muted hover:text-txt hover:bg-surface-200/30'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading skeleton (both tabs) */}
      {loading && (
        <div className="space-y-4">
          <div className="card-dark p-4 animate-pulse">
            <div className="h-4 w-48 bg-surface-200/40 rounded" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      )}

      {/* Tab: Números WhatsApp */}
      {activeTab === 'numeros' && !loading && (
        <>
          {/* Resumo */}
          <div className="card-dark p-4 mb-6 flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary-bg">
              <Phone className="w-4 h-4 text-primary-light" />
            </div>
            <p className="text-[14px] font-semibold text-txt">
              <span className="text-primary-light">{numerosAtivos}</span>
              {' '}número{numerosAtivos !== 1 ? 's' : ''} ativo{numerosAtivos !== 1 ? 's' : ''} de{' '}
              <span className="text-txt-secondary">{numeros.length}</span> total
            </p>
          </div>

          {/* Lista */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {numeros.map((numero, idx) => (
              <NumeroCard
                key={numero.id}
                numero={numero}
                isFirst={idx === 0}
                isLast={idx === numeros.length - 1}
                onToggleAtivo={handleToggleAtivo}
                onEdit={(n) => setNumFormModal({ open: true, numero: n })}
                onDelete={(n) => setNumDeleteModal(n)}
                onMoveUp={handleMoveUpNumero}
                onMoveDown={handleMoveDownNumero}
              />
            ))}
          </div>

          <button
            onClick={() => setNumFormModal({ open: true, numero: null })}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed border-primary/30 text-primary/70 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 text-[13px] font-medium"
          >
            <Plus className="w-4 h-4" />
            Adicionar Número
          </button>
        </>
      )}

      {/* Tab: Mensagens de Abertura */}
      {activeTab === 'mensagens' && !loading && (
        <>
          {/* Resumo */}
          <div className="card-dark p-4 mb-6 flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary-bg">
              <MessageCircle className="w-4 h-4 text-primary-light" />
            </div>
            <p className="text-[14px] font-semibold text-txt">
              <span className="text-primary-light">{mensagensAtivas}</span>
              {' '}mensagen{mensagensAtivas !== 1 ? 's' : ''} ativa{mensagensAtivas !== 1 ? 's' : ''} de{' '}
              <span className="text-txt-secondary">{mensagens.length}</span> total
            </p>
          </div>

          {/* Lista */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {mensagens.map((msg, idx) => (
              <MensagemAberturaCard
                key={msg.id}
                mensagem={msg}
                isFirst={idx === 0}
                isLast={idx === mensagens.length - 1}
                onToggleAtivo={handleToggleAtivoMsg}
                onEdit={(m) => setMsgFormModal({ open: true, mensagem: m })}
                onDelete={(m) => setMsgDeleteModal(m)}
                onMoveUp={handleMoveUpMsg}
                onMoveDown={handleMoveDownMsg}
              />
            ))}
          </div>

          <button
            onClick={() => setMsgFormModal({ open: true, mensagem: null })}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed border-primary/30 text-primary/70 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 text-[13px] font-medium"
          >
            <Plus className="w-4 h-4" />
            Adicionar Mensagem
          </button>
        </>
      )}

      {/* Modals: Números */}
      {numFormModal.open && (
        <NumeroFormModal
          numero={numFormModal.numero}
          proximaOrdem={proximaOrdemNumero}
          onSave={handleSaveNumero}
          onClose={() => setNumFormModal({ open: false, numero: null })}
        />
      )}
      {numDeleteModal && (
        <ConfirmDeleteNumeroModal
          nome={numDeleteModal.nome}
          onConfirm={handleDeleteNumero}
          onClose={() => setNumDeleteModal(null)}
        />
      )}

      {/* Modals: Mensagens */}
      {msgFormModal.open && (
        <MensagemAberturaFormModal
          mensagem={msgFormModal.mensagem}
          proximaOrdem={proximaOrdemMsg}
          onSave={handleSaveMensagem}
          onClose={() => setMsgFormModal({ open: false, mensagem: null })}
        />
      )}
      {msgDeleteModal && (
        <ConfirmDeleteNumeroModal
          nome={`Mensagem #${msgDeleteModal.ordem}`}
          onConfirm={handleDeleteMensagem}
          onClose={() => setMsgDeleteModal(null)}
        />
      )}

      {toast && <Toast toast={toast} onClose={hideToast} />}
    </div>
  );
};
