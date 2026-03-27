# Phase 1: Database Foundation & Migration - Research

**Researched:** 2026-03-27
**Domain:** Supabase PostgreSQL schema migration, multi-tenant data architecture
**Confidence:** HIGH

## Summary

Phase 1 is a pure database migration phase: create two new tables (`experts`, `planos`), add an `expert_id` UUID column to 25 existing tables, migrate all existing data to Allan (Expert #1), and ensure the application continues to function. No frontend code changes are needed beyond updating TypeScript types to include `expert_id` in row definitions.

The migration must be incremental. The strategy is: (1) create `experts` + `planos` with seed data, (2) add `expert_id` as NULLABLE first to avoid breaking inserts, (3) backfill all rows with Allan's expert_id, (4) set NOT NULL constraint and add FK + index. This three-step approach ensures zero downtime since the existing app does not send `expert_id` in any inserts yet.

**Primary recommendation:** Use Supabase MCP `apply_migration` tool for all DDL changes, executed as three sequential migrations matching the three plans. Each migration must be idempotent (use `IF NOT EXISTS` / `IF NOT EXISTS` guards) so it can be re-run safely.

## Project Constraints (from CLAUDE.md)

- **Tech Stack:** Manter React 19 + Vite + Tailwind + Supabase + n8n
- **Database:** Mesmo projeto Supabase (`albdkqpvoyfhziozgwlk`) com coluna `expert_id`
- **Auth:** Manter auth customizada (nao migrar para Supabase Auth)
- **Abordagem:** Incremental -- sistema deve continuar funcionando durante migracao
- **GSD Workflow:** Do not make direct repo edits outside a GSD workflow unless user explicitly asks

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MTNT-01 | Tabela `experts` com campos: nome, slug, cor_primaria, cor_secundaria, logo_url, nome_plataforma, nome_assistente, voice_id, voice_settings (JSONB), plano_id, ativo, created_at | CREATE TABLE DDL in Plan 01-01; schema defined in Architecture Patterns section |
| MTNT-02 | Tabela `planos` com campos: nome, max_leads, max_instancias, max_envios_mes, features_permitidas (JSONB), ativo, created_at | CREATE TABLE DDL in Plan 01-01; schema defined in Architecture Patterns section |
| MTNT-03 | Coluna `expert_id` (UUID, NOT NULL, FK -> experts.id) em todas as 25 tabelas relevantes | ALTER TABLE DDL in Plan 01-02; full table list in Architecture Patterns; three-step NULLABLE->backfill->NOT NULL pattern |
| MTNT-04 | Todos os 1762 leads e dados relacionados migrados com expert_id do Allan | UPDATE backfill SQL in Plan 01-03; validation queries documented in Code Examples |
| MTNT-05 | Indices criados em expert_id para todas as tabelas relevantes | CREATE INDEX in Plan 01-02; index pattern documented |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase PostgreSQL | (managed) | Database engine | Already in use; all migrations run against this |
| Supabase MCP `apply_migration` | N/A | Execute DDL migrations | Required by project -- migrations must use this tool |
| @supabase/supabase-js | ^2.97.0 | Client SDK (type updates) | Already installed; TypeScript types need `expert_id` added |

### Supporting

No additional libraries needed. Phase 1 is purely SQL migrations + TypeScript type updates.

## Architecture Patterns

### experts Table Schema

```sql
CREATE TABLE IF NOT EXISTS experts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  cor_primaria TEXT NOT NULL DEFAULT '#10b981',
  cor_secundaria TEXT NOT NULL DEFAULT '#059669',
  logo_url TEXT,
  nome_plataforma TEXT NOT NULL DEFAULT 'Dashboard',
  nome_assistente TEXT NOT NULL DEFAULT 'Helena',
  voice_id TEXT,
  voice_settings JSONB DEFAULT '{"speed": 1.0, "pitch": 0, "timbre": 0, "vol": 1.0}'::jsonb,
  plano_id UUID REFERENCES planos(id),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### planos Table Schema

```sql
-- planos must be created BEFORE experts (FK dependency)
CREATE TABLE IF NOT EXISTS planos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  max_leads INTEGER,          -- NULL = unlimited
  max_instancias INTEGER NOT NULL DEFAULT 2,
  max_envios_mes INTEGER,     -- NULL = unlimited
  features_permitidas JSONB NOT NULL DEFAULT '["agendamento"]'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Full List of 25 Tables Requiring expert_id

From MTNT-03, cross-referenced with the codebase:

| # | Table | Currently Used in Frontend | ID Type | Estimated Rows |
|---|-------|---------------------------|---------|----------------|
| 1 | leads | Yes | UUID | 1762 |
| 2 | mensagens | Yes (Conversas) | UUID | ~1617 |
| 3 | followups_enviados | Yes (MensagensFunil) | UUID | ~212 |
| 4 | notificacoes | Yes | UUID | unknown |
| 5 | templates_mensagem | Yes | UUID | unknown |
| 6 | configuracoes | Yes (MensagensFunil) | UUID | 8 |
| 7 | mensagens_funil_v2 | Yes | UUID | unknown |
| 8 | whatsapp_rotacao | Yes | serial (int) | 6 |
| 9 | whatsapp_rotacao_config | No (DB-only) | unknown | unknown |
| 10 | whatsapp_rotacao_mensagens | Yes | serial (int) | unknown |
| 11 | whatsapp_eventos_log | No (DB-only) | unknown | unknown |
| 12 | moderacao_grupos | Yes | UUID | unknown |
| 13 | moderacao_strikes | No (DB-only) | unknown | unknown |
| 14 | moderacao_log | Yes | UUID | unknown |
| 15 | agendamentos_mensagens | Yes | UUID | unknown |
| 16 | agendamentos_grupos | Yes | UUID | unknown |
| 17 | torneios | Yes | UUID | unknown |
| 18 | participantes | Yes (Torneios) | UUID | unknown |
| 19 | greens | Yes (Torneios) | UUID | unknown |
| 20 | log_imagens | No (DB-only) | unknown | unknown |
| 21 | copys_geradas | No (DB-only) | unknown | unknown |
| 22 | expert_perfil | Yes (GerarCopy) | UUID | 1 |
| 23 | blacklist_grupos | Yes (Grupos) | UUID | unknown |
| 24 | grupos_ignorar_coleta | Yes (Grupos) | UUID | unknown |
| 25 | telegram_canais | Yes (Agendamentos) | UUID | unknown |
| 26 | documents | Yes (GerarCopy) | UUID | unknown |

**Note:** The requirement says 25 tables, but the explicit list in MTNT-03 contains 26 entries (including `documents`). All 26 must receive `expert_id`.

### Tables NOT Receiving expert_id

These tables are either system-level or junction tables that derive tenant context from their parent:

| Table | Reason |
|-------|--------|
| admin_users | Auth table -- will get role/expert_id in Phase 2 |
| dashboard_users | Used by configuracoes hook -- evaluate if needed |
| membros_grupo | Derives tenant from grupo/lead relationship |
| envios_massa | Should receive expert_id (NOT in MTNT-03 list but logically needed) |
| envios_massa_leads | Child of envios_massa -- derives from parent |
| metricas_diarias | Aggregation table -- will need expert_id in future |
| ranking_torneio | View or derived from torneios -- check if table or view |

**IMPORTANT:** The planner should verify whether `envios_massa`, `envios_massa_leads`, `metricas_diarias`, `dashboard_users`, `membros_grupo`, and `ranking_torneio` need `expert_id` now or in a later phase. The MTNT-03 list does not include them, but they contain tenant data. For Phase 1, strictly follow MTNT-03's explicit list of 25 tables + `documents`.

### Three-Step Migration Pattern (for expert_id addition)

This pattern ensures zero downtime:

```sql
-- Step 1 (Plan 01-02): Add column as NULLABLE (no breakage)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS expert_id UUID;

-- Step 2 (Plan 01-03): Backfill all rows
UPDATE leads SET expert_id = '<allan-expert-uuid>' WHERE expert_id IS NULL;

-- Step 3 (Plan 01-03): Add constraints AFTER backfill
ALTER TABLE leads ALTER COLUMN expert_id SET NOT NULL;
ALTER TABLE leads ADD CONSTRAINT fk_leads_expert
  FOREIGN KEY (expert_id) REFERENCES experts(id);
CREATE INDEX IF NOT EXISTS idx_leads_expert_id ON leads(expert_id);
```

### Migration Execution Order

1. **Plan 01-01:** Create `planos` table -> seed 3 plans -> create `experts` table (with FK to planos) -> seed Allan as Expert #1
2. **Plan 01-02:** Add `expert_id` column (NULLABLE) to all 25+ tables, create indexes
3. **Plan 01-03:** Backfill expert_id with Allan's UUID -> set NOT NULL -> add FKs -> validate

### TypeScript Type Updates Required

After migration, these files need `expert_id: string` added:

- `src/types/database.ts` -- all Row, Insert, Update types
- `src/types/index.ts` -- the `Lead` interface

Insert types should have `expert_id` as optional (will be set by RLS/default in Phase 2).

### Supabase RPCs That Will Need Updates (Phase 2, not Phase 1)

These RPCs query tables that will now have `expert_id` but do NOT need changes in Phase 1 (single-tenant still works):

- `get_metricas_dashboard` -- queries leads
- `get_lista_conversas` -- queries mensagens
- `listar_grupos_distintos` -- queries leads/membros
- `admin_login` -- queries admin_users
- `buscar_leads_envio_massa` -- queries leads
- `get_funil_status` -- queries leads

### Supabase Views That May Need Updating

These views query tables getting `expert_id`:

- `leads_aguardando` -- view on leads
- `leads_hoje` -- view on leads
- `funil_status` -- view on leads
- `metricas_hoje` -- view on leads
- `notificacoes_nao_lidas` -- view on notificacoes

In Phase 1, views continue to work because they return all data (no filter). In Phase 2, views will need `WHERE expert_id = ...` or be replaced with RLS-filtered queries.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID generation | Custom UUID function | `gen_random_uuid()` (built into PostgreSQL 13+) | Native, crypto-secure, no extension needed |
| Migration tracking | Custom version table | Supabase MCP `apply_migration` | Supabase manages migration history internally |
| Data validation after migration | Manual spot checks | COUNT/SUM comparison queries | Automated validation catches edge cases |
| Idempotent DDL | IF/ELSE logic | `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` | PostgreSQL native, re-runnable |

## Common Pitfalls

### Pitfall 1: Adding NOT NULL Column Without Default Breaks Existing Inserts
**What goes wrong:** If you `ALTER TABLE leads ADD COLUMN expert_id UUID NOT NULL`, every existing row fails the constraint instantly and any pending INSERT from the running app (which does not send expert_id) will fail.
**Why it happens:** The app is still running without expert_id awareness.
**How to avoid:** Add column as NULLABLE first, backfill, then set NOT NULL. For the transition period (Phase 1 only), the column stays nullable until all rows are backfilled.
**Warning signs:** `NOT NULL constraint violation` errors in Supabase logs.

### Pitfall 2: FK Constraint Before Backfill
**What goes wrong:** Adding `FOREIGN KEY (expert_id) REFERENCES experts(id)` before all rows have a valid expert_id causes the ALTER to fail.
**Why it happens:** Existing rows have NULL expert_id which violates the FK.
**How to avoid:** Always: backfill first, then add FK constraint.
**Warning signs:** `insert or update on table violates foreign key constraint` error.

### Pitfall 3: Missing Table in Migration
**What goes wrong:** One table is forgotten, causing inconsistent tenant isolation later.
**Why it happens:** Tables like `whatsapp_rotacao_config`, `moderacao_strikes`, `log_imagens`, `copys_geradas` are not used in the frontend code -- easy to overlook.
**How to avoid:** Use the canonical MTNT-03 list. Run a verification query after migration counting tables with/without expert_id.
**Warning signs:** A table accessible via Supabase API returns data without expert_id filter.

### Pitfall 4: Serial ID Tables Require Different Syntax
**What goes wrong:** `whatsapp_rotacao` and `whatsapp_rotacao_mensagens` use `serial` (integer) IDs instead of UUID. The `ADD COLUMN` syntax is the same, but be aware these tables might have different constraint patterns.
**Why it happens:** Legacy table design.
**How to avoid:** Verify each table's existing constraints before adding expert_id.
**Warning signs:** Unexpected constraint conflicts during ALTER.

### Pitfall 5: Existing Application Breaks After Column Addition
**What goes wrong:** If any existing INSERT statement in the app uses `INSERT INTO ... (col1, col2) VALUES (...)` with explicit column lists (not common with Supabase JS client, but possible in RPCs), the new column might cause issues.
**Why it happens:** Supabase JS client `.insert({ field1, field2 })` only sends specified fields -- missing fields get defaults. This is safe. But RPCs with hardcoded column lists could break.
**How to avoid:** Add column as NULLABLE with no DEFAULT initially. Check all RPCs.
**Warning signs:** RPC calls failing after migration.

### Pitfall 6: Forgetting to Seed Allan's Data Correctly
**What goes wrong:** Allan's expert record is created but plano_id is wrong, or default colors don't match current app (should be `#10b981`).
**Why it happens:** Disconnect between seed data and current app configuration.
**How to avoid:** Pull Allan's current data from `expert_perfil` table (1 row exists) and from app constants. The seed must use the SAME UUID for all backfill operations.
**Warning signs:** Allan logs in and sees wrong colors or missing data.

## Code Examples

### Migration 01-01: Create planos and experts, seed data

```sql
-- Migration: 01-01 Create experts and planos tables with seed data

-- 1. Create planos table
CREATE TABLE IF NOT EXISTS planos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  max_leads INTEGER,
  max_instancias INTEGER NOT NULL DEFAULT 2,
  max_envios_mes INTEGER,
  features_permitidas JSONB NOT NULL DEFAULT '["agendamento"]'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Seed three plans
INSERT INTO planos (nome, max_leads, max_instancias, max_envios_mes, features_permitidas)
VALUES
  ('Basico', 500, 2, 1000, '["agendamento"]'::jsonb),
  ('Pro', 2000, 5, 5000, '["agendamento", "torneio", "copy_ia"]'::jsonb),
  ('Enterprise', NULL, 10, NULL, '["agendamento", "torneio", "copy_ia", "moderacao", "voz_clonada"]'::jsonb)
ON CONFLICT (nome) DO NOTHING;

-- 3. Create experts table
CREATE TABLE IF NOT EXISTS experts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  cor_primaria TEXT NOT NULL DEFAULT '#10b981',
  cor_secundaria TEXT NOT NULL DEFAULT '#059669',
  logo_url TEXT,
  nome_plataforma TEXT NOT NULL DEFAULT 'Dashboard',
  nome_assistente TEXT NOT NULL DEFAULT 'Helena',
  voice_id TEXT,
  voice_settings JSONB DEFAULT '{"speed": 1.0, "pitch": 0, "timbre": 0, "vol": 1.0}'::jsonb,
  plano_id UUID REFERENCES planos(id),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Seed Allan as Expert #1 with Enterprise plan
INSERT INTO experts (nome, slug, cor_primaria, cor_secundaria, nome_plataforma, nome_assistente, plano_id)
SELECT
  'Allan Cabral',
  'allan-cabral',
  '#10b981',
  '#059669',
  'AUTOMACOES',
  'Helena',
  p.id
FROM planos p
WHERE p.nome = 'Enterprise'
ON CONFLICT (slug) DO NOTHING;
```

### Migration 01-02: Add expert_id to all tables (NULLABLE)

```sql
-- Migration: 01-02 Add expert_id column to all relevant tables

-- Pattern for each table:
-- ALTER TABLE {table} ADD COLUMN IF NOT EXISTS expert_id UUID;
-- CREATE INDEX IF NOT EXISTS idx_{table}_expert_id ON {table}(expert_id);

ALTER TABLE leads ADD COLUMN IF NOT EXISTS expert_id UUID;
CREATE INDEX IF NOT EXISTS idx_leads_expert_id ON leads(expert_id);

ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS expert_id UUID;
CREATE INDEX IF NOT EXISTS idx_mensagens_expert_id ON mensagens(expert_id);

-- ... repeat for all 25+ tables from MTNT-03 list
```

### Migration 01-03: Backfill and constrain

```sql
-- Migration: 01-03 Backfill expert_id and add constraints

-- Get Allan's expert_id
DO $$
DECLARE
  v_expert_id UUID;
BEGIN
  SELECT id INTO v_expert_id FROM experts WHERE slug = 'allan-cabral';

  -- Backfill all tables
  UPDATE leads SET expert_id = v_expert_id WHERE expert_id IS NULL;
  UPDATE mensagens SET expert_id = v_expert_id WHERE expert_id IS NULL;
  UPDATE followups_enviados SET expert_id = v_expert_id WHERE expert_id IS NULL;
  -- ... all 25+ tables

  -- Add NOT NULL constraints
  ALTER TABLE leads ALTER COLUMN expert_id SET NOT NULL;
  ALTER TABLE mensagens ALTER COLUMN expert_id SET NOT NULL;
  -- ... all tables

  -- Add foreign key constraints
  ALTER TABLE leads ADD CONSTRAINT fk_leads_expert FOREIGN KEY (expert_id) REFERENCES experts(id);
  ALTER TABLE mensagens ADD CONSTRAINT fk_mensagens_expert FOREIGN KEY (expert_id) REFERENCES experts(id);
  -- ... all tables
END $$;
```

### Validation Query (run after migration)

```sql
-- Verify all rows have expert_id set
SELECT 'leads' AS tbl, COUNT(*) AS total, COUNT(expert_id) AS with_expert, COUNT(*) - COUNT(expert_id) AS missing FROM leads
UNION ALL
SELECT 'mensagens', COUNT(*), COUNT(expert_id), COUNT(*) - COUNT(expert_id) FROM mensagens
UNION ALL
SELECT 'followups_enviados', COUNT(*), COUNT(expert_id), COUNT(*) - COUNT(expert_id) FROM followups_enviados
-- ... all tables
ORDER BY missing DESC;
```

### TypeScript Type Update Example

```typescript
// src/types/database.ts -- add expert_id to LeadRow
export interface LeadRow {
  id: string;
  expert_id: string;  // NEW: multi-tenant
  telefone: string;
  nome: string | null;
  // ... rest unchanged
}

export interface LeadInsert {
  id?: string;
  expert_id?: string;  // Optional for now -- will be set by RLS default in Phase 2
  telefone: string;
  // ... rest unchanged
}
```

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None -- zero test infrastructure exists |
| Config file | None -- see Wave 0 |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MTNT-01 | experts table exists with correct columns | SQL validation | Supabase MCP query: `SELECT column_name FROM information_schema.columns WHERE table_name = 'experts'` | N/A (SQL) |
| MTNT-02 | planos table exists with correct columns and 3 seed rows | SQL validation | Supabase MCP query: `SELECT COUNT(*) FROM planos` | N/A (SQL) |
| MTNT-03 | expert_id column exists on all 25+ tables | SQL validation | Query `information_schema.columns` for `expert_id` across all tables | N/A (SQL) |
| MTNT-04 | All rows have expert_id = Allan's UUID | SQL validation | Validation query (see Code Examples above) | N/A (SQL) |
| MTNT-05 | Indexes exist on expert_id columns | SQL validation | Query `pg_indexes` for `idx_*_expert_id` patterns | N/A (SQL) |

**Note:** This phase is entirely database migrations. Validation is SQL-based, not unit-test-based. The "app still works" criterion (Success Criteria #4) is verified by running `npm run dev` and manually checking that pages load without errors.

### Sampling Rate

- **Per migration:** Run validation SQL queries after each migration
- **Phase gate:** All validation queries return zero missing expert_ids + app runs without console errors

### Wave 0 Gaps

- No test framework needed for this phase (pure SQL migrations)
- Validation queries serve as the test suite
- TypeScript compilation (`npx tsc --noEmit`) serves as the type-correctness check after type updates

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase MCP | All migrations | Check at execution | N/A | Direct SQL via Supabase dashboard |
| Node.js | TypeScript compilation | Yes | (installed) | -- |
| npm | Package management | Yes | (installed) | -- |
| TypeScript | Type checking | Yes | ^5.8.3 | -- |

**Missing dependencies with no fallback:** None identified. All work is SQL + TypeScript types.

## Open Questions

1. **Which tables from MTNT-03 exist but are not in frontend code?**
   - What we know: `whatsapp_rotacao_config`, `whatsapp_eventos_log`, `moderacao_strikes`, `log_imagens`, `copys_geradas` are in MTNT-03 but not referenced in `src/`
   - What's unclear: Whether these tables actually exist in the Supabase schema or were planned but never created
   - Recommendation: Verify existence via Supabase MCP before migration. If they do not exist, skip them and note it. If they exist, add expert_id.

2. **Should `envios_massa` and `envios_massa_leads` get expert_id?**
   - What we know: They are NOT in the MTNT-03 list but contain tenant-specific data (mass sends belonging to a specific expert's leads)
   - What's unclear: Whether this was an intentional omission or oversight
   - Recommendation: Do NOT add expert_id in Phase 1 (follow MTNT-03 exactly). Flag for Phase 2 discussion.

3. **Should `metricas_diarias` and `dashboard_users` get expert_id?**
   - What we know: Not in MTNT-03 list. `metricas_diarias` has aggregated stats. `dashboard_users` is a notification preferences table.
   - Recommendation: Skip in Phase 1, address in Phase 2 if needed.

4. **What is `ranking_torneio`?**
   - What we know: Referenced in `Torneios.tsx` via `.from('ranking_torneio')`. Not in MTNT-03 list. Could be a view or a table.
   - Recommendation: Check via Supabase MCP. If it's a view on `torneios`/`participantes`, it will inherit filtering naturally.

5. **Allan's expert_perfil data**
   - What we know: `expert_perfil` has 1 row with Allan's profile data (used by GerarCopy for AI copy generation context)
   - Recommendation: Use data from `expert_perfil` to populate the `experts` seed record where applicable (nome, assistente name, etc.)

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/types/database.ts` -- all current TypeScript types for Supabase tables
- Codebase analysis: `src/hooks/*.ts` and `src/pages/*.tsx` -- all `.from()` calls identifying tables in use
- `.planning/REQUIREMENTS.md` -- MTNT-01 through MTNT-05 requirement definitions
- `.planning/codebase/ARCHITECTURE.md` -- current architecture patterns
- `.planning/PROJECT.md` -- project constraints and decisions

### Secondary (MEDIUM confidence)
- PostgreSQL documentation for `ALTER TABLE ADD COLUMN IF NOT EXISTS`, `DO $$ ... END $$` blocks
- Supabase migration patterns (based on standard PostgreSQL DDL)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- pure PostgreSQL DDL on existing Supabase project, no new dependencies
- Architecture: HIGH -- table schemas are explicitly defined in MTNT-01 and MTNT-02; migration pattern is standard PostgreSQL
- Pitfalls: HIGH -- all pitfalls are well-known PostgreSQL migration concerns, verified against the actual codebase

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable -- database schema changes are deterministic)
