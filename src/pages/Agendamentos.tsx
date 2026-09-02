import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnviosNav } from '../components/envios/EnviosNav';
import { Toast } from '../components/Toast';
import { MensagemBiblioteca } from '../components/agendamentos/MensagemBiblioteca';
import { NovaMensagemModal } from '../components/agendamentos/NovaMensagemModal';
import { AgendamentoDatePicker } from '../components/agendamentos/AgendamentoDatePicker';
import { GrupoSelector } from '../components/agendamentos/GrupoSelector';
import { CanalSelector } from '../components/agendamentos/CanalSelector';
import { useAgendamentos } from '../hooks/useAgendamentos';
import { useGerarCopy } from '../hooks/useGerarCopy';
import { useToast } from '../hooks/useToast';
import { useAuthStore } from '../stores/authStore';
import type {
  AgendamentoMensagem,
  RegraRecorrencia,
  InstanciaDisparadora,
  GrupoWhatsApp,
} from '../hooks/useAgendamentos';

const Agendamentos: React.FC = () => {
  const navigate = useNavigate();
  const { toast, showToast, hideToast } = useToast();

  const {
    mensagens,
    loadingMensagens,
    fetchMensagens,
    criarMensagem,
    editarMensagem,
    excluirMensagem,
    moverMensagemPasta,
    reordenarMensagens,
    pastas,
    fetchPastas,
    criarPasta,
    renomearPasta,
    excluirPasta,
    fetchAgendamentos,
    criarAgendamento,
    grupos,
    loadingGrupos,
    fetchGrupos,
    fetchGruposIntersecao,
    instancias,
    loadingInstancias,
    fetchInstancias,
    canaisTelegram,
    loadingCanaisTelegram,
    fetchCanaisTelegram,
    telegramBot,
    criarTelegramBot,
  } = useAgendamentos();

  const { adicionarExemplo } = useGerarCopy();

  // Form state
  const [canal, setCanal] = useState<'whatsapp' | 'telegram'>('whatsapp');
  const [selectedMensagemId, setSelectedMensagemId] = useState<string | null>(null);
  const [dataEnvio, setDataEnvio] = useState(() => new Date().toISOString().split('T')[0]);
  const [horario, setHorario] = useState('');
  const [recorrente, setRecorrente] = useState(false);
  const [regraRecorrencia, setRegraRecorrencia] = useState<RegraRecorrencia | null>(null);
  const [selectedInstancia, setSelectedInstancia] = useState<InstanciaDisparadora | null>(null);
  const [selectedGrupos, setSelectedGrupos] = useState<GrupoWhatsApp[]>([]);
  const [usarFila, setUsarFila] = useState(false);
  const [showNovaMensagemModal, setShowNovaMensagemModal] = useState(false);
  const [editandoMensagem, setEditandoMensagem] = useState<AgendamentoMensagem | null>(null);
  const [novaMensagemPastaId, setNovaMensagemPastaId] = useState<string | null>(null);
  const [agendando, setAgendando] = useState(false);
  const [salvandoMensagem, setSalvandoMensagem] = useState(false);

  useEffect(() => {
    fetchMensagens();
    fetchInstancias();
    fetchPastas();
  }, [fetchMensagens, fetchInstancias, fetchPastas]);

  // Canal change → clear groups & instancia
  const handleCanalChange = useCallback((novoCanal: 'whatsapp' | 'telegram') => {
    setCanal(novoCanal);
    setSelectedGrupos([]);
    setSelectedInstancia(null);
    if (novoCanal !== 'whatsapp') setUsarFila(false);
  }, []);

  // Fila Rotativa: busca grupos em comum entre todas as instancias conectadas+ativas
  useEffect(() => {
    if (canal !== 'whatsapp' || !usarFila) return;
    if (instancias.length === 0) return;
    setSelectedGrupos([]);
    void fetchGruposIntersecao(instancias);
  }, [canal, usarFila, instancias, fetchGruposIntersecao]);

  // Instância change → fetch grupos
  const handleInstanciaChange = useCallback(
    (inst: InstanciaDisparadora) => {
      setSelectedInstancia(inst);
      setSelectedGrupos([]);
      fetchGrupos(inst.instancia, inst.token);
    },
    [fetchGrupos]
  );

  const handleFetchGrupos = useCallback(() => {
    if (canal === 'whatsapp' && usarFila) {
      void fetchGruposIntersecao(instancias);
      return;
    }
    if (selectedInstancia) {
      fetchGrupos(selectedInstancia.instancia, selectedInstancia.token);
    }
  }, [canal, usarFila, instancias, selectedInstancia, fetchGrupos, fetchGruposIntersecao]);

  // Validation
  const recorrenteValido = recorrente
    ? (regraRecorrencia?.dias_semana?.length ?? 0) > 0 && !!horario
    : !!dataEnvio && !!horario;

  const podeAgendar =
    !!selectedMensagemId &&
    recorrenteValido &&
    selectedGrupos.length > 0 &&
    (canal === 'telegram' || usarFila || !!selectedInstancia);

  // Handle agendar — sempre via pg_cron (modo_teste=true)
  const handleAgendar = async () => {
    if (!podeAgendar) return;
    if (canal === 'whatsapp' && !usarFila && !selectedInstancia) return;

    // Para recorrente, recalcular dataEnvio antes de validar
    let dataEnvioFinal = dataEnvio;
    if (recorrente && regraRecorrencia) {
      const { calcularProximoEnvio } = await import('../components/agendamentos/AgendamentoDatePicker');
      dataEnvioFinal = calcularProximoEnvio(regraRecorrencia.dias_semana, regraRecorrencia.horario);
      if (!dataEnvioFinal) {
        showToast('error', 'Não foi possível calcular a próxima data de envio. Verifique os dias selecionados.');
        return;
      }
    }

    // Validar: não permitir agendamento no passado ou com menos de 2 min de antecedência
    const agora = new Date();
    const agendadoPara = new Date(`${dataEnvioFinal}T${horario}:00`);
    const diffMs = agendadoPara.getTime() - agora.getTime();

    if (diffMs < 0) {
      showToast('error', 'Não é possível agendar para uma data/horário que já passou.');
      return;
    }
    if (!recorrente && diffMs < 2 * 60 * 1000) {
      showToast('error', 'O agendamento deve ser feito com pelo menos 2 minutos de antecedência.');
      return;
    }

    try {
      setAgendando(true);

      const dataISO = `${dataEnvioFinal}T${horario}:00-03:00`;

      // Verificar se já existe agendamento pendente no mesmo horário exato E mesmo canal (do mesmo expert)
      const expertId = useAuthStore.getState().getActiveExpertId();
      if (!expertId) {
        showToast('error', 'Expert não identificado.');
        setAgendando(false);
        return;
      }
      const { supabase } = await import('../backend/client');
      const { data: existente } = await supabase
        .from('agendamentos_grupos')
        .select('id')
        .eq('expert_id', expertId)
        .eq('data_envio', dataISO)
        .eq('canal', canal)
        .in('status', ['pendente', 'enviando'])
        .limit(1);

      if (existente && existente.length > 0) {
        showToast('error', 'Já existe um agendamento para esse horário neste canal. Escolha outro.');
        setAgendando(false);
        return;
      }

      // Fila rotativa: garante instancia/token de fallback (NOT NULL no banco) — n8n decide rotação real
      let instanciaParaSalvar = selectedInstancia?.instancia ?? '';
      let tokenParaSalvar = selectedInstancia?.token ?? '';
      if (canal === 'whatsapp' && usarFila && !instanciaParaSalvar) {
        const fallback = instancias.find(i => i.status_conexao === 'connected') ?? instancias[0];
        if (fallback) {
          instanciaParaSalvar = fallback.instancia;
          tokenParaSalvar = fallback.token;
        }
      }

      await criarAgendamento({
        mensagem_id: selectedMensagemId!,
        grupos: selectedGrupos.map((g) => ({
          grupo_id: g.grupo_id,
          grupo_nome: g.grupo_nome,
        })),
        instancia: canal === 'telegram' ? 'telegram-bot' : instanciaParaSalvar,
        token: canal === 'telegram' ? 'telegram' : tokenParaSalvar,
        data_envio: dataISO,
        recorrente,
        regra_recorrencia: recorrente ? regraRecorrencia : null,
        canal,
        usar_fila: canal === 'whatsapp' ? usarFila : false,
        modo_teste: true,
      });

      showToast('success', 'Agendamento criado com sucesso!');

      // Reset form
      setSelectedMensagemId(null);
      setDataEnvio('');
      setHorario('');
      setRecorrente(false);
      setRegraRecorrencia(null);
      setSelectedGrupos([]);
      setUsarFila(false);

      // Navigate to agendados list
      navigate('/envios/agendados');
    } catch {
      showToast('error', 'Erro ao criar agendamento');
    } finally {
      setAgendando(false);
    }
  };

  // Handle nova/editar mensagem
  const handleSaveMensagem = async (dados: {
    nome: string;
    tipo: string;
    conteudo?: string;
    file?: File;
    mencionar_todos?: boolean;
  }) => {
    try {
      setSalvandoMensagem(true);
      if (editandoMensagem) {
        await editarMensagem(editandoMensagem.id, {
          nome: dados.nome,
          tipo: dados.tipo as AgendamentoMensagem['tipo'],
          conteudo: dados.conteudo ?? null,
          mencionar_todos: dados.mencionar_todos ?? false,
        });
        showToast('success', 'Mensagem atualizada!');
      } else {
        const nova = await criarMensagem({
          nome: dados.nome,
          tipo: dados.tipo as AgendamentoMensagem['tipo'],
          conteudo: dados.conteudo,
          file: dados.file,
          mencionar_todos: dados.mencionar_todos,
          pasta_id: novaMensagemPastaId,
        });
        if (nova) {
          showToast('success', 'Mensagem criada!');
          setSelectedMensagemId(nova.id);
        }
      }
      setShowNovaMensagemModal(false);
      setEditandoMensagem(null);
      setNovaMensagemPastaId(null);
    } catch {
      showToast('error', 'Erro ao salvar mensagem');
    } finally {
      setSalvandoMensagem(false);
    }
  };

  return (
    <div className="space-y-6">
      <EnviosNav />

      {/* Canal selector */}
      <CanalSelector canal={canal} onCanalChange={handleCanalChange} />

      {/* Form: 3 columns on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <MensagemBiblioteca
          mensagens={mensagens}
          pastas={pastas}
          selectedId={selectedMensagemId}
          onSelect={setSelectedMensagemId}
          onNovaMensagem={(pastaId) => {
            setEditandoMensagem(null);
            setNovaMensagemPastaId(pastaId);
            setShowNovaMensagemModal(true);
          }}
          onEditarMensagem={(msg) => {
            setEditandoMensagem(msg);
            setShowNovaMensagemModal(true);
          }}
          onExcluirMensagem={async (msg) => {
            try {
              await excluirMensagem(msg.id);
              if (selectedMensagemId === msg.id) setSelectedMensagemId(null);
              showToast('success', 'Mensagem excluida');
            } catch {
              showToast('error', 'Erro ao excluir mensagem');
            }
          }}
          onCriarPasta={async (nome) => {
            const p = await criarPasta(nome);
            if (p) showToast('success', `Pasta "${p.nome}" criada`);
            else showToast('error', 'Erro ao criar pasta');
            return p;
          }}
          onRenomearPasta={async (id, nome) => {
            await renomearPasta(id, nome);
          }}
          onExcluirPasta={async (id) => {
            try {
              await excluirPasta(id);
              showToast('success', 'Pasta excluida');
            } catch {
              showToast('error', 'Erro ao excluir pasta');
            }
          }}
          onMoverMensagem={moverMensagemPasta}
          onReordenarMensagens={reordenarMensagens}
          loading={loadingMensagens}
          canal={canal}
        />

        <AgendamentoDatePicker
          dataEnvio={dataEnvio}
          horario={horario}
          recorrente={recorrente}
          regraRecorrencia={regraRecorrencia}
          onDataChange={setDataEnvio}
          onHorarioChange={setHorario}
          onRecorrenteChange={setRecorrente}
          onRegraChange={setRegraRecorrencia}
          canal={canal}
        />

        <GrupoSelector
          instancias={instancias}
          loadingInstancias={loadingInstancias}
          grupos={grupos}
          loadingGrupos={loadingGrupos}
          selectedInstancia={selectedInstancia}
          selectedGrupos={selectedGrupos}
          onInstanciaChange={handleInstanciaChange}
          onGruposChange={setSelectedGrupos}
          onFetchGrupos={handleFetchGrupos}
          onAgendar={handleAgendar}
          onLimpar={() => setSelectedGrupos([])}
          agendando={agendando}
          podeAgendar={podeAgendar}
          canal={canal}
          canaisTelegram={canaisTelegram}
          loadingCanaisTelegram={loadingCanaisTelegram}
          onFetchCanaisTelegram={fetchCanaisTelegram}
          telegramBot={telegramBot}
          onCriarTelegramBot={criarTelegramBot}
          usarFila={usarFila}
          onUsarFilaChange={setUsarFila}
        />
      </div>

      {/* Modal Nova/Editar Mensagem */}
      <NovaMensagemModal
        isOpen={showNovaMensagemModal}
        onClose={() => {
          setShowNovaMensagemModal(false);
          setEditandoMensagem(null);
        }}
        onSave={handleSaveMensagem}
        editando={editandoMensagem}
        loading={salvandoMensagem}
        onAddExemplo={adicionarExemplo}
        showToast={showToast}
      />

      {toast && <Toast toast={toast} onClose={hideToast} />}
    </div>
  );
};

export default Agendamentos;
