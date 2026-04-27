-- Quick task 260427-e1x: adicionar campo posicao_desempate na tabela participantes
-- e atualizar view ranking_torneio para expor a coluna.

-- 1) Coluna na tabela participantes
ALTER TABLE public.participantes
  ADD COLUMN IF NOT EXISTS posicao_desempate INT DEFAULT NULL;

COMMENT ON COLUMN public.participantes.posicao_desempate IS
  'Ordem manual de desempate entre participantes com mesmo total_greens. NULL = sem ordem definida (vai para o fim no ranking). Menor valor = melhor posicao.';

-- 2) Recriar view ranking_torneio incluindo posicao_desempate
CREATE OR REPLACE VIEW public.ranking_torneio AS
SELECT
  t.id AS torneio_id,
  t.nome AS torneio_nome,
  p.id AS participante_id,
  p.telefone_whatsapp,
  p.id_conta,
  p.nome AS participante_nome,
  count(g.id) AS total_greens,
  COALESCE(sum(g.valor_green), 0::numeric) AS soma_pagamentos,
  COALESCE(sum(g.valor_green - g.valor_apostado), 0::numeric) AS soma_lucro_liquido,
  min(g.data_hora_aposta) AS primeiro_green,
  max(g.data_hora_aposta) AS ultimo_green,
  p.posicao_desempate
FROM participantes p
JOIN torneios t ON t.id = p.torneio_id
LEFT JOIN greens g ON g.torneio_id = t.id AND g.participante_id = p.id
GROUP BY t.id, t.nome, p.id, p.telefone_whatsapp, p.id_conta, p.nome, p.posicao_desempate
ORDER BY (COALESCE(sum(g.valor_green), 0::numeric)) DESC;
