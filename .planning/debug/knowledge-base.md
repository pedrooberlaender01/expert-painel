# GSD Debug Knowledge Base

Resolved debug sessions. Used by `gsd-debugger` to surface known-pattern hypotheses at the start of new investigations.

---

## ranking-sort-order — Ranking de torneios em modo 'sequencia' ordenava por coluna errada
- **Date:** 2026-04-27
- **Error patterns:** ranking, ordenacao, torneio, greens, sequencia, soma_lucro_liquido, total_greens, ordem nao-deterministica
- **Root cause:** Em src/pages/Torneios.tsx (fetchRanking linha 1040, fetchParticipantes linha 1106 e useEffect linha 1077), a ordenacao usava ternario `logica_ganhador === 'quantidade' ? 'total_greens' : 'soma_lucro_liquido'`. Para torneios em modo 'sequencia', deveria ordenar por total_greens (UI mostra como "Sequência"), mas caia no else e ordenava por soma_lucro_liquido. Como todos participantes tinham soma_lucro_liquido=0, Postgres retornava ordem nao-deterministica (ordem fisica/insercao).
- **Fix:** Substituir ternario por mapeamento explicito que trata 'sequencia' e 'quantidade' como ordenacao por total_greens, com segunda chave de ordenacao (soma_lucro_liquido) para desempate. Aplicado em fetchRanking, fetchParticipantes e useEffect que define partSort default.
- **Files changed:** src/pages/Torneios.tsx
---
