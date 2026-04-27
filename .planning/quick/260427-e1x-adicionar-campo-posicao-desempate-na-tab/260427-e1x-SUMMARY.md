---
phase: quick-260427-e1x
plan: 01
subsystem: torneios
tags: [supabase, frontend, ui, ranking, desempate]
requires:
  - "supabase: tabela participantes"
  - "supabase: view ranking_torneio"
provides:
  - "UI de desempate manual entre participantes empatados"
  - "Coluna participantes.posicao_desempate"
  - "View ranking_torneio com posicao_desempate"
affects:
  - "Ordenacao do ranking e da lista de participantes em Torneios.tsx"
tech-stack:
  added: []
  patterns:
    - "Tiebreaker via posicao_desempate ASC NULLS LAST em queries Supabase"
    - "Calculo client-side de grupos de empate por total_greens"
key-files:
  created:
    - "supabase/migrations/20260427_quick_e1x_posicao_desempate.sql"
  modified:
    - "src/pages/Torneios.tsx"
decisions:
  - "Coluna posicao_desempate INT NULLABLE: NULL = sem ordem manual (vai para o fim do grupo)"
  - "Botoes de troca aparecem APENAS quando ha empate em total_greens (>=2 participantes)"
  - "Troca atomica com 2 UPDATEs sequenciais (sem RPC dedicada para manter quick task simples)"
  - "Handler handleSwapDesempate aceita direction up/down para tratar inicializacao quando algum lado e NULL"
metrics:
  duration: "5min"
  tasks: 3
  files: 2
  completed: "2026-04-27"
---

# Quick Task 260427-e1x: Adicionar campo posicao_desempate na tabela participantes — Summary

Mecanismo de desempate manual entre participantes de torneio empatados em total_greens, com persistencia em participantes.posicao_desempate e UI de setas no painel de Participantes.

## What Was Built

Coluna `participantes.posicao_desempate INT NULL`, view `ranking_torneio` recriada expondo a coluna, e UI em `Torneios.tsx` com botoes seta cima/baixo que aparecem apenas em participantes empatados. Clique persiste no Supabase via UPDATE e refaz o fetch.

## Migration Aplicada

Arquivo: `supabase/migrations/20260427_quick_e1x_posicao_desempate.sql`

DDL aplicado via Supabase Management API (projeto albdkqpvoyfhziozgwlk):

```sql
ALTER TABLE public.participantes
  ADD COLUMN IF NOT EXISTS posicao_desempate INT DEFAULT NULL;

COMMENT ON COLUMN public.participantes.posicao_desempate IS
  'Ordem manual de desempate entre participantes com mesmo total_greens. NULL = sem ordem definida (vai para o fim no ranking). Menor valor = melhor posicao.';

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
```

Validacoes executadas:
- `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='participantes' AND column_name='posicao_desempate'` retorna 1 linha com `is_nullable=YES`, `data_type=integer`, `column_default=null`.
- `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='ranking_torneio' AND column_name='posicao_desempate'` retorna 1 linha.
- `SELECT posicao_desempate FROM ranking_torneio LIMIT 1` executa sem erro.

## Mudancas em src/pages/Torneios.tsx

1. **interface RankingEntry** — adicionado campo opcional `posicao_desempate?: number | null`.
2. **fetchRanking** (`useCallback`) — query `.order('total_greens'|'soma_lucro_liquido', desc).order('posicao_desempate', { ascending: true, nullsFirst: false }).order('soma_lucro_liquido'|'total_greens', desc)`. Inverte primeira/terceira chave conforme `logica_ganhador`.
3. **fetchParticipantes** (`useCallback`) — mesma logica de 3 chaves de ordenacao.
4. **filteredParticipantes sort** — comparator computa `primary` e, em empate, aplica `posicao_desempate` ASC NULLS LAST como tiebreaker.
5. **state swapLoading** — controla feedback de loading e impede cliques duplos.
6. **tieGroups** — Map calculado client-side a partir de `filteredParticipantes`, identificando blocos de empate por `total_greens` (>=2) e expondo `prevId`/`nextId` para cada participante empatado.
7. **handleSwapDesempate(currentId, otherId, direction)** — UPDATE em duas chamadas Supabase (`participantes.posicao_desempate`); inicializa valores quando algum lado e NULL respeitando `direction`. Toast de sucesso/erro, refetch ao final.
8. **render <tr> de participante** — bloco condicional dentro do `<div className="flex items-center gap-3">` adiciona dois botoes (`ChevronUp` / `ChevronDown`, `w-5 h-5`) somente quando `tieGroups.get(participante_id)?.isTied`. Setas usam `var(--color-primary)` no hover (cor do expert via white-label). `disabled` quando nao ha vizinho ou swap em curso.

## Comportamento Final dos Botoes

- Setas ▲▼ aparecem apenas em participantes que compartilham `total_greens` com pelo menos um outro (grupo de empate >=2).
- ▲ desabilitada para o primeiro do grupo; ▼ desabilitada para o ultimo do grupo.
- Clicar ▲ no participante atual o sobe uma posicao dentro do grupo de empate (troca posicao_desempate com o anterior).
- Clicar ▼ desce uma posicao (troca com o proximo).
- Caso ambos os participantes envolvidos tenham `posicao_desempate = NULL`, o handler atribui `1` e `2` segundo a direcao.
- Caso apenas um lado tenha valor, o outro recebe `valor +/- 1` para se posicionar logicamente.
- Apos a troca, dispara `fetchParticipantes()` para refletir a nova ordem (que ja vem do banco com a chave de desempate aplicada).

## Como Verificar Manualmente

1. Logar como expert que tenha torneio com 2+ participantes empatados em greens.
2. Abrir aba `Torneios > Participantes`, selecionar o torneio empatado.
3. Confirmar que setas ▲▼ aparecem somente nos participantes empatados.
4. Clicar ▲ no segundo participante empatado — primeiro/segundo trocam de lugar.
5. Recarregar pagina — ordem persiste (posicao_desempate gravado em DB).
6. Via Supabase MCP: `SELECT id, nome, total_greens, posicao_desempate FROM participantes WHERE torneio_id = '<id>' ORDER BY total_greens DESC, posicao_desempate ASC NULLS LAST;` — confirmar valores.
7. Trocar para outro expert no admin: cor das setas (hover) muda para a cor do expert ativo.

## Commits

| Task | Commit | Mensagem |
| ---- | ------ | -------- |
| 1 | `e53ada5` | feat(quick-260427-e1x-01): adiciona coluna posicao_desempate em participantes |
| 2 | `18b1c5b` | feat(quick-260427-e1x-02): adiciona posicao_desempate em tipos e ordenacao |
| 3 | `a367df0` | feat(quick-260427-e1x-03): adiciona botoes de desempate na lista de participantes |

## Build / Verification

- `npx tsc --noEmit -p tsconfig.app.json` para `src/pages/Torneios.tsx` retorna apenas avisos pre-existentes (`SectionState`, `EnviarRankingModal`, `enviarRankingOpen` declarados-mas-nao-usados — sem relacao com esta task).
- `npm run build` completa com sucesso (`built in 13.59s`, `index-C-ZXw0Az.js` 1.48MB).
- Branch: `multi-tenant` (correto, NUNCA main).

## Deviations from Plan

None - plano executado exatamente como escrito.

## Self-Check: PASSED

- [x] supabase/migrations/20260427_quick_e1x_posicao_desempate.sql existe (FOUND)
- [x] commit e53ada5 existe (FOUND)
- [x] commit 18b1c5b existe (FOUND)
- [x] commit a367df0 existe (FOUND)
- [x] grep posicao_desempate em src/pages/Torneios.tsx: 10 ocorrencias (>= 6 esperado)
- [x] grep handleSwapDesempate em src/pages/Torneios.tsx: 3 ocorrencias (>= 3 esperado)
- [x] grep tieGroups em src/pages/Torneios.tsx: 2 ocorrencias (>= 2 esperado)
- [x] coluna participantes.posicao_desempate validada via information_schema
- [x] view ranking_torneio.posicao_desempate validada via information_schema
- [x] npm run build completa sem erros
