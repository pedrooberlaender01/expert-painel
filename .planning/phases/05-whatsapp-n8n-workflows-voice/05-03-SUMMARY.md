---
phase: 05-whatsapp-n8n-workflows-voice
plan: 03
subsystem: infra, database, ui
tags: [n8n, supabase, multi-tenant, webhooks, whatsapp, configuracoes]

requires:
  - phase: 03-admin-panel
    provides: admin_create_expert RPC, AdminExpertForm component
  - phase: 01-schema-foundation
    provides: expert_id columns on all tables including configuracoes

provides:
  - N8N infra migration guide for 3 multi-tenant workflows (Coleta, Rotatividade, identificaConexao)
  - Updated admin_create_expert RPC with auto-clone configuracoes
  - Traffic links (Instagram/Facebook) in AdminExpertForm with copy-to-clipboard

affects: [n8n-workflows, admin-panel, expert-onboarding]

tech-stack:
  added: []
  patterns:
    - "Expert resolution from instance: SELECT expert_id FROM whatsapp_rotacao WHERE instancia"
    - "Traffic link pattern: N8N_GEND webhook URL with expert_id query parameter"
    - "Template cloning: first expert by created_at serves as config template"

key-files:
  created:
    - .planning/phases/05-whatsapp-n8n-workflows-voice/N8N_INFRA_MIGRATION_GUIDE.md
    - supabase/migrations/20260328_05_03_update_admin_create_expert_configuracoes.sql
  modified:
    - src/pages/admin/AdminExpertForm.tsx
    - src/config/webhooks.ts

key-decisions:
  - "N8N_GEND exported from webhooks.ts for reuse in traffic links"
  - "Rotatividade Numero uses expert_id from query parameter (not instance name)"
  - "Template expert for configuracoes resolved dynamically by created_at ASC"

patterns-established:
  - "Traffic links: N8N webhook URLs with expert_id query param, copy-to-clipboard UI"
  - "Config cloning: admin_create_expert auto-duplicates template expert config rows"

requirements-completed: [WAPP-04, N8N-01, N8N-02]

duration: 4min
completed: 2026-03-28
---

# Phase 5 Plan 3: N8N Infra Workflows Migration Guide + Configuracoes Auto-Clone + Traffic Links

**N8N migration guide for 3 infra workflows (Coleta, Rotatividade, identificaConexao) with expert_id scoping, auto-clone configuracoes in admin_create_expert RPC, and traffic link display in AdminExpertForm**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-28T03:51:50Z
- **Completed:** 2026-03-28T03:56:05Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Comprehensive N8N migration guide covering all 3 infrastructure workflows with step-by-step n8n editor instructions
- Supabase migration for admin_create_expert to auto-clone configuracoes from template expert (Allan) for new experts
- Traffic links section in AdminExpertForm showing Instagram/Facebook webhook URLs with expert_id and copy-to-clipboard

## Task Commits

Each task was committed atomically:

1. **Task 1: N8N infra migration guide** - `127124a` (docs)
2. **Task 2: Traffic links in AdminExpertForm** - `fa3b1f2` (feat)
3. **Task 3: Supabase migration for configuracoes** - `e97a619` (feat)

## Files Created/Modified
- `.planning/phases/05-whatsapp-n8n-workflows-voice/N8N_INFRA_MIGRATION_GUIDE.md` - Step-by-step guide for updating 3 n8n workflows for multi-tenant expert_id isolation
- `supabase/migrations/20260328_05_03_update_admin_create_expert_configuracoes.sql` - Migration SQL updating admin_create_expert RPC with configuracoes duplication
- `src/pages/admin/AdminExpertForm.tsx` - Added traffic links section with copy-to-clipboard (edit mode only)
- `src/config/webhooks.ts` - Exported N8N_GEND constant for reuse

## Decisions Made
- Exported `N8N_GEND` from webhooks.ts (was private const) to allow AdminExpertForm to construct traffic link URLs
- Rotatividade Numero uses `expert_id` from query parameter (not instance name) since GET webhooks from traffic have no instance context
- Template expert for configuracoes resolved dynamically as first expert by `created_at ASC` rather than hardcoded UUID

## Deviations from Plan

### Note on MCP Tool Availability

The plan specified using `mcp__claude_ai_n8n__get_workflow_details` to inspect workflows and `mcp__claude_ai_Supabase__apply_migration` to apply the migration. MCP tools were not available in the execution environment. The migration guide was written based on the detailed workflow specifications in the plan and context documents. The migration SQL file was written locally but needs to be applied to Supabase (via dashboard SQL editor or future MCP session).

**Impact:** Migration guide is comprehensive based on plan specs. SQL migration file is version-controlled and ready to apply. No functional gap for the codebase changes.

---

**Total deviations:** 0 auto-fixed
**Impact on plan:** MCP tool unavailability handled by writing artifacts locally. No scope creep.

## Issues Encountered
- MCP tools (n8n, Supabase) not available in execution environment. Migration SQL written to local file; must be applied via Supabase dashboard SQL editor or a future session with MCP access.

## User Setup Required

**Supabase migration must be applied manually:**
1. Open the Supabase SQL Editor for project `albdkqpvoyfhziozgwlk`
2. Paste contents of `supabase/migrations/20260328_05_03_update_admin_create_expert_configuracoes.sql`
3. Execute the SQL
4. Verify: `SELECT prosrc FROM pg_proc WHERE proname = 'admin_create_expert'` should contain `configuracoes`

**N8N workflows must be updated manually:**
- Follow instructions in `.planning/phases/05-whatsapp-n8n-workflows-voice/N8N_INFRA_MIGRATION_GUIDE.md`
- Update workflows in the n8n editor at `https://n8n-gend.srv1431760.hstgr.cloud`

## Next Phase Readiness
- All 3 plans of Phase 5 are now complete
- N8N workflow updates documented but require manual application in n8n editor
- Supabase migration ready to apply
- Frontend traffic links functional once expert exists in edit mode

## Self-Check: PASSED

All 4 files verified as existing. All 3 task commits verified (127124a, fa3b1f2, e97a619).

---
*Phase: 05-whatsapp-n8n-workflows-voice*
*Completed: 2026-03-28*
