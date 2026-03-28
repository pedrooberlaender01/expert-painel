import React, { useState } from 'react';
import { Smartphone, MessageCircle, Plus, Wifi, WifiOff, Radio } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Toast } from '../components/Toast';
import { InstanciaCard } from '../components/numeros/InstanciaCard';
import { ColetaInstanciaCard } from '../components/numeros/ColetaInstanciaCard';
import { NumeroFormModal } from '../components/numeros/NumeroFormModal';
import { NovaInstanciaModal } from '../components/numeros/NovaInstanciaModal';
import { ConfirmDeleteNumeroModal } from '../components/numeros/ConfirmDeleteNumeroModal';
import { MensagemAberturaCard } from '../components/numeros/MensagemAberturaCard';
import { MensagemAberturaFormModal } from '../components/numeros/MensagemAberturaFormModal';
import { useWhatsappRotacao } from '../hooks/useWhatsappRotacao';
import type { WhatsappRotacao, WhatsappRotacaoMensagem } from '../hooks/useWhatsappRotacao';
import { useToast } from '../hooks/useToast';
import { cn } from '../utils/cn';

type TabKey = 'disparadoras' | 'coleta' | 'mensagens';

const TABS: { key: TabKey; label: string; icon: typeof Smartphone }[] = [
  { key: 'disparadoras', label: 'Instâncias Disparadoras', icon: Smartphone },
  { key: 'coleta', label: 'Instâncias Coleta Eventos', icon: Radio },
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

export const CentralWhatsapp: React.FC = () => {
  const {
    instanciasDisparadoras,
    instanciasColeta,
    mensagens,
    loading,
    fetchData,
    toggleAtivo,
    editarNumero,
    excluirNumero,
    trocarOrdem,
    reconectar,
    criarInstancia,
    toggleAtivoMensagem,
    adicionarMensagem,
    editarMensagem,
    excluirMensagem,
    trocarOrdemMensagem,
  } = useWhatsappRotacao();
  const { toast, showToast, hideToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>('disparadoras');

  // Instâncias disparadoras modal state
  const [editFormModal, setEditFormModal] = useState<{ open: boolean; numero: WhatsappRotacao | null }>({ open: false, numero: null });
  const [novaInstanciaModal, setNovaInstanciaModal] = useState(false);
  const [numDeleteModal, setNumDeleteModal] = useState<WhatsappRotacao | null>(null);

  // Instâncias coleta modal state
  const [novaColetaModal, setNovaColetaModal] = useState(false);
  const [editColetaModal, setEditColetaModal] = useState<{ open: boolean; numero: WhatsappRotacao | null }>({ open: false, numero: null });
  const [coletaDeleteModal, setColetaDeleteModal] = useState<WhatsappRotacao | null>(null);

  // Mensagens modal state
  const [msgFormModal, setMsgFormModal] = useState<{ open: boolean; mensagem: WhatsappRotacaoMensagem | null }>({ open: false, mensagem: null });
  const [msgDeleteModal, setMsgDeleteModal] = useState<WhatsappRotacaoMensagem | null>(null);

  // ── Instâncias handlers ──

  // Disparadoras stats
  const conectadosDisp = instanciasDisparadoras.filter((n) => n.status_conexao === 'connected').length;
  const desconectadosDisp = instanciasDisparadoras.filter((n) => n.status_conexao === 'disconnected' || !n.status_conexao).length;

  // Coleta stats
  const conectadosColeta = instanciasColeta.filter((n) => n.status_conexao === 'connected').length;
  const desconectadosColeta = instanciasColeta.filter((n) => n.status_conexao === 'disconnected' || !n.status_conexao).length;

  const handleToggleAtivo = async (id: number, ativo: boolean) => {
    const erro = await toggleAtivo(id, ativo);
    if (erro) {
      showToast('error', erro);
    } else {
      showToast('success', ativo ? 'Instância ativada!' : 'Instância desativada!');
    }
  };

  const handleSaveNumero = async (data: { nome: string; numero: string; instancia: string; ordem: number }) => {
    if (editFormModal.numero) {
      const erro = await editarNumero(editFormModal.numero.id, data);
      if (erro) { showToast('error', erro); return; }
      showToast('success', 'Instância atualizada!');
    }
    setEditFormModal({ open: false, numero: null });
  };

  const handleCriarInstancia = async (nome: string, numero: string) => {
    const result = await criarInstancia(nome, numero, 'disparadora');
    if (result.sucesso) {
      showToast('success', 'Instância criada! Aguardando pareamento...');
      fetchData(false);
    }
    return result;
  };

  const handleCriarColetaInstancia = async (nome: string, numero: string) => {
    const result = await criarInstancia(nome, numero, 'coleta_eventos');
    if (result.sucesso) {
      showToast('success', 'Instância de coleta criada! Aguardando pareamento...');
      fetchData(false);
    }
    return result;
  };

  const handleSaveColetaNumero = async (data: { nome: string; numero: string; instancia: string; ordem: number }) => {
    if (editColetaModal.numero) {
      const erro = await editarNumero(editColetaModal.numero.id, data);
      if (erro) { showToast('error', erro); return; }
      showToast('success', 'Instância de coleta atualizada!');
    }
    setEditColetaModal({ open: false, numero: null });
  };

  const handleDeleteColeta = async () => {
    if (!coletaDeleteModal) return;
    const erro = await excluirNumero(coletaDeleteModal.id, coletaDeleteModal);
    if (erro) { showToast('error', erro); return; }
    showToast('success', 'Instância de coleta excluída!');
    setColetaDeleteModal(null);
  };

  const handleDeleteNumero = async () => {
    if (!numDeleteModal) return;
    const erro = await excluirNumero(numDeleteModal.id, numDeleteModal);
    if (erro) { showToast('error', erro); return; }
    showToast('success', 'Instância excluída!');
    setNumDeleteModal(null);
  };

  const handleReconectar = async (id: number) => {
    const result = await reconectar(id);
    if (result.sucesso) {
      showToast('success', result.mensagem || 'Reconexão iniciada!');
    } else {
      showToast('error', result.mensagem || 'Erro ao reconectar');
    }
    return result;
  };

  const handleMoveUpNumero = async (numero: WhatsappRotacao) => {
    const idx = instanciasDisparadoras.findIndex((n) => n.id === numero.id);
    if (idx <= 0) return;
    const erro = await trocarOrdem(numero.id, instanciasDisparadoras[idx - 1].id);
    if (erro) showToast('error', erro);
  };

  const handleMoveDownNumero = async (numero: WhatsappRotacao) => {
    const idx = instanciasDisparadoras.findIndex((n) => n.id === numero.id);
    if (idx < 0 || idx >= instanciasDisparadoras.length - 1) return;
    const erro = await trocarOrdem(numero.id, instanciasDisparadoras[idx + 1].id);
    if (erro) showToast('error', erro);
  };

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
    <div className="overflow-x-hidden">
      <PageHeader
        title="Central WhatsApp"
        subtitle="Gerencie instâncias, conexões e mensagens de abertura"
        onRefresh={fetchData}
        isRefreshing={loading}
      />

      {/* Tabs */}
      <div
        className="grid grid-cols-2 md:flex md:w-fit gap-1 p-1 rounded-[14px] w-full mb-8"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center justify-center gap-2 px-3 md:px-5 py-2.5 rounded-[10px] text-[12px] md:text-[13px] font-medium transition-all duration-200"
              style={isActive
                ? { background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa' }
                : { background: 'transparent', border: '1px solid transparent', color: 'rgba(255,255,255,0.45)' }
              }
            >
              <tab.icon className="w-3.5 h-3.5 shrink-0" style={{ opacity: isActive ? 1 : 0.5 }} />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
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

      {/* Tab: Instâncias Disparadoras */}
      {activeTab === 'disparadoras' && !loading && (
        <>
          {/* Status summary */}
          <div className="card-dark p-4 mb-6 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary-bg">
                <Wifi className="w-4 h-4 text-primary-light" />
              </div>
              <p className="text-[14px] font-semibold text-txt">
                <span className="text-primary-light">{conectadosDisp}</span>
                <span className="text-txt-muted text-[12px] ml-1">conectado{conectadosDisp !== 1 ? 's' : ''}</span>
              </p>
            </div>
            <div className="w-px h-6 bg-surface-300/20" />
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-red-500/10">
                <WifiOff className="w-4 h-4 text-red-400" />
              </div>
              <p className="text-[14px] font-semibold text-txt">
                <span className="text-red-400">{desconectadosDisp}</span>
                <span className="text-txt-muted text-[12px] ml-1">desconectado{desconectadosDisp !== 1 ? 's' : ''}</span>
              </p>
            </div>
            <div className="w-px h-6 bg-surface-300/20" />
            <p className="text-[13px] text-txt-muted">
              <span className="text-txt-secondary font-semibold">{instanciasDisparadoras.length}</span> instância{instanciasDisparadoras.length !== 1 ? 's' : ''} no total
            </p>
          </div>

          <p className="text-sm text-white mb-5">
            Números que fazem parte da automação do funil. São as instâncias que disparam e captam as mensagens dos leads automaticamente.
          </p>

          {/* Lista */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {instanciasDisparadoras.map((numero, idx) => (
              <InstanciaCard
                key={numero.id}
                numero={numero}
                isFirst={idx === 0}
                isLast={idx === instanciasDisparadoras.length - 1}
                onToggleAtivo={handleToggleAtivo}
                onEdit={(n) => setEditFormModal({ open: true, numero: n })}
                onDelete={(n) => setNumDeleteModal(n)}
                onMoveUp={handleMoveUpNumero}
                onMoveDown={handleMoveDownNumero}
                onReconectar={handleReconectar}
              />
            ))}
          </div>

          <button
            onClick={() => setNovaInstanciaModal(true)}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed border-[#004AFF]/30 text-[#004AFF]/70 hover:text-[#004AFF] hover:border-[#004AFF]/50 hover:bg-[#004AFF]/5 transition-all duration-200 text-[13px] font-medium"
          >
            <Plus className="w-4 h-4" />
            Nova Instância Disparadora
          </button>
        </>
      )}

      {/* Tab: Instâncias Coleta Eventos */}
      {activeTab === 'coleta' && !loading && (
        <>
          {/* Status summary */}
          <div className="card-dark p-4 mb-6 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary-bg">
                <Wifi className="w-4 h-4 text-primary-light" />
              </div>
              <p className="text-[14px] font-semibold text-txt">
                <span className="text-primary-light">{conectadosColeta}</span>
                <span className="text-txt-muted text-[12px] ml-1">conectado{conectadosColeta !== 1 ? 's' : ''}</span>
              </p>
            </div>
            <div className="w-px h-6 bg-surface-300/20" />
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-red-500/10">
                <WifiOff className="w-4 h-4 text-red-400" />
              </div>
              <p className="text-[14px] font-semibold text-txt">
                <span className="text-red-400">{desconectadosColeta}</span>
                <span className="text-txt-muted text-[12px] ml-1">desconectado{desconectadosColeta !== 1 ? 's' : ''}</span>
              </p>
            </div>
            <div className="w-px h-6 bg-surface-300/20" />
            <p className="text-[13px] text-txt-muted">
              <span className="text-txt-secondary font-semibold">{instanciasColeta.length}</span> instância{instanciasColeta.length !== 1 ? 's' : ''} no total
            </p>
          </div>

          <p className="text-sm text-white mb-5">
            Instâncias responsáveis por coletar eventos dos grupos, como entradas e saídas de membros. Também podem monitorar abertura e fechamento de grupos, se configurado. Recomendado: 1 instância configurada.
          </p>

          {/* Lista */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {instanciasColeta.map((numero) => (
              <ColetaInstanciaCard
                key={numero.id}
                numero={numero}
                onToggleAtivo={handleToggleAtivo}
                onEdit={(n) => setEditColetaModal({ open: true, numero: n })}
                onDelete={(n) => setColetaDeleteModal(n)}
                onReconectar={handleReconectar}
              />
            ))}
          </div>

          <button
            onClick={() => setNovaColetaModal(true)}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed border-[#004AFF]/30 text-[#004AFF]/70 hover:text-[#004AFF] hover:border-[#004AFF]/50 hover:bg-[#004AFF]/5 transition-all duration-200 text-[13px] font-medium"
          >
            <Plus className="w-4 h-4" />
            Nova Instância de Coleta
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

          <p className="text-sm text-white mb-5">
            Mensagens rotativas enviadas quando o lead clica no link para chamar no WhatsApp. Cada lead recebe uma mensagem diferente, gerando rotatividade e evitando repetição.
          </p>

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
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed border-[#004AFF]/30 text-[#004AFF]/70 hover:text-[#004AFF] hover:border-[#004AFF]/50 hover:bg-[#004AFF]/5 transition-all duration-200 text-[13px] font-medium"
          >
            <Plus className="w-4 h-4" />
            Adicionar Mensagem
          </button>
        </>
      )}

      {/* Modals: Instâncias */}
      {editFormModal.open && editFormModal.numero && (
        <NumeroFormModal
          numero={editFormModal.numero}
          proximaOrdem={editFormModal.numero.ordem}
          onSave={handleSaveNumero}
          onClose={() => setEditFormModal({ open: false, numero: null })}
        />
      )}
      {novaInstanciaModal && (
        <NovaInstanciaModal
          onCriarInstancia={handleCriarInstancia}
          onClose={() => setNovaInstanciaModal(false)}
        />
      )}
      {numDeleteModal && (
        <ConfirmDeleteNumeroModal
          nome={numDeleteModal.nome}
          onConfirm={handleDeleteNumero}
          onClose={() => setNumDeleteModal(null)}
        />
      )}

      {/* Modals: Coleta */}
      {editColetaModal.open && editColetaModal.numero && (
        <NumeroFormModal
          numero={editColetaModal.numero}
          proximaOrdem={editColetaModal.numero.ordem}
          onSave={handleSaveColetaNumero}
          onClose={() => setEditColetaModal({ open: false, numero: null })}
        />
      )}
      {novaColetaModal && (
        <NovaInstanciaModal
          onCriarInstancia={handleCriarColetaInstancia}
          onClose={() => setNovaColetaModal(false)}
        />
      )}
      {coletaDeleteModal && (
        <ConfirmDeleteNumeroModal
          nome={coletaDeleteModal.nome}
          onConfirm={handleDeleteColeta}
          onClose={() => setColetaDeleteModal(null)}
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
