---
phase: 01-database-foundation-migration
plan: 02
subsystem: database
tags: [postgresql, supabase, multi-tenant, migration, expert-id, indexes]

# Dependency graph
requires:
  - "planos and experts tables (from 01-01)"
provides:
  - "expert_id UUID NULLABLE column on all 26 tenant tables"
  - "idx_{table}_expert_id index on all 26 tenant tables"
affects: [01-database-foundation-migration, 02-rls-auth-security]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Supabase Management API for DDL migrations"
    - "Idempotent ALTER TABLE ADD COLUMN IF NOT EXISTS"
    - "Idempotent CREATE INDEX IF NOT EXISTS"
    - "Three-step migration: NULLABLE -> backfill -> NOT NULL + FK"

key-files:
  created:
    - "supabase/migrations/20260327_01_02_add_expert_id_to_all_tables.sql"
  modified: []

key-decisions:
  - "All 26 tables exist -- no tables skipped"
  - "Used Supabase Management API (same approach as Plan 01)"
  - "Columns are NULLABLE with no DEFAULT -- zero impact on existing app inserts"

patterns-established:
  - "expert_id column naming convention: always expert_id UUID"
  - "Index naming convention: idx_{table_name}_expert_id"

requirements-completed: [MTNT-03, MTNT-05]

# Metrics
duration: 2min
completed: 2026-03-27
---

# Phase 01 Plan 02: Add expert_id to All Tables Summary

**Added expert_id UUID NULLABLE column and idx_{table}_expert_id index to all 26 tenant tables for multi-tenant isolation**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-27T20:53:18Z
- **Completed:** 2026-03-27T20:55:27Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Pre-checked all 26 tables from MTNT-03 exist in the database (all confirmed)
- Applied ALTER TABLE ADD COLUMN IF NOT EXISTS expert_id UUID to all 26 tables
- Created CREATE INDEX IF NOT EXISTS idx_{table}_expert_id on all 26 tables
- Verified: 26 tables have expert_id column, all NULLABLE, 26 indexes created
- Zero tables skipped -- full coverage of MTNT-03 list

### Tables Modified (26/26)

1. leads, 2. mensagens, 3. followups_enviados, 4. notificacoes, 5. templates_mensagem,
6. configuracoes, 7. mensagens_funil_v2, 8. whatsapp_rotacao, 9. whatsapp_rotacao_config,
10. whatsapp_rotacao_mensagens, 11. whatsapp_eventos_log, 12. moderacao_grupos,
13. moderacao_strikes, 14. moderacao_log, 15. agendamentos_mensagens, 16. agendamentos_grupos,
17. torneios, 18. participantes, 19. greens, 20. log_imagens, 21. copys_geradas,
22. expert_perfil, 23. blacklist_grupos, 24. grupos_ignorar_coleta, 25. telegram_canais,
26. documents

## Task Commits

Each task was committed atomically:

1. **Task 1: Add expert_id column and index to all 26 tables** - `af1cb93` (feat)

## Files Created/Modified

- `supabase/migrations/20260327_01_02_add_expert_id_to_all_tables.sql` - DDL for adding expert_id + indexes to all 26 tables

## Decisions Made

- All 26 tables from MTNT-03 exist in the database -- no tables needed to be skipped.
- Used Supabase Management API via curl (same approach as Plan 01) since MCP tools are not directly callable.
- Columns are NULLABLE with no DEFAULT value, ensuring zero disruption to existing application inserts.
- Migration split into two API calls (tables 1-13 and 14-26) due to query size, both succeeded.

## Verification Results

| Query | Expected | Actual | Status |
|-------|----------|--------|--------|
| Tables with expert_id (excl. experts) | 26 | 26 | PASS |
| Tables with NOT NULL on expert_id | 0 rows | 0 rows | PASS |
| Indexes matching idx_%_expert_id | 26 | 26 | PASS |

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None -- this is a database-only migration with no application code changes.

## Next Phase Readiness

- All 26 tables have expert_id UUID (NULLABLE) -- ready for Plan 03 (backfill + NOT NULL + FK)
- Indexes are in place for query performance once RLS policies filter by expert_id (Phase 2)
- No blockers for subsequent plans

---
*Phase: 01-database-foundation-migration*
*Completed: 2026-03-27*
