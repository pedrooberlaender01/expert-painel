---
status: resolved
trigger: "Ranking de torneios não ordena participantes por greens (maior sequência primeiro). Gean tem 5 greens aparece no topo, Margareth e Adriano têm 12 greens cada mas ficam abaixo."
created: 2026-04-27T00:00:00Z
updated: 2026-04-27T00:00:00Z
---

## Current Focus

hypothesis: fetchRanking ordena por soma_lucro_liquido quando logica_ganhador != 'quantidade', mesmo para torneios com logica='sequencia' ou outros — para torneios novos (sem campo definido), pode estar ordenando por coluna errada
test: ler fetchRanking em src/pages/Torneios.tsx e verificar lógica
expecting: confirmar que apenas 'quantidade' usa total_greens; outros usam soma_lucro_liquido
next_action: confirmar logica_ganhador do torneio atual

## Symptoms

expected: Ranking ordenado por greens decrescente — quem tem mais greens aparece em primeiro lugar
actual: Ordem aleatória/incorreta — participante com 5 greens aparece como #1, participantes com 12 greens aparecem abaixo
errors: nenhum erro de console relatado
reproduction: Abrir página de Torneios e ver seção "RANKING COMPLETO"
started: bug atual, comportamento incorreto observado agora

## Eliminated

## Evidence

- timestamp: 2026-04-27
  checked: src/pages/Torneios.tsx fetchRanking (linha 1034-1052)
  found: `const orderColumn = torneio?.logica_ganhador === 'quantidade' ? 'total_greens' : 'soma_lucro_liquido';`
  implication: SOMENTE torneios com logica_ganhador='quantidade' ordenam por total_greens. Torneios com 'lucro', 'sequencia', null ou undefined ordenam por soma_lucro_liquido.

- timestamp: 2026-04-27
  checked: src/pages/Torneios.tsx linha 1106 (fetchParticipantes)
  found: Mesmo bug duplicado em fetchParticipantes — SQL .order(orderColumn) usa mesma logica.
  implication: Bug afeta tanto aba Ranking quanto aba Participantes.

- timestamp: 2026-04-27
  checked: src/pages/Torneios.tsx linha 379 (NovoTorneioModal)
  found: `const [logica, setLogica] = useState<'quantidade' | 'lucro' | 'sequencia'>(torneio?.logica_ganhador || 'lucro');`
  implication: Default de novos torneios é 'lucro' — ou seja, ordenacao será por soma_lucro_liquido por padrao.

- timestamp: 2026-04-27
  checked: src/pages/Torneios.tsx linha 2277 (header da tabela Participantes)
  found: `{logica_ganhador === 'sequencia' ? 'Sequência' : 'Greens'} <SortIcon col="total_greens" />`
  implication: Para modo 'sequencia', UI mostra coluna chamada "Sequência" mas exibe entry.total_greens (NAO um campo de sequencia real). Nao ha campo `sequencia_greens` no view ranking_torneio.

- timestamp: 2026-04-27
  checked: RankingEntry interface (linha 39-51)
  found: Campos disponiveis: total_greens, soma_pagamentos, soma_lucro_liquido. NAO existe campo de sequencia.
  implication: Modo 'sequencia' nao tem dado real para ordenar — provavelmente o torneio do usuario está nesse modo ou em 'lucro', e a ordenacao por soma_lucro_liquido coloca quem tem maior lucro (Gean com greens mais valiosos) acima de quem tem mais greens (Margareth/Adriano com greens menores).

- timestamp: 2026-04-27
  checked: Sintoma reportado (Gean 5 greens em #1, Margareth/Adriano 12 greens abaixo)
  found: Padrao consistente com ordenacao por soma_lucro_liquido — Gean teve apostas de maior valor unitario.
  implication: Confirma que torneio NAO está em modo 'quantidade' (caso contrario ordenaria por total_greens).

- timestamp: 2026-04-27
  checked: SMOKING GUN — query Supabase REST direto em torneios?status=eq.ativo
  found: Torneio "CARTA DA SORTE" (id 65b16c9c) tem logica_ganhador='sequencia'. Outro ativo: "Torneio Teste" tem 'lucro'.
  implication: Confirmado que o torneio do bug está em modo 'sequencia'.

- timestamp: 2026-04-27
  checked: SMOKING GUN — query Supabase ranking_torneio?torneio_id=eq.65b16c9c&order=soma_lucro_liquido.desc
  found: TODOS os 25 participantes tem soma_lucro_liquido=0. Gean 5 greens, Margareth 12 greens, Adriano 12 greens.
  implication: Como todos tem lucro=0, Postgres retorna ordem nao-deterministica (provavelmente ordem fisica/insercao). Por isso Gean (5 greens) aparece no topo enquanto Margareth/Adriano (12 greens) ficam embaixo. CONFIRMADO BUG: para modo 'sequencia' deveria ordenar por total_greens (não existe campo sequencia real no view).

## Resolution

root_cause: Em src/pages/Torneios.tsx (linhas 1040 e 1106), a logica de ordenacao usa `logica_ganhador === 'quantidade' ? 'total_greens' : 'soma_lucro_liquido'`. Para torneios em modo 'sequencia', o ranking deveria mostrar maior numero de greens primeiro (a UI inclusive mostra o campo total_greens como "Sequência"), mas a query SQL ordena por soma_lucro_liquido. Como o torneio "CARTA DA SORTE" tem todos os participantes com soma_lucro_liquido=0, a ordem retornada é nao-deterministica, fazendo participante com 5 greens aparecer acima de quem tem 12.

fix: Em src/pages/Torneios.tsx, substituir a logica ternaria por mapeamento explicito que trata 'sequencia' como 'quantidade' (ambos ordenam por total_greens), aplicando segunda chave de ordenacao para desempate. Aplicar em fetchRanking (linha 1040) e fetchParticipantes (linha 1106). Tambem aplicar mesma logica no useEffect que define partSort default (linha 1077).

verification: |
  1. TypeScript check: `npx tsc --noEmit -p .` — passou sem erros
  2. Query Supabase REST com novo ORDER BY (total_greens DESC, soma_lucro_liquido DESC) para CARTA DA SORTE retornou:
     - #1 Adriano (12 greens)
     - #2 Margareth (12 greens)
     - #3 Gean (5 greens)
     - #4 Deiglismar (5 greens)
     CORRETO — agora reflete a expectativa do usuario.
  3. Para torneios em modo 'lucro' (default), comportamento anterior preservado: ordena por soma_lucro_liquido com desempate por total_greens.
files_changed: ["src/pages/Torneios.tsx"]
