import type { Node, Edge } from '@xyflow/react';
import type { MensagemFunilRow } from '../../../../types/database';

// ── Config das secoes do funil (nomes reais do banco) ──
export const SECAO_CONFIG: Record<string, { numero: number; titulo: string; hint: string }> = {
  lead_chegou:          { numero: 1, titulo: 'Chegada do lead',       hint: 'saudação' },
  primeiro_contato:     { numero: 2, titulo: 'Primeiro contato',      hint: 'coleta nome' },
  convite:              { numero: 3, titulo: 'Convite comunidade',    hint: 'cenários' },
  aguardando_cadastro:  { numero: 4, titulo: 'Aguardando cadastro',   hint: 'link enviado' },
  confirmacao_entrada:  { numero: 5, titulo: 'Confirmação entrada',   hint: 'no grupo' },
};

const SECOES_FUNIL = new Set(Object.keys(SECAO_CONFIG));

// Posicionamento padrao (fallback quando position_x/y e null)
const GATILHO_X = 0;
const FIRST_ETAPA_X = 290;
const STEP_X = 290;
const NODE_Y = 80;

function capitalize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Helpers exportados para identificar quais rows guardam posicao ──

/** Retorna o registro do cenario de gatilho (palavras de ativacao) */
export function getGatilhoRow(mensagens: MensagemFunilRow[]): MensagemFunilRow | null {
  return mensagens.find(
    (m) => m.secao === 'lead_chegou' && m.cenario === 'lead_chegou_gatilho'
  ) ?? null;
}

/** Retorna o registro ancora de uma secao (menor ordem, excluindo o gatilho) */
export function getAnchorRowForSecao(mensagens: MensagemFunilRow[], secao: string): MensagemFunilRow | null {
  const rows = mensagens
    .filter((m) => m.secao === secao && m.cenario !== 'lead_chegou_gatilho')
    .sort((a, b) => a.ordem - b.ordem);
  return rows[0] ?? null;
}

// ── Builder principal ──

export function buildFlowData(mensagens: MensagemFunilRow[]): { nodes: Node[]; edges: Edge[] } {
  // Filtrar secoes do funil
  const funilRows = mensagens.filter((m) => {
    if (SECOES_FUNIL.has(m.secao)) return true;
    if (m.secao !== 'followups' && m.secao !== 'boas_vindas') return true;
    return false;
  });

  // Agrupar por secao
  const grouped = new Map<string, MensagemFunilRow[]>();
  for (const row of funilRows) {
    const list = grouped.get(row.secao) || [];
    list.push(row);
    grouped.set(row.secao, list);
  }

  // Ordenar secoes pelo numero do SECAO_CONFIG (secoes desconhecidas vao ao final)
  const maxNumero = Object.keys(SECAO_CONFIG).length;
  const secoes = Array.from(grouped.entries())
    .map(([secao, rows]) => ({
      secao,
      rows,
      numero: SECAO_CONFIG[secao]?.numero ?? (maxNumero + 1),
    }))
    .sort((a, b) => a.numero - b.numero);

  // Gatilho — posicao do banco ou fallback
  const gatilhoRow = getGatilhoRow(mensagens);
  const palavrasAtivacao = gatilhoRow?.mensagens?.filter((s) => s.trim().length > 0) ?? [];
  const gatilhoX = gatilhoRow?.position_x ?? GATILHO_X;
  const gatilhoY = gatilhoRow?.position_y ?? NODE_Y;

  const nodes: Node[] = [
    { id: 'gatilho', type: 'gatilho', position: { x: gatilhoX, y: gatilhoY }, data: { palavras: palavrasAtivacao } },
  ];

  const edges: Edge[] = [];
  let prevId = 'gatilho';

  secoes.forEach((entry, idx) => {
    const config = SECAO_CONFIG[entry.secao];
    const numero = config?.numero ?? (Object.keys(SECAO_CONFIG).length + idx + 1);
    const titulo = config?.titulo ?? capitalize(entry.secao);
    const hint = config?.hint ?? '';
    // Contar cenarios excluindo o gatilho
    const cenarioRows = entry.rows.filter((r) => r.cenario !== 'lead_chegou_gatilho');
    const totalCenarios = cenarioRows.length;
    const ativo = cenarioRows.some((r) => r.ativo);
    const subtitulo = `${totalCenarios} ${totalCenarios === 1 ? 'mensagem' : 'mensagens'}${hint ? ` · ${hint}` : ''}`;

    // Posicao: ler da row ancora (menor ordem excluindo gatilho)
    const anchorRow = cenarioRows.sort((a, b) => a.ordem - b.ordem)[0];
    const defaultX = FIRST_ETAPA_X + idx * STEP_X;
    const x = anchorRow?.position_x ?? defaultX;
    const y = anchorRow?.position_y ?? NODE_Y;

    const nodeId = `etapa-${entry.secao}`;

    nodes.push({
      id: nodeId,
      type: 'etapa',
      position: { x, y },
      data: { numero, titulo, subtitulo, ativo, secao: entry.secao },
    });

    edges.push({
      id: `e-${prevId}-${nodeId}`,
      source: prevId,
      target: nodeId,
    });

    prevId = nodeId;
  });

  return { nodes, edges };
}
