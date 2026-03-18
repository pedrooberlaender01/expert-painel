import React, { useState } from 'react';
import { Loader2, FlaskConical } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { EnviosNav } from '../components/envios/EnviosNav';
import { Toast } from '../components/Toast';
import { useToast } from '../hooks/useToast';

function generateHex(length: number, uppercase = false): string {
  const bytes = crypto.getRandomValues(new Uint8Array(Math.ceil(length / 2)));
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, length);
  return uppercase ? hex.toUpperCase() : hex;
}

export const SimuladorEnvios: React.FC = () => {
  const [simTelefone, setSimTelefone] = useState('');
  const [simNome, setSimNome] = useState('');
  const [simToken, setSimToken] = useState('');
  const [simMensagem, setSimMensagem] = useState('');
  const [simEnviando, setSimEnviando] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  const handleSimular = async () => {
    const telefoneNumeros = simTelefone.replace(/\D/g, '');
    if (telefoneNumeros.length < 12) {
      showToast('error', 'Telefone deve ter no mínimo 12 dígitos (DDI+DDD+número)');
      return;
    }
    if (!simToken.trim()) {
      showToast('error', 'O token da instância é obrigatório');
      return;
    }
    if (!simMensagem.trim()) {
      showToast('error', 'A mensagem é obrigatória');
      return;
    }

    setSimEnviando(true);
    try {
      const timestamp = Date.now();
      const leadName = simNome.trim() || 'Lead Teste';
      const owner = '5500000000000';
      const chatId = `r${generateHex(16)}`;
      const msgIdHex1 = generateHex(20, true);
      const msgIdHex2 = generateHex(20, true);
      const mensagem = simMensagem.trim();

      const webhookUrl = 'https://n8n-gend.srv1431760.hstgr.cloud/webhook/assistente-whatsapp';
      const payload = {
        BaseUrl: 'https://pedrooberlaender.uazapi.com',
        EventType: 'messages',
        InstanceName: 'simulador',
        EventData: {
          object: {
            type: 'notify',
            event: 'message',
            data: {
              instanceId: simToken.trim(),
              messageId: `${msgIdHex1}${msgIdHex2}`,
              token: simToken.trim(),
              id: `${msgIdHex1}${msgIdHex2}`,
              from: `${telefoneNumeros}@s.whatsapp.net`,
              to: `${owner}@s.whatsapp.net`,
              sender: `${telefoneNumeros}@s.whatsapp.net`,
              sender_pn: `${telefoneNumeros}@s.whatsapp.net`,
              recipient: `${owner}@s.whatsapp.net`,
              recipient_pn: `${owner}@s.whatsapp.net`,
              chat_id: `${telefoneNumeros}@s.whatsapp.net`,
              chatid: `${telefoneNumeros}@s.whatsapp.net`,
              wa_chatid: `${telefoneNumeros}@s.whatsapp.net`,
              wa_chatid_pn: `${telefoneNumeros}@s.whatsapp.net`,
              from_me: false,
              isGroup: false,
              isEdit: false,
              type: 'text',
              source: 'android',
              status: 'received',
              timestamp,
              device_id: simToken.trim(),
              instanceId: simToken.trim(),
              instanceName: 'simulador',
              chatId,
              chatName: leadName,
              pushName: leadName,
              senderName: leadName,
              text: mensagem,
              body: mensagem,
              message: mensagem,
            },
          },
        },
      };

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await res.text();
        showToast('error', `Erro ao simular: ${msg}`);
        setSimEnviando(false);
        return;
      }

      showToast('success', 'Mensagem simulada com sucesso!');
      setSimMensagem('');
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao simular mensagem');
    } finally {
      setSimEnviando(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Envios em Massa" subtitle="Dispare mensagens para grupos de leads" />
      <EnviosNav />

      <section className="card-dark p-6">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-txt font-display flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-emerald-400" />
            Simulador de Mensagem
          </h2>
          <p className="text-[11px] text-txt-dim mt-1">Simule uma mensagem como se tivesse vindo pelo WhatsApp</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-mono font-semibold text-txt-muted mb-2 uppercase tracking-widest">Telefone do Lead *</label>
            <input
              type="text"
              value={simTelefone}
              onChange={(e) => setSimTelefone(e.target.value.replace(/\D/g, ''))}
              placeholder="5511999999999"
              className="input-dark"
              maxLength={15}
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono font-semibold text-txt-muted mb-2 uppercase tracking-widest">Nome do Lead (pushName)</label>
            <input
              type="text"
              value={simNome}
              onChange={(e) => setSimNome(e.target.value)}
              placeholder="Nome que aparece no WhatsApp"
              className="input-dark"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono font-semibold text-txt-muted mb-2 uppercase tracking-widest">Token da Instância *</label>
            <input
              type="text"
              value={simToken}
              onChange={(e) => setSimToken(e.target.value)}
              placeholder="Ex: df650d4b-9618-4eff-8111-e953730eeb25"
              className="input-dark"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono font-semibold text-txt-muted mb-2 uppercase tracking-widest">Mensagem *</label>
            <textarea
              value={simMensagem}
              onChange={(e) => setSimMensagem(e.target.value)}
              placeholder="Digite a mensagem que o lead enviaria..."
              rows={3}
              className="input-dark resize-none"
            />
          </div>
          <button
            onClick={handleSimular}
            disabled={simEnviando}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: simEnviando ? '#065f46' : '#10b981' }}
            onMouseEnter={(e) => { if (!simEnviando) e.currentTarget.style.background = '#059669'; }}
            onMouseLeave={(e) => { if (!simEnviando) e.currentTarget.style.background = '#10b981'; }}
          >
            {simEnviando ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FlaskConical className="w-4 h-4" />
            )}
            {simEnviando ? 'Enviando...' : 'Simular Mensagem'}
          </button>
        </div>
      </section>

      {toast && <Toast toast={toast} onClose={hideToast} />}
    </div>
  );
};
