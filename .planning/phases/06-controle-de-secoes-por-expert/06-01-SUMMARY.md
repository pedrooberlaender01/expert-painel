---
phase: 06-controle-de-secoes-por-expert
plan: 01
status: complete
started: 2026-04-01
completed: 2026-04-01
---

# Plan 06-01: Database + Types + RPCs + Admin Toggle Cards UI

## What Was Built

Coluna `secoes_habilitadas` JSONB na tabela experts com DEFAULT NULL, tipos TypeScript atualizados, RPCs admin com suporte ao novo campo, e UI de toggle cards no formulario de expert.

## Tasks Completed

| # | Task | Status |
|---|------|--------|
| 1 | Add secoes_habilitadas column and update types + RPCs | Done |
| 2 | Add toggle cards UI in AdminExpertForm | Done |

## Key Files

### Modified
- `src/types/index.ts` — SecoesHabilitadas type + ExpertProfile field
- `src/types/database.ts` — ExpertRow.secoes_habilitadas field
- `src/types/admin.ts` — ExpertFormData.secoes_habilitadas field
- `src/hooks/useAdminExperts.ts` — p_secoes_habilitadas in create/update RPCs
- `src/pages/admin/AdminExpertForm.tsx` — 8 toggle cards UI section

### Database Changes
- Column `secoes_habilitadas JSONB DEFAULT NULL` on experts table
- `admin_create_expert` RPC — accepts p_secoes_habilitadas, includes in INSERT
- `admin_update_expert` RPC — accepts p_secoes_habilitadas, includes in UPDATE SET
- `admin_login` RPC — returns secoes_habilitadas in expert profile
- `admin_get_expert` RPC — returns secoes_habilitadas via row_to_json

## Deviations

- Limpeza de overloads antigas das RPCs (versoes sem favicon_url e sem secoes_habilitadas) que estavam acumuladas no banco

## Self-Check: PASSED

- `npx tsc --noEmit` exits 0
- `npm run build` exits 0
- AdminExpertForm.tsx contains "Secoes do Painel" section with 8 toggle cards
- Toggle cards positioned between Plano and Credenciais sections
- NULL defaults all toggles to ON state
