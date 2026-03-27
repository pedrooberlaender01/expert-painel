---
phase: 02-auth-security-hardening
plan: 02
subsystem: database
tags: [rls, row-level-security, supabase, multi-tenant, expert-id, postgresql, security]

# Dependency graph
requires:
  - "set_expert_context() function (from 02-01)"
  - "expert_id UUID NOT NULL column on all 26 tables (from 01-03)"
provides:
  - "RLS enabled on all 26 tenant tables"
  - "FORCE RLS on all 26 tenant tables"
  - "104 transition policies (4 per table: SELECT, INSERT, UPDATE, DELETE)"
  - "Expert isolation via current_setting('app.expert_id') filtering"
  - "Transition mode: direct .from() queries still work when app.expert_id not set"
affects: [02-03-security-hardening, 03-frontend-multi-tenant, 05-whatsapp-n8n-voice]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Transition RLS: 3-part condition (IS NULL OR empty OR match) allows gradual migration"
    - "FORCE ROW LEVEL SECURITY on all tables prevents owner bypass"
    - "DO block with FOREACH for batch policy creation across 26 tables"

key-files:
  created:
    - "supabase/migrations/20260327_02_02_rls_policies.sql"
  modified: []

key-decisions:
  - "Transition policies allow existing direct .from() queries to keep working (IS NULL/empty fallback)"
  - "FORCE RLS applied to all tables so even table owner respects policies (service_role still bypasses)"
  - "Old permissive policies dropped before creating new expert-scoped policies"
  - "Management API used for DDL (runs as postgres, bypasses RLS) -- isolation verified by SET ROLE anon"

patterns-established:
  - "RLS transition pattern: allow when app.expert_id not set, filter when set"
  - "Policy naming: expert_{operation}_{tablename}"
  - "Verification pattern: SET ROLE anon to test as frontend client"

requirements-completed: [AUTH-05, AUTH-06]

# Metrics
duration: 3min
completed: 2026-03-27
---

# Phase 02 Plan 02: RLS Policies Summary

**Row Level Security with 104 transition policies across 26 tables filtering by expert_id via current_setting, with FORCE RLS and verified isolation returning 0 rows for wrong expert**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-27T22:40:13Z
- **Completed:** 2026-03-27T22:43:40Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Dropped all 40 existing permissive RLS policies (anon_full_access_*, authenticated SELECT, etc.)
- Enabled RLS on all 26 tenant tables with FORCE ROW LEVEL SECURITY
- Created 104 expert-scoped transition policies (4 per table: SELECT, INSERT, UPDATE, DELETE)
- Verified isolation: fake expert_id returns 0 rows, correct expert_id returns 1762 leads, no set_config returns all rows (transition mode)

## Task Commits

Each task was committed atomically:

1. **Task 1: Drop existing policies, enable RLS, create 104 expert policies, FORCE RLS** - `17ae0e3` (feat)

**Plan metadata:** (pending final commit)

## Files Created/Modified

- `supabase/migrations/20260327_02_02_rls_policies.sql` - Full DDL: drop old policies, enable RLS, create 104 transition policies, force RLS on all 26 tables

## Decisions Made

- Transition policies use 3-part condition: `IS NULL OR '' OR match`. This allows existing frontend `.from()` queries (which don't call `set_expert_context()`) to continue working during migration. As hooks migrate to RPCs, the fallback will be removed for strict isolation.
- FORCE ROW LEVEL SECURITY applied so even the table owner cannot bypass policies. The service_role key (used by admin RPCs) still bypasses RLS per Supabase design, which is the intended admin access path (D-03).
- Old permissive policies were dropped via DO block querying pg_policies, ensuring clean slate before new policies.
- Verification done with `SET ROLE anon` to simulate actual frontend client behavior, since Management API runs as postgres superuser which bypasses RLS.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all policies are fully functional with the transition pattern.

## Issues Encountered

- Management API queries run as postgres superuser, bypassing RLS. Isolation testing required `SET ROLE anon` to accurately simulate frontend behavior. This is expected Supabase behavior, not a bug.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 26 tables now have RLS with expert_id filtering -- ready for security hardening (Plan 03)
- Transition mode ensures existing frontend continues working while hooks are migrated to RPCs
- service_role admin access is preserved for admin RPCs

## Self-Check: PASSED

- FOUND: supabase/migrations/20260327_02_02_rls_policies.sql
- FOUND: commit 17ae0e3

---
*Phase: 02-auth-security-hardening*
*Completed: 2026-03-27*
